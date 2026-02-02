import { cn } from '@/lib/utils';

/**
 * Centralized EmptyState component for consistent empty/zero-state UIs
 *
 * @param {Object} props
 * @param {React.ElementType} props.icon - Lucide icon component
 * @param {string} props.title - Main message (optional)
 * @param {string} props.description - Secondary description text
 * @param {React.ReactNode} props.action - CTA button or action element (optional)
 * @param {string} props.className - Additional CSS classes
 */
export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className
}) {
  return (
    <div className={cn(
      "text-center py-12 card-surface",
      className
    )}>
      {Icon && (
        <Icon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
      )}
      {title && (
        <h3 className="text-lg font-medium text-foreground mb-2">{title}</h3>
      )}
      {description && (
        <p className="text-muted-foreground mb-4 max-w-md mx-auto">{description}</p>
      )}
      {action && (
        <div className="flex justify-center gap-3">
          {action}
        </div>
      )}
    </div>
  );
}
