import { ArrowUpDown, Calendar, Clock, Phone, Search } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import CarImg from "@/assets/CarBar.png";
import BusImg from "@/assets/BusBar.png";
import busLogo from "@/assets/BusLogo.png";
import LocationAutocomplete from "./LocationAutocomplete";
import { cn, getDefaultDate } from "@/lib/utils";
import { resolveLocationCoordinates } from "@/lib/distanceUtils";
import { googleMapsService } from "@/services/googleMapsService";
import { useUserAuth } from "@/contexts/UserAuthContext";

type Coords = { lat: number; lng: number; description: string } | null;

const LoadingAnimation = () => (
  <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white">
    <div className="flex space-x-8 animate-pulse">
      <img src={CarImg} alt="Car" className="w-20 h-20 object-contain animate-bounce" />
      <img src={BusImg} alt="Bus" className="w-20 h-20 object-contain animate-bounce" style={{ animationDelay: "200ms" }} />
    </div>
    <div className="mt-6 text-lg font-semibold text-blue-600">Searching best vehicle for you...</div>
  </div>
);

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
};

// Resolve coordinates for a picked suggestion (current location already carries them)
const coordsFor = async (location: any): Promise<Coords> => {
  if (location.place_id === "current_location" && "lat" in location) {
    return { lat: location.lat, lng: location.lng, description: location.description };
  }
  try {
    const place = await googleMapsService.getPlaceDetails(location.place_id);
    const loc = place?.geometry?.location;
    return loc ? { lat: loc.lat(), lng: loc.lng(), description: location.description } : null;
  } catch (error) {
    console.error("Error getting coordinates:", error);
    return null;
  }
};

const inputClass =
  "h-14 border-0 bg-transparent rounded-none text-[15px] font-semibold text-slate-900 placeholder:text-slate-400 placeholder:font-medium focus:border-0 hover:border-0";

const HeroSection = () => {
  const navigate = useNavigate();
  const { user } = useUserAuth();
  const [fromLocation, setFromLocation] = useState("");
  const [toLocation, setToLocation] = useState("");
  const [fromLocationData, setFromLocationData] = useState<Coords>(null);
  const [toLocationData, setToLocationData] = useState<Coords>(null);
  const [departureDate, setDepartureDate] = useState(() => getDefaultDate(1));
  const [pickupTime, setPickupTime] = useState("09:00");
  const [loading, setLoading] = useState(false);

  const handleSwapLocations = () => {
    setFromLocation(toLocation);
    setToLocation(fromLocation);
    setFromLocationData(toLocationData);
    setToLocationData(fromLocationData);
  };

  const handleSearch = async () => {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;

    const error =
      !fromLocation.trim() || !toLocation.trim() ? "Please select pickup and drop locations"
      : !dateRegex.test(departureDate) ? "Please select a valid pickup date"
      : !timeRegex.test(pickupTime) ? "Please select a valid pickup time"
      : null;
    if (error) {
      toast.error(error);
      return;
    }

    const fromData = fromLocationData || (await resolveLocationCoordinates(fromLocation));
    const toData = toLocationData || (await resolveLocationCoordinates(toLocation));
    setFromLocationData(fromData);
    setToLocationData(toData);

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      navigate("/vehicle-search", {
        state: {
          from: fromLocation,
          to: toLocation,
          fromData,
          toData,
          pickupDate: departureDate,
          pickupTime,
          serviceType: "oneWay",
          returnDate: null,
        },
      });
    }, 1200);
  };

  const today = getDefaultDate(0);
  const tomorrow = getDefaultDate(1);
  const openPicker = (e: React.MouseEvent<HTMLInputElement>) => e.currentTarget.showPicker?.();

  return (
    <section className="relative">
      {loading && <LoadingAnimation />}

      {/* App header */}
      {/* pt-4 only: native wrapper already offsets the WebView below the status bar; env(safe-area-inset-top) double-counted it */}
      <header className="px-5 pt-4 pb-5 bg-white border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src={busLogo} alt="Chalo Sawari" className="w-10 h-10 object-contain" />
            <span className="text-[15px] font-extrabold tracking-tight text-slate-900">
              CHALO <span className="text-blue-600">SAWARI</span>
            </span>
          </div>
          <a
            href="tel:+919171838260"
            aria-label="Call helpline"
            className="flex items-center gap-1.5 h-9 pl-2.5 pr-3 rounded-full bg-blue-50 text-blue-600 text-xs font-semibold active:scale-95 transition"
          >
            <Phone className="w-3.5 h-3.5" />
            Help 24/7
          </a>
        </div>

        <div className="mt-5">
          <p className="text-sm text-slate-500">
            {greeting()}{user?.firstName ? `, ${user.firstName}` : ""} 👋
          </p>
          <h1 className="mt-1 text-2xl font-bold leading-tight text-slate-900">Where are you going today?</h1>
        </div>
      </header>

      {/* Booking card */}
      <div className="px-4 pt-4">
        <div className="bg-white rounded-3xl p-4 shadow-[0_8px_30px_-12px_rgba(15,23,42,0.18)] border border-slate-100">
          {/* From / To */}
          <div className="flex items-stretch rounded-2xl border border-slate-200 bg-slate-50/60">
            <div className="relative flex-1 min-w-0">
              {/* dashed route line between the two location dots */}
              <span className="absolute left-[29px] top-[44px] bottom-[44px] border-l-2 border-dashed border-slate-300 pointer-events-none" />
              <LocationAutocomplete
                value={fromLocation}
                onChange={(v) => { setFromLocation(v); setFromLocationData(null); }}
                onLocationSelect={async (location) => {
                  setFromLocation(location.description);
                  setFromLocationData(await coordsFor(location));
                }}
                placeholder="Pickup location"
                icon={<span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20" />}
                className={inputClass}
                showGetLocation
              />
              <div className="ml-12 border-t border-slate-200" />
              <LocationAutocomplete
                value={toLocation}
                onChange={(v) => { setToLocation(v); setToLocationData(null); }}
                onLocationSelect={async (location) => {
                  setToLocation(location.description);
                  setToLocationData(await coordsFor(location));
                }}
                placeholder="Drop location"
                icon={<span className="w-2.5 h-2.5 rounded-sm bg-rose-500 ring-4 ring-rose-500/20" />}
                className={inputClass}
              />
            </div>
            <div className="flex items-center pr-2">
              <button
                type="button"
                onClick={handleSwapLocations}
                aria-label="Swap pickup and drop"
                className="w-9 h-9 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center text-blue-600 active:rotate-180 transition-transform duration-300"
              >
                <ArrowUpDown className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick date chips */}
          <div className="flex gap-2 mt-4">
            {[[today, "Today"], [tomorrow, "Tomorrow"]].map(([date, label]) => (
              <button
                key={label}
                type="button"
                onClick={() => setDepartureDate(date)}
                className={cn(
                  "h-8 px-3.5 rounded-full text-xs font-semibold border transition-colors",
                  departureDate === date
                    ? "bg-blue-600 border-blue-600 text-white"
                    : "bg-white border-slate-200 text-slate-600"
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Date / time tiles */}
          <div className="grid grid-cols-2 gap-2.5 mt-2.5">
            <label className="flex items-center gap-2.5 rounded-2xl border border-slate-200 px-3 py-2.5 cursor-pointer">
              <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
              <span className="min-w-0 flex-1">
                <span className="block text-[11px] font-medium text-slate-500">Pickup date</span>
                <input
                  type="date"
                  value={departureDate}
                  min={today}
                  onChange={(e) => setDepartureDate(e.target.value)}
                  onClick={openPicker}
                  className="w-full bg-transparent text-sm font-semibold text-slate-900 outline-none [&::-webkit-calendar-picker-indicator]:hidden"
                />
              </span>
            </label>
            <label className="flex items-center gap-2.5 rounded-2xl border border-slate-200 px-3 py-2.5 cursor-pointer">
              <Clock className="w-4 h-4 text-blue-600 shrink-0" />
              <span className="min-w-0 flex-1">
                <span className="block text-[11px] font-medium text-slate-500">Pickup time</span>
                <input
                  type="time"
                  value={pickupTime}
                  onChange={(e) => setPickupTime(e.target.value)}
                  onClick={openPicker}
                  className="w-full bg-transparent text-sm font-semibold text-slate-900 outline-none [&::-webkit-calendar-picker-indicator]:hidden"
                />
              </span>
            </label>
          </div>

          <button
            type="button"
            onClick={handleSearch}
            className="mt-4 w-full h-[52px] rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-[15px] flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 active:scale-[0.98] transition-transform"
          >
            <Search className="w-5 h-5" />
            Search Vehicles
          </button>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
