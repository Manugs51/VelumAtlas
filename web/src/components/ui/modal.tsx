import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

type ModalProps = {
  open: boolean;
  title: string;
  description?: string;
  children: ReactNode;
  zIndexClassName?: string;
};

export function Modal({ open, title, description, children, zIndexClassName = 'z-50' }: ModalProps) {
  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className={cn('fixed inset-0 flex items-center justify-center bg-black/55 p-4 backdrop-blur-[1px]', zIndexClassName)}>
      <div className="w-full max-w-5xl rounded-lg border border-border bg-card shadow-2xl">
        <div className="border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
        </div>
        <div className="max-h-[80vh] overflow-auto p-6">{children}</div>
      </div>
    </div>,
    document.body
  );
}
