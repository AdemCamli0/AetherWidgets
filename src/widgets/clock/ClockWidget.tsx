import { useEffect, useMemo, useRef, useState } from "react";
import { useWidgetDrag } from "@/lib/useWidgetDrag";
import { WidgetContextMenu } from "@/components/WidgetContextMenu";
import { useLanguage } from "@/lib/i18n";
import { notify } from "@/lib/notify";
import { unlockAudio } from "@/lib/sound";

const ALARM_KEY = "aetherwidgets-clock-alarm";

/** Major cities shown as world clocks (labels are proper nouns, no i18n needed). */
const WORLD_CITIES: { label: string; timeZone: string }[] = [
  { label: "New York", timeZone: "America/New_York" },
  { label: "London", timeZone: "Europe/London" },
  { label: "Tokyo", timeZone: "Asia/Tokyo" },
  { label: "Sydney", timeZone: "Australia/Sydney" },
];

function readStoredAlarm(): string {
  try {
    return localStorage.getItem(ALARM_KEY) ?? "";
  } catch {
    return "";
  }
}

export function ClockWidget() {
  const [now, setNow] = useState(() => new Date());
  const [showStopwatch, setShowStopwatch] = useState(false);
  const [stopwatchSeconds, setStopwatchSeconds] = useState(0);
  const [stopwatchRunning, setStopwatchRunning] = useState(false);
  const [alarmTime, setAlarmTime] = useState<string>(readStoredAlarm);
  const [showAlarmEditor, setShowAlarmEditor] = useState(false);
  const { onPointerDown, onPointerMove, onPointerUp, isDragging } = useWidgetDrag();
  const { t, locale } = useLanguage();

  const timeFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
    [locale],
  );

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    [locale],
  );

  const worldClockFormatters = useMemo(
    () =>
      WORLD_CITIES.map((city) => ({
        ...city,
        formatter: new Intl.DateTimeFormat(locale, {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: city.timeZone,
        }),
      })),
    [locale],
  );

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  // Persist the alarm time.
  useEffect(() => {
    try {
      localStorage.setItem(ALARM_KEY, alarmTime);
    } catch {
      // Ignore storage failures.
    }
  }, [alarmTime]);

  // Alarm: fire a notification once when the current time matches HH:MM.
  const lastAlarmFiredRef = useRef("");
  useEffect(() => {
    if (!alarmTime) return;
    const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    if (hhmm === alarmTime && lastAlarmFiredRef.current !== alarmTime + hhmm) {
      lastAlarmFiredRef.current = alarmTime + hhmm;
      void notify(t("widgets.clock.alarmTitle"), t("widgets.clock.alarmBody"));
    }
  }, [now, alarmTime, t]);

  useEffect(() => {
    if (!stopwatchRunning) return;
    const intervalId = window.setInterval(() => {
      setStopwatchSeconds((s) => s + 1);
    }, 1000);
    return () => {
      window.clearInterval(intervalId);
    };
  }, [stopwatchRunning]);

  const formatStopwatch = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  return (
    <WidgetContextMenu>
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        className={`flex h-full w-full flex-col items-center justify-center gap-0.5 rounded-(--aw-widget-radius) border border-widget-border bg-widget-bg shadow-2xl backdrop-blur-(--aw-widget-blur) ${
          isDragging ? "cursor-grabbing" : "cursor-grab"
        }`}
      >
        {showStopwatch ? (
          <>
            <time className="pointer-events-none text-4xl font-semibold tracking-tight text-widget-text tabular-nums">
              {formatStopwatch(stopwatchSeconds)}
            </time>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setStopwatchRunning(!stopwatchRunning);
                }}
                onPointerDown={(e) => {
                  e.stopPropagation();
                }}
                className="rounded bg-accent/20 px-2 py-1 text-xs text-widget-text hover:bg-accent/30"
              >
                {stopwatchRunning ? t("widgets.clock.pause") : t("widgets.clock.start")}
              </button>
              <button
                onClick={() => {
                  setStopwatchRunning(false);
                  setStopwatchSeconds(0);
                }}
                onPointerDown={(e) => {
                  e.stopPropagation();
                }}
                className="rounded bg-widget-surface-hover px-2 py-1 text-xs text-widget-muted hover:bg-widget-surface-active"
              >
                {t("widgets.clock.reset")}
              </button>
              <button
                onClick={() => {
                  setShowStopwatch(false);
                }}
                onPointerDown={(e) => {
                  e.stopPropagation();
                }}
                className="rounded bg-widget-surface-hover px-2 py-1 text-xs text-widget-muted hover:bg-widget-surface-active"
              >
                {t("widgets.clock.backToClock")}
              </button>
            </div>
          </>
        ) : (
          <>
            <time className="pointer-events-none text-5xl font-semibold tracking-tight text-widget-text tabular-nums">
              {timeFormatter.format(now)}
            </time>
            <span className="pointer-events-none text-sm font-medium text-accent capitalize">
              {dateFormatter.format(now)}
            </span>

            {/* World clocks */}
            <div className="mt-0.5 flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5">
              {worldClockFormatters.map((city) => (
                <span key={city.timeZone} className="flex items-baseline gap-1 text-[10px]">
                  <span className="text-widget-muted">{city.label}</span>
                  <span className="font-medium text-widget-text tabular-nums">
                    {city.formatter.format(now)}
                  </span>
                </span>
              ))}
            </div>

            <div className="mt-1 flex items-center gap-2">
              <button
                onClick={() => {
                  setShowStopwatch(true);
                }}
                onPointerDown={(e) => {
                  e.stopPropagation();
                }}
                className="rounded bg-widget-surface-hover px-2 py-0.5 text-xs text-widget-muted hover:bg-widget-surface-active"
              >
                {t("widgets.clock.stopwatch")}
              </button>
              <button
                onClick={() => {
                  unlockAudio();
                  setShowAlarmEditor((s) => !s);
                }}
                onPointerDown={(e) => {
                  e.stopPropagation();
                }}
                className={`rounded px-2 py-0.5 text-xs transition-colors ${
                  alarmTime
                    ? "bg-accent/20 text-accent hover:bg-accent/30 active:bg-accent/40"
                    : "bg-widget-surface-hover text-widget-muted hover:bg-widget-surface-active active:bg-widget-surface-active"
                }`}
              >
                {alarmTime ? `⏰ ${alarmTime}` : t("widgets.clock.alarm")}
              </button>
            </div>

            {showAlarmEditor && (
              <div className="mt-0.5 flex items-center gap-1.5">
                <input
                  type="time"
                  value={alarmTime}
                  onChange={(e) => {
                    setAlarmTime(e.target.value);
                  }}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                  }}
                  className="rounded bg-widget-surface px-2 py-1 text-xs text-widget-text outline-none focus:bg-widget-surface-hover"
                />
                {alarmTime && (
                  <button
                    onClick={() => {
                      setAlarmTime("");
                    }}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                    }}
                    className="rounded bg-widget-surface-hover px-2 py-1 text-xs text-widget-muted hover:bg-widget-surface-active"
                  >
                    ✕
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </WidgetContextMenu>
  );
}
