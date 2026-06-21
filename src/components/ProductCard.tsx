import React from 'react';
import { motion } from 'motion/react';
import { Product } from '../types.ts';
import { ShoppingCart, Package, Cpu, Watch, Coffee, Sofa, Shirt, Footprints, Dumbbell, Heart, BookOpen } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
  onViewDetails: (product: Product) => void;
}

const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'Electronics':
      return <Cpu className="h-6 w-6" />;
    case 'Accessories':
      return <Watch className="h-6 w-6" />;
    case 'Home & Kitchen':
      return <Coffee className="h-6 w-6" />;
    case 'Furniture':
      return <Sofa className="h-6 w-6" />;
    case 'Apparel':
      return <Shirt className="h-6 w-6" />;
    case 'Footwear':
      return <Footprints className="h-6 w-6" />;
    case 'Fitness':
      return <Dumbbell className="h-6 w-6" />;
    case 'Beauty & Cosmetics':
      return <Heart className="h-6 w-6" />;
    case 'Books & Stationary':
      return <BookOpen className="h-6 w-6" />;
    default:
      return <Package className="h-6 w-6" />;
  }
};

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onAddToCart,
  onViewDetails
}) => {
  const isOutOfStock = product.stock <= 0;
  const [imgError, setImgError] = React.useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.3 }}
      className="group relative flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white transition-all hover:shadow-lg hover:shadow-slate-100"
    >
      {/* Target area to view details */}
      <div 
        className="relative aspect-square cursor-pointer overflow-hidden bg-slate-50 flex items-center justify-center border-b border-slate-100"
        onClick={() => onViewDetails(product)}
      >
        {!imgError && product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="h-full w-full object-cover object-center transition duration-500 group-hover:scale-105"
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="flex flex-col items-center justify-center p-6 text-slate-300">
            <div className="rounded-full bg-slate-100 p-4 transition-transform duration-300 group-hover:scale-110 text-slate-400">
              {getCategoryIcon(product.category)}
            </div>
            <span className="mt-2 text-[10px] font-black uppercase tracking-wider text-slate-400">
              No Preview
            </span>
          </div>
        )}

        {/* Category tag overlay */}
        <span className="absolute top-3 left-3 rounded-md bg-white/95 border border-slate-100 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-widest text-slate-700 backdrop-blur-xs shadow-xs font-display">
          {product.category}
        </span>

        {/* Stock notifier overlay */}
        {isOutOfStock ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-xs">
            <span className="rounded-lg bg-red-600 px-4 py-2 text-xs font-extrabold uppercase tracking-widest text-white shadow-lg">
              Sold Out
            </span>
          </div>
        ) : product.stock <= 5 ? (
          <span className="absolute top-3 right-3 rounded-md bg-amber-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
            Only {product.stock} left
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col p-4.5">

        <h3 
          className="cursor-pointer text-sm font-extrabold leading-snug text-slate-900 group-hover:text-blue-600 transition-colors font-display"
          onClick={() => onViewDetails(product)}
        >
          {product.name}
        </h3>
        <p className="mt-1.5 line-clamp-2 text-xs text-slate-500 font-medium leading-relaxed flex-1">
          {product.description}
        </p>

        <div className="mt-4.5 flex items-center justify-between border-t border-slate-50 pt-4">
          <div className="flex flex-col">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Price</span>
            <span className="text-base font-extrabold text-slate-900 leading-none">
              ₹{(product.price / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>

          <button
            onClick={() => onAddToCart(product)}
            disabled={isOutOfStock}
            className={`cursor-pointer flex items-center space-x-1.5 rounded-lg px-3.5 py-2 text-xs font-bold text-white shadow-sm transition ${
              isOutOfStock
                ? 'cursor-not-allowed bg-slate-300 shadow-none'
                : 'bg-blue-600 shadow-blue-600/10 hover:bg-blue-700'
            }`}
          >
            <ShoppingCart className="h-4 w-4" />
            <span>Add to Cart</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
};
