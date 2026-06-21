import { relations } from 'drizzle-orm';
import { integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

// 1. Users Table (No Firebase local auth)
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Unique identifier (username, UUID, or email)
  email: text('email').notNull(),
  password: text('password').default(''), // Hashed password
  displayName: text('display_name'), // User's name
  role: text('role').notNull().default('user'), // 'user' or 'admin'
  createdAt: timestamp('created_at').defaultNow(),
});

// Relationships for Users
export const usersRelations = relations(users, ({ many }) => ({
  orders: many(orders),
}));

// 2. Products Table
export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  price: integer('price').notNull(), // Price in cents (e.g. 1099 for $10.99)
  imageUrl: text('image_url').notNull(),
  category: text('category').notNull(),
  stock: integer('stock').notNull().default(10),
  createdAt: timestamp('created_at').defaultNow(),
});

// Relationships for Products
export const productsRelations = relations(products, ({ many }) => ({
  orderItems: many(orderItems),
}));

// 3. Orders Table
export const orders = pgTable('orders', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  status: text('status').notNull().default('pending'), // 'pending', 'processing', 'completed', 'shipped'
  totalAmount: integer('total_amount').notNull(), // Total price in cents
  createdAt: timestamp('created_at').defaultNow(),
});

// Relationships for Orders
export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, {
    fields: [orders.userId],
    references: [users.id],
  }),
  orderItems: many(orderItems),
}));

// 4. Order Items Table
export const orderItems = pgTable('order_items', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id')
    .references(() => orders.id, { onDelete: 'cascade' })
    .notNull(),
  productId: integer('product_id')
    .references(() => products.id, { onDelete: 'restrict' })
    .notNull(),
  quantity: integer('quantity').notNull(),
  price: integer('price').notNull(), // Purchased price in cents
});

// Relationships for Order Items
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
