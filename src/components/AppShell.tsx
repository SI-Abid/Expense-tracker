import { useState, type ReactNode } from "react";
import { useStore, type Screen } from "../store/store";
import { t } from "../i18n/strings";
import {
  CartIcon, ChevronLeft, ChevronRight, HomeIcon, MenuIcon,
  PeopleIcon, ReceiptIcon, WalletIcon,
} from "./icons";
import { Sheet } from "./ui";

function MonthNav() {
  const { month, monthId, gotoPrevMonth, gotoNextMonth } = useStore();
  const label = month?.label ?? monthId;
  return (
    <div className="flex items-center gap-1">
      <button className="btn-ghost px-2 py-2 tap" onClick={() => gotoPrevMonth()} aria-label="Previous month">
        <ChevronLeft />
      </button>
      <div className="text-center min-w-[120px]">
        <div className="font-semibold leading-tight">{label}</div>
        {month?.status === "closed" && (
          <span className="text-[10px] uppercase tracking-wide text-ink-faint">{t.closed}</span>
        )}
      </div>
      <button className="btn-ghost px-2 py-2 tap" onClick={() => gotoNextMonth()} aria-label="Next month">
        <ChevronRight />
      </button>
    </div>
  );
}

function BucketToggle() {
  const { bucket, setBucket } = useStore();
  return (
    <div className="inline-flex rounded-full bg-paper-line/70 p-0.5 text-xs font-semibold">
      <button
        onClick={() => setBucket("songsar")}
        className={`px-3 py-1.5 rounded-full transition ${bucket === "songsar" ? "bg-household text-white shadow-sm" : "text-ink-soft"}`}
      >{t.household}</button>
      <button
        onClick={() => setBucket("our")}
        className={`px-3 py-1.5 rounded-full transition ${bucket === "our" ? "bg-our text-white shadow-sm" : "text-ink-soft"}`}
      >{t.our}</button>
    </div>
  );
}

function NavButton({ screen, label, icon }: { screen: Screen; label: string; icon: ReactNode }) {
  const { screen: current, go } = useStore();
  const active = current === screen;
  const bucket = useStore((s) => s.bucket);
  const accent = bucket === "our" ? "text-our" : "text-household";
  return (
    <button
      onClick={() => go(screen)}
      className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 tap ${active ? accent : "text-ink-faint"}`}
    >
      {icon}
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { go } = useStore();
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <div className="min-h-full flex flex-col max-w-md mx-auto bg-paper">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-paper/95 backdrop-blur border-b border-paper-line px-3 py-2 flex items-center justify-between gap-2"
        style={{ paddingTop: "max(0.5rem, env(safe-area-inset-top))" }}>
        <BucketToggle />
        <MonthNav />
      </header>

      {/* Body */}
      <main className="flex-1 pb-24">{children}</main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-30 bg-paper-card border-t border-paper-line flex"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <NavButton screen="dashboard" label="Home" icon={<HomeIcon />} />
        <NavButton screen="bazar" label="Bazar" icon={<CartIcon />} />
        <NavButton screen="income" label={t.income} icon={<WalletIcon />} />
        <NavButton screen="fixed" label="Bills" icon={<ReceiptIcon />} />
        <button
          onClick={() => setMoreOpen(true)}
          className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 tap text-ink-faint"
        >
          <MenuIcon />
          <span className="text-[10px] font-medium">More</span>
        </button>
      </nav>

      <Sheet open={moreOpen} onClose={() => setMoreOpen(false)} title="More">
        <div className="grid grid-cols-2 gap-3">
          <MoreLink label={t.labor} icon={<PeopleIcon />} onClick={() => { go("labor"); setMoreOpen(false); }} />
          <MoreLink label={t.extras} icon={<ReceiptIcon />} onClick={() => { go("extras"); setMoreOpen(false); }} />
          <MoreLink label={t.settings} icon={<MenuIcon />} onClick={() => { go("settings"); setMoreOpen(false); }} />
        </div>
      </Sheet>
    </div>
  );
}

function MoreLink({ label, icon, onClick }: { label: string; icon: ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className="card flex flex-col items-center justify-center gap-2 py-6 text-ink-soft hover:bg-paper-line/30">
      {icon}
      <span className="text-sm font-semibold">{label}</span>
    </button>
  );
}
