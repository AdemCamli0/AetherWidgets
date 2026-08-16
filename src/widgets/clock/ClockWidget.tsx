import { useEffect, useMemo, useState } from "react";
import { useWidgetDrag } from "@/lib/useWidgetDrag";
import { WidgetContextMenu } from "@/components/WidgetContextMenu";
import { useLanguage } from "@/lib/i18n";

export function ClockWidget() {
  const [now, setNow] = useState(() => new Date());
  const [showStopwatch, setShowStopwatch] = useState(false);
  const [stopwatchSeconds, setStopwatchSeconds] = useState(0);
  const [stopwatchRunning, setStopwatchRunning] = useState(false);
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

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

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
        className={`flex h-full w-full flex-col items-center justify-center gap-1 rounded-2xl border border-widget-border bg-widget-bg shadow-2xl backdrop-blur-xl ${
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
                className="rounded bg-white/10 px-2 py-1 text-xs text-widget-muted hover:bg-white/20"
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
                className="rounded bg-white/10 px-2 py-1 text-xs text-widget-muted hover:bg-white/20"
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
            <span className="pointer-events-none text-sm font-medium text-widget-muted capitalize">
              {dateFormatter.format(now)}
            </span>
            <button
              onClick={() => {
                setShowStopwatch(true);
              }}
              onPointerDown={(e) => {
                e.stopPropagation();
              }}
              className="mt-1 rounded bg-white/10 px-2 py-0.5 text-xs text-widget-muted hover:bg-white/20"
            >
              {t("widgets.clock.stopwatch")}
            </button>
          </>
        )}
      </div>
    </WidgetContextMenu>
  );
}
