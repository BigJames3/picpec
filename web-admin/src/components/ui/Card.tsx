/**
 * Card - Composant carte réutilisable
 * Palette picpec-* respectée
 */
import type { HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Titre optionnel */
  title?: string;
  /** Sous-titre optionnel */
  subtitle?: string;
  /** Padding réduit */
  compact?: boolean;
}

export default function Card({
  title,
  subtitle,
  compact = false,
  className = '',
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={`
        bg-white rounded-xl shadow
        border border-gray-100
        overflow-hidden
        ${className}
      `}
      {...props}
    >
      {(title || subtitle) && (
        <div className={`border-b border-gray-100 ${compact ? 'px-4 py-3' : 'px-6 py-4'}`}>
          {title && (
            <h3 className="text-lg font-semibold text-picpec-dark">{title}</h3>
          )}
          {subtitle && (
            <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
          )}
        </div>
      )}
      <div className={compact ? 'p-4' : 'p-6'}>{children}</div>
    </div>
  );
}
