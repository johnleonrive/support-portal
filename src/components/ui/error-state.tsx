'use client';

import Link from 'next/link';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

interface ErrorStateProps {
  message: string;
  backLink?: { href: string; label: string };
}

export function ErrorState({ message, backLink }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 p-8">
      <Alert variant="destructive" className="max-w-md">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{message}</AlertDescription>
      </Alert>
      {backLink && (
        <Link href={backLink.href}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {backLink.label}
          </Button>
        </Link>
      )}
    </div>
  );
}
