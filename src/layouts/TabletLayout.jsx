import React from 'react';

export default function TabletLayout({ children }) {
  return (
    <div className="w-full max-w-[1024px] mx-auto space-y-6 p-6 hidden md:block lg:hidden z-10 relative">
      {children}
    </div>
  );
}
