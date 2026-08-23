import React from 'react';
import { X, ShoppingBag, ShieldCheck, Sparkles } from 'lucide-react';
import type { Product } from './ProductCard';
import { Button } from './Button';

interface QuickViewModalProps {
  product: Product | null;
  onClose: () => void;
  onAddToCart: (product: Product) => void;
}

export const QuickViewModal: React.FC<QuickViewModalProps> = ({
  product,
  onClose,
  onAddToCart,
}) => {
  if (!product) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full sm:max-w-3xl bg-surface sm:rounded-xl border-0 sm:border sm:border-border shadow-luxury overflow-hidden flex flex-col max-h-[95vh] sm:max-h-[85vh]">

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 p-1.5 text-on-surface-muted hover:text-on-surface rounded-full bg-surface/80 backdrop-blur-sm transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2">

            {/* Product Image — clamped height on mobile so content is visible */}
            <div className="relative h-56 sm:h-auto sm:min-h-[360px] bg-surface-subtle">
              <img
                src={product.image || 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=600&q=80'}
                alt={product.name}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=600&q=80';
                }}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Content */}
            <div className="p-5 sm:p-7 flex flex-col">
              <div>
                <span className="text-[10px] sm:text-xs uppercase tracking-[0.2em] text-primary font-semibold">
                  {product.category}
                </span>
                <h2 className="font-serif text-xl sm:text-2xl md:text-3xl text-on-surface font-medium mt-1">
                  {product.name}
                </h2>
                <p className="text-lg sm:text-xl font-sans font-semibold text-primary mt-2">
                  GH₵{product.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>

                <div className="border-t border-border my-4 sm:my-5"></div>

                <p className="text-xs sm:text-sm text-on-surface-muted leading-relaxed font-sans">
                  {product.description}
                </p>

                <div className="mt-4 sm:mt-5 space-y-2">
                  <div className="flex items-center gap-2 text-[11px] sm:text-xs text-on-surface-muted">
                    <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary flex-shrink-0" />
                    <span><strong className="text-on-surface font-medium">Materials:</strong> {product.materials}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] sm:text-xs text-on-surface-muted">
                    <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary flex-shrink-0" />
                    <span>Handcrafted with Lifetime Stitch Guarantee</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sticky add-to-cart footer */}
        <div className="sticky bottom-0 bg-surface border-t border-border p-4 sm:px-7">
          <Button
            variant="primary"
            size="lg"
            className="w-full flex items-center justify-center gap-2 py-3 text-xs sm:text-sm"
            onClick={() => {
              onAddToCart(product);
              onClose();
            }}
          >
            <ShoppingBag className="w-4 h-4" /> Add to Order
          </Button>
        </div>
      </div>
    </div>
  );
};
