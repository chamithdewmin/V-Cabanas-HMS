import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const ConfirmDialogContext = createContext(null);

/**
 * Promise-based confirm dialog (replaces window.confirm).
 * @param {string} message — Body text
 * @param {object} [options]
 * @param {string} [options.title='Confirm']
 * @param {string} [options.confirmLabel='OK']
 * @param {string} [options.cancelLabel='Cancel']
 * @param {'default'|'destructive'} [options.variant='default']
 * @returns {Promise<boolean>}
 */
export function ConfirmDialogProvider({ children }) {
  const queueRef = useRef([]);
  const suppressOpenChangeRef = useRef(false);
  const [dialog, setDialog] = useState(null);

  const finish = useCallback((value) => {
    suppressOpenChangeRef.current = true;
    const item = queueRef.current.shift();
    if (item) item.resolve(value);
    const next = queueRef.current[0];
    if (next) {
      const { resolve: _r, ...rest } = next;
      setDialog(rest);
    } else {
      setDialog(null);
    }
    setTimeout(() => {
      suppressOpenChangeRef.current = false;
    }, 0);
  }, []);

  const confirm = useCallback((message, options = {}) => {
    return new Promise((resolve) => {
      const entry = {
        message,
        title: options.title ?? 'Confirm',
        confirmLabel: options.confirmLabel ?? 'OK',
        cancelLabel: options.cancelLabel ?? 'Cancel',
        variant: options.variant === 'destructive' ? 'destructive' : 'default',
        resolve,
      };
      queueRef.current.push(entry);
      if (queueRef.current.length === 1) {
        const { resolve: _r, ...rest } = entry;
        setDialog(rest);
      }
    });
  }, []);

  const handleOpenChange = useCallback(
    (open) => {
      if (!open && !suppressOpenChangeRef.current) {
        finish(false);
      }
    },
    [finish],
  );

  return (
    <ConfirmDialogContext.Provider value={{ confirm }}>
      {children}
      <Dialog open={!!dialog} onOpenChange={handleOpenChange}>
        <DialogContent hideCloseButton className="max-w-md sm:max-w-md">
          {dialog && (
            <>
              <DialogHeader>
                <DialogTitle>{dialog.title}</DialogTitle>
                <DialogDescription className="text-left text-base text-foreground/90 pt-1 whitespace-pre-wrap">
                  {dialog.message}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="gap-2 sm:gap-2">
                <Button type="button" variant="outline" onClick={() => finish(false)}>
                  {dialog.cancelLabel}
                </Button>
                <Button
                  type="button"
                  variant={dialog.variant === 'destructive' ? 'destructive' : 'default'}
                  onClick={() => finish(true)}
                >
                  {dialog.confirmLabel}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </ConfirmDialogContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmDialogContext);
  if (!ctx) {
    throw new Error('useConfirm must be used within ConfirmDialogProvider');
  }
  return ctx.confirm;
}
