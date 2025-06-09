import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, isSeller, isAdmin } from "./auth";
import { insertProductSchema, insertOrderSchema, insertOrderItemSchema, insertSellerApplicationSchema, orders as ordersTable, orderItems as orderItemsTable, products as productsTable } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
import { ZodError } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication routes
  setupAuth(app);

  // API error handler
  const handleApiError = (res: any, error: any) => {
    console.error("API Error:", error);
    if (error instanceof ZodError) {
      return res.status(400).json({ 
        message: "Validation error", 
        errors: error.errors 
      });
    }
    res.status(500).json({ message: error.message || "Internal Server Error" });
  };

  // Product routes
  app.get("/api/products", async (req, res) => {
    try {
      const { category, sellerId } = req.query;
      const filter: any = {};

      if (category) filter.category = category;
      if (sellerId) {
        const sellerIdNum = Number(sellerId);
        if (Number.isNaN(sellerIdNum)) {
          return res.status(400).json({ message: "Invalid sellerId" });
        }
        filter.sellerId = sellerIdNum;
      }
      
      const products = await storage.getProducts(filter);
      res.json(products);
    } catch (error) {
      handleApiError(res, error);
    }
  });

  app.get("/api/products/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) {
        return res.status(400).json({ message: "Invalid product ID" });
      }
      const product = await storage.getProduct(id);
      
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      
      res.json(product);
    } catch (error) {
      handleApiError(res, error);
    }
  });

  app.post("/api/products", isAuthenticated, isSeller, async (req, res) => {
    try {
      console.log("POST /api/products - Request body:", JSON.stringify(req.body));
      console.log("User:", req.user);
      
      const user = req.user as Express.User;
      const productData = insertProductSchema.parse({
        ...req.body,
        sellerId: user.id
      });
      
      console.log("Parsed product data:", JSON.stringify(productData));
      
      const product = await storage.createProduct(productData);
      console.log("Created product:", JSON.stringify(product));
      
      res.status(201).json(product);
    } catch (error) {
      console.error("Error creating product:", error);
      handleApiError(res, error);
    }
  });

  app.put("/api/products/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) {
        return res.status(400).json({ message: "Invalid product ID" });
      }
      const user = req.user as Express.User;
      const product = await storage.getProduct(id);
      
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      
      // Only seller owner or admin can update
      if (product.sellerId !== user.id && user.role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const updatedProduct = await storage.updateProduct(id, req.body);
      res.json(updatedProduct);
    } catch (error) {
      handleApiError(res, error);
    }
  });

  app.delete("/api/products/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) {
        return res.status(400).json({ message: "Invalid product ID" });
      }
      const user = req.user as Express.User;
      const product = await storage.getProduct(id);
      
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      
      // Only seller owner or admin can delete
      if (product.sellerId !== user.id && user.role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      await storage.deleteProduct(id);
      res.status(204).end();
    } catch (error) {
      handleApiError(res, error);
    }
  });

  // Order routes
  app.get("/api/orders", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as Express.User;
      const filter: any = {};
      
      // Filter orders based on user role
      if (user.role === "buyer") {
        filter.buyerId = user.id;
      } else if (user.role === "seller") {
        filter.sellerId = user.id;
      }
      // Admins can see all orders
      
      const orders = await storage.getOrders(filter);
      res.json(orders);
    } catch (error) {
      handleApiError(res, error);
    }
  });

  app.get("/api/orders/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) {
        return res.status(400).json({ message: "Invalid order ID" });
      }
      const user = req.user as Express.User;
      const order = await storage.getOrder(id);
      
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      // Ensure user has permission to view this order
      if (user.role !== "admin" && order.buyerId !== user.id && order.sellerId !== user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      // Get order items
      const orderItems = await storage.getOrderItems(id);
      
      res.json({ ...order, items: orderItems });
    } catch (error) {
      handleApiError(res, error);
    }
  });

  app.post("/api/orders", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as Express.User;

      if (user.role !== "buyer") {
        return res.status(403).json({ message: "Only buyers can create orders" });
      }

      const orderData = insertOrderSchema.parse({
        ...req.body,
        buyerId: user.id
      });

      const order = await db.transaction(async (tx) => {
        const [createdOrder] = await tx
          .insert(ordersTable)
          .values(orderData)
          .returning();

        if (req.body.items && Array.isArray(req.body.items)) {
          for (const item of req.body.items) {
            const orderItemData = insertOrderItemSchema.parse({
              ...item,
              orderId: createdOrder.id
            });

            await tx.insert(orderItemsTable).values(orderItemData);

            const [product] = await tx
              .select()
              .from(productsTable)
              .where(eq(productsTable.id, item.productId));

            if (product) {
              await tx
                .update(productsTable)
                .set({ availableUnits: product.availableUnits - item.quantity })
                .where(eq(productsTable.id, item.productId));
            }
          }
        }

        return createdOrder;
      });

      res.status(201).json(order);
    } catch (error) {
      handleApiError(res, error);
    }
  });

  app.put("/api/orders/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) {
        return res.status(400).json({ message: "Invalid order ID" });
      }
      const user = req.user as Express.User;
      const order = await storage.getOrder(id);
      
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      // Only seller of the order or admin can update status
      if (order.sellerId !== user.id && user.role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const updatedOrder = await storage.updateOrder(id, req.body);
      res.json(updatedOrder);
    } catch (error) {
      handleApiError(res, error);
    }
  });

  // Seller application routes
  app.post("/api/seller-applications", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as Express.User;
      
      // Check if user already has an application
      const existingApplication = await storage.getSellerApplicationByUserId(user.id);
      if (existingApplication) {
        return res.status(400).json({ message: "You have already submitted an application" });
      }
      
      const applicationData = insertSellerApplicationSchema.parse({
        ...req.body,
        userId: user.id
      });
      
      const application = await storage.createSellerApplication(applicationData);
      res.status(201).json(application);
    } catch (error) {
      handleApiError(res, error);
    }
  });

  app.get("/api/seller-applications", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const status = req.query.status as string;
      const filter: any = {};
      
      if (status) {
        filter.status = status;
      }
      
      const applications = await storage.getSellerApplications(filter);
      res.json(applications);
    } catch (error) {
      handleApiError(res, error);
    }
  });

  app.get("/api/seller-applications/my", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as Express.User;
      const application = await storage.getSellerApplicationByUserId(user.id);
      
      if (!application) {
        return res.status(404).json({ message: "No application found" });
      }
      
      res.json(application);
    } catch (error) {
      handleApiError(res, error);
    }
  });

  app.put("/api/seller-applications/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) {
        return res.status(400).json({ message: "Invalid application ID" });
      }
      const application = await storage.getSellerApplication(id);
      
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }
      
      // Update application status
      const updatedApplication = await storage.updateSellerApplication(id, {
        status: req.body.status
      });
      
      // If approved, update user role to seller
      if (req.body.status === "approved") {
        await storage.updateUser(application.userId, {
          role: "seller",
          isSeller: true,
          isApproved: true
        });
      }
      
      res.json(updatedApplication);
    } catch (error) {
      handleApiError(res, error);
    }
  });

  // User management routes (admin only)
  app.get("/api/users", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const users = await storage.getUsers();
      // Remove passwords from response
      const usersWithoutPasswords = users.map(({ password, ...user }) => user);
      res.json(usersWithoutPasswords);
    } catch (error) {
      handleApiError(res, error);
    }
  });

  app.put("/api/users/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      const user = await storage.getUser(id);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const updatedUser = await storage.updateUser(id, req.body);
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Remove password from response
      const { password, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      handleApiError(res, error);
    }
  });

  // Create the HTTP server
  const httpServer = createServer(app);
  return httpServer;
}
