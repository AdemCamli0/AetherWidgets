import { useEffect, useMemo, useState } from "react";
import { useWidgetDrag } from "@/lib/useWidgetDrag";
import { WidgetContextMenu } from "@/components/WidgetContextMenu";
import { useLanguage } from "@/lib/i18n";

const EVENTS_KEY = "aetherwidgets-calendar-events";

interface CalendarEvent {
  id: string;
  title: string;
}

/** Events keyed by YYYY-MM-DD. */
type EventMap = Record<string, CalendarEvent[] | undefined>;

function loadEvents(): EventMap {
  try {
    const raw = localStorage.getItem(EVENTS_KEY);
    if (raw) {
      return JSON.parse(raw) as EventMap;
    }
  } catch {
    // corrupted storage — fall through to defaults
  }
  return {};
}

function dateKey(year: number, month: number, day: number): string {
  return `${String(year)}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1; // Monday = 0
}

export function CalendarWidget() {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [events, setEvents] = useState<EventMap>(loadEvents);
  const [selectedDay, setSelectedDay] = useState<number | null>(() => new Date().getDate());
  const [newEvent, setNewEvent] = useState("");
  const { onPointerDown, onPointerMove, onPointerUp, isDragging } = useWidgetDrag();
  const { t, locale, weekdayLabels } = useLanguage();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
  const todayDate = today.getDate();

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  useEffect(() => {
    localStorage.setItem(EVENTS_KEY, JSON.stringify(events));
  }, [events]);

  const monthLabel = useMemo(
    () => new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(currentDate),
    [currentDate, locale],
  );

  const days: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDay(null);
  };
  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDay(null);
  };
  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDay(new Date().getDate());
  };

  const selectedKey = selectedDay !== null ? dateKey(year, month, selectedDay) : null;
  const selectedEvents = selectedKey ? (events[selectedKey] ?? []) : [];

  const addEvent = () => {
    const title = newEvent.trim();
    if (!title || !selectedKey) return;
    setEvents((prev) => ({
      ...prev,
      [selectedKey]: [...(prev[selectedKey] ?? []), { id: Date.now().toString(), title }],
    }));
    setNewEvent("");
  };

  const deleteEvent = (id: string) => {
    if (!selectedKey) return;
    setEvents((prev) => {
      const remaining = (prev[selectedKey] ?? []).filter((e) => e.id !== id);
      const next = { ...prev };
      if (remaining.length === 0) {
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete next[selectedKey];
      } else {
        next[selectedKey] = remaining;
      }
      return next;
    });
  };

  const selectedDayLabel =
    selectedDay !== null
      ? new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long" }).format(
          new Date(year, month, selectedDay),
        )
      : null;

  return (
    <WidgetContextMenu>
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        className={`flex h-full w-full flex-col overflow-y-auto rounded-(--aw-widget-radius) border border-widget-border bg-widget-bg p-3 shadow-2xl backdrop-blur-(--aw-widget-blur) ${
          isDragging ? "cursor-grabbing" : "cursor-grab"
        }`}
      >
        <div className="mb-2 flex items-center justify-between">
          <button
            onClick={prevMonth}
            onPointerDown={(e) => {
              e.stopPropagation();
            }}
            className="rounded p-1 text-widget-muted hover:bg-widget-surface-hover hover:text-widget-text"
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
            className="rounded p-1 text-widget-muted hover:bg-widget-surface-hover hover:text-widget-text"
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
          {days.map((day, i) => {
            const key = day !== null ? dateKey(year, month, day) : null;
            const hasEvents = key !== null && (events[key]?.length ?? 0) > 0;
            const isToday = day === todayDate && isCurrentMonth;
            const isSelected = day !== null && day === selectedDay;
            return (
              <button
                key={i}
                disabled={day === null}
                onClick={() => {
                  setSelectedDay(day);
                }}
                onPointerDown={(e) => {
                  e.stopPropagation();
                }}
                className={`relative rounded py-1 transition-colors ${
                  isToday
                    ? "bg-accent font-semibold text-white"
                    : isSelected
                      ? "bg-accent/20 font-medium text-accent"
                      : day
                        ? "text-widget-text hover:bg-widget-surface-hover"
                        : ""
                }`}
              >
                {day ?? ""}
                {hasEvents && (
                  <span
                    className={`absolute bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full ${
                      isToday ? "bg-white" : "bg-accent"
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>

        {selectedDay !== null && (
          <div className="mt-2 flex shrink-0 flex-col border-t border-widget-border pt-2">
            <div className="mb-1 flex items-center justify-between px-0.5">
              <span className="text-[10px] font-medium text-widget-muted capitalize">
                {selectedDayLabel}
              </span>
              <span className="text-[9px] text-widget-muted">
                {t("widgets.calendar.events")}: {selectedEvents.length}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={newEvent}
                onChange={(e) => {
                  setNewEvent(e.target.value);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addEvent();
                  }
                }}
                placeholder={t("widgets.calendar.eventPlaceholder")}
                className="min-w-0 flex-1 rounded bg-widget-surface px-2 py-1 text-[10px] text-widget-text placeholder:text-widget-muted/50 focus:outline-none"
                onPointerDown={(e) => {
                  e.stopPropagation();
                }}
              />
              <button
                onClick={addEvent}
                onPointerDown={(e) => {
                  e.stopPropagation();
                }}
                title={t("widgets.calendar.addEvent")}
                className="rounded bg-accent px-2 py-1 text-[10px] text-white transition-colors hover:bg-accent/90 active:bg-accent/70"
              >
                +
              </button>
            </div>
            <div className="mt-1 max-h-24 overflow-y-auto">
              {selectedEvents.length === 0 ? (
                <span className="px-0.5 text-[10px] text-widget-muted/60">
                  {t("widgets.calendar.noEvents")}
                </span>
              ) : (
                selectedEvents.map((event) => (
                  <div
                    key={event.id}
                    className="mb-0.5 flex items-center gap-1.5 rounded bg-widget-surface px-2 py-1"
                  >
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                    <span className="min-w-0 flex-1 truncate text-[10px] text-widget-text">
                      {event.title}
                    </span>
                    <button
                      onClick={() => {
                        deleteEvent(event.id);
                      }}
                      onPointerDown={(e) => {
                        e.stopPropagation();
                      }}
                      className="shrink-0 text-[10px] text-widget-muted hover:text-red-400"
                    >
                      ×
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </WidgetContextMenu>
  );
}
