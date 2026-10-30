import React, { useState, useEffect } from "react";
import AdminLayout from "../components/AdminLayout";
import {
  SlidersHorizontal,
  Car,
  Bus,
  Plus,
  Edit3,
  Trash2,
  Fuel,
  Gauge,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  DollarSign,
  Search,
  ArrowRight,
  RefreshCw,
  Save,
  Layers,
  Users,
  Briefcase,
  TrendingUp,
  Calendar,
  X,
  Check,
  Zap,
  Info,
  List,
  LayoutGrid,
  Receipt,
  Percent
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import vehicleSettingService, { VehicleVariant, VehicleModelItem, FuelRates } from "@/services/vehicleSettingApi";

const AdminVehicleSettings: React.FC = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>("variants");
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  // Data state
  const [variants, setVariants] = useState<VehicleVariant[]>([]);
  const [models, setModels] = useState<VehicleModelItem[]>([]);
  const [fuelRates, setFuelRates] = useState<FuelRates>({
    petrol: 106.5,
    diesel: 93.5,
    cng: 85.0,
    electric: 15.0
  });

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'car' | 'bus'>('all');
  const [selectedVariantFilter, setSelectedVariantFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>("");

  // View Modes (Table vs Grid)
  const [modelsViewMode, setModelsViewMode] = useState<'table' | 'grid'>('table');
  const [variantsViewMode, setVariantsViewMode] = useState<'table' | 'grid'>('table');

  // Variant Modal State
  const [isVariantModalOpen, setIsVariantModalOpen] = useState<boolean>(false);
  const [editingVariant, setEditingVariant] = useState<VehicleVariant | null>(null);
  const [variantForm, setVariantForm] = useState<Partial<VehicleVariant>>({
    category: 'car',
    name: '',
    isActive: true
  });

  // Model Modal State
  const [isModelModalOpen, setIsModelModalOpen] = useState<boolean>(false);
  const [editingModel, setEditingModel] = useState<VehicleModelItem | null>(null);
  const [modelForm, setModelForm] = useState<Partial<VehicleModelItem>>({
    category: 'car',
    variantName: '',
    brand: '',
    modelName: '',
    seatingCapacity: 4,
    luggageCapacity: 2,
    fuelTypes: ['diesel', 'petrol'],
    defaultFuelType: 'diesel',
    mileage: 18,
    baseFare: 500,
    perKmRate: 12,
    driverAllowancePerDay: 300,
    minKmPerDay: 250,
    isAcDefault: true,
    isActive: true,
    notes: ''
  });

  // Platform Fee (flat ₹ per booking)
  const [platformFee, setPlatformFee] = useState<number>(0);
  const [platformFeeForm, setPlatformFeeForm] = useState<string>("0");

  // Advance % paid online at booking
  const [advancePercentage, setAdvancePercentage] = useState<number>(100);
  const [advanceForm, setAdvanceForm] = useState<string>("100");

  // Fuel Rates Form State
  const [fuelForm, setFuelForm] = useState<FuelRates>({
    petrol: 106.5,
    diesel: 93.5,
    cng: 85.0,
    electric: 15.0
  });

  // Load Data
  const loadData = async () => {
    try {
      setLoading(true);
      const data = await vehicleSettingService.getAdminVehicleSettings();
      setVariants(data.variants || []);
      setModels(data.models || []);
      if (data.fuelRates) {
        setFuelRates(data.fuelRates);
        setFuelForm(data.fuelRates);
      }
      setPlatformFee(data.platformFee || 0);
      setPlatformFeeForm(String(data.platformFee || 0));
      setAdvancePercentage(data.advancePercentage ?? 100);
      setAdvanceForm(String(data.advancePercentage ?? 100));
    } catch (error: any) {
      console.error("Error loading vehicle settings:", error);
      toast({
        title: "Error Loading Settings",
        description: error.message || "Failed to load vehicle configuration.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered Models
  const filteredModels = models.filter(m => {
    const matchesCategory = selectedCategory === 'all' || m.category === selectedCategory;
    const matchesVariant = selectedVariantFilter === 'all' || m.variantName.toLowerCase() === selectedVariantFilter.toLowerCase();
    const matchesSearch = !searchQuery ||
      m.modelName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.variantName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesVariant && matchesSearch;
  });

  // Filtered Variants
  const filteredVariants = variants.filter(v => {
    return selectedCategory === 'all' || v.category === selectedCategory;
  });

  // Open Add/Edit Variant Modal
  const handleOpenVariantModal = (variant?: VehicleVariant) => {
    if (variant) {
      setEditingVariant(variant);
      setVariantForm({
        category: variant.category,
        name: variant.name,
        isActive: variant.isActive
      });
    } else {
      setEditingVariant(null);
      setVariantForm({
        category: selectedCategory === 'bus' ? 'bus' : 'car',
        name: '',
        isActive: true
      });
    }
    setIsVariantModalOpen(true);
  };

  // Save Variant
  const handleSaveVariant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!variantForm.name?.trim()) {
      toast({ title: "Validation Error", description: "Variant name is required.", variant: "destructive" });
      return;
    }

    try {
      setSaving(true);
      if (editingVariant) {
        await vehicleSettingService.updateVariant(editingVariant.id, variantForm);
        toast({ title: "Success", description: `Variant "${variantForm.name}" updated successfully.` });
      } else {
        await vehicleSettingService.createVariant(variantForm);
        toast({ title: "Success", description: `Variant "${variantForm.name}" created successfully.` });
      }
      setIsVariantModalOpen(false);
      await loadData();
    } catch (error: any) {
      toast({
        title: "Action Failed",
        description: error.response?.data?.message || error.message || "Failed to save variant",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  // Delete Variant
  const handleDeleteVariant = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete variant "${name}"?`)) return;
    try {
      await vehicleSettingService.deleteVariant(id);
      toast({ title: "Deleted", description: `Variant "${name}" removed.` });
      await loadData();
    } catch (error: any) {
      toast({
        title: "Delete Failed",
        description: error.response?.data?.message || error.message || "Cannot delete variant",
        variant: "destructive"
      });
    }
  };

  // Open Add/Edit Model Modal
  const handleOpenModelModal = (model?: VehicleModelItem) => {
    if (model) {
      setEditingModel(model);
      setModelForm({
        category: model.category,
        variantName: model.variantName,
        brand: model.brand,
        modelName: model.modelName,
        seatingCapacity: model.seatingCapacity,
        luggageCapacity: model.luggageCapacity || 2,
        fuelTypes: model.fuelTypes || ['diesel', 'petrol'],
        defaultFuelType: model.defaultFuelType || 'diesel',
        mileage: model.mileage || 15,
        baseFare: model.baseFare || 500,
        perKmRate: model.perKmRate || 12,
        driverAllowancePerDay: model.driverAllowancePerDay || 300,
        minKmPerDay: model.minKmPerDay || 250,
        isAcDefault: model.isAcDefault !== undefined ? model.isAcDefault : true,
        isActive: model.isActive !== undefined ? model.isActive : true,
        notes: model.notes || ''
      });
    } else {
      setEditingModel(null);
      const cat = selectedCategory === 'bus' ? 'bus' : 'car';

      setModelForm({
        category: cat,
        variantName: '', // admin picks the body variant first
        brand: '',
        modelName: '',
        seatingCapacity: cat === 'car' ? 4 : 17,
        luggageCapacity: cat === 'car' ? 2 : 10,
        fuelTypes: ['diesel', 'petrol'],
        defaultFuelType: 'diesel',
        mileage: cat === 'car' ? 18 : 9,
        baseFare: cat === 'car' ? 500 : 1500,
        perKmRate: cat === 'car' ? 12 : 24,
        driverAllowancePerDay: cat === 'car' ? 300 : 500,
        minKmPerDay: cat === 'car' ? 250 : 300,
        isAcDefault: true,
        isActive: true,
        notes: ''
      });
    }
    setIsModelModalOpen(true);
  };

  // Save Model
  const handleSaveModel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modelForm.brand?.trim() || !modelForm.modelName?.trim() || !modelForm.variantName) {
      toast({ title: "Validation Error", description: "Body Variant, Brand and Model Name are required.", variant: "destructive" });
      return;
    }
    if (!modelForm.perKmRate || modelForm.perKmRate <= 0) {
      toast({ title: "Validation Error", description: "Price per KM must be greater than 0.", variant: "destructive" });
      return;
    }

    try {
      setSaving(true);
      if (editingModel) {
        await vehicleSettingService.updateModel(editingModel.id, modelForm);
        toast({ title: "Success", description: `Model "${modelForm.modelName}" updated successfully.` });
      } else {
        await vehicleSettingService.createModel(modelForm);
        toast({ title: "Success", description: `Model "${modelForm.modelName}" created successfully.` });
      }
      setIsModelModalOpen(false);
      await loadData();
    } catch (error: any) {
      toast({
        title: "Action Failed",
        description: error.response?.data?.message || error.message || "Failed to save model",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  // Delete Model
  const handleDeleteModel = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete vehicle model "${name}"?`)) return;
    try {
      await vehicleSettingService.deleteModel(id);
      toast({ title: "Deleted", description: `Model "${name}" removed.` });
      await loadData();
    } catch (error: any) {
      toast({
        title: "Delete Failed",
        description: error.response?.data?.message || error.message || "Failed to delete model",
        variant: "destructive"
      });
    }
  };

  // Save Fuel Rates
  const handleSaveFuelRates = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const updated = await vehicleSettingService.updateFuelRates(fuelForm);
      setFuelRates(updated);
      toast({ title: "Fuel Rates Updated", description: "Live fuel prices updated across calculations." });
    } catch (error: any) {
      toast({
        title: "Update Failed",
        description: error.response?.data?.message || error.message || "Failed to update fuel rates",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  // Save Platform Fee
  const handleSavePlatformFee = async (e: React.FormEvent) => {
    e.preventDefault();
    const fee = Number(platformFeeForm);
    if (!Number.isFinite(fee) || fee < 0) {
      toast({ title: "Validation Error", description: "Platform fee must be 0 or more.", variant: "destructive" });
      return;
    }
    try {
      setSaving(true);
      const updated = await vehicleSettingService.updatePlatformFee(fee);
      setPlatformFee(updated.platformFee);
      setPlatformFeeForm(String(updated.platformFee));
      toast({ title: "Platform Fee Updated", description: `Users will now pay ₹${updated.platformFee} platform fee per booking.` });
    } catch (error: any) {
      toast({
        title: "Update Failed",
        description: error.response?.data?.message || error.message || "Failed to update platform fee",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  // Save Advance Percentage
  const handleSaveAdvance = async (e: React.FormEvent) => {
    e.preventDefault();
    const pct = Number(advanceForm);
    if (!Number.isFinite(pct) || pct < 1 || pct > 100) {
      toast({ title: "Validation Error", description: "Advance must be between 1% and 100%.", variant: "destructive" });
      return;
    }
    try {
      setSaving(true);
      const updated = await vehicleSettingService.updateAdvancePercentage(pct);
      setAdvancePercentage(updated.advancePercentage);
      setAdvanceForm(String(updated.advancePercentage));
      toast({ title: "Advance Updated", description: `Users will now pay ${updated.advancePercentage}% online at booking.` });
    } catch (error: any) {
      toast({
        title: "Update Failed",
        description: error.response?.data?.message || error.message || "Failed to update advance percentage",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6 pb-12">
        {/* Top Header & Page Title */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold mb-2">
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Fleet & Vehicle Engine</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Vehicle Settings & Variants
            </h1>

          </div>
        </div>

        {/* Quick Metric Stats Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
              <span>Variants</span>
              <Layers className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{variants.length}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Sedan, SUV, Bus, etc.</div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
              <span>Vehicle Models</span>
              <Car className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{models.length}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">With per KM price</div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
              <span>Diesel Rate</span>
              <Fuel className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-1">₹{fuelRates.diesel} <span className="text-xs font-normal text-slate-400">/L</span></div>
            <div className="text-[11px] text-slate-400 mt-0.5">Petrol: ₹{fuelRates.petrol}/L</div>
          </div>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white border border-slate-200 p-1 rounded-2xl h-auto w-full sm:w-auto grid grid-cols-2 sm:inline-flex shadow-xs">
            <TabsTrigger
              value="variants"
              className="rounded-xl data-[state=active]:bg-blue-600 data-[state=active]:text-white font-semibold text-xs sm:text-sm px-4 py-2.5 transition-all"
            >
              <Layers className="w-4 h-4 mr-2 hidden sm:inline-block" />
              <span>Body Variants</span>
            </TabsTrigger>

            <TabsTrigger
              value="models"
              className="rounded-xl data-[state=active]:bg-blue-600 data-[state=active]:text-white font-semibold text-xs sm:text-sm px-4 py-2.5 transition-all"
            >
              <Car className="w-4 h-4 mr-2 hidden sm:inline-block" />
              <span>Vehicle Models</span>
            </TabsTrigger>

            <TabsTrigger
              value="fuel"
              className="rounded-xl data-[state=active]:bg-blue-600 data-[state=active]:text-white font-semibold text-xs sm:text-sm px-4 py-2.5 transition-all"
            >
              <Fuel className="w-4 h-4 mr-2 hidden sm:inline-block" />
              <span>Fuel Prices</span>
            </TabsTrigger>

            <TabsTrigger
              value="platform-fee"
              className="rounded-xl data-[state=active]:bg-blue-600 data-[state=active]:text-white font-semibold text-xs sm:text-sm px-4 py-2.5 transition-all"
            >
              <Receipt className="w-4 h-4 mr-2 hidden sm:inline-block" />
              <span>Platform Fee</span>
            </TabsTrigger>

            <TabsTrigger
              value="advance"
              className="rounded-xl data-[state=active]:bg-blue-600 data-[state=active]:text-white font-semibold text-xs sm:text-sm px-4 py-2.5 transition-all"
            >
              <Percent className="w-4 h-4 mr-2 hidden sm:inline-block" />
              <span>Advance Setting</span>
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: VEHICLE MODELS MANAGEMENT */}
          <TabsContent value="models" className="space-y-5">
            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                {/* Category Filter */}
                <div className="flex bg-slate-100 p-1 rounded-xl">
                  <button
                    onClick={() => setSelectedCategory('all')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${selectedCategory === 'all' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                  >
                    All ({models.length})
                  </button>
                  <button
                    onClick={() => setSelectedCategory('car')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1 ${selectedCategory === 'car' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                  >
                    <span>🚗 Cars</span>
                  </button>
                  <button
                    onClick={() => setSelectedCategory('bus')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1 ${selectedCategory === 'bus' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                  >
                    <span>🚌 Buses</span>
                  </button>
                </div>

                {/* Variant Filter */}
                <Select value={selectedVariantFilter} onValueChange={setSelectedVariantFilter}>
                  <SelectTrigger className="h-9 w-40 rounded-xl border-slate-200 text-xs font-medium bg-white">
                    <SelectValue placeholder="All Variants" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200">
                    <SelectItem value="all">All Variants</SelectItem>
                    {variants
                      .filter(v => selectedCategory === 'all' || v.category === selectedCategory)
                      .map(v => (
                        <SelectItem key={v.id} value={v.name}>{v.name}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Search Box & View Mode Toggle */}
              <div className="flex items-center gap-2 w-full md:w-auto">
                <div className="relative w-full md:w-64">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    placeholder="Search model, brand..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9.5 text-xs rounded-xl border-slate-200 bg-slate-50/50"
                  />
                </div>

                {/* View Toggle (Table / Grid) */}
                <div className="flex bg-slate-100 p-1 rounded-xl shrink-0">
                  <button
                    onClick={() => setModelsViewMode('table')}
                    className={`p-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${modelsViewMode === 'table'
                      ? 'bg-white text-blue-600 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                      }`}
                    title="Table View with Headers"
                  >
                    <List className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setModelsViewMode('grid')}
                    className={`p-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${modelsViewMode === 'grid'
                      ? 'bg-white text-blue-600 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                      }`}
                    title="Card Grid View"
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                </div>

                <Button
                  onClick={() => handleOpenModelModal()}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs h-9.5 px-4 rounded-xl shadow-xs cursor-pointer shrink-0"
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  <span>Add Vehicle Model</span>
                </Button>
              </div>
            </div>

            {/* Models Table / Grid */}
            {loading ? (
              <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 text-slate-400">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                <span>Loading vehicle models...</span>
              </div>
            ) : filteredModels.length === 0 ? (
              <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 text-slate-500">
                <Car className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                <h3 className="font-bold text-slate-800">No vehicle models found</h3>
                <p className="text-xs text-slate-400 mt-1">Try changing filters or add a new model</p>
              </div>
            ) : modelsViewMode === 'table' ? (
              /* TABLE VIEW WITH HEADERS */
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-50/90 border-b border-slate-200">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="font-bold text-slate-700 py-3.5 px-4 text-xs">Vehicle Model & Brand</TableHead>
                        <TableHead className="font-bold text-slate-700 py-3.5 px-4 text-xs">Category & Variant</TableHead>
                        <TableHead className="font-bold text-slate-700 py-3.5 px-4 text-xs">Pricing Rate</TableHead>
                        <TableHead className="font-bold text-slate-700 py-3.5 px-4 text-xs text-center">Status</TableHead>
                        <TableHead className="font-bold text-slate-700 py-3.5 px-4 text-xs text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredModels.map((model) => (
                        <TableRow key={model.id} className="hover:bg-blue-50/40 transition-colors border-b border-slate-100">
                          {/* Model & Brand */}
                          <TableCell className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0">
                                {model.category === 'bus' ? <Bus className="w-4 h-4" /> : <Car className="w-4 h-4" />}
                              </div>
                              <div>
                                <div className="font-bold text-sm text-slate-900 leading-tight">{model.modelName}</div>
                                <div className="text-xs text-slate-500 font-medium">{model.brand}</div>
                              </div>
                            </div>
                          </TableCell>

                          {/* Category & Variant */}
                          <TableCell className="py-3.5 px-4">
                            <div className="flex items-center gap-1.5">
                              <Badge variant="outline" className="text-[11px] font-bold bg-blue-50 text-blue-700 border-blue-200">
                                {model.variantName}
                              </Badge>
                              <Badge variant="outline" className="text-[10px] font-semibold bg-slate-100 text-slate-600 border-slate-200 uppercase">
                                {model.category}
                              </Badge>
                            </div>
                          </TableCell>

                          {/* Pricing Rate */}
                          <TableCell className="py-3.5 px-4">
                            <div>
                              <div className="font-bold text-slate-900 text-xs flex items-center">
                                <span className="text-blue-600 font-extrabold text-sm">₹{model.perKmRate}</span>
                                <span className="text-slate-500 font-medium ml-0.5">/km</span>
                              </div>
                            </div>
                          </TableCell>

                          {/* Status */}
                          <TableCell className="py-3.5 px-4 text-center">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Ready
                            </span>
                          </TableCell>

                          {/* Actions */}
                          <TableCell className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenModelModal(model)}
                                className="h-8 w-8 p-0 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 cursor-pointer"
                                title="Edit Model"
                              >
                                <Edit3 className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteModel(model.id, model.modelName)}
                                className="h-8 w-8 p-0 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                                title="Delete Model"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ) : (
              /* CARD GRID VIEW */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredModels.map((model) => (
                  <div
                    key={model.id}
                    className="bg-white rounded-2xl border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all p-5 flex flex-col justify-between space-y-4 group"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5 mb-1">
                            <Badge variant="outline" className="text-[10px] font-bold bg-blue-50 text-blue-700 border-blue-200 uppercase tracking-wide">
                              {model.variantName}
                            </Badge>
                            <Badge variant="outline" className="text-[10px] font-semibold bg-slate-50 text-slate-600 border-slate-200">
                              {model.category.toUpperCase()}
                            </Badge>
                          </div>
                          <h3 className="font-bold text-base text-slate-900 group-hover:text-blue-600 transition-colors">
                            {model.modelName}
                          </h3>
                          <p className="text-xs text-slate-500">{model.brand}</p>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleOpenModelModal(model)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                            title="Edit Model"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteModel(model.id, model.modelName)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                            title="Delete Model"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Specs Tags */}
                      <div className="mt-4 pt-3 border-t border-slate-100 text-xs">
                        <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50">
                          <DollarSign className="w-4 h-4 text-amber-600 shrink-0" />
                          <div>
                            <div className="text-[10px] text-slate-400 font-medium">Per KM Rate</div>
                            <div className="font-bold text-slate-800">₹{model.perKmRate}/km</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-end text-xs text-slate-400">
                      <span className="flex items-center gap-1 font-medium text-emerald-600">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Ready for Booking
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* TAB 2: VARIANTS MANAGEMENT */}
          <TabsContent value="variants" className="space-y-5">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Vehicle Body Variants</h3>
                  <p className="text-xs text-slate-500">Categories and body classifications for fleet pricing</p>
                </div>
                <div className="flex items-center gap-2">
                  {/* View Toggle */}
                  <div className="flex bg-slate-100 p-1 rounded-xl shrink-0">
                    <button
                      onClick={() => setVariantsViewMode('table')}
                      className={`p-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${variantsViewMode === 'table'
                        ? 'bg-white text-blue-600 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                        }`}
                      title="Table View with Headers"
                    >
                      <List className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setVariantsViewMode('grid')}
                      className={`p-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${variantsViewMode === 'grid'
                        ? 'bg-white text-blue-600 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                        }`}
                      title="Card Grid View"
                    >
                      <LayoutGrid className="w-4 h-4" />
                    </button>
                  </div>
                  <Button
                    onClick={() => handleOpenVariantModal()}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add Variant
                  </Button>
                </div>
              </div>

              {filteredVariants.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  <Layers className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                  <h4 className="font-bold text-slate-700">No body variants configured</h4>
                  <p className="text-xs text-slate-400 mt-1">Add your first vehicle variant like Sedan, SUV, etc.</p>
                </div>
              ) : variantsViewMode === 'table' ? (
                /* VARIANTS TABLE VIEW WITH HEADERS */
                <div className="rounded-xl border border-slate-200 overflow-hidden mt-4">
                  <Table>
                    <TableHeader className="bg-slate-50/90 border-b border-slate-200">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="font-bold text-slate-700 py-3.5 px-4 text-xs">Body Variant</TableHead>
                        <TableHead className="font-bold text-slate-700 py-3.5 px-4 text-xs">Category</TableHead>
                        <TableHead className="font-bold text-slate-700 py-3.5 px-4 text-xs">Attached Vehicle Models</TableHead>
                        <TableHead className="font-bold text-slate-700 py-3.5 px-4 text-xs text-center">Status</TableHead>
                        <TableHead className="font-bold text-slate-700 py-3.5 px-4 text-xs text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredVariants.map((variant) => {
                        const associatedModels = models.filter(m => m.variantName === variant.name);
                        return (
                          <TableRow key={variant.id} className="hover:bg-blue-50/40 transition-colors border-b border-slate-100">
                            <TableCell className="py-3.5 px-4">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center font-bold text-sm shrink-0">
                                  {variant.category === 'bus' ? <Bus className="w-4 h-4" /> : <Car className="w-4 h-4" />}
                                </div>
                                <div>
                                  <div className="font-bold text-sm text-slate-900 leading-tight">{variant.name}</div>
                                  <div className="text-xs text-slate-400">{variant.description || `${variant.name} Body Type`}</div>
                                </div>
                              </div>
                            </TableCell>

                            <TableCell className="py-3.5 px-4">
                              <Badge variant="outline" className="text-[11px] font-bold bg-blue-50 text-blue-700 border-blue-200 uppercase">
                                {variant.category}
                              </Badge>
                            </TableCell>

                            <TableCell className="py-3.5 px-4">
                              <span className="text-xs font-semibold text-slate-700">
                                {associatedModels.length} models attached
                              </span>
                            </TableCell>

                            <TableCell className="py-3.5 px-4 text-center">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Active
                              </span>
                            </TableCell>

                            <TableCell className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleOpenVariantModal(variant)}
                                  className="h-8 w-8 p-0 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 cursor-pointer"
                                  title="Edit Variant"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteVariant(variant.id, variant.name)}
                                  className="h-8 w-8 p-0 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                                  title="Delete Variant"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                /* VARIANTS CARD GRID VIEW */
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
                  {filteredVariants.map((variant) => {
                    const associatedModels = models.filter(m => m.variantName === variant.name);
                    return (
                      <div
                        key={variant.id}
                        className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-blue-300 hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                      >
                        <div>
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center font-bold text-sm">
                                {variant.category === 'bus' ? <Bus className="w-5 h-5" /> : <Car className="w-5 h-5" />}
                              </div>
                              <div>
                                <h4 className="font-bold text-base text-slate-900">{variant.name}</h4>
                                <span className="text-[11px] font-semibold text-blue-600 uppercase tracking-wide">
                                  {variant.category.toUpperCase()} CATEGORY
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleOpenVariantModal(variant)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                                title="Edit Variant"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteVariant(variant.id, variant.name)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                                title="Delete Variant"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-xs font-semibold">
                          <span className="text-slate-500">{associatedModels.length} models attached</span>
                          <span className="text-emerald-600 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Active
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </TabsContent>

          {/* TAB 3: FUEL PRICE MANAGEMENT */}
          <TabsContent value="fuel" className="space-y-5">
            <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs max-w-3xl space-y-6">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-semibold mb-2">
                  <Fuel className="w-3.5 h-3.5" />
                  <span>Market Fuel Pricing</span>
                </div>
                <h3 className="text-xl font-bold text-slate-900">Current Fuel Price Rates</h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Set live fuel prices to calculate accurate trip fuel expenses and operator profits.
                </p>
              </div>

              <form onSubmit={handleSaveFuelRates} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Petrol */}
                  <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-2">
                    <Label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <span>⛽ Petrol Rate (₹/Litre)</span>
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                      <Input
                        type="number"
                        step="0.1"
                        value={fuelForm.petrol}
                        onChange={(e) => setFuelForm({ ...fuelForm, petrol: Number(e.target.value) })}
                        className="pl-8 h-11 text-base font-bold bg-white rounded-xl border-slate-300"
                        required
                      />
                    </div>
                  </div>

                  {/* Diesel */}
                  <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-2">
                    <Label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <span>🛢️ Diesel Rate (₹/Litre)</span>
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                      <Input
                        type="number"
                        step="0.1"
                        value={fuelForm.diesel}
                        onChange={(e) => setFuelForm({ ...fuelForm, diesel: Number(e.target.value) })}
                        className="pl-8 h-11 text-base font-bold bg-white rounded-xl border-slate-300"
                        required
                      />
                    </div>
                  </div>

                  {/* CNG */}
                  <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-2">
                    <Label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <span>💨 CNG Rate (₹/KG)</span>
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                      <Input
                        type="number"
                        step="0.1"
                        value={fuelForm.cng}
                        onChange={(e) => setFuelForm({ ...fuelForm, cng: Number(e.target.value) })}
                        className="pl-8 h-11 text-base font-bold bg-white rounded-xl border-slate-300"
                        required
                      />
                    </div>
                  </div>

                  {/* Electric */}
                  <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-2">
                    <Label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <span>⚡ Electric Rate (₹/kWh)</span>
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                      <Input
                        type="number"
                        step="0.1"
                        value={fuelForm.electric}
                        onChange={(e) => setFuelForm({ ...fuelForm, electric: Number(e.target.value) })}
                        className="pl-8 h-11 text-base font-bold bg-white rounded-xl border-slate-300"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <div className="text-xs text-slate-400">
                    Last updated: {fuelRates.lastUpdated ? new Date(fuelRates.lastUpdated).toLocaleString() : 'Recently'}
                  </div>
                  <Button
                    type="submit"
                    disabled={saving}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs h-11 px-6 shadow-xs cursor-pointer"
                  >
                    {saving ? "Updating..." : "Save Fuel Prices"}
                  </Button>
                </div>
              </form>
            </div>
          </TabsContent>

          {/* TAB 4: PLATFORM FEE */}
          <TabsContent value="platform-fee" className="space-y-5">
            <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs max-w-3xl space-y-6">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold mb-2">
                  <Receipt className="w-3.5 h-3.5" />
                  <span>Booking Charges</span>
                </div>
                <h3 className="text-xl font-bold text-slate-900">Platform Fee</h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  This flat amount is added to every booking and shown to the user at checkout. Set 0 to turn it off.
                </p>
              </div>

              <form onSubmit={handleSavePlatformFee} className="space-y-6">
                <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-2 max-w-sm">
                  <Label className="text-xs font-bold text-slate-700">Platform Fee per Booking (₹)</Label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                    <Input
                      type="number"
                      min={0}
                      step="1"
                      value={platformFeeForm}
                      onChange={(e) => setPlatformFeeForm(e.target.value)}
                      className="pl-8 h-11 text-base font-bold bg-white rounded-xl border-slate-300"
                      required
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <div className="text-xs text-slate-400">
                    Current fee: <span className="font-semibold text-slate-700">₹{platformFee}</span> per booking
                  </div>
                  <Button
                    type="submit"
                    disabled={saving}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs h-11 px-6 shadow-xs cursor-pointer"
                  >
                    {saving ? "Updating..." : "Save Platform Fee"}
                  </Button>
                </div>
              </form>
            </div>
          </TabsContent>

          {/* TAB 5: ADVANCE SETTING */}
          <TabsContent value="advance" className="space-y-5">
            <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs max-w-3xl space-y-6">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold mb-2">
                  <Percent className="w-3.5 h-3.5" />
                  <span>Booking Payment</span>
                </div>
                <h3 className="text-xl font-bold text-slate-900">Advance Payment</h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Share of the booking total the user pays online while booking. The rest is paid to the driver in cash. Set 100% for full online payment.
                </p>
              </div>

              <form onSubmit={handleSaveAdvance} className="space-y-6">
                <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-2 max-w-sm">
                  <Label className="text-xs font-bold text-slate-700">Advance at Booking (%)</Label>
                  <div className="relative">
                    <Input
                      type="number"
                      min={1}
                      max={100}
                      step="1"
                      value={advanceForm}
                      onChange={(e) => setAdvanceForm(e.target.value)}
                      className="pr-9 h-11 text-base font-bold bg-white rounded-xl border-slate-300"
                      required
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</span>
                  </div>
                  {Number(advanceForm) >= 1 && Number(advanceForm) <= 100 && (
                    <p className="text-[11px] text-slate-500">
                      Example: on a ₹1,000 booking the user pays ₹{Math.round(1000 * Number(advanceForm) / 100)} online
                      {Number(advanceForm) < 100 ? ` and ₹${1000 - Math.round(1000 * Number(advanceForm) / 100)} cash to the driver` : ''}.
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <div className="text-xs text-slate-400">
                    Current: <span className="font-semibold text-slate-700">{advancePercentage}%</span> online at booking
                  </div>
                  <Button
                    type="submit"
                    disabled={saving}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs h-11 px-6 shadow-xs cursor-pointer"
                  >
                    {saving ? "Updating..." : "Save Advance Setting"}
                  </Button>
                </div>
              </form>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* MODAL 1: ADD / EDIT VARIANT */}
      <Dialog open={isVariantModalOpen} onOpenChange={setIsVariantModalOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>{editingVariant ? "Edit Vehicle Variant" : "Create New Vehicle Variant"}</DialogTitle>
            <DialogDescription>Define a vehicle classification (e.g. Sedan, SUV, Luxury Bus).</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveVariant} className="space-y-4">
            {/* Category */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Category</Label>
              <Select
                value={variantForm.category}
                onValueChange={(val: any) => setVariantForm({ ...variantForm, category: val })}
              >
                <SelectTrigger className="h-10 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="car">Car</SelectItem>
                  <SelectItem value="bus">Bus</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Name */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Variant Name *</Label>
              <Input
                placeholder="e.g. Sedan, SUV, Hatchback, Traveller"
                value={variantForm.name}
                onChange={(e) => setVariantForm({ ...variantForm, name: e.target.value })}
                required
                className="h-10 rounded-xl"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsVariantModalOpen(false)} className="rounded-xl">
                Cancel
              </Button>
              <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl">
                {saving ? "Saving..." : editingVariant ? "Update Variant" : "Create Variant"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: ADD / EDIT VEHICLE MODEL */}
      <Dialog open={isModelModalOpen} onOpenChange={setIsModelModalOpen}>
        <DialogContent className="max-w-xl rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingModel ? "Edit Vehicle Model" : "Add Vehicle Model"}</DialogTitle>
            <DialogDescription>Select a body variant, then add the model and its price per KM.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveModel} className="space-y-4">
            {/* Step 1: Vehicle Type */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Vehicle Type *</Label>
              <div className="grid grid-cols-2 gap-2">
                {(['car', 'bus'] as const).map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => cat !== modelForm.category && setModelForm({ ...modelForm, category: cat, variantName: '' })}
                    className={`h-10 rounded-xl border text-sm font-semibold transition-all cursor-pointer ${modelForm.category === cat
                      ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300'
                      }`}
                  >
                    {cat === 'car' ? '🚗 Car' : '🚌 Bus'}
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2: Body Variant (only this vehicle type's variants) */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Body Variant *</Label>
              <Select
                value={modelForm.variantName || undefined}
                onValueChange={(val) => setModelForm({ ...modelForm, variantName: val })}
              >
                <SelectTrigger className="h-10 rounded-xl">
                  <SelectValue placeholder={modelForm.category === 'bus' ? 'Select bus body variant' : 'Select car body variant (Sedan, SUV...)'} />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {variants
                    .filter(v => v.category === modelForm.category && v.isActive !== false)
                    .map(v => (
                      <SelectItem key={v.id} value={v.name}>{v.name}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {!variants.some(v => v.category === modelForm.category) && (
                <p className="text-[11px] text-amber-600">
                  No {modelForm.category === 'bus' ? 'bus' : 'car'} body variants yet. Add one from the Body Variants tab first.
                </p>
              )}
            </div>

            {/* Step 3: Model details & price (after variant is chosen) */}
            {modelForm.variantName && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Brand / Manufacturer *</Label>
                    <Input
                      placeholder="e.g. Maruti Suzuki, Toyota, Force"
                      value={modelForm.brand}
                      onChange={(e) => setModelForm({ ...modelForm, brand: e.target.value })}
                      required
                      className="h-10 rounded-xl"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Model Name *</Label>
                    <Input
                      placeholder="e.g. Swift Dzire, Innova Crysta"
                      value={modelForm.modelName}
                      onChange={(e) => setModelForm({ ...modelForm, modelName: e.target.value })}
                      required
                      className="h-10 rounded-xl"
                    />
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-emerald-50/60 border border-emerald-200">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-emerald-900">Price per KM (₹) *</Label>
                    <Input
                      type="number"
                      step="0.5"
                      min={1}
                      placeholder="e.g. 12"
                      value={modelForm.perKmRate}
                      onChange={(e) => setModelForm({ ...modelForm, perKmRate: Number(e.target.value) })}
                      required
                      className="h-10 rounded-xl font-bold bg-white text-emerald-900"
                    />
                    <p className="text-[10px] text-emerald-700">Fare = distance × this rate, for every driver vehicle of this model</p>
                  </div>
                </div>
              </>
            )}

            <DialogFooter className="pt-3 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={() => setIsModelModalOpen(false)} className="rounded-xl">
                Cancel
              </Button>
              <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl">
                {saving ? "Saving..." : editingModel ? "Update Model" : "Create Vehicle Model"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminVehicleSettings;
