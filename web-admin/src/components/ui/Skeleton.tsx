/**
 * Skeleton - Composant loader de chargement
 * Palette picpec-* respectée
 */
import type { HTMLAttributes } from 'react';

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  /** Variante : ligne, carte, avatar, cercle */
  variant?: 'line' | 'card' | 'avatar' | 'circle';
}

export default function Skeleton({
  variant = 'line',
  className = '',
  ...props
}: SkeletonProps) {
  const baseClasses = 'animate-pulse bg-gray-200 rounded';

  const variantClasses: Record<NonNullable<SkeletonProps['variant']>, string> = {
    line: 'h-4 w-full',
    card: 'h-24 w-full',
    avatar: 'h-12 w-12 rounded-full',
    circle: 'h-4 w-4 rounded-full',
  };

  const v = variant ?? 'line';
  return (
    <div
      className={`${baseClasses} ${variantClasses[v]} ${className}`}
      {...props}
    />
  );
}

/** Skeleton pour une ligne de tableau */
export function TableRowSkeleton({ cols = 5 }: { cols?: number }) {
  return (
    <tr className="border-b">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton variant="line" className="h-4" />
        </td>
      ))}
    </tr>
  );
}
