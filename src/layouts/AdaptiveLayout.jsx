import React, { useState, useEffect } from 'react';
import DesktopLayout from './DesktopLayout';
import TabletLayout from './TabletLayout';
import MobileLayout from './MobileLayout';

export default function AdaptiveLayout({ children }) {
  const [width, setWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (width >= 1024) {
    return <DesktopLayout>{children}</DesktopLayout>;
  } else if (width >= 768) {
    return <TabletLayout>{children}</TabletLayout>;
  } else {
    return <MobileLayout>{children}</MobileLayout>;
  }
}
