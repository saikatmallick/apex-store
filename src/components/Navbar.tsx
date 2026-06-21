import React from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { ShoppingCart, LayoutDashboard, LogIn, LogOut, Package, Search, Sparkles, Cpu, Watch, Coffee, Sofa, Shirt, Footprints, Dumbbell, Heart, BookOpen, LayoutGrid } from 'lucide-react';
import { Product } from '../types.ts';

interface NavbarProps {
  cartCount: number;
  onOpenCart: () => void;
  activeView: 'shop' | 'orders' | 'admin';
  onChangeView: (view: 'shop' | 'orders' | 'admin') => void;
  search: string;
  onSearchChange: (val: string) => void;
  selectedCategory: string;
  onCategoryChange: (cat: string) => void;
  categories: string[];
}

const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'All':
      return <LayoutGrid className="h-3.5 w-3.5" />;
    case 'Electronics':
      return <Cpu className="h-3.5 w-3.5" />;
    case 'Accessories':
      return <Watch className="h-3.5 w-3.5" />;
    case 'Home & Kitchen':
      return <Coffee className="h-3.5 w-3.5" />;
    case 'Furniture':
      return <Sofa className="h-3.5 w-3.5" />;
    case 'Apparel':
      return <Shirt className="h-3.5 w-3.5" />;
    case 'Footwear':
      return <Footprints className="h-3.5 w-3.5" />;
    case 'Fitness':
      return <Dumbbell className="h-3.5 w-3.5" />;
    case 'Beauty & Cosmetics':
      return <Heart className="h-3.5 w-3.5" />;
    case 'Books & Stationary':
      return <BookOpen className="h-3.5 w-3.5" />;
    default:
      return <Sparkles className="h-3.5 w-3.5" />;
  }
};

export const Navbar: React.FC<NavbarProps> = ({
  cartCount,
  onOpenCart,
  activeView,
  onChangeView,
  search,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  categories
}) => {
  const { user, profile, login, logout } = useAuth();
  const [allProducts, setAllProducts] = React.useState<Product[]>([]);
  const [showSuggestions, setShowSuggestions] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    fetch('/api/products')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setAllProducts(data))
      .catch((err) => console.error('Error fetching suggestions products:', err));
  }, []);

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchLower = search.trim().toLowerCase();
  const suggestionList = searchLower
    ? allProducts
        .filter((p) => {
          const name = p.name.toLowerCase();
          const desc = p.description.toLowerCase();
          const cat = p.category.toLowerCase();

          // Direct matching
          if (name.includes(searchLower) || desc.includes(searchLower) || cat.includes(searchLower)) {
            return true;
          }

          // Synonym / Category Expansion mapping
          if (
            searchLower === 'shoe' ||
            searchLower === 'shoes' ||
            searchLower.includes('shoe') ||
            searchLower.includes('boot') ||
            searchLower.includes('sneaker') ||
            searchLower.includes('trainer') ||
            searchLower.includes('footwear')
          ) {
            if (cat === 'footwear') return true;
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
            if (cat === 'apparel') return true;
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
            if (cat === 'home & kitchen') return true;
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
            if (cat === 'electronics') return true;
          }

          return false;
        })
        .slice(0, 6)
    : [];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-gray-100 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Branding */}
        <div 
          className="flex cursor-pointer items-center space-x-2" 
          onClick={() => {
            onChangeView('shop');
            onSearchChange('');
            onCategoryChange('All');
          }}
        >
          <div className="rounded-lg bg-blue-600 p-2 text-white">
            <Package className="h-4.5 w-4.5" />
          </div>
          <span className="text-xl font-extrabold tracking-tight text-slate-900 font-display">
            Apex<span className="text-blue-600 font-black">Store</span>
          </span>
        </div>

        {/* Search bar inside header (only visible on shop view) */}
        {activeView === 'shop' && (
          <div className="hidden max-w-md flex-grow px-8 md:block" ref={containerRef}>
            <div className="relative">
              <Search className="absolute top-2.5 left-3 h-4.5 w-4.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search tech, apparel, home..."
                value={search}
                onChange={(e) => {
                  onSearchChange(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pr-4 pl-10 text-sm outline-none transition-all placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-blue-600 focus:border-transparent"
              />

              {showSuggestions && suggestionList.length > 0 && (
                <div id="search-suggestions-container" className="absolute left-0 right-0 mt-1.5 z-50 bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden divide-y divide-slate-100 max-h-80 overflow-y-auto">
                  {suggestionList.map((prod) => (
                    <button
                      key={prod.id}
                      onClick={() => {
                        onSearchChange(prod.name);
                        setShowSuggestions(false);
                      }}
                      className="w-full flex items-center space-x-3 px-4 py-2.5 text-left hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <img
                        src={prod.imageUrl}
                        alt={prod.name}
                        className="h-9 w-9 rounded-md object-cover border border-slate-100 flex-shrink-0"
                        referrerPolicy="no-referrer"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate">{prod.name}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{prod.category}</p>
                      </div>
                      <div className="text-xs font-black text-blue-600 flex-shrink-0">
                        ₹{(prod.price / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Actions section */}
        <div className="flex items-center space-x-4">
          <button
            onClick={() => onChangeView('shop')}
            className={`cursor-pointer rounded-lg px-3.5 py-1.5 text-sm font-semibold transition-all ${
              activeView === 'shop'
                ? 'bg-blue-50 text-blue-600'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            Shop
          </button>

          {user && (
            <button
              onClick={() => onChangeView('orders')}
              className={`cursor-pointer rounded-lg px-3.5 py-1.5 text-sm font-semibold transition-all ${
                activeView === 'orders'
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              My Orders
            </button>
          )}

          {profile?.role === 'admin' && (
            <button
              onClick={() => onChangeView('admin')}
              className={`cursor-pointer flex items-center space-x-1.5 rounded-lg px-3.5 py-1.5 text-sm font-semibold transition-all ${
                activeView === 'admin'
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/15'
                  : 'bg-blue-50 text-blue-600 hover:bg-blue-100/80'
              }`}
            >
              <LayoutDashboard className="h-4 w-4" />
              <span>Admin Panel</span>
            </button>
          )}

          {/* Cart Icon trigger */}
          <button
            onClick={onOpenCart}
            className="relative cursor-pointer rounded-lg border border-slate-200 bg-white p-2 text-slate-705 transition hover:bg-slate-50"
          >
            <ShoppingCart className="h-5 w-5 text-slate-700" />
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white ring-2 ring-white">
                {cartCount}
              </span>
            )}
          </button>

          {/* Profile & Auth button */}
          {user ? (
            <div className="flex items-center space-x-3 border-l border-slate-100 pl-4">
              <img
                src={user.photoURL || `https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=${user.email}`}
                alt="Avatar"
                className="h-8 w-8 rounded-full border border-slate-200"
              />
              <div className="hidden text-left md:block">
                <p className="max-w-[120px] truncate text-xs font-bold text-slate-900">{user.displayName || 'Customer'}</p>
                <span className="text-[9px] uppercase tracking-wider text-blue-600 font-extrabold block leading-none">
                  {profile?.role || 'user'}
                </span>
              </div>
              <button
                onClick={logout}
                title="Sign Out"
                className="cursor-pointer rounded-lg bg-slate-50 p-2 text-slate-500 hover:bg-red-50 hover:text-red-600"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={login}
              className="cursor-pointer flex items-center space-x-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-blue-600/15 transition hover:bg-blue-700"
            >
              <LogIn className="h-4 w-4" />
              <span>Sign In</span>
            </button>
          )}
        </div>
      </div>

      {/* Sub-navbar with categories (Only shown on Shop view) */}
      {activeView === 'shop' && (
        <div className="border-t border-slate-100 bg-white">
          <div className="mx-auto flex max-w-7xl items-center px-4 py-2 sm:px-6 lg:px-8">
            <div className="flex w-full space-x-2 py-0.5 overflow-x-auto justify-between items-center whitespace-nowrap scrollbar-none [mask-image:linear-gradient(to_right,white_85%,transparent)] md:[mask-image:none]">
              {categories.map((cat) => {
                const isActive = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => onCategoryChange(cat)}
                    className={`cursor-pointer flex-1 min-w-[max-content] flex items-center justify-center space-x-1.5 rounded-full px-4 py-2 text-xs font-bold transition-all ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-600/15 ring-2 ring-blue-600/20'
                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100/90 hover:text-slate-900 border border-slate-100'
                    }`}
                  >
                    <span className={isActive ? 'text-white' : 'text-slate-400'}>
                      {getCategoryIcon(cat)}
                    </span>
                    <span>{cat}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
