'use client';

import { Badge } from '@/components/ui/badge';
import { BRAND_GRADIENT, BRAND_PRIMARY } from '@/lib/theme';

interface GradientBadgeProps extends React.ComponentProps<typeof Badge> {
  active?: boolean;
}

export function GradientBadge({ active = false, style, className, ...props }: GradientBadgeProps) {
  if (active) {
    return (
      <Badge
        className={`text-white border-0 ${className || ''}`}
        style={{ background: BRAND_GRADIENT, ...style }}
        {...props}
      />
    );
  }

  return (
    <Badge
      variant="outline"
      className={className}
      style={{ borderColor: BRAND_PRIMARY, color: BRAND_PRIMARY, ...style }}
      {...props}
    />
  );
}
