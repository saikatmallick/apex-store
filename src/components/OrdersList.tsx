import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { Order } from '../types.ts';
import { Calendar, Package, CheckCircle2, Clock, Truck, ShieldX, RefreshCw } from 'lucide-react';

export const OrdersList: React.FC = () => {
  const { token } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/orders', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      } else {
        setError("Failed to fetch order tracking history.");
      }
    } catch (err) {
      setError("Network timeout. Please retry.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [token]);

  const getStatusDetails = (status: Order['status']) => {
    switch (status) {
      case 'pending':
        return {
          label: 'Order Placed',
          color: 'text-amber-600 bg-amber-50 border-amber-100',
          icon: <Clock className="h-4 w-4" />,
          stepIndex: 1
        };
      case 'processing':
        return {
          label: 'Processing',
          color: 'text-blue-600 bg-blue-50 border-blue-100',
          icon: <RefreshCw className="h-4 w-4 animate-spin" />,
          stepIndex: 2
        };
      case 'shipped':
        return {
          label: 'Shipped',
          color: 'text-blue-600 bg-blue-50 border-blue-100',
          icon: <Truck className="h-4 w-4" />,
          stepIndex: 3
        };
      case 'completed':
        return {
          label: 'Delivered',
          color: 'text-green-600 bg-green-50 border-green-100',
          icon: <CheckCircle2 className="h-4 w-4" />,
          stepIndex: 4
        };
      case 'cancelled':
        return {
          label: 'Cancelled',
          color: 'text-red-600 bg-red-50 border-red-100',
          icon: <ShieldX className="h-4 w-4" />,
          stepIndex: 0
        };
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 flex-col items-center justify-center space-y-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
        <p className="text-sm font-semibold text-slate-500">Querying secure order tracker...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-center">
        <p className="font-semibold text-red-605 text-sm">{error}</p>
        <button
          onClick={fetchOrders}
          className="cursor-pointer mt-4 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700"
        >
          Retry Load
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900 font-display">Your Orders</h1>
          <p className="mt-1 text-xs text-slate-400 font-semibold">Track your shipping and package status in real time</p>
        </div>
        <button
          onClick={fetchOrders}
          className="cursor-pointer flex items-center space-x-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Refresh tracking</span>
        </button>
      </div>

      {orders.length === 0 ? (
        <div className="mt-12 flex flex-col items-center justify-center text-center">
          <div className="rounded-xl bg-slate-50 p-6 text-slate-400 border border-slate-100">
            <Package className="h-8 w-8" />
          </div>
          <h3 className="mt-4 text-sm font-bold text-slate-900">No orders tracked yet</h3>
          <p className="mt-1 text-xs text-slate-500 font-medium">When you complete checkout, your tracker details will appear here.</p>
        </div>
      ) : (
        <div className="mt-8 space-y-6">
          {orders.map((order) => {
            const details = getStatusDetails(order.status);
            const formattedDate = new Date(order.createdAt).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            });

            return (
              <div
                key={order.id}
                className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs transition hover:shadow-sm"
              >
                {/* Order Meta Header */}
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 bg-slate-50/50 px-6 py-4">
                  <div className="flex items-center space-x-4">
                    <div>
                      <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 block pb-0.5">Order ID</span>
                      <span className="text-sm font-bold text-slate-900">#APEX-{order.id}</span>
                    </div>
                    <div className="h-8 w-px bg-slate-200" />
                    <div>
                      <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 block pb-0.5">Date Placed</span>
                      <span className="flex items-center text-xs font-bold text-slate-600">
                        <Calendar className="mr-1.5 h-3.5 w-3.5 text-slate-400" />
                        {formattedDate}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`flex items-center space-x-1 border rounded-md px-2.5 py-1 text-xs font-bold leading-none ${details.color}`}>
                      {details.icon}
                      <span className="uppercase tracking-wider">{details.label}</span>
                    </span>
                    <span className="text-sm font-extrabold text-blue-600">
                      Total: ₹{(order.totalAmount / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* Tracking Progress Stepper */}
                {order.status !== 'cancelled' && (
                  <div className="border-b border-slate-100 px-8 py-5 bg-slate-50/20">
                    <div className="relative flex items-center justify-between">
                      {/* Tracking Line bar */}
                      <div className="absolute top-1/2 left-4 right-4 h-0.5 -translate-y-1/2 bg-slate-100" />
                      <div 
                        className="absolute top-1/2 left-4 h-0.5 -translate-y-1/2 bg-blue-600 transition-all duration-500"
                        style={{
                          width: `${((details.stepIndex - 1) / 3) * 100}%`
                        }}
                      />

                      {/* Step Bubbles */}
                      {[
                        { label: 'Confirmed', icon: <Package className="h-3.5 w-3.5" /> },
                        { label: 'Processing', icon: <RefreshCw className="h-3.5 w-3.5" /> },
                        { label: 'Shipped', icon: <Truck className="h-3.5 w-3.5" /> },
                        { label: 'Delivered', icon: <CheckCircle2 className="h-3.5 w-3.5" /> }
                      ].map((step, idx) => {
                        const isCompleted = idx + 1 < details.stepIndex;
                        const isActive = idx + 1 === details.stepIndex;

                        return (
                          <div key={idx} className="relative z-10 flex flex-col items-center">
                            <div
                              className={`flex h-7.5 w-7.5 items-center justify-center rounded-full border transition-all ${
                                isCompleted
                                  ? 'border-blue-600 bg-blue-600 text-white'
                                  : isActive
                                  ? 'border-blue-600 bg-white text-blue-600 ring-4 ring-blue-50'
                                  : 'border-slate-200 bg-white text-slate-400'
                              }`}
                            >
                              {step.icon}
                            </div>
                            <span
                              className={`mt-1.5 text-[9px] font-bold uppercase tracking-wider ${
                                isCompleted || isActive ? 'text-blue-600' : 'text-slate-400'
                              }`}
                            >
                              {step.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Items detail list */}
                <div className="divide-y divide-slate-100 px-6 font-semibold text-slate-800">
                  {order.orderItems?.map((item) => (
                    <div key={item.id} className="flex items-center justify-between py-4">
                      <div className="flex items-center space-x-4">
                        <img
                          src={item.product?.imageUrl}
                          alt={item.product?.name}
                          referrerPolicy="no-referrer"
                          className="h-10 w-10 rounded-lg object-contain object-center bg-slate-50 border border-slate-100 flex-shrink-0"
                        />
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">{item.product?.name}</h4>
                          <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">{item.product?.category}</span>
                        </div>
                      </div>
                      <div className="text-right text-xs text-slate-500">
                        <span className="text-[11px] text-slate-400 font-bold">{item.quantity} x ₹{(item.price / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        <p className="text-xs font-extrabold text-slate-900 mt-0.5">
                          ₹{((item.price * item.quantity) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
