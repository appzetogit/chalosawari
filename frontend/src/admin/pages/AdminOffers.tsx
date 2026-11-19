

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "@/admin/components/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { 
  Plus, 
  Edit, 
  Trash2, 
  Tag, 
  Car,
  Bus
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { offerApi, type Offer, type OfferStats } from "@/services/offerApi";

const OfferVehicleIcon = ({ vehicleType, isMobile = false }: { vehicleType?: string; isMobile?: boolean }) => {
  const type = vehicleType?.toLowerCase();

  if (type === 'car') {
    return (
      <div className={`w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-sky-50 to-indigo-50 p-4 ${isMobile ? 'border-b border-blue-100' : 'border-r border-blue-100'}`}>
        <div className="w-14 h-14 rounded-2xl bg-white shadow-sm border border-blue-100 flex items-center justify-center text-blue-600 transition-transform group-hover:scale-105">
          <Car className="h-7 w-7 text-blue-600" />
        </div>
        <span className="text-xs font-bold text-blue-700 mt-2 tracking-wider uppercase">Car Offer</span>
      </div>
    );
  }

  if (type === 'bus') {
    return (
      <div className={`w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100/70 p-4 ${isMobile ? 'border-b border-amber-100' : 'border-r border-amber-100'}`}>
        <div className="w-14 h-14 rounded-2xl bg-white shadow-sm border border-amber-100 flex items-center justify-center text-amber-600 transition-transform group-hover:scale-105">
          <Bus className="h-7 w-7 text-orange-600" />
        </div>
        <span className="text-xs font-bold text-amber-700 mt-2 tracking-wider uppercase">Bus Offer</span>
      </div>
    );
  }

  return (
    <div className={`w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-emerald-50 via-teal-50 to-green-50 p-4 ${isMobile ? 'border-b border-emerald-100' : 'border-r border-emerald-100'}`}>
      <div className="w-14 h-14 rounded-2xl bg-white shadow-sm border border-emerald-100 flex items-center justify-center text-emerald-600 gap-1.5 transition-transform group-hover:scale-105">
        <Car className="h-5 w-5 text-emerald-600" />
        <Bus className="h-5 w-5 text-emerald-600" />
      </div>
      <span className="text-xs font-bold text-emerald-700 mt-2 tracking-wider uppercase">All Bookings</span>
    </div>
  );
};



const AdminOffers = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAdminAuth();
  
  // Offers state
  const [offers, setOffers] = useState<Offer[]>([]);
  const [isOfferDialogOpen, setIsOfferDialogOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
  const [isLoadingOffers, setIsLoadingOffers] = useState(false);
  const [stats, setStats] = useState<OfferStats>({
    totalOffers: 0,
    activeOffers: 0,
    inactiveOffers: 0
  });

  // Form states
  const emptyForm = {
    title: "",
    description: "",
    code: "",
    discountType: "percent" as 'percent' | 'flat',
    discountValue: "",
    maxDiscount: "",
    minBookingAmount: "",
    usageLimit: "",
    perUserLimit: "",
    vehicleType: "all" as 'all' | 'car' | 'bus',
    validTill: ""
  };
  const [offerForm, setOfferForm] = useState(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      loadOffers();
      loadStats();
    }
  }, [isAuthenticated]);

  const loadOffers = async () => {
    try {
      setIsLoadingOffers(true);
      const response = await offerApi.getAllOffers();
      if (response.success && Array.isArray(response.data)) {
        setOffers(response.data as Offer[]);
      }
    } catch (error) {
      console.error('Error loading offers:', error);
      toast({
        title: "Error",
        description: "Failed to load offers. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoadingOffers(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await offerApi.getOfferStats();
      if (response.success) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleOfferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!offerForm.title.trim()) {
      toast({
        title: "Error",
        description: "Please enter an offer title.",
        variant: "destructive"
      });
      return;
    }

    if (!/^[A-Za-z0-9]{3,20}$/.test(offerForm.code.trim())) {
      toast({ title: "Error", description: "Coupon code must be 3-20 letters or digits.", variant: "destructive" });
      return;
    }

    if (!(Number(offerForm.discountValue) > 0) || (offerForm.discountType === 'percent' && Number(offerForm.discountValue) > 100)) {
      toast({ title: "Error", description: "Enter a valid discount (percent must be 1-100).", variant: "destructive" });
      return;
    }

    const fields = {
      title: offerForm.title.trim(),
      description: offerForm.description.trim(),
      code: offerForm.code.trim().toUpperCase(),
      discountType: offerForm.discountType,
      discountValue: Number(offerForm.discountValue),
      maxDiscount: Number(offerForm.maxDiscount) || 0,
      minBookingAmount: Number(offerForm.minBookingAmount) || 0,
      usageLimit: Number(offerForm.usageLimit) || 0,
      perUserLimit: Number(offerForm.perUserLimit) || 0,
      vehicleType: offerForm.vehicleType,
      validTill: offerForm.validTill
    };

    setIsSubmitting(true);
    try {
      if (editingOffer) {
        // Update existing offer
        await offerApi.updateOffer(editingOffer._id, fields);
        toast({
          title: "Success",
          description: "Offer has been updated successfully.",
        });
      } else {
        // Create new offer
        await offerApi.createOffer(fields);
        toast({
          title: "Success",
          description: "New offer has been created successfully.",
        });
      }
      
      resetOfferForm();
      setIsOfferDialogOpen(false);
      loadOffers(); // Reload offers
      loadStats(); // Reload stats
    } catch (error) {
      console.error('Error saving offer:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save offer. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetOfferForm = () => {
    setOfferForm(emptyForm);
    setEditingOffer(null);
  };

  const editOffer = (offer: Offer) => {
    setEditingOffer(offer);
    setOfferForm({
      title: offer.title,
      description: offer.description || "",
      code: offer.code || "",
      discountType: offer.discountType || "percent",
      discountValue: offer.discountValue ? String(offer.discountValue) : "",
      maxDiscount: offer.maxDiscount ? String(offer.maxDiscount) : "",
      minBookingAmount: offer.minBookingAmount ? String(offer.minBookingAmount) : "",
      usageLimit: offer.usageLimit ? String(offer.usageLimit) : "",
      perUserLimit: offer.perUserLimit ? String(offer.perUserLimit) : "",
      vehicleType: offer.vehicleType || "all",
      validTill: offer.validTill ? offer.validTill.slice(0, 10) : ""
    });
    setIsOfferDialogOpen(true);
  };

  const deleteOffer = async (id: string) => {
    try {
      await offerApi.deleteOffer(id);
      toast({
        title: "Success",
        description: "Offer has been deleted successfully.",
      });
      loadOffers(); // Reload offers
      loadStats(); // Reload stats
    } catch (error) {
      console.error('Error deleting offer:', error);
      toast({
        title: "Error",
        description: "Failed to delete offer. Please try again.",
        variant: "destructive"
      });
    }
  };





  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Validating admin access...</p>
        </div>
      </div>
    );
  }

  // Redirect if not authenticated
  if (!isAuthenticated) {
    navigate('/admin-auth');
    return null;
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Offers Management</h1>
            <p className="text-muted-foreground">
              Manage promotional offers for your users
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
          <Card>
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center space-x-2">
                <Tag className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs md:text-sm font-medium truncate">Total Offers</p>
                  <p className="text-xl md:text-2xl font-bold">{offers.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center space-x-2">
                <Tag className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs md:text-sm font-medium truncate">Active Offers</p>
                  <p className="text-xl md:text-2xl font-bold">{offers.filter(o => o.isActive).length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="col-span-2 md:col-span-1">
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center space-x-2">
                <Tag className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs md:text-sm font-medium truncate">Expired Offers</p>
                  <p className="text-xl md:text-2xl font-bold">
                    {stats.inactiveOffers}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Offers Section */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <h2 className="text-lg md:text-xl font-semibold">Manage Offers</h2>
            <Dialog open={isOfferDialogOpen} onOpenChange={setIsOfferDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => resetOfferForm()} className="w-full sm:w-auto">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Offer
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingOffer ? "Edit Offer" : "Create New Offer"}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleOfferSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      value={offerForm.title}
                      onChange={(e) => setOfferForm({...offerForm, title: e.target.value})}
                      placeholder="e.g. Flat 10% OFF"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Short Description</Label>
                    <Input
                      id="description"
                      value={offerForm.description}
                      onChange={(e) => setOfferForm({ ...offerForm, description: e.target.value })}
                      placeholder="e.g. On Bus Bookings"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="code">Coupon Code *</Label>
                      <Input
                        id="code"
                        value={offerForm.code}
                        onChange={(e) => setOfferForm({ ...offerForm, code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') })}
                        placeholder="e.g. BUS10"
                        maxLength={20}
                        className="font-mono uppercase"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Applies To</Label>
                      <select
                        value={offerForm.vehicleType}
                        onChange={(e) => setOfferForm({ ...offerForm, vehicleType: e.target.value as 'all' | 'car' | 'bus' })}
                        className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                      >
                        <option value="all">All bookings</option>
                        <option value="car">Car only</option>
                        <option value="bus">Bus only</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Discount Type</Label>
                      <select
                        value={offerForm.discountType}
                        onChange={(e) => setOfferForm({ ...offerForm, discountType: e.target.value as 'percent' | 'flat' })}
                        className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                      >
                        <option value="percent">Percent (%)</option>
                        <option value="flat">Flat (₹)</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="discountValue">Discount {offerForm.discountType === 'percent' ? '(%)' : '(₹)'} *</Label>
                      <Input
                        id="discountValue"
                        type="number"
                        min={1}
                        max={offerForm.discountType === 'percent' ? 100 : undefined}
                        value={offerForm.discountValue}
                        onChange={(e) => setOfferForm({ ...offerForm, discountValue: e.target.value })}
                        placeholder={offerForm.discountType === 'percent' ? 'e.g. 10' : 'e.g. 200'}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="usageLimit">Total Uses</Label>
                      <Input
                        id="usageLimit"
                        type="number"
                        min={0}
                        value={offerForm.usageLimit}
                        onChange={(e) => setOfferForm({ ...offerForm, usageLimit: e.target.value })}
                        placeholder="Unlimited"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="perUserLimit">Uses per Customer</Label>
                      <Input
                        id="perUserLimit"
                        type="number"
                        min={0}
                        value={offerForm.perUserLimit}
                        onChange={(e) => setOfferForm({ ...offerForm, perUserLimit: e.target.value })}
                        placeholder="Unlimited"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {offerForm.discountType === 'percent' && (
                      <div className="space-y-2">
                        <Label htmlFor="maxDiscount">Max Discount (₹)</Label>
                        <Input
                          id="maxDiscount"
                          type="number"
                          min={0}
                          value={offerForm.maxDiscount}
                          onChange={(e) => setOfferForm({ ...offerForm, maxDiscount: e.target.value })}
                          placeholder="No limit"
                        />
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label htmlFor="minBookingAmount">Min Booking (₹)</Label>
                      <Input
                        id="minBookingAmount"
                        type="number"
                        min={0}
                        value={offerForm.minBookingAmount}
                        onChange={(e) => setOfferForm({ ...offerForm, minBookingAmount: e.target.value })}
                        placeholder="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="validTill">Valid Till</Label>
                      <Input
                        id="validTill"
                        type="date"
                        value={offerForm.validTill}
                        onChange={(e) => setOfferForm({ ...offerForm, validTill: e.target.value })}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    The discount is taken from the platform's online share; the driver's cash amount does not change.
                  </p>



                  <div className="flex justify-end gap-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsOfferDialogOpen(false)}
                      disabled={isSubmitting}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          {editingOffer ? "Updating..." : "Creating..."}
                        </>
                      ) : (
                        editingOffer ? "Update Offer" : "Create Offer"
                      )}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Offers List */}
          <div className="grid gap-4 md:gap-6">
            {offers.map((offer) => (
              <Card key={offer._id} className="group overflow-hidden hover:shadow-lg transition-shadow">
                {/* Mobile Layout */}
                <div className="md:hidden">
                  {/* Vehicle Icon Section - Mobile */}
                  <div className="w-full h-36">
                    <OfferVehicleIcon vehicleType={offer.vehicleType} isMobile={true} />
                  </div>
                  
                  {/* Content Section - Mobile */}
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900 truncate">{offer.title}</h3>
                        </div>
                        
                        <div className="text-sm text-gray-600">
                          {offer.code ? (
                            <p className="flex flex-wrap items-center gap-2">
                              <span className="font-mono font-bold text-gray-900 bg-gray-100 border border-dashed border-gray-300 rounded px-2 py-0.5">{offer.code}</span>
                              <span>{offer.discountType === 'flat' ? '₹' + offer.discountValue + ' off' : offer.discountValue + '% off' + (offer.maxDiscount ? ' (max ₹' + offer.maxDiscount + ')' : '')}</span>
                              <span className="capitalize">• {offer.vehicleType === 'all' ? 'All bookings' : offer.vehicleType}</span>
                              <span>• Used {offer.usedCount || 0}x</span>
                            </p>
                          ) : (
                            <p className="text-amber-600">No coupon code yet — edit to add one</p>
                          )}
                          <p>{offer.validTill ? 'Valid till ' + new Date(offer.validTill).toLocaleDateString() : 'No expiry'}</p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Action Buttons - Mobile */}
                    <div className="flex gap-2 pt-3 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => editOffer(offer)}
                        className="flex-1"
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteOffer(offer._id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
                
                {/* Desktop Layout */}
                <div className="hidden md:flex items-stretch">
                  {/* Vehicle Icon Section - Desktop */}
                  <div className="w-48 self-stretch flex-shrink-0 flex">
                    <OfferVehicleIcon vehicleType={offer.vehicleType} isMobile={false} />
                  </div>
                  
                  {/* Content Section - Desktop */}
                  <div className="flex-1 p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-semibold text-gray-900">{offer.title}</h3>
                        </div>
                        
                        <div className="text-sm text-gray-600">
                          {offer.code ? (
                            <p className="flex flex-wrap items-center gap-2">
                              <span className="font-mono font-bold text-gray-900 bg-gray-100 border border-dashed border-gray-300 rounded px-2 py-0.5">{offer.code}</span>
                              <span>{offer.discountType === 'flat' ? '₹' + offer.discountValue + ' off' : offer.discountValue + '% off' + (offer.maxDiscount ? ' (max ₹' + offer.maxDiscount + ')' : '')}</span>
                              <span className="capitalize">• {offer.vehicleType === 'all' ? 'All bookings' : offer.vehicleType}</span>
                              <span>• Used {offer.usedCount || 0}x</span>
                            </p>
                          ) : (
                            <p className="text-amber-600">No coupon code yet — edit to add one</p>
                          )}
                          <p>{offer.validTill ? 'Valid till ' + new Date(offer.validTill).toLocaleDateString() : 'No expiry'}</p>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => editOffer(offer)}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteOffer(offer._id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
            
            {offers.length === 0 && (
              <Card className="p-6 md:p-12">
                <div className="text-center">
                  <Tag className="h-8 w-8 md:h-12 md:w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-base md:text-lg font-medium text-gray-900 mb-2">No offers yet</h3>
                  <p className="text-sm md:text-base text-gray-500 mb-4">Create your first offer to get started</p>
                  <Button onClick={() => resetOfferForm()} className="w-full md:w-auto">
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Offer
                  </Button>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminOffers;