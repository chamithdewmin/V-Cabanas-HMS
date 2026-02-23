import React, { createContext, useContext, useState, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState([]);
  const { toast } = useToast();

  const addToCart = (car, quantity = 1, selectedColor = null) => {
    const existingItem = cart.find(item => item.id === car.id && item.selectedColor === selectedColor);
    
    if (existingItem) {
      setCart(cart.map(item =>
        item.id === car.id && item.selectedColor === selectedColor
          ? { ...item, quantity: item.quantity + quantity }
          : item
      ));
    } else {
      setCart([...cart, { ...car, quantity, selectedColor: selectedColor || car.colors[0] }]);
    }

    toast({
      title: "Added to cart",
      description: `${car.make} ${car.model} added successfully`,
    });
  };

  const removeFromCart = (id, selectedColor) => {
    setCart(cart.filter(item => !(item.id === id && item.selectedColor === selectedColor)));
  };

  const updateQuantity = (id, selectedColor, quantity) => {
    if (quantity <= 0) {
      removeFromCart(id, selectedColor);
      return;
    }
    setCart(cart.map(item =>
      item.id === id && item.selectedColor === selectedColor
        ? { ...item, quantity }
        : item
    ));
  };

  const clearCart = () => {
    setCart([]);
  };

  const getTotal = () => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const getTax = () => {
    return getTotal() * 0.1; // 10% tax
  };

  const getGrandTotal = () => {
    return getTotal() + getTax();
  };

  return (
    <CartContext.Provider value={{
      cart,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      getTotal,
      getTax,
      getGrandTotal
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
};