import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertCircle, CheckCircle, FileText, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import apiService from '@/services/api.js';
import { useDriverAuth } from '@/contexts/DriverAuthContext';

interface DriverAgreementFormProps {
  onAgreementAccepted: () => void;
  driverName?: string;
}

const DriverAgreementForm: React.FC<DriverAgreementFormProps> = ({
  onAgreementAccepted,
  driverName = "Driver"
}) => {
  const { updateDriverData, refreshDriverData } = useDriverAuth();
  const [agreements, setAgreements] = useState({
    rcValid: false,
    insuranceValid: false,
    roadTaxValid: false,
    drivingLicenseValid: false,
    legalResponsibility: false,
    platformLiability: false,
    serviceResponsibility: false
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const allAgreementsAccepted = Object.values(agreements).every(accepted => accepted);

  const handleAgreementChange = (key: keyof typeof agreements, checked: boolean) => {
    setAgreements(prev => ({
      ...prev,
      [key]: checked
    }));

    if (errors.length > 0) {
      setErrors([]);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    setAgreements({
      rcValid: checked,
      insuranceValid: checked,
      roadTaxValid: checked,
      drivingLicenseValid: checked,
      legalResponsibility: checked,
      platformLiability: checked,
      serviceResponsibility: checked
    });
    if (errors.length > 0) {
      setErrors([]);
    }
  };

  const handleSubmit = async () => {
    if (!allAgreementsAccepted) {
      setErrors(['Please accept all conditions to proceed.']);
      return;
    }

    setIsSubmitting(true);
    setErrors([]);

    try {
      const response = await apiService.acceptDriverAgreement({
        agreements: agreements // server records the IP itself
      });

      if (response.success) {
        toast({
          title: "Agreement Accepted!",
          description: "Welcome to Chalo Sawaari. You can now access your dashboard.",
          variant: "default",
        });

        // Immediately update driver state in context so dashboard unlocks instantly
        updateDriverData({
          agreement: {
            isAccepted: true,
            acceptedAt: new Date().toISOString()
          }
        });

        // Trigger refresh and callback
        refreshDriverData();
        onAgreementAccepted();
      } else {
        throw new Error(response.error?.message || 'Failed to accept agreement');
      }
    } catch (error: any) {
      console.error('Agreement submission error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to submit agreement. Please try again.",
        variant: "destructive",
      });
      setErrors([error.message || "Failed to submit agreement. Please try again."]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const declarationList: { key: keyof typeof agreements; label: string }[] = [
    { key: 'rcValid', label: "I declare that my vehicle's Registration Certificate (RC) is valid." },
    { key: 'insuranceValid', label: "My vehicle has a valid and active Insurance Policy." },
    { key: 'roadTaxValid', label: "All applicable Road Tax, Fitness Certificate, and Permits are valid." },
    { key: 'drivingLicenseValid', label: "The Driver holds a valid Driving License." },
    { key: 'legalResponsibility', label: "I accept that any legal, RTO, traffic, accident, penalty, or dispute is my responsibility only (Owner/Driver)." },
    { key: 'platformLiability', label: 'I agree that "Chalo Sawaari" has no liability or involvement in any such matters.' },
    { key: 'serviceResponsibility', label: "I take full responsibility for providing the committed service to the customer." },
  ];

  return (
    <div className="h-[100dvh] max-h-[100dvh] bg-white flex flex-col justify-between px-4 py-3 sm:py-5 overflow-hidden">
      <div className="w-full max-w-lg mx-auto flex-1 flex flex-col justify-between">
        {/* Top Section: Header & Points List */}
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-center gap-3 pb-2.5 border-b border-gray-100">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-base font-bold text-gray-900 leading-tight truncate">
                Driver Agreement Form
              </h1>
              <p className="text-[11px] text-gray-500 leading-tight truncate mt-0.5">
                Welcome <span className="font-semibold text-gray-800">{driverName}</span> • Review & accept terms
              </p>
            </div>
          </div>

          {/* Declaration Points List */}
          <div className="space-y-2">
            {declarationList.map((item) => (
              <div
                key={item.key}
                onClick={() => handleAgreementChange(item.key, !agreements[item.key])}
                className={`flex items-start gap-2.5 p-2 rounded-lg border transition-all cursor-pointer ${
                  agreements[item.key]
                    ? "bg-blue-50/40 border-blue-100 text-gray-900"
                    : "bg-white border-gray-100 text-gray-600 hover:bg-gray-50/70"
                }`}
              >
                <Checkbox
                  id={item.key}
                  checked={agreements[item.key]}
                  onCheckedChange={(checked) => handleAgreementChange(item.key, checked as boolean)}
                  className="mt-0.5 shrink-0 h-4 w-4"
                  onClick={(e) => e.stopPropagation()}
                />
                <label
                  htmlFor={item.key}
                  className="text-[11px] sm:text-xs leading-snug cursor-pointer select-none"
                  onClick={(e) => e.stopPropagation()}
                >
                  {item.label}
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Section: Notes & Actions */}
        <div className="space-y-2 pt-2 shrink-0">
          <div className="bg-amber-50/70 border border-amber-200/60 p-2 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-[10px] text-amber-800 leading-tight">
              <span className="font-semibold">Important:</span> Vehicle permits, insurance, and road compliance are the sole responsibility of the Owner/Driver. Chalo Sawaari is a platform provider.
            </p>
          </div>

          {errors.length > 0 && (
            <div className="p-1.5 bg-red-50 border border-red-200 rounded-lg text-[11px] text-red-600 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{errors[0]}</span>
            </div>
          )}

          <Button
            onClick={handleSubmit}
            disabled={!allAgreementsAccepted || isSubmitting}
            className="w-full bg-blue-600 text-white hover:bg-blue-700 h-10 sm:h-11 rounded-xl text-xs sm:text-sm font-semibold shadow-xs transition-all disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting Agreement...
              </>
            ) : (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Accept & Continue ({Object.values(agreements).filter(Boolean).length}/7)
              </>
            )}
          </Button>

          <p className="text-[10px] text-gray-400 text-center leading-tight">
            By accepting, you agree to Chalo Sawaari Driver Partner Terms & Conditions.
          </p>
        </div>
      </div>
    </div>
  );
};

export default DriverAgreementForm;
