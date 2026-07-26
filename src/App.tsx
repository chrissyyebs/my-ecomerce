import { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { ProductCard, type Product } from './components/ProductCard';
import { QuickViewModal } from './components/QuickViewModal';
import { CartDrawer } from './components/CartDrawer';
import { CheckoutModal } from './components/CheckoutModal';
import { ToastContainer, type ToastData } from './components/Toast';
import { Button } from './components/Button';
import { 
  Palette, Layers, Compass, ChevronLeft, ChevronRight, 
  ArrowRight, Star, Heart
} from 'lucide-react';

const STITCH_HERO_BAG = "https://lh3.googleusercontent.com/aida-public/AB6AXuBzAQ20vvQbhgoaQOkl8HUKRLgkTIm86O1WVyfd68NXXDb0z2CGxyXTY2WBzlx_hHg7h-GM0sRhuvlE-s9EIDRwOcVIfcT49ZEzfhD7bqV1wG4kABQW7HieHuqnBfolOpXIq6AwAiJ-EMPXgl6tG6f3Dz9QAN3FcbbBFqCiH6GKc_84qgt39QjpP_OYpoHjh022WbxasVMuv-TlMgv6bxaKYebapiaMAVQBZqSx32Ww1Siwxt1Eytl0fzlCwWPaSjmo2cnZ1QZpkEs";
const STITCH_HERO_FURNITURE = "https://lh3.googleusercontent.com/aida-public/AB6AXuC8Ddz93QQgfSVZs_X64wMHImc3tRjUXorI1UHYh8z_6glYrk5BIM3WO7a81vLlutIQemD0Q3QHdr275xWgs6o4862g6Zzz8FzFgLGni-O-o4ZpaJbc4ctL1WrlG1Ry6d1DTn9zk6PQf02hh201v3AynZB8yJtsHld2Tn9x275DnDgKkrIcRqnCXrNOW8nlmzpVJ1hKnkWz68HoL27BkvRLfCiIf6Qz7LwgKJfsUJHwupKmkrObSJPzUENTHHvXhO6r8WfiE2H13HQ";
const STITCH_CAT_BAGS = "https://lh3.googleusercontent.com/aida-public/AB6AXuC8z4I9XTpgQ95q-PEfotlD_jHq1c8u9P0OvF4qsUN6pxCNt5U4Utbs9L2oeVfFrhhb3KEO-PtgRPYJuzTtdKiG0hAokh88Vvf0hFiuN5YuQIwnFwFYiHduKZIOIwAFjVJxFQtcot39ADDPVhifd3Sb3Mf8u0yAYF-CWsOdPShCs93iFh1SUnP8Jrd6Nz3KPu-d_-rzmYjbCAA6Dt9V1bGq49b6WjQkjJDxxKMX5O-Gigb7VzICy4yIGx8bpf11a0rrqhEs6hlNP0Y";
const STITCH_CAT_FURNITURE = "https://lh3.googleusercontent.com/aida-public/AB6AXuAE4nmUNB1THKPrErgPjr8ZODRWKguZZRTROk6zvhBVTGX2D6-P-XWsHviwFrgITGWJPZHI4-Zhc0VZt1mRCcXrBat8vEWcuOYNIEgeP9b891jXVEQU_-gm4Bxp3vfXQTsMdPJADBLoXQA6D-YIEVnHuNSswyH0NAWLzVOU6NFgBcPEZWfkRxl0smzbFZyaedcmaAc6t2CHnLrCOWt36rISLRGJFI3VbXic9klGBPUkykWTH1RBltr_GKdBogrJVIEb9n2Lh2xPASk";
const STITCH_ARTISAN = "https://lh3.googleusercontent.com/aida-public/AB6AXuANO4AeA4EFU36vBgI2rAlJL3oBR31jMpfXLKdy0q_miDf9Phpt1qemb-aauXmfYGiudf4EOXAkw7Nv0iIaJJNrhiHjlWyQDqz9FnRX1IdNQDU3ZlJMgGnECseV85jT4vPuoI0_wzhg23EbbhwABeqbIE4ekLwNyRFMI5jKZ_yAwfbunJMjA97fkCeJC1q6bV40H8ch8RNKTGoKUaktjVC8oWR5k9EcfCGx6071xtPLuUz-u2EEalh_GhySY-bc-3xMrx9GfIZLvjY";
const STITCH_LOGO = "https://lh3.googleusercontent.com/aida-public/AB6AXuCXXcbzQ0R9jh4Mzxa1hzu1P6q86oIvgVFH_aoCHIZSz3FTMnfhQ1Xw1-vCN7LEvLD7Jji12nY7vruqGiwOqbHNiG7qF3W0wPxFCK3YNGJuSCm-IJbeB8-MwEhFnuv8iZylW9G3HtaTFeaK8bxpqJe2m0E8fLkoVAT4LP7UXxU3g1GmP-g1nuhb_7cddw_QQDVNHwC_uX6kNN_xXLTK2FaZdFXFbdTHGI7lv8upalbq0EM57sYcFGwkeWFi-qdt8MZ7PSCbLQTRYg4";

const PRODUCTS: Product[] = [
  {
    id: '1',
    name: 'The Signature Tote',
    category: 'Bags',
    price: 450,
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuANoUoLN3Fu6jB7Ifj_x1e6bTrIor5bGCoGvDe9ioyZxyWEtVO5T65BzsumRxBQ1itrq0exuNNWxnL61UIyeZkA9ymYV4glVBp4WA0XlutrbP0W1S2suO93sdSEIhZp51E_r_5tIyWPDuq1D1XqLZekDToxL0kL2pEpav2uCfl9g-oiOj-r6UdiHdHPCNmx_Dz15YEshW7lSmUe776IaumcZvZuCRUIYXyjEl5hqm5ROmkrVu_jiO6hLqdkZ7vj6mSkWAD-gkd6WvU',
    description: 'Heavyweight organic cotton duck canvas trimmed with vegetable-tanned Italian bridle leather. Designed for everyday utility with quiet elegance.',
    materials: '18oz Organic Canvas, Tuscan Leather, Brass Hardware',
    isNew: true,
  },
  {
    id: '2',
    name: 'Ash Wood Stool',
    category: 'Furniture',
    price: 320,
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB4d0sOenKFy9_-xUqrhaFbj8yCGueyaa7BElzu7BPsMCUue4D_pweq_B6vgrgSz7vS2c8EtzvEM8xRmRHX6iJfwUnp5w5LmrgOdTH-mXRQjy0B_NHZd7IoPP0dpRfcXJY4nqDz-tcZNf2y3xLOfaxaWOcV7C9ErPdhUpZF1seA--sXDidoacPVkJDLA95CEWd0lH8oGU01HV7McjKe-NZZ5-T-4F7NOwm-a_4WlrVoMYJAusYKOB78HtCMofwrIV1X-Q7cJLlzJZI',
    description: 'A sculptural handcrafted wooden stool made from light ash wood with exposed mortise and tenon joinery.',
    materials: 'Solid Light Ash Wood, Natural Wax Finish',
    isNew: true,
  },
  {
    id: '3',
    name: 'Tech Sleeve II',
    category: 'Bags',
    price: 180,
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAoOR2RUPNzXiUoPWGs_4pMGz-9VyaKL8kh0c10YV_BNQ4o68zc8WJMuSHWh1D0C4cqTZwkR4xicu6RDDnI1boI5qioXppHsD88Exch35JPIc7TUmMRs4JwYzZeto5Kh2L81Oz_7lgQYlRpbrV8AxkZFwV3R1UcaaK5EfPSEmqLqI6XGXBT30sqWsiS7PVXOdC6Vkk4E8goQnI-0eRkaOYq6kFQUUySEpC2Vped2-sX-6z6SGxC9xQaaIS4mELBQedrB-TdsRuRfhk',
    description: 'A luxury leather laptop sleeve in a deep olive green tone designed for 14"-16" devices.',
    materials: 'Full-Grain Bovine Leather, Microfiber Interior',
  },
  {
    id: '4',
    name: 'Serene Floor Lamp',
    category: 'Furniture',
    price: 610,
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA8nAq8FtFjXawcdd_prutLyleVJe4QR73tmO4wW1ru5IclCL3PoGnouAI-PUnJwUmZokKwCGyh4MB8RiGJ2N_U8bPliPdU_-UsAYLtY3kKVmBqQc-4kHHJZKgB2v9hbQMtbo1M1jDjJ7O7GVQTkQ-JWCW5GZsaBVI0EoijJN6JLzsL0g9ACpVMdQK5E9qr0EA_Qc7DRxM9FgH3o-bWaI-Ep70wt6pk4h2zBkDpcMxRnet8y9TkkN-xz5GOJCkWc-eLVRpaJyi7Qs8',
    description: 'A minimalist floor lamp with a slender matte black stem and warm ambient LED glow.',
    materials: 'Anodized Aluminium, Frosted Glass Diffuser',
    isNew: true,
  },
  {
    id: '5',
    name: 'Atelier Canvas Carry-All',
    category: 'Bags',
    price: 240,
    image: 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=800&q=80',
    description: 'Heavyweight organic cotton duck canvas trimmed with vegetable-tanned Italian bridle leather.',
    materials: '18oz Organic Canvas, Tuscan Leather',
  },
  {
    id: '6',
    name: 'Architectural Oak Bench',
    category: 'Furniture',
    price: 850,
    image: 'https://images.unsplash.com/photo-1538688525198-9b88f6f53126?auto=format&fit=crop&w=800&q=80',
    description: 'Minimalist entry bench crafted from solid European white oak featuring exposed joinery.',
    materials: 'Solid European White Oak',
  },
];

export function App() {
  const [darkMode, setDarkMode] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [cart, setCart] = useState<{ id: string; name: string; category: string; price: number; image: string; description: string; materials: string; quantity: number }[]>([]);
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Apply dark mode class to html element
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const categories = ['All', 'Bags', 'Furniture'];

  const filteredProducts = selectedCategory === 'All' 
    ? PRODUCTS 
    : PRODUCTS.filter(p => p.category === selectedCategory);

  const handleAddToCart = (product: Product) => {
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

  const handleDismissToast = (id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const handleRemoveFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const handleUpdateQuantity = (id: string, qty: number) => {
    setCart(prev => prev.map(item => item.id === id ? { ...item, quantity: qty } : item));
  };

  const scrollCarousel = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const amount = direction === 'left' ? -260 : 260;
      scrollRef.current.scrollBy({ left: amount, behavior: 'smooth' });
    }
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
      />

      {/* Hero Section: Asymmetrical Editorial Layout */}
      <section className="relative min-h-[85vh] flex flex-col justify-center bg-[#FAF7F2] dark:bg-surface overflow-hidden py-16 px-6 md:px-16 border-b border-border/40">
        <div className="max-w-container-max w-full mx-auto grid grid-cols-12 gap-8 items-center">
          
          {/* Left: Curated Carriers (Dominant Side) */}
          <div className="col-span-12 md:col-span-7 relative z-20">
            <div className="relative group">
              <div className="aspect-[4/5] md:aspect-[3/4] overflow-hidden rounded-2xl shadow-luxury relative border border-border/60">
                <img
                  src={STITCH_HERO_BAG}
                  alt="Curated Leather Tote"
                  className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=1000&q=80";
                  }}
                />
              </div>

              {/* Floating Text Overlay */}
              <div className="absolute -bottom-8 -right-4 md:-right-16 md:bottom-16 z-30 max-w-md bg-surface/80 backdrop-blur-md p-6 rounded-xl border border-border/80 shadow-luxury">
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
                    Shop Bags
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Modern Living (Secondary Side) */}
          <div className="col-span-12 md:col-span-4 md:col-start-9 mt-16 md:mt-0 relative z-10">
            <div className="group">
              <div className="aspect-square md:aspect-[4/5] overflow-hidden rounded-xl shadow-luxury border-4 border-surface relative mb-6">
                <img
                  src={STITCH_HERO_FURNITURE}
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
                    setSelectedCategory('Furniture');
                    document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="inline-block border border-on-surface text-on-surface px-6 py-2.5 rounded-full text-[10px] font-semibold tracking-widest uppercase hover:bg-on-surface hover:text-bg transition-all"
                >
                  Shop Furniture
                </button>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Category Feature Section */}
      <section className="py-20 px-6 max-w-container-max mx-auto border-b border-border/50" id="categories">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Bags Feature Card */}
          <div 
            onClick={() => {
              setSelectedCategory('Bags');
              document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="group cursor-pointer"
          >
            <div className="relative overflow-hidden rounded-xl aspect-[4/5] border border-border shadow-luxury">
              <img
                src={STITCH_CAT_BAGS}
                alt="Bags for the Journey"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=800&q=80";
                }}
              />
              <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-all"></div>
            </div>
            <div className="mt-6 text-center">
              <h3 className="font-serif text-2xl font-medium text-on-surface">Bags for the Journey</h3>
              <span className="text-xs uppercase tracking-widest text-primary border-b border-primary/40 pb-0.5 mt-1 inline-block">
                Discover Collection
              </span>
            </div>
          </div>

          {/* Furniture Feature Card */}
          <div 
            onClick={() => {
              setSelectedCategory('Furniture');
              document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="group cursor-pointer"
          >
            <div className="relative overflow-hidden rounded-xl aspect-[4/5] border border-border shadow-luxury">
              <img
                src={STITCH_CAT_FURNITURE}
                alt="Objects of Purpose"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1584589167171-541ce45f1eea?auto=format&fit=crop&w=800&q=80";
                }}
              />
              <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-all"></div>
            </div>
            <div className="mt-6 text-center">
              <h3 className="font-serif text-2xl font-medium text-on-surface">Objects of Purpose</h3>
              <span className="text-xs uppercase tracking-widest text-primary border-b border-primary/40 pb-0.5 mt-1 inline-block">
                Explore Furniture
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* New Arrivals: Horizontal Scroll Carousel */}
      <section className="bg-surface-subtle py-16 sm:py-20 border-b border-border/60 overflow-hidden" id="new-arrivals">
        <div className="px-4 sm:px-6 max-w-container-max mx-auto mb-8 sm:mb-10 flex justify-between items-end">
          <div>
            <span className="text-[10px] sm:text-xs uppercase tracking-[0.2em] text-on-surface-muted font-semibold">
              Latest Additions
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl font-medium text-on-surface mt-1 sm:mt-2">
              The New Essentials
            </h2>
          </div>
          <div className="flex space-x-2 sm:space-x-3">
            <button
              onClick={() => scrollCarousel('left')}
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border border-border flex items-center justify-center bg-surface hover:bg-primary hover:text-on-primary transition-all shadow-sm"
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <button
              onClick={() => scrollCarousel('right')}
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border border-border flex items-center justify-center bg-surface hover:bg-primary hover:text-on-primary transition-all shadow-sm"
              aria-label="Scroll right"
            >
              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        <div
          ref={scrollRef}
          className="flex overflow-x-auto no-scrollbar space-x-4 sm:space-x-6 px-4 sm:px-6 max-w-container-max mx-auto pb-4 scroll-smooth"
        >
          {PRODUCTS.map((product) => (
            <div
              key={`carousel-${product.id}`}
              className="min-w-[200px] w-[200px] sm:min-w-[300px] sm:w-[300px] group flex-shrink-0 cursor-pointer"
              onClick={() => setQuickViewProduct(product)}
            >
              <div className="relative aspect-square rounded-xl overflow-hidden mb-3 sm:mb-4 bg-surface border border-border shadow-luxury">
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <span className="absolute top-2.5 left-2.5 sm:top-3 sm:left-3 bg-surface/90 backdrop-blur-md px-2 py-0.5 sm:px-2.5 sm:py-1 rounded text-[9px] sm:text-[10px] uppercase font-semibold tracking-wider text-on-surface border border-border/50">
                  {product.category}
                </span>
              </div>
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-serif text-sm sm:text-lg font-medium text-on-surface group-hover:text-primary transition-colors line-clamp-1">
                    {product.name}
                  </h4>
                  <p className="text-xs font-semibold text-primary mt-0.5 sm:mt-1">${product.price}</p>
                </div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddToCart(product);
                  }}
                  className="p-1.5 sm:p-2 text-on-surface-muted hover:text-primary transition-colors"
                >
                  <Heart className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Brand Story & Philosophy */}
      <section className="py-24 px-6 max-w-container-max mx-auto border-b border-border/50" id="philosophy">
        <div className="flex flex-col md:flex-row items-center gap-12">
          <div className="w-full md:w-1/2">
            <div className="relative rounded-2xl overflow-hidden aspect-[4/3] border border-border shadow-luxury">
              <img
                src={STITCH_ARTISAN}
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
            <h2 className="font-serif text-4xl sm:text-5xl font-medium text-on-surface mt-4 mb-6 leading-tight">
              Pieces that Stay.
            </h2>
            <p className="font-sans text-sm md:text-base text-on-surface-muted mb-6 leading-relaxed">
              We believe in the enduring beauty of things made well. Our collection is a curated dialogue between artisanal leatherwork and sculptural furniture—items designed to age with grace and carry the stories of your daily life.
            </p>
            <p className="font-serif italic text-base text-on-surface mb-8 border-l-2 border-primary pl-4 py-1">
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

      {/* Main Catalog Grid */}
      <section id="catalog" className="px-6 py-20 max-w-container-max mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <div>
            <h2 className="font-serif text-3xl font-medium text-on-surface">Curated Collection</h2>
            <p className="text-xs uppercase tracking-widest text-on-surface-muted mt-1">
              Hand-finished in small studio batches
            </p>
          </div>

          {/* Category Filter Tabs */}
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-5 py-2 text-xs font-semibold uppercase tracking-wider rounded transition-all duration-200 ${
                  selectedCategory === cat
                    ? 'bg-primary text-on-primary shadow-luxury'
                    : 'bg-surface-subtle text-on-surface-muted hover:text-on-surface hover:bg-border/60'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12">
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onQuickView={setQuickViewProduct}
              onAddToCart={handleAddToCart}
            />
          ))}
        </div>
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

      {/* Stitch Design System Token Showcase Section */}
      <section className="px-6 py-20 bg-bg border-b border-border/80">
        <div className="max-w-container-max mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs uppercase tracking-[0.2em] text-primary font-semibold flex items-center justify-center gap-1.5">
              <Palette className="w-4 h-4" /> Stitch Design DNA Tokens
            </span>
            <h2 className="font-serif text-3xl text-on-surface font-medium mt-2">
              System Architecture & Tokens
            </h2>
            <p className="text-xs text-on-surface-muted mt-2">
              Extracted directly from Stitch project <code className="bg-surface px-2 py-1 rounded border border-border">projects/2762622212420337914</code>
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-surface p-6 rounded-lg border border-border shadow-luxury">
              <div className="flex items-center gap-2 text-primary mb-4">
                <Palette className="w-5 h-5" />
                <h3 className="font-serif text-lg font-medium text-on-surface">Color Palette</h3>
              </div>
              <div className="space-y-3 text-xs font-mono">
                <div className="flex items-center justify-between p-2 rounded bg-bg">
                  <span>Surface (Light)</span>
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full border border-border" style={{ backgroundColor: '#FAF7F2' }}></span>
                    <code>#FAF7F2</code>
                  </div>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-bg">
                  <span>Primary Accent</span>
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full" style={{ backgroundColor: '#81511F' }}></span>
                    <code>#81511F</code>
                  </div>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-bg">
                  <span>Dark Surface</span>
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full" style={{ backgroundColor: '#181717' }}></span>
                    <code>#181717</code>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-surface p-6 rounded-lg border border-border shadow-luxury">
              <div className="flex items-center gap-2 text-primary mb-4">
                <Layers className="w-5 h-5" />
                <h3 className="font-serif text-lg font-medium text-on-surface">Typography System</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <span className="text-[10px] uppercase tracking-widest text-on-surface-muted block">Display & Headings</span>
                  <p className="font-serif text-xl font-medium text-on-surface mt-1">Playfair Display</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-widest text-on-surface-muted block">Body, UI & Controls</span>
                  <p className="font-sans text-sm font-regular text-on-surface mt-1">Inter (14px - 18px)</p>
                </div>
              </div>
            </div>

            <div className="bg-surface p-6 rounded-lg border border-border shadow-luxury">
              <div className="flex items-center gap-2 text-primary mb-4">
                <Compass className="w-5 h-5" />
                <h3 className="font-serif text-lg font-medium text-on-surface">Shape & Elevation</h3>
              </div>
              <div className="space-y-3 text-xs text-on-surface-muted">
                <p>• <strong>Button Radius:</strong> 0.5rem (8px rounded)</p>
                <p>• <strong>Card Corner Radius:</strong> 1rem (16px)</p>
                <p>• <strong>Shadow:</strong> Tonal Layering + 0px 10px 40px rgba(26,26,26,0.04)</p>
              </div>
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
              <img src={STITCH_LOGO} alt="Logo" className="h-8 w-auto object-contain" />
              <h3 className="font-serif text-2xl text-on-surface font-semibold tracking-tight">THE TOTE LIFE</h3>
            </div>
            <p className="text-xs text-on-surface-muted leading-relaxed max-w-sm">
              Curated carriers and furniture designed for a life lived with intent. Built with Stitch Design System DNA.
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
      />
    </div>
  );
}

export default App;
