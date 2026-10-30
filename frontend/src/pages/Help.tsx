import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronRight, Phone, Mail, ChevronDown, ArrowLeft, Loader2, HelpCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import UserBottomNavigation from "@/components/UserBottomNavigation";
import DriverBottomNavigation from "@/driver/components/DriverBottomNavigation";
import { useDriverAuth } from "@/contexts/DriverAuthContext";
import { helpApi, type FAQ, type SupportSetting } from "@/services/helpApi";

const Help = () => {
  const navigate = useNavigate();
  const { isLoggedIn: isDriverLoggedIn } = useDriverAuth();
  const isDriver = isDriverLoggedIn || Boolean(localStorage.getItem('driverToken'));

  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [supportSettings, setSupportSettings] = useState<SupportSetting>({
    phone: "+919171838260",
    email: "chalosawariofficial@gmail.com",
    callSupportTitle: "Call Support",
    callSupportDescription: "Speak with our customer care",
    emailSupportTitle: "Email Support",
    emailSupportDescription: "Send us an email"
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadHelpData();
  }, []);

  const loadHelpData = async () => {
    try {
      setIsLoading(true);
      const response = await helpApi.getPublicHelpData();
      if (response.success && response.data) {
        setFaqs(response.data.faqs || []);
        if (response.data.supportSettings) {
          setSupportSettings(response.data.supportSettings);
        }
      }
    } catch (error) {
      console.error("Error loading help data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleFAQ = (id: string) => {
    setExpandedFAQ(expandedFAQ === id ? null : id);
  };

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate(isDriver ? '/driver/profile' : '/profile');
    }
  };

  const handleCall = () => {
    const phoneNumber = supportSettings.phone || "+919171838260";
    window.location.href = `tel:${phoneNumber.replace(/\s+/g, '')}`;
  };

  const handleEmail = () => {
    const emailAddress = supportSettings.email || "chalosawariofficial@gmail.com";
    window.location.href = `mailto:${emailAddress}?subject=Chalo Sawari Support Request`;
  };

  return (
    <div className="min-h-screen bg-background">
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
          Help & Support
        </h1>
        <div className="w-8"></div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-6 pb-24">
        {/* Contact Support */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">Contact Support</h2>
          <div className="space-y-3">
            {/* Call Support Card */}
            <Card className="p-4 border border-border bg-card shadow-xs hover:border-primary/30 transition-colors">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                  <Phone className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-foreground text-sm sm:text-base truncate">
                    {supportSettings.callSupportTitle || "Call Support"}
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">
                    {supportSettings.callSupportDescription || "Speak with our customer care"}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={handleCall} className="shrink-0 font-medium">
                  Call Now
                </Button>
              </div>
            </Card>

            {/* Email Support Card */}
            <Card className="p-4 border border-border bg-card shadow-xs hover:border-primary/30 transition-colors">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                  <Mail className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-foreground text-sm sm:text-base truncate">
                    {supportSettings.emailSupportTitle || "Email Support"}
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">
                    {supportSettings.emailSupportDescription || "Send us an email"}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={handleEmail} className="shrink-0 font-medium">
                  Send Email
                </Button>
              </div>
            </Card>
          </div>
        </div>

        {/* Frequently Asked Questions - Only visible to passenger/users, hidden for drivers */}
        {!isDriver && (
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-4">
              Frequently Asked Questions
            </h2>

            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <Card key={i} className="p-4 border border-border">
                    <div className="animate-pulse flex justify-between items-center">
                      <div className="space-y-2 flex-1 mr-4">
                        <div className="h-4 bg-muted rounded w-3/4"></div>
                        <div className="h-3 bg-muted rounded w-1/2"></div>
                      </div>
                      <div className="w-5 h-5 bg-muted rounded-full"></div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : faqs.length === 0 ? (
              <Card className="p-8 text-center border border-border">
                <HelpCircle className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-50" />
                <p className="text-muted-foreground text-sm">No help topics available at the moment.</p>
              </Card>
            ) : (
              <div className="space-y-3">
                {faqs.map((topic) => {
                  const isExpanded = expandedFAQ === topic._id;
                  return (
                    <Card key={topic._id} className="border border-border overflow-hidden">
                      <div 
                        className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => toggleFAQ(topic._id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 pr-2">
                            <h3 className="font-medium text-foreground text-sm sm:text-base">{topic.title}</h3>
                          </div>
                          {isExpanded ? (
                            <ChevronDown className="w-5 h-5 text-muted-foreground shrink-0" />
                          ) : (
                            <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                          )}
                        </div>
                      </div>
                      {isExpanded && (
                        <div className="px-4 pb-4">
                          <div className="border-t border-border pt-4">
                            <p className="text-sm text-foreground whitespace-pre-line leading-relaxed">{topic.content}</p>
                          </div>
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {isDriver ? <DriverBottomNavigation /> : <UserBottomNavigation />}
    </div>
  );
};

export default Help;