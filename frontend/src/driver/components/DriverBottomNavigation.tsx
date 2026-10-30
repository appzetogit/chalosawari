import { Link, useLocation } from "react-router-dom";
import { 
  Home,
  FileText,
  Car,
  User
} from "lucide-react";
import { cn } from "@/lib/utils";

const DriverBottomNavigation = () => {
  const location = useLocation();

  const navigationItems = [
    {
      title: "Home",
      href: "/driver",
      icon: Home,
    },
    {
      title: "Requests",
      href: "/driver/requests",
      icon: FileText,
    },
    {
      title: "My Vehicle",
      href: "/driver/myvehicle",
      icon: Car,
    },
    {
      title: "Profile",
      href: "/driver/profile",
      icon: User,
    },
  ];

  const isActive = (href: string) => {
    const currentPath = location.pathname;
    
    if (href === "/driver") {
      return currentPath === "/driver";
    }
    
    return currentPath.startsWith(href);
  };

  return (
    <div
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-white/95 backdrop-blur-md border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] z-[100]"
      style={{ zIndex: 100 }}
    >
      <div className="w-full px-2 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom,0.5rem))]">
        <nav className="flex items-center justify-around">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "relative flex flex-col items-center justify-center py-1.5 px-2 min-w-0 flex-1 rounded-xl transition-all duration-200 active:scale-95 select-none",
                  active
                    ? "text-blue-600 font-semibold"
                    : "text-gray-500 hover:text-gray-800"
                )}
              >
                {/* Active Background Indicator */}
                {active && (
                  <span className="absolute inset-0 bg-blue-50/90 rounded-xl" />
                )}

                <div className="relative">
                  <Icon className={cn(
                    "w-5 h-5 transition-transform duration-200",
                    active ? "stroke-[2.25] scale-105 text-blue-600" : "stroke-[1.75] text-gray-500"
                  )} />
                </div>

                <span className={cn(
                  "text-[11px] mt-0.5 tracking-tight font-medium transition-all duration-200 relative",
                  active ? "text-blue-600 font-bold" : "text-gray-500"
                )}>
                  {item.title}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
};

export default DriverBottomNavigation;
