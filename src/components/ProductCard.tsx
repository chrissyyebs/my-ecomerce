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
    <div className="group flex flex-col cursor-pointer">
      {/* Image Container - Borderless with 8px radius */}
      <div className="relative aspect-[4/5] w-full overflow-hidden rounded bg-surface-subtle border border-border/40 transition-all duration-300">
        <img
          src={product.image}
          alt={product.name}
          className="h-full w-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
        />
        
        {/* Badge */}
        {product.isNew && (
          <span className="absolute top-3 left-3 bg-surface/90 backdrop-blur-sm text-on-surface text-[10px] tracking-widest uppercase font-semibold px-2.5 py-1 rounded-sm border border-border/60">
            Craft Addition
          </span>
        )}

        {/* Hover Actions overlay */}
        <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4 justify-between">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onQuickView(product);
            }}
            className="bg-surface/90 backdrop-blur-md text-on-surface hover:text-primary p-2.5 rounded shadow-luxury transition-all duration-200"
            title="Quick view"
          >
            <Eye className="w-4 h-4" />
          </button>
          
          <Button
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onAddToCart(product);
            }}
            className="flex items-center gap-1 bg-primary text-on-primary shadow-luxury"
          >
            <Plus className="w-3.5 h-3.5" /> Add to Cart
          </Button>
        </div>
      </div>

      {/* Stacked Details */}
      <div className="mt-4 text-center">
        <span className="text-[11px] font-sans uppercase tracking-[0.15em] text-on-surface-muted">
          {product.category}
        </span>
        <h3 className="font-serif text-lg font-medium text-on-surface mt-1 group-hover:text-primary transition-colors">
          {product.name}
        </h3>
        <p className="font-sans text-sm font-semibold text-primary mt-1">
          ${product.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </p>
      </div>
    </div>
  );
};
