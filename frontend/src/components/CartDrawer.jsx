import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, X, Minus, Plus, Trash2 } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import CheckoutModal from '@/components/CheckoutModal';

const CartDrawer = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const { cart, removeFromCart, updateQuantity, getTotal, getTax, getGrandTotal } = useCart();

  return (
    <>
      {/* Cart button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 bg-primary rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-transform"
      >
        <ShoppingCart className="w-6 h-6 text-white" />
        {cart.length > 0 && (
          <span className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full text-white text-xs flex items-center justify-center font-bold">
            {cart.length}
          </span>
        )}
      </button>

      {/* Drawer */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/50 z-40"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25 }}
              className="fixed top-0 right-0 h-full w-full max-w-md bg-card z-50 shadow-2xl flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-secondary">
                <h2 className="text-xl font-bold">Shopping Cart</h2>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-secondary rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Cart items */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {cart.length === 0 ? (
                  <div className="text-center py-12">
                    <ShoppingCart className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Your cart is empty</p>
                  </div>
                ) : (
                  cart.map((item) => (
                    <div key={`${item.id}-${item.selectedColor}`} className="bg-secondary rounded-lg p-4 space-y-3">
                      <div className="flex gap-3">
                        <img
                          src={item.images[0]}
                          alt={`${item.make} ${item.model}`}
                          className="w-20 h-20 object-cover rounded-lg"
                          loading="lazy"
                        />
                        <div className="flex-1">
                          <h3 className="font-semibold">{item.make} {item.model}</h3>
                          <p className="text-sm text-muted-foreground">{item.year}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <div
                              className="w-4 h-4 rounded-full border-2 border-white"
                              style={{ backgroundColor: item.selectedColor }}
                            />
                            <span className="text-xs text-muted-foreground capitalize">{item.selectedColor}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => removeFromCart(item.id, item.selectedColor)}
                          className="p-2 hover:bg-card rounded-lg transition-colors h-fit"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateQuantity(item.id, item.selectedColor, item.quantity - 1)}
                            className="p-1 hover:bg-card rounded transition-colors"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="w-8 text-center font-medium">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.id, item.selectedColor, item.quantity + 1)}
                            className="p-1 hover:bg-card rounded transition-colors"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                        <span className="font-bold text-primary">${(item.price * item.quantity).toLocaleString()}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              {cart.length > 0 && (
                <div className="border-t border-secondary p-6 space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>${getTotal().toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tax (10%)</span>
                      <span>${getTax().toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold pt-2 border-t border-secondary">
                      <span>Total</span>
                      <span className="text-primary">${getGrandTotal().toLocaleString()}</span>
                    </div>
                  </div>
                  <Button
                    onClick={() => {
                      setShowCheckout(true);
                      setIsOpen(false);
                    }}
                    className="w-full"
                  >
                    Proceed to Checkout
                  </Button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <CheckoutModal isOpen={showCheckout} onClose={() => setShowCheckout(false)} />
    </>
  );
};

export default CartDrawer;