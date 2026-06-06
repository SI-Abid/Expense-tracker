import { useEffect } from "react";
import { useStore } from "./store/store";
import { AppShell } from "./components/AppShell";
import { Toast } from "./components/ui";
import { Dashboard } from "./screens/Dashboard";
import { IncomeScreen } from "./screens/IncomeScreen";
import { FixedScreen } from "./screens/FixedScreen";
import { BazarScreen } from "./screens/BazarScreen";
import { LaborScreen } from "./screens/LaborScreen";
import { ExtrasScreen } from "./screens/ExtrasScreen";
import { SettingsScreen } from "./screens/SettingsScreen";

export default function App() {
  const { ready, screen, init, toast, setToast } = useStore();

  useEffect(() => { init(); }, [init]);

  if (!ready) {
    return (
      <div className="min-h-full grid place-items-center text-ink-faint">
        <div className="animate-pulse text-lg font-semibold">Songsar…</div>
      </div>
    );
  }

  return (
    <AppShell>
      {screen === "dashboard" && <Dashboard />}
      {screen === "income" && <IncomeScreen />}
      {screen === "fixed" && <FixedScreen />}
      {screen === "bazar" && <BazarScreen />}
      {screen === "labor" && <LaborScreen />}
      {screen === "extras" && <ExtrasScreen />}
      {screen === "settings" && <SettingsScreen />}
      <Toast message={toast} onDone={() => setToast(undefined)} />
    </AppShell>
  );
}
