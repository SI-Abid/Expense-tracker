import { useEffect, type ReactNode } from "react";

// Shared UI primitives: section header, empty state, bottom sheet, toast.

export function ScreenHeader({ title, subtitle, right }: {
  title: string; subtitle?: string; right?: ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-3 px-4 pt-4 pb-2">
      <div>
        <h1 className="text-xl font-bold text-ink">{title}</h1>
        {subtitle && <p className="text-sm text-ink-soft">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="card mx-4 my-3 px-4 py-10 text-center text-ink-faint text-sm">
      {message}
    </div>
  );
}

export function Sheet({ open, onClose, title, children }: {
  open: boolean; onClose: () => void; title: string; children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center">
      <div className="absolute inset-0 bg-ink/40" onClick={onClose} />
      <div className="relative w-full sm:max-w-md bg-paper-card rounded-t-2xl sm:rounded-2xl shadow-hero max-h-[92vh] overflow-y-auto animate-[slideUp_0.18s_ease-out]">
        <div className="sticky top-0 bg-paper-card border-b border-paper-line px-4 py-3 flex items-center justify-between">
          <h2 className="font-bold text-ink">{title}</h2>
          <button onClick={onClose} className="btn-ghost px-2 py-1" aria-label="Close">✕</button>
        </div>
        <div className="p-4">{children}</div>
      </div>
      <style>{`@keyframes slideUp{from{transform:translateY(16px);opacity:.6}to{transform:translateY(0);opacity:1}}`}</style>
    </div>
  );
}

export function Toast({ message, onDone }: { message?: string; onDone: () => void }) {
  useEffect(() => {
    if (!message) return;
    const id = setTimeout(onDone, 2800);
    return () => clearTimeout(id);
  }, [message, onDone]);
  if (!message) return null;
  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[60] px-4 max-w-[92%]">
      <div className="bg-ink text-white text-sm rounded-xl px-4 py-2.5 shadow-hero text-center">
        {message}
      </div>
    </div>
  );
}

/** A confirm-on-second-tap delete button to avoid a separate dialog. */
export function ConfirmDelete({ onConfirm, label = "Delete" }: { onConfirm: () => void; label?: string }) {
  return (
    <button
      className="btn-danger px-3 py-2 tap text-sm"
      onClick={(e) => {
        const el = e.currentTarget;
        if (el.dataset.armed === "1") { onConfirm(); return; }
        el.dataset.armed = "1";
        el.textContent = "Tap again";
        setTimeout(() => { el.dataset.armed = "0"; el.textContent = label; }, 2500);
      }}
    >
      {label}
    </button>
  );
}
