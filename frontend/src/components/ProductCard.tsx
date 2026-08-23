import React from 'react';
import { Eye, Plus } from 'lucide-react';
import { Button } from './Button';

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  image: string;
  description: string;
  materials: string;
  isNew?: boolean;
}

interface ProductCardProps {
  product: Product;
  onQuickView: (product: Product) => void;
  onAddToCart: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onQuickView,
  onAddToCart,
}) => {
  return (
    <div
      onClick={() => onQuickView(product)}
      className="group flex flex-col cursor-pointer bg-surface/40 hover:bg-surface rounded-xl p-2 sm:p-3 border border-border/40 hover:border-primary/30 transition-all duration-300 shadow-sm hover:shadow-luxury"
    >
      {/* Image Container */}
      <div className="relative aspect-[4/3] sm:aspect-[4/5] w-full overflow-hidden rounded-lg bg-surface-subtle border border-border/30">
        <img
          src={product.image || 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=600&q=80'}
          alt={product.name}
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=600&q=80';
          }}
          className="h-full w-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
        />
        
        {/* Badge */}
        {product.isNew && (
          <span className="absolute top-2 left-2 bg-surface/90 backdrop-blur-sm text-on-surface text-[9px] sm:text-[10px] tracking-widest uppercase font-semibold px-2 py-0.5 rounded border border-border/60">
            New
          </span>
        )}

        <span className="absolute top-2 right-2 bg-surface/90 backdrop-blur-sm text-primary font-bold text-[10px] sm:text-xs px-2 py-0.5 rounded border border-border/50">
          GH₵{product.price}
        </span>

        {/* Hover Actions overlay */}
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-2.5 justify-between">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onQuickView(product);
            }}
            className="bg-surface/95 text-on-surface hover:text-primary p-2 rounded-lg shadow-md transition-all text-xs font-semibold flex items-center gap-1"
          >
            <Eye className="w-3.5 h-3.5" /> Quick View
          </button>
          
          <Button
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onAddToCart(product);
            }}
            className="flex items-center gap-1 bg-primary text-on-primary shadow-luxury text-xs py-1.5 px-3"
          >
            <Plus className="w-3.5 h-3.5" /> Add
          </Button>
        </div>
      </div>

      {/* Details */}
      <div className="mt-2.5 text-left px-1 flex flex-col flex-1 justify-between">
        <div>
          <span className="text-[10px] sm:text-[11px] font-sans uppercase tracking-wider text-on-surface-muted block truncate">
            {product.category}
          </span>
          <h3 className="font-serif text-xs sm:text-sm font-semibold text-on-surface mt-0.5 line-clamp-1 group-hover:text-primary transition-colors">
            {product.name}
          </h3>
        </div>

        {/* Mobile touch action bar */}
        <div className="mt-2 flex items-center justify-between sm:hidden pt-2 border-t border-border/30">
          <span className="font-sans text-xs font-bold text-primary">
            GH₵{product.price}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddToCart(product);
            }}
            className="px-2.5 py-1 bg-primary/10 hover:bg-primary text-primary hover:text-on-primary text-[10px] font-bold rounded-lg transition-colors flex items-center gap-1"
          >
            <Plus className="w-3 h-3" /> Add
          </button>
        </div>
      </div>
    </div>
  );
};
