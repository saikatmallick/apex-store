import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import * as dotenv from "dotenv";

import { requireAuth, requireAdmin, AuthRequest, createToken } from "./src/middleware/auth.ts";
import { getAllProducts, getProductById, createProduct, updateProduct, deleteProduct } from "./src/db/products.ts";
import { createOrder, getUserOrders, getAllOrdersForAdmin, updateOrderStatus } from "./src/db/orders.ts";
import { promoteToAdmin, demoteToUser, createUser, verifyUserCredentials } from "./src/db/users.ts";

// Load environment variables
dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON body parser for POST requests
  app.use(express.json());

  // ==========================================
  // API ROUTES
  // ==========================================

  // 1. Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // 1b. Auth: Register
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { email, password, displayName } = req.body;
      if (!email || !password || !displayName) {
        return res.status(400).json({ error: "Missing email, password, or display name." });
      }

      const user = await createUser(email, password, displayName);
      const token = createToken({
        id: user.id,
        uid: user.uid,
        email: user.email,
        role: user.role as any,
        displayName: user.displayName,
      });

      res.status(201).json({
        token,
        user: {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
        },
        profile: user,
      });
    } catch (error: any) {
      console.error("Registration failed:", error);
      res.status(400).json({ error: error.message });
    }
  });

  // 1c. Auth: Login
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: "Missing email or password." });
      }

      const user = await verifyUserCredentials(email, password);
      const token = createToken({
        id: user.id,
        uid: user.uid,
        email: user.email,
        role: user.role as any,
        displayName: user.displayName,
      });

      res.json({
        token,
        user: {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
        },
        profile: user,
      });
    } catch (error: any) {
      console.error("Login failed:", error);
      res.status(401).json({ error: error.message });
    }
  });

  // 2. Auth: Get Current Database Profile
  app.get("/api/auth/me", requireAuth, (req: AuthRequest, res) => {
    if (!req.userProfile) {
      return res.status(404).json({ error: "User profile not found in database." });
    }
    res.json({ user: req.user, profile: req.userProfile });
  });

  // 2b. Auth: Update/Toggle Profile Role (for testing and Customer role switching)
  app.put("/api/auth/role", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { role } = req.body;
      if (role !== "user" && role !== "admin") {
        return res.status(400).json({ error: "Invalid role value. Must be 'user' or 'admin'." });
      }
      const uid = req.userProfile!.uid;
      let updatedProfile;
      if (role === "admin") {
        updatedProfile = await promoteToAdmin(uid);
      } else {
        updatedProfile = await demoteToUser(uid);
      }
      res.json({ success: true, profile: updatedProfile });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // 3. Products: List & Search
  app.get("/api/products", async (req, res) => {
    try {
      const category = req.query.category as string | undefined;
      const search = req.query.search as string | undefined;
      const productsList = await getAllProducts(category, search);
      res.json(productsList);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // 4. Products: Single item
  app.get("/api/products/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid product identifier" });
      }
      const product = await getProductById(id);
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      res.json(product);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // 5. Products: Create (Admin Only)
  app.post("/api/products", requireAdmin, async (req: AuthRequest, res) => {
    try {
      const { name, description, price, imageUrl, category, stock } = req.body;
      
      if (!name || !description || price === undefined || !imageUrl || !category || stock === undefined) {
        return res.status(400).json({ error: "Missing required fields for product creation" });
      }

      const parsedPrice = parseInt(price, 10);
      const parsedStock = parseInt(stock, 10);

      if (isNaN(parsedPrice) || parsedPrice <= 0) {
        return res.status(400).json({ error: "Price must be a positive integer in cents" });
      }
      if (isNaN(parsedStock) || parsedStock < 0) {
        return res.status(400).json({ error: "Stock must be a non-negative integer" });
      }

      const product = await createProduct({
        name,
        description,
        price: parsedPrice,
        imageUrl,
        category,
        stock: parsedStock,
      });

      res.status(201).json(product);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // 6. Products: Update (Admin Only)
  app.put("/api/products/:id", requireAdmin, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid product ID" });
      }

      const { name, description, price, imageUrl, category, stock } = req.body;
      const updateData: any = {};

      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
      if (category !== undefined) updateData.category = category;
      
      if (price !== undefined) {
        const parsedPrice = parseInt(price, 10);
        if (isNaN(parsedPrice) || parsedPrice <= 0) {
          return res.status(400).json({ error: "Price must be a positive integer in cents" });
        }
        updateData.price = parsedPrice;
      }

      if (stock !== undefined) {
        const parsedStock = parseInt(stock, 10);
        if (isNaN(parsedStock) || parsedStock < 0) {
          return res.status(400).json({ error: "Stock must be a non-negative integer" });
        }
        updateData.stock = parsedStock;
      }

      const product = await updateProduct(id, updateData);
      if (!product) {
        return res.status(404).json({ error: "Product not found or unable to update" });
      }

      res.json(product);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // 7. Products: Delete (Admin Only)
  app.delete("/api/products/:id", requireAdmin, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid product ID" });
      }

      const product = await deleteProduct(id);
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }

      res.json({ success: true, message: `Product '${product.name}' was deleted successfully.` });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // 8. Orders: Create Checkout (Authenticated Users)
  app.post("/api/orders", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { items } = req.body; // Expects array: [{ productId: number, quantity: number }]

      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: "Checkout items must be a non-empty array" });
      }

      // Verify the items structure
      for (const item of items) {
        if (!item.productId || isNaN(parseInt(item.productId, 10)) || !item.quantity || isNaN(parseInt(item.quantity, 10))) {
          return res.status(400).json({ error: "Each item must feature a valid productId and quantity" });
        }
      }

      const dbUserId = req.userProfile!.id;
      const order = await createOrder(dbUserId, items);
      res.status(201).json(order);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // 9. Orders: Get Personal Purchases (Authenticated Users)
  app.get("/api/orders", requireAuth, async (req: AuthRequest, res) => {
    try {
      const dbUserId = req.userProfile!.id;
      const ordersList = await getUserOrders(dbUserId);
      res.json(ordersList);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // 10. Orders: Get All (Admin Only)
  app.get("/api/admin/orders", requireAdmin, async (req: AuthRequest, res) => {
    try {
      const allOrders = await getAllOrdersForAdmin();
      res.json(allOrders);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // 11. Orders: Update Status (Admin Only)
  app.put("/api/admin/orders/:id/status", requireAdmin, async (req: AuthRequest, res) => {
    try {
      const orderId = parseInt(req.params.id, 10);
      const { status } = req.body; // 'pending' | 'processing' | 'completed' | 'shipped' | 'cancelled'

      if (isNaN(orderId)) {
        return res.status(400).json({ error: "Invalid order ID" });
      }

      const allowedStatuses = ["pending", "processing", "completed", "shipped", "cancelled"];
      if (!status || !allowedStatuses.includes(status)) {
        return res.status(400).json({ error: `Invalid status. Must be one of: ${allowedStatuses.join(", ")}` });
      }

      const updatedOrder = await updateOrderStatus(orderId, status as any);
      if (!updatedOrder) {
        return res.status(404).json({ error: "Order not found or unable to update status" });
      }

      res.json(updatedOrder);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ==========================================
  // VITE OR STATIC SERVING MIDDLEWARE
  // ==========================================

  // Serve generated assets statically in both development and production
  app.use("/src/assets", express.static(path.join(process.cwd(), "src/assets")));

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Auto-seed database products if they do not exist
  try {
    const existing = await getAllProducts();
    const existingNames = new Set(existing.map((p) => p.name));

    const seedProducts = [
      {
        name: "Raw Indigo Denim Jacket",
        description: "Classic heavyweight selvedge denim designed to age beautifully, finished with custom copper rivets and reinforced stitching.",
        price: 420000,
        imageUrl: "https://images.unsplash.com/photo-1576995853123-5a10305d93c0?q=80&w=800&auto=format&fit=crop",
        category: "Apparel",
        stock: 15
      },
      {
        name: "Ribbed Merino Wool Knit",
        description: "Luxuriously soft premium Merino wool knitwear featuring dynamic ribbed sleeve accents and mock collar styling.",
        price: 310000,
        imageUrl: "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?q=80&w=800&auto=format&fit=crop",
        category: "Apparel",
        stock: 20
      },
      {
        name: "Tailored Linen Casual Shirt",
        description: "Breathable organic linen blend designed with relaxed shoulders, custom pearl buttons, and curved modern seam detailing.",
        price: 220000,
        imageUrl: "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?q=80&w=800&auto=format&fit=crop",
        category: "Apparel",
        stock: 18
      },
      {
        name: "Classic Leather Chelsea Boots",
        description: "Handcrafted full-grain leather boots built with water-resistant elastic side gores and supportive, oil-resistant rubber outsoles.",
        price: 649900,
        imageUrl: "https://images.unsplash.com/photo-1608256246200-53e635b5b65f?q=80&w=800&auto=format&fit=crop",
        category: "Footwear",
        stock: 10
      },
      {
        name: "Aero-Knit Comfort Trainers",
        description: "Ultra-breathable woven mesh structured with high-rebound cushioning midsoles for exceptional arch support and daily strides.",
        price: 449900,
        imageUrl: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=800&auto=format&fit=crop",
        category: "Footwear",
        stock: 25
      },
      {
        name: "Minimalist Suede Sneakers",
        description: "Clean Italian suede low-top profile featuring padded memory-foam footbeds and durable stitched rubber cup-soles.",
        price: 520000,
        imageUrl: "https://images.unsplash.com/photo-1549298916-b41d501d3772?q=80&w=800&auto=format&fit=crop",
        category: "Footwear",
        stock: 14
      },
      {
        name: "Hex-Grip Milled Cast Iron Dumbbells",
        description: "Premium tactile matte finish with hexagonal rolling protection, balancing heavy-duty build quality with exceptional comfort.",
        price: 380000,
        imageUrl: "https://images.unsplash.com/photo-1638536532686-d610adfc8e5c?q=80&w=800&auto=format&fit=crop",
        category: "Fitness",
        stock: 12
      },
      {
        name: "Natural Cork Non-Slip Yoga Mat",
        description: "Eco-friendly premium natural cork paired with a high-density natural tree rubber base for superior dry and wet grip.",
        price: 249000,
        imageUrl: "https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?q=80&w=800&auto=format&fit=crop",
        category: "Fitness",
        stock: 30
      },
      {
        name: "Waterproof Touch Smart Fitness Band",
        description: "Lightweight premium tracker featuring comprehensive blood flow, heart, and metabolic analysis with deep OLED metrics.",
        price: 299000,
        imageUrl: "https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?q=80&w=800&auto=format&fit=crop",
        category: "Fitness",
        stock: 40
      },
      {
        name: "Botanical Therapy Elixir Serum",
        description: "A lightweight, transformative facial oil containing cold-pressed rosehip seed extract, botanical vitamins, and nourishing active jojoba for a healthy, radiant bounce.",
        price: 189000,
        imageUrl: "https://images.unsplash.com/photo-1601049541289-9b1b7bbbfe19?q=80&w=800&auto=format&fit=crop",
        category: "Beauty & Cosmetics",
        stock: 35
      },
      {
        name: "Purifying Mineral Mud Mask",
        description: "Activated volcanic charcoal blended with therapeutic seaweed extract designed to lift impurities and tighten pores.",
        price: 125000,
        imageUrl: "https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?q=80&w=800&auto=format&fit=crop",
        category: "Beauty & Cosmetics",
        stock: 45
      },
      {
        name: "Premium Hydrating Daily Moisturizer",
        description: "Velvety botanical moisturizer rich in natural vitamin E and calming chamomile extract to maintain all-day moisture balance.",
        price: 145000,
        imageUrl: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?q=80&w=800&auto=format&fit=crop",
        category: "Beauty & Cosmetics",
        stock: 50
      },
      {
        name: "Lay-Flat Bullet Grid Journal",
        description: "Exquisite hardcover journal utilizing thick 120gsm bleeding-resistant academic cream pages, hand-bound for complete flat writing.",
        price: 95000,
        imageUrl: "https://images.unsplash.com/photo-1531346878377-a5be20888e57?q=80&w=800&auto=format&fit=crop",
        category: "Books & Stationary",
        stock: 60
      },
      {
        name: "Brushed Brass Vintage Fountain Pen",
        description: "Engineered heavy-duty solid brass fountain pen fitted with an iridium-tipped medium nib, housed in a matching protective brass case.",
        price: 320000,
        imageUrl: "https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?q=80&w=800&auto=format&fit=crop",
        category: "Books & Stationary",
        stock: 15
      },
      {
        name: "Minimalist Leather Desk Pad",
        description: "Elegantly treated waterproof vegan leather desk mat providing an exceptionally smooth surface for fluid pens and optical mice.",
        price: 180000,
        imageUrl: "https://images.unsplash.com/photo-1585776245991-cf89dd7fc73a?q=80&w=800&auto=format&fit=crop",
        category: "Books & Stationary",
        stock: 22
      },
      {
        name: "Hi-Fi Studio Condenser Microphone",
        description: "Vocal and acoustic capture masterpiece built with a gold-sputtered diaphragm and professional cardioid pickup patterns.",
        price: 1249900,
        imageUrl: "https://images.unsplash.com/photo-1590602847861-f357a9332bbc?q=80&w=800&auto=format&fit=crop",
        category: "Electronics",
        stock: 14
      },
      {
        name: "Minimalist Leather Backpack",
        description: "Water-resistant, hand-crafted full-grain leather backpack featuring a 15-inch laptop sleeve and secure brass magnetic clasps.",
        price: 249900,
        imageUrl: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500&auto=format&fit=crop&q=60",
        category: "Accessories",
        stock: 14
      },
      {
        name: "Adjustable Aluminum Laptop Stand",
        description: "Solid aluminum alloy laptop riser, fully foldable, heat-vent ventilation, fits laptops from 10 to 17 inches.",
        price: 129900,
        imageUrl: "https://images.unsplash.com/photo-1616440347437-b1c73416efc2?w=500&auto=format&fit=crop&q=60",
        category: "Accessories",
        stock: 25
      },
      {
        name: "Handcrafted Premium Leather Wallet",
        description: "Slim bifold wallet made from vegetable-tanned leather featuring secure RFID-blocking compartments and hand-stitched borders.",
        price: 220000,
        imageUrl: "https://images.unsplash.com/photo-1627123424574-724758594e93?q=80&w=800&auto=format&fit=crop",
        category: "Accessories",
        stock: 30
      },
      {
        name: "Damascus Master Chef Knife",
        description: "Meticulously crafted from 67 layers of VG-10 Damascus steel, with a razor-sharp core and an ergonomic Rosewood handle.",
        price: 149900,
        imageUrl: "/src/assets/images/damascus_chef_knife_board_1781971003517.jpg",
        category: "Home & Kitchen",
        stock: 12
      },
      {
        name: "Precision Burr Coffee Grinder",
        description: "An exquisite white professional burr grinder designed to complement beautiful espresso machines. Engineered for exceptionally precise, low-retention grinding with stepless adjustments and wooden accent finishes.",
        price: 849900,
        imageUrl: "/src/assets/images/white_espresso_niche_grinder_setup_1781970717094.jpg",
        category: "Home & Kitchen",
        stock: 15
      },
      {
        name: "Double-Walled Glass Cups (Set of 2)",
        description: "Insulated borosilicate glassware that preserves optimal drink temperature while remaining cool and dry to the touch.",
        price: 180000,
        imageUrl: "https://images.unsplash.com/photo-1541167760496-1628856ab772?q=80&w=800&auto=format&fit=crop",
        category: "Home & Kitchen",
        stock: 25
      },
      {
        name: "Brutalist Ash Wood Side Table",
        description: "Hand-sculpted stool or end table crafted from a single carbonized chunk of solid sustainable European Ashwood.",
        price: 1150000,
        imageUrl: "https://images.unsplash.com/photo-1506898667547-42e22a46e125?q=80&w=800&auto=format&fit=crop",
        category: "Furniture",
        stock: 8
      }
    ];

    let seedCount = 0;
    for (const prod of seedProducts) {
      if (!existingNames.has(prod.name)) {
        await createProduct(prod);
        seedCount++;
      }
    }
    if (seedCount > 0) {
      console.log(`[SEED] Successfully seeded ${seedCount} new premium products.`);
    }

    // Seed default admin
    try {
      await createUser("admin@store.com", "admin123", "Store Administrator");
      console.log("[SEED] Default admin user 'admin@store.com' seeded successfully.");
    } catch (adminErr: any) {
      if (adminErr.message?.includes("already exists")) {
        console.log("[SEED] Default admin user already exists.");
      } else {
        console.error("[SEED ERROR] Default admin user seeding failed:", adminErr);
      }
    }
  } catch (seedErr) {
    console.error("[SEED ERROR] Database seeding skipped or failed:", seedErr);
  }

  // Bind to port 3000 and interface 0.0.0.0
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[STORE BACKEND] Server online streaming on http://localhost:${PORT}`);
  });
}

startServer();
