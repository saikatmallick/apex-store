import { db } from './index.ts';
import { orders, orderItems, products, users } from './schema.ts';
import { eq, desc } from 'drizzle-orm';

export interface OrderItemInput {
  productId: number;
  quantity: number;
}

export async function createOrder(userId: number, items: OrderItemInput[]) {
  try {
    return await db.transaction(async (tx) => {
      // 1. Calculate total amount and check stock
      let totalAmount = 0;
      const verifiedItems = [];

      for (const item of items) {
        const product = await tx.select().from(products).where(eq(products.id, item.productId)).limit(1);
        const prodRecord = product[0];

        if (!prodRecord) {
          throw new Error(`Product with ID ${item.productId} not found`);
        }
        if (prodRecord.stock < item.quantity) {
          throw new Error(`Insufficient stock for product '${prodRecord.name}'. Available: ${prodRecord.stock}, Requested: ${item.quantity}`);
        }

        totalAmount += prodRecord.price * item.quantity;
        verifiedItems.push({
          productId: item.productId,
          quantity: item.quantity,
          price: prodRecord.price,
          currentStock: prodRecord.stock,
        });
      }

      // 2. Insert the main order
      const orderResult = await tx.insert(orders)
        .values({
          userId,
          status: 'pending',
          totalAmount,
        })
        .returning();

      const newOrder = orderResult[0];

      // 3. Insert order items & Update stock
      for (const vItem of verifiedItems) {
        await tx.insert(orderItems).values({
          orderId: newOrder.id,
          productId: vItem.productId,
          quantity: vItem.quantity,
          price: vItem.price,
        });

        // Decrement product stock
        await tx.update(products)
          .set({ stock: vItem.currentStock - vItem.quantity })
          .where(eq(products.id, vItem.productId));
      }

      return newOrder;
    });
  } catch (error: any) {
    console.error("Checkout transaction failed:", error);
    throw new Error(error.message || "Checkout failed. Please try again later.", { cause: error });
  }
}

export async function getUserOrders(dbUserId: number) {
  try {
    // Fetch all user orders
    const userOrdersResult = await db.select()
      .from(orders)
      .where(eq(orders.userId, dbUserId))
      .orderBy(desc(orders.createdAt));

    const ordersWithItems = [];

    for (const order of userOrdersResult) {
      // Join order items with product details
      const items = await db.select({
        id: orderItems.id,
        orderId: orderItems.orderId,
        productId: orderItems.productId,
        quantity: orderItems.quantity,
        price: orderItems.price,
        product: {
          name: products.name,
          imageUrl: products.imageUrl,
          category: products.category,
        }
      })
      .from(orderItems)
      .innerJoin(products, eq(orderItems.productId, products.id))
      .where(eq(orderItems.orderId, order.id));

      ordersWithItems.push({
        ...order,
        orderItems: items,
      });
    }

    return ordersWithItems;
  } catch (error) {
    console.error(`Database query failed in getUserOrders for user ID ${dbUserId}:`, error);
    throw new Error("Unable to fetch your orders.", { cause: error });
  }
}

export async function getAllOrdersForAdmin() {
  try {
    // Select orders and join user email
    const adminOrders = await db.select({
      id: orders.id,
      userId: orders.userId,
      status: orders.status,
      totalAmount: orders.totalAmount,
      createdAt: orders.createdAt,
      userEmail: users.email,
    })
    .from(orders)
    .innerJoin(users, eq(orders.userId, users.id))
    .orderBy(desc(orders.createdAt));

    const fullOrders = [];

    for (const o of adminOrders) {
      // Fetch order items
      const items = await db.select({
        id: orderItems.id,
        orderId: orderItems.orderId,
        productId: orderItems.productId,
        quantity: orderItems.quantity,
        price: orderItems.price,
        product: {
          name: products.name,
          imageUrl: products.imageUrl,
          category: products.category,
        }
      })
      .from(orderItems)
      .innerJoin(products, eq(orderItems.productId, products.id))
      .where(eq(orderItems.orderId, o.id));

      fullOrders.push({
        ...o,
        orderItems: items,
      });
    }

    return fullOrders;
  } catch (error) {
    console.error("Database query failed in getAllOrdersForAdmin:", error);
    throw new Error("Unable to retrieve orders history.", { cause: error });
  }
}

export async function updateOrderStatus(orderId: number, status: 'pending' | 'processing' | 'completed' | 'shipped' | 'cancelled') {
  try {
    const result = await db.update(orders)
      .set({ status })
      .where(eq(orders.id, orderId))
      .returning();
    return result[0];
  } catch (error) {
    console.error(`Database update failed for order status ID ${orderId}:`, error);
    throw new Error("Unable to update order status.", { cause: error });
  }
}
