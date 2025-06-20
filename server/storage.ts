import {
  users, User, InsertUser,
  products, Product, InsertProduct,
  orders, Order, InsertOrder,
  orderItems, OrderItem, InsertOrderItem,
  sellerApplications, SellerApplication, InsertSellerApplication,
  carts, Cart, InsertCart,
  addresses, Address, InsertAddress,
  paymentMethods, PaymentMethod, InsertPaymentMethod,
  messages, Message, InsertMessage,
  productQuestions, ProductQuestion, InsertProductQuestion,
  supportTickets, SupportTicket, InsertSupportTicket,
  notifications, Notification, InsertNotification
} from "@shared/schema";
import session from "express-session";
import { db, pool } from "./db";
import { eq, and, or, desc, SQL, ilike, lte, sql } from "drizzle-orm";
import connectPgSimple from "connect-pg-simple";

const PgStore = connectPgSimple(session);

// Storage interface
export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<User>): Promise<User | undefined>;
  getUsers(): Promise<User[]>;
  
  // Product methods
  getProduct(id: number): Promise<Product | undefined>;
  getProducts(filter?: Partial<Product>): Promise<Product[]>;
  searchProducts(query: string, filter?: Partial<Product>): Promise<Product[]>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, product: Partial<Product>): Promise<Product | undefined>;
  deleteProduct(id: number): Promise<boolean>;
  
  // Order methods
  getOrder(id: number): Promise<Order | undefined>;
  getOrders(filter?: Partial<Order>): Promise<Order[]>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrder(id: number, order: Partial<Order>): Promise<Order | undefined>;
  
  // Order item methods
  getOrderItems(orderId: number): Promise<OrderItem[]>;
  getOrderItemsWithProducts(orderId: number): Promise<(OrderItem & { productTitle: string; productImages: string[] })[]>;
  createOrderItem(orderItem: InsertOrderItem): Promise<OrderItem>;
  
  // Seller application methods
  getSellerApplication(id: number): Promise<SellerApplication | undefined>;
  getSellerApplicationByUserId(userId: number): Promise<SellerApplication | undefined>;
  getSellerApplications(filter?: Partial<SellerApplication>): Promise<SellerApplication[]>;
  createSellerApplication(application: InsertSellerApplication): Promise<SellerApplication>;
  updateSellerApplication(id: number, application: Partial<SellerApplication>): Promise<SellerApplication | undefined>;

  // Address methods
  getAddresses(userId: number): Promise<Address[]>;
  getAddress(id: number): Promise<Address | undefined>;
  createAddress(address: InsertAddress): Promise<Address>;
  updateAddress(id: number, address: Partial<Address>): Promise<Address | undefined>;
  deleteAddress(id: number): Promise<boolean>;

  // Payment method methods
  getPaymentMethods(userId: number): Promise<PaymentMethod[]>;
  getPaymentMethod(id: number): Promise<PaymentMethod | undefined>;
  createPaymentMethod(method: InsertPaymentMethod): Promise<PaymentMethod>;
  updatePaymentMethod(id: number, method: Partial<PaymentMethod>): Promise<PaymentMethod | undefined>;
  deletePaymentMethod(id: number): Promise<boolean>;

  getLowStockProducts(userId: number, threshold: number): Promise<Product[]>;

  // Message methods
  getOrderMessages(orderId: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  markMessagesAsRead(orderId: number, userId: number): Promise<void>;
  getConversationMessages(userA: number, userB: number): Promise<Message[]>;
  markConversationAsRead(receiverId: number, senderId: number): Promise<void>;
  getLatestOrderBetweenUsers(buyerId: number, sellerId: number): Promise<Order | undefined>;
  getUnreadMessageCount(userId: number): Promise<number>;

  // Notification methods
  getNotifications(userId: number): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationsAsRead(userId: number): Promise<void>;
  getUnreadNotificationCount(userId: number): Promise<number>;

  // Product question methods
  createProductQuestion(question: InsertProductQuestion): Promise<ProductQuestion>;
  getProductQuestionsForSeller(sellerId: number): Promise<ProductQuestion[]>;

  // Support ticket methods
  getSupportTickets(filter?: { userId?: number; status?: string }): Promise<SupportTicket[]>;
  getSupportTicket(id: number): Promise<SupportTicket | undefined>;
  createSupportTicket(ticket: InsertSupportTicket): Promise<SupportTicket>;
  respondToSupportTicket(id: number, response: string): Promise<SupportTicket | undefined>;

  // Cart methods
  getCart(userId: number): Promise<Cart | undefined>;
  createOrUpdateCart(cart: InsertCart): Promise<Cart>;
  
  // Session store
  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PgStore({ 
      pool, 
      createTableIfMissing: true 
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set(userData)
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  async getUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  // Product methods
  async getProduct(id: number): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product;
  }

  async getProducts(filter?: Partial<Product>): Promise<Product[]> {
    if (!filter) {
      return await db.select().from(products).orderBy(desc(products.createdAt));
    }

    // Build the conditions based on the filter
    const conditions: SQL<unknown>[] = [];
    if (filter.id !== undefined) conditions.push(eq(products.id, filter.id));
    if (filter.sellerId !== undefined) conditions.push(eq(products.sellerId, filter.sellerId));
    if (filter.category !== undefined) conditions.push(eq(products.category, filter.category));
    if (filter.condition !== undefined) conditions.push(eq(products.condition, filter.condition));
    if (filter.isBanner !== undefined) conditions.push(eq(products.isBanner, filter.isBanner));

    // If there are no conditions, return all products
    if (conditions.length === 0) {
      return await db.select().from(products).orderBy(desc(products.createdAt));
    }

    // Filter out undefined conditions and check if there are any conditions left
    const validConditions = conditions.filter(c => c !== undefined);
    
    if (validConditions.length === 0) {
      return await db.select().from(products).orderBy(desc(products.createdAt));
    }
    
    // Combine all valid conditions with AND
    let combinedCondition = validConditions[0];
    for (let i = 1; i < validConditions.length; i++) {
      combinedCondition = and(combinedCondition, validConditions[i]);
    }

    return await db
      .select()
      .from(products)
      .where(combinedCondition)
      .orderBy(desc(products.createdAt));
  }

  async searchProducts(query: string, filter: Partial<Product> = {}): Promise<Product[]> {
    const conditions: SQL<unknown>[] = [ilike(products.title, `%${query}%`)];

    if (filter.category !== undefined) conditions.push(eq(products.category, filter.category));
    if (filter.sellerId !== undefined) conditions.push(eq(products.sellerId, filter.sellerId));
    if (filter.condition !== undefined) conditions.push(eq(products.condition, filter.condition));
    if (filter.isBanner !== undefined) conditions.push(eq(products.isBanner, filter.isBanner));

    let combinedCondition = conditions[0];
    for (let i = 1; i < conditions.length; i++) {
      combinedCondition = and(combinedCondition, conditions[i]);
    }

    return await db
      .select()
      .from(products)
      .where(combinedCondition)
      .orderBy(desc(products.createdAt));
  }

  async createProduct(insertProduct: InsertProduct): Promise<Product> {
    const [product] = await db.insert(products).values(insertProduct).returning();
    return product;
  }

  async updateProduct(id: number, productData: Partial<Product>): Promise<Product | undefined> {
    const [updatedProduct] = await db
      .update(products)
      .set(productData)
      .where(eq(products.id, id))
      .returning();
    return updatedProduct;
  }

  async deleteProduct(id: number): Promise<boolean> {
    const [deletedProduct] = await db
      .delete(products)
      .where(eq(products.id, id))
      .returning();
    return !!deletedProduct;
  }

  async getLowStockProducts(userId: number, threshold: number): Promise<Product[]> {
    return await db
      .select()
      .from(products)
      .where(and(eq(products.sellerId, userId), lte(products.availableUnits, threshold)))
      .orderBy(desc(products.createdAt));
  }

  // Order methods
  async getOrder(id: number): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    return order;
  }

  async getOrders(filter?: Partial<Order>): Promise<Order[]> {
    if (!filter) {
      return await db.select().from(orders).orderBy(desc(orders.createdAt));
    }

    const conditions: SQL<unknown>[] = [];
    if (filter.id !== undefined) conditions.push(eq(orders.id, filter.id));
    if (filter.buyerId !== undefined) conditions.push(eq(orders.buyerId, filter.buyerId));
    if (filter.sellerId !== undefined) conditions.push(eq(orders.sellerId, filter.sellerId));
    if (filter.status !== undefined) conditions.push(eq(orders.status, filter.status));

    // Filter out undefined conditions and check if there are any conditions left
    const validConditions = conditions.filter(c => c !== undefined);
    
    if (validConditions.length === 0) {
      return await db.select().from(orders).orderBy(desc(orders.createdAt));
    }
    
    // Combine all valid conditions with AND
    let combinedCondition = validConditions[0];
    for (let i = 1; i < validConditions.length; i++) {
      combinedCondition = and(combinedCondition, validConditions[i]);
    }

    return await db
      .select()
      .from(orders)
      .where(combinedCondition)
      .orderBy(desc(orders.createdAt));
  }

  async createOrder(insertOrder: InsertOrder): Promise<Order> {
    const [order] = await db.insert(orders).values(insertOrder).returning();
    return order;
  }

  async updateOrder(id: number, orderData: Partial<Order>): Promise<Order | undefined> {
    const [updatedOrder] = await db
      .update(orders)
      .set(orderData)
      .where(eq(orders.id, id))
      .returning();
    return updatedOrder;
  }

  // Order item methods
  async getOrderItems(orderId: number): Promise<OrderItem[]> {
    return await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId));
  }

  async getOrderItemsWithProducts(orderId: number): Promise<(OrderItem & { productTitle: string; productImages: string[] })[]> {
    return await db
      .select({
        id: orderItems.id,
        orderId: orderItems.orderId,
        productId: orderItems.productId,
        quantity: orderItems.quantity,
        unitPrice: orderItems.unitPrice,
        totalPrice: orderItems.totalPrice,
        productTitle: products.title,
        productImages: products.images,
      })
      .from(orderItems)
      .innerJoin(products, eq(orderItems.productId, products.id))
      .where(eq(orderItems.orderId, orderId));
  }

  async createOrderItem(insertOrderItem: InsertOrderItem): Promise<OrderItem> {
    const [orderItem] = await db
      .insert(orderItems)
      .values(insertOrderItem)
      .returning();
    return orderItem;
  }

  // Seller application methods
  async getSellerApplication(id: number): Promise<SellerApplication | undefined> {
    const [application] = await db
      .select()
      .from(sellerApplications)
      .where(eq(sellerApplications.id, id));
    return application;
  }

  async getSellerApplicationByUserId(userId: number): Promise<SellerApplication | undefined> {
    const [application] = await db
      .select()
      .from(sellerApplications)
      .where(eq(sellerApplications.userId, userId));
    return application;
  }

  async getSellerApplications(filter?: Partial<SellerApplication>): Promise<SellerApplication[]> {
    if (!filter) {
      return await db
        .select()
        .from(sellerApplications)
        .orderBy(desc(sellerApplications.createdAt));
    }

    const conditions: SQL<unknown>[] = [];
    if (filter.id !== undefined) conditions.push(eq(sellerApplications.id, filter.id));
    if (filter.userId !== undefined) conditions.push(eq(sellerApplications.userId, filter.userId));
    if (filter.status !== undefined) conditions.push(eq(sellerApplications.status, filter.status));

    // Filter out undefined conditions and check if there are any conditions left
    const validConditions = conditions.filter(c => c !== undefined);
    
    if (validConditions.length === 0) {
      return await db
        .select()
        .from(sellerApplications)
        .orderBy(desc(sellerApplications.createdAt));
    }
    
    // Combine all valid conditions with AND
    let combinedCondition = validConditions[0];
    for (let i = 1; i < validConditions.length; i++) {
      combinedCondition = and(combinedCondition, validConditions[i]);
    }

    return await db
      .select()
      .from(sellerApplications)
      .where(combinedCondition)
      .orderBy(desc(sellerApplications.createdAt));
  }

  async createSellerApplication(insertApplication: InsertSellerApplication): Promise<SellerApplication> {
    const [application] = await db
      .insert(sellerApplications)
      .values(insertApplication)
      .returning();
    return application;
  }

  async updateSellerApplication(id: number, applicationData: Partial<SellerApplication>): Promise<SellerApplication | undefined> {
    const [updatedApplication] = await db
      .update(sellerApplications)
      .set(applicationData)
      .where(eq(sellerApplications.id, id))
      .returning();
    return updatedApplication;
  }

  // Address methods
  async getAddresses(userId: number): Promise<Address[]> {
    return await db.select().from(addresses).where(eq(addresses.userId, userId));
  }

  async getAddress(id: number): Promise<Address | undefined> {
    const [address] = await db.select().from(addresses).where(eq(addresses.id, id));
    return address;
  }

  async createAddress(addressData: InsertAddress): Promise<Address> {
    const [address] = await db.insert(addresses).values(addressData).returning();
    return address;
  }

  async updateAddress(id: number, addressData: Partial<Address>): Promise<Address | undefined> {
    const [address] = await db
      .update(addresses)
      .set(addressData)
      .where(eq(addresses.id, id))
      .returning();
    return address;
  }

  async deleteAddress(id: number): Promise<boolean> {
    const [address] = await db.delete(addresses).where(eq(addresses.id, id)).returning();
    return !!address;
  }

  // Payment method methods
  async getPaymentMethods(userId: number): Promise<PaymentMethod[]> {
    return await db.select().from(paymentMethods).where(eq(paymentMethods.userId, userId));
  }

  async getPaymentMethod(id: number): Promise<PaymentMethod | undefined> {
    const [method] = await db.select().from(paymentMethods).where(eq(paymentMethods.id, id));
    return method;
  }

  async createPaymentMethod(methodData: InsertPaymentMethod): Promise<PaymentMethod> {
    const [method] = await db.insert(paymentMethods).values(methodData).returning();
    return method;
  }

  async updatePaymentMethod(id: number, methodData: Partial<PaymentMethod>): Promise<PaymentMethod | undefined> {
    const [method] = await db
      .update(paymentMethods)
      .set(methodData)
      .where(eq(paymentMethods.id, id))
      .returning();
    return method;
  }

  async deletePaymentMethod(id: number): Promise<boolean> {
    const [method] = await db.delete(paymentMethods).where(eq(paymentMethods.id, id)).returning();
    return !!method;
  }

  // Message methods
  async getOrderMessages(orderId: number): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(eq(messages.orderId, orderId))
      .orderBy(messages.createdAt);
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const [msg] = await db.insert(messages).values(insertMessage).returning();
    return msg;
  }

  async markMessagesAsRead(orderId: number, userId: number): Promise<void> {
    await db
      .update(messages)
      .set({ isRead: true })
      .where(and(eq(messages.orderId, orderId), eq(messages.receiverId, userId)));
  }

  async getConversationMessages(userA: number, userB: number): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(
        or(
          and(eq(messages.senderId, userA), eq(messages.receiverId, userB)),
          and(eq(messages.senderId, userB), eq(messages.receiverId, userA))
        )
      )
      .orderBy(messages.createdAt);
  }

  async markConversationAsRead(receiverId: number, senderId: number): Promise<void> {
    await db
      .update(messages)
      .set({ isRead: true })
      .where(and(eq(messages.receiverId, receiverId), eq(messages.senderId, senderId)));
  }

  async getLatestOrderBetweenUsers(buyerId: number, sellerId: number): Promise<Order | undefined> {
    const ordersBetween = await this.getOrders({ buyerId, sellerId });
    return ordersBetween[0];
  }

  async getUnreadMessageCount(userId: number): Promise<number> {
    const [res] = await db
      .select({ count: sql`count(*)`.mapWith(Number) })
      .from(messages)
      .where(and(eq(messages.receiverId, userId), eq(messages.isRead, false)));
    return res?.count ?? 0;
  }

  // Product question methods
  async createProductQuestion(insertQuestion: InsertProductQuestion): Promise<ProductQuestion> {
    const [q] = await db.insert(productQuestions).values(insertQuestion).returning();
    return q;
  }

  async getProductQuestionsForSeller(sellerId: number): Promise<ProductQuestion[]> {
    return await db
      .select()
      .from(productQuestions)
      .where(eq(productQuestions.sellerId, sellerId))
      .orderBy(desc(productQuestions.createdAt));
  }

  // Support ticket methods
  async getSupportTickets(filter?: { userId?: number; status?: string }): Promise<SupportTicket[]> {
    const conditions: SQL<unknown>[] = [];
    if (filter?.userId !== undefined) conditions.push(eq(supportTickets.userId, filter.userId));
    if (filter?.status !== undefined) conditions.push(eq(supportTickets.status, filter.status));

    if (conditions.length > 0) {
      return await db.select().from(supportTickets).where(and(...conditions)).orderBy(desc(supportTickets.createdAt));
    }
    return await db.select().from(supportTickets).orderBy(desc(supportTickets.createdAt));
  }

  async getSupportTicket(id: number): Promise<SupportTicket | undefined> {
    const [t] = await db.select().from(supportTickets).where(eq(supportTickets.id, id));
    return t;
  }

  async createSupportTicket(ticket: InsertSupportTicket): Promise<SupportTicket> {
    const [t] = await db.insert(supportTickets).values(ticket).returning();
    return t;
  }

  async respondToSupportTicket(id: number, response: string): Promise<SupportTicket | undefined> {
    const [t] = await db
      .update(supportTickets)
      .set({ response, status: 'closed', respondedAt: new Date() })
      .where(eq(supportTickets.id, id))
      .returning();
    return t;
  }

  // Notification methods
  async getNotifications(userId: number): Promise<Notification[]> {
    return await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  async createNotification(insertNotification: InsertNotification): Promise<Notification> {
    const [n] = await db
      .insert(notifications)
      .values(insertNotification)
      .returning();
    return n;
  }

  async markNotificationsAsRead(userId: number): Promise<void> {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.userId, userId));
  }

  async getUnreadNotificationCount(userId: number): Promise<number> {
    const [res] = await db
      .select({ count: sql`count(*)`.mapWith(Number) })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
    return res?.count ?? 0;
  }

  // Cart methods
  async getCart(userId: number): Promise<Cart | undefined> {
    const [cart] = await db
      .select()
      .from(carts)
      .where(eq(carts.userId, userId));
    return cart;
  }

  async createOrUpdateCart(insertCart: InsertCart): Promise<Cart> {
    const existingCart = await this.getCart(insertCart.userId);
    
    if (existingCart) {
      // Update existing cart
      const [updatedCart] = await db
        .update(carts)
        .set({
          items: insertCart.items,
          updatedAt: new Date(),
        })
        .where(eq(carts.userId, insertCart.userId))
        .returning();
      return updatedCart;
    } else {
      // Create new cart
      const [newCart] = await db
        .insert(carts)
        .values(insertCart)
        .returning();
      return newCart;
    }
  }
}

// Export an instance of the storage
export const storage = new DatabaseStorage();