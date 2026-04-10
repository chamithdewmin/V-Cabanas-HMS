import React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;

const DialogPortal = ({ ...props }) => (
  <DialogPrimitive.Portal {...props} />
);
DialogPortal.displayName = DialogPrimitive.Portal.displayName;

const DialogOverlay = React.forwardRef(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-dialog-overlay-in data-[state=closed]:animate-dialog-overlay-out",
      className
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

/**
 * @param {boolean} [closeOnBackdrop=false] — If false, clicking the dimmed backdrop does not close the dialog.
 * @param {boolean} [closeOnEscape=false] — If false, Escape does not close the dialog (use explicit buttons).
 */
const DialogContent = React.forwardRef(
  (
    {
      className,
      children,
      hideCloseButton,
      closeOnBackdrop = false,
      closeOnEscape = false,
      onPointerDownOutside,
      onInteractOutside,
      onEscapeKeyDown,
      ...props
    },
    ref
  ) => (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border border-secondary bg-card p-6 shadow-lg rounded-lg data-[state=open]:animate-dialog-content-in data-[state=closed]:animate-dialog-content-out",
          className
        )}
        onPointerDownOutside={(e) => {
          if (!closeOnBackdrop) e.preventDefault();
          onPointerDownOutside?.(e);
        }}
        onInteractOutside={(e) => {
          if (!closeOnBackdrop) e.preventDefault();
          onInteractOutside?.(e);
        }}
        onEscapeKeyDown={(e) => {
          if (!closeOnEscape) e.preventDefault();
          onEscapeKeyDown?.(e);
        }}
        {...props}
      >
        {children}
        {!hideCloseButton && (
          <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  )
);
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({ className, ...props }) => (
  <div
    className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)}
    {...props}
  />
);
DialogHeader.displayName = "DialogHeader";

const DialogTitle = React.forwardRef(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold leading-none tracking-tight", className)}
    {...props}
  />
));
DialogTitle.displayName = "DialogTitle";

const DialogDescription = React.forwardRef(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
DialogDescription.displayName = "DialogDescription";

const DialogFooter = ({ className, ...props }) => (
  <div
    className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:gap-2", className)}
    {...props}
  />
);
DialogFooter.displayName = "DialogFooter";

/** Full-width row: long primary (left) + short secondary (right), pill style. */
const DialogPillActions = ({ className, ...props }) => (
  <div
    className={cn("flex flex-row items-stretch gap-3 w-full pt-2", className)}
    {...props}
  />
);
DialogPillActions.displayName = "DialogPillActions";

const DialogPillPrimaryButton = React.forwardRef(({ className, ...props }, ref) => (
  <Button
    ref={ref}
    className={cn(
      "flex-1 min-h-11 h-auto rounded-full px-6 py-2.5 text-sm font-medium shadow-sm",
      className
    )}
    {...props}
  />
));
DialogPillPrimaryButton.displayName = "DialogPillPrimaryButton";

const DialogPillSecondaryButton = React.forwardRef(({ className, ...props }, ref) => (
  <Button
    ref={ref}
    type="button"
    variant="secondary"
    className={cn(
      "shrink-0 min-w-[100px] min-h-11 h-auto rounded-full px-5 py-2.5 text-sm font-medium border-0 bg-muted text-foreground hover:bg-muted/80",
      className
    )}
    {...props}
  />
));
DialogPillSecondaryButton.displayName = "DialogPillSecondaryButton";

export {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogPillActions,
  DialogPillPrimaryButton,
  DialogPillSecondaryButton,
};
