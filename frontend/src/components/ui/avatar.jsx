import React from 'react';
import * as AvatarPrimitive from '@radix-ui/react-avatar';
import { cn } from '@/lib/utils';

const Avatar = React.forwardRef(({ className, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn(
      'relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full',
      className
    )}
    {...props}
  />
));
Avatar.displayName = AvatarPrimitive.Root.displayName;

const AvatarImage = React.forwardRef(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image
    ref={ref}
    className={cn('aspect-square h-full w-full', className)}
    {...props}
  />
));
AvatarImage.displayName = AvatarPrimitive.Image.displayName;

const AvatarFallback = React.forwardRef(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(
      'flex h-full w-full items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold',
      className
    )}
    {...props}
  />
));
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName;

/** Avatar with optional online indicator (green dot at bottom-right) */
function AvatarWithStatus({ online, className, children, ...props }) {
  return (
    <Avatar className={cn('relative', className)} {...props}>
      {children}
      {online && (
        <span
          className="absolute h-3 w-3 rounded-full border-2 border-card bg-emerald-500 z-10"
          style={{ 
            bottom: '-2px',
            right: '-2px',
            boxShadow: '0 0 0 2px hsl(var(--card))'
          }}
          aria-hidden
        />
      )}
    </Avatar>
  );
}

/** Avatar + label (title/subtitle) group, with optional online indicator */
function AvatarLabelGroup({
  src,
  alt,
  title,
  subtitle,
  online = false,
  size = 'md',
  className,
  ...props
}) {
  const sizeClasses = {
    sm: 'h-9 w-9',
    md: 'h-11 w-11',
    lg: 'h-14 w-14',
  };
  const textSize = size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-lg' : 'text-base';

  return (
    <div className={cn('flex items-center gap-3 min-w-0', className)} {...props}>
      <AvatarWithStatus online={online} className={sizeClasses[size]}>
        {src ? (
          <AvatarImage src={src} alt={alt || title} />
        ) : null}
        <AvatarFallback>{title ? title.charAt(0).toUpperCase() : '?'}</AvatarFallback>
      </AvatarWithStatus>
      <div className="flex min-w-0 flex-col items-start text-left truncate">
        {title && (
          <span className={cn('font-semibold text-foreground truncate w-full text-left', textSize)}>
            {title}
          </span>
        )}
        {subtitle && (
          <span className={cn('text-muted-foreground truncate w-full text-left', size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base' : 'text-sm')}>
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
}

export { Avatar, AvatarImage, AvatarFallback, AvatarWithStatus, AvatarLabelGroup };
