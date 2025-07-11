import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import { nanoid } from "nanoid";
import { storage } from "./storage";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const viteLogger = createLogger();

function escapeHtml(str: string) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function toAbsolute(url: string, req: express.Request): string {
  if (/^https?:\/\//i.test(url)) return url;
  const base = `${req.protocol}://${req.get("host")}`;
  if (url.startsWith("/")) return base + url;
  return `${base}/${url}`;
}

function injectMeta(
  template: string,
  meta: { title?: string; image?: string; description?: string; url?: string },
) {
  if (meta.title) {
    const safeTitle = escapeHtml(meta.title);
    template = template.replace(/<title>.*?<\/title>/, `<title>${safeTitle}<\/title>`);
    template = template.replace(
      /<meta property="og:title"[^>]*>/,
      `<meta property="og:title" content="${safeTitle}" />`,
    );
  }
  if (meta.description) {
    const safeDesc = escapeHtml(meta.description);
    template = template.replace(
      /<meta property="og:description"[^>]*>/,
      `<meta property="og:description" content="${safeDesc}" />`,
    );
  }
  if (meta.url) {
    const safeUrl = escapeHtml(meta.url);
    if (template.match(/<meta property="og:url"/)) {
      template = template.replace(
        /<meta property="og:url"[^>]*>/,
        `<meta property="og:url" content="${safeUrl}" />`,
      );
    } else {
      template = template.replace(
        /<meta property="og:type"[^>]*>/,
        `$&\n    <meta property="og:url" content="${safeUrl}" />`,
      );
    }
  }
  if (meta.image) {
    const safeImg = escapeHtml(meta.image);
    if (template.match(/<meta property="og:image"/)) {
      template = template.replace(
        /<meta property="og:image"[^>]*>/,
        `<meta property="og:image" content="${safeImg}" />`,
      );
    } else {
      template = template.replace(
        /<meta property="og:type"[^>]*>/,
        `$&\n    <meta property="og:image" content="${safeImg}" />`,
      );
    }
  }
  return template;
}

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);

  app.get("/products/:id", async (req, res, next) => {
    const url = req.originalUrl;
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return next();
    try {
      const product = await storage.getProduct(id);
      if (!product) return next();
      const clientTemplate = path.resolve(
        __dirname,
        "..",
        "client",
        "index.html",
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      template = injectMeta(template, {
        title: product.title,
        image: toAbsolute(product.images[0], req),
        description: product.description,
        url: `${req.protocol}://${req.get("host")}${req.originalUrl}`,
      });
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });

  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        __dirname,
        "..",
        "client",
        "index.html",
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.get("/products/:id", async (req, res, next) => {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return next();
    try {
      const product = await storage.getProduct(id);
      if (!product) return next();
      const templatePath = path.resolve(distPath, "index.html");
      let template = await fs.promises.readFile(templatePath, "utf-8");
      template = injectMeta(template, {
        title: product.title,
        image: toAbsolute(product.images[0], req),
        description: product.description,
        url: `${req.protocol}://${req.get("host")}${req.originalUrl}`,
      });
      res.status(200).set({ "Content-Type": "text/html" }).end(template);
    } catch (e) {
      next(e);
    }
  });

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}