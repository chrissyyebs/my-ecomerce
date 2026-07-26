import React from 'react';
import { Sun, Moon, ShoppingBag, Search, Menu, User } from 'lucide-react';

interface HeaderProps {
  darkMode: boolean;
  setDarkMode: (value: boolean) => void;
  cartCount: number;
  onOpenCart: () => void;
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  darkMode,
  setDarkMode,
  cartCount,
  onOpenCart,
  selectedCategory,
  setSelectedCategory,
}) => {
  const STITCH_LOGO = "https://lh3.googleusercontent.com/aida-public/AB6AXuCXXcbzQ0R9jh4Mzxa1hzu1P6q86oIvgVFH_aoCHIZSz3FTMnfhQ1Xw1-vCN7LEvLD7Jji12nY7vruqGiwOqbHNiG7qF3W0wPxFCK3YNGJuSCm-IJbeB8-MwEhFnuv8iZylW9G3HtaTFeaK8bxpqJe2m0E8fLkoVAT4LP7UXxU3g1GmP-g1nuhb_7cddw_QQDVNHwC_uX6kNN_xXLTK2FaZdFXFbdTHGI7lv8upalbq0EM57sYcFGwkeWFi-qdt8MZ7PSCbLQTRYg4";

  return (
    <header className="sticky top-0 z-50 bg-surface/95 backdrop-blur-md border-b border-border/80 transition-colors duration-300">
      <nav className="flex justify-between items-center w-full px-4 sm:px-8 py-3 max-w-container-max mx-auto">
        {/* Left Navigation (Split Layout) */}
        <div className="hidden md:flex items-center space-x-8">
          <button
            onClick={() => {
              setSelectedCategory('Bags');
              document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' });
            }}
            className={`text-xs font-semibold uppercase tracking-[0.15em] transition-colors duration-300 pb-0.5 ${
              selectedCategory === 'Bags'
                ? 'text-primary border-b-2 border-primary'
                : 'text-on-surface-muted hover:text-primary'
            }`}
          >
            Bags
          </button>
          <button
            onClick={() => {
              setSelectedCategory('Furniture');
              document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' });
            }}
            className={`text-xs font-semibold uppercase tracking-[0.15em] transition-colors duration-300 pb-0.5 ${
              selectedCategory === 'Furniture'
                ? 'text-primary border-b-2 border-primary'
                : 'text-on-surface-muted hover:text-primary'
            }`}
          >
            Furniture
          </button>
        </div>

        {/* Mobile Menu Icon */}
        <button 
          onClick={() => {
            const catalog = document.getElementById('catalog');
            catalog?.scrollIntoView({ behavior: 'smooth' });
          }}
          className="md:hidden text-on-surface p-2"
          aria-label="Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Centered Brand Logo */}
        <a href="#" className="flex flex-col items-center group">
          <img
            src={STITCH_LOGO}
            alt="The Tote Life Logo"
            className="h-10 sm:h-12 w-auto object-contain transition-transform group-hover:scale-105"
            onError={(e) => {
              // Fallback text logo if external image fails
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
          <span className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-on-surface group-hover:text-primary transition-colors">
            THE TOTE LIFE
          </span>
        </a>

        {/* Right Navigation & Icons */}
        <div className="flex items-center space-x-4 sm:space-x-6">
          <div className="hidden lg:flex items-center space-x-6 mr-2">
            <button
              onClick={() => {
                setSelectedCategory('All');
                document.getElementById('new-arrivals')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="text-xs font-semibold uppercase tracking-[0.15em] text-on-surface-muted hover:text-primary transition-colors"
            >
              New Arrivals
            </button>
            <button
              onClick={() => document.getElementById('philosophy')?.scrollIntoView({ behavior: 'smooth' })}
              className="text-xs font-semibold uppercase tracking-[0.15em] text-on-surface-muted hover:text-primary transition-colors"
            >
              About
            </button>
          </div>

          <div className="flex items-center space-x-3 sm:space-x-4">
            <button
              onClick={() => document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' })}
              className="p-1.5 text-on-surface-muted hover:text-primary transition-colors"
              aria-label="Search catalog"
            >
              <Search className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-1.5 text-on-surface-muted hover:text-primary transition-colors"
              title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
              aria-label="Toggle theme"
            >
              {darkMode ? <Sun className="w-4 h-4 sm:w-5 sm:h-5 text-primary" /> : <Moon className="w-4 h-4 sm:w-5 sm:h-5" />}
            </button>

            <button
              onClick={onOpenCart}
              className="relative p-1.5 text-on-surface-muted hover:text-primary transition-colors"
              aria-label="Open Cart"
            >
              <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary text-on-primary text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </nav>
    </header>
  );
};;
