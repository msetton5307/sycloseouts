import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, isSeller, isAdmin } from "./auth";
import {
  sendInvoiceEmail,
  sendShippingUpdateEmail,
  sendSellerApprovalEmail,
  sendSellerOrderEmail,
  sendOrderMessageEmail,
  sendProductQuestionEmail,
  sendAdminAlertEmail,
  sendAdminUserEmail,
  sendSuspensionEmail,
} from "./email";
import { generateInvoicePdf, generateSalesReportPdf } from "./pdf";
import {
  insertProductSchema,
  insertOrderSchema,
  insertOrderItemSchema,
  insertSellerApplicationSchema,
  insertSupportTicketSchema,
  insertOfferSchema,
  offers as offersTable,
  orders as ordersTable,
  orderItems as orderItemsTable,
  products as productsTable
} from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
import { generateOrderCode } from "./orderCode";
import { ZodError } from "zod";
import { containsContactInfo } from "./contactFilter";

async function fetchTrackingStatus(trackingNumber: string): Promise<string | undefined> {
  try {
    const apiKey = process.env.TRACKTRY_API_KEY;
    const res = await fetch("https://api.tracktry.com/v1/trackings/realtime", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(apiKey ? { "Tracktry-Api-Key": apiKey } : {}),
      },
      body: JSON.stringify({ tracking_number: trackingNumber }),
    });
    if (!res.ok) {
      console.error("Tracking API error", await res.text());
      return undefined;
    }
    const data = await res.json();
    return data.data?.items?.[0]?.status as string | undefined;
  } catch (err) {
    console.error("Tracking API request failed", err);
    return undefined;
  }
}

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
      const { category, sellerId, q, isBanner } = req.query as Record<string, string>;
      const filter: any = {};

      if (category) filter.category = category;
      if (sellerId) {
        const sellerIdNum = Number(sellerId);
        if (Number.isNaN(sellerIdNum)) {
          return res.status(400).json({ message: "Invalid sellerId" });
        }
        filter.sellerId = sellerIdNum;
      }

      if (isBanner !== undefined) filter.isBanner = isBanner === 'true';

      if (q) {
        const products = await storage.searchProducts(q, filter);
        return res.json(products);
      }

      const products = await storage.getProducts(filter);
      res.json(products);
    } catch (error) {
      handleApiError(res, error);
    }
  });

  app.get("/api/banner-products", async (_req, res) => {
    try {
      const products = await storage.getProducts({ isBanner: true });
      res.json(products.slice(0, 5));
    } catch (error) {
      handleApiError(res, error);
    }
  });

  app.get("/api/products/low-stock", isAuthenticated, isSeller, async (req, res) => {
    try {
      const threshold = parseInt(req.query.threshold as string, 10) || 5;
      const user = req.user as Express.User;
      const products = await storage.getLowStockProducts(user.id, threshold);
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

  app.post("/api/products/:id/questions", isAuthenticated, async (req, res) => {
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

      const seller = await storage.getUser(product.sellerId);
      if (!seller) {
        return res.status(404).json({ message: "Seller not found" });
      }

      if (containsContactInfo(req.body.question)) {
        await sendAdminAlertEmail(
          "Blocked contact info in product question",
          `User #${user.id} attempted to share contact info in a question for product #${id}.\n\n${req.body.question}`
        );
        return res.status(400).json({ message: "Sharing contact information is not allowed" });
      }

      const latestOrder = await storage.getLatestOrderBetweenUsers(user.id, product.sellerId);
      const message = await storage.createMessage({
        orderId: latestOrder?.id ?? 0,
        senderId: user.id,
        receiverId: product.sellerId,
        content: req.body.question,
      });

      await storage.createNotification({
        userId: product.sellerId,
        type: 'message',
        content: `New question about ${product.title}`,
        link: `/conversations/${user.id}`,
      });

      await sendProductQuestionEmail(seller.email, product.title, req.body.question);
      res.status(201).json(message);
    } catch (error) {
      handleApiError(res, error);
    }
  });

  app.post("/api/products/:id/offers", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) {
        return res.status(400).json({ message: "Invalid product ID" });
      }
      const user = req.user as Express.User;
      if (user.role !== "buyer") {
        return res.status(403).json({ message: "Only buyers can send offers" });
      }
      const product = await storage.getProduct(id);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      const offerData = insertOfferSchema.parse({
        ...req.body,
        productId: id,
        buyerId: user.id,
        sellerId: product.sellerId,
      });

      const offer = await storage.createOffer(offerData);

      await storage.createNotification({
        userId: product.sellerId,
        type: 'offer',
        content: `New offer for ${product.title}`,
        link: `/seller/offers`,
      });

      res.status(201).json(offer);
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
      const ordersWithDetails = await Promise.all(
        orders.map(async (o) => {
          const items = await storage.getOrderItemsWithProducts(o.id);
          const previewImage = items[0]?.productImages[0] || null;
          return { ...o, previewImage, items };
        }),
      );
      res.json(ordersWithDetails);
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

      // Get order items with product info
      const orderItems = await storage.getOrderItemsWithProducts(id);

      res.json({ ...order, items: orderItems });
    } catch (error) {
      handleApiError(res, error);
    }
  });

  app.get("/api/orders/:id/invoice.pdf", isAuthenticated, async (req, res) => {
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

      if (
        user.role !== "admin" &&
        order.buyerId !== user.id &&
        order.sellerId !== user.id
      ) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const items = await storage.getOrderItemsWithProducts(id);
      const invoiceItems = items.map((i) => ({
        title: i.productTitle,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        totalPrice: i.totalPrice,
        selectedVariations: i.selectedVariations,
      }));

      const pdf = generateInvoicePdf(order, invoiceItems);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=invoice-${order.code}.pdf`
      );
      res.send(pdf);
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

      const invoiceItems: {
        title: string;
        quantity: number;
        unitPrice: number;
        totalPrice: number;
        selectedVariations?: Record<string, string>;
        image?: string;
      }[] = [];

      const order = await db.transaction(async (tx) => {
        const [createdOrder] = await tx
          .insert(ordersTable)
          .values(orderData)
          .returning();

        const code = generateOrderCode(createdOrder.id);
        const [withCode] = await tx
          .update(ordersTable)
          .set({ code })
          .where(eq(ordersTable.id, createdOrder.id))
          .returning();

        if (req.body.items && Array.isArray(req.body.items)) {
          for (const item of req.body.items) {
            const orderItemData = insertOrderItemSchema.parse({
              ...item,
              orderId: createdOrder.id,
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

              invoiceItems.push({
                title: product.title,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                totalPrice: item.totalPrice,
                selectedVariations: item.selectedVariations,
                image: product.images?.[0],
              });
            }
          }
        }

        return withCode;
      });

      // send invoice email asynchronously, do not block response
      sendInvoiceEmail(user.email, order, invoiceItems, user).catch(console.error);

      // notify seller of the new order
      const seller = await storage.getUser(order.sellerId);
      if (seller) {
        sendSellerOrderEmail(seller.email, order, invoiceItems, user, seller).catch(console.error);
      }

      res.status(201).json(order);
    } catch (error) {
      handleApiError(res, error);
    }
  });

  app.patch("/api/orders/:id/cancel", isAuthenticated, async (req, res) => {
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

      if (
        order.buyerId !== user.id &&
        order.sellerId !== user.id &&
        user.role !== "admin"
      ) {
        return res.status(403).json({ message: "Forbidden" });
      }

      if (order.status !== "ordered") {
        return res.status(400).json({ message: "Order cannot be cancelled" });
      }

      const updatedOrder = await storage.updateOrder(id, { status: "cancelled" });
      res.json(updatedOrder);

      await storage.createNotification({
        userId: updatedOrder.buyerId,
        type: 'order',
        content: `Order #${updatedOrder.code} was cancelled`,
        link: `/buyer/orders/${updatedOrder.id}`,
      });
      await storage.createNotification({
        userId: updatedOrder.sellerId,
        type: 'order',
        content: `Order #${updatedOrder.code} was cancelled`,
        link: `/seller/orders`,
      });
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

      const prevStatus = order.status;
      const updateData: any = { ...req.body };

      if (req.body.trackingNumber) {
        const trackingStatus = await fetchTrackingStatus(req.body.trackingNumber);
        if (trackingStatus) {
          const statusLower = trackingStatus.toLowerCase();
          if (statusLower.includes("delivered")) {
            updateData.status = "delivered";
          } else if (statusLower.includes("out")) {
            updateData.status = "out_for_delivery";
          } else {
            updateData.status = "shipped";
          }
        }
      }

      if (updateData.status === "delivered" && prevStatus !== "delivered") {
        updateData.deliveredAt = new Date();
      }

      const updatedOrder = await storage.updateOrder(id, updateData);
      res.json(updatedOrder);

      if (updateData.status && updateData.status !== prevStatus) {
        const buyer = await storage.getUser(updatedOrder.buyerId);
        if (buyer) {
          sendShippingUpdateEmail(buyer.email, updatedOrder).catch(console.error);
        }
        await storage.createNotification({
          userId: updatedOrder.buyerId,
          type: 'order',
          content: `Order #${updatedOrder.code} status updated to ${updateData.status}`,
          link: `/buyer/orders/${updatedOrder.id}`,
        });
        await storage.createNotification({
          userId: updatedOrder.sellerId,
          type: 'order',
          content: `Order #${updatedOrder.code} status updated to ${updateData.status}`,
          link: `/seller/orders`,
        });
      }
    } catch (error) {
      handleApiError(res, error);
    }
  });

  app.post("/api/orders/:id/messages", isAuthenticated, async (req, res) => {
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

      if (order.buyerId !== user.id && order.sellerId !== user.id && user.role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }

      const receiverId = user.id === order.buyerId ? order.sellerId : order.buyerId;
      const receiver = await storage.getUser(receiverId);
      if (!receiver) {
        return res.status(404).json({ message: "Receiver not found" });
      }

      if (containsContactInfo(req.body.message)) {
        await sendAdminAlertEmail(
          "Blocked contact info in order message",
          `User #${user.id} attempted to share contact info with user #${receiverId} in order #${order.code}.\n\n${req.body.message}`
        );
        return res.status(400).json({ message: "Sharing contact information is not allowed" });
      }

      const message = await storage.createMessage({
        orderId: order.id,
        senderId: user.id,
        receiverId,
        content: req.body.message,
      });

      await storage.createNotification({
        userId: receiverId,
        type: 'message',
        content: `New message about order #${order.code}`,
        link: `/orders/${order.id}/messages`,
      });

      await sendOrderMessageEmail(receiver.email, order.code, req.body.message);
      res.status(201).json(message);
    } catch (error) {
      handleApiError(res, error);
    }
  });

  app.get("/api/conversations/:userId/messages", isAuthenticated, async (req, res) => {
    try {
      const otherId = parseInt(req.params.userId, 10);
      if (Number.isNaN(otherId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      const user = req.user as Express.User;
      const msgs = await storage.getConversationMessages(user.id, otherId);
      res.json(msgs);
    } catch (error) {
      handleApiError(res, error);
    }
  });

  app.post("/api/conversations/:userId/messages", isAuthenticated, async (req, res) => {
    try {
      const otherId = parseInt(req.params.userId, 10);
      if (Number.isNaN(otherId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      const user = req.user as Express.User;
      const buyerId = user.role === "seller" ? otherId : user.id;
      const sellerId = user.role === "seller" ? user.id : otherId;
      const order = await storage.getLatestOrderBetweenUsers(buyerId, sellerId);

      if (!order) {
        return res.status(400).json({ message: "No order between users" });
      }

      const receiver = await storage.getUser(otherId);
      if (!receiver) {
        return res.status(404).json({ message: "Receiver not found" });
      }

      if (containsContactInfo(req.body.message)) {
        await sendAdminAlertEmail(
          "Blocked contact info in conversation",
          `User #${user.id} attempted to share contact info with user #${otherId} in a conversation.\n\n${req.body.message}`
        );
        return res.status(400).json({ message: "Sharing contact information is not allowed" });
      }

      const message = await storage.createMessage({
        orderId: order.id,
        senderId: user.id,
        receiverId: otherId,
        content: req.body.message,
      });

      await storage.createNotification({
        userId: otherId,
        type: 'message',
        content: `New message about order #${order.code}`,
        link: `/conversations/${user.id}`,
      });

      await sendOrderMessageEmail(receiver.email, order.code, req.body.message);
      res.status(201).json(message);
    } catch (error) {
      handleApiError(res, error);
    }
  });

  app.get(
    "/api/admin/conversations/:userA/:userB/messages",
    isAuthenticated,
    isAdmin,
    async (req, res) => {
      try {
        const userA = parseInt(req.params.userA, 10);
        const userB = parseInt(req.params.userB, 10);
        if (Number.isNaN(userA) || Number.isNaN(userB)) {
          return res.status(400).json({ message: "Invalid user IDs" });
        }

        const msgs = await storage.getConversationMessages(userA, userB);
        res.json(msgs);
      } catch (error) {
        handleApiError(res, error);
      }
    },
  );

  app.get(
    "/api/admin/users/:userId/messages",
    isAuthenticated,
    isAdmin,
    async (req, res) => {
      try {
        const userId = parseInt(req.params.userId, 10);
        if (Number.isNaN(userId)) {
          return res.status(400).json({ message: "Invalid user ID" });
        }

        const msgs = await storage.getMessagesForUser(userId);
        res.json(msgs);
      } catch (error) {
        handleApiError(res, error);
      }
    },
  );

  app.get(
    "/api/admin/users/:userId/orders",
    isAuthenticated,
    isAdmin,
    async (req, res) => {
      try {
        const userId = parseInt(req.params.userId, 10);
        if (Number.isNaN(userId)) {
          return res.status(400).json({ message: "Invalid user ID" });
        }

        const buyerOrders = await storage.getOrders({ buyerId: userId });
        const sellerOrders = await storage.getOrders({ sellerId: userId });
        res.json([...buyerOrders, ...sellerOrders]);
      } catch (error) {
        handleApiError(res, error);
      }
    },
  );

  app.post(
    "/api/admin/users/:userId/email",
    isAuthenticated,
    isAdmin,
    async (req, res) => {
      try {
        const userId = parseInt(req.params.userId, 10);
        if (Number.isNaN(userId)) {
          return res.status(400).json({ message: "Invalid user ID" });
        }

        const user = await storage.getUser(userId);
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }

        const { subject, message } = req.body;
        if (!subject || !message) {
          return res.status(400).json({ message: "Missing subject or message" });
        }

        await sendAdminUserEmail(user.email, subject, message);
        res.sendStatus(204);
      } catch (error) {
        handleApiError(res, error);
      }
    },
  );

  app.get("/api/admin/billing", isAuthenticated, isAdmin, async (_req, res) => {
    try {
      const orders = await storage.getOrdersForBilling();
      res.json(orders);
    } catch (error) {
      handleApiError(res, error);
    }
  });

  app.post(
    "/api/admin/orders/:id/mark-charged",
    isAuthenticated,
    isAdmin,
    async (req, res) => {
      try {
        const id = parseInt(req.params.id, 10);
        if (Number.isNaN(id)) {
          return res.status(400).json({ message: "Invalid order ID" });
        }
        const order = await storage.updateOrder(id, { buyerCharged: true });
        res.json(order);
      } catch (error) {
        handleApiError(res, error);
      }
    },
  );

  app.post(
    "/api/admin/orders/:id/mark-paid",
    isAuthenticated,
    isAdmin,
    async (req, res) => {
      try {
        const id = parseInt(req.params.id, 10);
        if (Number.isNaN(id)) {
          return res.status(400).json({ message: "Invalid order ID" });
        }
        const order = await storage.updateOrder(id, { sellerPaid: true });
        res.json(order);
      } catch (error) {
        handleApiError(res, error);
      }
    },
  );

  app.post("/api/conversations/:userId/messages/read", isAuthenticated, async (req, res) => {
    try {
      const otherId = parseInt(req.params.userId, 10);
      if (Number.isNaN(otherId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      const user = req.user as Express.User;
      await storage.markConversationAsRead(user.id, otherId);
      res.sendStatus(204);
    } catch (error) {
      handleApiError(res, error);
    }
  });

  app.get("/api/orders/:id/messages", isAuthenticated, async (req, res) => {
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
      if (order.buyerId !== user.id && order.sellerId !== user.id && user.role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }
      const msgs = await storage.getOrderMessages(id);
      res.json(msgs);
    } catch (error) {
      handleApiError(res, error);
    }
  });

  app.post("/api/orders/:id/messages/read", isAuthenticated, async (req, res) => {
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
      if (order.buyerId !== user.id && order.sellerId !== user.id && user.role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }

      await storage.markMessagesAsRead(id, user.id);
      res.sendStatus(204);
    } catch (error) {
      handleApiError(res, error);
    }
  });

  app.get("/api/messages/unread-count", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as Express.User;
      const count = await storage.getUnreadMessageCount(user.id);
      res.json({ count });
    } catch (error) {
      handleApiError(res, error);
    }
  });

  app.get("/api/notifications", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as Express.User;
      const notes = await storage.getNotifications(user.id);
      res.json(notes);
    } catch (error) {
      handleApiError(res, error);
    }
  });

  app.post("/api/notifications/read", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as Express.User;
      await storage.markNotificationsAsRead(user.id);
      res.sendStatus(204);
    } catch (error) {
      handleApiError(res, error);
    }
  });

  app.get("/api/notifications/unread-count", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as Express.User;
      const count = await storage.getUnreadNotificationCount(user.id);
      res.json({ count });
    } catch (error) {
      handleApiError(res, error);
    }
  });

  app.delete("/api/notifications/:id", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as Express.User;
      const id = Number(req.params.id);
      if (Number.isNaN(id)) {
        return res.status(400).json({ message: "Invalid id" });
      }
      await storage.deleteNotification(id, user.id);
      res.sendStatus(204);
    } catch (error) {
      handleApiError(res, error);
    }
  });

  app.get("/api/seller/questions", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as Express.User;
      if (user.role !== "seller" && user.role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }
      const sellerId = user.role === "seller" ? user.id : undefined;
      const questions = await storage.getProductQuestionsForSeller(sellerId ?? user.id);
      res.json(questions);
    } catch (error) {
      handleApiError(res, error);
    }
  });

  app.get("/api/seller/sales", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as Express.User;
      if (user.role !== "seller" && user.role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }
      const start = req.query.start ? new Date(String(req.query.start)) : new Date(Date.now() - 30 * 86400000);
      const end = req.query.end ? new Date(String(req.query.end)) : new Date();
      const sellerId = user.role === "seller" ? user.id : user.id;
      const summary = await storage.getSalesSummary(sellerId, start, end);
      res.json(summary);
    } catch (error) {
      handleApiError(res, error);
    }
  });

  app.get("/api/seller/sales.pdf", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as Express.User;
      if (user.role !== "seller" && user.role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }
      const start = req.query.start ? new Date(String(req.query.start)) : new Date(Date.now() - 30 * 86400000);
      const end = req.query.end ? new Date(String(req.query.end)) : new Date();
      const sellerId = user.role === "seller" ? user.id : user.id;
      const summary = await storage.getSalesSummary(sellerId, start, end);
      const pdf = generateSalesReportPdf(user, summary, start, end);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=sales-${start.toISOString().slice(0, 10)}-${end.toISOString().slice(0, 10)}.pdf`,
      );
      res.send(pdf);
    } catch (error) {
      handleApiError(res, error);
    }
  });

  // Offer routes
  app.get("/api/offers", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as Express.User;
      const filter: any = {};
      if (user.role === 'buyer') filter.buyerId = user.id;
      else if (user.role === 'seller') filter.sellerId = user.id;
      const offers = await storage.getOffers(filter);
      res.json(offers);
    } catch (error) {
      handleApiError(res, error);
    }
  });

  app.post("/api/offers/:id/accept", isAuthenticated, async (req, res) => {
    try {
      const offerId = parseInt(req.params.id, 10);
      if (Number.isNaN(offerId)) {
        return res.status(400).json({ message: "Invalid offer ID" });
      }
      const user = req.user as Express.User;
      const offer = await storage.getOffer(offerId);
      if (!offer) {
        return res.status(404).json({ message: "Offer not found" });
      }
      if (user.role !== 'seller' || offer.sellerId !== user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }

      if (offer.status !== 'pending') {
        return res.status(400).json({ message: "Offer already processed" });
      }

      // Create order based on offer
      const orderData = insertOrderSchema.parse({
        buyerId: offer.buyerId,
        sellerId: offer.sellerId,
        totalAmount: offer.price * offer.quantity,
      });

      const invoiceItems: {
        title: string;
        quantity: number;
        unitPrice: number;
        totalPrice: number;
        selectedVariations?: Record<string, string>;
        image?: string;
      }[] = [];

      const order = await db.transaction(async (tx) => {
        const [createdOrder] = await tx.insert(ordersTable).values(orderData).returning();
        const code = generateOrderCode(createdOrder.id);
        const [withCode] = await tx.update(ordersTable).set({ code }).where(eq(ordersTable.id, createdOrder.id)).returning();

        const orderItemData = insertOrderItemSchema.parse({
          orderId: createdOrder.id,
          productId: offer.productId,
          quantity: offer.quantity,
          unitPrice: offer.price,
          totalPrice: offer.price * offer.quantity,
          selectedVariations: offer.selectedVariations ?? null,
        });

        await tx.insert(orderItemsTable).values(orderItemData);

        const [product] = await tx.select().from(productsTable).where(eq(productsTable.id, offer.productId));
        if (product) {
          await tx.update(productsTable).set({ availableUnits: product.availableUnits - offer.quantity }).where(eq(productsTable.id, offer.productId));
          invoiceItems.push({
            title: product.title,
            quantity: offer.quantity,
            unitPrice: offer.price,
            totalPrice: offer.price * offer.quantity,
            selectedVariations: offer.selectedVariations ?? undefined,
            image: product.images?.[0],
          });
        }

        return withCode;
      });

      await storage.updateOffer(offerId, { status: 'accepted', orderId: order.id });

      await storage.createNotification({
        userId: offer.buyerId,
        type: 'offer',
        content: `Your offer for order #${order.code} was accepted`,
        link: `/buyer/orders/${order.id}`,
      });

      const buyer = await storage.getUser(offer.buyerId);
      if (buyer) {
        sendInvoiceEmail(buyer.email, order, invoiceItems, buyer).catch(console.error);
      }

      res.json(order);
    } catch (error) {
      handleApiError(res, error);
    }
  });

  app.post("/api/offers/:id/reject", isAuthenticated, async (req, res) => {
    try {
      const offerId = parseInt(req.params.id, 10);
      if (Number.isNaN(offerId)) {
        return res.status(400).json({ message: "Invalid offer ID" });
      }
      const user = req.user as Express.User;
      const offer = await storage.getOffer(offerId);
      if (!offer) {
        return res.status(404).json({ message: "Offer not found" });
      }
      if (user.role !== 'seller' || offer.sellerId !== user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      if (offer.status !== 'pending') {
        return res.status(400).json({ message: "Offer already processed" });
      }

      await storage.updateOffer(offerId, { status: 'rejected' });

      await storage.createNotification({
        userId: offer.buyerId,
        type: 'offer',
        content: `Your offer for ${offer.quantity} units was rejected`,
        link: `/buyer/home`,
      });

      res.sendStatus(204);
    } catch (error) {
      handleApiError(res, error);
    }
  });

  app.get("/api/seller/best-sellers", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as Express.User;
      if (user.role !== "seller" && user.role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }
      const start = req.query.start ? new Date(String(req.query.start)) : new Date(Date.now() - 30 * 86400000);
      const end = req.query.end ? new Date(String(req.query.end)) : new Date();
      const sellerId = user.role === "seller" ? user.id : user.id;
      const list = await storage.getBestSellingProducts(sellerId, start, end);
      res.json(list);
    } catch (error) {
      handleApiError(res, error);
    }
  });

  app.get("/api/seller/payout-summary", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as Express.User;
      if (user.role !== "seller" && user.role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }
      const start = req.query.start ? new Date(String(req.query.start)) : new Date(Date.now() - 30 * 86400000);
      const end = req.query.end ? new Date(String(req.query.end)) : new Date();
      const sellerId = user.role === "seller" ? user.id : user.id;
      const summary = await storage.getPayoutSummary(sellerId, start, end);
      res.json(summary);
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

      // If approved, update user role to seller and notify via email
      if (req.body.status === "approved") {
        await storage.updateUser(application.userId, {
          role: "seller",
          isSeller: true,
          isApproved: true
        });

        const user = await storage.getUser(application.userId);
        if (user) {
          sendSellerApprovalEmail(user.email).catch(console.error);
        }
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
      Object.assign(req.user, updatedUser);
      const { password, ...userWithoutPassword } = updatedUser;
      req.session.save(() => {
        res.json(userWithoutPassword);
      });
    } catch (error) {
      handleApiError(res, error);
    }
  });

  app.post("/api/users/:id/suspend", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      const days = parseInt(req.body.days, 10);
      if (!Number.isFinite(days) || days < 0) {
        return res.status(400).json({ message: "Invalid suspension duration" });
      }

      const user = await storage.getUser(id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const suspendedUntil = days > 0 ? new Date(Date.now() + days * 86400000) : null;
      const updated = await storage.updateUser(id, { suspendedUntil });

      if (updated) {
        await sendSuspensionEmail(updated.email, days);
        const { password, ...u } = updated;
        return res.json(u);
      }

      res.status(404).json({ message: "User not found" });
    } catch (error) {
      handleApiError(res, error);
    }
  });

  app.post("/api/users/:id/reinstate", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      const user = await storage.getUser(id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const updated = await storage.updateUser(id, { suspendedUntil: null });

      if (updated) {
        const { password, ...u } = updated;
        return res.json(u);
      }

      res.status(404).json({ message: "User not found" });
    } catch (error) {
      handleApiError(res, error);
    }
  });

  app.get("/api/users/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      const user = await storage.getUser(id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      handleApiError(res, error);
    }
  });

  // Allow authenticated users to update their own contact info
  app.put("/api/users/me", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as Express.User;
      const updatedUser = await storage.updateUser(user.id, {
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        company: req.body.company,
        phone: req.body.phone,
        address: req.body.address,
        avatarUrl: req.body.avatarUrl,
      });

      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      const { password, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      handleApiError(res, error);
    }
  });

  // Address routes
  app.get("/api/addresses", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as Express.User;
      const addresses = await storage.getAddresses(user.id);
      res.json(addresses);
    } catch (error) {
      handleApiError(res, error);
    }
  });

  app.post("/api/addresses", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as Express.User;
      const address = await storage.createAddress({ ...req.body, userId: user.id });
      res.status(201).json(address);
    } catch (error) {
      handleApiError(res, error);
    }
  });

  app.put("/api/addresses/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const existing = await storage.getAddress(id);
      if (!existing || existing.userId !== (req.user as Express.User).id) {
        return res.status(404).json({ message: "Address not found" });
      }

      const updated = await storage.updateAddress(id, req.body);
      res.json(updated);
    } catch (error) {
      handleApiError(res, error);
    }
  });

  app.delete("/api/addresses/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const existing = await storage.getAddress(id);
      if (!existing || existing.userId !== (req.user as Express.User).id) {
        return res.status(404).json({ message: "Address not found" });
      }
      await storage.deleteAddress(id);
      res.sendStatus(204);
    } catch (error) {
      handleApiError(res, error);
    }
  });

  // Payment method routes
  app.get("/api/payment-methods", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as Express.User;
      const methods = await storage.getPaymentMethods(user.id);
      res.json(methods);
    } catch (error) {
      handleApiError(res, error);
    }
  });

  app.post("/api/payment-methods", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as Express.User;
      const method = await storage.createPaymentMethod({ ...req.body, userId: user.id });
      res.status(201).json(method);
    } catch (error) {
      handleApiError(res, error);
    }
  });

  app.put("/api/payment-methods/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const existing = await storage.getPaymentMethod(id);
      if (!existing || existing.userId !== (req.user as Express.User).id) {
        return res.status(404).json({ message: "Payment method not found" });
      }

      const updated = await storage.updatePaymentMethod(id, req.body);
      res.json(updated);
    } catch (error) {
      handleApiError(res, error);
    }
  });

  app.delete("/api/payment-methods/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const existing = await storage.getPaymentMethod(id);
      if (!existing || existing.userId !== (req.user as Express.User).id) {
        return res.status(404).json({ message: "Payment method not found" });
      }
      await storage.deletePaymentMethod(id);
      res.sendStatus(204);
    } catch (error) {
      handleApiError(res, error);
    }
  });

  // Support ticket routes
  app.get("/api/support-tickets", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as Express.User;
      const filter = user.role === "admin" ? {} : { userId: user.id };
      const tickets = await storage.getSupportTickets(filter);
      res.json(tickets);
    } catch (error) {
      handleApiError(res, error);
    }
  });

  app.post("/api/support-tickets", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as Express.User;
      const data = insertSupportTicketSchema.parse({ ...req.body, userId: user.id });
      const ticket = await storage.createSupportTicket(data);
      res.status(201).json(ticket);
    } catch (error) {
      handleApiError(res, error);
    }
  });

  app.get("/api/support-tickets/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid ticket ID" });
      const user = req.user as Express.User;
      const ticket = await storage.getSupportTicket(id);
      if (!ticket) return res.status(404).json({ message: "Ticket not found" });
      if (user.role !== "admin" && ticket.userId !== user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      res.json(ticket);
    } catch (error) {
      handleApiError(res, error);
    }
  });

  app.get("/api/support-tickets/:id/messages", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid ticket ID" });
      const user = req.user as Express.User;
      const ticket = await storage.getSupportTicket(id);
      if (!ticket) return res.status(404).json({ message: "Ticket not found" });
      if (user.role !== "admin" && ticket.userId !== user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      const messages = await storage.getSupportTicketMessages(id);
      res.json(messages);
    } catch (error) {
      handleApiError(res, error);
    }
  });

  app.post("/api/support-tickets/:id/messages", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid ticket ID" });
      const user = req.user as Express.User;
      const ticket = await storage.getSupportTicket(id);
      if (!ticket) return res.status(404).json({ message: "Ticket not found" });
      if (user.role !== "admin" && ticket.userId !== user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      const content = req.body.message;
      if (!content) return res.status(400).json({ message: "Missing message" });
      const msg = await storage.createSupportTicketMessage({
        ticketId: id,
        senderId: user.id,
        message: content,
      });
      if (user.role === "admin") {
        await storage.createNotification({
          userId: ticket.userId,
          type: 'support',
          content: `Support ticket #${ticket.id} has a new response`,
          link: '/help',
        });
      }
      res.status(201).json(msg);
    } catch (error) {
      handleApiError(res, error);
    }
  });

  app.post("/api/support-tickets/:id/respond", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid ticket ID" });
      const ticket = await storage.respondToSupportTicket(id, req.body.response);
      if (!ticket) return res.status(404).json({ message: "Ticket not found" });
      await storage.createNotification({
        userId: ticket.userId,
        type: 'support',
        content: `Support ticket #${ticket.id} has a new response`,
        link: '/help',
      });
      res.json(ticket);
    } catch (error) {
      handleApiError(res, error);
    }
  });

  app.post("/api/support-tickets/:id/status", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid ticket ID" });
      const status = req.body.status;
      if (status !== 'open' && status !== 'closed') {
        return res.status(400).json({ message: 'Invalid status' });
      }
      const ticket = await storage.updateSupportTicketStatus(id, status);
      if (!ticket) return res.status(404).json({ message: "Ticket not found" });
      res.json(ticket);
    } catch (error) {
      handleApiError(res, error);
    }
  });

  // Create the HTTP server
  const httpServer = createServer(app);
  return httpServer;
}