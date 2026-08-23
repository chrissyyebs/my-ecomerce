import React, { useState, useEffect, useRef } from 'react';
import { Sun, Moon, ShoppingBag, Search, User, X, Menu, ArrowRight, Package, Sparkles, Plus } from 'lucide-react';
import type { ClientUser } from './ClientAuthModal';
import type { Product } from './ProductCard';

interface HeaderProps {
  darkMode: boolean;
  setDarkMode: (value: boolean) => void;
  cartCount: number;
  onOpenCart: () => void;
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  currentUser: ClientUser | null;
  onOpenClientAuth: () => void;
  onOpenOrders: () => void;
  products?: Product[];
  onAddToCart?: (product: Product) => void;
  onQuickView?: (product: Product) => void;
}

export const Header: React.FC<HeaderProps> = ({
  darkMode,
  setDarkMode,
  cartCount,
  onOpenCart,
  setSelectedCategory,
  currentUser,
  onOpenClientAuth,
  onOpenOrders,
  products = [],
  onAddToCart,
  onQuickView,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Focus search input when search modal opens
  useEffect(() => {
    if (isSearchModalOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [isSearchModalOpen]);

  // Close menu & search modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (mobileMenuOpen && menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMobileMenuOpen(false);
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isSearchModalOpen) {
        setIsSearchModalOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [mobileMenuOpen, isSearchModalOpen]);

  // Filter products by searchQuery (matching by name, category, or description)
  const searchResults = searchQuery.trim() === ''
    ? []
    : products.filter((p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase().trim())
      );

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setSelectedCategory('All');
      const catalogEl = document.getElementById('catalog');
      if (catalogEl) {
        catalogEl.scrollIntoView({ behavior: 'smooth' });
      }
      setIsSearchModalOpen(false);
      setMobileMenuOpen(false);
    }
  };

  return (
    <>
      <header ref={menuRef} className="sticky top-0 z-50 bg-surface/95 backdrop-blur-md border-b border-border/80 transition-colors duration-300">
        <nav className="flex justify-between items-center w-full px-4 sm:px-8 py-3 max-w-container-max mx-auto">

          {/* ── Brand Logo ─────────────────────────────────── */}
          <a href="#" className="flex items-center gap-2.5 group flex-shrink-0">
            <div className="w-8 h-8 rounded-lg bg-primary text-on-primary flex items-center justify-center font-bold text-xs tracking-tighter shadow-sm group-hover:scale-105 transition-transform">
              TTL
            </div>
            <span className="font-serif text-base sm:text-xl font-bold tracking-tight text-on-surface group-hover:text-primary transition-colors">
              THE TOTE LIFE
            </span>
          </a>

          {/* ── Desktop Nav Links ───────────────────────────────────────── */}
          <div className="hidden md:flex items-center gap-8 font-medium">
            <button
              onClick={() => {
                setSelectedCategory('All');
                document.getElementById('new-arrivals')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="text-xs uppercase tracking-[0.15em] text-on-surface-muted hover:text-primary transition-colors"
            >
              New Arrivals
            </button>
            <button
              onClick={() => {
                setSelectedCategory('All');
                document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="text-xs uppercase tracking-[0.15em] text-on-surface-muted hover:text-primary transition-colors"
            >
              Shop All
            </button>
            <button
              onClick={() => {
                setSelectedCategory('Bags');
                document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="text-xs uppercase tracking-[0.15em] text-on-surface-muted hover:text-primary transition-colors"
            >
              Bags
            </button>
            <button
              onClick={() => {
                setSelectedCategory('Furniture');
                document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="text-xs uppercase tracking-[0.15em] text-on-surface-muted hover:text-primary transition-colors"
            >
              Furniture
            </button>
            <button
              onClick={() => document.getElementById('philosophy')?.scrollIntoView({ behavior: 'smooth' })}
              className="text-xs uppercase tracking-[0.15em] text-on-surface-muted hover:text-primary transition-colors"
            >
              About
            </button>
          </div>

          {/* ── Right Actions ─────────────────────────────────────────────── */}
          <div className="flex items-center gap-2 sm:gap-3">

            {/* PC & Tablet Search Icon Button */}
            <button
              onClick={() => setIsSearchModalOpen(true)}
              className="p-2 text-on-surface-muted hover:text-primary transition-colors rounded-lg hover:bg-surface-subtle flex items-center gap-1.5"
              aria-label="Search catalog"
              title="Search Products by Name"
            >
              <Search className="w-4 h-4" />
              <span className="hidden lg:inline text-xs text-on-surface-muted font-medium">Search</span>
            </button>

            {/* Desktop Theme toggle */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="hidden md:flex p-2 text-on-surface-muted hover:text-primary transition-colors rounded-lg hover:bg-surface-subtle"
              title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle theme"
            >
              {darkMode ? <Sun className="w-4 h-4 text-primary" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Dedicated Prominent "My Orders" Button */}
            <button
              onClick={onOpenOrders}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary hover:text-on-primary transition-all text-xs font-semibold border border-primary/30"
              title="View & Track My Orders"
              aria-label="My Orders"
            >
              <Package className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">My Orders</span>
            </button>

            {/* Desktop Account */}
            <button
              onClick={onOpenClientAuth}
              className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full hover:bg-surface-subtle transition-colors text-on-surface border border-border/60"
              title={currentUser ? `Account: ${currentUser.name}` : 'Sign In'}
              aria-label="Client Account"
            >
              {currentUser ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-primary text-on-primary font-bold text-[10px] flex items-center justify-center shadow-sm">
                    {currentUser.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs font-medium max-w-[90px] truncate">
                    {currentUser.name.split(' ')[0]}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-xs font-medium text-on-surface-muted hover:text-primary">
                  <User className="w-4 h-4" />
                  <span>Account</span>
                </div>
              )}
            </button>

            {/* Cart Icon (Visible on Desktop & Mobile) */}
            <button
              onClick={onOpenCart}
              className="relative p-2 text-on-surface hover:text-primary transition-colors flex-shrink-0 rounded-lg hover:bg-surface-subtle"
              aria-label="Open Cart"
            >
              <ShoppingBag className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-primary text-on-primary text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold shadow-sm">
                  {cartCount}
                </span>
              )}
            </button>

            {/* Hamburger Menu Toggle (Mobile & Tablet) */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-on-surface hover:text-primary transition-colors flex-shrink-0 rounded-lg hover:bg-surface-subtle"
              aria-label="Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5 text-primary" /> : <Menu className="w-5 h-5" />}
            </button>

          </div>
        </nav>

        {/* ── Professional Hamburger Dropdown Menu ──────────────────────── */}
        {mobileMenuOpen && (
          <div className="bg-surface border-t border-border/80 px-4 sm:px-8 py-6 space-y-6 shadow-2xl animate-fade-in max-h-[85vh] overflow-y-auto">
            
            {/* Quick Search Bar inside menu */}
            <form onSubmit={handleSearchSubmit} className="relative">
              <input
                type="text"
                placeholder="Search totes, furniture, catalog by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-surface-subtle border border-border rounded-xl pl-10 pr-4 py-2.5 text-xs text-on-surface placeholder:text-on-surface-muted/60 focus:outline-none focus:border-primary transition-colors"
              />
              <Search className="w-4 h-4 text-on-surface-muted absolute left-3.5 top-3" />
            </form>

            {/* Quick Actions Bar (Account & Theme & Orders) */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  onOpenOrders();
                  setMobileMenuOpen(false);
                }}
                className="p-3 rounded-xl bg-primary/10 text-primary border border-primary/30 hover:bg-primary hover:text-on-primary transition-all text-xs font-semibold flex items-center gap-2"
              >
                <Package className="w-4 h-4" />
                <span>My Orders & Tracking</span>
              </button>

              <button
                onClick={() => {
                  onOpenClientAuth();
                  setMobileMenuOpen(false);
                }}
                className="p-3 rounded-xl bg-surface-subtle border border-border/80 text-on-surface hover:text-primary transition-all text-xs font-semibold flex items-center gap-2 truncate"
              >
                <User className="w-4 h-4" />
                <span className="truncate">{currentUser ? currentUser.name : 'Client Account'}</span>
              </button>
            </div>

            {/* Categorized Navigation Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              
              {/* Card 1: Shop */}
              <div className="p-4 rounded-xl bg-[#81511F] text-white space-y-3 shadow-md">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-widest font-bold opacity-90">Shop</span>
                  <Sparkles className="w-4 h-4 opacity-80" />
                </div>
                <div className="space-y-2 text-xs font-medium">
                  <button
                    onClick={() => {
                      setSelectedCategory('All');
                      document.getElementById('new-arrivals')?.scrollIntoView({ behavior: 'smooth' });
                      setMobileMenuOpen(false);
                    }}
                    className="w-full text-left flex items-center justify-between hover:underline py-1"
                  >
                    <span>New Arrivals</span>
                    <ArrowRight className="w-3.5 h-3.5 opacity-80" />
                  </button>
                  <button
                    onClick={() => {
                      setSelectedCategory('All');
                      document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' });
                      setMobileMenuOpen(false);
                    }}
                    className="w-full text-left flex items-center justify-between hover:underline py-1"
                  >
                    <span>Full Catalog</span>
                    <ArrowRight className="w-3.5 h-3.5 opacity-80" />
                  </button>
                </div>
              </div>

              {/* Card 2: Categories */}
              <div className="p-4 rounded-xl bg-stone-900 dark:bg-stone-800 text-white space-y-3 shadow-md">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-widest font-bold opacity-90">Categories</span>
                  <Package className="w-4 h-4 opacity-80" />
                </div>
                <div className="space-y-2 text-xs font-medium">
                  <button
                    onClick={() => {
                      setSelectedCategory('Bags');
                      document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' });
                      setMobileMenuOpen(false);
                    }}
                    className="w-full text-left flex items-center justify-between hover:underline py-1"
                  >
                    <span>Tote Bags</span>
                    <ArrowRight className="w-3.5 h-3.5 opacity-80" />
                  </button>
                  <button
                    onClick={() => {
                      setSelectedCategory('Furniture');
                      document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' });
                      setMobileMenuOpen(false);
                    }}
                    className="w-full text-left flex items-center justify-between hover:underline py-1"
                  >
                    <span>Studio Furniture</span>
                    <ArrowRight className="w-3.5 h-3.5 opacity-80" />
                  </button>
                </div>
              </div>

              {/* Card 3: Studio & About */}
              <div className="p-4 rounded-xl bg-stone-100 dark:bg-stone-900 border border-border text-on-surface space-y-3 shadow-md">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-widest font-bold text-primary">About Us</span>
                  <User className="w-4 h-4 text-primary" />
                </div>
                <div className="space-y-2 text-xs font-medium">
                  <button
                    onClick={() => {
                      document.getElementById('philosophy')?.scrollIntoView({ behavior: 'smooth' });
                      setMobileMenuOpen(false);
                    }}
                    className="w-full text-left flex items-center justify-between hover:text-primary py-1"
                  >
                    <span>Our Philosophy</span>
                    <ArrowRight className="w-3.5 h-3.5 text-primary" />
                  </button>
                  <button
                    onClick={() => {
                      onOpenOrders();
                      setMobileMenuOpen(false);
                    }}
                    className="w-full text-left flex items-center justify-between hover:text-primary py-1"
                  >
                    <span>Track My Orders</span>
                    <ArrowRight className="w-3.5 h-3.5 text-primary" />
                  </button>
                </div>
              </div>

            </div>

          </div>
        )}
      </header>

      {/* ── PC & Tablet Rich Search Overlay Modal ──────────────────────── */}
      {isSearchModalOpen && (
        <div className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm flex items-start justify-center pt-16 sm:pt-24 px-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-surface border border-border rounded-2xl shadow-luxury overflow-hidden flex flex-col">
            
            {/* Search Input Header */}
            <div className="p-4 border-b border-border flex items-center gap-3 bg-surface-subtle">
              <Search className="w-5 h-5 text-primary flex-shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search products by name (e.g. Atelier Leather Tote...)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent text-sm text-on-surface placeholder:text-on-surface-muted/60 focus:outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="p-1 text-on-surface-muted hover:text-on-surface rounded"
                  title="Clear"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => setIsSearchModalOpen(false)}
                className="px-3 py-1 rounded-lg border border-border text-xs font-semibold text-on-surface-muted hover:text-on-surface hover:bg-surface transition-colors"
              >
                Close (Esc)
              </button>
            </div>

            {/* Search Results List displaying product images */}
            <div className="p-4 max-h-[60vh] overflow-y-auto space-y-3">
              {searchQuery.trim() === '' ? (
                <div className="py-8 text-center text-xs text-on-surface-muted space-y-2">
                  <Search className="w-8 h-8 text-on-surface-muted/40 mx-auto" />
                  <p>Type a product name to search the catalog in real-time.</p>
                </div>
              ) : searchResults.length === 0 ? (
                <div className="py-8 text-center text-xs text-on-surface-muted">
                  No products found matching "<span className="text-on-surface font-semibold">{searchQuery}</span>".
                </div>
              ) : (
                <div className="space-y-2">
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-on-surface-muted">
                    Found {searchResults.length} {searchResults.length === 1 ? 'Product' : 'Products'}
                  </span>
                  {searchResults.map((prod) => (
                    <div
                      key={`search-res-${prod.id}`}
                      className="flex items-center gap-4 p-3 rounded-xl bg-surface-subtle hover:bg-border/40 border border-border/60 transition-all cursor-pointer group"
                      onClick={() => {
                        if (onQuickView) onQuickView(prod);
                        setIsSearchModalOpen(false);
                      }}
                    >
                      {/* Product Thumbnail Image */}
                      <img
                        src={prod.image || 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=200&q=80'}
                        alt={prod.name}
                        className="w-14 h-14 rounded-lg object-cover border border-border flex-shrink-0 group-hover:scale-105 transition-transform"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=200&q=80';
                        }}
                      />

                      {/* Product Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-primary/10 text-primary">
                            {prod.category}
                          </span>
                        </div>
                        <h4 className="font-serif text-sm font-semibold text-on-surface group-hover:text-primary transition-colors truncate mt-0.5">
                          {prod.name}
                        </h4>
                        <p className="text-xs text-on-surface-muted line-clamp-1 text-[11px] mt-0.5">
                          {prod.description}
                        </p>
                      </div>

                      {/* Price & Action */}
                      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                        <span className="font-bold text-sm text-primary">GH₵{prod.price}</span>
                        {onAddToCart && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onAddToCart(prod);
                            }}
                            className="px-2.5 py-1 bg-primary text-on-primary text-[10px] font-semibold uppercase tracking-wider rounded-lg shadow-sm hover:opacity-90 transition-opacity flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" /> Add
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      )}
    </>
  );
};
