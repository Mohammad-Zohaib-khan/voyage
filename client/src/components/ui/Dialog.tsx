import { X } from 'lucide-react';
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { Button, IconButton } from './Button';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  /** "drawer" slides in from the side; useful for filters on small screens. */
  variant?: 'dialog' | 'drawer';
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Built on the native <dialog> element: it provides the modal focus trap, inert background,
 * Escape-to-close and focus restoration that a hand-rolled overlay would have to reimplement.
 */
export function Dialog({ open, onClose, title, description, children, footer, variant = 'dialog', size = 'md' }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        // A click on the backdrop lands on the <dialog> element itself.
        if (event.target === ref.current) onClose();
      }}
      className={cn(
        'bg-canvas p-0 text-ink shadow-[0_24px_80px_-24px_rgb(0_0_0/0.45)] backdrop:backdrop-blur-[2px]',
        variant === 'dialog' && 'dialog-panel m-auto w-[calc(100%-2rem)] rounded-[6px] max-h-[calc(100svh-2rem)]',
        variant === 'dialog' && size === 'sm' && 'max-w-md',
        variant === 'dialog' && size === 'md' && 'max-w-xl',
        variant === 'dialog' && size === 'lg' && 'max-w-3xl',
        variant === 'drawer' && 'drawer-panel mr-0 ml-auto h-svh max-h-svh w-[min(26rem,100%)] max-w-none',
      )}
    >
      {open ? (
        <div className={cn('flex flex-col', variant === 'drawer' ? 'h-full' : 'max-h-[calc(100svh-2rem)]')}>
          <header className="flex items-start justify-between gap-4 border-b border-line px-6 pt-6 pb-4">
            <div>
              <h2 id={titleId} className="font-serif text-[1.75rem] leading-tight text-ink">
                {title}
              </h2>
              {description ? (
                <div id={descriptionId} className="mt-1 text-small text-muted">
                  {description}
                </div>
              ) : null}
            </div>
            <IconButton label="Close" onClick={onClose} className="-mt-1 -mr-2">
              <X aria-hidden="true" className="size-5" />
            </IconButton>
          </header>
          <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
          {footer ? <footer className="flex flex-wrap items-center justify-end gap-3 border-t border-line px-6 py-4">{footer}</footer> : null}
        </div>
      ) : null}
    </dialog>
  );
}

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  tone?: 'danger' | 'default';
  pending?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmDialog({ open, title, children, confirmLabel, tone = 'danger', pending = false, onConfirm, onClose }: ConfirmDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} onClick={onConfirm} loading={pending}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="text-muted">{children}</div>
    </Dialog>
  );
}
