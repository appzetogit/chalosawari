import React from "react";
import { Download } from "lucide-react";
import mobileAppImage from "@/assets/mobile-app.png";

const AppDownloadBanner: React.FC = () => {
  const handleDownload = () => {
    window.open(
      "https://play.google.com/store/apps/details?id=com.chalo.sawari",
      "_blank"
    );
  };

  return (
    <section className="px-3 pt-3 pb-3 bg-transparent">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-100 via-sky-100/90 to-blue-200/80 border border-blue-200/80 p-4 sm:p-5 shadow-xs">
        {/* Background decorative elements */}
        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-blue-300/30 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-6 w-24 h-24 bg-sky-300/20 rounded-full blur-xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 relative z-10">
          {/* Left / Top Text & CTA */}
          <div className="flex-1 space-y-2 text-left w-full sm:w-auto">
            <h3 className="text-base sm:text-lg font-extrabold text-blue-900 tracking-tight">
              Book Faster with Our App
            </h3>
            <p className="text-xs text-slate-600 font-medium leading-relaxed max-w-xs">
              Get exclusive app-only offers and manage your bookings on the go.
            </p>

            <div className="pt-1.5 flex items-center gap-3">
              <button
                type="button"
                onClick={handleDownload}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm hover:shadow active:scale-95 transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Now</span>
              </button>
            </div>
          </div>

          {/* Right Mobile Visual */}
          <div className="shrink-0 flex items-center justify-center">
            <div className="relative w-24 sm:w-28 drop-shadow-md">
              <img
                src={mobileAppImage}
                alt="Chalo Sawari Mobile App"
                className="w-full h-auto object-contain transform hover:scale-105 transition-transform duration-300"
              />
            </div>
          </div>
        </div>

        {/* Carousel indicators dots */}
        <div className="flex items-center justify-center gap-1.5 mt-3">
          <span className="w-5 h-1.5 rounded-full bg-blue-600 transition-all" />
          <span className="w-1.5 h-1.5 rounded-full bg-blue-300 transition-all" />
          <span className="w-1.5 h-1.5 rounded-full bg-blue-300 transition-all" />
        </div>
      </div>
    </section>
  );
};

export default AppDownloadBanner;
