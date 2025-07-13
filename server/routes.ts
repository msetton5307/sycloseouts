import type { Express } from "express";
import { createServer, type Server } from "http";
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
  sendHtmlEmail,
  sendSuspensionEmail,
  sendWireInstructionsEmail,
  sendWireReminderEmail,
  sendSellerPayoutEmail,
  sendSupportTicketEmail,
  sendStrikeEmail,
  sendOrderCancelledEmail,
} from "./email";
import { generateInvoicePdf, generateSalesReportPdf } from "./pdf";
import {
  insertProductSchema,
  insertOrderSchema,
  insertOrderItemSchema,
  insertSellerApplicationSchema,
  insertSupportTicketSchema,
  insertEmailTemplateSchema,
  insertStrikeReasonSchema,
  insertAddressSchema,
  insertUserNoteSchema,
  type InsertUserNote,
  type Order,
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
import { randomBytes } from "crypto";
import { storage } from "./storage";

async function getServiceFeeRate(): Promise<number> {
  const val = await storage.getSiteSetting("commission_rate");
  const num = parseFloat(val ?? "0.035");
  return Number.isFinite(num) ? num : 0.035;
}

// Reverse the service fee addition logic using a provided rate
function removeServiceFee(priceWithFee: number, rate: number): number {
  return Math.floor((priceWithFee / (1 + rate)) * 100) / 100;
}

function subtractServiceFee(amount: number, rate: number): number {
  return Math.round(amount * (1 - rate) * 100) / 100;
}

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
          `${user.firstName} ${user.lastName} (${user.email}) attempted to share contact info with ${seller.firstName} ${seller.lastName} (${seller.email}) in question for product "${product.title}".\n\n${req.body.question}`
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

      const varKey = JSON.stringify(req.body.selectedVariations || {});
      const availableUnits =
        product.variationStocks && product.variationStocks[varKey] !== undefined
          ? product.variationStocks[varKey]
          : product.availableUnits;

      if (req.body.quantity > availableUnits) {
        return res.status(400).json({ message: "Quantity exceeds available stock" });
      }

      const rate = await getServiceFeeRate();
      const offerData = insertOfferSchema.parse({
        ...req.body,
        // Convert the buyer's total price to the seller's base price using the
        // current service fee rate and round down so addServiceFee(base)
        // matches the offered total.
        price: Math.floor((req.body.price / (1 + rate)) * 100) / 100,
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
      const user = req.user as Express.User;
      const productData = insertProductSchema.parse({
        ...req.body,
        sellerId: user.id
      });

      const product = await storage.createProduct(productData);

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
          let buyer;
          if (user.role === "seller" || user.role === "admin") {
            buyer = await storage.getUser(o.buyerId);
          }
          const orderWithItems: any = {
            ...o,
            previewImage,
            items,
            ...(buyer && {
              buyerFirstName: buyer.firstName,
              buyerLastName: buyer.lastName,
            }),
          };
          if (user.role === "seller") {
            if (o.shippingChoice === "seller") {
              return orderWithItems;
            }
            const { shippingDetails, ...rest } = orderWithItems;
            return rest;
          }
          return orderWithItems;
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
      let buyer;
      if (order && (user.role === "seller" || user.role === "admin")) {
        buyer = await storage.getUser(order.buyerId);
      }

      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      // Ensure user has permission to view this order
      if (user.role !== "admin" && order.buyerId !== user.id && order.sellerId !== user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }

      // Get order items with product info
      const orderItems = await storage.getOrderItemsWithProducts(id);
      const baseOrder: any = {
        ...order,
        ...(buyer && { buyerFirstName: buyer.firstName, buyerLastName: buyer.lastName }),
      };
      if (user.role === "seller") {
        if (order.shippingChoice === "seller") {
          res.json({ ...baseOrder, items: orderItems });
        } else {
          const { shippingDetails, ...rest } = baseOrder;
          res.json({ ...rest, items: orderItems });
        }
      } else {
        res.json({ ...baseOrder, items: orderItems });
      }
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
      let invoiceItems = items.map((i) => ({
        title: i.productTitle,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        totalPrice: i.totalPrice,
        selectedVariations: i.selectedVariations,
      }));
      let invoiceOrder: Order = order;

      if (user.role === "seller") {
        const rate = await getServiceFeeRate();
        const itemsNoFee = items.map((i) => ({
          title: i.productTitle,
          quantity: i.quantity,
          unitPrice: subtractServiceFee(i.unitPrice, rate),
          totalPrice: subtractServiceFee(i.totalPrice, rate),
          selectedVariations: i.selectedVariations,
        }));
        const subtotal = itemsNoFee.reduce((sum, it) => sum + it.totalPrice, 0);
        const productTotalWithFee = items.reduce((sum, it) => sum + Number(it.totalPrice), 0);
        const shipping = Math.max(order.totalAmount - productTotalWithFee, 0);
        const sellerTotal = Math.round((subtotal + shipping) * 100) / 100;
        invoiceItems = itemsNoFee;
        invoiceOrder = { ...order, totalAmount: sellerTotal } as Order;
      }

      const pdf = generateInvoicePdf(invoiceOrder, invoiceItems);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=invoice-${order.code}.pdf`
      );
      res.setHeader("Content-Length", String(pdf.length));
      res.status(200).end(pdf);
    } catch (error) {
      handleApiError(res, error);
    }
  });

  app.post("/api/orders", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as Express.User;

      if (user.role !== "buyer" && user.role !== "seller") {
        return res
          .status(403)
          .json({ message: "Only buyers or sellers can create orders" });
      }

      let orderData = insertOrderSchema.parse({
        ...req.body,
        buyerId: user.id
      });

      let sellerTotal = 0;
      if (req.body.items && Array.isArray(req.body.items)) {
        for (const item of req.body.items) {
          sellerTotal += Number(item.totalPrice) || 0;
        }
      }

      let totalAmount = sellerTotal;
      if (req.body.items && Array.isArray(req.body.items)) {
        for (const item of req.body.items) {
          if (item.shippingChoice === "seller") {
            const [product] = await db
              .select()
              .from(productsTable)
              .where(eq(productsTable.id, item.productId));
            if (
              product &&
              product.shippingResponsibility === "seller_fee" &&
              product.shippingFee
            ) {
              totalAmount += Number(product.shippingFee);
            }
          }
        }
      }
      orderData.totalAmount = totalAmount;

      if (orderData.paymentDetails && orderData.paymentDetails.method === "wire") {
        orderData.status = "awaiting_wire";
      }

      const invoiceItems: {
        title: string;
        quantity: number;
        unitPrice: number;
        totalPrice: number;
        selectedVariations?: Record<string, string>;
        image?: string;
      }[] = [];

      const order = await db.transaction(async (tx) => {
        const tempCode = randomBytes(8).toString("hex");
        const [createdOrder] = await tx
          .insert(ordersTable)
          .values({ ...orderData, code: tempCode })
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
              const updateData: any = {
                availableUnits: product.availableUnits - item.quantity,
              };

              if (item.selectedVariations) {
                const varKey = JSON.stringify(item.selectedVariations);
                const stocks = (product.variationStocks || {}) as Record<string, number>;
                if (stocks[varKey] !== undefined) {
                  stocks[varKey] = stocks[varKey] - item.quantity;
                  updateData.variationStocks = stocks;
                }
              }

              await tx
                .update(productsTable)
                .set(updateData)
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

      // Send appropriate emails asynchronously
      if (order.paymentDetails?.method === "wire") {
        // Only wire instructions are sent until payment is received
        sendWireInstructionsEmail(user.email, order).catch(console.error);
      } else {
        // Non-wire orders send the invoice immediately and notify the seller
        sendInvoiceEmail(user.email, order, invoiceItems, user).catch(console.error);
        const seller = await storage.getUser(order.sellerId);
        if (seller) {
          sendSellerOrderEmail(seller.email, order, invoiceItems, user, seller).catch(console.error);
        }
      }

      // Seller notification for wire orders is sent when the wire is marked paid

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

  app.post("/api/orders/:id/shipping-label", isAuthenticated, async (req, res) => {
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

      if (order.buyerId !== user.id && user.role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }

      const updatedOrder = await storage.updateOrder(id, {
        shippingLabel: req.body.shippingLabel,
      });
      res.json(updatedOrder);

      await storage.createNotification({
        userId: order.sellerId,
        type: 'order',
        content: `Shipping label uploaded for order #${order.code}`,
        link: `/seller/orders/${order.id}`,
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
        if (user.role === "admin") {
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
        } else {
          // Sellers can only mark an order as shipped when providing tracking
          updateData.status = "shipped";
        }
      }

      if (user.role !== "admin" && updateData.status && updateData.status !== "shipped") {
        // Prevent sellers from moving beyond shipped status
        updateData.status = "shipped";
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
          `${user.firstName} ${user.lastName} (${user.email}) attempted to share contact info with ${receiver.firstName} ${receiver.lastName} (${receiver.email}) in order #${order.code}.\n\n${req.body.message}`
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
          `${user.firstName} ${user.lastName} (${user.email}) attempted to share contact info with ${receiver.firstName} ${receiver.lastName} (${receiver.email}) in a conversation.\n\n${req.body.message}`
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
    "/api/admin/users/:userId/notes",
    isAuthenticated,
    isAdmin,
    async (req, res) => {
      try {
        const userId = parseInt(req.params.userId, 10);
        if (Number.isNaN(userId)) {
          return res.status(400).json({ message: "Invalid user ID" });
        }
        const notes = await storage.getUserNotes(userId);
        res.json(notes);
      } catch (error) {
        handleApiError(res, error);
      }
    },
  );

  app.post(
    "/api/admin/users/:userId/notes",
    isAuthenticated,
    isAdmin,
    async (req, res) => {
      try {
        const userId = parseInt(req.params.userId, 10);
        if (Number.isNaN(userId)) {
          return res.status(400).json({ message: "Invalid user ID" });
        }
        const admin = req.user as Express.User;
        const noteText = String(req.body.note || "").trim();
        const related = req.body.relatedUserId
          ? parseInt(req.body.relatedUserId, 10)
          : undefined;
        if (!noteText) {
          return res.status(400).json({ message: "Missing note" });
        }
        const data = insertUserNoteSchema.parse({
          userId,
          adminId: admin.id,
          note: noteText,
          relatedUserId: Number.isNaN(related) ? undefined : related,
        }) as InsertUserNote;
        const newNote = await storage.createUserNote(data);
        res.status(201).json(newNote);
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

        const { subject, message, html } = req.body;
        if (!subject || !message) {
          return res.status(400).json({ message: "Missing subject or message" });
        }

        await sendAdminUserEmail(user.email, subject, message, html);
        await storage.createEmailLog({
          templateId: req.body.templateId,
          userId: user.id,
          subject,
          html: html || message,
        });
        res.sendStatus(204);
      } catch (error) {
        handleApiError(res, error);
      }
    },
  );

  app.get("/api/admin/email-templates", isAuthenticated, isAdmin, async (_req, res) => {
    try {
      const templates = await storage.getEmailTemplates();
      res.json(templates);
    } catch (error) {
      handleApiError(res, error);
    }
  });

  app.post("/api/admin/email-templates", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const data = insertEmailTemplateSchema.parse(req.body);
      const template = await storage.createEmailTemplate(data);
      res.status(201).json(template);
    } catch (error) {
      handleApiError(res, error);
    }
  });

  app.put("/api/admin/email-templates/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid template ID" });
      const template = await storage.updateEmailTemplate(id, req.body);
      if (!template) return res.status(404).json({ message: "Template not found" });
      res.json(template);
    } catch (error) {
      handleApiError(res, error);
    }
  });

  app.delete("/api/admin/email-templates/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid template ID" });
      await storage.deleteEmailTemplate(id);
      res.sendStatus(204);
    } catch (error) {
      handleApiError(res, error);
    }
  });

  app.post("/api/admin/email-templates/:id/send", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const group = req.body.group as string;
      if (Number.isNaN(id) || (group !== "buyers" && group !== "sellers")) {
        return res.status(400).json({ message: "Invalid parameters" });
      }
      const template = await storage.getEmailTemplate(id);
      if (!template) return res.status(404).json({ message: "Template not found" });
      const users = await storage.getUsers();
      const targets = users.filter(u => u.role === (group === "buyers" ? "buyer" : "seller"));
      for (const u of targets) {
        const html = template.body
          .replace(/\[first_name\]/gi, u.firstName)
          .replace(/\[last_name\]/gi, u.lastName)
          .replace(/\[name\]/gi, `${u.firstName} ${u.lastName}`)
          .replace(/\[company\]/gi, u.company || "");
        await sendHtmlEmail(u.email, template.subject, html);
        await storage.createEmailLog({
          templateId: template.id,
          userId: u.id,
          subject: template.subject,
          html,
        });
      }
      res.sendStatus(204);
    } catch (error) {
      handleApiError(res, error);
    }
  });

  app.get("/api/admin/email-templates/:id/logs", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid template ID" });
      const logs = await storage.getEmailLogs(id);
      res.json(logs);
    } catch (error) {
      handleApiError(res, error);
    }
  });

  // Strike reason routes
  app.get("/api/admin/strike-reasons", isAuthenticated, isAdmin, async (_req, res) => {
    try {
      const reasons = await storage.getStrikeReasons();
      res.json(reasons);
    } catch (error) {
      handleApiError(res, error);
    }
  });

  app.post("/api/admin/strike-reasons", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const data = insertStrikeReasonSchema.parse(req.body);
      const reason = await storage.createStrikeReason(data);
      res.status(201).json(reason);
    } catch (error) {
      handleApiError(res, error);
    }
  });

  app.put("/api/admin/strike-reasons/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid reason ID" });
      const reason = await storage.updateStrikeReason(id, req.body);
      if (!reason) return res.status(404).json({ message: "Reason not found" });
      res.json(reason);
    } catch (error) {
      handleApiError(res, error);
    }
  });

  app.delete("/api/admin/strike-reasons/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid reason ID" });
      await storage.deleteStrikeReason(id);
      res.sendStatus(204);
    } catch (error) {
      handleApiError(res, error);
    }
  });

  app.get("/api/settings", async (_req, res) => {
    try {
      const rate = await getServiceFeeRate();
      const logo = await storage.getSiteSetting("logo");
      const title =
        (await storage.getSiteSetting("site_title")) ||
        "SY Closeouts - B2B Wholesale Liquidation Marketplace";
      const favicon = await storage.getSiteSetting("favicon");
      res.json({ commissionRate: rate, logo, siteTitle: title, favicon });
    } catch (error) {
      handleApiError(res, error);
    }
  });

  app.get("/api/admin/settings", isAuthenticated, isAdmin, async (_req, res) => {
    try {
      const rate = await getServiceFeeRate();
      const logo = await storage.getSiteSetting("logo");
      const title =
        (await storage.getSiteSetting("site_title")) ||
        "SY Closeouts - B2B Wholesale Liquidation Marketplace";
      const favicon = await storage.getSiteSetting("favicon");
      res.json({ commissionRate: rate, logo, siteTitle: title, favicon });
    } catch (error) {
      handleApiError(res, error);
    }
  });

  app.put("/api/admin/settings", isAuthenticated, isAdmin, async (req, res) => {
    try {
      if (req.body.commissionRate !== undefined) {
        await storage.setSiteSetting("commission_rate", String(req.body.commissionRate));
      }
      if (req.body.logo !== undefined) {
        await storage.setSiteSetting("logo", req.body.logo ?? "");
      }
      if (req.body.siteTitle !== undefined) {
        await storage.setSiteSetting("site_title", req.body.siteTitle ?? "");
      }
      if (req.body.favicon !== undefined) {
        await storage.setSiteSetting("favicon", req.body.favicon ?? "");
      }
      res.sendStatus(204);
    } catch (error) {
      handleApiError(res, error);
    }
  });

  app.get("/api/admin/billing", isAuthenticated, isAdmin, async (_req, res) => {
    try {
      const orders = await storage.getOrdersForBilling();
      res.json(orders);
    } catch (error) {
      handleApiError(res, error);
    }
  });

  app.get("/api/admin/payouts", isAuthenticated, isAdmin, async (_req, res) => {
    try {
      const orders = await storage.getDeliveredUnpaidOrders();
      const groups: Record<string, any> = {};
      for (const o of orders) {
        const base = o.delivered_at ? new Date(o.delivered_at) : new Date();
        const payout = new Date(base);
        payout.setDate(payout.getDate() + 7);
        const key = `${o.seller_id}-${payout.toISOString().slice(0, 10)}`;
        if (!groups[key]) {
          groups[key] = {
            seller_id: o.seller_id,
            seller_first_name: o.seller_first_name,
            seller_last_name: o.seller_last_name,
            seller_email: o.seller_email,
            bank_name: o.bank_name,
            account_number: o.account_number,
            routing_number: o.routing_number,
            payout_date: payout.toISOString(),
            orders: [],
            total: 0,
          };
        }
        const items = await storage.getOrderItems(o.id);
        const productTotalWithFee = items.reduce((sum, i) => sum + Number(i.totalPrice), 0);
        const shippingTotal = Number(o.total_amount) - productTotalWithFee;
        const rate = await getServiceFeeRate();
        // Calculate the seller payout by removing the service fee from the
        // product total. Use the same rounding logic as when the fee was
        // applied so the amount matches what sellers expect.
        const payoutAmount =
          Math.round((subtractServiceFee(productTotalWithFee, rate) + shippingTotal) * 100) / 100;
        groups[key].orders.push({ id: o.id, code: o.code, total_amount: payoutAmount });
        groups[key].total += payoutAmount;
      }
      res.json(Object.values(groups));
    } catch (error) {
      handleApiError(res, error);
    }
  });

  app.get("/api/admin/wire-orders", isAuthenticated, isAdmin, async (_req, res) => {
    try {
      const orders = await storage.getWireOrders();
      res.json(orders);
    } catch (error) {
      handleApiError(res, error);
    }
  });

  app.get("/api/admin/recent-payouts", isAuthenticated, isAdmin, async (_req, res) => {
    try {
      const payouts = await storage.getRecentPayouts(10);
      const groups: Record<number, any> = {};
      for (const p of payouts) {
        const base = p.delivered_at ? new Date(p.delivered_at) : new Date();
        const payoutDate = new Date(base);
        payoutDate.setDate(payoutDate.getDate() + 7);
        if (!groups[p.seller_id]) {
          groups[p.seller_id] = {
            seller_id: p.seller_id,
            seller_first_name: p.seller_first_name,
            seller_last_name: p.seller_last_name,
            seller_email: p.seller_email,
            payouts: [],
            total: 0,
          };
        }
        const items = await storage.getOrderItems(p.id);
        const productTotalWithFee = items.reduce(
          (sum, i) => sum + Number(i.totalPrice),
          0,
        );
        const shippingTotal = Number(p.total_amount) - productTotalWithFee;
        const rate = await getServiceFeeRate();
        const payoutAmount =
          Math.round((subtractServiceFee(productTotalWithFee, rate) + shippingTotal) * 100) /
          100;
        groups[p.seller_id].payouts.push({
          id: p.id,
          code: p.code,
          payout_date: payoutDate.toISOString(),
          total_amount: payoutAmount,
        });
        groups[p.seller_id].total += payoutAmount;
      }
      res.json(Object.values(groups));
    } catch (error) {
      handleApiError(res, error);
    }
  });

  app.get("/api/admin/top-sellers", isAuthenticated, isAdmin, async (_req, res) => {
    try {
      const sellers = await storage.getTopSellers(10);
      res.json(sellers);
    } catch (error) {
      handleApiError(res, error);
    }
  });

  app.post(
    "/api/admin/payouts/notify",
    isAuthenticated,
    isAdmin,
    async (req, res) => {
      try {
        const { sellerEmail, orders, bankLast4 } = req.body as {
          sellerEmail?: string;
          orders?: { code: string; total: number }[];
          bankLast4?: string;
        };
        if (!sellerEmail || !Array.isArray(orders) || orders.some(o => !o.code || o.total === undefined)) {
          return res.status(400).json({ message: "Invalid parameters" });
        }

        const amount = orders.reduce((sum, o) => sum + Number(o.total), 0);
        await sendSellerPayoutEmail(sellerEmail, amount, orders, bankLast4 || "");
        res.sendStatus(204);
      } catch (error) {
        handleApiError(res, error);
      }
    },
  );

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

  app.post(
    "/api/admin/orders/:id/mark-delivered",
    isAuthenticated,
    isAdmin,
    async (req, res) => {
      try {
        const id = parseInt(req.params.id, 10);
        if (Number.isNaN(id)) {
          return res.status(400).json({ message: "Invalid order ID" });
        }
        const order = await storage.updateOrder(id, {
          status: "delivered",
          deliveredAt: new Date(),
        });
        res.json(order);
      } catch (error) {
        handleApiError(res, error);
      }
    },
  );

  app.post(
    "/api/admin/orders/:id/mark-wire-paid",
    isAuthenticated,
    isAdmin,
    async (req, res) => {
      try {
        const id = parseInt(req.params.id, 10);
        if (Number.isNaN(id)) {
          return res.status(400).json({ message: "Invalid order ID" });
        }
        const order = await storage.updateOrder(id, { status: "ordered" });
        if (!order) {
          return res.status(404).json({ message: "Order not found" });
        }

        // Gather order items for the invoice
        const items = await storage.getOrderItemsWithProducts(order.id);
        const invoiceItems = items.map((i) => ({
          title: i.productTitle,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          totalPrice: i.totalPrice,
          selectedVariations: i.selectedVariations ?? undefined,
          image: i.productImages?.[0],
        }));

        // Notify buyer with the invoice now that payment is received
        const buyer = await storage.getUser(order.buyerId);
        if (buyer) {
          sendInvoiceEmail(buyer.email, order, invoiceItems, buyer).catch(console.error);
        }

        // Inform the seller of the finalized order
        const seller = await storage.getUser(order.sellerId);
        if (seller) {
          sendSellerOrderEmail(seller.email, order, invoiceItems, buyer ?? undefined, seller).catch(console.error);
        }

        res.json(order);
      } catch (error) {
        handleApiError(res, error);
      }
    },
  );

  app.post(
    "/api/admin/orders/:id/send-wire-reminder",
    isAuthenticated,
    isAdmin,
    async (req, res) => {
      try {
        const id = parseInt(req.params.id, 10);
        if (Number.isNaN(id)) {
          return res.status(400).json({ message: "Invalid order ID" });
        }
        const order = await storage.getOrder(id);
        if (!order) {
          return res.status(404).json({ message: "Order not found" });
        }
        const buyer = await storage.getUser(order.buyerId);
        if (buyer) {
          await sendWireReminderEmail(buyer.email, order.code);
        }
        res.sendStatus(204);
      } catch (error) {
        handleApiError(res, error);
      }
    },
  );

  app.post(
    "/api/admin/orders/:id/cancel",
    isAuthenticated,
    isAdmin,
    async (req, res) => {
      try {
        const id = parseInt(req.params.id, 10);
        if (Number.isNaN(id)) {
          return res.status(400).json({ message: "Invalid order ID" });
        }
        const order = await storage.getOrder(id);
        if (!order) {
          return res.status(404).json({ message: "Order not found" });
        }
        if (order.status !== "awaiting_wire") {
          return res.status(400).json({ message: "Order cannot be cancelled" });
        }

        const updatedOrder = await storage.updateOrder(id, { status: "cancelled" });
        res.json(updatedOrder);

        const buyer = await storage.getUser(order.buyerId);
        if (buyer) {
          sendOrderCancelledEmail(buyer.email, order.code).catch(console.error);
        }

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
      if (req.query.status) filter.status = String(req.query.status);
      const offers = await storage.getOffers(filter);
      const now = new Date();
      for (const o of offers) {
        if (o.status === 'accepted') {
          if ((o.expiresAt && new Date(o.expiresAt) < now) || o.productAvailableUnits === 0) {
            await storage.updateOffer(o.id, { status: 'expired' });
            o.status = 'expired';
          }
        }
      }
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

      const updated = await storage.updateOffer(offerId, {
        status: 'accepted',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });

      await storage.createNotification({
        userId: offer.buyerId,
        type: 'offer',
        content: `Your offer for ${offer.quantity} units was accepted`,
        link: `/buyer/offers`,
      });

      res.json(updated);
    } catch (error) {
      handleApiError(res, error);
    }
  });

  app.post("/api/offers/:id/counter", isAuthenticated, async (req, res) => {
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

      const { price, quantity } = req.body as { price: number; quantity: number };
      const product = await storage.getProduct(offer.productId);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      if (typeof price !== 'number' || price <= 0 || typeof quantity !== 'number' || quantity <= 0) {
        return res.status(400).json({ message: 'Invalid counter offer data' });
      }
      if (quantity > product.availableUnits) {
        return res.status(400).json({ message: 'Quantity exceeds available stock' });
      }

      const updated = await storage.updateOffer(offerId, {
        price,
        quantity,
        status: 'countered',
      });

      await storage.createNotification({
        userId: offer.buyerId,
        type: 'offer',
        content: `Counter offer for ${product.title}`,
        link: `/buyer/offers`,
      });

      res.json(updated);
    } catch (error) {
      handleApiError(res, error);
    }
  });

  app.post("/api/offers/:id/accept-counter", isAuthenticated, async (req, res) => {
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
      if (user.role !== 'buyer' || offer.buyerId !== user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      if (offer.status !== 'countered') {
        return res.status(400).json({ message: 'Offer is not countered' });
      }

      const updated = await storage.updateOffer(offerId, {
        status: 'accepted',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });

      await storage.createNotification({
        userId: offer.sellerId,
        type: 'offer',
        content: `Counter offer accepted by buyer`,
        link: `/seller/offers`,
      });

      res.json(updated);
    } catch (error) {
      handleApiError(res, error);
    }
  });

  app.post("/api/offers/:id/reject-counter", isAuthenticated, async (req, res) => {
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
      if (user.role !== 'buyer' || offer.buyerId !== user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      if (offer.status !== 'countered') {
        return res.status(400).json({ message: 'Offer is not countered' });
      }

      await storage.updateOffer(offerId, { status: 'rejected' });

      await storage.createNotification({
        userId: offer.sellerId,
        type: 'offer',
        content: `Counter offer rejected by buyer`,
        link: `/seller/offers`,
      });

      res.sendStatus(204);
    } catch (error) {
      handleApiError(res, error);
    }
  });

  app.post("/api/offers/:id/counter-buyer", isAuthenticated, async (req, res) => {
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
      if (user.role !== 'buyer' || offer.buyerId !== user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      if (offer.status !== 'countered') {
        return res.status(400).json({ message: 'Offer is not countered' });
      }

      const { price, quantity } = req.body as { price: number; quantity: number };
      const product = await storage.getProduct(offer.productId);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      if (typeof price !== 'number' || price <= 0 || typeof quantity !== 'number' || quantity <= 0) {
        return res.status(400).json({ message: 'Invalid counter offer data' });
      }
      if (quantity > product.availableUnits) {
        return res.status(400).json({ message: 'Quantity exceeds available stock' });
      }

      const updated = await storage.updateOffer(offerId, {
        price,
        quantity,
        status: 'countered',
      });

      await storage.createNotification({
        userId: offer.sellerId,
        type: 'offer',
        content: `Counter offer from buyer for ${product.title}`,
        link: `/seller/offers`,
      });

      res.json(updated);
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
      const updateData: any = {
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        company: req.body.company,
        phone: req.body.phone,
        address: req.body.address,
        avatarUrl: req.body.avatarUrl,
      };

      if (req.body.resaleCertUrl) {
        updateData.resaleCertUrl = req.body.resaleCertUrl;
        updateData.resaleCertStatus = "pending";
      }

      const updatedUser = await storage.updateUser(user.id, updateData);

      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      const { password, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      handleApiError(res, error);
    }
  });

  // Allow sellers to update their banking details
  app.put("/api/users/me/bank", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as Express.User;
      const updatedUser = await storage.updateUser(user.id, {
        bankName: req.body.bankName,
        accountNumber: req.body.accountNumber,
        routingNumber: req.body.routingNumber,
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
      const data = insertAddressSchema.parse({ ...req.body, userId: user.id });
      const address = await storage.createAddress(data);
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

      const { id: _ignore, createdAt, ...data } = req.body as Record<string, any>;
      const updated = await storage.updateAddress(id, data);
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

  // Strike routes
  app.get("/api/strikes", isAuthenticated, isAdmin, async (_req, res) => {
    try {
      const strikes = await storage.getAllStrikes();
      res.json(strikes);
    } catch (error) {
      handleApiError(res, error);
    }
  });

  app.post("/api/strikes", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { userId, reason, message, suspensionDays, permanent } = req.body as {
        userId: number;
        reason: string;
        message?: string;
        suspensionDays?: number;
        permanent?: boolean;
      };
      if (!userId || !reason) {
        return res.status(400).json({ message: "Missing userId or reason" });
      }
      const user = await storage.getUser(Number(userId));
      if (!user) return res.status(404).json({ message: "User not found" });

      const prev = await storage.getUserStrikes(Number(userId));
      const strikeNumber = prev.length + 1;

      const strike = await storage.createUserStrike({ userId: Number(userId), reason });

      if (permanent) {
        const until = new Date(Date.now() + 36500 * 86400000);
        await storage.updateUser(user.id, { suspendedUntil: until });
        await sendSuspensionEmail(user.email);
      } else if (suspensionDays && suspensionDays > 0) {
        const until = new Date(Date.now() + suspensionDays * 86400000);
        await storage.updateUser(user.id, { suspendedUntil: until });
        await sendSuspensionEmail(user.email, suspensionDays);
      }

      await sendStrikeEmail(user.email, reason, strikeNumber, suspensionDays, permanent, message);
      res.status(201).json(strike);
    } catch (error) {
      handleApiError(res, error);
    }
  });

  app.get(
    "/api/users/:id/strikes",
    isAuthenticated,
    isAdmin,
    async (req, res) => {
      try {
        const id = parseInt(req.params.id, 10);
        if (Number.isNaN(id)) {
          return res.status(400).json({ message: "Invalid user ID" });
        }
        const strikes = await storage.getUserStrikes(id);
        res.json(strikes);
      } catch (error) {
        handleApiError(res, error);
      }
    },
  );

  app.get("/api/admin/strike-candidates", isAuthenticated, isAdmin, async (_req, res) => {
    try {
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const [messages, questions, wireOrders, users] = await Promise.all([
        storage.getMessagesSince(since),
        storage.getProductQuestionsSince(since),
        storage.getWireOrders(),
        storage.getUsers(),
      ]);
      const userMap = new Map(users.map(u => [u.id, u]));
      const candidates: Record<number, { userId: number; firstName: string; lastName: string; email: string; reasons: string[] }> = {};
      const add = (id: number, reason: string) => {
        const u = userMap.get(id);
        if (!u) return;
        if (!candidates[id]) {
          candidates[id] = { userId: id, firstName: u.firstName, lastName: u.lastName, email: u.email, reasons: [] };
        }
        if (!candidates[id].reasons.includes(reason)) candidates[id].reasons.push(reason);
      };
      for (const m of messages) {
        if (containsContactInfo(m.content)) add(m.senderId, "Shared contact info");
      }
      for (const q of questions) {
        if (containsContactInfo(q.question)) add(q.buyerId, "Shared contact info");
      }
      const now = Date.now();
      for (const o of wireOrders) {
        if (new Date(o.created_at).getTime() + 48 * 60 * 60 * 1000 < now) {
          add(o.buyer_id, "Wire payment overdue");
        }
      }
      res.json(Object.values(candidates));
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
      try {
        await sendSupportTicketEmail(user.email, ticket.id);
      } catch (err) {
        console.error("Failed to send support ticket email", err);
      }
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