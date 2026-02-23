import React, { useState } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';

const FilterBar = ({ filters, setFilters, cars }) => {
  const [showFilters, setShowFilters] = useState(false);

  const availableColors = [...new Set(cars.flatMap(car => car.colors))];
  const availableMakes = [...new Set(cars.map(car => car.make))];

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setTimeout(() => {
      setFilters(prev => ({ ...prev, search: value }));
    }, 250);
  };

  const toggleColor = (color) => {
    setFilters(prev => ({
      ...prev,
      colors: prev.colors.includes(color)
        ? prev.colors.filter(c => c !== color)
        : [...prev.colors, color]
    }));
  };

  return (
    <div className="space-y-4">
      {/* Search and sort */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by make, model, or VIN..."
            onChange={handleSearchChange}
            className="pl-10"
          />
        </div>
        <select
          value={filters.sortBy}
          onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value }))}
          className="px-4 py-2 bg-secondary border border-secondary rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="latest">Latest</option>
          <option value="price-low">Price: Low to High</option>
          <option value="price-high">Price: High to Low</option>
        </select>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="px-4 py-2 bg-secondary border border-secondary rounded-lg hover:bg-secondary/80 transition-colors flex items-center gap-2"
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filters
        </button>
      </div>

      {/* Advanced filters */}
      {showFilters && (
        <div className="bg-card rounded-lg p-6 border border-secondary space-y-6">
          {/* Colors */}
          <div className="space-y-3">
            <Label>Colors</Label>
            <div className="flex flex-wrap gap-3">
              {availableColors.map(color => (
                <label key={color} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={filters.colors.includes(color)}
                    onCheckedChange={() => toggleColor(color)}
                  />
                  <div
                    className="w-6 h-6 rounded-full border-2 border-white"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-sm capitalize">{color}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Price range */}
          <div className="space-y-3">
            <Label>Price Range: ${filters.priceRange[0].toLocaleString()} - ${filters.priceRange[1].toLocaleString()}</Label>
            <Slider
              min={0}
              max={100000}
              step={1000}
              value={filters.priceRange}
              onValueChange={(value) => setFilters(prev => ({ ...prev, priceRange: value }))}
            />
          </div>

          {/* Year range */}
          <div className="space-y-3">
            <Label>Year Range: {filters.yearRange[0]} - {filters.yearRange[1]}</Label>
            <Slider
              min={2015}
              max={2024}
              step={1}
              value={filters.yearRange}
              onValueChange={(value) => setFilters(prev => ({ ...prev, yearRange: value }))}
            />
          </div>

          {/* Make */}
          <div className="space-y-3">
            <Label>Make</Label>
            <select
              value={filters.make}
              onChange={(e) => setFilters(prev => ({ ...prev, make: e.target.value }))}
              className="w-full px-4 py-2 bg-secondary border border-secondary rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All Makes</option>
              {availableMakes.map(make => (
                <option key={make} value={make}>{make}</option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
};

export default FilterBar;