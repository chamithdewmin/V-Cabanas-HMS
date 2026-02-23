import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ShoppingCart } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';

const ProductModal = ({ car, isOpen, onClose }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [selectedColor, setSelectedColor] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const { addToCart } = useCart();

  if (!car) return null;

  const handleAddToCart = () => {
    addToCart(car, quantity, selectedColor || car.colors[0]);
    onClose();
  };

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % car.images.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + car.images.length) % car.images.length);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{car.make} {car.model} ({car.year})</DialogTitle>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Image carousel */}
          <div className="space-y-4">
            <div className="relative aspect-video bg-secondary rounded-lg overflow-hidden">
              <img
                src={car.images[currentImageIndex]}
                alt={`${car.make} ${car.model}`}
                className="w-full h-full object-cover"
              />
              {car.images.length > 1 && (
                <>
                  <button
                    onClick={prevImage}
                    className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 rounded-full hover:bg-black/70 transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={nextImage}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 rounded-full hover:bg-black/70 transition-colors"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>
            {car.images.length > 1 && (
              <div className="flex gap-2">
                {car.images.map((img, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`flex-1 aspect-video rounded-lg overflow-hidden border-2 transition-all ${
                      index === currentImageIndex ? 'border-primary' : 'border-transparent'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <div className="space-y-6">
            <div>
              <h3 className="text-3xl font-bold text-primary mb-2">${car.price.toLocaleString()}</h3>
              <p className="text-muted-foreground">VIN: {car.vin}</p>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Specifications</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="bg-secondary p-2 rounded">
                    <span className="text-muted-foreground">Year:</span> {car.year}
                  </div>
                  <div className="bg-secondary p-2 rounded">
                    <span className="text-muted-foreground">Condition:</span> {car.condition}
                  </div>
                  <div className="bg-secondary p-2 rounded">
                    <span className="text-muted-foreground">Transmission:</span> {car.transmission}
                  </div>
                  <div className="bg-secondary p-2 rounded">
                    <span className="text-muted-foreground">Fuel:</span> {car.fuelType}
                  </div>
                  <div className="bg-secondary p-2 rounded">
                    <span className="text-muted-foreground">Mileage:</span> {car.mileage.toLocaleString()} mi
                  </div>
                  <div className="bg-secondary p-2 rounded">
                    <span className="text-muted-foreground">Stock:</span> {car.stock}
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Select Color</h4>
                <div className="flex gap-3">
                  {car.colors.map(color => (
                    <button
                      key={color}
                      onClick={() => setSelectedColor(color)}
                      className={`w-10 h-10 rounded-full border-4 transition-all ${
                        selectedColor === color ? 'border-primary scale-110' : 'border-white'
                      }`}
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Quantity</h4>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="px-4 py-2 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors"
                  >
                    -
                  </button>
                  <span className="text-xl font-semibold w-12 text-center">{quantity}</span>
                  <button
                    onClick={() => setQuantity(Math.min(car.stock, quantity + 1))}
                    className="px-4 py-2 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            <Button onClick={handleAddToCart} className="w-full" disabled={car.stock === 0}>
              <ShoppingCart className="w-4 h-4 mr-2" />
              Add to Cart
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProductModal;