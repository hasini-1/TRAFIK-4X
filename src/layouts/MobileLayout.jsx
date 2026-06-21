import React from 'react';

export default function MobileLayout({ children }) {
  return (
    <div className="w-full mx-auto space-y-4 p-4 md:hidden z-10 relative">
      {children}
    </div>
  );
}
