import React, { useState } from 'react';
import { X, Search, ShoppingBag, Eye, Plus } from 'lucide-react';
import type { Product } from './ProductCard';

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  categoryName: string;
  categories: string[];
  products: Product[];
  onSelectCategory: (cat: string) => void;
  onQuickView: (product: Product) => void;
  onAddToCart: (product: Product) => void;
}

export const CategoryModal: React.FC<CategoryModalProps> = ({
  isOpen,
  onClose,
  categoryName,
  categories,
  products,
  onSelectCategory,
  onQuickView,
  onAddToCart,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState(categoryName);

  if (!isOpen) return null;

  const currentTab = activeTab || categoryName || 'All';

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.description.toLowerCase().includes(searchTerm.toLowerCase());

    if (currentTab === 'All') return matchesSearch;

    const prodCat = (
      typeof p.category === 'string'
        ? p.category
        : (p.category as any)?.name || (p as any).categoryName || ''
    ).trim().toLowerCase();

    const selected = currentTab.trim().toLowerCase();
    const matchesCat = prodCat === selected || prodCat.includes(selected) || selected.includes(prodCat);

    return matchesSearch && matchesCat;
  });

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/70 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-border/80 flex items-center justify-between bg-surface-subtle/50 flex-shrink-0">
          <div>
            <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.2em] text-primary block">
              Category Collection
            </span>
            <h2 className="font-serif text-xl sm:text-3xl font-medium text-on-surface mt-0.5">
              {currentTab === 'All' ? 'All Curated Products' : currentTab}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full border border-border text-on-surface-muted hover:text-on-surface hover:bg-surface transition-colors"
            aria-label="Close category modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Category Filter Tabs */}
        <div className="p-3 sm:p-5 border-b border-border/60 bg-surface flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between flex-shrink-0">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
            {categories.map((cat) => (
              <button
                key={`modal-cat-${cat}`}
                onClick={() => {
                  setActiveTab(cat);
                  onSelectCategory(cat);
                }}
                className={`px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider rounded-lg transition-all flex-shrink-0 ${
                  currentTab.toLowerCase() === cat.toLowerCase()
                    ? 'bg-primary text-on-primary shadow-luxury'
                    : 'bg-surface-subtle text-on-surface-muted hover:text-on-surface hover:bg-border/60'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search bar */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-on-surface-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search in category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-border bg-surface-subtle text-on-surface focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        {/* Product Grid Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          {filteredProducts.length === 0 ? (
            <div className="py-16 px-4 text-center">
              <ShoppingBag className="w-12 h-12 mx-auto text-on-surface-muted/50 mb-3" />
              <h3 className="font-serif text-lg font-medium text-on-surface mb-1">
                No items matching your criteria
              </h3>
              <p className="text-xs text-on-surface-muted max-w-sm mx-auto mb-4">
                Try selecting a different category tab or clear your search term.
              </p>
              <button
                onClick={() => {
                  setActiveTab('All');
                  setSearchTerm('');
                }}
                className="px-4 py-2 text-xs font-semibold uppercase tracking-wider bg-primary text-on-primary rounded-lg shadow-luxury"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
              {filteredProducts.map((product) => (
                <div
                  key={`modal-prod-${product.id}`}
                  onClick={() => onQuickView(product)}
                  className="group flex flex-col cursor-pointer bg-surface/50 hover:bg-surface rounded-xl p-2 sm:p-3 border border-border/50 hover:border-primary/40 transition-all shadow-sm hover:shadow-luxury"
                >
                  <div className="relative aspect-[4/3] sm:aspect-[4/5] w-full overflow-hidden rounded-lg bg-surface-subtle">
                    <img
                      src={product.image || 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=600&q=80'}
                      alt={product.name}
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <span className="absolute top-1.5 right-1.5 bg-surface/90 text-primary font-bold text-[10px] px-2 py-0.5 rounded">
                      ${product.price}
                    </span>
                  </div>

                  <div className="mt-2 flex flex-col flex-1 justify-between">
                    <div>
                      <span className="text-[9px] uppercase tracking-wider text-on-surface-muted block truncate">
                        {product.category}
                      </span>
                      <h4 className="font-serif text-xs font-semibold text-on-surface mt-0.5 line-clamp-1 group-hover:text-primary transition-colors">
                        {product.name}
                      </h4>
                    </div>

                    <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-border/30">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onQuickView(product);
                        }}
                        className="p-1.5 rounded text-on-surface-muted hover:text-primary transition-colors"
                        title="View details"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddToCart(product);
                        }}
                        className="px-2.5 py-1 bg-primary text-on-primary text-[10px] font-semibold rounded-lg shadow-sm hover:bg-primary-hover transition-colors flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> Add
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-border/60 bg-surface-subtle/50 flex justify-between items-center text-xs text-on-surface-muted flex-shrink-0">
          <span>Showing {filteredProducts.length} items</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-surface border border-border text-on-surface font-semibold rounded-lg hover:bg-surface-subtle transition-colors"
          >
            Close View
          </button>
        </div>

      </div>
    </div>
  );
};
