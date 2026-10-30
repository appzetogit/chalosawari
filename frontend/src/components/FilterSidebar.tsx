import React, { useState, useMemo } from 'react';
import { 
  Filter, 
  X, 
  SlidersHorizontal, 
  ArrowUpDown, 
  Check, 
  Snowflake, 
  Fuel, 
  Users, 
  Sparkles,
  ChevronDown
} from 'lucide-react';

export interface VehicleFilters {
  priceRange: {
    min: number;
    max: number;
  };
  seatingCapacity: number[];
  isAc: string[];
  isSleeper: string[];
  fuelType: string[];
  carBrand: string[];
  carModel: string[];
  busBrand: string[];
  busModel: string[];
  sortBy: string;
}

interface FilterSidebarProps {
  isOpen?: boolean;
  onToggle?: () => void;
  selectedType?: 'bus' | 'car';
  onFiltersChange?: (filters: VehicleFilters) => void;
  vehicles?: any[];
  filters?: VehicleFilters;
}

export const FilterSidebar: React.FC<FilterSidebarProps> = ({ 
  selectedType = 'bus',
  onFiltersChange,
  vehicles = [],
  filters: propFilters
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fallback default filters
  const filters: VehicleFilters = propFilters || {
    priceRange: { min: 0, max: 10000 },
    seatingCapacity: [],
    isAc: [],
    isSleeper: [],
    fuelType: [],
    carBrand: [],
    carModel: [],
    busBrand: [],
    busModel: [],
    sortBy: ''
  };

  // Extract available filter options from vehicle data
  const availableFilters = useMemo(() => {
    if (!vehicles || vehicles.length === 0) {
      return {
        brands: [],
        models: [],
        fuelTypes: ['Petrol', 'Diesel', 'CNG', 'Electric'],
        seatingCapacities: selectedType === 'car' ? [4, 5, 6, 7] : [12, 16, 20, 32, 45, 52]
      };
    }

    const brands = [...new Set(vehicles.map(v => v.brand).filter(Boolean))];
    const models = [...new Set(vehicles.map(v => v.pricingReference?.vehicleModel).filter(Boolean))];
    const fuelTypes = [...new Set(vehicles.map(v => v.fuelType).filter(Boolean))];
    const seatingCapacities = [...new Set(vehicles.map(v => v.seatingCapacity).filter(Boolean))].sort((a, b) => a - b);

    return {
      brands,
      models,
      fuelTypes: fuelTypes.length > 0 ? fuelTypes : ['Petrol', 'Diesel', 'CNG'],
      seatingCapacities: seatingCapacities.length > 0 ? seatingCapacities : (selectedType === 'car' ? [4, 5, 7] : [20, 32, 45])
    };
  }, [vehicles, selectedType]);

  const priceOptions = [
    { id: 'all', label: 'All Prices', min: 0, max: 10000 },
    { id: '0-1500', label: 'Under ₹1,500', min: 0, max: 1500 },
    { id: '1500-3000', label: '₹1,500 - ₹3,000', min: 1500, max: 3000 },
    { id: '3000-5000', label: '₹3,000 - ₹5,000', min: 3000, max: 5000 },
    { id: '5000+', label: '₹5,000+', min: 5000, max: 10000 }
  ];

  const sortOptions = [
    { id: 'price-low', label: 'Price: Low to High' },
    { id: 'price-high', label: 'Price: High to Low' },
    { id: 'rating-high', label: 'Top Rated' },
    { id: 'seating-low', label: 'Seats: Low to High' },
    { id: 'seating-high', label: 'Seats: High to Low' },
  ];

  // Update filters helper
  const updateFilters = (newFilters: Partial<VehicleFilters>) => {
    const updated = { ...filters, ...newFilters };
    onFiltersChange?.(updated);
  };

  // Array filter toggle
  const toggleArrayItem = (key: keyof VehicleFilters, item: string | number) => {
    const currentList = (filters[key] as any[]) || [];
    const exists = currentList.includes(item);
    const updated = exists 
      ? currentList.filter(i => i !== item)
      : [...currentList, item];
    updateFilters({ [key]: updated });
  };

  // Reset all filters
  const clearAllFilters = () => {
    const defaultFilters: VehicleFilters = {
      priceRange: { min: 0, max: 10000 },
      seatingCapacity: [],
      isAc: [],
      isSleeper: [],
      fuelType: [],
      carBrand: [],
      carModel: [],
      busBrand: [],
      busModel: [],
      sortBy: ''
    };
    updateFilters(defaultFilters);
  };

  // Calculate active filter count
  const activeCount = useMemo(() => {
    let count = 0;
    if (filters.seatingCapacity.length > 0) count += filters.seatingCapacity.length;
    if (filters.isAc.length > 0) count += filters.isAc.length;
    if (filters.isSleeper.length > 0) count += filters.isSleeper.length;
    if (filters.fuelType.length > 0) count += filters.fuelType.length;
    if (filters.carBrand.length > 0) count += filters.carBrand.length;
    if (filters.carModel.length > 0) count += filters.carModel.length;
    if (filters.busBrand.length > 0) count += filters.busBrand.length;
    if (filters.busModel.length > 0) count += filters.busModel.length;
    if (filters.priceRange.min > 0 || filters.priceRange.max < 10000) count++;
    if (filters.sortBy) count++;
    return count;
  }, [filters]);

  return (
    <div className="w-full">
      {/* Horizontal Quick-Filter Bar */}
      <div className="flex items-center gap-2 overflow-x-auto py-2 px-1 scrollbar-none no-scrollbar">
        {/* Main Filter Modal Trigger Button */}
        <button
          onClick={() => setIsModalOpen(true)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all shadow-xs flex-shrink-0 ${
            activeCount > 0
              ? 'bg-blue-600 text-white shadow-blue-200'
              : 'bg-white text-gray-700 border border-gray-200 hover:border-gray-300 hover:bg-gray-50'
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>Filters</span>
          {activeCount > 0 && (
            <span className="w-4 h-4 rounded-full bg-white text-blue-600 text-[10px] font-bold flex items-center justify-center ml-0.5">
              {activeCount}
            </span>
          )}
        </button>

        {/* Quick Filter: AC */}
        <button
          onClick={() => toggleArrayItem('isAc', 'AC')}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 ${
            filters.isAc.includes('AC')
              ? 'bg-blue-50 text-blue-700 border border-blue-300 font-semibold'
              : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          <Snowflake className="w-3 h-3 text-blue-500" />
          <span>AC</span>
          {filters.isAc.includes('AC') && <Check className="w-3 h-3 ml-0.5 text-blue-600" />}
        </button>

        {/* Quick Filter: Non-AC */}
        <button
          onClick={() => toggleArrayItem('isAc', 'Non-AC')}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 ${
            filters.isAc.includes('Non-AC')
              ? 'bg-blue-50 text-blue-700 border border-blue-300 font-semibold'
              : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          <span>Non-AC</span>
          {filters.isAc.includes('Non-AC') && <Check className="w-3 h-3 ml-0.5 text-blue-600" />}
        </button>

        {/* Quick Fuel Filters */}
        {['Petrol', 'Diesel', 'CNG'].map(fuel => (
          <button
            key={fuel}
            onClick={() => toggleArrayItem('fuelType', fuel)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 ${
              filters.fuelType.includes(fuel)
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-300 font-semibold'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            <span>{fuel}</span>
            {filters.fuelType.includes(fuel) && <Check className="w-3 h-3 ml-0.5 text-emerald-600" />}
          </button>
        ))}

        {/* Clear All Quick Button */}
        {activeCount > 0 && (
          <button
            onClick={clearAllFilters}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-semibold text-red-600 hover:bg-red-50 transition-all flex-shrink-0"
          >
            <X className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* Full Filter Bottom Sheet / Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-0 sm:p-4">
          <div 
            className="w-full max-w-[480px] bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50/50">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-100 text-blue-600 rounded-lg">
                  <Filter className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Filters & Sorting</h3>
                  <p className="text-[11px] text-gray-500">Refine your vehicle search</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {activeCount > 0 && (
                  <button
                    onClick={clearAllFilters}
                    className="text-xs text-red-600 hover:text-red-700 font-semibold px-2 py-1 rounded-md hover:bg-red-50 transition-colors"
                  >
                    Clear All
                  </button>
                )}
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
              {/* Sort Section */}
              <div>
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-2.5">
                  Sort Results By
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {sortOptions.map(option => {
                    const isSelected = filters.sortBy === option.id;
                    return (
                      <button
                        key={option.id}
                        onClick={() => updateFilters({ sortBy: isSelected ? '' : option.id })}
                        className={`px-3 py-2 rounded-xl text-xs font-medium text-left transition-all border ${
                          isSelected 
                            ? 'bg-blue-50 border-blue-500 text-blue-700 font-semibold shadow-xs' 
                            : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span>{option.label}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-blue-600" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Price Range */}
              <div>
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-2.5">
                  Price Range
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {priceOptions.map(option => {
                    const isSelected = filters.priceRange.min === option.min && filters.priceRange.max === option.max;
                    return (
                      <button
                        key={option.id}
                        onClick={() => updateFilters({ priceRange: { min: option.min, max: option.max } })}
                        className={`px-3 py-2 rounded-xl text-xs font-medium text-left transition-all border ${
                          isSelected 
                            ? 'bg-blue-50 border-blue-500 text-blue-700 font-semibold shadow-xs' 
                            : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span>{option.label}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-blue-600" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* AC / Comfort */}
              <div>
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-2.5">
                  AC & Comfort
                </label>
                <div className="flex flex-wrap gap-2">
                  {['AC', 'Non-AC'].map(type => {
                    const isSelected = filters.isAc.includes(type);
                    return (
                      <button
                        key={type}
                        onClick={() => toggleArrayItem('isAc', type)}
                        className={`px-4 py-2 rounded-xl text-xs font-medium transition-all border ${
                          isSelected
                            ? 'bg-blue-50 border-blue-500 text-blue-700 font-semibold shadow-xs'
                            : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <Snowflake className="w-3.5 h-3.5 text-blue-500" />
                          <span>{type}</span>
                          {isSelected && <Check className="w-3 h-3 ml-1 text-blue-600" />}
                        </div>
                      </button>
                    );
                  })}

                  {selectedType === 'bus' && ['Sleeper', 'Seater'].map(type => {
                    const isSelected = filters.isSleeper.includes(type);
                    return (
                      <button
                        key={type}
                        onClick={() => toggleArrayItem('isSleeper', type)}
                        className={`px-4 py-2 rounded-xl text-xs font-medium transition-all border ${
                          isSelected
                            ? 'bg-blue-50 border-blue-500 text-blue-700 font-semibold shadow-xs'
                            : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <span>{type}</span>
                          {isSelected && <Check className="w-3 h-3 ml-1 text-blue-600" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Seating Capacity */}
              {availableFilters.seatingCapacities && availableFilters.seatingCapacities.length > 0 && (
                <div>
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-2.5">
                    Seating Capacity
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {availableFilters.seatingCapacities.map(capacity => {
                      const isSelected = filters.seatingCapacity.includes(Number(capacity));
                      return (
                        <button
                          key={capacity}
                          onClick={() => toggleArrayItem('seatingCapacity', Number(capacity))}
                          className={`px-3.5 py-2 rounded-xl text-xs font-medium transition-all border ${
                            isSelected
                              ? 'bg-blue-600 text-white border-blue-600 font-semibold shadow-xs'
                              : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {capacity} Seats
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Fuel Type */}
              {availableFilters.fuelTypes && availableFilters.fuelTypes.length > 0 && (
                <div>
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-2.5">
                    Fuel Type
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {availableFilters.fuelTypes.map(fuel => {
                      const isSelected = filters.fuelType.includes(fuel);
                      return (
                        <button
                          key={fuel}
                          onClick={() => toggleArrayItem('fuelType', fuel)}
                          className={`px-3.5 py-2 rounded-xl text-xs font-medium transition-all border capitalize ${
                            isSelected
                              ? 'bg-emerald-50 border-emerald-500 text-emerald-700 font-semibold shadow-xs'
                              : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center gap-1.5">
                            <Fuel className="w-3.5 h-3.5 text-emerald-600" />
                            <span>{fuel}</span>
                            {isSelected && <Check className="w-3 h-3 ml-0.5 text-emerald-600" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Brand Filter (if available) */}
              {availableFilters.brands && availableFilters.brands.length > 0 && (
                <div>
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-2.5">
                    Brand
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {availableFilters.brands.map(brand => {
                      const brandKey = selectedType === 'car' ? 'carBrand' : 'busBrand';
                      const isSelected = (filters[brandKey] as string[]).includes(brand);
                      return (
                        <button
                          key={brand}
                          onClick={() => toggleArrayItem(brandKey, brand)}
                          className={`px-3.5 py-2 rounded-xl text-xs font-medium transition-all border ${
                            isSelected
                              ? 'bg-blue-50 border-blue-500 text-blue-700 font-semibold shadow-xs'
                              : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {brand}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Bottom Action */}
            <div className="p-4 border-t border-gray-100 bg-white flex items-center gap-3">
              <button
                onClick={clearAllFilters}
                className="w-1/3 py-2.5 px-3 rounded-xl border border-gray-200 text-gray-700 text-xs font-semibold hover:bg-gray-50 transition-colors"
              >
                Reset All
              </button>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-2/3 py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-xs font-bold shadow-md shadow-blue-200 transition-all text-center"
              >
                Apply Filters {activeCount > 0 ? `(${activeCount})` : ''}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FilterSidebar;