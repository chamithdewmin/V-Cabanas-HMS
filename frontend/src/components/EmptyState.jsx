import React from 'react';
import { Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Reusable empty state: icon, short message, optional primary action.
 * Use on list pages when there are no items (Booking, Invoices, Clients, Salary, Pricing, etc.).
 */
const EmptyState = ({
  icon: Icon = Inbox,
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}) => (
  <div
    className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}
    role="status"
    aria-label={title}
  >
    <div className="rounded-full bg-muted/50 p-4 mb-4 text-muted-foreground" aria-hidden="true">
      <Icon className="h-10 w-10" />
    </div>
    <p className="text-foreground font-medium text-base">{title}</p>
    {description && (
      <p className="text-muted-foreground text-sm mt-1 max-w-sm">{description}</p>
    )}
    {actionLabel && onAction && (
      <Button
        onClick={onAction}
        className="mt-4 min-h-[44px] gap-2"
      >
        {actionLabel}
      </Button>
    )}
  </div>
);

export default EmptyState;
