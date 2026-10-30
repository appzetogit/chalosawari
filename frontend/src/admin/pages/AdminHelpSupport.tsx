import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import AdminLayout from "@/admin/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import {
  HelpCircle,
  Phone,
  Mail,
  Plus,
  Edit,
  Trash2,
  RefreshCw,
  Loader2,
  Search,
  CheckCircle2,
  XCircle,
  Settings,
  ChevronDown,
  ChevronUp,
  Headphones,
  FileQuestion,
  Layers,
  ArrowUpDown,
  FileText,
  Shield,
  RotateCcw,
  ArrowRight
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  helpApi,
  type FAQ,
  type SupportSetting,
  type FAQStats
} from "@/services/helpApi";

const AdminHelpSupport = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAdminAuth();

  // State
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [stats, setStats] = useState<FAQStats>({
    totalFaqs: 0,
    activeFaqs: 0,
    inactiveFaqs: 0
  });
  const [supportSettings, setSupportSettings] = useState<SupportSetting>({
    phone: "+919171838260",
    email: "chalosawariofficial@gmail.com",
    whatsapp: "+919171838260",
    workingHours: "24/7 Available",
    callSupportTitle: "Call Support",
    callSupportDescription: "Speak with our customer care",
    emailSupportTitle: "Email Support",
    emailSupportDescription: "Send us an email"
  });

  const [isLoadingData, setIsLoadingData] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>(null);

  // Dialog states
  const [isFaqDialogOpen, setIsFaqDialogOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<FAQ | null>(null);
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
  const [deletingFaqId, setDeletingFaqId] = useState<string | null>(null);
  const [isSubmittingFaq, setIsSubmittingFaq] = useState(false);
  const [isSubmittingSettings, setIsSubmittingSettings] = useState(false);

  // FAQ Form state
  const [faqForm, setFaqForm] = useState({
    title: "",
    content: "",
    order: 0,
    isActive: true
  });

  // Settings Form state
  const [settingsForm, setSettingsForm] = useState<SupportSetting>({
    phone: "",
    email: "",
    whatsapp: "",
    workingHours: "",
    callSupportTitle: "",
    callSupportDescription: "",
    emailSupportTitle: "",
    emailSupportDescription: ""
  });

  useEffect(() => {
    if (isAuthenticated) {
      loadAllData();
    }
  }, [isAuthenticated]);

  const loadAllData = async () => {
    setIsLoadingData(true);
    try {
      await Promise.all([loadFaqs(), loadStats(), loadSettings()]);
    } catch (error) {
      console.error("Error loading help & support data:", error);
    } finally {
      setIsLoadingData(false);
    }
  };

  const loadFaqs = async () => {
    try {
      const response = await helpApi.getAdminFaqs(searchTerm, statusFilter);
      if (response.success) {
        setFaqs(response.data);
      }
    } catch (error) {
      console.error("Error loading FAQs:", error);
      toast({
        title: "Error",
        description: "Failed to load FAQs.",
        variant: "destructive"
      });
    }
  };

  const loadStats = async () => {
    try {
      const response = await helpApi.getAdminStats();
      if (response.success) {
        setStats(response.data);
      }
    } catch (error) {
      console.error("Error loading FAQ stats:", error);
    }
  };

  const loadSettings = async () => {
    try {
      const response = await helpApi.getSupportSettings();
      if (response.success) {
        setSupportSettings(response.data);
        setSettingsForm(response.data);
      }
    } catch (error) {
      console.error("Error loading support settings:", error);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadFaqs();
    }
  }, [searchTerm, statusFilter]);

  const handleOpenAddFaq = () => {
    setEditingFaq(null);
    setFaqForm({
      title: "",
      content: "",
      order: faqs.length + 1,
      isActive: true
    });
    setIsFaqDialogOpen(true);
  };

  const handleOpenEditFaq = (faq: FAQ) => {
    setEditingFaq(faq);
    setFaqForm({
      title: faq.title,
      content: faq.content,
      order: faq.order || 0,
      isActive: faq.isActive
    });
    setIsFaqDialogOpen(true);
  };

  const handleSubmitFaq = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!faqForm.title.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter FAQ question/title.",
        variant: "destructive"
      });
      return;
    }

    if (!faqForm.content.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter FAQ answer/content.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmittingFaq(true);
    try {
      if (editingFaq) {
        const response = await helpApi.updateFaq(editingFaq._id, faqForm);
        if (response.success) {
          toast({
            title: "Success",
            description: "FAQ updated successfully."
          });
        }
      } else {
        const response = await helpApi.createFaq(faqForm);
        if (response.success) {
          toast({
            title: "Success",
            description: "New FAQ created successfully."
          });
        }
      }
      setIsFaqDialogOpen(false);
      loadFaqs();
      loadStats();
    } catch (error: any) {
      console.error("Error saving FAQ:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save FAQ.",
        variant: "destructive"
      });
    } finally {
      setIsSubmittingFaq(false);
    }
  };

  const handleDeleteFaq = async () => {
    if (!deletingFaqId) return;

    try {
      const response = await helpApi.deleteFaq(deletingFaqId);
      if (response.success) {
        toast({
          title: "Deleted",
          description: "FAQ deleted successfully."
        });
        loadFaqs();
        loadStats();
      }
    } catch (error: any) {
      console.error("Error deleting FAQ:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete FAQ.",
        variant: "destructive"
      });
    } finally {
      setDeletingFaqId(null);
    }
  };

  const handleToggleStatus = async (faq: FAQ) => {
    try {
      const response = await helpApi.toggleFaqStatus(faq._id);
      if (response.success) {
        toast({
          title: "Status Updated",
          description: `FAQ marked as ${response.data.isActive ? "Active" : "Inactive"}.`
        });
        loadFaqs();
        loadStats();
      }
    } catch (error: any) {
      console.error("Error toggling FAQ status:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to toggle status.",
        variant: "destructive"
      });
    }
  };

  const handleOpenSettings = () => {
    setSettingsForm(supportSettings);
    setIsSettingsDialogOpen(true);
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsSubmittingSettings(true);
    try {
      const response = await helpApi.updateSupportSettings(settingsForm);
      if (response.success) {
        setSupportSettings(response.data);
        toast({
          title: "Settings Saved",
          description: "Support contact details updated successfully."
        });
        setIsSettingsDialogOpen(false);
      }
    } catch (error: any) {
      console.error("Error saving support settings:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update support settings.",
        variant: "destructive"
      });
    } finally {
      setIsSubmittingSettings(false);
    }
  };

  if (!isAuthenticated) {
    navigate('/admin-auth');
    return null;
  }

  return (
    <AdminLayout>
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 lg:mb-8 gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-1">
            Help & Support Management
          </h1>
          <p className="text-gray-600 text-sm lg:text-base">
            Manage FAQs, support phone & email channels, and customer help topics dynamically
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={loadAllData}
            disabled={isLoadingData}
            variant="outline"
            size="sm"
            className="border-gray-200 text-gray-700 hover:bg-gray-50"
          >
            {isLoadingData ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Refresh
          </Button>
          <Button
            onClick={handleOpenAddFaq}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add FAQ
          </Button>
        </div>
      </div>

      {/* Support Contact Details Card */}
      <Card className="mb-8 border border-gray-100 shadow-sm">
        <CardHeader className="pb-3 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="text-lg font-bold text-gray-900 flex items-center">
              <Headphones className="w-5 h-5 mr-2 text-blue-600" />
              Contact Support Channels (Public)
            </CardTitle>
            <CardDescription>
              These contact options appear directly at the top of the user Help & Support screen.
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenSettings}
            className="border-gray-200 text-gray-700 hover:bg-gray-50 shrink-0"
          >
            <Settings className="w-4 h-4 mr-2 text-gray-500" />
            Edit Support Details
          </Button>
        </CardHeader>
        <CardContent className="pt-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-100 flex items-start space-x-4">
              <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-600 shrink-0 mt-0.5">
                <Phone className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-gray-900">{supportSettings.callSupportTitle || "Call Support"}</h4>
                  <Badge variant="outline" className="text-xs bg-white text-blue-700 border-blue-200">
                    Live
                  </Badge>
                </div>
                <p className="text-sm text-gray-500 mt-0.5">{supportSettings.callSupportDescription || "Speak with our customer care"}</p>
                <p className="text-sm font-semibold text-blue-600 mt-2 font-mono">
                  {supportSettings.phone || "Not set"}
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-indigo-50/50 border border-indigo-100 flex items-start space-x-4">
              <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-600 shrink-0 mt-0.5">
                <Mail className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-gray-900">{supportSettings.emailSupportTitle || "Email Support"}</h4>
                  <Badge variant="outline" className="text-xs bg-white text-indigo-700 border-indigo-200">
                    Live
                  </Badge>
                </div>
                <p className="text-sm text-gray-500 mt-0.5">{supportSettings.emailSupportDescription || "Send us an email"}</p>
                <p className="text-sm font-semibold text-indigo-600 mt-2 font-mono">
                  {supportSettings.email || "Not set"}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Legal & Policies Dynamic Management Section */}
      <Card className="mb-8 border border-gray-100 shadow-sm bg-gradient-to-r from-slate-50/50 via-white to-slate-50/50">
        <CardHeader className="pb-3 border-b border-gray-100">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <CardTitle className="text-lg font-bold text-gray-900 flex items-center">
                <FileText className="w-5 h-5 mr-2 text-emerald-600" />
                Legal Policies & Terms Management (Dynamic CMS)
              </CardTitle>
              <CardDescription>
                Customize and dynamically update Terms & Conditions, Privacy Policy, and Refund Policy for Users & Drivers.
              </CardDescription>
            </div>
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 self-start sm:self-center font-medium">
              Dynamic CMS Active
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Terms & Conditions */}
            <div className="p-4 rounded-xl border border-blue-100 bg-blue-50/40 hover:bg-blue-50/70 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center space-x-2 text-blue-700 font-semibold mb-1">
                  <FileText className="w-4 h-4" />
                  <span>Terms & Conditions</span>
                </div>
                <p className="text-xs text-gray-600 mb-4">
                  Manage rules, service agreements, and terms of service for both Riders and Drivers.
                </p>
              </div>
              <div className="flex items-center gap-2 pt-2 border-t border-blue-100/60">
                <Link
                  to="/admin/terms"
                  className="inline-flex items-center text-xs font-semibold text-blue-700 bg-white hover:bg-blue-50 px-2.5 py-1.5 rounded-lg border border-blue-200 transition-colors shadow-xs"
                >
                  User Terms <ArrowRight className="w-3 h-3 ml-1" />
                </Link>
                <Link
                  to="/admin/driver-terms"
                  className="inline-flex items-center text-xs font-semibold text-blue-700 bg-white hover:bg-blue-50 px-2.5 py-1.5 rounded-lg border border-blue-200 transition-colors shadow-xs"
                >
                  Driver Terms <ArrowRight className="w-3 h-3 ml-1" />
                </Link>
              </div>
            </div>

            {/* Privacy Policy */}
            <div className="p-4 rounded-xl border border-purple-100 bg-purple-50/40 hover:bg-purple-50/70 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center space-x-2 text-purple-700 font-semibold mb-1">
                  <Shield className="w-4 h-4" />
                  <span>Privacy Policy</span>
                </div>
                <p className="text-xs text-gray-600 mb-4">
                  Configure data collection, privacy rules, location sharing, and security declarations.
                </p>
              </div>
              <div className="flex items-center gap-2 pt-2 border-t border-purple-100/60">
                <Link
                  to="/admin/privacy"
                  className="inline-flex items-center text-xs font-semibold text-purple-700 bg-white hover:bg-purple-50 px-2.5 py-1.5 rounded-lg border border-purple-200 transition-colors shadow-xs"
                >
                  User Privacy <ArrowRight className="w-3 h-3 ml-1" />
                </Link>
                <Link
                  to="/admin/driver-privacy"
                  className="inline-flex items-center text-xs font-semibold text-purple-700 bg-white hover:bg-purple-50 px-2.5 py-1.5 rounded-lg border border-purple-200 transition-colors shadow-xs"
                >
                  Driver Privacy <ArrowRight className="w-3 h-3 ml-1" />
                </Link>
              </div>
            </div>

            {/* Refund & Cancellation Policy */}
            <div className="p-4 rounded-xl border border-amber-100 bg-amber-50/40 hover:bg-amber-50/70 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center space-x-2 text-amber-700 font-semibold mb-1">
                  <RotateCcw className="w-4 h-4" />
                  <span>Refund & Cancellation</span>
                </div>
                <p className="text-xs text-gray-600 mb-4">
                  Define ride cancellation fee guidelines, wallet refund conditions, and dispute timelines.
                </p>
              </div>
              <div className="flex items-center gap-2 pt-2 border-t border-amber-100/60">
                <Link
                  to="/admin/refund"
                  className="inline-flex items-center text-xs font-semibold text-amber-800 bg-white hover:bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200 transition-colors shadow-xs"
                >
                  Edit Refund Policy <ArrowRight className="w-3 h-3 ml-1" />
                </Link>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* FAQs Management Section */}
      <Card className="border border-gray-100 shadow-sm">
        <CardHeader className="pb-4 border-b border-gray-100">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-lg font-bold text-gray-900 flex items-center">
                <FileQuestion className="w-5 h-5 mr-2 text-blue-600" />
                Frequently Asked Questions ({faqs.length})
              </CardTitle>
              <CardDescription>
                Add, edit, reorder, or toggle active status of help topics.
              </CardDescription>
            </div>

            {/* Filter and Search */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search FAQs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-9 text-sm"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-36 h-9 text-sm">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All FAQs</SelectItem>
                  <SelectItem value="active">Active Only</SelectItem>
                  <SelectItem value="inactive">Inactive Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          {isLoadingData ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-3" />
              <p className="text-sm text-gray-500">Loading FAQs...</p>
            </div>
          ) : faqs.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl">
              <HelpCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-gray-900 mb-1">No FAQs Found</h3>
              <p className="text-sm text-gray-500 mb-4">
                {searchTerm ? "No FAQs match your search query." : "You have not added any FAQs yet."}
              </p>
              <Button onClick={handleOpenAddFaq} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                <Plus className="w-4 h-4 mr-2" />
                Add Your First FAQ
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {faqs.map((faq) => {
                const isExpanded = expandedFaqId === faq._id;
                return (
                  <div
                    key={faq._id}
                    className="border border-gray-200 rounded-xl p-4 transition-all duration-200 hover:border-gray-300 hover:shadow-xs bg-white"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 cursor-pointer" onClick={() => setExpandedFaqId(isExpanded ? null : faq._id)}>
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-gray-100 text-gray-600 flex items-center">
                            <Layers className="w-3 h-3 mr-1" />
                            Order: {faq.order}
                          </span>
                          <Badge
                            variant={faq.isActive ? "default" : "secondary"}
                            className={
                              faq.isActive
                                ? "bg-green-100 text-green-700 border-green-200 text-xs"
                                : "bg-gray-100 text-gray-600 border-gray-200 text-xs"
                            }
                          >
                            {faq.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <h4 className="font-semibold text-gray-900 text-base flex items-center">
                          {faq.title}
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 ml-2 text-gray-400" />
                          ) : (
                            <ChevronDown className="w-4 h-4 ml-2 text-gray-400" />
                          )}
                        </h4>
                      </div>

                      {/* Action Controls */}
                      <div className="flex items-center space-x-2 shrink-0">
                        <div className="flex items-center space-x-2 mr-2">
                          <Switch
                            checked={faq.isActive}
                            onCheckedChange={() => handleToggleStatus(faq)}
                            aria-label="Toggle active status"
                          />
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEditFaq(faq)}
                          className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeletingFaqId(faq._id)}
                          className="h-8 w-8 p-0 text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Expandable Content Preview */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-gray-100 text-sm text-gray-700 bg-gray-50/50 p-3 rounded-lg whitespace-pre-line leading-relaxed font-sans">
                        {faq.content}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit FAQ Dialog */}
      <Dialog open={isFaqDialogOpen} onOpenChange={setIsFaqDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingFaq ? "Edit FAQ" : "Add New FAQ"}</DialogTitle>
            <DialogDescription>
              {editingFaq
                ? "Update FAQ details. Changes will reflect instantly on the user app."
                : "Create a new frequently asked question with detailed step-by-step guidance."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitFaq} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="title" className="text-sm font-medium">
                Question / Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                placeholder="e.g., How to book a ticket?"
                value={faqForm.title}
                onChange={(e) => setFaqForm({ ...faqForm, title: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content" className="text-sm font-medium">
                Answer / Detailed Content <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="content"
                placeholder="Enter detailed steps or answer..."
                rows={6}
                value={faqForm.content}
                onChange={(e) => setFaqForm({ ...faqForm, content: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4 items-center">
              <div className="space-y-2">
                <Label htmlFor="order" className="text-sm font-medium">
                  Display Order
                </Label>
                <Input
                  id="order"
                  type="number"
                  placeholder="1, 2, 3..."
                  value={faqForm.order}
                  onChange={(e) => setFaqForm({ ...faqForm, order: parseInt(e.target.value) || 0 })}
                />
              </div>

              <div className="flex items-center space-x-3 pt-6">
                <Switch
                  id="isActive"
                  checked={faqForm.isActive}
                  onCheckedChange={(checked) => setFaqForm({ ...faqForm, isActive: checked })}
                />
                <Label htmlFor="isActive" className="text-sm font-medium cursor-pointer">
                  Active (Visible to users)
                </Label>
              </div>
            </div>

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsFaqDialogOpen(false)}
                disabled={isSubmittingFaq}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmittingFaq} className="bg-blue-600 hover:bg-blue-700 text-white">
                {isSubmittingFaq ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  editingFaq ? "Update FAQ" : "Create FAQ"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Support Settings Dialog */}
      <Dialog open={isSettingsDialogOpen} onOpenChange={setIsSettingsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Support Contact Channels</DialogTitle>
            <DialogDescription>
              Configure phone number and email address for customer support.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveSettings} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm font-medium">
                Customer Care Phone Number
              </Label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  id="phone"
                  placeholder="+919171838260"
                  className="pl-9"
                  value={settingsForm.phone}
                  onChange={(e) => setSettingsForm({ ...settingsForm, phone: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Support Email Address
              </Label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="chalosawariofficial@gmail.com"
                  className="pl-9"
                  value={settingsForm.email}
                  onChange={(e) => setSettingsForm({ ...settingsForm, email: e.target.value })}
                  required
                />
              </div>
            </div>

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsSettingsDialogOpen(false)}
                disabled={isSubmittingSettings}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmittingSettings} className="bg-blue-600 hover:bg-blue-700 text-white">
                {isSubmittingSettings ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert */}
      <AlertDialog open={!!deletingFaqId} onOpenChange={(open) => !open && setDeletingFaqId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This FAQ will be permanently deleted from the database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteFaq}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete FAQ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
};

export default AdminHelpSupport;
