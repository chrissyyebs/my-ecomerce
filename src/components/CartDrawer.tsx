import React from 'react';
import { X, Trash2, ArrowRight } from 'lucide-react';
import type { Product } from './ProductCard';
import { Button } from './Button';

interface CartItem extends Product {
  quantity: number;
}

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  onRemove: (id: string) => void;
  onUpdateQuantity: (id: string, qty: number) => void;
  onCheckout: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  cart,
  onRemove,
  onUpdateQuantity,
  onCheckout,
}) => {
  if (!isOpen) return null;

  const total = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-surface border-l border-border shadow-luxury flex flex-col justify-between">
          {/* Header */}
          <div className="p-6 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="font-serif text-xl font-medium text-on-surface">Your Shopping Bag</h2>
              <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-primary-container text-on-surface">
                {cart.reduce((a, c) => a + c.quantity, 0)}
              </span>
            </div>
            <button 
              onClick={onClose}
              className="p-2 text-on-surface-muted hover:text-on-surface rounded-full"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Cart List */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {cart.length === 0 ? (
              <div className="text-center py-16 text-on-surface-muted">
                <p className="font-serif text-lg">Your bag is empty.</p>
                <p className="text-xs uppercase tracking-wider mt-2">Explore our minimalist carry collection.</p>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.id} className="flex gap-4 border-b border-border/40 pb-4">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-20 h-24 object-cover rounded bg-surface-subtle"
                  />
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start">
                        <h4 className="font-serif text-sm font-medium text-on-surface">{item.name}</h4>
                        <button
                          onClick={() => onRemove(item.id)}
                          className="text-on-surface-muted hover:text-error transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-xs text-on-surface-muted mt-0.5">{item.category}</p>
                    </div>

                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center border border-border rounded">
                        <button
                          onClick={() => onUpdateQuantity(item.id, Math.max(1, item.quantity - 1))}
                          className="px-2 py-0.5 text-xs text-on-surface hover:bg-surface-subtle"
                        >
                          -
                        </button>
                        <span className="px-2 text-xs font-mono">{item.quantity}</span>
                        <button
                          onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                          className="px-2 py-0.5 text-xs text-on-surface hover:bg-surface-subtle"
                        >
                          +
                        </button>
                      </div>
                      <span className="font-sans text-sm font-semibold text-primary">
                        ${(item.price * item.quantity).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer Subtotal */}
          {cart.length > 0 && (
            <div className="p-6 border-t border-border bg-surface-subtle/50 space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="font-sans text-on-surface-muted">Subtotal (Taxes included)</span>
                <span className="font-sans font-bold text-lg text-primary">
                  ${total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <p className="text-[11px] text-on-surface-muted">
                Free carbon-neutral shipping on all boutique tote orders.
              </p>
              <Button 
                variant="primary" 
                size="lg" 
                onClick={() => {
                  onClose();
                  onCheckout();
                }}
                className="w-full flex items-center justify-center gap-2"
              >
                Proceed to Checkout <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
