import React from 'react';

export default function DesktopLayout({ children }) {
  return (
    <div className="w-full max-w-[1920px] mx-auto space-y-4 p-5 hidden lg:block z-10 relative">
      {children}
    </div>
  );
}
