import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Moon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFinance } from '@/contexts/FinanceContext';

const sizeMap = {
  sm: { button: 'h-9 w-9', icon: 16 },
  default: { button: 'h-10 w-10', icon: 20 },
  icon: { button: 'h-10 w-10', icon: 20 },
  lg: { button: 'h-11 w-11', icon: 20 },
};

export function ThemeTogglerButton({
  variant = 'ghost',
  size = 'icon',
  className,
  ...props
}) {
  const { settings, updateSettings } = useFinance();
  const isDark = settings?.theme === 'dark';
  const nextTheme = isDark ? 'light' : 'dark';

  const handleClick = () => {
    updateSettings({ theme: nextTheme });
  };

  const { button: buttonSize, icon: iconSize } = sizeMap[size] || sizeMap.icon;

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={`Switch to ${nextTheme} mode`}
      className={cn(
        'relative inline-flex items-center justify-center rounded-lg overflow-hidden',
        'transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        variant === 'ghost' && 'hover:bg-secondary',
        variant === 'outline' && 'border border-secondary hover:bg-secondary',
        variant === 'secondary' && 'bg-secondary hover:bg-secondary/80',
        buttonSize,
        className
      )}
      {...props}
    >
      <span className="relative block w-[1em] h-[1em]" style={{ fontSize: iconSize }}>
        <AnimatePresence mode="wait" initial={false}>
          {isDark ? (
            <motion.span
              key="moon"
              initial={{ scale: 0.6, opacity: 0, rotate: -90 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              exit={{ scale: 0.6, opacity: 0, rotate: 90 }}
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <Moon className="w-full h-full" strokeWidth={2} />
            </motion.span>
          ) : (
            <motion.span
              key="sun"
              initial={{ scale: 0.6, opacity: 0, rotate: 90 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              exit={{ scale: 0.6, opacity: 0, rotate: -90 }}
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <Sun className="w-full h-full" strokeWidth={2} />
            </motion.span>
          )}
        </AnimatePresence>
      </span>
    </button>
  );
}
