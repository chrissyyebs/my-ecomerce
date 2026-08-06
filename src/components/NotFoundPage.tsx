import React from 'react';
import { Home, ArrowLeft, PackageSearch } from 'lucide-react';
import { Button } from './Button';

export const NotFoundPage: React.FC<{ onGoHome?: () => void }> = ({ onGoHome }) => {
  return (
    <div className="min-h-screen bg-bg text-on-surface flex items-center justify-center p-6 transition-colors duration-300">
      <div className="max-w-md w-full text-center space-y-6 bg-surface border border-border p-8 sm:p-10 rounded-2xl shadow-luxury">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary mx-auto flex items-center justify-center border border-primary/20">
          <PackageSearch className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <span className="text-xs uppercase tracking-[0.25em] text-primary font-bold">
            404 — Page Not Found
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl font-medium text-on-surface">
            Lost in the Life.
          </h1>
          <p className="text-xs sm:text-sm text-on-surface-muted leading-relaxed pt-1">
            The page or catalog section you are looking for does not exist or has been moved.
          </p>
        </div>

        <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            variant="primary"
            size="md"
            onClick={() => {
              if (onGoHome) {
                onGoHome();
              } else {
                window.location.href = '/';
              }
            }}
            className="w-full sm:w-auto uppercase tracking-widest text-xs font-semibold flex items-center justify-center gap-2 py-3 px-6"
          >
            <Home className="w-4 h-4" /> Return to Storefront
          </Button>
          <button
            onClick={() => window.history.back()}
            className="w-full sm:w-auto text-xs uppercase tracking-widest font-semibold px-5 py-3 rounded-xl border border-border text-on-surface hover:bg-surface-subtle transition-colors flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Go Back
          </button>
        </div>
      </div>
    </div>
  );
};
