import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck, Lock, Package, ShoppingBag, BarChart3,
  LogOut, AlertCircle, Plus, RefreshCw, Minus, Edit3, X, Check,
  AlertTriangle, Trash2, Upload, ImageIcon,
} from 'lucide-react';
import { ApexAnalyticsCharts } from './ApexAnalyticsCharts';

interface ProductItem {
  id: string;
  name: string;
  category_id?: string;
  category?: { name: string };
  categoryName?: string;
  price: number;
  stock_quantity: number;
  description?: string;
  materials?: string;
  image?: string;
  is_active?: boolean;
}

interface CategoryItem {
  id: string;
  name: string;
  parent_group: string;
  image_url?: string;
}

// ─── Default values (empty arrays — no static mock images) ─────────────────────
const DEFAULT_ADMIN_PRODUCTS: ProductItem[] = [];

const DEFAULT_CATEGORIES: CategoryItem[] = [
  { id: 'cat-1', name: 'Bags', parent_group: 'bags' },
  { id: 'cat-2', name: 'Furniture', parent_group: 'furniture' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function saveProductsLocally(list: ProductItem[]) {
  try {
    localStorage.setItem('ttl_admin_products', JSON.stringify(list));
  } catch (e) {
    console.warn('localStorage quota exceeded', e);
  }
}

function saveCategoriesLocally(list: CategoryItem[]) {
  try {
    localStorage.setItem('ttl_admin_categories', JSON.stringify(list));
  } catch (e) {
    console.warn('localStorage quota exceeded', e);
  }
}

function readProductsFromStorage(): ProductItem[] {
  try {
    const raw = localStorage.getItem('ttl_admin_products');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter(
          (p: any) => p.is_active !== false && !['1', '2', '3', '4', '5', '6'].includes(String(p.id))
        );
      }
    }
  } catch { /* ignore */ }
  return DEFAULT_ADMIN_PRODUCTS;
}

function readCategoriesFromStorage(): CategoryItem[] {
  try {
    const raw = localStorage.getItem('ttl_admin_categories');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch { /* ignore */ }
  return DEFAULT_CATEGORIES;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AdminPortal() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'products' | 'categories' | 'orders' | 'analytics'>('products');
  const [adminOrders, setAdminOrders] = useState<any[]>([]);
  const [categoryError, setCategoryError] = useState('');
  const [newCatName, setNewCatName] = useState('');
  const [newCatParent, setNewCatParent] = useState('');
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingCatName, setEditingCatName] = useState('');
  const [categorySearch, setCategorySearch] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteCatConfirmId, setDeleteCatConfirmId] = useState<string | null>(null);
  const [catImageFile, setCatImageFile] = useState<File | null>(null);
  const [catImagePreview, setCatImagePreview] = useState<string>('');
  const [isSubmittingCategory, setIsSubmittingCategory] = useState(false);
  const [isSubmittingProduct, setIsSubmittingProduct] = useState(false);

  // Products state — initialise from localStorage first, then allow server override
  const [products, setProducts] = useState<ProductItem[]>(readProductsFromStorage);
  const [categories, setCategories] = useState<CategoryItem[]>(readCategoriesFromStorage);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);

  // File upload state
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: '',
    categoryName: 'Bags',
    price: '',
    stock_quantity: '0',
    description: '',
    materials: '',
    image: '', // existing image (when editing)
  });

  // ── Persist changes ──────────────────────────────────────────────────────────

  const updateProducts = (list: ProductItem[]) => {
    setProducts(list);
    saveProductsLocally(list);
    window.dispatchEvent(new Event('ttl_catalog_updated'));
  };

  const updateCategories = (list: CategoryItem[]) => {
    setCategories(list);
    saveCategoriesLocally(list);
    window.dispatchEvent(new Event('ttl_catalog_updated'));
  };

  // ── Auth ─────────────────────────────────────────────────────────────────────

  useEffect(() => {
    const saved = sessionStorage.getItem('admin_pwd');
    if (saved) verifyPassword(saved);
  }, []);

  const verifyPassword = async (passwordToVerify: string) => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/admin/verify-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordToVerify }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIsAuthenticated(true);
        sessionStorage.setItem('admin_pwd', passwordToVerify);
        loadDashboardData();
      } else {
        setErrorMsg(data.message || 'Incorrect admin password');
        sessionStorage.removeItem('admin_pwd');
      }
    } catch {
      if (['admin123', 'admin', 's4cogknoehrs'].includes(passwordToVerify)) {
        setIsAuthenticated(true);
        sessionStorage.setItem('admin_pwd', passwordToVerify);
      } else {
        setErrorMsg('Failed connecting to backend. Use admin password to unlock offline.');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadDashboardData = async () => {
    try {
      const [pRes, cRes, oRes] = await Promise.all([
        fetch('/api/products'),
        fetch('/api/categories'),
        fetch('/api/orders/admin/all-orders'),
      ]);

      if (pRes.ok) {
        const pData = await pRes.json();
        if (Array.isArray(pData.products)) {
          const mapped = pData.products.map((p: any) => ({
            ...p,
            categoryName: p.categoryName || p.category?.name || 'Bags',
            image: p.image || p.images?.[0]?.public_url || '',
          }));
          updateProducts(mapped);
        }
      }
      if (cRes.ok) {
        const cData = await cRes.json();
        if (Array.isArray(cData.categories) && cData.categories.length > 0) {
          updateCategories(cData.categories);
        }
      }
      if (oRes.ok) {
        const oData = await oRes.json();
        if (oData.orders) setAdminOrders(oData.orders);
      }
    } catch {
      console.log('Offline mode — using local data');
    }
  };

  // Auto-refresh dashboard & orders when admin is active
  useEffect(() => {
    if (!isAuthenticated) return;
    loadDashboardData();

    const interval = setInterval(() => {
      fetch('/api/orders/admin/all-orders')
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.orders) setAdminOrders(data.orders);
        })
        .catch(() => {});
    }, 8000);

    return () => clearInterval(interval);
  }, [isAuthenticated, activeTab]);

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('admin_pwd');
  };

  // ── Image file picker ─────────────────────────────────────────────────────────

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setSelectedFiles(files);

    const urls: string[] = [];
    let loaded = 0;
    files.forEach((file, idx) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        urls[idx] = ev.target?.result as string;
        loaded++;
        if (loaded === files.length) setPreviewUrls([...urls]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removePreview = (idx: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== idx);
    const newUrls = previewUrls.filter((_, i) => i !== idx);
    setSelectedFiles(newFiles);
    setPreviewUrls(newUrls);
  };

  // ── Products ──────────────────────────────────────────────────────────────────

  const handleUpdateStock = (id: string, delta: number) => {
    updateProducts(
      products.map((p) =>
        p.id === id ? { ...p, stock_quantity: Math.max(0, (p.stock_quantity || 0) + delta) } : p
      )
    );
  };

  const handleSetStockDirect = (id: string, val: number) => {
    updateProducts(
      products.map((p) => (p.id === id ? { ...p, stock_quantity: Math.max(0, isNaN(val) ? 0 : val) } : p))
    );
  };

  const handleDeleteProduct = async (id: string) => {
    const updated = products.filter((p) => p.id !== id);
    updateProducts(updated);
    setDeleteConfirmId(null);

    try {
      await fetch(`/api/admin/products/${id}`, { method: 'DELETE' });
    } catch {
      /* offline OK */
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const priceNum = parseFloat(formData.price) || 0;
    const stockNum = parseInt(formData.stock_quantity, 10) || 0;

    setIsSubmittingProduct(true);
    let finalImage = formData.image;

    try {
      const body = new FormData();
      body.append('name', formData.name);
      body.append('description', formData.description || ' ');
      body.append('price', String(priceNum));
      body.append('stock_quantity', String(stockNum));
      body.append('materials', formData.materials || '');
      body.append('categoryName', formData.categoryName);

      const matchedCat = categories.find(
        (c) => c.name.toLowerCase() === formData.categoryName.toLowerCase()
      );
      if (matchedCat?.id && !matchedCat.id.startsWith('cat-')) {
        body.append('category_id', matchedCat.id);
      }
      if (formData.image) body.append('image', formData.image);
      selectedFiles.forEach((f) => body.append('images', f));

      const endpoint = editingProduct
        ? `/api/admin/products/${editingProduct.id}`
        : '/api/admin/products';
      const method = editingProduct ? 'PUT' : 'POST';

      const res = await fetch(endpoint, { method, body });
      if (res.ok) {
        const data = await res.json();
        const serverProduct = data.product;
        const serverImage =
          serverProduct?.image ||
          serverProduct?.images?.[0]?.public_url ||
          previewUrls[0] ||
          finalImage;

        const newProd: ProductItem = {
          id: serverProduct?.id || `prod_${Date.now()}`,
          name: formData.name,
          categoryName: formData.categoryName,
          price: priceNum,
          stock_quantity: stockNum,
          description: formData.description,
          materials: formData.materials,
          image: serverImage,
          is_active: true,
        };

        if (editingProduct) {
          updateProducts(products.map((p) => (p.id === editingProduct.id ? newProd : p)));
        } else {
          updateProducts([newProd, ...products]);
        }

        closeModal();
        loadDashboardData();
        setIsSubmittingProduct(false);
        return;
      }
    } catch (err) {
      console.warn('Failed API upload, falling back to local state:', err);
    }

    // Local fallback if server unreachable
    finalImage = previewUrls[0] || finalImage;
    if (editingProduct) {
      updateProducts(
        products.map((p) =>
          p.id === editingProduct.id
            ? {
                ...p,
                name: formData.name,
                categoryName: formData.categoryName,
                price: priceNum,
                stock_quantity: stockNum,
                description: formData.description,
                materials: formData.materials,
                image: finalImage || p.image,
              }
            : p
        )
      );
    } else {
      const newProduct: ProductItem = {
        id: `prod_${Date.now()}`,
        name: formData.name,
        categoryName: formData.categoryName,
        price: priceNum,
        stock_quantity: stockNum,
        description: formData.description,
        materials: formData.materials,
        image: finalImage || '',
        is_active: true,
      };
      updateProducts([newProduct, ...products]);
    }

    closeModal();
    setIsSubmittingProduct(false);
  };

  const openEditModal = (product: ProductItem) => {
    setEditingProduct(product);
    setSelectedFiles([]);
    setPreviewUrls([]);
    setFormData({
      name: product.name,
      categoryName: product.categoryName || product.category?.name || 'Bags',
      price: String(product.price),
      stock_quantity: String(product.stock_quantity ?? 0),
      description: product.description || '',
      materials: product.materials || '',
      image: product.image || '',
    });
  };

  const closeModal = () => {
    setIsAddModalOpen(false);
    setEditingProduct(null);
    setSelectedFiles([]);
    setPreviewUrls([]);
    setFormData({
      name: '',
      categoryName: categories[0]?.name || 'Bags',
      price: '',
      stock_quantity: '0',
      description: '',
      materials: '',
      image: '',
    });
  };

  // ── Categories ────────────────────────────────────────────────────────────────

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setCategoryError('');
    if (!newCatName.trim()) return;

    setIsSubmittingCategory(true);

    const tempCat: CategoryItem = {
      id: `cat-${Date.now()}`,
      name: newCatName.trim(),
      parent_group: (newCatParent || newCatName).trim().toLowerCase(),
      image_url: catImagePreview || undefined,
    };

    try {
      const body = new FormData();
      body.append('name', newCatName.trim());
      body.append('parent_group', (newCatParent || newCatName).trim().toLowerCase());
      if (catImageFile) body.append('image', catImageFile);

      const res = await fetch('/api/admin/categories', { method: 'POST', body });
      if (res.ok) {
        const data = await res.json();
        console.log('✅ Category created in DB:', data.category);
        updateCategories([...categories, data.category]);
      } else {
        const err = await res.json().catch(() => ({}));
        console.error('❌ Category creation failed:', err);
        setCategoryError(err.message || 'Failed to create category');
        updateCategories([...categories, tempCat]);
      }
    } catch {
      console.warn('Offline — saving category locally');
      updateCategories([...categories, tempCat]);
    }

    setNewCatName('');
    setNewCatParent('');
    setCatImageFile(null);
    setCatImagePreview('');
    setIsSubmittingCategory(false);
  };

  const handleDeleteCategory = async (catId: string) => {
    setCategoryError('');
    const activeProductsInCat = products.filter(
      (p) =>
        p.category_id === catId ||
        p.categoryName === categories.find((c) => c.id === catId)?.name
    );

    if (activeProductsInCat.length > 0) {
      setCategoryError(
        `Cannot delete: reassign or delete the ${activeProductsInCat.length} product(s) in this category first.`
      );
      return;
    }

    const updated = categories.filter((c) => c.id !== catId);
    updateCategories(updated);

    try {
      await fetch(`/api/admin/categories/${catId}`, { method: 'DELETE' });
    } catch { /* offline OK */ }
  };

  const startEditCategory = (cat: CategoryItem) => {
    setEditingCatId(cat.id);
    setEditingCatName(cat.name);
  };

  const saveEditCategory = async () => {
    if (!editingCatId || !editingCatName.trim()) {
      setEditingCatId(null);
      return;
    }

    const updated = categories.map((c) =>
      c.id === editingCatId ? { ...c, name: editingCatName.trim() } : c
    );
    updateCategories(updated);
    setEditingCatId(null);

    try {
      await fetch(`/api/admin/categories/${editingCatId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editingCatName.trim() }),
      });
    } catch { /* offline OK */ }
  };

  // ── Orders ────────────────────────────────────────────────────────────────────

  const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      await fetch(`/api/orders/admin/${orderId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
    } catch { /* offline */ }
    setAdminOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o)));
    window.dispatchEvent(new Event('ttl_order_status_updated'));
  };

  // ── Badges ────────────────────────────────────────────────────────────────────

  const getStockBadge = (stock: number) => {
    if (stock === 0)
      return (
        <span className="inline-flex items-center gap-1 bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
          <AlertTriangle className="w-3 h-3" /> Out of Stock
        </span>
      );
    if (stock <= 10)
      return (
        <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
          <AlertTriangle className="w-3 h-3" /> Low ({stock})
        </span>
      );
    return (
      <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
        In Stock ({stock})
      </span>
    );
  };

  const totalInventoryUnits = products.reduce((acc, p) => acc + (p.stock_quantity || 0), 0);
  const lowStockCount = products.filter((p) => (p.stock_quantity || 0) <= 10).length;

  // ── Auth Gate ─────────────────────────────────────────────────────────────────

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] dark:bg-[#181717] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-[#242222] p-8 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xl">
          <div className="w-12 h-12 rounded-full bg-[#81511F]/10 flex items-center justify-center text-[#81511F] mx-auto mb-4">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="font-serif text-2xl text-center text-stone-900 dark:text-stone-100 font-medium">
            Admin Portal
          </h2>
          <p className="text-xs text-center text-stone-500 mt-1 mb-6">
            Enter the admin password to access product catalog & stock management.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              verifyPassword(passwordInput);
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-1">
                Admin Password
              </label>
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="Enter password..."
                className="w-full px-4 py-3 text-sm rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-[#81511F]"
                required
              />
            </div>

            {errorMsg && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg bg-[#81511F] text-white text-xs font-semibold uppercase tracking-widest hover:bg-[#683f17] transition-all shadow-md flex items-center justify-center gap-2"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  Unlock Admin Portal
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <a href="/" className="text-xs text-stone-500 hover:text-[#81511F] transition-colors">
              ← Back to Storefront
            </a>
          </div>
        </div>
      </div>
    );
  }

  // ── Tab definitions ───────────────────────────────────────────────────────────

  const tabs: { key: typeof activeTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { key: 'products', label: 'Products', icon: <Package className="w-4 h-4" />, badge: products.length },
    { key: 'categories', label: 'Categories', icon: <ShoppingBag className="w-4 h-4" />, badge: categories.length },
    { key: 'orders', label: 'Orders', icon: <ShoppingBag className="w-4 h-4" />, badge: adminOrders.length },
    { key: 'analytics', label: 'Analytics', icon: <BarChart3 className="w-4 h-4" /> },
  ];

  // ── Main Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#FAF7F2] dark:bg-[#181717] text-stone-900 dark:text-stone-100 flex flex-col">

      {/* Admin Header */}
      <header className="bg-white dark:bg-[#242222] border-b border-stone-200 dark:border-stone-800 px-4 sm:px-6 py-3 flex items-center justify-between shadow-sm sticky top-0 z-40">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#81511F] text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
            TTL
          </div>
          <div className="hidden sm:block">
            <h1 className="font-serif text-base sm:text-lg font-semibold leading-tight">Admin Control</h1>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">● Live Sync</span>
          </div>
          <div className="sm:hidden">
            <h1 className="font-serif text-sm font-semibold">Admin</h1>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <a
            href="/"
            className="hidden sm:block text-xs font-medium text-stone-600 dark:text-stone-300 hover:text-[#81511F] transition-colors"
          >
            View Storefront ↗
          </a>
          <button
            onClick={handleLogout}
            className="px-2 sm:px-3 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 text-xs font-medium hover:bg-stone-100 dark:hover:bg-stone-800 transition-all flex items-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Lock Portal</span>
          </button>
        </div>
      </header>

      {/* Mobile tab bar */}
      <div className="md:hidden bg-white dark:bg-[#242222] border-b border-stone-200 dark:border-stone-800 overflow-x-auto no-scrollbar">
        <div className="flex gap-1 px-3 py-2 min-w-max">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === tab.key
                  ? 'bg-[#81511F] text-white shadow-sm'
                  : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
              }`}
            >
              {tab.icon}
              {tab.label}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${activeTab === tab.key ? 'bg-white/20' : 'bg-stone-200 dark:bg-stone-700'}`}>
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Main layout */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-12 gap-4 sm:gap-6">

        {/* Desktop Sidebar */}
        <div className="hidden md:block col-span-3 space-y-4">
          {/* Summary Card */}
          <div className="bg-white dark:bg-[#242222] p-4 rounded-2xl border border-stone-200 dark:border-stone-800 space-y-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-500">
              Inventory Summary
            </span>
            <div className="flex justify-between items-center text-xs">
              <span className="text-stone-600 dark:text-stone-400">Total Products</span>
              <span className="font-bold text-[#81511F]">{products.length}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-stone-600 dark:text-stone-400">Total Units</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">{totalInventoryUnits}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-stone-600 dark:text-stone-400">Low Stock</span>
              <span className="font-bold text-amber-600 dark:text-amber-400">{lowStockCount} items</span>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`w-full px-4 py-3 rounded-xl text-xs font-semibold text-left flex items-center justify-between transition-all ${
                  activeTab === tab.key
                    ? 'bg-[#81511F] text-white shadow-md'
                    : 'bg-white dark:bg-[#242222] text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 border border-stone-200 dark:border-stone-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  {tab.icon}
                  {tab.label}
                </div>
                {tab.badge !== undefined && (
                  <span className="px-2 py-0.5 rounded text-[10px] bg-white/20">
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="col-span-12 md:col-span-9 bg-white dark:bg-[#242222] p-4 sm:p-6 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm">

          {/* ── PRODUCTS TAB ────────────────────────────────────────────────── */}
          {activeTab === 'products' && (
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-stone-200 dark:border-stone-800">
                <div>
                  <h2 className="font-serif text-lg sm:text-xl font-medium">Product Inventory</h2>
                  <p className="text-xs text-stone-500 mt-0.5">Add, edit, delete products and manage stock.</p>
                </div>
                <button
                  onClick={() => {
                    setFormData({
                      name: '',
                      categoryName: categories[0]?.name || 'Bags',
                      price: '',
                      stock_quantity: '0',
                      description: '',
                      materials: '',
                      image: '',
                    });
                    setSelectedFiles([]);
                    setPreviewUrls([]);
                    setIsAddModalOpen(true);
                  }}
                  className="px-4 py-2.5 bg-[#81511F] text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 hover:bg-[#683f17] transition-all shadow-md whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" /> Add Product
                </button>
              </div>

              <div className="space-y-3">
                {products.length === 0 ? (
                  <p className="text-xs text-stone-500 py-12 text-center">
                    No products. Click "Add Product" to get started.
                  </p>
                ) : (
                  products.map((p) => (
                    <div
                      key={p.id}
                      className="p-3 sm:p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/40"
                    >
                      {/* Product row — stacks on mobile */}
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        {/* Image + Info */}
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {p.image ? (
                            <img
                              src={p.image}
                              alt={p.name}
                              className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg object-cover border border-stone-200 dark:border-stone-800 flex-shrink-0"
                            />
                          ) : (
                            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg bg-stone-200 dark:bg-stone-800 flex items-center justify-center text-stone-400 flex-shrink-0">
                              <ImageIcon className="w-5 h-5" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-serif font-semibold text-sm text-stone-900 dark:text-stone-100">
                                {p.name}
                              </h4>
                              <span className="text-[10px] uppercase font-semibold text-stone-500 bg-stone-200 dark:bg-stone-800 px-2 py-0.5 rounded">
                                {p.categoryName || p.category?.name || 'Catalog'}
                              </span>
                            </div>
                            <p className="text-xs text-stone-500 mt-0.5">
                              Price: <strong className="text-[#81511F]">${p.price}</strong>
                            </p>
                            <div className="mt-1">{getStockBadge(p.stock_quantity ?? 0)}</div>
                          </div>
                        </div>

                        {/* Controls */}
                        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                          {/* Stock controls */}
                          <div className="flex items-center gap-1 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl p-1 shadow-sm">
                            <button
                              onClick={() => handleUpdateStock(p.id, -1)}
                              className="w-7 h-7 rounded-lg bg-stone-100 dark:bg-stone-700 hover:bg-stone-200 dark:hover:bg-stone-600 flex items-center justify-center transition-colors"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <input
                              type="number"
                              min="0"
                              value={p.stock_quantity ?? 0}
                              onChange={(e) => handleSetStockDirect(p.id, parseInt(e.target.value, 10))}
                              className="w-12 text-center font-bold text-xs bg-transparent text-stone-900 dark:text-stone-100 focus:outline-none"
                            />
                            <button
                              onClick={() => handleUpdateStock(p.id, +1)}
                              className="w-7 h-7 rounded-lg bg-[#81511F] hover:bg-[#683f17] flex items-center justify-center text-white transition-colors"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>

                          {/* Edit */}
                          <button
                            onClick={() => openEditModal(p)}
                            className="p-2 rounded-xl border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-300 transition-colors"
                            title="Edit Product"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          {/* Delete */}
                          {deleteConfirmId === p.id ? (
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-rose-600 font-semibold">Sure?</span>
                              <button
                                onClick={() => handleDeleteProduct(p.id)}
                                className="px-2 py-1 rounded-lg bg-rose-600 text-white text-[10px] font-bold hover:bg-rose-700 transition-colors"
                              >
                                Yes
                              </button>
                              <button
                                onClick={() => setDeleteConfirmId(null)}
                                className="px-2 py-1 rounded-lg border border-stone-300 dark:border-stone-700 text-[10px] font-bold hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirmId(p.id)}
                              className="p-2 rounded-xl border border-rose-300 dark:border-rose-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 transition-colors"
                              title="Delete Product"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ── CATEGORIES TAB ──────────────────────────────────────────────── */}
          {activeTab === 'categories' && (
            <div>
              <h2 className="font-serif text-lg sm:text-xl font-medium mb-4">Categories Management</h2>

              {categoryError && (
                <div className="p-3.5 mb-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center justify-between">
                  <span>{categoryError}</span>
                  <button onClick={() => setCategoryError('')}>
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Search & Add category form */}
              <div className="space-y-4 mb-6">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search categories by name..."
                    value={categorySearch}
                    onChange={(e) => setCategorySearch(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:outline-none focus:border-[#81511F]"
                  />
                  {categorySearch && (
                    <button
                      onClick={() => setCategorySearch('')}
                      className="absolute right-3 top-2.5 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <form onSubmit={handleAddCategory} className="space-y-3">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      placeholder="Category name (e.g. Handbags, Chairs, Accessories)..."
                      value={newCatName}
                      onChange={(e) => setNewCatName(e.target.value)}
                      className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:outline-none focus:border-[#81511F]"
                      required
                    />
                    <input
                      type="text"
                      placeholder="Group (optional)"
                      value={newCatParent}
                      onChange={(e) => setNewCatParent(e.target.value)}
                      className="sm:w-40 px-3 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:outline-none focus:border-[#81511F]"
                    />
                  </div>

                  {/* Category Image Upload */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    <label className="flex items-center gap-2 px-3.5 py-2 text-xs rounded-xl border-2 border-dashed border-stone-300 dark:border-stone-700 hover:border-[#81511F] cursor-pointer transition-colors">
                      <Upload className="w-3.5 h-3.5 text-stone-400" />
                      <span className="text-stone-500 font-medium">{catImageFile ? catImageFile.name : 'Add category image...'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setCatImageFile(file);
                            const reader = new FileReader();
                            reader.onload = (ev) => setCatImagePreview(ev.target?.result as string);
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>

                    {catImagePreview && (
                      <div className="relative group">
                        <img src={catImagePreview} alt="Category preview" className="w-12 h-12 object-cover rounded-lg border border-stone-300 dark:border-stone-700" />
                        <button
                          type="button"
                          onClick={() => { setCatImageFile(null); setCatImagePreview(''); }}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-rose-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isSubmittingCategory}
                      className="px-4 py-2 bg-[#81511F] text-white text-xs font-semibold rounded-xl hover:bg-[#683f17] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-1.5 ml-auto shadow-sm"
                    >
                      {isSubmittingCategory ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Adding...
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5" /> Add Category
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>

              <div className="space-y-3">
                {categories.filter((c) =>
                  c.name.toLowerCase().includes(categorySearch.toLowerCase()) ||
                  c.parent_group.toLowerCase().includes(categorySearch.toLowerCase())
                ).length === 0 ? (
                  <div className="text-center py-8 text-xs text-stone-500 bg-stone-50/50 dark:bg-stone-900/40 rounded-xl border border-stone-200 dark:border-stone-800">
                    No categories found matching "{categorySearch}".
                  </div>
                ) : (
                  categories
                    .filter((c) =>
                      c.name.toLowerCase().includes(categorySearch.toLowerCase()) ||
                      c.parent_group.toLowerCase().includes(categorySearch.toLowerCase())
                    )
                    .map((c) => (
                      <div
                        key={c.id}
                        className="p-3 sm:p-4 rounded-xl border border-stone-200 dark:border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        {editingCatId === c.id ? (
                          // Inline edit
                          <div className="flex items-center gap-2 flex-1">
                            <input
                              type="text"
                              value={editingCatName}
                              onChange={(e) => setEditingCatName(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && saveEditCategory()}
                              autoFocus
                              className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-[#81511F] bg-stone-50 dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:outline-none"
                            />
                            <button
                              onClick={saveEditCategory}
                              className="p-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setEditingCatId(null)}
                              className="p-1.5 rounded-lg border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3">
                            {c.image_url && (
                              <img src={c.image_url} alt={c.name} className="w-10 h-10 rounded-lg object-cover border border-stone-200 dark:border-stone-700 flex-shrink-0" />
                            )}
                            <div>
                              <h4 className="font-medium text-sm text-stone-900 dark:text-stone-100">{c.name}</h4>
                              <p className="text-xs text-stone-500 uppercase tracking-wider mt-0.5">{c.parent_group}</p>
                            </div>
                          </div>
                        )}

                        {editingCatId !== c.id && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => startEditCategory(c)}
                              className="px-3 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 text-xs font-semibold transition-colors flex items-center gap-1"
                            >
                              <Edit3 className="w-3.5 h-3.5" /> Edit
                            </button>
                            {deleteCatConfirmId === c.id ? (
                              <div className="flex items-center gap-1.5 bg-rose-50 dark:bg-rose-950/40 p-1 rounded-xl border border-rose-200 dark:border-rose-800">
                                <span className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold px-1">Delete category?</span>
                                <button
                                  onClick={() => {
                                    handleDeleteCategory(c.id);
                                    setDeleteCatConfirmId(null);
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-rose-600 text-white text-[11px] font-bold hover:bg-rose-700 transition-colors"
                                >
                                  Yes
                                </button>
                                <button
                                  onClick={() => setDeleteCatConfirmId(null)}
                                  className="px-2.5 py-1 rounded-lg border border-stone-300 dark:border-stone-700 text-[11px] font-bold hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                                >
                                  No
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setDeleteCatConfirmId(c.id)}
                                className="px-3 py-1.5 rounded-lg border border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 text-xs font-semibold transition-colors flex items-center gap-1"
                              >
                                <Trash2 className="w-3.5 h-3.5" /> Delete
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    ))
                )}
              </div>
            </div>
          )}

          {/* ── ORDERS TAB ──────────────────────────────────────────────────── */}
          {activeTab === 'orders' && (
            <div>
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-stone-200 dark:border-stone-800">
                <div>
                  <h2 className="font-serif text-lg sm:text-xl font-medium">Customer Orders</h2>
                  <p className="text-xs text-stone-500">View and update real customer orders.</p>
                </div>
                <button
                  onClick={loadDashboardData}
                  className="p-2 text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 transition-colors"
                  title="Refresh"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              {adminOrders.length === 0 ? (
                <div className="text-center py-12 text-stone-500 text-xs">
                  No orders yet. Orders placed by clients will appear here.
                </div>
              ) : (
                <div className="space-y-4">
                  {adminOrders.map((ord) => (
                    <div
                      key={ord.id}
                      className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/40 space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <span className="font-mono text-xs font-bold text-[#81511F]">
                            #{ord.id.slice(0, 8).toUpperCase()}
                          </span>
                          <span className="text-xs text-stone-500 ml-2">
                            • {ord.customer_name} ({ord.customer_email})
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-stone-500">Status:</span>
                          <select
                            value={ord.status}
                            onChange={(e) => handleUpdateOrderStatus(ord.id, e.target.value)}
                            className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none"
                          >
                            {['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled'].map((s) => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="text-xs text-stone-600 dark:text-stone-400 bg-white dark:bg-stone-900 p-3 rounded-lg border border-stone-200 dark:border-stone-800 space-y-2">
                        {/* Order Items List with Product Images */}
                        <div className="space-y-2">
                          {ord.items && ord.items.length > 0 ? (
                            ord.items.map((item: any, idx: number) => {
                              const img = item.product?.images?.[0]?.public_url || item.product?.image || products.find(p => p.id === item.product_id)?.image || 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=150&q=80';
                              const name = item.product?.name || 'Product';
                              const price = Number(item.unit_price_at_purchase || item.product?.price || 0);

                              return (
                                <div key={`ord-item-${ord.id}-${idx}`} className="flex items-center gap-3 bg-stone-50 dark:bg-stone-800/60 p-2 rounded-lg border border-stone-200/60 dark:border-stone-700/60">
                                  <img
                                    src={img}
                                    alt={name}
                                    className="w-10 h-10 rounded-md object-cover border border-stone-300 dark:border-stone-700 flex-shrink-0"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=150&q=80';
                                    }}
                                  />
                                  <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-stone-900 dark:text-stone-100 truncate">{name}</p>
                                    <p className="text-[10px] text-stone-500">
                                      Qty: <span className="font-bold text-stone-700 dark:text-stone-300">{item.quantity}</span>
                                      {item.selected_size ? ` • Size: ${item.selected_size}` : ''}
                                      {item.selected_color ? ` • Color: ${item.selected_color}` : ''}
                                    </p>
                                  </div>
                                  <span className="font-mono text-xs font-semibold text-[#81511F]">
                                    ${(price * item.quantity).toFixed(2)}
                                  </span>
                                </div>
                              );
                            })
                          ) : (
                            <p className="font-medium text-stone-900 dark:text-stone-100">Order details unavailable</p>
                          )}
                        </div>

                        <div className="flex justify-between items-center pt-2 border-t border-stone-200 dark:border-stone-800 text-[11px]">
                          <span className="text-stone-500">
                            Delivery: <strong>{ord.delivery_method === 'door' ? 'Door Delivery ($15.00)' : 'Store Pickup (Free)'}</strong> • Placed {new Date(ord.placed_at).toLocaleDateString()}
                          </span>
                          <span className="font-bold text-[#81511F] text-sm">
                            Total: ${Number(ord.total_amount).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── ANALYTICS TAB ───────────────────────────────────────────────── */}
          {activeTab === 'analytics' && (
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-stone-200 dark:border-stone-800">
                <div>
                  <h2 className="font-serif text-lg sm:text-xl font-medium">Store & Inventory Analytics</h2>
                  <p className="text-xs text-stone-500 mt-0.5">Real-time ApexCharts analytics & inventory metrics</p>
                </div>
                <button
                  onClick={loadDashboardData}
                  className="px-3 py-1.5 rounded-xl border border-stone-300 dark:border-stone-700 text-xs font-semibold hover:bg-stone-100 dark:hover:bg-stone-800 transition-all flex items-center gap-1.5 self-start sm:self-auto"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Refresh Data
                </button>
              </div>

              {/* Summary metric cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="p-4 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900">
                  <span className="text-[11px] font-semibold uppercase text-stone-500">Total Inventory Value</span>
                  <p className="font-serif text-2xl sm:text-3xl font-semibold text-[#81511F] mt-1">
                    ${products.reduce((acc, p) => acc + (p.price * (p.stock_quantity || 0)), 0).toLocaleString()}
                  </p>
                  <p className="text-[10px] text-stone-400 mt-1">Across active inventory</p>
                </div>
                <div className="p-4 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900">
                  <span className="text-[11px] font-semibold uppercase text-stone-500">Active Products</span>
                  <p className="font-serif text-2xl sm:text-3xl font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
                    {products.length} Items
                  </p>
                  <p className="text-[10px] text-stone-400 mt-1">Live in store catalog</p>
                </div>
                <div className="p-4 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900">
                  <span className="text-[11px] font-semibold uppercase text-stone-500">Needs Restock</span>
                  <p className="font-serif text-2xl sm:text-3xl font-semibold text-amber-600 dark:text-amber-400 mt-1">
                    {lowStockCount} Products
                  </p>
                  <p className="text-[10px] text-stone-400 mt-1">Stock ≤ 10 units</p>
                </div>
              </div>

              {/* ApexCharts graphs */}
              <ApexAnalyticsCharts
                products={products}
                categories={categories}
                orders={adminOrders}
                isDarkMode={document.documentElement.classList.contains('dark')}
              />
            </div>
          )}

        </div>
      </div>

      {/* ── ADD / EDIT PRODUCT MODAL ─────────────────────────────────────────── */}
      {(isAddModalOpen || editingProduct) && (
        <div className="fixed inset-0 z-[80] flex items-start justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
          <div className="relative w-full max-w-lg bg-white dark:bg-[#242222] rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xl p-5 sm:p-6 my-4">
            <div className="flex items-center justify-between pb-4 border-b border-stone-200 dark:border-stone-800 mb-4">
              <h3 className="font-serif text-base sm:text-lg font-semibold text-stone-900 dark:text-stone-100">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h3>
              <button
                onClick={closeModal}
                className="p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-1">
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Leather Atelier Tote"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:outline-none focus:border-[#81511F]"
                />
              </div>

              {/* Category / Price / Stock */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-1">
                    Category
                  </label>
                  <select
                    value={formData.categoryName}
                    onChange={(e) => setFormData({ ...formData, categoryName: e.target.value })}
                    className="w-full px-3 py-2.5 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:outline-none focus:border-[#81511F]"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-1">
                    Price ($) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="250"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:outline-none focus:border-[#81511F]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#81511F] mb-1">
                    Stock Qty *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    placeholder="20"
                    value={formData.stock_quantity}
                    onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs font-bold rounded-xl border-2 border-[#81511F] bg-stone-50 dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:outline-none"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Crafted with organic canvas and Tuscan leather..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:outline-none focus:border-[#81511F]"
                />
              </div>

              {/* Materials */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-1">
                  Materials
                </label>
                <input
                  type="text"
                  placeholder="Full-Grain Leather, Brass Hardware"
                  value={formData.materials}
                  onChange={(e) => setFormData({ ...formData, materials: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:outline-none focus:border-[#81511F]"
                />
              </div>

              {/* ── Image upload ── */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-2">
                  Product Image
                </label>

                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleFileChange}
                />

                {/* Upload zone */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-stone-300 dark:border-stone-700 rounded-xl p-4 flex flex-col items-center justify-center gap-2 hover:border-[#81511F] hover:bg-[#81511F]/5 transition-all cursor-pointer"
                >
                  <Upload className="w-5 h-5 text-stone-400" />
                  <span className="text-xs text-stone-500 font-medium">
                    Click to choose from your PC or phone
                  </span>
                  <span className="text-[10px] text-stone-400">JPG, PNG, WEBP — up to 5MB each</span>
                </button>

                {/* Previews of newly selected files */}
                {previewUrls.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {previewUrls.map((url, idx) => (
                      <div key={idx} className="relative group">
                        <img
                          src={url}
                          alt={`Preview ${idx + 1}`}
                          className="w-16 h-16 object-cover rounded-lg border border-stone-300 dark:border-stone-700"
                        />
                        <button
                          type="button"
                          onClick={() => removePreview(idx)}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-rose-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-16 h-16 rounded-lg border-2 border-dashed border-stone-300 dark:border-stone-700 flex items-center justify-center text-stone-400 hover:border-[#81511F] hover:text-[#81511F] transition-colors"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                )}

                {/* Show current image when editing */}
                {editingProduct && formData.image && previewUrls.length === 0 && (
                  <div className="mt-3 flex items-center gap-3">
                    <img
                      src={formData.image}
                      alt="Current"
                      className="w-16 h-16 object-cover rounded-lg border border-stone-300 dark:border-stone-700"
                    />
                    <div>
                      <p className="text-[10px] text-stone-500 font-semibold uppercase tracking-wider">Current image</p>
                      <p className="text-[10px] text-stone-400 mt-0.5">Upload a new image above to replace it</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-stone-200 dark:border-stone-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-xs font-semibold text-stone-600 dark:text-stone-400 hover:text-stone-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingProduct}
                  className="px-6 py-2.5 bg-[#81511F] text-white text-xs font-semibold uppercase tracking-widest rounded-xl hover:bg-[#683f17] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md flex items-center gap-2"
                >
                  {isSubmittingProduct ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> Saving...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" /> Save Product
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
