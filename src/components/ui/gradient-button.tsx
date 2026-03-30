'use client';

import { forwardRef } from 'react';
import { Button } from '@/components/ui/button';
import { BRAND_GRADIENT } from '@/lib/theme';

type GradientButtonProps = React.ComponentProps<typeof Button>;

export const GradientButton = forwardRef<HTMLButtonElement, GradientButtonProps>(
  ({ style, className, ...props }, ref) => (
    <Button
      ref={ref}
      className={`text-white border-0 ${className || ''}`}
      style={{ background: BRAND_GRADIENT, ...style }}
      {...props}
    />
  )
);
GradientButton.displayName = 'GradientButton';
