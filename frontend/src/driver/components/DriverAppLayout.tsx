import React from 'react';

interface DriverAppLayoutProps {
  children: React.ReactNode;
}

const DriverAppLayout: React.FC<DriverAppLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-slate-100 flex justify-center">
      <div className="w-full max-w-[480px] min-h-screen bg-white shadow-2xl border-x border-gray-100 flex flex-col relative overflow-x-hidden">
        {children}
      </div>
    </div>
  );
};

export default DriverAppLayout;
