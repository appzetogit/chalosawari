import { Phone } from "lucide-react";
import busLogo from "@/assets/BusLogo.png";
import { Link } from "react-router-dom";

const DriverTopNavigation = () => {
  return (
    <nav className="sticky top-0 z-50 w-full bg-white shadow-xs border-b border-gray-100">
      <div className="w-full px-4 py-2.5 flex justify-between items-center">
        {/* Mobile Logo + Text */}
        <Link to="/driver" className="flex items-center space-x-2 hover:opacity-90 transition-opacity">
          <img 
            src={busLogo} 
            alt="Bus Logo" 
            className="w-11 h-11 sm:w-12 sm:h-12 object-contain" 
          />
          <div className="flex flex-col">
            <div className="flex items-baseline">
              <span className="text-lg font-extrabold text-black tracking-tight">CHALO</span>
              <span className="text-lg font-extrabold text-blue-600 ml-1 tracking-tight">SAWARI</span>
            </div>
            <span className="text-[10px] sm:text-[11px] text-blue-600 font-semibold -mt-0.5">Driver Portal</span>
          </div>
        </Link>

        {/* Helpline Number */}
        <div className="flex flex-col items-end">
          <span className="text-[10px] sm:text-xs text-gray-500 font-medium">Driver Support</span>
          <a 
            href="tel:+919171838260"
            className="flex items-center text-xs sm:text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors"
          >
            <Phone className="w-3.5 h-3.5 mr-1 text-blue-600" />
            +91 9171838260
          </a>
        </div>
      </div>
    </nav>
  );
};

export default DriverTopNavigation;