import React from "react";
import { ChevronRight, ArrowLeftRight, MapPin, Car } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getDefaultDate } from "@/lib/utils";

interface PopularRoute {
  id: string;
  from: string;
  to: string;
  fromColor: string;
  toColor: string;
  price: string;
}

const popularRoutes: PopularRoute[] = [
  {
    id: "indore-ujjain",
    from: "Indore",
    to: "Ujjain",
    fromColor: "text-blue-600",
    toColor: "text-amber-500",
    price: "₹199",
  },
  {
    id: "indore-bhopal",
    from: "Indore",
    to: "Bhopal",
    fromColor: "text-rose-600",
    toColor: "text-amber-500",
    price: "₹349",
  },
  {
    id: "indore-dewas",
    from: "Indore",
    to: "Dewas",
    fromColor: "text-purple-600",
    toColor: "text-emerald-500",
    price: "₹149",
  },
  {
    id: "indore-omkareshwar",
    from: "Indore",
    to: "Omkareshwar",
    fromColor: "text-blue-600",
    toColor: "text-orange-500",
    price: "₹179",
  },
];

const PopularRoutesSection: React.FC = () => {
  const navigate = useNavigate();

  const handleRouteClick = (from: string, to: string) => {
    navigate("/vehicle-search", {
      state: {
        from,
        to,
        pickupDate: getDefaultDate(1),
        pickupTime: "09:00",
        serviceType: "oneWay",
      },
    });
  };

  return (
    <section className="px-3 pt-3 pb-2 bg-transparent">
      {/* Header */}
      <div className="flex items-center justify-between mb-2.5 px-0.5">
        <h3 className="text-sm sm:text-base font-bold text-slate-900">
          Popular Routes
        </h3>
        <button
          type="button"
          onClick={() => handleRouteClick("Indore", "Ujjain")}
          className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-0.5 transition-colors cursor-pointer"
        >
          <span>View All Routes</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Routes Grid / Horizontal Scroll */}
      <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-none snap-x snap-mandatory">
        {popularRoutes.map((route) => (
          <div
            key={route.id}
            onClick={() => handleRouteClick(route.from, route.to)}
            className="min-w-[190px] sm:min-w-[210px] bg-white rounded-2xl p-3 border border-slate-200/90 shadow-2xs hover:shadow-xs hover:border-blue-300 transition-all cursor-pointer snap-start group"
          >
            {/* Route Source & Destination */}
            <div className="flex items-center justify-between gap-1 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-1 min-w-0">
                <MapPin className={`w-3.5 h-3.5 shrink-0 ${route.fromColor}`} />
                <span className="text-xs font-bold text-slate-800 truncate">
                  {route.from}
                </span>
              </div>

              <ArrowLeftRight className="w-3 h-3 text-slate-400 group-hover:text-blue-600 shrink-0 transition-colors" />

              <div className="flex items-center gap-1 min-w-0">
                <span className="text-xs font-bold text-slate-800 truncate">
                  {route.to}
                </span>
                <MapPin className={`w-3.5 h-3.5 shrink-0 ${route.toColor}`} />
              </div>
            </div>

            {/* Price & Car Icon */}
            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] font-medium text-slate-500">
                Starting at <span className="font-extrabold text-xs text-slate-900">{route.price}</span>
              </span>
              <div className="w-5 h-5 rounded-md bg-slate-100 group-hover:bg-blue-50 text-slate-700 group-hover:text-blue-600 flex items-center justify-center transition-colors">
                <Car className="w-3 h-3" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default PopularRoutesSection;
