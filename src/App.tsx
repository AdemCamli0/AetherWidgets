import { getCurrentWindow } from "@tauri-apps/api/window";
import { ControlPanel } from "@/components/ControlPanel";
import { ClockWidget } from "@/widgets/clock/ClockWidget";
import { WeatherWidget } from "@/widgets/weather/WeatherWidget";
import { SystemMonitorWidget } from "@/widgets/system/SystemMonitorWidget";
import { CalendarWidget } from "@/widgets/calendar/CalendarWidget";
import { NotesWidget } from "@/widgets/notes/NotesWidget";
import { PomodoroWidget } from "@/widgets/pomodoro/PomodoroWidget";
import { CryptoWidget } from "@/widgets/crypto/CryptoWidget";

const windowLabel = getCurrentWindow().label;

export default function App() {
  // Control panel window
  if (windowLabel === "main") {
    return (
      <main className="h-screen w-screen overflow-hidden bg-transparent">
        <ControlPanel />
      </main>
    );
  }

  // Widget windows
  return (
    <main className="h-screen w-screen overflow-hidden bg-transparent">
      {windowLabel === "clock" && <ClockWidget />}
      {windowLabel === "weather" && <WeatherWidget />}
      {windowLabel === "system" && <SystemMonitorWidget />}
      {windowLabel === "calendar" && <CalendarWidget />}
      {windowLabel === "notes" && <NotesWidget />}
      {windowLabel === "pomodoro" && <PomodoroWidget />}
      {windowLabel === "crypto" && <CryptoWidget />}
    </main>
  );
}
