import { sqliteTable, integer, text, real } from 'drizzle-orm/sqlite-core';

// Users table
export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  phone: text('phone'),
  passwordHash: text('password_hash').notNull(),
  role: text('role').notNull().default('customer'), // "customer", "wholesale", "admin"
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// Wholesale profiles
export const wholesaleProfiles = sqliteTable('wholesale_profiles', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').references(() => users.id).notNull(),
  businessName: text('business_name').notNull(),
  gstNumber: text('gst_number').notNull(),
  licenseNumber: text('license_number'), // for crackers compliance
  address: text('address').notNull(),
  status: text('status').notNull().default('pending'), // "pending", "approved", "rejected"
  notes: text('notes'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// Categories
export const categories = sqliteTable('categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  parentId: integer('parent_id').references(() => categories.id),
  sortOrder: integer('sort_order').default(0),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  requiresAgeVerification: integer('requires_age_verification', { mode: 'boolean' }).default(false),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// Products
export const products = sqliteTable('products', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  description: text('description'),
  categoryId: integer('category_id').references(() => categories.id).notNull(),
  sku: text('sku').notNull().unique(),
  stock: integer('stock').default(0),
  status: text('status').notNull().default('active'), // "active", "draft"
  unit: text('unit').notNull().default('piece'), // "box", "piece", "pack"
  tags: text('tags'), // JSON array for seasonal tags
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// Product prices
export const productPrices = sqliteTable('product_prices', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  productId: integer('product_id').references(() => products.id).notNull(),
  retailPrice: real('retail_price').notNull(),
  wholesalePrice: real('wholesale_price'),
  minWholesaleQty: integer('min_wholesale_qty').default(1),
  taxRate: real('tax_rate').default(0.18), // 18% GST
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// Product images
export const productImages = sqliteTable('product_images', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  productId: integer('product_id').references(() => products.id).notNull(),
  url: text('url').notNull(),
  alt: text('alt'),
  sortOrder: integer('sort_order').default(0),
  createdAt: text('created_at').notNull(),
});

// Product variants (optional)
export const productVariants = sqliteTable('product_variants', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  productId: integer('product_id').references(() => products.id).notNull(),
  name: text('name').notNull(),
  value: text('value').notNull(),
  priceModifier: real('price_modifier').default(0),
  stockModifier: integer('stock_modifier').default(0),
  sku: text('sku').notNull().unique(),
  createdAt: text('created_at').notNull(),
});

// Carts
export const carts = sqliteTable('carts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').references(() => users.id),
  sessionId: text('session_id'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// Cart items
export const cartItems = sqliteTable('cart_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  cartId: integer('cart_id').references(() => carts.id).notNull(),
  productId: integer('product_id').references(() => products.id).notNull(),
  quantity: integer('quantity').notNull(),
  unitPrice: real('unit_price').notNull(),
  priceType: text('price_type').notNull(), // "retail" | "wholesale"
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// Addresses
export const addresses = sqliteTable('addresses', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').references(() => users.id).notNull(),
  type: text('type').notNull(), // "shipping", "billing"
  line1: text('line1').notNull(),
  line2: text('line2'),
  city: text('city').notNull(),
  state: text('state').notNull(),
  postalCode: text('postal_code').notNull(),
  country: text('country').notNull().default('India'),
  phone: text('phone'),
  isDefault: integer('is_default', { mode: 'boolean' }).default(false),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// Orders
export const orders = sqliteTable('orders', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').references(() => users.id).notNull(),
  orderNumber: text('order_number').notNull().unique(),
  status: text('status').notNull().default('pending'), // "pending","paid","shipped","delivered","cancelled"
  subtotal: real('subtotal').notNull(),
  tax: real('tax').notNull(),
  shippingFee: real('shipping_fee').default(0),
  discount: real('discount').default(0),
  total: real('total').notNull(),
  isWholesale: integer('is_wholesale', { mode: 'boolean' }).default(false),
  ageVerified: integer('age_verified', { mode: 'boolean' }).default(false),
  shippingAddressId: integer('shipping_address_id').references(() => addresses.id),
  billingAddressId: integer('billing_address_id').references(() => addresses.id),
  notes: text('notes'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// Order items
export const orderItems = sqliteTable('order_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  orderId: integer('order_id').references(() => orders.id).notNull(),
  productId: integer('product_id').references(() => products.id).notNull(),
  quantity: integer('quantity').notNull(),
  unitPrice: real('unit_price').notNull(),
  lineTotal: real('line_total').notNull(),
  priceType: text('price_type').notNull(), // "retail" | "wholesale"
  createdAt: text('created_at').notNull(),
});

// Payments
export const payments = sqliteTable('payments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  orderId: integer('order_id').references(() => orders.id).notNull(),
  provider: text('provider').notNull().default('razorpay'),
  status: text('status').notNull().default('created'), // "created","authorized","captured","failed"
  amount: real('amount').notNull(),
  currency: text('currency').notNull().default('INR'),
  transactionId: text('transaction_id'),
  razorpayOrderId: text('razorpay_order_id'),
  payloadJson: text('payload_json', { mode: 'json' }),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// Shipments
export const shipments = sqliteTable('shipments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  orderId: integer('order_id').references(() => orders.id).notNull(),
  carrier: text('carrier'),
  trackingNumber: text('tracking_number').notNull().unique(),
  status: text('status').notNull().default('pending'), // "pending","shipped","in_transit","delivered"
  estimatedDeliveryDate: text('estimated_delivery_date'),
  actualDeliveryDate: text('actual_delivery_date'),
  notes: text('notes'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// Promotions
export const promotions = sqliteTable('promotions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  description: text('description'),
  type: text('type').notNull(), // "percentage", "fixed_amount", "category_discount"
  value: real('value').notNull(), // percentage or amount
  categoryId: integer('category_id').references(() => categories.id),
  minOrderAmount: real('min_order_amount').default(0),
  maxDiscountAmount: real('max_discount_amount'),
  userType: text('user_type').default('all'), // "all", "retail", "wholesale"
  startDate: text('start_date').notNull(),
  endDate: text('end_date').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  usageLimit: integer('usage_limit'),
  usedCount: integer('used_count').default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// Audit logs
export const auditLogs = sqliteTable('audit_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').references(() => users.id),
  action: text('action').notNull(),
  tableName: text('table_name').notNull(),
  recordId: integer('record_id'),
  oldValues: text('old_values', { mode: 'json' }),
  newValues: text('new_values', { mode: 'json' }),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: text('created_at').notNull(),
});


// Auth tables for better-auth
export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" })
    .$defaultFn(() => false)
    .notNull(),
  image: text("image"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
});

export const session = sqliteTable("session", {
  id: text("id").primaryKey(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = sqliteTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: integer("access_token_expires_at", {
    mode: "timestamp",
  }),
  refreshTokenExpiresAt: integer("refresh_token_expires_at", {
    mode: "timestamp",
  }),
  scope: text("scope"),
  password: text("password"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const verification = sqliteTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(
    () => new Date(),
  ),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(
    () => new Date(),
  ),
});