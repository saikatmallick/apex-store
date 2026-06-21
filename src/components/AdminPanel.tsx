import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { Order, Product } from '../types.ts';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line
} from 'recharts';
import { 
  Plus, Edit2, Trash2, CheckCircle, Package, IndianRupee, ShoppingCart, 
  RefreshCw, TrendingUp, AlertCircle, XCircle 
} from 'lucide-react';

export const AdminPanel: React.FC = () => {
  const { token } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeTab, setActiveTab] = useState<'analytics' | 'products' | 'orders'>('analytics');
  
  // Loading & states
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // New product form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formPrice, setFormPrice] = useState(''); // in INR, converted to paisa
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formCategory, setFormCategory] = useState('Electronics');
  const [formStock, setFormStock] = useState('10');
  const [editingProductId, setEditingProductId] = useState<number | null>(null);

  const loadData = async () => {
    if (!token) return;
    setLoading(true);
    setErrorMessage(null);
    try {
      // 1. Fetch products
      const pRes = await fetch('/api/products');
      const pData = await pRes.json();
      if (pRes.ok) setProducts(pData);

      // 2. Fetch admin orders
      const oRes = await fetch('/api/admin/orders', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const oData = await oRes.json();
      if (oRes.ok) setOrders(oData);
    } catch (err) {
      setErrorMessage("Connection timeout while gathering data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [token]);

  // Product CRUD
  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (!formName || !formDescription || !formImageUrl || !formPrice) {
      alert("Please fill all required cells.");
      return;
    }

    setSubmitting(true);
    const convertedPrice = Math.round(parseFloat(formPrice) * 100); // INR to paisa (cents)

    const payload = {
      name: formName,
      description: formDescription,
      price: convertedPrice,
      imageUrl: formImageUrl,
      category: formCategory,
      stock: parseInt(formStock, 10),
    };

    try {
      let res;
      if (editingProductId) {
        res = await fetch(`/api/products/${editingProductId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch('/api/products', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });
      }

      if (res.ok) {
        setShowAddForm(false);
        setEditingProductId(null);
        resetForm();
        await loadData();
      } else {
        const errorData = await res.json();
        alert(errorData.error || "Execution failed.");
      }
    } catch (err) {
      alert("Connection failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditProduct = (p: Product) => {
    setEditingProductId(p.id);
    setFormName(p.name);
    setFormDescription(p.description);
    setFormPrice((p.price / 100).toString());
    setFormImageUrl(p.imageUrl);
    setFormCategory(p.category);
    setFormStock(p.stock.toString());
    setShowAddForm(true);
  };

  const handleDeleteProduct = async (id: number) => {
    if (!token || !confirm("Are you sure you want to delete this product?")) return;

    try {
      const res = await fetch(`/api/products/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        await loadData();
      } else {
        const err = await res.json();
        alert(err.error || "Delete failed.");
      }
    } catch (error) {
      alert("Connection timeout.");
    }
  };

  const resetForm = () => {
    setFormName('');
    setFormDescription('');
    setFormPrice('');
    setFormImageUrl('');
    setFormCategory('Electronics');
    setFormStock('10');
    setEditingProductId(null);
  };

  // Order Status update
  const handleUpdateOrderStatus = async (orderId: number, status: Order['status']) => {
    if (!token) return;

    try {
      const res = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });

      if (res.ok) {
        await loadData();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to update status");
      }
    } catch (error) {
      alert("Connection error.");
    }
  };

  // Analytics helper metrics
  const activeOrders = orders.filter(o => o.status !== 'cancelled' && o.status !== 'completed');
  const finishedOrders = orders.filter(o => o.status === 'completed');
  const revenueSumInCents = orders
    .filter(o => o.status !== 'cancelled')
    .reduce((curr, order) => curr + order.totalAmount, 0);

  const productStockSum = products.reduce((acc, curr) => acc + curr.stock, 0);

  // Group revenue by category for charting
  const categoryStats: Record<string, number> = {};
  orders.filter(o => o.status !== 'cancelled').forEach(order => {
    order.orderItems?.forEach(item => {
      const cat = item.product?.category || 'General';
      categoryStats[cat] = (categoryStats[cat] || 0) + (item.price * item.quantity);
    });
  });

  const chartDataCategory = Object.keys(categoryStats).map(key => ({
    category: key,
    revenue: parseFloat((categoryStats[key] / 100).toFixed(2))
  }));

  // Simple daily revenue chart format (last 7 logs)
  const orderTrendsData = orders
    .filter(o => o.status !== 'cancelled')
    .slice(0, 10)
    .reverse()
    .map(order => ({
      orderId: `#${order.id}`,
      amount: parseFloat((order.totalAmount / 100).toFixed(2))
    }));

  if (loading) {
    return (
      <div className="flex h-96 flex-col items-center justify-center space-y-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
        <p className="text-sm font-semibold text-slate-500">Querying store administrator center...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 font-semibold text-slate-800">
      {/* Upper header */}
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 md:flex-row md:items-center">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900">Admin Control Panel</h1>
          <p className="mt-1 text-xs text-slate-400 font-semibold">Regulate inventory, dispatch orders, and inspect revenue charts.</p>
        </div>
        <button
          onClick={loadData}
          className="cursor-pointer flex items-center space-x-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-500 hover:bg-slate-50 hover:text-slate-955 transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Sync Database</span>
        </button>
      </div>

      {/* Tabs list */}
      <div className="mt-6 flex border-b border-slate-200">
        {[
          { id: 'analytics', label: 'Store Analytics' },
          { id: 'products', label: 'Inventory Manager' },
          { id: 'orders', label: 'Dispatch Center' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`cursor-pointer border-b-2 px-6 py-3 text-sm font-bold transition-all ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Dashboard KPI Banners (Shown above analytics or general status) */}
      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Metric Card 1 */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Revenue</span>
            <div className="rounded-lg bg-green-50 p-2 text-green-600 border border-green-100">
              <IndianRupee className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-extrabold text-slate-900 leading-none">
            ₹{(revenueSumInCents / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <div className="mt-2.5 flex items-center text-[10px] text-green-600 font-bold">
            <TrendingUp className="mr-1 h-3 w-3" />
            <span>Excluding cancellations</span>
          </div>
        </div>

        {/* Metric Card 2 */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Incoming Orders</span>
            <div className="rounded-lg bg-blue-50 p-2 text-blue-600 border border-blue-100">
              <ShoppingCart className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-extrabold text-slate-900 leading-none">
            {activeOrders.length}
          </p>
          <div className="mt-2.5 text-[10px] text-slate-400 font-bold">
            <span>Pending or Processing</span>
          </div>
        </div>

        {/* Metric Card 3 */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Unique Products</span>
            <div className="rounded-lg bg-blue-50 p-2 text-blue-600 border border-blue-100">
              <Package className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-extrabold text-slate-900 leading-none">
            {products.length}
          </p>
          <div className="mt-2.5 text-[10px] text-slate-400 font-bold">
            <span>Items in catalog</span>
          </div>
        </div>

        {/* Metric Card 4 */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Available Stock</span>
            <div className="rounded-lg bg-amber-50 p-2 text-amber-600 border border-amber-100">
              <AlertCircle className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-extrabold text-slate-900 leading-none">
            {productStockSum}
          </p>
          <div className="mt-2.5 text-[10px] text-slate-400 font-bold">
            <span>Aggregated units left</span>
          </div>
        </div>
      </div>

      {/* 1. Tab: Analytics Container */}
      {activeTab === 'analytics' && (
        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2 font-semibold">
          {/* Revenue by Category Bar Chart */}
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h3 className="text-sm font-bold text-slate-900 mb-5">Category revenue distribution (₹)</h3>
            <div className="h-72 w-full">
              {chartDataCategory.length === 0 ? (
                <div className="flex h-full items-center justify-center text-xs text-slate-400 font-medium">
                  No purchase data available.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartDataCategory}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="category" stroke="#94a3b8" fontSize={10} fontStyle="bold" />
                    <YAxis stroke="#94a3b8" fontSize={10} />
                    <Tooltip formatter={(value) => [`₹${value}`, 'Category Revenue']} />
                    <Bar dataKey="revenue" fill="#2563eb" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Volume Trend Charts */}
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h3 className="text-sm font-bold text-slate-900 mb-5">Sales Value Trend (₹ last 10 purchases)</h3>
            <div className="h-72 w-full">
              {orderTrendsData.length === 0 ? (
                <div className="flex h-full items-center justify-center text-xs text-slate-400 font-medium">
                  No sales trends history found.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={orderTrendsData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="orderId" stroke="#94a3b8" fontSize={10} />
                    <YAxis stroke="#94a3b8" fontSize={10} />
                    <Tooltip formatter={(value) => [`₹${value}`, 'Transaction Value']} />
                    <Line type="monotone" dataKey="amount" stroke="#2563eb" strokeWidth={2.5} dot={{ stroke: '#2563eb', strokeWidth: 1, r: 3.5 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. Tab: Inventory Management */}
      {activeTab === 'products' && (
        <div className="mt-8 font-semibold text-slate-800">
          <div className="flex items-center justify-between pb-4">
            <h3 className="text-sm font-bold text-slate-900">Current Catalog Items</h3>
            <button
              onClick={() => { resetForm(); setShowAddForm(!showAddForm); }}
              className="cursor-pointer flex items-center space-x-1 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-blue-700 transition"
            >
              <Plus className="h-4 w-4" />
              <span>{showAddForm && !editingProductId ? "Minimize panel" : "Create Product"}</span>
            </button>
          </div>

          {/* Creation/Editing sliding form */}
          {showAddForm && (
            <form onSubmit={handleProductSubmit} className="mb-8 rounded-xl border border-blue-100 bg-blue-50/10 p-6 shadow-xs">
              <h4 className="text-xs font-bold text-blue-900 mb-4 uppercase tracking-wider">
                {editingProductId ? `Edit Product (ID: ${editingProductId})` : "Create New Product Profile"}
              </h4>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">Product Name *</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Ergonomic Office Desk"
                    className="w-full rounded-lg border-none bg-white p-2.5 text-xs outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">Stock Level *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formStock}
                    onChange={(e) => setFormStock(e.target.value)}
                    className="w-full rounded-lg border-none bg-white p-2.5 text-xs outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">Price (INR) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    placeholder="e.g. 499.00"
                    className="w-full rounded-lg border-none bg-white p-2.5 text-xs outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">Product Category *</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full rounded-lg border-none bg-white p-2.5 text-xs outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="Electronics">Electronics</option>
                    <option value="Accessories">Accessories</option>
                    <option value="Home & Kitchen">Home & Kitchen</option>
                    <option value="Furniture">Furniture</option>
                    <option value="Apparel">Apparel</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">Unsplash Image URL *</label>
                  <input
                    type="url"
                    required
                    value={formImageUrl}
                    onChange={(e) => setFormImageUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full rounded-lg border-none bg-white p-2.5 text-xs outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">Brief Description *</label>
                  <textarea
                    required
                    rows={3}
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Provide depth features, sizing, and dimensions..."
                    className="w-full rounded-lg border-none bg-white p-2.5 text-xs outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-blue-600 resize-none font-semibold"
                  />
                </div>
              </div>

              <div className="mt-4 flex space-x-2 justify-end">
                <button
                  type="button"
                  onClick={() => { resetForm(); setShowAddForm(false); }}
                  className="cursor-pointer rounded-lg bg-slate-100 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="cursor-pointer rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-40 transition"
                >
                  {submitting ? "Writing..." : editingProductId ? "Save Modifications" : "Save Product"}
                </button>
              </div>
            </form>
          )}

          {/* List display */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-xs">
            <table className="w-full border-collapse text-left text-xs font-semibold text-slate-600">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50 text-[9px] uppercase tracking-wider text-slate-400 font-extrabold">
                  <th className="p-4">Item info</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Price</th>
                  <th className="p-4">Stock</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {products.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 flex items-center space-x-3 font-bold">
                      <img src={p.imageUrl} alt={p.name} referrerPolicy="no-referrer" className="h-8.5 w-8.5 rounded-lg object-cover bg-slate-100 border border-slate-200 flex-shrink-0" />
                      <div>
                        <p className="font-extrabold text-slate-900 leading-tight">{p.name}</p>
                        <p className="line-clamp-1 max-w-sm text-[10px] text-slate-400 font-semibold leading-relaxed mt-0.5">{p.description}</p>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="rounded-md bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-600 uppercase tracking-wide">
                        {p.category}
                      </span>
                    </td>
                    <td className="p-4 font-extrabold text-slate-900">₹{(p.price / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td className="p-4">
                      <span className={`font-bold ${p.stock <= 5 ? 'text-red-600' : 'text-slate-900'}`}>
                        {p.stock} units
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex justify-center space-x-1">
                        <button
                          onClick={() => handleEditProduct(p)}
                          className="cursor-pointer rounded-lg p-1.5 text-blue-600 hover:bg-blue-50 transition"
                          title="Edit details"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(p.id)}
                          className="cursor-pointer rounded-lg p-1.5 text-red-500 hover:bg-red-50 transition"
                          title="Delete product"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. Tab: active Order Dispensation list */}
      {activeTab === 'orders' && (
        <div className="mt-8 font-semibold text-slate-800">
          <h3 className="text-sm font-bold text-slate-900 pb-4">Live Customer Orders</h3>
          
          {orders.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white py-12 text-center text-xs text-slate-400 font-bold">
              No transactions logged yet.
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map(order => (
                <div key={order.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <div>
                      <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">Order ID - Customer</span>
                      <p className="text-xs font-extrabold text-slate-900 leading-none mt-1.5">
                        #APEX-{order.id} <span className="text-[11px] font-bold text-slate-400">({order.userEmail})</span>
                      </p>
                    </div>

                    {/* Dispatch selector controls */}
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-slate-400">Dispatch:</span>
                      <select
                        value={order.status}
                        onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value as any)}
                        className={`rounded-lg border-none p-1.5 text-xs font-extrabold shadow-xs outline-none ring-1 tracking-wide ${
                          order.status === 'cancelled'
                            ? 'bg-red-50 text-red-650 ring-red-100'
                            : order.status === 'completed'
                            ? 'bg-green-50 text-green-700 ring-green-100'
                            : order.status === 'shipped'
                            ? 'bg-blue-50 text-blue-600 ring-blue-105'
                            : 'bg-amber-50 text-amber-600 ring-amber-100'
                        }`}
                      >
                        <option value="pending">⏳ Pending</option>
                        <option value="processing">⚙️ Processing</option>
                        <option value="shipped">🚚 Shipped</option>
                        <option value="completed">✅ Delivered</option>
                        <option value="cancelled">❌ Cancelled</option>
                      </select>
                    </div>
                  </div>

                  {/* items breakdown */}
                  <div className="mt-3 flex flex-wrap gap-4 items-center justify-between">
                    <div className="divide-y divide-slate-100 flex-1 min-w-[280px]">
                      {order.orderItems?.map(item => (
                        <div key={item.id} className="flex items-center space-x-3 py-1.5 text-xs text-slate-500">
                          <img src={item.product?.imageUrl} referrerPolicy="no-referrer" className="h-6 w-6 rounded bg-slate-50 border border-slate-100 object-cover flex-shrink-0" />
                          <span className="font-bold text-slate-900 flex-1 truncate">{item.product?.name}</span>
                          <span className="text-[10px] text-slate-400 font-bold">{item.quantity} x ₹{(item.price / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </div>
                      ))}
                    </div>

                    <div className="text-right">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block pb-0.5">Payout Value</span>
                      <span className="text-base font-extrabold text-blue-600 leading-none">
                        ₹{(order.totalAmount / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
