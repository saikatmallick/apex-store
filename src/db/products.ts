import { db } from './index.ts';
import { products } from './schema.ts';
import { eq, ilike, and, or } from 'drizzle-orm';

export async function getAllProducts(category?: string, search?: string) {
  try {
    let query = db.select().from(products);
    const conditions = [];

    if (category) {
      conditions.push(eq(products.category, category));
    }
    if (search) {
      const searchLower = search.trim().toLowerCase();
      const orConditions = [
        ilike(products.name, `%${search}%`),
        ilike(products.description, `%${search}%`),
        ilike(products.category, `%${search}%`)
      ];

      // Add Category matches for synonyms
      if (
        searchLower === 'shoe' ||
        searchLower === 'shoes' ||
        searchLower.includes('shoe') ||
        searchLower.includes('boot') ||
        searchLower.includes('sneaker') ||
        searchLower.includes('trainer') ||
        searchLower.includes('footwear')
      ) {
        orConditions.push(eq(products.category, 'Footwear'));
      }

      if (
        searchLower.includes('clothing') ||
        searchLower.includes('shirt') ||
        searchLower.includes('pant') ||
        searchLower.includes('clothes') ||
        searchLower.includes('jean') ||
        searchLower.includes('jacket') ||
        searchLower.includes('apparel')
      ) {
        orConditions.push(eq(products.category, 'Apparel'));
      }

      if (
        searchLower.includes('chef') ||
        searchLower.includes('cook') ||
        searchLower.includes('kitchen') ||
        searchLower.includes('home') ||
        searchLower.includes('plate') ||
        searchLower.includes('mug') ||
        searchLower.includes('cup') ||
        searchLower.includes('spoon') ||
        searchLower.includes('fork') ||
        searchLower.includes('knife')
      ) {
        orConditions.push(eq(products.category, 'Home & Kitchen'));
      }

      if (
        searchLower.includes('tech') ||
        searchLower.includes('electronic') ||
        searchLower.includes('gadget') ||
        searchLower.includes('phone') ||
        searchLower.includes('laptop') ||
        searchLower.includes('device') ||
        searchLower.includes('audio')
      ) {
        orConditions.push(eq(products.category, 'Electronics'));
      }

      conditions.push(or(...orConditions));
    }

    if (conditions.length > 0) {
      return await query.where(and(...conditions));
    }
    return await query;
  } catch (error) {
    console.error("Database query failed in getAllProducts:", error);
    throw new Error("Unable to fetch products. Please try again later.", { cause: error });
  }
}

export async function getProductById(id: number) {
  try {
    const result = await db.select().from(products).where(eq(products.id, id)).limit(1);
    return result[0] || null;
  } catch (error) {
    console.error(`Database query failed in getProductById for ID ${id}:`, error);
    throw new Error("Unable to retrieve product details.", { cause: error });
  }
}

export async function createProduct(data: {
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  category: string;
  stock: number;
}) {
  try {
    const result = await db.insert(products)
      .values(data)
      .returning();
    return result[0];
  } catch (error) {
    console.error("Database insert failed in createProduct:", error);
    throw new Error("Unable to create product.", { cause: error });
  }
}

export async function updateProduct(id: number, data: Partial<{
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  category: string;
  stock: number;
}>) {
  try {
    const result = await db.update(products)
      .set(data)
      .where(eq(products.id, id))
      .returning();
    return result[0];
  } catch (error) {
    console.error(`Database update failed in updateProduct for ID ${id}:`, error);
    throw new Error("Unable to update product.", { cause: error });
  }
}

export async function deleteProduct(id: number) {
  try {
    const result = await db.delete(products)
      .where(eq(products.id, id))
      .returning();
    return result[0];
  } catch (error) {
    console.error(`Database delete failed in deleteProduct for ID ${id}:`, error);
    throw new Error("Unable to delete product.", { cause: error });
  }
}
