import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import AdminLayout from "@/admin/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import {
  FileText,
  Shield,
  RotateCcw,
  Plus,
  Edit,
  Trash2,
  RefreshCw,
  Loader2,
  ExternalLink,
  Save,
  Layers,
  Calendar,
  CheckCircle2
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  policyApi,
  type Policy,
  type PolicySection,
  type PolicyType
} from "@/services/policyApi";

interface AdminPolicyManagementProps {
  policyType: PolicyType;
}

const POLICY_META: Record<string, {
  name: string;
  userPath: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  description: string;
  targetApp: string;
}> = {
  terms: {
    name: "User Terms & Conditions",
    userPath: "/terms-conditions",
    icon: FileText,
    color: "blue",
    description: "Manage platform passenger rules, booking terms, cancellation rules, and user legal agreements.",
    targetApp: "Live on user app"
  },
  'driver-terms': {
    name: "Driver Terms & Conditions",
    userPath: "/driver/terms-conditions",
    icon: FileText,
    color: "blue",
    description: "Manage driver partner obligations, vehicle requirements, fare commissions, penalties, and terms.",
    targetApp: "Live on driver app"
  },
  privacy: {
    name: "User Privacy Policy",
    userPath: "/privacy-policy",
    icon: Shield,
    color: "indigo",
    description: "Manage customer data collection, ride tracking privacy, personal data protection, and usage guidelines.",
    targetApp: "Live on user app"
  },
  'driver-privacy': {
    name: "Driver Privacy Policy",
    userPath: "/driver/privacy-policy",
    icon: Shield,
    color: "indigo",
    description: "Manage driver KYC data, real-time GPS location telemetry tracking consent, and payout data protection.",
    targetApp: "Live on driver app"
  },
  refund: {
    name: "Refund Policy",
    userPath: "/refund-policy",
    icon: RotateCcw,
    color: "emerald",
    description: "Manage refund timeframes, deduction rules, settlement cycles, and dispute resolutions.",
    targetApp: "Live on user app"
  }
};

const AdminPolicyManagement = ({ policyType }: AdminPolicyManagementProps) => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAdminAuth();

  const meta = POLICY_META[policyType] || POLICY_META.terms;
  const MetaIcon = meta.icon;

  // State
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [policyTitle, setPolicyTitle] = useState("");
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isSavingTitle, setIsSavingTitle] = useState(false);

  // Dialog state
  const [isSectionDialogOpen, setIsSectionDialogOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<PolicySection | null>(null);
  const [deletingSectionId, setDeletingSectionId] = useState<string | null>(null);
  const [isSubmittingSection, setIsSubmittingSection] = useState(false);

  // Section Form state
  const [sectionForm, setSectionForm] = useState({
    title: "",
    content: "",
    order: 1
  });

  useEffect(() => {
    if (isAuthenticated) {
      loadPolicy();
    }
  }, [isAuthenticated, policyType]);

  const loadPolicy = async () => {
    try {
      setIsLoadingData(true);
      const response = await policyApi.getAdminPolicy(policyType);
      if (response.success && response.data) {
        setPolicy(response.data);
        setPolicyTitle(response.data.title || meta.name);
      }
    } catch (error: any) {
      console.error(`Error loading ${policyType} policy:`, error);
      toast({
        title: "Error",
        description: error.message || "Failed to load policy data.",
        variant: "destructive"
      });
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleSaveTitle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!policyTitle.trim()) {
      toast({
        title: "Validation Error",
        description: "Policy title cannot be empty.",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsSavingTitle(true);
      const response = await policyApi.updatePolicy(policyType, { title: policyTitle.trim() });
      if (response.success) {
        setPolicy(response.data);
        toast({
          title: "Title Saved",
          description: "Policy title updated successfully."
        });
      }
    } catch (error: any) {
      console.error("Error saving policy title:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update title.",
        variant: "destructive"
      });
    } finally {
      setIsSavingTitle(false);
    }
  };

  const handleOpenAddSection = () => {
    setEditingSection(null);
    setSectionForm({
      title: "",
      content: "",
      order: (policy?.sections?.length || 0) + 1
    });
    setIsSectionDialogOpen(true);
  };

  const handleOpenEditSection = (section: PolicySection) => {
    setEditingSection(section);
    setSectionForm({
      title: section.title,
      content: section.content,
      order: section.order || 0
    });
    setIsSectionDialogOpen(true);
  };

  const handleSubmitSection = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!sectionForm.title.trim()) {
      toast({
        title: "Validation Error",
        description: "Section title is required.",
        variant: "destructive"
      });
      return;
    }

    if (!sectionForm.content.trim()) {
      toast({
        title: "Validation Error",
        description: "Section content is required.",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsSubmittingSection(true);
      if (editingSection) {
        const response = await policyApi.updateSection(policyType, editingSection._id, sectionForm);
        if (response.success) {
          setPolicy(response.data);
          toast({
            title: "Section Updated",
            description: "Section changes saved successfully."
          });
        }
      } else {
        const response = await policyApi.addSection(policyType, sectionForm);
        if (response.success) {
          setPolicy(response.data);
          toast({
            title: "Section Added",
            description: "New section added successfully."
          });
        }
      }
      setIsSectionDialogOpen(false);
    } catch (error: any) {
      console.error("Error saving section:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save section.",
        variant: "destructive"
      });
    } finally {
      setIsSubmittingSection(false);
    }
  };

  const handleDeleteSection = async () => {
    if (!deletingSectionId) return;

    try {
      const response = await policyApi.deleteSection(policyType, deletingSectionId);
      if (response.success) {
        setPolicy(response.data);
        toast({
          title: "Section Deleted",
          description: "Section removed successfully."
        });
      }
    } catch (error: any) {
      console.error("Error deleting section:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete section.",
        variant: "destructive"
      });
    } finally {
      setDeletingSectionId(null);
    }
  };

  if (!isAuthenticated) {
    navigate('/admin-auth');
    return null;
  }

  return (
    <AdminLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-1 flex items-center">
            <MetaIcon className="w-7 h-7 mr-2.5 text-blue-600" />
            {meta.name} Management
          </h1>
          <p className="text-gray-600 text-sm lg:text-base">
            {meta.description}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link to={meta.userPath} target="_blank">
            <Button
              variant="outline"
              size="sm"
              className="border-gray-200 text-gray-700 hover:bg-gray-50"
            >
              <ExternalLink className="w-4 h-4 mr-2 text-gray-500" />
              View Live Page
            </Button>
          </Link>
          <Button
            onClick={loadPolicy}
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
            onClick={handleOpenAddSection}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Section
          </Button>
        </div>
      </div>

      {/* Policy Category Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 mb-6 p-1.5 bg-slate-100/80 rounded-2xl border border-slate-200/80">
        <Link to="/admin/terms">
          <Button
            variant={policyType === 'terms' ? 'default' : 'ghost'}
            size="sm"
            className={`rounded-xl text-xs sm:text-sm font-semibold h-9 transition-all ${
              policyType === 'terms' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <FileText className="w-4 h-4 mr-1.5" />
            User Terms
          </Button>
        </Link>
        <Link to="/admin/driver-terms">
          <Button
            variant={policyType === 'driver-terms' ? 'default' : 'ghost'}
            size="sm"
            className={`rounded-xl text-xs sm:text-sm font-semibold h-9 transition-all ${
              policyType === 'driver-terms' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <FileText className="w-4 h-4 mr-1.5" />
            Driver Terms
          </Button>
        </Link>
        <Link to="/admin/privacy">
          <Button
            variant={policyType === 'privacy' ? 'default' : 'ghost'}
            size="sm"
            className={`rounded-xl text-xs sm:text-sm font-semibold h-9 transition-all ${
              policyType === 'privacy' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Shield className="w-4 h-4 mr-1.5" />
            User Privacy
          </Button>
        </Link>
        <Link to="/admin/driver-privacy">
          <Button
            variant={policyType === 'driver-privacy' ? 'default' : 'ghost'}
            size="sm"
            className={`rounded-xl text-xs sm:text-sm font-semibold h-9 transition-all ${
              policyType === 'driver-privacy' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Shield className="w-4 h-4 mr-1.5" />
            Driver Privacy
          </Button>
        </Link>
        <Link to="/admin/refund">
          <Button
            variant={policyType === 'refund' ? 'default' : 'ghost'}
            size="sm"
            className={`rounded-xl text-xs sm:text-sm font-semibold h-9 transition-all ${
              policyType === 'refund' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <RotateCcw className="w-4 h-4 mr-1.5" />
            Refund Policy
          </Button>
        </Link>
      </div>

      {/* Policy Settings / Title Card */}
      <Card className="mb-6 border border-gray-100 shadow-sm">
        <CardHeader className="pb-3 border-b border-gray-100">
          <CardTitle className="text-base font-bold text-gray-900">
            Page Title & Information
          </CardTitle>
          <CardDescription>
            The main header title displayed on the live {meta.name} screen.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <form onSubmit={handleSaveTitle} className="flex flex-col sm:flex-row items-end gap-3">
            <div className="space-y-1.5 flex-1 w-full">
              <Label htmlFor="policyTitle" className="text-sm font-medium">
                Page Header Title
              </Label>
              <Input
                id="policyTitle"
                value={policyTitle}
                onChange={(e) => setPolicyTitle(e.target.value)}
                placeholder={meta.name}
                className="h-10"
              />
            </div>
            <Button
              type="submit"
              disabled={isSavingTitle || !policyTitle.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white h-10 shrink-0"
            >
              {isSavingTitle ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save Title
            </Button>
          </form>

          {policy && (
            <div className="flex items-center gap-4 mt-4 pt-3 border-t border-gray-100 text-xs text-gray-500">
              <span className="flex items-center">
                <Calendar className="w-3.5 h-3.5 mr-1 text-gray-400" />
                Last updated: {policy.lastUpdated ? new Date(policy.lastUpdated).toLocaleDateString() : 'Recently'}
              </span>
              <span className="flex items-center">
                <Layers className="w-3.5 h-3.5 mr-1 text-gray-400" />
                Total Sections: {policy.sections?.length || 0}
              </span>
              <span className="flex items-center text-green-600 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                {meta.targetApp}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sections List */}
      <Card className="border border-gray-100 shadow-sm">
        <CardHeader className="pb-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-bold text-gray-900">
                Policy Clauses & Sections ({policy?.sections?.length || 0})
              </CardTitle>
              <CardDescription>
                Add, update, or remove individual sections. Changes are reflected in real-time.
              </CardDescription>
            </div>
            <Button
              onClick={handleOpenAddSection}
              size="sm"
              variant="outline"
              className="border-blue-200 text-blue-600 hover:bg-blue-50"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              New Section
            </Button>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          {isLoadingData ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-3" />
              <p className="text-sm text-gray-500">Loading {meta.name} sections...</p>
            </div>
          ) : !policy?.sections || policy.sections.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl">
              <MetaIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-gray-900 mb-1">No Sections Added</h3>
              <p className="text-sm text-gray-500 mb-4">
                Click the button below to add the first clause to this policy.
              </p>
              <Button onClick={handleOpenAddSection} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                <Plus className="w-4 h-4 mr-2" />
                Add First Section
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {policy.sections.map((section, index) => (
                <div
                  key={section._id || index}
                  className="border border-gray-200 rounded-xl p-4 sm:p-5 transition-all duration-200 hover:border-gray-300 hover:shadow-xs bg-white"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                          Clause {section.order || index + 1}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-gray-900 mb-2">
                        {section.title}
                      </h3>
                      <p className="text-sm text-gray-600 whitespace-pre-line leading-relaxed">
                        {section.content}
                      </p>
                    </div>

                    <div className="flex items-center space-x-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenEditSection(section)}
                        className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50"
                        title="Edit Section"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeletingSectionId(section._id)}
                        className="h-8 w-8 p-0 text-red-600 hover:bg-red-50"
                        title="Delete Section"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit Section Dialog */}
      <Dialog open={isSectionDialogOpen} onOpenChange={setIsSectionDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingSection ? "Edit Policy Section" : "Add Policy Section"}
            </DialogTitle>
            <DialogDescription>
              {editingSection
                ? "Update this clause title and content details."
                : "Create a new clause for this policy document."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitSection} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="secTitle" className="text-sm font-medium">
                Section Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="secTitle"
                placeholder="e.g., Acceptance of Terms"
                value={sectionForm.title}
                onChange={(e) => setSectionForm({ ...sectionForm, title: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="secContent" className="text-sm font-medium">
                Clause / Content <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="secContent"
                placeholder="Enter detailed terms, rules, or guidelines..."
                rows={7}
                value={sectionForm.content}
                onChange={(e) => setSectionForm({ ...sectionForm, content: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="secOrder" className="text-sm font-medium">
                Display Order Number
              </Label>
              <Input
                id="secOrder"
                type="number"
                placeholder="1, 2, 3..."
                value={sectionForm.order}
                onChange={(e) => setSectionForm({ ...sectionForm, order: parseInt(e.target.value) || 0 })}
              />
            </div>

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsSectionDialogOpen(false)}
                disabled={isSubmittingSection}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmittingSection}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isSubmittingSection ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  editingSection ? "Update Section" : "Add Section"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert */}
      <AlertDialog open={!!deletingSectionId} onOpenChange={(open) => !open && setDeletingSectionId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Section?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this section from {meta.name}? This change will immediately take effect on the live user app.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSection}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete Section
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
};

export default AdminPolicyManagement;
