import { useEffect, useMemo, useState } from "react";
import { WidgetContextMenu } from "@/components/WidgetContextMenu";
import { useLanguage } from "@/lib/i18n";
import { useWidgetDrag } from "@/lib/useWidgetDrag";
import { notify } from "@/lib/notify";
import { unlockAudio } from "@/lib/sound";

type TimerMode = "work" | "shortBreak" | "longBreak" | "custom";

const PREFS_KEY = "aetherwidgets-pomodoro-prefs";

/** Preset work-session durations (minutes) the user can pick from. */
const WORK_DURATION_OPTIONS = [15, 25, 50];

interface PomodoroPrefs {
  notifications: boolean;
  autoNext: boolean;
  workMinutes: number;
}

function readStoredPrefs(): PomodoroPrefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PomodoroPrefs>;
      return {
        notifications: parsed.notifications !== false,
        autoNext: parsed.autoNext === true,
        workMinutes: WORK_DURATION_OPTIONS.includes(parsed.workMinutes ?? 0)
          ? (parsed.workMinutes as number)
          : 25,
      };
    }
  } catch {
    // Ignore storage failures.
  }
  return { notifications: true, autoNext: false, workMinutes: 25 };
}

export function PomodoroWidget() {
  const { t } = useLanguage();
  const [mode, setMode] = useState<TimerMode>("work");
  const [secondsLeft, setSecondsLeft] = useState(() => readStoredPrefs().workMinutes * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [completedSessions, setCompletedSessions] = useState(0);
  const [customMinutes, setCustomMinutes] = useState(10);
  const [prefs, setPrefs] = useState<PomodoroPrefs>(readStoredPrefs);
  const { onPointerDown, onPointerMove, onPointerUp, isDragging } = useWidgetDrag();

  useEffect(() => {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    } catch {
      // Ignore storage failures.
    }
  }, [prefs]);

  const MODES = useMemo<Record<TimerMode, { minutes: number; label: string }>>(
    () => ({
      work: { minutes: prefs.workMinutes, label: t("widgets.pomodoro.work") },
      shortBreak: { minutes: 5, label: t("widgets.pomodoro.shortBreak") },
      longBreak: { minutes: 15, label: t("widgets.pomodoro.longBreak") },
      custom: { minutes: 10, label: t("widgets.pomodoro.custom") },
    }),
    [prefs.workMinutes, t],
  );

  useEffect(() => {
    if (!isRunning) return;

    const interval = window.setInterval(() => {
      setSecondsLeft((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, [isRunning]);

  // Handle timer completion: send a notification, advance to the next mode
  // and optionally auto-start the next session.
  useEffect(() => {
    if (!isRunning || secondsLeft > 0) return;

    if (mode === "custom") {
      setIsRunning(false);
      if (prefs.notifications) {
        void notify(t("widgets.pomodoro.timerDone"), t("widgets.pomodoro.timerDoneBody"));
      }
      setSecondsLeft(customMinutes * 60);
      return;
    }

    if (mode === "work") {
      const finishedSessions = completedSessions + 1;
      setCompletedSessions(finishedSessions);
      const nextMode: TimerMode = finishedSessions % 4 === 0 ? "longBreak" : "shortBreak";
      if (prefs.notifications) {
        void notify(t("widgets.pomodoro.workDone"), t("widgets.pomodoro.workDoneBody"));
      }
      setMode(nextMode);
      setSecondsLeft(MODES[nextMode].minutes * 60);
      if (!prefs.autoNext) {
        setIsRunning(false);
      }
      return;
    }

    if (prefs.notifications) {
      void notify(t("widgets.pomodoro.breakDone"), t("widgets.pomodoro.breakDoneBody"));
    }
    setMode("work");
    setSecondsLeft(MODES.work.minutes * 60);
    if (!prefs.autoNext) {
      setIsRunning(false);
    }
  }, [isRunning, secondsLeft, mode, completedSessions, customMinutes, prefs, MODES, t]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const totalSeconds = mode === "custom" ? customMinutes * 60 : MODES[mode].minutes * 60;
  const progress = 1 - secondsLeft / totalSeconds;

  const toggleTimer = () => {
    unlockAudio();
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
        className={`flex h-full w-full flex-col gap-1 overflow-y-auto rounded-(--aw-widget-radius) border border-widget-border bg-widget-bg p-3 shadow-2xl backdrop-blur-(--aw-widget-blur) ${
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

        <div className="flex flex-none flex-col items-center gap-2 pt-0.5">
          <div className="relative">
            <svg className="h-24 w-24 -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="currentColor"
                strokeWidth="6"
                className="text-widget-track"
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

          <div className="mt-1 grid w-full grid-cols-2 gap-1.5">
            <button
              onClick={toggleTimer}
              onPointerDown={(e) => {
                e.stopPropagation();
              }}
              className="rounded-xl bg-accent px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/90 active:bg-accent/70"
            >
              {isRunning ? t("widgets.pomodoro.pause") : t("widgets.pomodoro.start")}
            </button>
            <button
              onClick={resetTimer}
              onPointerDown={(e) => {
                e.stopPropagation();
              }}
              className="rounded-xl bg-widget-surface-hover px-3 py-2 text-sm font-medium text-widget-text transition-colors hover:bg-widget-surface-active"
            >
              {t("widgets.pomodoro.reset")}
            </button>
          </div>

          <div className="flex items-center gap-1 pt-0.5">
            {Array.from({ length: 4 }, (_, index) => (
              <div
                key={index}
                className={`h-1.5 w-1.5 rounded-full ${
                  index < completedSessions % 4 ? "bg-accent" : "bg-widget-surface-active"
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-1 pt-0.5 text-[10px] text-widget-muted">
            <span>
              {t("widgets.pomodoro.total")}: {completedSessions} {t("widgets.pomodoro.sessions")}
            </span>
            <span>•</span>
            <span>
              {Math.floor((completedSessions * prefs.workMinutes) / 60)}h{" "}
              {(completedSessions * prefs.workMinutes) % 60}m
            </span>
          </div>
        </div>

        <div className="grid shrink-0 w-full grid-cols-2 gap-1 pt-0.5">
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
                  : "bg-widget-surface-hover text-widget-muted hover:bg-widget-surface-active"
              }`}
            >
              {MODES[item].label}
            </button>
          ))}
        </div>

        <div className="flex shrink-0 items-center justify-center gap-2 pt-0.5">
          <span className="text-[10px] text-widget-muted">
            {t("widgets.pomodoro.workDuration")}:
          </span>
          {WORK_DURATION_OPTIONS.map((mins) => (
            <button
              key={mins}
              onClick={() => {
                setPrefs((p) => ({ ...p, workMinutes: mins }));
                if (mode === "work") {
                  setSecondsLeft(mins * 60);
                  setIsRunning(false);
                }
              }}
              onPointerDown={(e) => {
                e.stopPropagation();
              }}
              className={`rounded-md px-2 py-0.5 text-[10px] transition-colors ${
                prefs.workMinutes === mins
                  ? "bg-accent text-white"
                  : "bg-widget-surface-hover text-widget-muted hover:bg-widget-surface-active"
              }`}
            >
              {mins}m
            </button>
          ))}
        </div>

        {mode === "custom" && (
          <div className="flex shrink-0 items-center justify-center gap-2 pt-0.5">
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
              className="w-20 rounded-lg bg-widget-surface px-2 py-1.5 text-center text-xs text-widget-text focus:outline-none"
            />
            <span className="text-xs text-widget-muted">min</span>
          </div>
        )}

        <div className="flex shrink-0 items-center justify-center gap-2 pt-0.5 text-[10px] text-widget-muted">
          <label className="flex cursor-pointer items-center gap-1">
            <input
              type="checkbox"
              checked={prefs.notifications}
              onChange={(e) => {
                setPrefs((p) => ({ ...p, notifications: e.target.checked }));
              }}
              onPointerDown={(e) => {
                e.stopPropagation();
              }}
              className="h-3 w-3 accent-accent"
            />
            <span>{t("widgets.pomodoro.notifications")}</span>
          </label>
          <label className="flex cursor-pointer items-center gap-1">
            <input
              type="checkbox"
              checked={prefs.autoNext}
              onChange={(e) => {
                setPrefs((p) => ({ ...p, autoNext: e.target.checked }));
              }}
              onPointerDown={(e) => {
                e.stopPropagation();
              }}
              className="h-3 w-3 accent-accent"
            />
            <span>{t("widgets.pomodoro.autoNext")}</span>
          </label>
        </div>
      </div>
    </WidgetContextMenu>
  );
}
