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
      className="fixed bottom-0 inset-x-0 mx-auto w-full max-w-[480px] bg-white/95 backdrop-blur-md border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] z-[100]"
      style={{ zIndex: 100 }}
    >
      {/* pb-2 only: native wrapper already keeps the WebView above the system nav bar; env(safe-area-inset-bottom) double-counted it */}
      <div className="w-full px-2 pt-1.5 pb-2">
        <nav className="flex items-center justify-around">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "relative flex flex-col items-center justify-center py-1.5 px-2 min-w-0 flex-1 rounded-xl transition-colors select-none [-webkit-tap-highlight-color:transparent]",
                  active
                    ? "text-blue-600"
                    : "text-gray-500 hover:text-gray-800"
                )}
              >
                <div className={cn(
                  "relative px-5 py-1 rounded-full transition-colors duration-200",
                  active && "bg-blue-100/80"
                )}>
                  <Icon className={cn(
                    "w-5 h-5",
                    active ? "stroke-[2.25] text-blue-600" : "stroke-[1.75] text-gray-500"
                  )} />
                </div>

                <span className={cn(
                  "text-[11px] mt-0.5 tracking-tight font-semibold relative",
                  active ? "text-blue-600" : "text-gray-500"
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
