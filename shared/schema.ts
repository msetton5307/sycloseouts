import { pgTable, text, serial, integer, boolean, jsonb, timestamp, doublePrecision, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// User schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  company: text("company"),
  phone: text("phone"),
  address: text("address"),
  role: text("role").notNull().default("buyer"), // buyer, seller, admin
  isSeller: boolean("is_seller").default(false),
  isApproved: boolean("is_approved").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  products: many(products),
  orders: many(orders),
  sellerApplications: many(sellerApplications),
  carts: many(carts),
}));

// Addresses schema
export const addresses = pgTable("addresses", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  company: text("company"),
  address: text("address").notNull(),
  city: text("city").notNull(),
  state: text("state").notNull(),
  zipCode: text("zip_code").notNull(),
  country: text("country").notNull(),
  phone: text("phone").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const addressesRelations = relations(addresses, ({ one }) => ({
  user: one(users, {
    fields: [addresses.userId],
    references: [users.id],
  }),
}));

export const insertAddressSchema = createInsertSchema(addresses).omit({
  id: true,
  createdAt: true,
});

// Payment methods schema
export const paymentMethods = pgTable("payment_methods", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  cardLast4: text("card_last4").notNull(),
  cardholderName: text("cardholder_name").notNull(),
  expMonth: text("exp_month").notNull(),
  expYear: text("exp_year").notNull(),
  brand: text("brand").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const paymentMethodsRelations = relations(paymentMethods, ({ one }) => ({
  user: one(users, {
    fields: [paymentMethods.userId],
    references: [users.id],
  }),
}));

export const insertPaymentMethodSchema = createInsertSchema(paymentMethods).omit({
  id: true,
  createdAt: true,
});

export const insertUserSchema = createInsertSchema(users)
  .pick({
    username: true,
    password: true,
    email: true,
    firstName: true,
    lastName: true,
    company: true,
    role: true,
  })
  .extend({
    phone: z.string().optional(),
    address: z.string().optional(),
  })
  .refine((data) => data.password.length >= 6, {
    message: "Password must be at least 6 characters long",
    path: ["password"],
  });

// Product schema
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  sellerId: integer("seller_id").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  price: doublePrecision("price").notNull(),
  retailMsrp: doublePrecision("retail_msrp"),
  totalUnits: integer("total_units").notNull(),
  availableUnits: integer("available_units").notNull(),
  minOrderQuantity: integer("min_order_quantity").notNull(),
  orderMultiple: integer("order_multiple").notNull().default(1),
  images: text("images").array().notNull(),
  variations: jsonb("variations"),
  fobLocation: text("fob_location"),
  retailComparisonUrl: text("retail_comparison_url"),
  upc: text("upc"),
  isBanner: boolean("is_banner").default(false),
  condition: text("condition").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const productsRelations = relations(products, ({ one, many }) => ({
  seller: one(users, {
    fields: [products.sellerId],
    references: [users.id],
  }),
  orderItems: many(orderItems),
}));

export const insertProductSchema = createInsertSchema(products, {
  fobLocation: z.string().optional().nullable(),
  retailComparisonUrl: z.string().optional().nullable(),
  upc: z.string().optional().nullable(),
  retailMsrp: z.coerce.number().optional().nullable(),
  variations: z.record(z.array(z.string())).optional().nullable()
})
  .omit({
    id: true,
    createdAt: true,
  })
  .extend({
    // Images are optional for testing but an empty array will be stored
    images: z.array(z.string()).default([]),
    isBanner: z.boolean().optional(),
    orderMultiple: z.coerce.number().int().positive().default(1)
  });

// Order schema
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  buyerId: integer("buyer_id").notNull(),
  sellerId: integer("seller_id").notNull(),
  totalAmount: doublePrecision("total_amount").notNull(),
  status: text("status").notNull().default("ordered"), // ordered, shipped, out_for_delivery, delivered, cancelled
  shippingDetails: jsonb("shipping_details"),
  paymentDetails: jsonb("payment_details"),
  estimatedDeliveryDate: timestamp("estimated_delivery_date"),
  trackingNumber: text("tracking_number"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const ordersRelations = relations(orders, ({ one, many }) => ({
  buyer: one(users, {
    fields: [orders.buyerId],
    references: [users.id],
  }),
  seller: one(users, {
    fields: [orders.sellerId],
    references: [users.id],
  }),
  orderItems: many(orderItems),
}));

export const insertOrderSchema = createInsertSchema(orders)
  .omit({
    id: true,
    createdAt: true,
  })
  .extend({
    // Accept ISO date strings from the client
    estimatedDeliveryDate: z.coerce.date().optional(),
  });

// Order items schema
export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull(),
  productId: integer("product_id").notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: doublePrecision("unit_price").notNull(),
  totalPrice: doublePrecision("total_price").notNull(),
});

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
}));

export const insertOrderItemSchema = createInsertSchema(orderItems)
  .omit({
    id: true,
  });

// Seller application schema
export const sellerApplications = pgTable("seller_applications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  companyName: text("company_name").notNull(),
  contactEmail: text("contact_email").notNull(),
  contactPhone: text("contact_phone").notNull(),
  inventoryType: text("inventory_type").notNull(),
  yearsInBusiness: integer("years_in_business").notNull(),
  website: text("website"),
  additionalInfo: text("additional_info"),
  status: text("status").notNull().default("pending"), // pending, approved, rejected
  createdAt: timestamp("created_at").defaultNow(),
});

export const sellerApplicationsRelations = relations(sellerApplications, ({ one }) => ({
  user: one(users, {
    fields: [sellerApplications.userId],
    references: [users.id],
  }),
}));

export const insertSellerApplicationSchema = createInsertSchema(sellerApplications)
  .omit({
    id: true,
    status: true,
    createdAt: true,
  });

// Cart schema (for persistence if needed)
export const carts = pgTable("carts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  items: jsonb("items").notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const cartsRelations = relations(carts, ({ one }) => ({
  user: one(users, {
    fields: [carts.userId],
    references: [users.id],
  }),
}));

export const insertCartSchema = createInsertSchema(carts)
  .omit({
    id: true,
    updatedAt: true,
  });

// Messages between buyer and seller about an order
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull(),
  senderId: integer("sender_id").notNull(),
  receiverId: integer("receiver_id").notNull(),
  content: text("content").notNull(),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const messagesRelations = relations(messages, ({ one }) => ({
  order: one(orders, { fields: [messages.orderId], references: [orders.id] }),
  sender: one(users, { fields: [messages.senderId], references: [users.id] }),
  receiver: one(users, { fields: [messages.receiverId], references: [users.id] }),
}));

export const insertMessageSchema = createInsertSchema(messages)
  .omit({ id: true, isRead: true, createdAt: true });

// Questions that buyers can send about a product listing
export const productQuestions = pgTable("product_questions", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull(),
  buyerId: integer("buyer_id").notNull(),
  sellerId: integer("seller_id").notNull(),
  question: text("question").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const productQuestionsRelations = relations(productQuestions, ({ one }) => ({
  product: one(products, { fields: [productQuestions.productId], references: [products.id] }),
  buyer: one(users, { fields: [productQuestions.buyerId], references: [users.id] }),
  seller: one(users, { fields: [productQuestions.sellerId], references: [users.id] }),
}));

export const insertProductQuestionSchema = createInsertSchema(productQuestions)
  .omit({ id: true, createdAt: true });

// Support tickets that buyers and sellers can create
export const supportTickets = pgTable("support_tickets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  topic: text("topic").notNull(),
  subject: text("subject").notNull(),
  message: text("message").notNull(),
  response: text("response"),
  status: text("status").notNull().default("open"),
  createdAt: timestamp("created_at").defaultNow(),
  respondedAt: timestamp("responded_at"),
});

export const supportTicketsRelations = relations(supportTickets, ({ one }) => ({
  user: one(users, { fields: [supportTickets.userId], references: [users.id] }),
}));

export const insertSupportTicketSchema = createInsertSchema(supportTickets)
  .omit({
    id: true,
    response: true,
    status: true,
    respondedAt: true,
    createdAt: true,
  });

// In-app notifications for users
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  type: text("type").notNull(),
  content: text("content").notNull(),
  link: text("link"),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, { fields: [notifications.userId], references: [users.id] }),
}));

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  isRead: true,
  createdAt: true,
});

// Type definitions
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;

export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;

export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;

export type SellerApplication = typeof sellerApplications.$inferSelect;
export type InsertSellerApplication = z.infer<typeof insertSellerApplicationSchema>;

export type Cart = typeof carts.$inferSelect;
export type InsertCart = z.infer<typeof insertCartSchema>;

export type Address = typeof addresses.$inferSelect;
export type InsertAddress = z.infer<typeof insertAddressSchema>;

export type PaymentMethod = typeof paymentMethods.$inferSelect;
export type InsertPaymentMethod = z.infer<typeof insertPaymentMethodSchema>;

export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

export type ProductQuestion = typeof productQuestions.$inferSelect;
export type InsertProductQuestion = z.infer<typeof insertProductQuestionSchema>;

export type SupportTicket = typeof supportTickets.$inferSelect;
export type InsertSupportTicket = z.infer<typeof insertSupportTicketSchema>;

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

// Cart item interface for the frontend
export interface CartItem {
  productId: number;
  title: string;
  price: number;
  quantity: number;
  image: string;
  minOrderQuantity: number;
  orderMultiple: number;
  availableUnits: number;
}