import { useEffect, useMemo, useState } from "react";
import { WidgetContextMenu } from "@/components/WidgetContextMenu";
import { useLanguage } from "@/lib/i18n";
import { useWidgetDrag } from "@/lib/useWidgetDrag";

type TimerMode = "work" | "shortBreak" | "longBreak" | "custom";

export function PomodoroWidget() {
  const { t } = useLanguage();
  const [mode, setMode] = useState<TimerMode>("work");
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [completedSessions, setCompletedSessions] = useState(0);
  const [customMinutes, setCustomMinutes] = useState(10);
  const { onPointerDown, onPointerMove, onPointerUp, isDragging } = useWidgetDrag();

  const MODES = useMemo<Record<TimerMode, { minutes: number; label: string }>>(
    () => ({
      work: { minutes: 25, label: t("widgets.pomodoro.work") },
      shortBreak: { minutes: 5, label: t("widgets.pomodoro.shortBreak") },
      longBreak: { minutes: 15, label: t("widgets.pomodoro.longBreak") },
      custom: { minutes: 10, label: t("widgets.pomodoro.custom") },
    }),
    [t],
  );

  useEffect(() => {
    if (!isRunning) return;

    const interval = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setIsRunning(false);
          if (mode === "work") {
            setCompletedSessions((c) => c + 1);
            const nextMode = (completedSessions + 1) % 4 === 0 ? "longBreak" : "shortBreak";
            setMode(nextMode);
            return MODES[nextMode].minutes * 60;
          }
          setMode("work");
          return MODES.work.minutes * 60;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, [isRunning, mode, completedSessions, MODES]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const totalSeconds = mode === "custom" ? customMinutes * 60 : MODES[mode].minutes * 60;
  const progress = 1 - secondsLeft / totalSeconds;

  const toggleTimer = () => {
    setIsRunning(!isRunning);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setSecondsLeft(mode === "custom" ? customMinutes * 60 : MODES[mode].minutes * 60);
  };

  const setCustomTime = (mins: number) => {
    setCustomMinutes(mins);
    if (mode === "custom") {
      setSecondsLeft(mins * 60);
    }
  };

  return (
    <WidgetContextMenu>
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        className={`flex h-full w-full flex-col gap-2 overflow-hidden rounded-2xl border border-widget-border bg-widget-bg p-3 shadow-2xl backdrop-blur-xl ${
          isDragging ? "cursor-grabbing" : "cursor-grab"
        }`}
      >
        <div className="flex shrink-0 items-center justify-between gap-2 px-1">
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-widget-muted">
            {MODES[mode].label}
          </span>
          <span className="text-[11px] text-widget-muted">
            {t("widgets.pomodoro.total")}: {completedSessions}
          </span>
        </div>

        <div className="flex flex-none flex-col items-center gap-3 pt-1">
          <div className="relative">
            <svg className="h-24 w-24 -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="currentColor"
                strokeWidth="6"
                className="text-white/10"
              />
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="currentColor"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={283}
                strokeDashoffset={283 * (1 - progress)}
                className="text-accent transition-all duration-1000"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-semibold text-widget-text tabular-nums">
                {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
              </span>
            </div>
          </div>

          <div className="mt-2 grid w-full grid-cols-2 gap-2">
            <button
              onClick={toggleTimer}
              onPointerDown={(e) => {
                e.stopPropagation();
              }}
              className="rounded-xl bg-accent px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/80"
            >
              {isRunning ? t("widgets.pomodoro.pause") : t("widgets.pomodoro.start")}
            </button>
            <button
              onClick={resetTimer}
              onPointerDown={(e) => {
                e.stopPropagation();
              }}
              className="rounded-xl bg-white/10 px-3 py-2 text-sm font-medium text-widget-text transition-colors hover:bg-white/20"
            >
              {t("widgets.pomodoro.reset")}
            </button>
          </div>

          <div className="flex items-center gap-1.5 pt-0.5">
            {Array.from({ length: 4 }, (_, index) => (
              <div
                key={index}
                className={`h-1.5 w-1.5 rounded-full ${
                  index < completedSessions % 4 ? "bg-accent" : "bg-white/20"
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2 pt-0.5 text-[11px] text-widget-muted">
            <span>
              {t("widgets.pomodoro.total")}: {completedSessions} {t("widgets.pomodoro.sessions")}
            </span>
            <span>•</span>
            <span>
              {Math.floor((completedSessions * 25) / 60)}h {(completedSessions * 25) % 60}m
            </span>
          </div>
        </div>

        <div className="grid shrink-0 w-full grid-cols-2 gap-1.5 pt-1">
          {(["work", "shortBreak", "longBreak", "custom"] as const).map((item) => (
            <button
              key={item}
              onClick={() => {
                setMode(item);
                setSecondsLeft(item === "custom" ? customMinutes * 60 : MODES[item].minutes * 60);
                setIsRunning(false);
              }}
              onPointerDown={(e) => {
                e.stopPropagation();
              }}
              className={`rounded-lg px-2.5 py-1.5 text-xs transition-colors ${
                mode === item
                  ? "bg-accent text-white"
                  : "bg-white/10 text-widget-muted hover:bg-white/20"
              }`}
            >
              {MODES[item].label}
            </button>
          ))}
        </div>

        {mode === "custom" && (
          <div className="flex shrink-0 items-center justify-center gap-2 pt-1">
            <input
              type="number"
              min="1"
              max="120"
              value={customMinutes}
              onChange={(e) => {
                setCustomTime(parseInt(e.target.value) || 10);
              }}
              onPointerDown={(e) => {
                e.stopPropagation();
              }}
              className="w-20 rounded-lg bg-white/5 px-2 py-1.5 text-center text-xs text-widget-text focus:outline-none"
            />
            <span className="text-xs text-widget-muted">min</span>
          </div>
        )}
      </div>
    </WidgetContextMenu>
  );
}
