import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Upload, X, Loader2, Car, Bus, MapPin, Sparkles, Fuel, Users,
  ShieldCheck, Check, Info, FileText, CheckCircle2, SlidersHorizontal,
  Flame, Zap, BatteryCharging, ChevronDown, Plus, Trash2, Camera, AlertCircle, Gauge
} from "lucide-react";
import { CreateVehicleData, Vehicle, UpdateVehicleData } from "@/services/vehicleApi";
import { getPricingForVehicle, VehiclePricing } from "@/services/vehiclePricingApi";
import LocationAutocomplete from "@/components/LocationAutocomplete";
import { LocationSuggestion } from "@/services/googleMapsService";
import vehicleSettingService, { VehicleVariant, VehicleModelItem } from "@/services/vehicleSettingApi";

interface AddVehicleFormProps {
  mode?: 'create' | 'edit';
  initial?: Partial<CreateVehicleData> & { type?: 'car' | 'bus' };
  existingImages?: { _id: string; url: string; isPrimary?: boolean; caption?: string }[];
  onSubmit: (
    data: CreateVehicleData | UpdateVehicleData,
    newImages: File[],
    deleteImageIds: string[]
  ) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

const AddVehicleForm = ({ mode = 'create', initial, existingImages = [], onSubmit, onCancel, isSubmitting }: AddVehicleFormProps) => {
  const [selectedVehicleCategory, setSelectedVehicleCategory] = useState<'car' | 'bus'>(
    (initial?.type as 'car' | 'bus') || (initial?.pricingReference?.category as 'car' | 'bus') || 'car'
  );
  const [formData, setFormData] = useState<Partial<CreateVehicleData>>(() => {
    const category = (initial?.type as 'car' | 'bus') || (initial?.pricingReference?.category as 'car' | 'bus') || 'car';
    return {
      type: category,
      brand: initial?.brand || initial?.pricingReference?.vehicleModel || '',
      color: (initial as any)?.color || '',
      mileage: (initial as any)?.mileage ? String((initial as any).mileage) : '',
      fuelType: (initial?.fuelType as any) || 'petrol',
      seatingCapacity: initial?.seatingCapacity || (category === 'bus' ? 32 : 4),
      engineCapacity: (initial as any)?.engineCapacity || undefined,
      isAc: initial?.isAc ?? false,
      isSleeper: initial?.isSleeper ?? false,
      amenities: initial?.amenities || [],
      registrationNumber: initial?.registrationNumber || '',
      chassisNumber: (initial as any)?.chassisNumber || '',
      engineNumber: (initial as any)?.engineNumber || '',
      insuranceNumber: (initial as any)?.insuranceNumber || '',
      insuranceExpiryDate: (initial as any)?.insuranceExpiryDate || '',
      fitnessNumber: (initial as any)?.fitnessNumber || '',
      fitnessExpiryDate: (initial as any)?.fitnessExpiryDate || '',
      permitNumber: (initial as any)?.permitNumber || '',
      permitExpiryDate: (initial as any)?.permitExpiryDate || '',
      pucNumber: (initial as any)?.pucNumber || '',
      pucExpiryDate: (initial as any)?.pucExpiryDate || '',
      pricingReference: {
        category: category,
        vehicleType: initial?.pricingReference?.vehicleType || '',
        vehicleModel: initial?.pricingReference?.vehicleModel || initial?.brand || ''
      },
      workingDays: initial?.workingDays || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
      workingHoursStart: initial?.workingHoursStart || '06:00',
      workingHoursEnd: initial?.workingHoursEnd || '22:00',
      operatingCities: initial?.operatingCities || [],
      operatingStates: initial?.operatingStates || [],
      vehicleLocation: initial?.vehicleLocation || {
        latitude: 0,
        longitude: 0,
        address: '',
        city: '',
        state: ''
      }
    };
  });

  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [existing, setExisting] = useState<(typeof existingImages[0] & { markDelete?: boolean })[]>(existingImages);
  const [fetchedPricing, setFetchedPricing] = useState<VehiclePricing | null>(null);
  const [selectedBrand, setSelectedBrand] = useState('');
  const [isLoadingPricing, setIsLoadingPricing] = useState(false);
  const [oneWayPricing, setOneWayPricing] = useState<VehiclePricing | null>(null);
  const [returnPricing, setReturnPricing] = useState<VehiclePricing | null>(null);

  // Vehicle location input state
  const [vehicleLocationInput, setVehicleLocationInput] = useState(
    initial?.vehicleLocation?.address || ""
  );

  // Dynamic variants and models from Admin Vehicle Settings
  const [dynamicVariants, setDynamicVariants] = useState<VehicleVariant[]>([]);
  const [dynamicModels, setDynamicModels] = useState<VehicleModelItem[]>([]);

  // Sync when initial prop changes
  useEffect(() => {
    if (initial) {
      const category = (initial.type as 'car' | 'bus') || (initial.pricingReference?.category as 'car' | 'bus') || 'car';
      setSelectedVehicleCategory(category);
      setFormData({
        type: category,
        brand: initial.brand || initial.pricingReference?.vehicleModel || '',
        color: (initial as any).color || '',
        mileage: initial.mileage ? String(initial.mileage) : '',
        fuelType: (initial.fuelType as any) || 'petrol',
        seatingCapacity: initial.seatingCapacity || (category === 'bus' ? 32 : 4),
        engineCapacity: (initial as any).engineCapacity || undefined,
        isAc: initial.isAc ?? false,
        isSleeper: initial.isSleeper ?? false,
        amenities: initial.amenities || [],
        registrationNumber: initial.registrationNumber || '',
        chassisNumber: (initial as any).chassisNumber || '',
        engineNumber: (initial as any).engineNumber || '',
        insuranceNumber: (initial as any).insuranceNumber || '',
        insuranceExpiryDate: (initial as any).insuranceExpiryDate || '',
        fitnessNumber: (initial as any).fitnessNumber || '',
        fitnessExpiryDate: (initial as any).fitnessExpiryDate || '',
        permitNumber: (initial as any).permitNumber || '',
        permitExpiryDate: (initial as any).permitExpiryDate || '',
        pucNumber: (initial as any).pucNumber || '',
        pucExpiryDate: (initial as any).pucExpiryDate || '',
        pricingReference: {
          category: category,
          vehicleType: initial.pricingReference?.vehicleType || '',
          vehicleModel: initial.pricingReference?.vehicleModel || initial.brand || ''
        },
        workingDays: initial.workingDays || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
        workingHoursStart: initial.workingHoursStart || '06:00',
        workingHoursEnd: initial.workingHoursEnd || '22:00',
        operatingCities: initial.operatingCities || [],
        operatingStates: initial.operatingStates || [],
        vehicleLocation: initial.vehicleLocation || {
          latitude: 0,
          longitude: 0,
          address: '',
          city: '',
          state: ''
        }
      });
      setVehicleLocationInput(initial.vehicleLocation?.address || "");
    }
  }, [initial]);

  useEffect(() => {
    if (existingImages) {
      setExisting(existingImages);
    }
  }, [existingImages]);

  // Load dynamic vehicle settings from Admin API
  useEffect(() => {
    const loadVehicleSettings = async () => {
      try {
        const data = await vehicleSettingService.getPublicVehicleSettings();
        if (data.variants && data.variants.length > 0) {
          setDynamicVariants(data.variants);
        }
        if (data.models && data.models.length > 0) {
          setDynamicModels(data.models);

          // Auto-match variant if model is present but variant is missing
          setFormData(prev => {
            const currentModel = prev.pricingReference?.vehicleModel || prev.brand || '';
            const currentVariant = prev.pricingReference?.vehicleType || '';
            if (currentModel && !currentVariant) {
              const matched = data.models.find(
                (m: any) => m.modelName.toLowerCase() === currentModel.trim().toLowerCase() ||
                  currentModel.toLowerCase().includes(m.modelName.toLowerCase()) ||
                  m.modelName.toLowerCase().includes(currentModel.toLowerCase())
              );
              if (matched && matched.variantName) {
                return {
                  ...prev,
                  pricingReference: {
                    ...prev.pricingReference!,
                    vehicleType: matched.variantName,
                    vehicleModel: currentModel
                  }
                };
              }
            }
            return prev;
          });
        }
      } catch (err) {
        console.warn("Using default vehicle options:", err);
      }
    };
    loadVehicleSettings();
  }, []);

  // Auto-fetch pricing when vehicle category, type, or model changes
  useEffect(() => {
    const fetchPricing = async () => {
      if (formData.pricingReference?.category &&
        formData.pricingReference?.vehicleType &&
        formData.pricingReference?.vehicleModel) {
        setIsLoadingPricing(true);
        try {
          const [oneWay, returnTrip] = await Promise.all([
            getPricingForVehicle(
              formData.pricingReference.category,
              formData.pricingReference.vehicleType,
              formData.pricingReference.vehicleModel,
              'one-way'
            ),
            getPricingForVehicle(
              formData.pricingReference.category,
              formData.pricingReference.vehicleType,
              formData.pricingReference.vehicleModel,
              'return'
            )
          ]);

          setOneWayPricing(oneWay);
          setReturnPricing(returnTrip);
          setFetchedPricing(oneWay);
        } catch (error) {
          console.error('Error fetching pricing:', error);
          setOneWayPricing(null);
          setReturnPricing(null);
          setFetchedPricing(null);
        } finally {
          setIsLoadingPricing(false);
        }
      } else {
        setOneWayPricing(null);
        setReturnPricing(null);
        setFetchedPricing(null);
      }
    };

    fetchPricing();
  }, [formData.pricingReference?.category, formData.pricingReference?.vehicleType, formData.pricingReference?.vehicleModel]);

  const handleFormChange = (field: keyof CreateVehicleData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Helper function to extract seating capacity from vehicle model name
  const extractSeatingCapacity = (modelName: string): number => {
    const match = modelName.match(/(\d+)-?Seater/i);
    if (match) return parseInt(match[1]);

    const match2 = modelName.match(/(\d+)\s+Seater/i);
    if (match2) return parseInt(match2[1]);

    const match3 = modelName.match(/(\d+)S/i);
    if (match3) return parseInt(match3[1]);

    return selectedVehicleCategory === 'car' ? 4 : 40;
  };

  const handlePricingReferenceChange = (field: 'category' | 'vehicleType' | 'vehicleModel', value: string) => {
    setFormData(prev => {
      const newPricingReference = {
        ...prev.pricingReference!,
        [field]: value,
        ...(field === 'vehicleType' ? { vehicleModel: '' } : {})
      };

      if (field === 'vehicleModel' && value) {
        // Find matching dynamic model if available
        const matchedModel = dynamicModels.find(
          m => m.category === selectedVehicleCategory &&
            m.modelName.toLowerCase() === value.trim().toLowerCase()
        );

        let extractedCapacity = matchedModel?.seatingCapacity;
        if (!extractedCapacity) {
          extractedCapacity = extractSeatingCapacity(value);
        }

        const updates: any = {
          ...prev,
          brand: matchedModel?.modelName || value,
          seatingCapacity: extractedCapacity,
          pricingReference: newPricingReference
        };

        // Fuel type and mileage are entered by the driver for their own vehicle

        return updates;
      }

      return {
        ...prev,
        brand: field === 'vehicleModel' ? value : prev.brand,
        pricingReference: newPricingReference
      };
    });
  };

  // Handle vehicle location selection
  const handleVehicleLocationSelect = async (location: LocationSuggestion) => {
    setVehicleLocationInput(location.description);

    try {
      const { googleMapsService } = await import('@/services/googleMapsService');
      const placeDetails = await googleMapsService.getPlaceDetails(location.place_id);

      if (placeDetails && placeDetails.geometry && placeDetails.geometry.location) {
        const lat = placeDetails.geometry.location.lat();
        const lng = placeDetails.geometry.location.lng();

        let city = '';
        let state = '';

        if (placeDetails.address_components) {
          const cityComponent = placeDetails.address_components.find(
            (component: any) =>
              component.types.includes('locality') ||
              component.types.includes('administrative_area_level_2')
          );
          const stateComponent = placeDetails.address_components.find(
            (component: any) =>
              component.types.includes('administrative_area_level_1')
          );

          if (cityComponent) city = cityComponent.long_name;
          if (stateComponent) state = stateComponent.long_name;
        }

        handleFormChange('vehicleLocation', {
          latitude: lat,
          longitude: lng,
          address: location.description,
          city: city,
          state: state
        });
      }
    } catch (error) {
      console.error('Error getting location details:', error);
      handleFormChange('vehicleLocation', {
        ...formData.vehicleLocation,
        address: location.description
      });
    }
  };

  // Initialize form with initial values for edit
  useEffect(() => {
    if (initial) {
      setFormData(prev => ({
        ...prev,
        ...initial,
        type: initial.type || prev.type,
        mileage: (initial as any)?.mileage !== undefined ? String((initial as any).mileage) : prev.mileage,
      }));
      if (initial.type) setSelectedVehicleCategory(initial.type);
      setExisting(existingImages);

      if (initial.vehicleLocation?.address) {
        setVehicleLocationInput(initial.vehicleLocation.address);
      }
    }
  }, [initial, existingImages]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      const newImages = [...selectedImages, ...files];
      setSelectedImages(newImages);

      files.forEach(file => {
        const reader = new FileReader();
        reader.onload = () => {
          setPreviewUrls(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  const isPricingComplete = () => {
    if (!oneWayPricing || !returnPricing) return false;
    const oneWayValid = Object.values(oneWayPricing.distancePricing).some(price => price > 0);
    const returnValid = Object.values(returnPricing.distancePricing).some(price => price > 0);
    return oneWayValid && returnValid;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedVehicleCategory) {
      alert('Please select a vehicle category');
      return;
    }

    if (!formData.pricingReference?.vehicleType || !formData.pricingReference?.vehicleModel) {
      alert('Please select vehicle variant and model for pricing');
      return;
    }

    if (!isPricingComplete()) {
      alert('Both one-way and return trip pricing must be available to add this vehicle. Please contact admin if pricing is incomplete.');
      return;
    }

    if (!formData.vehicleLocation?.address || !formData.vehicleLocation?.latitude || !formData.vehicleLocation?.longitude) {
      alert('Please search and select your vehicle base location from the suggestions');
      return;
    }

    const submitData: CreateVehicleData = {
      type: selectedVehicleCategory as 'car' | 'bus',
      brand: formData.pricingReference?.vehicleModel || formData.brand || 'Vehicle',
      mileage: formData.mileage ? String(formData.mileage) : undefined,
      fuelType: formData.fuelType || 'petrol',
      seatingCapacity: formData.seatingCapacity || 4,
      isAc: formData.isAc || false,
      isSleeper: formData.isSleeper || false,
      amenities: formData.amenities || [],
      registrationNumber: (formData.registrationNumber || '').toUpperCase().trim(),
      insuranceNumber: formData.insuranceNumber ? formData.insuranceNumber : undefined,
      insuranceExpiryDate: formData.insuranceExpiryDate ? formData.insuranceExpiryDate : undefined,
      fitnessNumber: formData.fitnessNumber ? formData.fitnessNumber : undefined,
      fitnessExpiryDate: formData.fitnessExpiryDate ? formData.fitnessExpiryDate : undefined,
      permitNumber: formData.permitNumber ? formData.permitNumber : undefined,
      permitExpiryDate: formData.permitExpiryDate ? formData.permitExpiryDate : undefined,
      pucNumber: formData.pucNumber ? formData.pucNumber : undefined,
      pucExpiryDate: formData.pucExpiryDate ? formData.pucExpiryDate : undefined,
      pricingReference: {
        category: selectedVehicleCategory,
        vehicleType: formData.pricingReference?.vehicleType || '',
        vehicleModel: formData.pricingReference?.vehicleModel || ''
      },
      vehicleLocation: formData.vehicleLocation?.address ? {
        latitude: formData.vehicleLocation?.latitude || 0,
        longitude: formData.vehicleLocation?.longitude || 0,
        address: formData.vehicleLocation?.address || '',
        city: formData.vehicleLocation?.city || '',
        state: formData.vehicleLocation?.state || ''
      } : {
        latitude: 0,
        longitude: 0,
        address: '',
        city: '',
        state: ''
      },
      workingDays: formData.workingDays || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
      workingHoursStart: formData.workingHoursStart || '06:00',
      workingHoursEnd: formData.workingHoursEnd || '22:00',
      operatingCities: formData.operatingCities || [],
      operatingStates: formData.operatingStates || []
    };

    const deleteIds = existing.filter(e => e.markDelete).map(e => e._id);
    onSubmit(
      mode === 'edit' ? (submitData as unknown as UpdateVehicleData) : submitData,
      selectedImages,
      deleteIds
    );
  };

  const handleCategorySelect = (category: 'car' | 'bus') => {
    setSelectedVehicleCategory(category);
    setSelectedBrand('');

    setFormData(prev => ({
      ...prev,
      type: category,
      seatingCapacity: category === 'bus' ? 32 : 4,
      amenities: [],
      pricingReference: {
        ...prev.pricingReference!,
        category: category,
        vehicleType: '',
        vehicleModel: ''
      }
    }));

    setFetchedPricing(null);
    setOneWayPricing(null);
    setReturnPricing(null);
  };

  const getVehicleOptions = (category: 'car' | 'bus') => {
    // Dynamic variants for this category
    const matchingVariants = dynamicVariants.filter(v => v.category === category && v.isActive);
    const variantNames = matchingVariants.map(v => v.name);

    // Group models by variantName
    const modelsByVariant: Record<string, string[]> = {};
    const matchingModels = dynamicModels.filter(m => m.category === category && m.isActive);

    variantNames.forEach(vName => {
      modelsByVariant[vName] = matchingModels
        .filter(m => m.variantName.toLowerCase() === vName.toLowerCase())
        .map(m => m.modelName);
    });

    const fuelTypes = category === 'car' ? [
      { id: 'petrol', label: 'Petrol', icon: '⛽' },
      { id: 'diesel', label: 'Diesel', icon: '🛢️' },
      { id: 'cng', label: 'CNG', icon: '💨' },
      { id: 'electric', label: 'Electric', icon: '⚡' }
    ] : [
      { id: 'diesel', label: 'Diesel', icon: '🛢️' },
      { id: 'petrol', label: 'Petrol', icon: '⛽' },
      { id: 'electric', label: 'Electric', icon: '⚡' }
    ];

    return {
      variants: variantNames,
      fuelTypes,
      models: modelsByVariant
    };
  };

  const getModelsForType = (category: 'car' | 'bus', vehicleType: string): string[] => {
    const options = getVehicleOptions(category);
    if ((category === 'car' || category === 'bus') && typeof options.models === 'object') {
      return (options.models as any)[vehicleType] || [];
    }
    return [];
  };

  const currentOptions = getVehicleOptions(selectedVehicleCategory);
  const selectedVariant = formData.pricingReference?.vehicleType || '';
  const selectedModel = formData.pricingReference?.vehicleModel || '';
  // Brand -> model choices come from the admin's vehicle models for this body type
  const variantModels = dynamicModels.filter(m => m.category === selectedVehicleCategory && m.isActive && m.variantName.toLowerCase() === selectedVariant.toLowerCase());
  const variantBrands = [...new Set(variantModels.map(m => m.brand))];
  const selectedModelInfo = variantModels.find(m => m.modelName.toLowerCase() === selectedModel.toLowerCase());
  const currentBrand = selectedBrand || selectedModelInfo?.brand || '';
  const brandModels = variantModels.filter(m => m.brand === currentBrand);

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* 1. Vehicle Category Selection Cards */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
            <Car className="w-4 h-4 text-blue-600" />
            <span>Vehicle Category</span>
            <span className="text-red-500">*</span>
          </Label>
          <span className="text-[11px] font-medium text-slate-400">Step 1 of 6</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => handleCategorySelect('car')}
            className={`flex flex-col items-center justify-center p-3.5 rounded-xl border-2 transition-all duration-200 cursor-pointer ${selectedVehicleCategory === 'car'
              ? 'border-blue-600 bg-blue-50/70 text-blue-950 shadow-xs ring-2 ring-blue-500/20'
              : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100 hover:border-slate-300 text-slate-700'
              }`}
          >

            <span className="font-bold text-sm">Car</span>
          </button>

          <button
            type="button"
            onClick={() => handleCategorySelect('bus')}
            className={`flex flex-col items-center justify-center p-3.5 rounded-xl border-2 transition-all duration-200 cursor-pointer ${selectedVehicleCategory === 'bus'
              ? 'border-blue-600 bg-blue-50/70 text-blue-950 shadow-xs ring-2 ring-blue-500/20'
              : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100 hover:border-slate-300 text-slate-700'
              }`}
          >

            <span className="font-bold text-sm">Bus</span>
          </button>
        </div>
      </div>

      {selectedVehicleCategory && (
        <>
          {/* 2. Variant & Model Selection */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100">
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <SlidersHorizontal className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Classification & Model</h3>
                <p className="text-[11px] text-slate-500">Select body type, brand and model</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Body Type */}
              <div className="space-y-1.5">
                <Label htmlFor="variantSelect" className="text-xs font-semibold text-slate-700">
                  Body Type <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={selectedVariant}
                  onValueChange={(value) => {
                    setSelectedBrand('');
                    handlePricingReferenceChange('vehicleType', value);
                  }}
                >
                  <SelectTrigger id="variantSelect" className="h-11 rounded-xl border-slate-200 bg-slate-50/40 text-sm font-medium focus:border-blue-600 focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none">
                    <SelectValue placeholder="Select body type" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200 shadow-lg">
                    {currentOptions.variants.map((variant) => (
                      <SelectItem key={variant} value={variant} className="font-medium cursor-pointer">
                        {variant}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Brand / Manufacturer */}
              <div className="space-y-1.5">
                <Label htmlFor="brandSelect" className="text-xs font-semibold text-slate-700">
                  Brand / Manufacturer <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={currentBrand || undefined}
                  disabled={!selectedVariant}
                  onValueChange={(value) => {
                    setSelectedBrand(value);
                    handlePricingReferenceChange('vehicleModel', '');
                  }}
                >
                  <SelectTrigger id="brandSelect" className="h-11 rounded-xl border-slate-200 bg-slate-50/40 text-sm font-medium focus:border-blue-600 focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none">
                    <SelectValue placeholder={selectedVariant ? 'Select brand' : 'Select body type first'} />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200 shadow-lg">
                    {variantBrands.map((brand) => (
                      <SelectItem key={brand} value={brand} className="font-medium cursor-pointer">
                        {brand}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedVariant && variantBrands.length === 0 && (
                  <p className="text-[11px] text-amber-600">No models available for {selectedVariant} yet. Please contact admin.</p>
                )}
              </div>

              {/* Model Name */}
              <div className="space-y-1.5">
                <Label htmlFor="modelSelect" className="text-xs font-semibold text-slate-700">
                  Model Name <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={selectedModel || undefined}
                  disabled={!currentBrand}
                  onValueChange={(value) => handlePricingReferenceChange('vehicleModel', value)}
                >
                  <SelectTrigger id="modelSelect" className="h-11 rounded-xl border-slate-200 bg-slate-50/40 text-sm font-medium focus:border-blue-600 focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none">
                    <SelectValue placeholder={currentBrand ? 'Select model' : 'Select brand first'} />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200 shadow-lg">
                    {brandModels.map((m) => (
                      <SelectItem key={m.id} value={m.modelName} className="font-medium cursor-pointer">
                        {m.modelName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Fare rate set by admin for the chosen model */}
            {selectedModel && (
              <div className="pt-1">
                {isLoadingPricing ? (
                  <div className="flex items-center gap-2 p-3 bg-blue-50/70 border border-blue-100 rounded-xl text-xs text-blue-700 font-medium">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-600 shrink-0" />
                    <span>Checking fare rate for {selectedModel}...</span>
                  </div>
                ) : selectedModelInfo ? (
                  <div className="flex items-center justify-between p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs">
                    <span className="text-emerald-800 font-medium">Fare rate for {selectedModel}</span>
                    <span className="text-emerald-700 font-bold text-sm">₹{selectedModelInfo.perKmRate}/km</span>
                  </div>
                ) : null}
              </div>
            )}
          </div>

          {/* 3. Specifications (Seats, Fuel) */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100">
              <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Fuel className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Vehicle Specifications</h3>
                <p className="text-[11px] text-slate-500">Seating capacity and fuel type</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
              {/* Seating Capacity */}
              <div className="space-y-1.5 sm:col-span-1">
                <Label htmlFor="seatingCapacityInput" className="text-xs font-semibold text-slate-700 flex items-center justify-between h-5">
                  <span>Seats <span className="text-red-500">*</span></span>
                  <span className="text-[11px] text-slate-400 font-normal">Passengers</span>
                </Label>
                <div className="relative">
                  <Users className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <Input
                    id="seatingCapacityInput"
                    type="number"
                    min="1"
                    max="100"
                    placeholder={selectedVehicleCategory === 'car' ? "4" : "40"}
                    value={formData.seatingCapacity || ''}
                    onChange={(e) => handleFormChange('seatingCapacity', parseInt(e.target.value) || 0)}
                    required
                    className="h-11 pl-9 rounded-xl border-slate-200 bg-slate-50/40 text-sm font-bold text-slate-900 focus:border-blue-600 focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none"
                  />
                </div>
              </div>

              {/* Fuel Type */}
              <div className="space-y-1.5 sm:col-span-1">
                <Label htmlFor="fuelTypeSelect" className="text-xs font-semibold text-slate-700 flex items-center justify-between h-5">
                  <span>Fuel Type <span className="text-red-500">*</span></span>
                  <span className="text-[11px] text-slate-400 font-normal">Fuel category</span>
                </Label>
                <Select
                  value={formData.fuelType}
                  onValueChange={(value) => handleFormChange('fuelType', value)}
                >
                  <SelectTrigger id="fuelTypeSelect" className="h-11 rounded-xl border-slate-200 bg-slate-50/40 text-sm font-medium focus:border-blue-600 focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none capitalize">
                    <SelectValue placeholder="Select fuel type" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200 shadow-lg">
                    {currentOptions.fuelTypes.map((fuel) => (
                      <SelectItem key={fuel.id} value={fuel.id} className="font-medium cursor-pointer">
                        <span className="mr-2">{fuel.icon}</span> {fuel.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* 4. Features & Comfort (Modern Interactive Chips) */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100">
              <div className="w-7 h-7 rounded-lg bg-cyan-50 text-cyan-600 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Features & Comfort</h3>
                <p className="text-[11px] text-slate-500">Tap to toggle AC, Sleeper, and Amenities</p>
              </div>
            </div>

            <div className="space-y-3">
              {/* AC Comfort Selection */}
              <div>
                <Label className="text-xs font-semibold text-slate-700 block mb-2">Air Conditioning</Label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      handleFormChange('isAc', true);
                      const current = formData.amenities || [];
                      if (!current.includes('ac')) handleFormChange('amenities', [...current, 'ac']);
                    }}
                    className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${formData.isAc
                      ? 'border-blue-600 bg-blue-50 text-blue-700 ring-2 ring-blue-500/20'
                      : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100 text-slate-600'
                      }`}
                  >
                    <span>❄️</span>
                    <span>AC Available</span>
                    {formData.isAc && <Check className="w-3.5 h-3.5 ml-auto text-blue-600" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      handleFormChange('isAc', false);
                      const current = formData.amenities || [];
                      handleFormChange('amenities', current.filter(a => a !== 'ac'));
                    }}
                    className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${!formData.isAc
                      ? 'border-blue-600 bg-blue-50 text-blue-700 ring-2 ring-blue-500/20'
                      : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100 text-slate-600'
                      }`}
                  >
                    <span>🚫</span>
                    <span>Non-AC</span>
                    {!formData.isAc && <Check className="w-3.5 h-3.5 ml-auto text-blue-600" />}
                  </button>
                </div>
              </div>

              {/* Sleeper Comfort Selection */}
              <div>
                <Label className="text-xs font-semibold text-slate-700 block mb-2">Seating Type</Label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      handleFormChange('isSleeper', true);
                      const current = formData.amenities || [];
                      if (!current.includes('sleeper')) handleFormChange('amenities', [...current, 'sleeper']);
                    }}
                    className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${formData.isSleeper
                      ? 'border-blue-600 bg-blue-50 text-blue-700 ring-2 ring-blue-500/20'
                      : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100 text-slate-600'
                      }`}
                  >
                    <span>🛏️</span>
                    <span>Sleeper Berths</span>
                    {formData.isSleeper && <Check className="w-3.5 h-3.5 ml-auto text-blue-600" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      handleFormChange('isSleeper', false);
                      const current = formData.amenities || [];
                      handleFormChange('amenities', current.filter(a => a !== 'sleeper'));
                    }}
                    className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${!formData.isSleeper
                      ? 'border-blue-600 bg-blue-50 text-blue-700 ring-2 ring-blue-500/20'
                      : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100 text-slate-600'
                      }`}
                  >
                    <span>💺</span>
                    <span>Standard Seater</span>
                    {!formData.isSleeper && <Check className="w-3.5 h-3.5 ml-auto text-blue-600" />}
                  </button>
                </div>
              </div>

              {/* Amenities - TV */}
              <div>
                <Label className="text-xs font-semibold text-slate-700 block mb-2">Additional Media</Label>
                <button
                  type="button"
                  onClick={() => {
                    const current = formData.amenities || [];
                    if (current.includes('tv')) {
                      handleFormChange('amenities', current.filter(a => a !== 'tv'));
                    } else {
                      handleFormChange('amenities', [...current, 'tv']);
                    }
                  }}
                  className={`flex items-center gap-2.5 py-2.5 px-3.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${formData.amenities?.includes('tv')
                    ? 'border-blue-600 bg-blue-50 text-blue-700 ring-2 ring-blue-500/20'
                    : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100 text-slate-600'
                    }`}
                >
                  <span>📺</span>
                  <span>TV / Entertainment Screen</span>
                  {formData.amenities?.includes('tv') && (
                    <Check className="w-3.5 h-3.5 ml-auto text-blue-600" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* 5. Registration Information */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100">
              <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Registration Information</h3>
                <p className="text-[11px] text-slate-500">Official RTO registration number plate</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="registrationNumberInput" className="text-xs font-semibold text-slate-700">
                Registration Number *
              </Label>
              <div className="relative">
                <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <Input
                  id="registrationNumberInput"
                  placeholder="e.g., DL 01 AB 1234"
                  value={formData.registrationNumber}
                  onChange={(e) => handleFormChange('registrationNumber', e.target.value.toUpperCase())}
                  required
                  className="h-11 pl-9 font-mono uppercase tracking-wider font-bold rounded-xl border-slate-200 bg-slate-50/40 text-sm text-slate-900 focus:border-blue-600 focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none"
                />
              </div>

              {/* Indian Number Plate Styled Live Preview */}
              {formData.registrationNumber && (
                <div className="pt-1 flex items-center gap-2">
                  <span className="text-[11px] text-slate-400 font-medium">Plate Preview:</span>
                  <div className="inline-flex items-center border-2 border-slate-800 rounded-md bg-white overflow-hidden shadow-xs">
                    <div className="bg-blue-700 text-white px-1.5 py-0.5 text-[9px] font-black tracking-tighter flex items-center justify-center border-r border-slate-800">
                      <span>IND</span>
                    </div>
                    <div className="px-2.5 py-0.5 font-mono font-black text-slate-900 tracking-wider text-xs">
                      {formData.registrationNumber}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 6. Vehicle Base Location */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Vehicle Base Location *</h3>
                <p className="text-[11px] text-slate-500">Primary garage or operating city address</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-700">
                Search & Select Base Location *
              </Label>
              <LocationAutocomplete
                value={vehicleLocationInput}
                onChange={setVehicleLocationInput}
                onLocationSelect={handleVehicleLocationSelect}
                placeholder="Type your vehicle's city or address (e.g. Indore, Madhya Pradesh)"
                icon={<MapPin className="w-4 h-4 text-emerald-600" />}
                className="w-full"
                showGetLocation={false}
              />

              {/* Selected Location Pill Card */}
              {formData.vehicleLocation?.address && (
                <div className="p-3 bg-emerald-50/60 border border-emerald-200/70 rounded-xl space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Selected Base Location:</span>
                  </div>
                  <p className="text-xs text-emerald-800 font-medium leading-relaxed">
                    {formData.vehicleLocation.address}
                  </p>
                  {(formData.vehicleLocation.city || formData.vehicleLocation.state) && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {formData.vehicleLocation.city && (
                        <Badge variant="outline" className="bg-white text-[10px] text-emerald-700 border-emerald-300">
                          City: {formData.vehicleLocation.city}
                        </Badge>
                      )}
                      {formData.vehicleLocation.state && (
                        <Badge variant="outline" className="bg-white text-[10px] text-emerald-700 border-emerald-300">
                          State: {formData.vehicleLocation.state}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 7. Vehicle Photos Upload */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Upload className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Vehicle Photos</h3>
                  <p className="text-[11px] text-slate-500">Upload photos (exterior, interior, seats)</p>
                </div>
              </div>
              <Badge variant="secondary" className="font-bold text-xs bg-slate-100 text-slate-700">
                {previewUrls.length + existing.filter(e => !e.markDelete).length} / 10
              </Badge>
            </div>

            {/* Existing Images (in edit mode) */}
            {mode === 'edit' && existing.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-600">Existing Photos</Label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                  {existing.map((img, idx) => (
                    <div key={img._id} className={`relative rounded-xl overflow-hidden border-2 aspect-video group ${img.markDelete ? 'opacity-40 border-red-300' : 'border-slate-200'}`}>
                      <img src={img.url} alt="Vehicle photo" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setExisting(prev => prev.map((e, i) => i === idx ? { ...e, markDelete: !e.markDelete } : e))}
                        className={`absolute top-1 right-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold shadow-xs cursor-pointer ${img.markDelete ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
                          }`}
                      >
                        {img.markDelete ? 'Undo' : 'Delete'}
                      </button>
                      {img.isPrimary && !img.markDelete && (
                        <div className="absolute bottom-1 left-1 bg-blue-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                          Main
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* New Preview Images */}
            {previewUrls.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-600">New Photos Added</Label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                  {previewUrls.map((url, index) => (
                    <div key={index} className="relative rounded-xl overflow-hidden border-2 border-slate-200 aspect-video group shadow-xs">
                      <img
                        src={url}
                        alt={`Vehicle preview ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 opacity-90 hover:opacity-100 transition-opacity cursor-pointer shadow-xs"
                      >
                        <X className="w-3 h-3" />
                      </button>
                      {index === 0 && existing.length === 0 && (
                        <div className="absolute bottom-1 left-1 bg-blue-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                          Main
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upload Area Box */}
            <div
              onClick={() => document.getElementById('addImageInput')?.click()}
              className="border-2 border-dashed border-slate-200 hover:border-blue-400 hover:bg-blue-50/30 rounded-2xl p-6 text-center transition-all cursor-pointer group"
            >
              <div className="w-11 h-11 bg-blue-50 group-hover:bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-2 transition-colors">
                <Camera className="w-5 h-5" />
              </div>
              <p className="text-xs sm:text-sm font-bold text-slate-800 mb-0.5">
                Click here to upload vehicle photos
              </p>
              <p className="text-[11px] text-slate-400">
                Supports JPG, PNG, WebP • Max 5MB per image • Up to 10 photos
              </p>
            </div>

            <input
              id="addImageInput"
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageChange}
              className="hidden"
            />

            {previewUrls.length > 0 && (
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedImages([]);
                    setPreviewUrls([]);
                  }}
                  className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 h-8 font-semibold"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                  Clear newly added photos
                </Button>
              </div>
            )}
          </div>

          {/* 8. Bottom Action Buttons */}
          <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="h-12 flex-1 rounded-xl text-sm font-bold border-slate-300 text-slate-700 hover:bg-slate-100"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-12 flex-1 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-md shadow-blue-500/25 transition-all"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  <span>{mode === 'edit' ? 'Updating Vehicle...' : 'Adding Vehicle...'}</span>
                </>
              ) : (
                <span>{mode === 'edit' ? 'Save Changes' : 'Add Vehicle'}</span>
              )}
            </Button>
          </div>
        </>
      )}
    </form>
  );
};

export default AddVehicleForm;
