import { db } from './index.ts';
import { users } from './schema.ts';
import { eq, or } from 'drizzle-orm';
import crypto from 'crypto';

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

export async function createUser(email: string, passwordPlain: string, displayName: string) {
  try {
    const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existing.length > 0) {
      throw new Error("A user with this email already exists.");
    }

    const uid = crypto.randomUUID();
    const initialRole = email === 'admin@store.com' ? 'admin' : 'user';
    const hashedPassword = hashPassword(passwordPlain);

    const result = await db.insert(users)
      .values({
        uid,
        email,
        password: hashedPassword,
        displayName,
        role: initialRole,
      })
      .returning();

    return result[0];
  } catch (error: any) {
    if (error.message?.includes("already exists")) {
      // Expected business constraint, do not log console.error
      throw error;
    }
    console.error("Database user creation failed:", error);
    throw error;
  }
}

export async function verifyUserCredentials(email: string, passwordPlain: string) {
  try {
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (result.length === 0) {
      throw new Error("Invalid email or password.");
    }
    const user = result[0];
    const hashedPassword = hashPassword(passwordPlain);
    
    if (user.password !== hashedPassword) {
      throw new Error("Invalid email or password.");
    }
    
    return user;
  } catch (error: any) {
    console.error("Database user verification failed:", error);
    throw error;
  }
}

export async function getOrCreateUser(uid: string, email: string) {
  try {
    // Automatically make the specific user an admin for easy testing and development
    const initialRole = email === 'admin@store.com' ? 'admin' : 'user';

    const result = await db.insert(users)
      .values({
        uid,
        email,
        role: initialRole,
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email,
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error("Database upsert failed for user registration:", error);
    throw new Error("Unable to register user in database. Please try again later.", { cause: error });
  }
}

export async function getUserProfile(uid: string) {
  try {
    const result = await db.select().from(users).where(eq(users.uid, uid)).limit(1);
    return result[0] || null;
  } catch (error) {
    console.error("Database query failed for getUserProfile:", error);
    throw new Error("Unable to retrieve user profile.", { cause: error });
  }
}

export async function promoteToAdmin(uid: string) {
  try {
    const result = await db.update(users)
      .set({ role: 'admin' })
      .where(eq(users.uid, uid))
      .returning();
    return result[0];
  } catch (error) {
    console.error("Database update failed for promoting user:", error);
    throw new Error("Unable to update user role.", { cause: error });
  }
}
export async function demoteToUser(uid: string) {
  try {
    const result = await db.update(users)
      .set({ role: 'user' })
      .where(eq(users.uid, uid))
      .returning();
    return result[0];
  } catch (error) {
    console.error("Database update failed for demoting user:", error);
    throw new Error("Unable to update user role.", { cause: error });
  }
}
