import React, { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { Navbar } from './components/Navbar.tsx';
import { ProductCard } from './components/ProductCard.tsx';
import { CartDrawer } from './components/CartDrawer.tsx';
import { OrdersList } from './components/OrdersList.tsx';
import { AdminPanel } from './components/AdminPanel.tsx';
import { AuthModal } from './components/AuthModal.tsx';
import { Product, CartItem } from './types.ts';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Package, ShoppingCart, ShoppingBag, Eye, X, Info, 
  ShieldCheck, HelpCircle, CheckCircle, ArrowRight, ArrowLeft, LayoutDashboard
} from 'lucide-react';

const Storefront: React.FC = () => {
  const { user, profile, login, logout, changeRole } = useAuth();
  
  // App views & cart
  const [activeView, setActiveView] = useState<'shop' | 'orders' | 'admin'>('shop');
  const [cart, setCart] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('aura_cart');
    return saved ? JSON.parse(saved) : [];
  });
  
  // Slide Show States
  const [currentSlide, setCurrentSlide] = useState(0);
  const slides = [
    {
      id: 1,
      title: "Active Acoustics Pro",
      subtitle: "Wireless Over-Ear ANC Headphones",
      category: "Electronics",
      tagline: "Uncompromising active noise cancellation & ultimate master acoustics.",
      quote: "Sublime acoustic balancing, engineered for deep quiet and absolute audio precision.",
      price: "₹14,999.00",
      image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=1600&auto=format&fit=crop",
      badgeText: "LIMITED EDITION • 25% OFF"
    },
    {
      id: 2,
      title: "Sculpted Work Seating",
      subtitle: "Minimalist Modern Workspace Chair",
      category: "Furniture",
      tagline: "Contours designed to blend natural lumbar support into pure geometry.",
      quote: "Precisely tuned contours that blend natural lumbar support into pristine modern geometries.",
      price: "₹24,500.00",
      image: "https://images.unsplash.com/photo-1506898667547-42e22a46e125?q=80&w=1600&auto=format&fit=crop",
      badgeText: "DESIGNER SELECTION • NEW"
    },
    {
      id: 3,
      title: "Unified Dial Tracker",
      subtitle: "Precision Aviation-Grade Wearable",
      category: "Accessories",
      tagline: "Bio-health tracking metrics enclosed in milled aerospace titanium.",
      quote: "Meticulously machined metal, featuring premium bio-tracking and custom high-contrast indicators.",
      price: "₹8,990.00",
      image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=1600&auto=format&fit=crop",
      badgeText: "DEAL OF THE DAY"
    },
    {
      id: 4,
      title: "Damascus Master Chef Knife",
      subtitle: "Hand-Forged Damascus Chef Knife",
      category: "Home & Kitchen",
      tagline: "Ultra-sharp 67-layer VG-10 Damascus core steel precision cutting.",
      quote: "Meticulously balanced ergonomic rosewood handle paired with state-of-the-art Japanese steel mastery.",
      price: "₹12,499.00",
      image: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?q=80&w=1600&auto=format&fit=crop",
      badgeText: "RECOMMENDED BY PROFESSIONAL CHEFS"
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);
  
  // Products states
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  
  // Filters & Cart drawers
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [detailImgError, setDetailImgError] = useState(false);

  useEffect(() => {
    setDetailImgError(false);
  }, [selectedProduct]);
  
  // Feedback banners
  const [showCheckoutSuccess, setShowCheckoutSuccess] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'info' | 'error' | 'success' } | null>(null);

  const triggerToast = (message: string, type: 'info' | 'error' | 'success' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Sync cart to localStorage
  useEffect(() => {
    localStorage.setItem('aura_cart', JSON.stringify(cart));
  }, [cart]);

  // Load products from API
  const fetchProducts = async () => {
    setLoadingProducts(true);
    try {
      const url = new URL('/api/products', window.location.origin);
      if (selectedCategory && selectedCategory !== 'All') {
        url.searchParams.append('category', selectedCategory);
      }
      if (search) {
        url.searchParams.append('search', search);
      }
      
      const res = await fetch(url.toString());
      if (res.ok) {
        let data = await res.json();
        if (selectedCategory === 'All' && !search) {
          // Shuffle randomly
          data = [...data].sort(() => Math.random() - 0.5);
        }
        setProducts(data);
      }
    } catch (err) {
      console.error("Error loading products:", err);
    } finally {
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [selectedCategory, search]);

  // Cart helper functions
  const handleAddToCart = (product: Product) => {
    const existing = cart.find(item => item.product.id === product.id);
    const availableStock = product.stock;

    if (existing) {
      if (existing.quantity >= availableStock) {
        triggerToast(`Cannot add more. Limit is ${availableStock} units.`, 'error');
        return;
      }
      setCart(cart.map(item => 
        item.product.id === product.id 
          ? { ...item, quantity: item.quantity + 1 } 
          : item
      ));
    } else {
      if (availableStock <= 0) {
        triggerToast("This product is currently out of stock.", 'error');
        return;
      }
      setCart([...cart, { product, quantity: 1 }]);
    }
    
    // Smooth toast feel
    setIsCartOpen(true);
  };

  const handleUpdateCartQuantity = (productId: number, newQuantity: number) => {
    if (newQuantity <= 0) return;
    setCart(cart.map(item => 
      item.product.id === productId 
        ? { ...item, quantity: newQuantity } 
        : item
    ));
  };

  const handleRemoveFromCart = (productId: number) => {
    setCart(cart.filter(item => item.product.id !== productId));
  };

  const handleClearCart = () => {
    setCart([]);
  };

  const handleCheckoutSuccess = () => {
    setIsCartOpen(false);
    setShowCheckoutSuccess(true);
    setActiveView('orders');
    fetchProducts(); // Refresh products store inventory
  };

  // Compile categories list dynamically
  const categoriesList = [
    'All',
    'Electronics',
    'Accessories',
    'Home & Kitchen',
    'Furniture',
    'Apparel',
    'Footwear',
    'Fitness',
    'Beauty & Cosmetics',
    'Books & Stationary'
  ];

  if (profile?.role === 'admin') {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800">
        {/* Dynamic Toast Feedback Overlay */}
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`fixed top-4 right-4 z-55 flex items-center space-x-2 rounded-lg border px-4 py-2.5 shadow-lg text-xs font-bold ${
                toast.type === 'error'
                  ? 'bg-red-50 text-red-700 border-red-100'
                  : toast.type === 'success'
                  ? 'bg-green-50 text-green-700 border-green-100'
                  : 'bg-blue-50 text-blue-700 border-blue-105'
              }`}
            >
              <Info className="h-4 w-4" />
              <span>{toast.message}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white text-slate-800 py-3 shadow-sm">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
            <div className="flex items-center space-x-3">
              <div className="rounded-lg bg-blue-600 p-2 text-white">
                <LayoutDashboard className="h-4.5 w-4.5" />
              </div>
              <div>
                <span className="text-sm font-extrabold tracking-tight text-slate-900">
                  Apex<span className="text-blue-650 text-blue-600 font-black">Store</span> Admin Center
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <span className="text-xs text-slate-500 max-sm:hidden font-semibold">
                Admin Console: <span className="font-bold text-slate-800">{user?.email}</span>
              </span>
              <button
                onClick={() => {
                  logout();
                  triggerToast('Logged out of Admin Center', 'info');
                }}
                className="cursor-pointer rounded-lg bg-red-650 bg-red-600 hover:bg-red-700 px-3.5 py-1.5 text-xs font-bold text-white transition shadow-sm"
              >
                Sign Out
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <AdminPanel />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* Dynamic Toast Feedback Overlay */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`fixed top-4 right-4 z-55 flex items-center space-x-2 rounded-lg border px-4 py-2.5 shadow-lg text-xs font-bold ${
              toast.type === 'error'
                ? 'bg-red-50 text-red-700 border-red-100'
                : toast.type === 'success'
                ? 'bg-green-50 text-green-700 border-green-100'
                : 'bg-blue-50 text-blue-700 border-blue-105'
            }`}
          >
            <Info className="h-4 w-4" />
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation Layer */}
      {activeView !== 'admin' ? (
        <Navbar
          cartCount={cart.reduce((acc, curr) => acc + curr.quantity, 0)}
          onOpenCart={() => setIsCartOpen(true)}
          activeView={activeView}
          onChangeView={(view) => {
            setActiveView(view);
            if (view === 'shop') fetchProducts(); // Sync catalog
          }}
          search={search}
          onSearchChange={(val) => {
            setSearch(val);
            if (val && selectedCategory !== 'All') {
              setSelectedCategory('All');
            }
          }}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          categories={categoriesList}
        />
      ) : (
        profile?.role === 'admin' && (
          <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white text-slate-800 py-3 shadow-md">
            <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
              {/* Left side brand */}
              <div className="flex items-center space-x-3">
                <div className="rounded-lg bg-blue-600 p-2 text-white">
                  <LayoutDashboard className="h-4.5 w-4.5" />
                </div>
                <div>
                  <span className="text-sm font-extrabold tracking-tight text-slate-900">
                    Apex<span className="text-blue-650 text-blue-600 font-black">Store</span> Admin Center
                  </span>
                </div>
              </div>

              {/* Right side controls */}
              <div className="flex items-center space-x-4">
                {/* Exit back to normal catalog */}
                <button
                  onClick={() => setActiveView('shop')}
                  className="cursor-pointer flex items-center space-x-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-xs"
                >
                  <ArrowLeft className="h-3.5 w-3.5 text-slate-500" />
                  <span>Storefront</span>
                </button>
              </div>
            </div>
          </header>
        )
      )}

      {/* Main Body Layout */}
      <main className="w-full">
        
        {/* Banner: Checkout Success Notification */}
        {showCheckoutSuccess && (
          <div className="mx-auto max-w-7xl px-4 pt-8 pb-2 sm:px-6 lg:px-8">
            <AnimatePresence>
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="mb-6 rounded-3xl border border-green-100 bg-green-50 p-6 shadow-sm"
              >
                <div className="flex items-start space-x-4">
                  <div className="rounded-2xl bg-green-100 p-2 text-green-600">
                    <CheckCircle className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-bold text-green-950">Order Placed Successfully!</h3>
                    <p className="mt-1 text-xs font-semibold text-green-800 leading-normal">
                      Your order has been received successfully! You can track its delivery progress in real time under the <span className="font-extrabold underline cursor-pointer" onClick={() => { setShowCheckoutSuccess(false); setActiveView('orders'); }}>My Orders</span> tab.
                    </p>
                  </div>
                  <button 
                    onClick={() => setShowCheckoutSuccess(false)}
                    className="cursor-pointer rounded-xl p-1 text-green-400 hover:bg-green-100 hover:text-green-900"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        )}

        {/* View switching engine */}
        {activeView === 'shop' ? (
          <div className="w-full">
            {selectedCategory === 'All' && !search && (
              <>
                {/* Full-width Hero with Automatic Background Image Slideshow */}
                <div className="relative w-full h-[calc(100vh-116px)] min-h-[520px] sm:min-h-[600px] md:min-h-[680px] lg:min-h-[720px] bg-slate-950 flex items-center overflow-hidden mb-10">
                  {/* Background image slides */}
                  <div className="absolute inset-0 z-0 w-full h-full">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={currentSlide}
                        initial={{ opacity: 0, scale: 1.03 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        transition={{ duration: 0.8 }}
                        className="absolute inset-0 w-full h-full"
                      >
                        <img
                          src={slides[currentSlide].image}
                          alt={slides[currentSlide].title}
                          className="w-full h-full object-cover object-center"
                          referrerPolicy="no-referrer"
                        />
                        {/* Visual protective overlays for outstanding legibility */}
                        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-950/80 to-slate-900/30" />
                        <div className="absolute inset-0 bg-black/25" />
                      </motion.div>
                    </AnimatePresence>
                  </div>

                  {/* Interacting and layout alignment overlay */}
                  <div className="relative z-10 w-full mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 text-white flex flex-col justify-center">
                    <div className="max-w-2xl">
                      {/* Header Title Typography */}
                      <h1 className="text-3xl font-black tracking-tight sm:text-4xl md:text-5xl lg:text-6xl leading-[1.1] font-display">
                        {slides[currentSlide].title} <br />
                        <span className="text-blue-500 font-extrabold text-2xl sm:text-3xl md:text-4xl">
                          {slides[currentSlide].subtitle}
                        </span>
                      </h1>

                      {/* Tagline & aesthetic aesthetic quotes */}
                      <p className="mt-4 text-xs sm:text-sm md:text-base text-slate-300 font-medium leading-relaxed max-w-lg font-sans">
                        {slides[currentSlide].tagline}
                      </p>

                      {/* Controls / Active visual row */}
                      <div className="mt-8 flex flex-wrap gap-4 items-center">
                        <button
                          onClick={() => { setSelectedCategory(slides[currentSlide].category); setSearch(''); }}
                          className="cursor-pointer flex items-center space-x-2 rounded-xl bg-blue-600 px-6 py-3.5 text-xs font-black text-white shadow-lg shadow-blue-600/30 hover:bg-blue-500 transition active:scale-95"
                        >
                          <ShoppingBag className="h-4 w-4" />
                          <span>EXPLORE STORE</span>
                          <ArrowRight className="h-4 w-4" />
                        </button>

                        <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-md px-5 py-3 text-xs font-bold text-white flex items-center space-x-2 shadow-xs">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Starting:</span>
                          <span className="font-extrabold text-blue-400 text-sm">{slides[currentSlide].price}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Slider Dots */}
                  <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center space-x-2 bg-black/20 backdrop-blur-md px-3 py-1.5 rounded-full">
                    {slides.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setCurrentSlide(i)}
                        className={`h-1.5 rounded-full cursor-pointer transition-all duration-300 ${
                          currentSlide === i ? 'w-5 bg-white' : 'w-1.5 bg-white/40 hover:bg-white/70'
                        }`}
                        title={`Slide ${i + 1}`}
                      />
                    ))}
                  </div>

                  {/* Slider Next/Prev Arrows */}
                  <div className="absolute right-6 sm:right-10 bottom-6 z-20 flex items-center space-x-2">
                    <button
                      onClick={() => setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length)}
                      className="cursor-pointer rounded-full border border-white/10 bg-black/20 backdrop-blur-md p-2 text-white hover:bg-white/15 transition active:scale-90"
                      title="Previous slide"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setCurrentSlide((prev) => (prev + 1) % slides.length)}
                      className="cursor-pointer rounded-full border border-white/10 bg-black/20 backdrop-blur-md p-2 text-white hover:bg-white/15 transition active:scale-90"
                      title="Next slide"
                    >
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Multi-Campaign Marketing Grid (Vivid & Modern) */}
                <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Campaign Card 1 */}
                    <div className="relative overflow-hidden rounded-2xl border border-slate-100 bg-gradient-to-br from-green-50 to-emerald-100 p-6 flex flex-col justify-between min-h-[170px] shadow-xs group">
                      <span className="absolute -right-6 -bottom-6 w-24 h-24 bg-emerald-200/50 rounded-full blur-xl group-hover:scale-125 transition-all duration-500" />
                      <div>
                        <span className="text-[10px] uppercase font-black text-emerald-800 tracking-wider">Monsoon Essentials</span>
                        <h3 className="text-lg font-extrabold text-slate-900 mt-1 font-display">Back to Campus</h3>
                        <p className="text-xs font-semibold text-emerald-700/80 mt-1">Flat 10% off with coupon FIRST10</p>
                      </div>
                      <button 
                        onClick={() => { setSelectedCategory('Accessories'); setSearch(''); }}
                        className="cursor-pointer self-start mt-4 rounded-xl bg-slate-900 text-white px-4 py-2 text-[10px] font-black uppercase tracking-wider shadow-sm hover:bg-slate-800 transition active:scale-95"
                      >
                        View Essentials
                      </button>
                    </div>

                    {/* Campaign Card 2 */}
                    <div className="relative overflow-hidden rounded-2xl border border-slate-100 bg-gradient-to-br from-blue-50 to-indigo-100 p-6 flex flex-col justify-between min-h-[170px] shadow-xs group">
                      <span className="absolute -right-6 -bottom-6 w-24 h-24 bg-indigo-200/50 rounded-full blur-xl group-hover:scale-125 transition-all duration-500" />
                      <div>
                        <span className="text-[10px] uppercase font-black text-blue-800 tracking-wider">New Launch Alert</span>
                        <h3 className="text-lg font-extrabold text-slate-900 mt-1 font-display">Nova Smart Audio</h3>
                        <p className="text-xs font-semibold text-blue-700/80 mt-1">Starting from only ₹4,200</p>
                      </div>
                      <button 
                        onClick={() => { setSelectedCategory('Electronics'); setSearch(''); }}
                        className="cursor-pointer self-start mt-4 rounded-xl bg-slate-900 text-white px-4 py-2 text-[10px] font-black uppercase tracking-wider shadow-sm hover:bg-slate-800 transition active:scale-95"
                      >
                        Explore Models
                      </button>
                    </div>

                    {/* Campaign Card 3 */}
                    <div className="relative overflow-hidden rounded-2xl border border-slate-100 bg-gradient-to-br from-amber-50 to-orange-100 p-6 flex flex-col justify-between min-h-[170px] shadow-xs group">
                      <span className="absolute -right-6 -bottom-6 w-24 h-24 bg-amber-200/50 rounded-full blur-xl group-hover:scale-125 transition-all duration-500" />
                      <div>
                        <span className="text-[10px] uppercase font-black text-amber-800 tracking-wider">Premium Curation</span>
                        <h3 className="text-lg font-extrabold text-slate-900 mt-1 font-display">Nordic Simplicity</h3>
                        <p className="text-xs font-semibold text-amber-700/80 mt-1">Artisanal space-saving decor</p>
                      </div>
                      <button 
                        onClick={() => { setSelectedCategory('Furniture'); setSearch(''); }}
                        className="cursor-pointer self-start mt-4 rounded-xl bg-slate-900 text-white px-4 py-2 text-[10px] font-black uppercase tracking-wider shadow-sm hover:bg-slate-800 transition active:scale-95"
                      >
                        View Collection
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Catalog Grid Section wrapped in comfortable max-width container */}
            <div className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
              <div id="catalog-anchor" className="scroll-mt-20">
                <div className="mb-8 border-b border-slate-100 pb-5 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-black text-slate-850 font-display">
                      {selectedCategory === 'All' ? 'Our Curated Collection' : `Featured ${selectedCategory}`}
                    </h2>
                    <p className="text-xs text-slate-400 font-semibold mt-1">
                      {selectedCategory === 'All' 
                        ? 'Explore our finest selection of top-tier products across all categories, shuffled for discovery.'
                        : `Browse the finest handpicked selection of top-tier ${selectedCategory.toLowerCase()}.`}
                    </p>
                  </div>
                  <span className="text-xs font-bold text-slate-400 bg-slate-50 border border-slate-100 rounded-lg px-3 py-1.5 self-start">
                    {products.length} products listed
                  </span>
                </div>

                {loadingProducts ? (
                  <div className="flex h-64 flex-col items-center justify-center space-y-3">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                    <p className="text-sm font-bold text-slate-500">Retrieving store catalog...</p>
                  </div>
                ) : products.length === 0 ? (
                  <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white text-center p-6">
                    <p className="font-semibold text-slate-500">No items match your selected filters.</p>
                    <button
                      onClick={() => { setSelectedCategory('Electronics'); setSearch(''); }}
                      className="cursor-pointer mt-3 text-xs font-bold text-blue-600 underline"
                    >
                      Reset filters
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                    {products.map((prod) => (
                      <ProductCard
                        key={prod.id}
                        product={prod}
                        onAddToCart={handleAddToCart}
                        onViewDetails={(p) => setSelectedProduct(p)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : activeView === 'orders' ? (
          <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
            <OrdersList />
          </div>
        ) : activeView === 'admin' && profile?.role === 'admin' ? (
          <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
            <AdminPanel />
          </div>
        ) : (
          <div className="mx-auto max-w-7xl px-4 py-24 text-center sm:px-6 lg:px-8">
            <p className="text-sm font-semibold text-red-500">Unauthorized action.</p>
          </div>
        )}
      </main>



      {/* Cart Slider Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        onUpdateQuantity={handleUpdateCartQuantity}
        onRemoveItem={handleRemoveFromCart}
        onClearCart={handleClearCart}
        onCheckoutSuccess={handleCheckoutSuccess}
      />

      {/* Detailed Modal for Product overview */}
      <AnimatePresence>
        {selectedProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.3 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedProduct(null)}
              className="absolute inset-0 bg-slate-900 backdrop-blur-xs"
            />
            {/* Modal box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl overflow-hidden rounded-xl bg-white shadow-xl ring-1 ring-slate-100"
            >
              <button
                onClick={() => setSelectedProduct(null)}
                className="absolute top-4 right-4 z-10 rounded-lg bg-white/85 p-1.5 text-slate-500 backdrop-blur-xs transition hover:bg-slate-100 hover:text-slate-900 shadow-sm"
              >
                <X className="h-5 w-5" />
              </button>

              <div className={(detailImgError || !selectedProduct.imageUrl) ? "grid grid-cols-1" : "grid grid-cols-1 md:grid-cols-2"}>
                {!detailImgError && selectedProduct.imageUrl && (
                  <div className="aspect-square bg-slate-50">
                    <img
                      src={selectedProduct.imageUrl}
                      alt={selectedProduct.name}
                      referrerPolicy="no-referrer"
                      onError={() => setDetailImgError(true)}
                      className="h-full w-full object-cover object-center"
                    />
                  </div>
                )}
                <div className="flex flex-col justify-between p-6 md:p-8 font-semibold text-slate-800">
                  <div>
                    <span className="rounded-md bg-blue-50 border border-blue-105 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-blue-700">
                      {selectedProduct.category}
                    </span>
                    <h2 className="mt-4 text-lg font-extrabold text-slate-900 leading-tight">
                      {selectedProduct.name}
                    </h2>
                    <p className="mt-1 text-base font-extrabold text-blue-600">
                      ₹{(selectedProduct.price / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="mt-4 text-xs text-slate-500 leading-relaxed font-semibold">
                      {selectedProduct.description}
                    </p>
                  </div>

                  <div className="mt-8 border-t border-slate-150 pt-5">
                    <div className="flex items-center justify-between pb-4">
                      <span className="text-xs text-slate-400">Stock Availability:</span>
                      <span className={`text-xs font-bold uppercase tracking-wider ${
                        selectedProduct.stock <= 0 
                          ? 'text-red-600' 
                          : selectedProduct.stock <= 5 
                          ? 'text-amber-600' 
                          : 'text-green-600'
                      }`}>
                        {selectedProduct.stock <= 0 
                          ? 'Sold Out' 
                          : `${selectedProduct.stock} units available`}
                      </span>
                    </div>

                    <button
                      onClick={() => {
                        handleAddToCart(selectedProduct);
                        setSelectedProduct(null);
                      }}
                      disabled={selectedProduct.stock <= 0}
                      className="cursor-pointer flex w-full items-center justify-center space-x-2 rounded-lg bg-blue-600 py-3 text-xs font-bold text-white shadow-lg shadow-blue-650/10 transition hover:bg-blue-700 disabled:opacity-40"
                    >
                      <ShoppingCart className="h-4 w-4" />
                      <span>{selectedProduct.stock <= 0 ? 'Out of Stock' : 'Add to Shopping Cart'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AuthModal />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <Storefront />
    </AuthProvider>
  );
}
