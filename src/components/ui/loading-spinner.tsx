'use client';

import { BRAND_PRIMARY } from '@/lib/theme';

interface LoadingSpinnerProps {
  message?: string;
  fullScreen?: boolean;
}

export function LoadingSpinner({ message, fullScreen = false }: LoadingSpinnerProps) {
  const spinner = (
    <div className="flex flex-col items-center justify-center gap-3">
      <div
        className="animate-spin rounded-full h-8 w-8 border-b-2"
        style={{ borderColor: BRAND_PRIMARY }}
      />
      {message && <p className="text-sm text-gray-500">{message}</p>}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="h-screen flex items-center justify-center bg-white">
        {spinner}
      </div>
    );
  }

  return spinner;
}
