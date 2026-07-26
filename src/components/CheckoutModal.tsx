import React, { useState } from 'react';
import { X, CheckCircle, ShieldCheck, ArrowRight, Truck, MapPin, CreditCard } from 'lucide-react';
import type { Product } from './ProductCard';
import { Button } from './Button';

interface CartItem extends Product {
  quantity: number;
}

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  onClearCart: () => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  cart,
  onClearCart,
}) => {
  const [step, setStep] = useState<'checkout' | 'confirmed'>('checkout');
  const [deliveryMethod, setDeliveryMethod] = useState<'door' | 'pickup'>('door');
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    address: '',
    city: '',
    state: '',
  });

  if (!isOpen) return null;

  const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const deliveryFee = deliveryMethod === 'door' ? 15 : 0;
  const grandTotal = subtotal + deliveryFee;

  const handleSubmitOrder = (e: React.FormEvent) => {
    e.preventDefault();
    setStep('confirmed');
  };

  const handleFinish = () => {
    onClearCart();
    setStep('checkout');
    onClose();
  };

  const handleClose = () => {
    setStep('checkout');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-start sm:items-center justify-center bg-black/50 backdrop-blur-sm overflow-y-auto p-0 sm:p-4">
      <div className="relative w-full sm:max-w-lg bg-surface sm:rounded-xl border-0 sm:border sm:border-border shadow-luxury min-h-screen sm:min-h-0 sm:max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="sticky top-0 z-10 bg-surface border-b border-border px-4 py-3 flex items-center justify-between sm:rounded-t-xl">
          <h2 className="font-serif text-lg font-semibold text-on-surface">
            {step === 'checkout' ? 'Checkout' : 'Order Confirmed'}
          </h2>
          <button
            onClick={handleClose}
            className="p-1.5 text-on-surface-muted hover:text-on-surface rounded-full transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {step === 'checkout' ? (
          <form onSubmit={handleSubmitOrder} className="flex-1 overflow-y-auto">
            <div className="p-4 space-y-5">

              {/* Order Items (compact) */}
              <div>
                <h3 className="text-[11px] uppercase tracking-widest text-on-surface-muted font-semibold mb-2">
                  Items ({cart.reduce((a, c) => a + c.quantity, 0)})
                </h3>
                <div className="space-y-2">
                  {cart.map((item) => (
                    <div key={`co-${item.id}`} className="flex items-center gap-3 bg-surface-subtle rounded-lg p-2">
                      <img src={item.image} alt={item.name} className="w-10 h-10 rounded object-cover border border-border flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-on-surface truncate">{item.name}</p>
                        <p className="text-[10px] text-on-surface-muted">Qty: {item.quantity}</p>
                      </div>
                      <span className="text-xs font-semibold text-primary flex-shrink-0">
                        ${(item.price * item.quantity).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Contact */}
              <div>
                <h3 className="text-[11px] uppercase tracking-widest text-on-surface-muted font-semibold mb-2">Contact</h3>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    required
                    placeholder="First name"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="col-span-1 bg-surface-subtle border border-border rounded-lg px-3 py-2 text-xs text-on-surface placeholder:text-on-surface-muted/50 focus:outline-none focus:border-primary transition-colors"
                  />
                  <input
                    type="text"
                    required
                    placeholder="Last name"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="col-span-1 bg-surface-subtle border border-border rounded-lg px-3 py-2 text-xs text-on-surface placeholder:text-on-surface-muted/50 focus:outline-none focus:border-primary transition-colors"
                  />
                  <input
                    type="email"
                    required
                    placeholder="Email address"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="col-span-2 bg-surface-subtle border border-border rounded-lg px-3 py-2 text-xs text-on-surface placeholder:text-on-surface-muted/50 focus:outline-none focus:border-primary transition-colors"
                  />
                  <input
                    type="tel"
                    required
                    placeholder="Phone number"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="col-span-2 bg-surface-subtle border border-border rounded-lg px-3 py-2 text-xs text-on-surface placeholder:text-on-surface-muted/50 focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
              </div>

              {/* Delivery Method */}
              <div>
                <h3 className="text-[11px] uppercase tracking-widest text-on-surface-muted font-semibold mb-2">Delivery</h3>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDeliveryMethod('door')}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border text-center transition-all ${
                      deliveryMethod === 'door'
                        ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                        : 'border-border bg-surface-subtle hover:border-on-surface-muted/40'
                    }`}
                  >
                    <Truck className={`w-4 h-4 ${deliveryMethod === 'door' ? 'text-primary' : 'text-on-surface-muted'}`} />
                    <span className={`text-xs font-semibold ${deliveryMethod === 'door' ? 'text-primary' : 'text-on-surface'}`}>
                      Door Delivery
                    </span>
                    <span className="text-[10px] text-on-surface-muted">$15.00 • 3-5 days</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeliveryMethod('pickup')}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border text-center transition-all ${
                      deliveryMethod === 'pickup'
                        ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                        : 'border-border bg-surface-subtle hover:border-on-surface-muted/40'
                    }`}
                  >
                    <MapPin className={`w-4 h-4 ${deliveryMethod === 'pickup' ? 'text-primary' : 'text-on-surface-muted'}`} />
                    <span className={`text-xs font-semibold ${deliveryMethod === 'pickup' ? 'text-primary' : 'text-on-surface'}`}>
                      Pick Up
                    </span>
                    <span className="text-[10px] text-on-surface-muted">Free • Same day</span>
                  </button>
                </div>
              </div>

              {/* Address (only for door delivery) */}
              {deliveryMethod === 'door' && (
                <div>
                  <h3 className="text-[11px] uppercase tracking-widest text-on-surface-muted font-semibold mb-2">Shipping Address</h3>
                  <div className="space-y-2">
                    <input
                      type="text"
                      required
                      placeholder="Street address"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="w-full bg-surface-subtle border border-border rounded-lg px-3 py-2 text-xs text-on-surface placeholder:text-on-surface-muted/50 focus:outline-none focus:border-primary transition-colors"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        required
                        placeholder="City"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        className="bg-surface-subtle border border-border rounded-lg px-3 py-2 text-xs text-on-surface placeholder:text-on-surface-muted/50 focus:outline-none focus:border-primary transition-colors"
                      />
                      <input
                        type="text"
                        required
                        placeholder="State / Region"
                        value={formData.state}
                        onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                        className="bg-surface-subtle border border-border rounded-lg px-3 py-2 text-xs text-on-surface placeholder:text-on-surface-muted/50 focus:outline-none focus:border-primary transition-colors"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Pickup Location (only for pickup) */}
              {deliveryMethod === 'pickup' && (
                <div className="bg-surface-subtle border border-border rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-on-surface">The Tote Life Studio</p>
                      <p className="text-[11px] text-on-surface-muted mt-0.5">450 Atelier Avenue, Studio 4B, New York, NY 10012</p>
                      <p className="text-[11px] text-primary font-medium mt-1">Mon–Sat, 10 AM – 6 PM</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Payment – Paystack */}
              <div>
                <h3 className="text-[11px] uppercase tracking-widest text-on-surface-muted font-semibold mb-2">Payment</h3>
                <div className="flex items-center gap-3 p-3 rounded-lg border border-primary bg-primary/5 ring-1 ring-primary/30">
                  <div className="w-8 h-8 rounded-md bg-[#0BA4DB] flex items-center justify-center flex-shrink-0">
                    <CreditCard className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-on-surface">Paystack</p>
                    <p className="text-[10px] text-on-surface-muted">Cards, Bank Transfer, Mobile Money</p>
                  </div>
                  <span className="text-[10px] text-primary font-semibold bg-primary-container/30 px-2 py-0.5 rounded-full">Selected</span>
                </div>
              </div>

            </div>

            {/* Sticky Footer */}
            <div className="sticky bottom-0 bg-surface border-t border-border p-4 space-y-3">
              <div className="space-y-1 text-xs">
                <div className="flex justify-between text-on-surface-muted">
                  <span>Subtotal</span>
                  <span>${subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-on-surface-muted">
                  <span>Delivery</span>
                  <span>{deliveryFee === 0 ? 'Free' : `$${deliveryFee.toFixed(2)}`}</span>
                </div>
                <div className="flex justify-between text-on-surface font-bold text-sm pt-1 border-t border-border/60">
                  <span>Total</span>
                  <span className="text-primary">${grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
              <Button variant="primary" size="lg" className="w-full py-3 text-xs font-semibold uppercase tracking-widest flex items-center justify-center gap-2">
                Pay with Paystack <ArrowRight className="w-3.5 h-3.5" />
              </Button>
              <div className="flex items-center justify-center gap-1.5 text-[10px] text-on-surface-muted">
                <ShieldCheck className="w-3 h-3" />
                <span>Secured by Paystack • 256-bit SSL encryption</span>
              </div>
            </div>
          </form>
        ) : (
          /* Confirmed */
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-14 h-14 bg-primary-container text-primary rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8" />
            </div>
            <span className="text-[10px] uppercase tracking-widest text-primary font-semibold">Order #TTL-{Math.floor(10000 + Math.random() * 90000)}</span>
            <h3 className="font-serif text-2xl font-normal text-on-surface mt-2">
              Thank You{formData.firstName ? `, ${formData.firstName}` : ''}!
            </h3>
            <p className="text-xs text-on-surface-muted mt-2 max-w-xs leading-relaxed">
              Your order has been confirmed. A receipt and {deliveryMethod === 'door' ? 'tracking details' : 'pickup instructions'} have been sent to <strong>{formData.email || 'your email'}</strong>.
            </p>

            <div className="w-full bg-surface-subtle p-3 rounded-lg border border-border text-left mt-5 space-y-1.5 text-xs">
              {deliveryMethod === 'door' ? (
                <>
                  <div className="flex justify-between text-on-surface-muted">
                    <span>Shipping To</span>
                    <span className="font-medium text-on-surface text-right">{formData.address || '—'}, {formData.city || '—'}</span>
                  </div>
                  <div className="flex justify-between text-on-surface-muted">
                    <span>Estimated Arrival</span>
                    <span className="font-medium text-primary">3–5 Business Days</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between text-on-surface-muted">
                    <span>Pickup Location</span>
                    <span className="font-medium text-on-surface text-right">The Tote Life Studio</span>
                  </div>
                  <div className="flex justify-between text-on-surface-muted">
                    <span>Ready For Pickup</span>
                    <span className="font-medium text-primary">Today</span>
                  </div>
                </>
              )}
              <div className="flex justify-between text-on-surface-muted pt-1 border-t border-border/60">
                <span>Total Paid</span>
                <span className="font-bold text-primary">${grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            <Button variant="primary" size="md" onClick={handleFinish} className="w-full mt-5 uppercase tracking-widest text-xs">
              Continue Shopping
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
