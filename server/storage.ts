import {
  users, User, InsertUser,
  products, Product, InsertProduct,
  orders, Order, InsertOrder,
  orderItems, OrderItem, InsertOrderItem,
  sellerApplications, SellerApplication, InsertSellerApplication,
  carts, Cart, InsertCart
} from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

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
  createOrderItem(orderItem: InsertOrderItem): Promise<OrderItem>;
  
  // Seller application methods
  getSellerApplication(id: number): Promise<SellerApplication | undefined>;
  getSellerApplicationByUserId(userId: number): Promise<SellerApplication | undefined>;
  getSellerApplications(filter?: Partial<SellerApplication>): Promise<SellerApplication[]>;
  createSellerApplication(application: InsertSellerApplication): Promise<SellerApplication>;
  updateSellerApplication(id: number, application: Partial<SellerApplication>): Promise<SellerApplication | undefined>;
  
  // Cart methods
  getCart(userId: number): Promise<Cart | undefined>;
  createOrUpdateCart(cart: InsertCart): Promise<Cart>;
  
  // Session store
  sessionStore: session.SessionStore;
}

// In-memory storage implementation
export class MemStorage implements IStorage {
  private usersMap: Map<number, User>;
  private productsMap: Map<number, Product>;
  private ordersMap: Map<number, Order>;
  private orderItemsMap: Map<number, OrderItem>;
  private sellerApplicationsMap: Map<number, SellerApplication>;
  private cartsMap: Map<number, Cart>;
  
  userIdCounter: number = 1;
  productIdCounter: number = 1;
  orderIdCounter: number = 1;
  orderItemIdCounter: number = 1;
  sellerApplicationIdCounter: number = 1;
  cartIdCounter: number = 1;
  
  sessionStore: session.SessionStore;

  constructor() {
    this.usersMap = new Map();
    this.productsMap = new Map();
    this.ordersMap = new Map();
    this.orderItemsMap = new Map();
    this.sellerApplicationsMap = new Map();
    this.cartsMap = new Map();
    
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    });
    
    // Initialize with a demo admin user
    this.createUser({
      username: "admin",
      password: "admin123", // This will be hashed by the auth service
      email: "admin@sycloseouts.com",
      firstName: "Admin",
      lastName: "User",
      company: "SY Closeouts",
      role: "admin",
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.usersMap.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.usersMap.values()).find(
      (user) => user.username.toLowerCase() === username.toLowerCase(),
    );
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.usersMap.values()).find(
      (user) => user.email.toLowerCase() === email.toLowerCase(),
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const now = new Date();
    const user: User = { 
      ...insertUser, 
      id, 
      isSeller: insertUser.role === "seller",
      isApproved: insertUser.role === "buyer", // Auto approve buyers, sellers need manual approval
      createdAt: now
    };
    this.usersMap.set(id, user);
    return user;
  }
  
  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    const user = await this.getUser(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...userData };
    this.usersMap.set(id, updatedUser);
    return updatedUser;
  }
  
  async getUsers(): Promise<User[]> {
    return Array.from(this.usersMap.values());
  }
  
  // Product methods
  async getProduct(id: number): Promise<Product | undefined> {
    return this.productsMap.get(id);
  }
  
  async getProducts(filter?: Partial<Product>): Promise<Product[]> {
    let products = Array.from(this.productsMap.values());
    
    if (filter) {
      products = products.filter(product => {
        return Object.entries(filter).every(([key, value]) => {
          const productKey = key as keyof Product;
          return product[productKey] === value;
        });
      });
    }
    
    return products;
  }
  
  async createProduct(insertProduct: InsertProduct): Promise<Product> {
    const id = this.productIdCounter++;
    const now = new Date();
    const product: Product = { ...insertProduct, id, createdAt: now };
    this.productsMap.set(id, product);
    return product;
  }
  
  async updateProduct(id: number, productData: Partial<Product>): Promise<Product | undefined> {
    const product = await this.getProduct(id);
    if (!product) return undefined;
    
    const updatedProduct = { ...product, ...productData };
    this.productsMap.set(id, updatedProduct);
    return updatedProduct;
  }
  
  async deleteProduct(id: number): Promise<boolean> {
    return this.productsMap.delete(id);
  }
  
  // Order methods
  async getOrder(id: number): Promise<Order | undefined> {
    return this.ordersMap.get(id);
  }
  
  async getOrders(filter?: Partial<Order>): Promise<Order[]> {
    let orders = Array.from(this.ordersMap.values());
    
    if (filter) {
      orders = orders.filter(order => {
        return Object.entries(filter).every(([key, value]) => {
          const orderKey = key as keyof Order;
          return order[orderKey] === value;
        });
      });
    }
    
    return orders;
  }
  
  async createOrder(insertOrder: InsertOrder): Promise<Order> {
    const id = this.orderIdCounter++;
    const now = new Date();
    const order: Order = { ...insertOrder, id, createdAt: now };
    this.ordersMap.set(id, order);
    return order;
  }
  
  async updateOrder(id: number, orderData: Partial<Order>): Promise<Order | undefined> {
    const order = await this.getOrder(id);
    if (!order) return undefined;
    
    const updatedOrder = { ...order, ...orderData };
    this.ordersMap.set(id, updatedOrder);
    return updatedOrder;
  }
  
  // Order item methods
  async getOrderItems(orderId: number): Promise<OrderItem[]> {
    return Array.from(this.orderItemsMap.values()).filter(
      item => item.orderId === orderId
    );
  }
  
  async createOrderItem(insertOrderItem: InsertOrderItem): Promise<OrderItem> {
    const id = this.orderItemIdCounter++;
    const orderItem: OrderItem = { ...insertOrderItem, id };
    this.orderItemsMap.set(id, orderItem);
    return orderItem;
  }
  
  // Seller application methods
  async getSellerApplication(id: number): Promise<SellerApplication | undefined> {
    return this.sellerApplicationsMap.get(id);
  }
  
  async getSellerApplicationByUserId(userId: number): Promise<SellerApplication | undefined> {
    return Array.from(this.sellerApplicationsMap.values()).find(
      app => app.userId === userId
    );
  }
  
  async getSellerApplications(filter?: Partial<SellerApplication>): Promise<SellerApplication[]> {
    let applications = Array.from(this.sellerApplicationsMap.values());
    
    if (filter) {
      applications = applications.filter(app => {
        return Object.entries(filter).every(([key, value]) => {
          const appKey = key as keyof SellerApplication;
          return app[appKey] === value;
        });
      });
    }
    
    return applications;
  }
  
  async createSellerApplication(insertApplication: InsertSellerApplication): Promise<SellerApplication> {
    const id = this.sellerApplicationIdCounter++;
    const now = new Date();
    const application: SellerApplication = { 
      ...insertApplication, 
      id, 
      status: "pending", 
      createdAt: now 
    };
    this.sellerApplicationsMap.set(id, application);
    return application;
  }
  
  async updateSellerApplication(id: number, applicationData: Partial<SellerApplication>): Promise<SellerApplication | undefined> {
    const application = await this.getSellerApplication(id);
    if (!application) return undefined;
    
    const updatedApplication = { ...application, ...applicationData };
    this.sellerApplicationsMap.set(id, updatedApplication);
    return updatedApplication;
  }
  
  // Cart methods
  async getCart(userId: number): Promise<Cart | undefined> {
    return Array.from(this.cartsMap.values()).find(
      cart => cart.userId === userId
    );
  }
  
  async createOrUpdateCart(insertCart: InsertCart): Promise<Cart> {
    const existingCart = await this.getCart(insertCart.userId);
    
    if (existingCart) {
      const updatedCart = { 
        ...existingCart, 
        items: insertCart.items,
        updatedAt: new Date()
      };
      this.cartsMap.set(existingCart.id, updatedCart);
      return updatedCart;
    }
    
    const id = this.cartIdCounter++;
    const now = new Date();
    const cart: Cart = { 
      ...insertCart, 
      id, 
      updatedAt: now 
    };
    this.cartsMap.set(id, cart);
    return cart;
  }
}

// Export singleton instance
export const storage = new MemStorage();
