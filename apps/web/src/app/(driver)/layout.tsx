import { ReactNode } from 'react';
import { SupportButton } from '@/components/SupportButton';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function DriverLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <ThemeToggle className="fixed bottom-24 left-4 z-[70] md:bottom-6" />
      <SupportButton />
    </>
  );
}
