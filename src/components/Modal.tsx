import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * One modal shell for the whole app.
 *
 * Hand-rolled overlays were drifting: some closed on Escape, most did not,
 * none locked background scroll, and close targets were 24 px. This fixes all
 * three in one place. Rendered through a portal so a transformed page
 * transition can never become the containing block for `position: fixed`.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  maxWidth = "max-w-md",
  tone = "default",
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  maxWidth?: string;
  tone?: "default" | "danger";
}) {
  const [mounted, setMounted] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);

    // Focus the panel so screen readers and Escape land in the right place.
    const t = window.setTimeout(() => panelRef.current?.focus(), 0);

    return () => {
      window.clearTimeout(t);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!mounted || !open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-ink/30 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === "string" ? title : undefined}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "w-full rounded-t-3xl border border-hairline bg-background p-5 shadow-float outline-none sm:rounded-3xl sm:p-7",
          maxWidth
        )}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2
              className={cn(
                "font-serif text-xl font-semibold text-ink sm:text-2xl",
                tone === "danger" && "text-crimson"
              )}
            >
              {title}
            </h2>
            {description && (
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{description}</p>
            )}
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="-mr-1 -mt-1 grid size-10 shrink-0 place-items-center rounded-full text-subtle transition hover:bg-muted hover:text-ink"
          >
            <X className="size-5" />
          </button>
        </div>

        {children && <div className="mt-5">{children}</div>}
        {footer && <div className="mt-6">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}
