import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Home, Car, ShieldAlert } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md w-full text-center bg-white p-8 rounded-2xl shadow-xl border border-slate-100">
        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h1 className="text-4xl font-black text-slate-900 mb-2">404</h1>
        <p className="text-lg font-semibold text-slate-700 mb-1">Page Not Found</p>
        <p className="text-sm text-slate-500 mb-6 font-mono bg-slate-100 py-1.5 px-3 rounded-lg inline-block">
          {location.pathname}
        </p>
        
        <div className="space-y-2">
          <Link
            to="/"
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-all shadow-md shadow-blue-500/20"
          >
            <Home className="w-4 h-4" />
            Go to User Home
          </Link>
          <div className="grid grid-cols-2 gap-2 pt-2">
            <Link
              to="/driver"
              className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium transition-all"
            >
              <Car className="w-3.5 h-3.5" />
              Driver Portal
            </Link>
            <Link
              to="/admin"
              className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium transition-all"
            >
              Admin Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;

