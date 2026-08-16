import { useMemo, useState } from "react";
import { useWidgetDrag } from "@/lib/useWidgetDrag";
import { WidgetContextMenu } from "@/components/WidgetContextMenu";
import { useLanguage } from "@/lib/i18n";

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1; // Monday = 0
}

export function CalendarWidget() {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const { onPointerDown, onPointerMove, onPointerUp, isDragging } = useWidgetDrag();
  const { locale, weekdayLabels } = useLanguage();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
  const todayDate = today.getDate();

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const monthLabel = useMemo(
    () => new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(currentDate),
    [currentDate, locale],
  );

  const days: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };
  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };
  const goToToday = () => {
    setCurrentDate(new Date());
  };

  return (
    <WidgetContextMenu>
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        className={`flex h-full w-full flex-col rounded-2xl border border-widget-border bg-widget-bg p-3 shadow-2xl backdrop-blur-xl ${
          isDragging ? "cursor-grabbing" : "cursor-grab"
        }`}
      >
        <div className="mb-2 flex items-center justify-between">
          <button
            onClick={prevMonth}
            onPointerDown={(e) => {
              e.stopPropagation();
            }}
            className="rounded p-1 text-widget-muted hover:bg-white/10 hover:text-widget-text"
          >
            ←
          </button>
          <button
            onClick={goToToday}
            onPointerDown={(e) => {
              e.stopPropagation();
            }}
            className="text-sm font-semibold text-widget-text hover:text-accent"
          >
            {monthLabel}
          </button>
          <button
            onClick={nextMonth}
            onPointerDown={(e) => {
              e.stopPropagation();
            }}
            className="rounded p-1 text-widget-muted hover:bg-white/10 hover:text-widget-text"
          >
            →
          </button>
        </div>

        <div className="grid grid-cols-7 gap-0.5 text-center text-[10px]">
          {weekdayLabels.map((day) => (
            <span key={day} className="py-1 text-widget-muted">
              {day}
            </span>
          ))}
          {days.map((day, i) => (
            <span
              key={i}
              className={`py-1 ${
                day === todayDate && isCurrentMonth
                  ? "rounded-full bg-accent font-semibold text-white"
                  : day
                    ? "text-widget-text"
                    : ""
              }`}
            >
              {day ?? ""}
            </span>
          ))}
        </div>
      </div>
    </WidgetContextMenu>
  );
}
