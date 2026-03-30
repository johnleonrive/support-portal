'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Sidebar } from './Sidebar';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface ProtectedLayoutProps {
  children: React.ReactNode;
}

export function ProtectedLayout({ children }: ProtectedLayoutProps) {
  const router = useRouter();
  const { user, isAuthenticated, hasHydrated, logout } = useAuth();

  useEffect(() => {
    if (hasHydrated && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, hasHydrated, router]);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  if (!hasHydrated) {
    return <LoadingSpinner fullScreen message="Loading..." />;
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <div className="h-screen bg-white flex overflow-hidden">
      <Sidebar onLogout={handleLogout} />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
