import React, { useState } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui2/dialog';
import { Button } from '@/components/ui2/button';
import {
  Wifi,
  Tv,
  Power,
  Car,
  Bus,
  MapPin,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Sparkles,
  Armchair,
  Wind
} from 'lucide-react';

interface Vehicle {
  _id: string;
  type: 'bus' | 'car' | 'auto';
  brand: string;
  fuelType: string;
  seatingCapacity: number;
  isAc: boolean;
  isSleeper?: boolean;
  amenities: string[];
  images: Array<{
    url: string;
    caption?: string;
    isPrimary: boolean;
  }>;
  registrationNumber?: string;
  vehicleLocation?: {
    type?: 'Point' | string;
    coordinates?: [number, number];
    address?: string;
    city?: string;
    state?: string;
    lastUpdated?: string;
  };
  operatingArea?: {
    cities: string[];
    states: string[];
    radius: number;
  };
  schedule?: {
    workingDays: string[];
    workingHours: {
      start: string;
      end: string;
    };
    breakTime?: {
      start: string;
      end: string;
    };
  };
  rating?: number;
  totalTrips?: number;
  totalEarnings?: number;
  isActive?: boolean;
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  booked?: boolean;
  driver?: {
    _id: string;
    firstName: string;
    lastName: string;
    rating: number;
    phone: string;
  };
  pricingReference?: {
    category: string;
    vehicleType: string;
    vehicleModel: string;
  };
}

interface VehicleDetailsModalProps {
  vehicle: Vehicle | null;
  isOpen: boolean;
  onClose: () => void;
  onBookNow?: (vehicle: Vehicle) => void;
}

const VehicleDetailsModal = ({ vehicle, isOpen, onClose, onBookNow }: VehicleDetailsModalProps) => {
  if (!vehicle) return null;

  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const images = vehicle.images && vehicle.images.length > 0 ? vehicle.images : [];

  const nextImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (images.length > 0) {
      setCurrentImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
    }
  };

  const previousImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (images.length > 0) {
      setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
    }
  };

  const getVehicleTypeIcon = () => {
    switch (vehicle.type) {
      case 'bus':
        return <Bus className="w-5 h-5 text-blue-600" />;
      case 'car':
      default:
        return <Car className="w-5 h-5 text-green-600" />;
    }
  };


  const renderAmenityIcon = (amenity: string) => {
    const lower = amenity.toLowerCase();
    if (lower.includes('wifi')) return <Wifi className="w-4 h-4 text-blue-500" />;
    if (lower.includes('gps')) return <MapPin className="w-4 h-4 text-emerald-500" />;
    if (lower.includes('power') || lower.includes('charging') || lower.includes('usb')) return <Power className="w-4 h-4 text-amber-500" />;
    if (lower.includes('ac')) return <Wind className="w-4 h-4 text-cyan-500" />;
    if (lower.includes('tv')) return <Tv className="w-4 h-4 text-purple-500" />;
    if (lower.includes('sleeper')) return <Armchair className="w-4 h-4 text-indigo-500" />;
    return <Sparkles className="w-4 h-4 text-blue-500" />;
  };

  const vehicleTitle = (() => {
    const brand = vehicle.brand?.trim() || '';
    const model = vehicle.pricingReference?.vehicleModel?.trim() || '';
    if (!model) return brand;
    if (!brand) return model;
    if (brand.toLowerCase() === model.toLowerCase() || brand.toLowerCase().includes(model.toLowerCase())) {
      return brand;
    }
    if (model.toLowerCase().includes(brand.toLowerCase())) {
      return model;
    }
    return `${brand} ${model}`;
  })() || 'Vehicle Details';

  const specRow = 'flex items-center justify-between px-3.5 py-2.5';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      {/* [&>button:last-child]:hidden hides the dialog's built-in X; the back button replaces it */}
      <DialogContent className="w-full h-full max-w-full sm:max-w-3xl sm:h-auto sm:max-h-[92vh] p-0 gap-0 sm:rounded-2xl rounded-none overflow-hidden flex flex-col bg-slate-50 border-0 sm:border shadow-2xl z-[100] [&>button:last-child]:hidden">

        {/* Scrollable Modal Body */}
        <div className="flex-1 overflow-y-auto">

          {/* Hero Image with floating back button */}
          <div className="relative bg-white">
            <button
              onClick={onClose}
              className="absolute left-3 top-[calc(env(safe-area-inset-top)+0.75rem)] z-20 w-9 h-9 flex items-center justify-center rounded-full bg-white/90 backdrop-blur-md shadow-md text-gray-800 hover:bg-white active:scale-90 transition-all"
              aria-label="Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div className="relative h-64 sm:h-80 w-full bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
              {images.length > 0 ? (
                <img
                  src={images[currentImageIndex]?.url}
                  alt={`${vehicleTitle} - Photo ${currentImageIndex + 1}`}
                  className="w-full h-full object-contain transition-all duration-300"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-gray-400">
                  <Car className="w-16 h-16 text-gray-300 mb-2" />
                  <span className="text-xs text-gray-400">No Image Available</span>
                </div>
              )}

              {images.length > 1 && (
                <>
                  <button
                    onClick={previousImage}
                    className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-gray-800 p-2 rounded-full backdrop-blur-sm shadow-md active:scale-90 transition-all z-10"
                    aria-label="Previous image"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={nextImage}
                    className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-gray-800 p-2 rounded-full backdrop-blur-sm shadow-md active:scale-90 transition-all z-10"
                    aria-label="Next image"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </>
              )}

              {images.length > 0 && (
                <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-md text-white text-[11px] font-medium px-2.5 py-1 rounded-full z-10">
                  {currentImageIndex + 1} / {images.length}
                </div>
              )}
            </div>

            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto px-4 py-2.5 scrollbar-thin">
                {images.map((img, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`relative flex-shrink-0 w-14 h-12 rounded-lg overflow-hidden border-2 transition-all ${
                      index === currentImageIndex
                        ? 'border-blue-600 ring-2 ring-blue-100'
                        : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={img.url} alt={`Thumbnail ${index + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="px-4 pt-3 pb-4 sm:px-6 space-y-3">

            {/* Title Card */}
            <div className="flex items-center gap-3 bg-white p-3.5 rounded-2xl border border-gray-100 shadow-sm">
              <div className="p-2.5 bg-blue-50 rounded-xl flex-shrink-0">
                {getVehicleTypeIcon()}
              </div>
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-base sm:text-lg font-bold text-gray-900 truncate">
                  {vehicleTitle}
                </DialogTitle>
                <DialogDescription className="text-xs text-gray-500 capitalize">
                  {vehicle.type} • {vehicle.seatingCapacity} Seater • {vehicle.isAc ? 'AC' : 'Non-AC'}
                </DialogDescription>
              </div>
              <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0">
                Available
              </span>
            </div>

            {/* Key Specifications List */}
            <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-gray-100 shadow-sm space-y-2.5">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Vehicle Specifications
              </h3>

              <div className="divide-y divide-gray-100 rounded-xl border border-gray-100 bg-slate-50/60 overflow-hidden">
                <div className={specRow}>
                  <span className="text-xs text-gray-500 font-medium">Vehicle Type</span>
                  <span className="text-xs font-semibold text-gray-900 capitalize">{vehicle.type}</span>
                </div>

                <div className={specRow}>
                  <span className="text-xs text-gray-500 font-medium">Brand & Model</span>
                  <span className="text-xs font-semibold text-gray-900">{vehicleTitle}</span>
                </div>

                <div className={specRow}>
                  <span className="text-xs text-gray-500 font-medium">AC / Non-AC</span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${
                    vehicle.isAc ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {vehicle.isAc ? 'AC' : 'Non-AC'}
                  </span>
                </div>

                {vehicle.type === 'bus' && vehicle.isSleeper !== undefined && (
                  <div className={specRow}>
                    <span className="text-xs text-gray-500 font-medium">Sleeper</span>
                    <span className="text-xs font-semibold text-gray-900">{vehicle.isSleeper ? 'Yes' : 'No'}</span>
                  </div>
                )}

                <div className={specRow}>
                  <span className="text-xs text-gray-500 font-medium">Fuel Type</span>
                  <span className="text-xs font-semibold text-gray-900 capitalize">{vehicle.fuelType || 'Petrol'}</span>
                </div>

                <div className={specRow}>
                  <span className="text-xs text-gray-500 font-medium">Seating Capacity</span>
                  <span className="text-xs font-semibold text-gray-900">{vehicle.seatingCapacity} Seats</span>
                </div>

                {vehicle.registrationNumber && (
                  <div className={specRow}>
                    <span className="text-xs text-gray-500 font-medium">Registration No.</span>
                    <span className="text-xs font-mono font-bold text-gray-900 bg-white px-2 py-0.5 rounded border border-gray-200">
                      {vehicle.registrationNumber}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Amenities & Features */}
            {vehicle.amenities && vehicle.amenities.length > 0 && (
              <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-gray-100 shadow-sm space-y-2.5">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Amenities & Features
                </h3>
                <div className="flex flex-wrap gap-2">
                  {vehicle.amenities.map((amenity, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 bg-slate-50 border border-slate-200/80 px-3 py-2 rounded-xl text-xs font-semibold text-gray-700"
                    >
                      {renderAmenityIcon(amenity)}
                      <span className="capitalize">{amenity}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Bottom Action Bar (extra bottom padding lifts buttons above the home indicator) */}
        <div className="z-30 bg-white px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] sm:pb-4 border-t border-gray-100 flex items-center gap-3 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
          <Button
            variant="outline"
            className="flex-1 h-11 rounded-xl border-gray-300 hover:bg-gray-100 font-semibold text-sm"
            onClick={onClose}
          >
            Close
          </Button>
          {onBookNow && (
            <Button
              className="flex-[2] h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-md"
              onClick={() => {
                onClose();
                onBookNow(vehicle);
              }}
            >
              Book Now
            </Button>
          )}
        </div>

      </DialogContent>
    </Dialog>
  );
};

export default VehicleDetailsModal;
