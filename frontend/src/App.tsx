import { useState, useEffect, useRef, useCallback } from 'react';
import { Header } from './components/Header';
import { ProductCard, type Product } from './components/ProductCard';
import { QuickViewModal } from './components/QuickViewModal';
import { CartDrawer } from './components/CartDrawer';
import { CheckoutModal } from './components/CheckoutModal';
import { ToastContainer, type ToastData } from './components/Toast';
import { Button } from './components/Button';
import { CategoryModal } from './components/CategoryModal';
import {
  ArrowRight, Star, Package, Clock, ExternalLink, Plus
} from 'lucide-react';

const HERO_BAG = "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=1200&q=80";
const HERO_FURNITURE = "https://images.unsplash.com/photo-1538688525198-9b88f6f53126?auto=format&fit=crop&w=1200&q=80";
const ARTISAN_IMAGE = "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=1000&q=80";

// ─── Default product catalog (empty initial state — no static mock images) ──────
const DEFAULT_PRODUCTS: Product[] = [];
const DEFAULT_CATEGORY_NAMES = ['Bags', 'Furniture'];

// Read admin-managed products from localStorage (filtering out old mock IDs 1..6)
function loadProductsFromStorage(): Product[] {
  try {
    const raw = localStorage.getItem('ttl_admin_products');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const filtered = parsed.filter(
          (p: any) => p.is_active !== false && !['1', '2', '3', '4', '5', '6'].includes(String(p.id))
        );
        return filtered.map((p: any) => ({
          id: p.id,
          name: p.name,
          category: (typeof p.category === 'string' ? p.category : p.category?.name) || p.categoryName || 'General',
          price: p.price,
          image: p.image || p.images?.[0]?.public_url || '',
          description: p.description || '',
          materials: Array.isArray(p.materials) ? p.materials.join(', ') : p.materials || '',
          isNew: p.isNew || false,
        }));
      }
    }
  } catch { /* ignore */ }
  return DEFAULT_PRODUCTS;
}

// Read admin-managed categories from localStorage
function loadCategoriesFromStorage(): string[] {
  try {
    const raw = localStorage.getItem('ttl_admin_categories');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((c: any) => c.name as string);
      }
    }
  } catch { /* ignore */ }
  return DEFAULT_CATEGORY_NAMES;
}

import { AdminPortal } from './components/AdminPortal';
import { ClientAuthModal, type ClientUser, type ClientOrder } from './components/ClientAuthModal';
import { SupportChatWidget } from './components/SupportChatWidget';
import { NotFoundPage } from './components/NotFoundPage';

export function App() {
  // ── Dynamic data from DB / Admin portal ─────────────────────────────────
  const [storefrontProducts, setStorefrontProducts] = useState<Product[]>(loadProductsFromStorage);
  const [adminCategoryNames, setAdminCategoryNames] = useState<string[]>(loadCategoriesFromStorage);

  const refreshFromStorage = useCallback(() => {
    setStorefrontProducts(loadProductsFromStorage());
    setAdminCategoryNames(loadCategoriesFromStorage());
  }, []);

  const fetchLiveProductsAndCategories = useCallback(async () => {
    try {
      const [pRes, cRes] = await Promise.all([
        fetch('/api/products'),
        fetch('/api/categories'),
      ]);

      if (pRes.ok) {
        const pData = await pRes.json();
        if (Array.isArray(pData.products)) {
          const mapped: Product[] = pData.products.map((p: any) => ({
            id: p.id,
            name: p.name,
            category: p.categoryName || p.category?.name || 'Bags',
            price: p.price,
            image: p.image || p.images?.[0]?.public_url || '',
            description: p.description || '',
            materials: Array.isArray(p.materials) ? p.materials.join(', ') : p.materials || '',
            isNew: false,
          }));
          setStorefrontProducts(mapped);
          // Store with categoryName preserved so loadProductsFromStorage can read it
          const toCache = pData.products.map((p: any) => ({
            ...p,
            categoryName: p.categoryName || p.category?.name || 'Bags',
          }));
          try { localStorage.setItem('ttl_admin_products', JSON.stringify(toCache)); } catch {}
        }
      }

      if (cRes.ok) {
        const cData = await cRes.json();
        if (Array.isArray(cData.categories) && cData.categories.length > 0) {
          const catNames = cData.categories.map((c: any) => c.name);
          setAdminCategoryNames(catNames);
          try { localStorage.setItem('ttl_admin_categories', JSON.stringify(cData.categories)); } catch {}
        }
      }
    } catch {
      refreshFromStorage();
    }
  }, [refreshFromStorage]);

  useEffect(() => {
    fetchLiveProductsAndCategories();

    const handleCatalogUpdate = () => fetchLiveProductsAndCategories();
    const handleStorageChange = () => fetchLiveProductsAndCategories();

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('ttl_catalog_updated', handleCatalogUpdate);

    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel('ttl_catalog_broadcast');
      bc.onmessage = () => {
        fetchLiveProductsAndCategories();
      };
    } catch {}

    const interval = setInterval(fetchLiveProductsAndCategories, 3000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('ttl_catalog_updated', handleCatalogUpdate);
      if (bc) bc.close();
      clearInterval(interval);
    };
  }, [fetchLiveProductsAndCategories]);

  // ── rest of App state ───────────────────────────────────────────────────────
  const [darkMode, setDarkMode] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isClientAuthOpen, setIsClientAuthOpen] = useState(false);
  const [clientAuthTab, setClientAuthTab] = useState<'signin' | 'signup' | 'verify_otp' | 'forgot_password' | 'reset_password' | 'account' | 'orders'>('signin');

  // ── 30-Second Auto-Rotate Carousel State ─────────────────────────────
  const [carouselCategory, setCarouselCategory] = useState<string>('All');
  const [carouselTimeLeft, setCarouselTimeLeft] = useState<number>(30);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [modalCategory, setModalCategory] = useState<string>('All');

  // Auto-rotate category carousel every 30 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCarouselTimeLeft((prev) => {
        if (prev <= 1) {
          setCarouselCategory((current) => {
            const allCats = ['All', ...adminCategoryNames];
            const currentIndex = allCats.findIndex(
              (c) => c.toLowerCase() === current.toLowerCase()
            );
            const nextIndex = (currentIndex + 1) % allCats.length;
            return allCats[nextIndex];
          });
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [adminCategoryNames]);
  
  const [currentUser, setCurrentUser] = useState<ClientUser | null>(() => {
    try {
      const saved = localStorage.getItem('ttl_client_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [userOrders, setUserOrders] = useState<ClientOrder[]>(() => {
    try {
      const saved = localStorage.getItem('ttl_client_orders');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [cart, setCart] = useState<{ id: string; name: string; category: string; price: number; image: string; description: string; materials: string; quantity: number }[]>([]);
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleLoginUser = (user: ClientUser) => {
    setCurrentUser(user);
    try {
      localStorage.setItem('ttl_client_user', JSON.stringify(user));
    } catch (e) {
      console.warn('Failed saving client user session:', e);
    }
  };

  const handleLogoutUser = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem('ttl_client_user');
    } catch (e) {
      console.warn('Failed clearing client user session:', e);
    }
  };

  const handleOrderCreated = (order: ClientOrder) => {
    setUserOrders(prev => {
      const next = [order, ...prev];
      try {
        localStorage.setItem('ttl_client_orders', JSON.stringify(next));
      } catch (e) {
        console.warn('Failed saving client orders:', e);
      }
      return next;
    });
  };

  // Route tracking state
  const [currentPathState, setCurrentPathState] = useState(window.location.pathname);

  useEffect(() => {
    const handlePopState = () => setCurrentPathState(window.location.pathname);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Check if current URL path matches the secret admin slug or unknown path
  const currentPath = currentPathState.replace(/^\/+|\/+$/g, '');
  const adminSlug = (import.meta.env.VITE_ADMIN_SLUG || 's4cogknoehrs').replace(/^\/+|\/+$/g, '');
  const isAdminRoute = currentPath === adminSlug || currentPath === 's4cogknoehrs';

  if (isAdminRoute) {
    return <AdminPortal />;
  }

  if (currentPath !== '') {
    return (
      <NotFoundPage
        onGoHome={() => {
          window.history.pushState({}, '', '/');
          setCurrentPathState('/');
        }}
      />
    );
  }

  // Apply dark mode class to html element
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Build category filter tabs from admin-set categories
  const categories = ['All', ...adminCategoryNames];

  const filteredProducts = selectedCategory === 'All'
    ? storefrontProducts
    : storefrontProducts.filter((p) => {
        if (!p.category) return false;
        const prodCat = (
          typeof p.category === 'string'
            ? p.category
            : (p.category as any)?.name || (p as any).categoryName || ''
        ).trim().toLowerCase();

        const selected = selectedCategory.trim().toLowerCase();
        return prodCat === selected || prodCat.includes(selected) || selected.includes(prodCat);
      });

  const carouselProducts = carouselCategory === 'All'
    ? storefrontProducts
    : storefrontProducts.filter((p) => {
        if (!p.category) return false;
        const prodCat = (
          typeof p.category === 'string'
            ? p.category
            : (p.category as any)?.name || (p as any).categoryName || ''
        ).trim().toLowerCase();

        const selected = carouselCategory.trim().toLowerCase();
        return prodCat === selected || prodCat.includes(selected) || selected.includes(prodCat);
      });

  const handleAddToCart = (product: Product) => {
    // Gate: require sign-in before adding to cart
    if (!currentUser) {
      setIsClientAuthOpen(true);
      return;
    }

    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
    
    // Add toast notification
    const newToast: ToastData = {
      id: Date.now(),
      message: product.name,
      image: product.image,
    };
    setToasts(prev => [...prev, newToast]);
  };

  const handleDismissToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const handleRemoveFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const handleUpdateQuantity = (id: string, qty: number) => {
    setCart(prev => prev.map(item => item.id === id ? { ...item, quantity: qty } : item));
  };

  return (
    <div className="min-h-screen bg-bg text-on-surface transition-colors duration-300">
      <ToastContainer toasts={toasts} onDismiss={handleDismissToast} />

      {/* Navigation Header */}
      <Header
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        cartCount={cart.reduce((a, c) => a + c.quantity, 0)}
        onOpenCart={() => setIsCartOpen(true)}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        currentUser={currentUser}
        onOpenClientAuth={() => {
          setClientAuthTab(currentUser ? 'account' : 'signin');
          setIsClientAuthOpen(true);
        }}
        onOpenOrders={() => {
          setClientAuthTab(currentUser ? 'orders' : 'signin');
          setIsClientAuthOpen(true);
        }}
        products={storefrontProducts}
        onAddToCart={handleAddToCart}
        onQuickView={setQuickViewProduct}
      />

      {/* Hero Section: Asymmetrical Editorial Layout */}
      <section className="relative bg-[#FAF7F2] dark:bg-surface overflow-hidden py-8 sm:py-16 px-4 sm:px-8 md:px-16 border-b border-border/40">
        
        {/* Mobile Hero (Screen < md) */}
        <div className="md:hidden relative rounded-2xl overflow-hidden shadow-luxury border border-border/60 aspect-[4/5] flex flex-col justify-end p-6 text-white bg-black">
          <img
            src={HERO_BAG}
            alt="Curated Leather Tote"
            className="absolute inset-0 w-full h-full object-cover opacity-75"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=800&q=80";
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent"></div>

          <div className="relative z-10 space-y-3">
            <span className="inline-block px-3 py-1 bg-[#81511F] text-white text-[10px] uppercase font-bold tracking-widest rounded-full shadow-md">
              Slow Living Archive
            </span>
            <h1 className="font-serif text-3xl font-medium leading-tight text-white">
              Curated <br />
              <span className="italic font-light text-[#FAB97E]">Carriers & Objects.</span>
            </h1>
            <p className="text-xs text-stone-300 font-sans leading-relaxed line-clamp-2">
              Heavyweight organic duck canvas trimmed with vegetable-tanned Italian bridle leather.
            </p>
            <div className="pt-2 flex items-center gap-2">
              <button
                onClick={() => document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' })}
                className="flex-1 bg-[#81511F] text-white py-3 rounded-xl text-xs font-semibold uppercase tracking-wider text-center shadow-lg active:scale-95 transition-transform"
              >
                Shop Catalog
              </button>
              <button
                onClick={() => {
                  setModalCategory('All');
                  setIsCategoryModalOpen(true);
                }}
                className="px-4 py-3 bg-white/20 backdrop-blur-md border border-white/30 text-white rounded-xl text-xs font-semibold uppercase tracking-wider text-center"
              >
                View All
              </button>
            </div>
          </div>
        </div>

        {/* Desktop/Tablet Hero (Screen >= md) */}
        <div className="hidden md:grid max-w-container-max w-full mx-auto grid-cols-12 gap-8 items-center">
          {/* Left: Curated Carriers */}
          <div className="col-span-12 md:col-span-7 relative z-20">
            <div className="relative group">
              <div className="aspect-[4/5] md:aspect-[3/4] overflow-hidden rounded-2xl shadow-luxury relative border border-border/60">
                <img
                  src={HERO_BAG}
                  alt="Curated Leather Tote"
                  className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=1000&q=80";
                  }}
                />
              </div>

              {/* Floating Text Overlay */}
              <div className="absolute -bottom-8 -right-4 md:-right-16 md:bottom-16 z-30 max-w-md bg-surface/90 backdrop-blur-md p-6 rounded-xl border border-border/80 shadow-luxury">
                <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl font-normal leading-none tracking-tight text-on-surface">
                  <span>Curated</span> <br />
                  <span className="text-primary italic font-light">Carriers.</span>
                </h1>
                <p className="text-xs text-on-surface-muted mt-3 font-sans leading-relaxed">
                  Heavyweight organic duck canvas trimmed with vegetable-tanned Italian bridle leather.
                </p>
                <div className="mt-6 flex items-center gap-4">
                  <button
                    onClick={() => {
                      setSelectedCategory('Bags');
                      document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="bg-primary text-on-primary px-8 py-3.5 rounded-full text-xs font-semibold uppercase tracking-widest hover:opacity-90 transition-all shadow-luxury"
                  >
                    Shop Collection
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Modern Living */}
          <div className="col-span-12 md:col-span-4 md:col-start-9 relative z-10">
            <div className="group">
              <div className="aspect-square md:aspect-[4/5] overflow-hidden rounded-xl shadow-luxury border-4 border-surface relative mb-6">
                <img
                  src={HERO_FURNITURE}
                  alt="Modern Living Armchair"
                  className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1538688525198-9b88f6f53126?auto=format&fit=crop&w=800&q=80";
                  }}
                />
              </div>
              <div className="space-y-3">
                <h2 className="font-serif text-2xl font-medium text-on-surface flex items-center gap-3">
                  Modern Living
                  <span className="h-px flex-1 bg-border"></span>
                </h2>
                <p className="font-sans text-xs text-on-surface-muted leading-relaxed">
                  Sculptural objects designed to harmonize with your most intimate spaces.
                </p>
                <button
                  onClick={() => {
                    setModalCategory('All');
                    setIsCategoryModalOpen(true);
                  }}
                  className="inline-block border border-on-surface text-on-surface px-6 py-2.5 rounded-full text-[10px] font-semibold tracking-widest uppercase hover:bg-on-surface hover:text-bg transition-all"
                >
                  Explore All Categories
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Dynamic Category Feature Section */}
      {adminCategoryNames.length > 0 && (
      <section className="py-16 sm:py-20 px-4 sm:px-6 max-w-container-max mx-auto border-b border-border/50" id="categories">
        {/* Section header */}
        <div className="text-center mb-10 sm:mb-14">
          <span className="text-[10px] sm:text-xs uppercase tracking-[0.25em] text-primary font-bold">
            Browse By Category
          </span>
          <h2 className="font-serif text-2xl sm:text-4xl font-medium text-on-surface mt-2">
            Shop Our Collections
          </h2>
        </div>

        <div className={`grid gap-4 sm:gap-6 ${
          adminCategoryNames.length === 1
            ? 'grid-cols-1 max-w-2xl mx-auto'
            : adminCategoryNames.length === 2
              ? 'grid-cols-1 sm:grid-cols-2'
              : adminCategoryNames.length === 3
                ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
                : 'grid-cols-2 lg:grid-cols-4'
        }`}>
          {adminCategoryNames.map((catName) => {
            // Find the first product with an image in this category to use as cover
            const catProducts = storefrontProducts.filter((p) => {
              const prodCat = (
                typeof p.category === 'string'
                  ? p.category
                  : (p.category as any)?.name || ''
              ).trim().toLowerCase();
              return prodCat === catName.trim().toLowerCase();
            });
            const coverImage = catProducts.find((p) => p.image)?.image || '';
            const productCount = catProducts.length;

            return (
              <div
                key={`cat-feature-${catName}`}
                onClick={() => {
                  setModalCategory(catName);
                  setIsCategoryModalOpen(true);
                }}
                className="group cursor-pointer relative"
              >
                <div className={`relative overflow-hidden rounded-2xl border border-border/60 shadow-luxury ${
                  adminCategoryNames.length <= 2 ? 'aspect-[16/9] sm:aspect-[3/2]' : 'aspect-[4/3] sm:aspect-[16/10]'
                }`}>
                  {coverImage ? (
                    <img
                      src={coverImage || 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=600&q=80'}
                      alt={catName}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=600&q=80';
                      }}
                      className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary/10 via-surface-subtle to-primary/5 flex items-center justify-center">
                      <span className="font-serif text-4xl text-primary/20 font-bold">{catName.charAt(0)}</span>
                    </div>
                  )}

                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent group-hover:from-black/60 group-hover:via-black/10 transition-all duration-500"></div>

                  {/* Text overlay on image */}
                  <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5 flex flex-col items-start">
                    {productCount > 0 && (
                      <span className="text-[9px] sm:text-[10px] uppercase tracking-[0.2em] text-white/70 font-semibold mb-1">
                        {productCount} {productCount === 1 ? 'Item' : 'Items'}
                      </span>
                    )}
                    <h3 className="font-serif text-lg sm:text-xl lg:text-2xl font-medium text-white leading-tight">
                      {catName}
                    </h3>
                    <span className="mt-2 inline-flex items-center gap-1.5 text-[10px] sm:text-xs uppercase tracking-widest text-white/90 font-semibold border-b border-white/40 pb-0.5 group-hover:border-white group-hover:text-white transition-all">
                      Explore Collection <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
      )}

      {/* New Arrivals: 30-Second Auto-Rotating Category Carousel */}
      <section className="bg-surface-subtle py-16 sm:py-20 border-b border-border/60 overflow-hidden" id="new-arrivals">
        <div className="px-4 sm:px-6 max-w-container-max mx-auto mb-6 sm:mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] sm:text-xs uppercase tracking-[0.2em] text-primary font-bold">
                Latest Additions
              </span>
              <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                <Clock className="w-3 h-3 animate-spin" /> Next in {carouselTimeLeft}s
              </span>
            </div>

            <h2 className="font-serif text-2xl sm:text-3xl font-medium text-on-surface">
              The New Essentials
            </h2>

            {/* 30s Progress Bar */}
            <div className="w-48 h-1 bg-border/60 rounded-full mt-2 overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-1000 ease-linear"
                style={{ width: `${(carouselTimeLeft / 30) * 100}%` }}
              ></div>
            </div>
          </div>

          {/* Category Tabs for Carousel */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
            {['All', ...adminCategoryNames].map((cat) => (
              <button
                key={`carousel-tab-${cat}`}
                onClick={() => {
                  setCarouselCategory(cat);
                  setCarouselTimeLeft(30);
                }}
                className={`px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider rounded-lg transition-all flex-shrink-0 ${
                  carouselCategory.toLowerCase() === cat.toLowerCase()
                    ? 'bg-primary text-on-primary shadow-luxury'
                    : 'bg-surface text-on-surface-muted hover:text-on-surface'
                }`}
              >
                {cat}
              </button>
            ))}

            <button
              onClick={() => {
                setModalCategory(carouselCategory);
                setIsCategoryModalOpen(true);
              }}
              className="px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider rounded-lg border border-primary text-primary hover:bg-primary hover:text-on-primary transition-colors flex items-center gap-1 flex-shrink-0 ml-2"
            >
              View All <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Carousel Products */}
        <div
          ref={scrollRef}
          className="flex overflow-x-auto no-scrollbar space-x-3 sm:space-x-5 px-4 sm:px-6 max-w-container-max mx-auto pb-4 scroll-smooth"
        >
          {carouselProducts.length === 0 ? (
            <div className="w-full py-12 text-center text-xs text-on-surface-muted bg-surface/50 rounded-xl border border-border/50">
              No products found in "{carouselCategory}". Switching to next category...
            </div>
          ) : (
            carouselProducts.map((product) => (
              <div
                key={`carousel-${product.id}`}
                className="min-w-[170px] w-[170px] sm:min-w-[240px] sm:w-[240px] group flex-shrink-0 cursor-pointer bg-surface p-2.5 rounded-xl border border-border/60 shadow-sm hover:shadow-luxury transition-all"
                onClick={() => setQuickViewProduct(product)}
              >
                <div className="relative aspect-[4/3] sm:aspect-[4/5] rounded-lg overflow-hidden mb-2.5 bg-surface-subtle border border-border/30">
                  <img
                    src={product.image || 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=600&q=80'}
                    alt={product.name}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=600&q=80';
                    }}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <span className="absolute top-2 left-2 bg-surface/90 backdrop-blur-md px-2 py-0.5 rounded text-[9px] uppercase font-semibold tracking-wider text-on-surface border border-border/50">
                    {product.category}
                  </span>
                </div>
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-serif text-xs sm:text-sm font-semibold text-on-surface group-hover:text-primary transition-colors line-clamp-1">
                      {product.name}
                    </h4>
                    <p className="text-xs font-bold text-primary mt-0.5">${product.price}</p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddToCart(product);
                    }}
                    className="p-1.5 text-on-surface-muted hover:text-primary transition-colors"
                    title="Add to Cart"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Brand Story & Philosophy */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 max-w-container-max mx-auto border-b border-border/50" id="philosophy">
        <div className="flex flex-col md:flex-row items-center gap-8 sm:gap-12">
          <div className="w-full md:w-1/2">
            <div className="relative rounded-2xl overflow-hidden aspect-[4/3] border border-border shadow-luxury">
              <img
                src={ARTISAN_IMAGE}
                alt="Artisan Leather Crafting"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=800&q=80";
                }}
              />
            </div>
          </div>
          <div className="w-full md:w-1/2 md:pl-6">
            <span className="text-xs uppercase tracking-[0.2em] text-primary font-semibold">
              Our Philosophy
            </span>
            <h2 className="font-serif text-3xl sm:text-5xl font-medium text-on-surface mt-3 mb-5 leading-tight">
              Pieces that Stay.
            </h2>
            <p className="font-sans text-xs sm:text-sm md:text-base text-on-surface-muted mb-5 leading-relaxed">
              We believe in the enduring beauty of things made well. Our collection is a curated dialogue between artisanal leatherwork and sculptural furniture—items designed to age with grace and carry the stories of your daily life.
            </p>
            <p className="font-serif italic text-sm sm:text-base text-on-surface mb-6 border-l-2 border-primary pl-4 py-1">
              "Luxury isn't about the price, it's about the precision of the process and the purity of the material."
            </p>
            <a
              href="#catalog"
              className="inline-flex items-center gap-3 font-semibold text-xs uppercase tracking-widest text-on-surface hover:text-primary transition-colors group"
            >
              <span className="border-b border-on-surface group-hover:border-primary pb-0.5">Learn about our makers</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </a>
          </div>
        </div>
      </section>

      {/* Main Catalog Grid: Responsive 2-column mobile layout */}
      <section id="catalog" className="px-4 sm:px-6 py-16 sm:py-20 max-w-container-max mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 sm:mb-12 gap-4">
          <div>
            <h2 className="font-serif text-2xl sm:text-3xl font-medium text-on-surface">Curated Collection</h2>
            <p className="text-xs uppercase tracking-widest text-on-surface-muted mt-1">
              Hand-finished in small studio batches
            </p>
          </div>

          {/* Category Filter Tabs */}
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 text-[11px] sm:text-xs font-semibold uppercase tracking-wider rounded-lg transition-all duration-200 ${
                  selectedCategory.toLowerCase() === cat.toLowerCase()
                    ? 'bg-primary text-on-primary shadow-luxury'
                    : 'bg-surface-subtle text-on-surface-muted hover:text-on-surface hover:bg-border/60'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Product Grid: 2 columns on mobile, 3-4 on desktop */}
        {filteredProducts.length === 0 ? (
          <div className="py-16 px-6 text-center bg-surface-subtle/50 rounded-2xl border border-border/80 max-w-xl mx-auto shadow-luxury">
            <Package className="w-12 h-12 mx-auto text-on-surface-muted/50 mb-3" />
            <h3 className="font-serif text-lg font-medium text-on-surface mb-1">
              No products in "{selectedCategory}" yet
            </h3>
            <p className="text-xs text-on-surface-muted max-w-md mx-auto mb-5 leading-relaxed">
              We haven't added any items to this category yet. Browse our full catalog or check back soon!
            </p>
            <button
              onClick={() => setSelectedCategory('All')}
              className="px-5 py-2.5 text-xs font-semibold uppercase tracking-widest bg-primary text-on-primary rounded shadow-luxury hover:bg-primary-hover transition-colors"
            >
              Show All Products
            </button>
          </div>
        ) : (
          <div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
              {filteredProducts.slice(0, 8).map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onQuickView={setQuickViewProduct}
                  onAddToCart={handleAddToCart}
                />
              ))}
            </div>

            {/* View All Products button to prevent endless mobile scrolling */}
            <div className="mt-10 text-center">
              <button
                onClick={() => {
                  setModalCategory(selectedCategory);
                  setIsCategoryModalOpen(true);
                }}
                className="px-8 py-3.5 bg-surface border-2 border-primary/40 hover:border-primary text-on-surface hover:bg-primary hover:text-on-primary text-xs font-semibold uppercase tracking-widest rounded-xl transition-all shadow-md inline-flex items-center gap-2"
              >
                <ExternalLink className="w-4 h-4" /> View All ({filteredProducts.length} Items)
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-surface-subtle px-6 border-y border-border/80">
        <div className="max-w-container-max mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
            <div className="space-y-4 p-6 bg-surface rounded-xl border border-border shadow-luxury">
              <div className="flex justify-center text-primary gap-1">
                {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-primary text-primary" />)}
              </div>
              <blockquote className="font-serif italic text-sm text-on-surface leading-relaxed">
                "The attention to detail in the Signature Tote is unparalleled. It's the only bag I've ever owned that feels like it will last a lifetime."
              </blockquote>
              <cite className="block text-[11px] uppercase tracking-widest text-on-surface-muted not-italic font-semibold">— ALYSSA V.</cite>
            </div>

            <div className="space-y-4 p-6 bg-surface rounded-xl border border-border shadow-luxury">
              <div className="flex justify-center text-primary gap-1">
                {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-primary text-primary" />)}
              </div>
              <blockquote className="font-serif italic text-sm text-on-surface leading-relaxed">
                "Our dining table from The Tote Life is more than furniture; it's a centerpiece of calm in our home. Truly worth the wait."
              </blockquote>
              <cite className="block text-[11px] uppercase tracking-widest text-on-surface-muted not-italic font-semibold">— MARCUS R.</cite>
            </div>

            <div className="space-y-4 p-6 bg-surface rounded-xl border border-border shadow-luxury">
              <div className="flex justify-center text-primary gap-1">
                {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-primary text-primary" />)}
              </div>
              <blockquote className="font-serif italic text-sm text-on-surface leading-relaxed">
                "Minimalism done right. The textures are rich, the service was impeccable, and the curation is just perfect."
              </blockquote>
              <cite className="block text-[11px] uppercase tracking-widest text-on-surface-muted not-italic font-semibold">— ELIZA L.</cite>
            </div>
          </div>
        </div>
      </section>

      {/* Newsletter Section */}
      <section className="py-20 px-6 bg-surface">
        <div className="max-w-xl mx-auto text-center">
          <h2 className="font-serif text-3xl font-medium text-on-surface mb-3">Stay in the Life.</h2>
          <p className="font-sans text-xs text-on-surface-muted mb-8">
            Join our community for early access to new collections and stories about slow living.
          </p>
          <form onSubmit={(e) => e.preventDefault()} className="flex flex-col sm:flex-row gap-3">
            <input
              type="email"
              placeholder="Email address"
              className="flex-1 bg-surface-subtle border border-border rounded-lg px-4 py-3 text-xs text-on-surface focus:outline-none focus:border-primary"
            />
            <Button variant="primary" size="md" className="uppercase tracking-widest font-semibold text-xs">
              Subscribe
            </Button>
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-16 border-t border-border bg-bg text-on-surface-muted">
        <div className="max-w-container-max mx-auto grid grid-cols-1 md:grid-cols-12 gap-12">
          <div className="md:col-span-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary text-on-primary flex items-center justify-center font-bold text-xs tracking-tighter shadow-sm">
                TTL
              </div>
              <h3 className="font-serif text-2xl text-on-surface font-semibold tracking-tight">THE TOTE LIFE</h3>
            </div>
            <p className="text-xs text-on-surface-muted leading-relaxed max-w-sm">
              Curated carriers and furniture designed for a life lived with intent.
            </p>
          </div>
          <div className="md:col-span-3 space-y-2 text-xs">
            <h4 className="font-sans font-semibold text-on-surface uppercase tracking-wider mb-3">Navigation</h4>
            <p onClick={() => setSelectedCategory('Bags')} className="hover:text-primary cursor-pointer">Bags & Totes</p>
            <p onClick={() => setSelectedCategory('Furniture')} className="hover:text-primary cursor-pointer">Studio Furniture</p>
            <p onClick={() => setSelectedCategory('All')} className="hover:text-primary cursor-pointer">New Arrivals</p>
          </div>
          <div className="md:col-span-4 space-y-3">
            <h4 className="font-sans font-semibold text-on-surface uppercase tracking-wider">Studio Assistance</h4>
            <p className="text-xs">Shipping & Returns • Studio FAQ • Custom Commissions</p>
            <p className="text-[11px] text-on-surface-muted mt-4">© 2026 The Tote Life. Made for living.</p>
          </div>
        </div>
      </footer>

      {/* Modals & Drawers */}
      <CategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        categoryName={modalCategory}
        categories={categories}
        products={storefrontProducts}
        onSelectCategory={(cat) => setSelectedCategory(cat)}
        onQuickView={setQuickViewProduct}
        onAddToCart={handleAddToCart}
      />

      <QuickViewModal
        product={quickViewProduct}
        onClose={() => setQuickViewProduct(null)}
        onAddToCart={handleAddToCart}
      />

      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        onRemove={handleRemoveFromCart}
        onUpdateQuantity={handleUpdateQuantity}
        onCheckout={() => setIsCheckoutOpen(true)}
      />

      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        cart={cart}
        onClearCart={() => setCart([])}
        currentUser={currentUser}
        onOrderCreated={handleOrderCreated}
      />

      <ClientAuthModal
        isOpen={isClientAuthOpen}
        onClose={() => setIsClientAuthOpen(false)}
        currentUser={currentUser}
        onLogin={handleLoginUser}
        onLogout={handleLogoutUser}
        userOrders={userOrders}
        initialTab={clientAuthTab}
      />

      {/* Floating Customer Support & Telegram Bot Chat */}
      <SupportChatWidget currentUser={currentUser} />
    </div>
  );
}

export default App;
