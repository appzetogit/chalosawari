import React, { useEffect, useState } from "react";
import { Copy, Check } from "lucide-react";
import BusBarImg from "@/assets/BusBar.png";
import CarBarImg from "@/assets/CarBar.png";
import { offerApi, type Offer } from "@/services/offerApi";

// Card color themes, used in turn for each offer
const themes = [
  {
    bgGradient: "from-purple-50 via-indigo-50/70 to-purple-100/60",
    borderColor: "border-purple-200/80",
    badgeBorder: "border-purple-300",
    badgeTextColor: "text-purple-900",
    textColor: "text-purple-950",
    subtextColor: "text-purple-700",
  },
  {
    bgGradient: "from-emerald-50 via-teal-50/70 to-green-100/60",
    borderColor: "border-emerald-200/80",
    badgeBorder: "border-emerald-300",
    badgeTextColor: "text-emerald-900",
    textColor: "text-emerald-950",
    subtextColor: "text-emerald-700",
  },
  {
    bgGradient: "from-amber-50 via-orange-50/70 to-amber-100/60",
    borderColor: "border-amber-200/80",
    badgeBorder: "border-amber-300",
    badgeTextColor: "text-amber-900",
    textColor: "text-amber-950",
    subtextColor: "text-amber-700",
  },
];

const OffersSection: React.FC = () => {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    offerApi.getActiveOffers()
      .then(res => setOffers(Array.isArray(res.data) ? res.data : []))
      .catch(() => setOffers([]));
  }, []);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  if (offers.length === 0) return null;

  return (
    <section className="px-3 pt-3 pb-2 bg-transparent">
      <h3 className="text-sm sm:text-base font-bold text-slate-900 mb-2.5 px-0.5">
        Exclusive Offers & Discounts
      </h3>

      {/* Horizontal Carousel */}
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none snap-x snap-mandatory">
        {offers.map((offer, index) => {
          const theme = themes[index % themes.length];
          const code = offer.code || "";
          const isCopied = copiedCode === code;
          const picture = offer.image || (offer.vehicleType === "bus" ? BusBarImg : offer.vehicleType === "car" ? CarBarImg : "");
          const subtitle = offer.description || (
            offer.vehicleType === "bus" ? "On Bus Bookings" : offer.vehicleType === "car" ? "On Car Bookings" : "On All Bookings"
          );

          return (
            <div
              key={offer._id}
              className={`min-w-[260px] sm:min-w-[280px] max-w-[280px] rounded-2xl p-3.5 bg-gradient-to-r ${theme.bgGradient} border ${theme.borderColor} shadow-xs flex justify-between items-center relative overflow-hidden shrink-0 snap-start`}
            >
              {/* Left Content */}
              <div className="space-y-1.5 z-10 min-w-0">
                <div>
                  <h4 className={`text-sm sm:text-base font-extrabold ${theme.textColor} leading-tight`}>
                    {offer.title}
                  </h4>
                  <p className={`text-[11px] font-semibold ${theme.subtextColor} mt-0.5`}>
                    {subtitle}
                  </p>
                </div>

                {/* Coupon Code Pill */}
                <button
                  type="button"
                  onClick={() => handleCopyCode(code)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border-2 border-dashed ${theme.badgeBorder} bg-white/90 ${theme.badgeTextColor} font-mono font-black text-xs tracking-wider shadow-2xs hover:scale-105 active:scale-95 transition-all cursor-pointer`}
                  title="Click to copy coupon code"
                >
                  <span>{code}</span>
                  {isCopied ? (
                    <Check className="w-3 h-3 text-emerald-600" />
                  ) : (
                    <Copy className="w-3 h-3 opacity-60" />
                  )}
                </button>

                <p className="text-[10px] text-slate-500 font-medium">
                  {offer.validTill
                    ? `Valid till ${new Date(offer.validTill).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`
                    : offer.minBookingAmount
                      ? `On bookings above ₹${offer.minBookingAmount}`
                      : "Limited period offer"}
                </p>
              </div>

              {/* Right Image / Illustration */}
              <div className="w-20 h-16 sm:w-24 sm:h-20 flex items-center justify-center shrink-0 z-10">
                {picture ? (
                  <img
                    src={picture}
                    alt={subtitle}
                    className="w-full h-full object-contain filter drop-shadow-sm transform hover:scale-105 transition-transform"
                  />
                ) : (
                  <div className="text-4xl sm:text-5xl filter drop-shadow-md">🎁</div>
                )}
              </div>

              {/* Decorative Background Glow */}
              <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-white/40 blur-xl pointer-events-none" />
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default OffersSection;
