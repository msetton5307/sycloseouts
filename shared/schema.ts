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
  bankName: text("bank_name"),
  accountNumber: text("account_number"),
  routingNumber: text("routing_number"),
  avatarUrl: text("avatar_url"),
  resaleCertUrl: text("resale_cert_url"),
  resaleCertStatus: text("resale_cert_status").default("none"),
  role: text("role").notNull().default("buyer"), // buyer, seller, admin
  isSeller: boolean("is_seller").default(false),
  isApproved: boolean("is_approved").default(false),
  suspendedUntil: timestamp("suspended_until"),
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

export const insertAddressSchema = createInsertSchema(addresses)
  .omit({
    id: true,
    createdAt: true,
  })
  .extend({
    address: z
      .string()
      .min(5, "Invalid address")
      .refine(
        (val) => /\d/.test(val) && /[A-Za-z]/.test(val),
        "Invalid address"
      ),
    zipCode: z
      .string()
      .regex(/^\d{5}(?:-\d{4})?$/, "Invalid ZIP code"),
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
    avatarUrl: z.string().optional(),
    resaleCertUrl: z.string().optional(),
    resaleCertStatus: z.string().optional(),
    bankName: z.string().optional(),
    accountNumber: z.string().optional(),
    routingNumber: z.string().optional(),
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
  variationPrices: jsonb("variation_prices"),
  variationStocks: jsonb("variation_stocks"),
  fobLocation: text("fob_location"),
  retailComparisonUrl: text("retail_comparison_url"),
  upc: text("upc"),
  shippingType: text("shipping_type"),
  shippingResponsibility: text("shipping_responsibility"),
  shippingFee: doublePrecision("shipping_fee"),
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
  variations: z.record(z.array(z.string())).optional().nullable(),
  variationPrices: z.record(z.number()).optional().nullable(),
  variationStocks: z.record(z.number()).optional().nullable()
})
  .omit({
    id: true,
    createdAt: true,
  })
  .extend({
    // Images are optional for testing but an empty array will be stored
    images: z.array(z.string()).default([]),
    isBanner: z.boolean().optional(),
    orderMultiple: z.coerce.number().int().positive().default(1),
    shippingType: z.string(),
    shippingResponsibility: z.string(),
    shippingFee: z.coerce.number().optional().nullable()
  });

// Order schema
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  buyerId: integer("buyer_id").notNull(),
  sellerId: integer("seller_id").notNull(),
  totalAmount: doublePrecision("total_amount").notNull(),
  status: text("status").notNull().default("ordered"), // awaiting_wire, ordered, shipped, out_for_delivery, delivered, cancelled
  shippingDetails: jsonb("shipping_details"),
  paymentDetails: jsonb("payment_details"),
  estimatedDeliveryDate: timestamp("estimated_delivery_date"),
  trackingNumber: text("tracking_number"),
  shippingChoice: text("shipping_choice"),
  shippingCarrier: text("shipping_carrier"),
  shippingLabel: text("shipping_label"),
  shippingPackage: jsonb("shipping_package"),
  buyerCharged: boolean("buyer_charged").default(false),
  sellerPaid: boolean("seller_paid").default(false),
  deliveredAt: timestamp("delivered_at"),
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
    code: true,
    buyerCharged: true,
    sellerPaid: true,
    deliveredAt: true,
    createdAt: true,
  })
  .extend({
    // Accept ISO date strings from the client
    estimatedDeliveryDate: z.coerce.date().optional(),
    shippingChoice: z.string().optional(),
    shippingCarrier: z.string().optional(),
    shippingLabel: z.string().optional(),
    shippingPackage: z.any().optional(),
  });

// Order items schema
export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull(),
  productId: integer("product_id").notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: doublePrecision("unit_price").notNull(),
  totalPrice: doublePrecision("total_price").notNull(),
  selectedVariations: jsonb("selected_variations"),
  shippingChoice: text("shipping_choice"),
  shippingCarrier: text("shipping_carrier"),
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
  })
  .extend({
    selectedVariations: z.record(z.string()).optional().nullable(),
    shippingChoice: z.string().optional(),
    shippingCarrier: z.string().optional(),
  });

// Seller application schema
export const sellerApplications = pgTable("seller_applications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  contactName: text("contact_name").notNull(),
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

// Offers that buyers can send to sellers for a product
export const offers = pgTable("offers", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull(),
  buyerId: integer("buyer_id").notNull(),
  sellerId: integer("seller_id").notNull(),
  price: doublePrecision("price").notNull(),
  serviceFee: doublePrecision("service_fee").notNull(),
  quantity: integer("quantity").notNull(),
  selectedVariations: jsonb("selected_variations"),
  status: text("status").notNull().default("pending"), // pending, accepted, rejected, countered, expired
  orderId: integer("order_id"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const offersRelations = relations(offers, ({ one }) => ({
  product: one(products, { fields: [offers.productId], references: [products.id] }),
  buyer: one(users, { fields: [offers.buyerId], references: [users.id] }),
  seller: one(users, { fields: [offers.sellerId], references: [users.id] }),
  order: one(orders, { fields: [offers.orderId], references: [orders.id] }),
}));

export const insertOfferSchema = createInsertSchema(offers)
  .omit({ id: true, status: true, orderId: true, expiresAt: true, createdAt: true })
  .extend({ selectedVariations: z.record(z.string()).optional().nullable() });

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

// Individual messages within a support ticket
export const supportTicketMessages = pgTable("support_ticket_messages", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id").notNull(),
  senderId: integer("sender_id").notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const supportTicketMessagesRelations = relations(supportTicketMessages, ({ one }) => ({
  ticket: one(supportTickets, { fields: [supportTicketMessages.ticketId], references: [supportTickets.id] }),
  sender: one(users, { fields: [supportTicketMessages.senderId], references: [users.id] }),
}));

export const insertSupportTicketMessageSchema = createInsertSchema(supportTicketMessages).omit({
  id: true,
  createdAt: true,
});

// Saved email templates for admin communications
export const emailTemplates = pgTable("email_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertEmailTemplateSchema = createInsertSchema(emailTemplates).omit({
  id: true,
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

// Logs of emails sent using templates
export const emailLogs = pgTable("email_logs", {
  id: serial("id").primaryKey(),
  templateId: integer("template_id")
    .notNull()
    .references(() => emailTemplates.id),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  toAddress: text("to_address").notNull(),
  subject: text("subject").notNull(),
  html: text("html").notNull(),
  success: boolean("success").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const emailLogsRelations = relations(emailLogs, ({ one }) => ({
  template: one(emailTemplates, {
    fields: [emailLogs.templateId],
    references: [emailTemplates.id],
  }),
  user: one(users, { fields: [emailLogs.userId], references: [users.id] }),
}));

export const insertEmailLogSchema = createInsertSchema(emailLogs).omit({
  id: true,
  createdAt: true,
});

// Strikes issued by admins to buyers or sellers
export const userStrikes = pgTable("user_strikes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  reason: text("reason").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const userStrikesRelations = relations(userStrikes, ({ one }) => ({
  user: one(users, { fields: [userStrikes.userId], references: [users.id] }),
}));

export const insertUserStrikeSchema = createInsertSchema(userStrikes).omit({
  id: true,
  createdAt: true,
});

// Notes created by admins about a user
export const userNotes = pgTable("user_notes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  adminId: integer("admin_id").notNull(),
  relatedUserId: integer("related_user_id"),
  note: text("note").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const userNotesRelations = relations(userNotes, ({ one }) => ({
  user: one(users, { fields: [userNotes.userId], references: [users.id] }),
  admin: one(users, { fields: [userNotes.adminId], references: [users.id] }),
  relatedUser: one(users, { fields: [userNotes.relatedUserId], references: [users.id] }),
}));

export const insertUserNoteSchema = createInsertSchema(userNotes).omit({
  id: true,
  createdAt: true,
});

// Predefined strike reasons with custom email text
export const strikeReasons = pgTable("strike_reasons", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  emailBody: text("email_body").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertStrikeReasonSchema = createInsertSchema(strikeReasons).omit({
  id: true,
  createdAt: true,
});

// Site-wide settings key/value store
export const siteSettings = pgTable("site_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export const insertSiteSettingSchema = createInsertSchema(siteSettings);

// Notes created by admins about a product
export const productNotes = pgTable("product_notes", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull(),
  adminId: integer("admin_id").notNull(),
  note: text("note").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const productNotesRelations = relations(productNotes, ({ one }) => ({
  product: one(products, { fields: [productNotes.productId], references: [products.id] }),
  admin: one(users, { fields: [productNotes.adminId], references: [users.id] }),
}));

export const insertProductNoteSchema = createInsertSchema(productNotes).omit({
  id: true,
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

export type Offer = typeof offers.$inferSelect;
export type InsertOffer = z.infer<typeof insertOfferSchema>;

export type SupportTicket = typeof supportTickets.$inferSelect;
export type InsertSupportTicket = z.infer<typeof insertSupportTicketSchema>;

export type SupportTicketMessage = typeof supportTicketMessages.$inferSelect;
export type InsertSupportTicketMessage = z.infer<typeof insertSupportTicketMessageSchema>;

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

export type UserStrike = typeof userStrikes.$inferSelect;
export type InsertUserStrike = z.infer<typeof insertUserStrikeSchema>;

export type UserNote = typeof userNotes.$inferSelect;
export type InsertUserNote = z.infer<typeof insertUserNoteSchema>;

export type ProductNote = typeof productNotes.$inferSelect;
export type InsertProductNote = z.infer<typeof insertProductNoteSchema>;

export type StrikeReason = typeof strikeReasons.$inferSelect;
export type InsertStrikeReason = z.infer<typeof insertStrikeReasonSchema>;

export type EmailTemplate = typeof emailTemplates.$inferSelect;
export type InsertEmailTemplate = z.infer<typeof insertEmailTemplateSchema>;

export type EmailLog = typeof emailLogs.$inferSelect;
export type InsertEmailLog = z.infer<typeof insertEmailLogSchema>;

export type SiteSetting = typeof siteSettings.$inferSelect;
export type InsertSiteSetting = z.infer<typeof insertSiteSettingSchema>;

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
  priceIncludesFee?: boolean;
  offerId?: number;
  offerQuantity?: number;
  offerExpiresAt?: string;
  selectedVariations?: Record<string, string>;
  variationKey?: string;
}