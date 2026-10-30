import React from "react";
import { ShieldCheck, Armchair, Star } from "lucide-react";

interface Feature {
  id: string;
  renderIcon: () => React.ReactNode;
  title: string;
  description?: string;
}

const features: Feature[] = [
  {
    id: "trusted",
    renderIcon: () => (
      <div className="w-12 h-12 rounded-full bg-blue-50/90 flex items-center justify-center shadow-xs">
        <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white shadow-2xs">
          <ShieldCheck className="w-4 h-4" />
        </div>
      </div>
    ),
    title: "Trusted & Reliable",
  },
  {
    id: "pricing",
    renderIcon: () => (
      <div className="w-12 h-12 rounded-full bg-emerald-50/90 flex items-center justify-center shadow-xs">
        <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center text-white font-extrabold text-sm shadow-2xs">
          ₹
        </div>
      </div>
    ),
    title: "Affordable Pricing",
    description: "Best prices with no hidden charges",
  },
  {
    id: "comfort",
    renderIcon: () => (
      <div className="w-12 h-12 rounded-full bg-purple-50/90 flex items-center justify-center shadow-xs">
        <div className="w-7 h-7 rounded-full bg-purple-600 flex items-center justify-center text-white shadow-2xs">
          <Armchair className="w-4 h-4" />
        </div>
      </div>
    ),
    title: "Comfortable Rides",
    description: "Well-maintained vehicles for a smooth journey",
  },
  {
    id: "customer",
    renderIcon: () => (
      <div className="w-12 h-12 rounded-full bg-amber-50/90 flex items-center justify-center shadow-xs">
        <div className="w-7 h-7 rounded-full bg-amber-500 flex items-center justify-center text-white shadow-2xs">
          <Star className="w-4 h-4 fill-white text-white" />
        </div>
      </div>
    ),
    title: "Customer First",
    description: "Your satisfaction is our priority",
  },
];

const WhyChooseUs: React.FC = () => {
  return (
    <section className="px-3 pt-2.5 pb-2 bg-transparent">
      {/* Outer Card Container */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-100 shadow-sm">
        {/* Section Title */}
        <div className="mb-4">
          <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
            Why Choose Chalo Sawari?
          </h3>
        </div>

        {/* 4 Feature Items with subtle vertical divider */}
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
          {features.map((item, idx) => (
            <div
              key={item.id}
              className={`flex flex-col items-center text-center p-2.5 sm:px-3 hover:bg-slate-50/60 rounded-xl transition-colors ${
                idx % 2 === 1 ? "border-l sm:border-l-0 border-slate-100" : ""
              }`}
            >
              {/* Circular Icon with outer soft glow */}
              <div className="mb-2.5 flex items-center justify-center">
                {item.renderIcon()}
              </div>

              {/* Title */}
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                {item.title}
              </h4>

              {/* Description */}
              {item.description && (
                <p className="text-[11px] text-slate-500 leading-normal mt-1 max-w-[150px]">
                  {item.description}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhyChooseUs;