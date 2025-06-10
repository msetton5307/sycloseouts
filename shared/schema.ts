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
  totalUnits: integer("total_units").notNull(),
  availableUnits: integer("available_units").notNull(),
  minOrderQuantity: integer("min_order_quantity").notNull(),
  images: text("images").array().notNull(),
  fobLocation: text("fob_location"),
  retailComparisonUrl: text("retail_comparison_url"),
  upc: text("upc"),
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
  upc: z.string().optional().nullable()
})
  .omit({
    id: true,
    createdAt: true,
  })
  .extend({
    // Images are optional for testing but an empty array will be stored
    images: z.array(z.string()).default([]),
  });

// Order schema
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  buyerId: integer("buyer_id").notNull(),
  sellerId: integer("seller_id").notNull(),
  totalAmount: doublePrecision("total_amount").notNull(),
  status: text("status").notNull().default("ordered"), // ordered, shipped, out_for_delivery, delivered
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

// Cart item interface for the frontend
export interface CartItem {
  productId: number;
  title: string;
  price: number;
  quantity: number;
  image: string;
  minOrderQuantity: number;
  availableUnits: number;
}
