import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext.tsx';
import { CartItem, Product } from '../types.ts';
import { X, Trash2, ShoppingBag, ArrowRight, Minus, Plus, ShieldCheck } from 'lucide-react';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  onUpdateQuantity: (productId: number, q: number) => void;
  onRemoveItem: (productId: number) => void;
  onClearCart: () => void;
  onCheckoutSuccess: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  cart,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onCheckoutSuccess
}) => {
  const { user, token, login } = useAuth();
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const subtotal = cart.reduce((acc, curr) => acc + curr.product.price * curr.quantity, 0);
  const totalAmount = subtotal; // Can add tax/shipping if need be

  const handleCheckout = async () => {
    if (!user || !token) {
      await login();
      return;
    }

    setCheckoutLoading(true);
    setErrorMessage(null);

    try {
      const itemsPayload = cart.map(item => ({
        productId: item.product.id,
        quantity: item.quantity
      }));

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ items: itemsPayload })
      });

      const data = await res.json();

      if (res.ok) {
        onClearCart();
        onCheckoutSuccess();
      } else {
        setErrorMessage(data.error || "Checkout failed. Please inspect your item stock.");
      }
    } catch (err: any) {
      setErrorMessage("Network connection timed out. Please try again.");
    } finally {
      setCheckoutLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black backdrop-blur-xs"
          />

          {/* Sliding Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="fixed top-0 right-0 z-50 flex h-full w-full max-w-md flex-col bg-white shadow-2xl ring-1 ring-slate-100"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
              <div className="flex items-center space-x-2">
                <ShoppingBag className="h-5 w-5 text-blue-600" />
                <h2 className="text-base font-bold text-slate-900">Your Cart</h2>
                <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-extrabold text-blue-700">
                  {cart.length}
                </span>
              </div>
              <button
                onClick={onClose}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-950"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Error Message banner */}
            {errorMessage && (
              <div className="bg-red-50 border-b border-red-100 px-6 py-3 text-xs font-semibold text-red-600">
                {errorMessage}
              </div>
            )}

            {/* Cart list */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {cart.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <div className="rounded-xl bg-slate-50 p-6 text-slate-400">
                    <ShoppingBag className="h-10 w-10" />
                  </div>
                  <h3 className="mt-4 text-sm font-bold text-slate-900">Your cart is empty</h3>
                  <p className="mt-1 text-xs text-slate-500 font-medium">Add premium items from the store to get started.</p>
                  <button
                    onClick={onClose}
                    className="cursor-pointer mt-5 rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700"
                  >
                    Continue Shopping
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {cart.map((item) => (
                    <motion.div
                      layout
                      key={item.product.id}
                      className="flex items-center space-x-4 rounded-xl border border-slate-100 p-3 hover:border-slate-200"
                    >
                      <div className="h-14 w-14 rounded-lg overflow-hidden flex-shrink-0 bg-slate-50 flex items-center justify-center">
                        {item.product.imageUrl && (
                          <img
                            src={item.product.imageUrl}
                            alt={item.product.name}
                            className="h-full w-full object-contain object-center"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="truncate text-xs font-bold text-slate-900">
                          {item.product.name}
                        </h4>
                        <p className="text-[9px] text-blue-700 font-bold uppercase tracking-widest leading-none mt-1">{item.product.category}</p>
                        <p className="mt-1.5 text-sm font-extrabold text-slate-955 leading-none">
                          ₹{(item.product.price / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </p>
                      </div>

                      {/* Stepper details */}
                      <div className="flex flex-col items-end space-y-2">
                        <div className="flex items-center space-x-1 border border-slate-100 rounded bg-slate-50 p-0.5">
                          <button
                            onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1)}
                            disabled={item.quantity <= 1}
                            className="cursor-pointer rounded-sm p-1 hover:bg-white text-slate-500 disabled:opacity-35"
                          >
                            <Minus className="h-2.5 w-2.5" />
                          </button>
                          <span className="w-5 text-center text-xs font-extrabold text-slate-800">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)}
                            disabled={item.quantity >= item.product.stock}
                            className="cursor-pointer rounded-sm p-1 hover:bg-white text-slate-500 disabled:opacity-35"
                          >
                            <Plus className="h-2.5 w-2.5" />
                          </button>
                        </div>
                        <button
                          onClick={() => onRemoveItem(item.product.id)}
                          className="cursor-pointer p-1 text-slate-400 hover:text-red-500"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer Summary & Checkout */}
            {cart.length > 0 && (
              <div className="border-t border-slate-100 bg-slate-50/50 px-6 py-6 font-semibold">
                <div className="space-y-2 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span className="font-bold text-slate-900">₹{(subtotal / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Shipping</span>
                    <span className="text-green-600 font-extrabold pb-2">Free</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-200/60 pt-3 text-sm text-slate-900 font-extrabold">
                    <span>Final Amount</span>
                    <span className="text-base text-blue-600">₹{(totalAmount / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>

                {/* Secure checkout notice */}
                <div className="mt-4 flex items-center space-x-1.5 text-[10px] text-slate-400 font-medium">
                  <ShieldCheck className="h-4 w-4 text-blue-600" />
                  <span>Secure checkout with instant delivery updates</span>
                </div>

                <button
                  onClick={handleCheckout}
                  disabled={checkoutLoading}
                  className="cursor-pointer mt-4 flex w-full items-center justify-center space-x-2 rounded-lg bg-blue-600 py-3 px-4 text-xs font-extrabold text-white shadow-md shadow-blue-600/10 hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {checkoutLoading ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : !user ? (
                    <>
                      <span>Sign In to Securely Checkout</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </>
                  ) : (
                    <>
                      <span>Place Order Securely</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </>
                  )}
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
