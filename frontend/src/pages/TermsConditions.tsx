import { useState, useEffect } from "react";
import { ArrowLeft, FileText, Loader2, HelpCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { policyApi, type Policy, type PolicySection } from "@/services/policyApi";

import UserBottomNavigation from "@/components/UserBottomNavigation";
import DriverBottomNavigation from "@/driver/components/DriverBottomNavigation";
import { useDriverAuth } from "@/contexts/DriverAuthContext";

const TermsConditions = () => {
  const navigate = useNavigate();
  const { isLoggedIn: isDriverLoggedIn } = useDriverAuth();
  const isDriver = isDriverLoggedIn || Boolean(localStorage.getItem('driverToken'));

  const [policy, setPolicy] = useState<Policy | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTerms();
  }, []);

  const loadTerms = async () => {
    try {
      setIsLoading(true);
      const response = await policyApi.getPolicy('terms');
      if (response.success && response.data) {
        setPolicy(response.data);
      }
    } catch (error) {
      console.error("Error loading Terms & Conditions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate(isDriver ? '/driver/profile' : '/profile');
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-primary text-primary-foreground p-4 sm:p-5 flex items-center justify-between shadow-xs sticky top-0 z-30 relative">
        <button
          type="button"
          onClick={handleBack}
          className="relative z-10 p-2 -ml-2 text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer flex items-center justify-center"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-base sm:text-lg font-bold tracking-wide absolute left-0 right-0 text-center pointer-events-none">
          {policy?.title || "Terms & Conditions"}
        </h1>
        <div className="w-8"></div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-5 py-6 space-y-6 pb-24 md:pb-6">
        {isLoading ? (
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse flex items-start space-x-3.5">
                <div className="w-9 h-9 bg-gray-100 rounded-full shrink-0"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-100 rounded w-1/3"></div>
                  <div className="h-3 bg-gray-100 rounded w-full"></div>
                  <div className="h-3 bg-gray-100 rounded w-5/6"></div>
                </div>
              </div>
            ))}
          </div>
        ) : !policy?.sections || policy.sections.length === 0 ? (
          <div className="text-center py-16">
            <HelpCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No terms available at the moment.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {policy.sections.map((section: PolicySection, index: number) => (
              <div key={section._id || index} className="border-b border-gray-100 pb-5 last:border-0">
                <div className="flex items-start space-x-3.5">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                    <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-2">
                      {section.title}
                    </h3>
                    <p className="text-sm text-gray-600 whitespace-pre-line leading-relaxed">
                      {section.content}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {isDriver ? <DriverBottomNavigation /> : <UserBottomNavigation />}
    </div>
  );
};

export default TermsConditions;
