import React from "react";
import { ShieldCheck, Armchair, IndianRupee, Headphones } from "lucide-react";

const features = [
  { icon: ShieldCheck, title: "Verified drivers", tint: "bg-blue-50 text-blue-600" },
  { icon: IndianRupee, title: "No hidden charges", tint: "bg-emerald-50 text-emerald-600" },
  { icon: Armchair, title: "Comfy rides", tint: "bg-purple-50 text-purple-600" },
  { icon: Headphones, title: "24/7 support", tint: "bg-amber-50 text-amber-600" },
];

const WhyChooseUs: React.FC = () => (
  <section className="px-4">
    <h3 className="text-[17px] font-bold text-slate-900 tracking-tight mb-3">Why Chalo Sawari</h3>
    <div className="grid grid-cols-4 gap-2.5">
      {features.map(({ icon: Icon, title, tint }) => (
        <div key={title} className="flex flex-col items-center text-center gap-2 rounded-2xl bg-white border border-slate-100 py-3 px-1.5 shadow-sm">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tint}`}>
            <Icon className="w-5 h-5" />
          </div>
          <span className="text-[11px] font-semibold text-slate-700 leading-tight">{title}</span>
        </div>
      ))}
    </div>
  </section>
);

export default WhyChooseUs;
