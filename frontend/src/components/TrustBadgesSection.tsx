import React from "react";
import { Percent, ShieldCheck, Headphones, Tag } from "lucide-react";

interface TrustBadge {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  title: string;
  subtitle: string;
}

const trustBadges: TrustBadge[] = [
  {
    id: "best-prices",
    icon: Percent,
    iconBg: "bg-blue-500",
    iconColor: "text-white",
    title: "Best Prices",
    subtitle: "Lowest fares guaranteed",
  },
  {
    id: "safe-secure",
    icon: ShieldCheck,
    iconBg: "bg-emerald-500",
    iconColor: "text-white",
    title: "Safe & Secure",
    subtitle: "Verified drivers & vehicles",
  },
  {
    id: "24-7-support",
    icon: Headphones,
    iconBg: "bg-amber-500",
    iconColor: "text-white",
    title: "24/7 Support",
    subtitle: "We're always here to help",
  },
  {
    id: "exclusive-offers",
    icon: Tag,
    iconBg: "bg-purple-600",
    iconColor: "text-white",
    title: "Exclusive Offers",
    subtitle: "Great deals every day",
  },
];

const TrustBadgesSection: React.FC = () => {
  return (
    <section className="px-3 pt-2 pb-2 bg-transparent">
      <div className="bg-white rounded-2xl p-3 border border-slate-200/80 shadow-xs">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
          {trustBadges.map((badge) => {
            const Icon = badge.icon;
            return (
              <div
                key={badge.id}
                className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-50/80 transition-colors"
              >
                <div
                  className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl ${badge.iconBg} ${badge.iconColor} flex items-center justify-center shrink-0 shadow-xs`}
                >
                  <Icon className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold text-slate-900 leading-tight truncate">
                    {badge.title}
                  </h4>
                  <p className="text-[10px] text-slate-500 leading-tight truncate mt-0.5">
                    {badge.subtitle}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default TrustBadgesSection;
