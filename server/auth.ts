import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User } from "@shared/schema";

declare global {
  namespace Express {
    interface User {
      id: number;
      username: string;
      password: string;
      email: string;
      firstName: string;
      lastName: string;
      company?: string | null;
      phone?: string | null;
      address?: string | null;
      role: string;
      isSeller: boolean | null;
      isApproved: boolean | null;
      createdAt?: Date | null;
    }
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  if (!process.env.SESSION_SECRET) {
    process.env.SESSION_SECRET = randomBytes(32).toString("hex");
    console.log("Generated session secret:", process.env.SESSION_SECRET);
  }

  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET,
    resave: true,
    saveUninitialized: true,
    store: storage.sessionStore,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 7,
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
    },
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username: string, password: string, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user || !(await comparePasswords(password, user.password))) {
          return done(null, false);
        } else {
          return done(null, user);
        }
      } catch (error) {
        return done(error);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  async function loginAndSaveSession(req: Request, user: Express.User) {
    await new Promise<void>((resolve, reject) => {
      req.login(user, (err) => {
        if (err) return reject(err);
        req.session.save((saveErr) => {
          if (saveErr) return reject(saveErr);
          resolve();
        });
      });
    });
  }

  app.post("/api/register", async (req, res, next) => {
    try {
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).json({ error: "Username already exists" });
      }

      const existingEmail = await storage.getUserByEmail(req.body.email);
      if (existingEmail) {
        return res.status(400).json({ error: "Email already exists" });
      }

      const { address, city, state, zipCode, country, phone, ...userFields } =
        req.body;

      const user = await storage.createUser({
        ...userFields,
        phone,
        password: await hashPassword(req.body.password),
      });

      if (address && city && state && zipCode) {
        await storage.createAddress({
          userId: user.id,
          name: `${user.firstName} ${user.lastName}`,
          company: user.company ?? undefined,
          address,
          city,
          state,
          zipCode,
          country: country || "United States",
          phone,
        });
      }

      await loginAndSaveSession(req, user);

      const { password, ...userWithoutPassword } = user;
      res.status(201).json(userWithoutPassword);
    } catch (error: any) {
      if (
        (typeof error.message === "string" && error.message.includes("duplicate key")) ||
        error?.code === "23505"
      ) {
        return res
          .status(400)
          .json({ error: "Username or email already exists" });
      }
      next(error);
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate(
      "local",
      (err: Error | null, user: User | false, info: any) => {
        if (err) return next(err);
        if (!user) {
          return res
            .status(401)
            .json({ error: "Invalid username or password" });
        }

        loginAndSaveSession(req, user)
          .then(() => {
            const { password, ...userWithoutPassword } = user;
            res.status(200).json(userWithoutPassword);
          })
          .catch(next);
      },
    )(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const { password, ...userWithoutPassword } = req.user;
    res.json(userWithoutPassword);
  });

  app.post("/api/reset-password", isAuthenticated, async (req, res, next) => {
    try {
      const newPassword = req.body.password;
      if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters" });
      }
      const hashed = await hashPassword(newPassword);
      const updated = await storage.updateUser(req.user.id, { password: hashed });
      if (!updated) return res.status(404).json({ error: "User not found" });
      res.sendStatus(200);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/make-seller", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const user = req.user;
      console.log("Updating user to seller role:", user.id);

      const updatedUser = await storage.updateUser(user.id, {
        role: "seller",
        isSeller: true,
        isApproved: true,
      });

      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      req.user.role = "seller";
      req.user.isSeller = true;
      req.user.isApproved = true;

      const { password, ...userWithoutPassword } = req.user;
      console.log("User updated to seller:", userWithoutPassword);

      req.session.save((err) => {
        if (err) {
          console.error("Session save error:", err);
          return res.status(500).json({ message: "Session save failed" });
        }
        res.json(userWithoutPassword);
      });
    } catch (error) {
      console.error("Error making user a seller:", error);
      res.status(500).json({ message: "Failed to update user role" });
    }
  });
}

export function isAuthenticated(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: "Unauthorized" });
}

export function isSeller(req: Request, res: Response, next: NextFunction) {
  console.log("isSeller check - User:", req.user);
  console.log("isAuthenticated:", req.isAuthenticated());
  console.log("isSeller value:", req.user?.isSeller);

  if (req.isAuthenticated() && req.user.isSeller) {
    console.log("User is authenticated and is a seller, proceeding");
    return next();
  }
  console.log("User denied access to seller route");
  res.status(403).json({ error: "Forbidden - Seller access required" });
}

export function isAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated() && req.user.role === "admin") {
    return next();
  }
  res.status(403).json({ error: "Forbidden - Admin access required" });
}