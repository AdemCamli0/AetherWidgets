import { useEffect, useState } from "react";
import { useWidgetDrag } from "@/lib/useWidgetDrag";
import { WidgetContextMenu } from "@/components/WidgetContextMenu";

const timeFormatter = new Intl.DateTimeFormat("tr-TR", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

const dateFormatter = new Intl.DateTimeFormat("tr-TR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

export function ClockWidget() {
  const [now, setNow] = useState(() => new Date());
  const { onPointerDown, onPointerMove, onPointerUp, isDragging } = useWidgetDrag();

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

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
        <time className="pointer-events-none text-5xl font-semibold tracking-tight text-widget-text tabular-nums">
          {timeFormatter.format(now)}
        </time>
        <span className="pointer-events-none text-sm font-medium text-widget-muted capitalize">
          {dateFormatter.format(now)}
        </span>
      </div>
    </WidgetContextMenu>
  );
}
