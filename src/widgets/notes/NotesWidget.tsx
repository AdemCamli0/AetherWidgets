import { useEffect, useState } from "react";
import { useWidgetDrag } from "@/lib/useWidgetDrag";
import { WidgetContextMenu } from "@/components/WidgetContextMenu";
import { useLanguage } from "@/lib/i18n";

const STORAGE_KEY = "aetherwidgets-notes";

type NoteColor = "default" | "red" | "amber" | "green" | "blue" | "purple";

interface Note {
  id: string;
  text: string;
  createdAt: number;
  completed: boolean;
  color: NoteColor;
  /** Due date as YYYY-MM-DD, empty when unset. */
  dueDate: string;
}

const NOTE_COLORS: { id: NoteColor; swatch: string; row: string }[] = [
  { id: "default", swatch: "bg-widget-surface-active", row: "bg-widget-surface" },
  { id: "red", swatch: "bg-red-400", row: "bg-red-400/10" },
  { id: "amber", swatch: "bg-amber-400", row: "bg-amber-400/10" },
  { id: "green", swatch: "bg-green-400", row: "bg-green-400/10" },
  { id: "blue", swatch: "bg-blue-400", row: "bg-blue-400/10" },
  { id: "purple", swatch: "bg-purple-400", row: "bg-purple-400/10" },
];

function rowClass(color: NoteColor): string {
  return NOTE_COLORS.find((c) => c.id === color)?.row ?? "bg-widget-surface";
}

function isOverdue(dueDate: string): boolean {
  if (!dueDate) return false;
  const today = new Date();
  const todayStr = `${String(today.getFullYear())}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  return dueDate < todayStr;
}

export function NotesWidget() {
  const { t, locale } = useLanguage();
  const [notes, setNotes] = useState<Note[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Partial<Note>[];
        // Migrate old notes that lack the newer fields.
        return parsed.map((n) => ({
          id: n.id ?? Date.now().toString(),
          text: n.text ?? "",
          createdAt: n.createdAt ?? Date.now(),
          completed: n.completed ?? false,
          color: n.color ?? "default",
          dueDate: n.dueDate ?? "",
        }));
      } catch {
        return [];
      }
    }
    return [];
  });
  const [newNote, setNewNote] = useState("");
  const [newColor, setNewColor] = useState<NoteColor>("default");
  const [newDueDate, setNewDueDate] = useState("");
  const { onPointerDown, onPointerMove, onPointerUp, isDragging } = useWidgetDrag();

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  }, [notes]);

  const addNote = () => {
    if (!newNote.trim()) return;
    setNotes((prev) => [
      {
        id: Date.now().toString(),
        text: newNote.trim(),
        createdAt: Date.now(),
        completed: false,
        color: newColor,
        dueDate: newDueDate,
      },
      ...prev,
    ]);
    setNewNote("");
    setNewColor("default");
    setNewDueDate("");
  };

  const toggleNote = (id: string) => {
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, completed: !n.completed } : n)));
  };

  const deleteNote = (id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
  };

  const setNoteDueDate = (id: string, dueDate: string) => {
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, dueDate } : n)));
  };

  const setNoteColor = (id: string, color: NoteColor) => {
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, color } : n)));
  };

  const pendingCount = notes.filter((n) => !n.completed).length;

  const dueDateFormatter = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" });

  const formatDueDate = (dueDate: string) => {
    const [year, month, day] = dueDate.split("-").map(Number);
    return dueDateFormatter.format(new Date(year, month - 1, day));
  };

  return (
    <WidgetContextMenu>
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        className={`flex h-full w-full flex-col rounded-(--aw-widget-radius) border border-widget-border bg-widget-bg shadow-2xl backdrop-blur-(--aw-widget-blur) ${
          isDragging ? "cursor-grabbing" : "cursor-grab"
        }`}
      >
        <div className="flex items-center border-b border-widget-border px-3 py-2">
          <span className="text-xs font-medium text-widget-muted">
            {t("widgets.notes.title")} ({pendingCount} {t("widgets.notes.pending")} / {notes.length}{" "}
            {t("widgets.notes.total")})
          </span>
        </div>

        <div className="flex flex-col gap-1.5 border-b border-widget-border p-2">
          <div className="flex items-end gap-1">
            <textarea
              value={newNote}
              onChange={(e) => {
                setNewNote(e.target.value);
              }}
              onKeyDown={(e) => {
                // Enter adds the note; Shift+Enter inserts a new line.
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  addNote();
                }
              }}
              placeholder={t("widgets.notes.newNotePlaceholder")}
              rows={2}
              className="max-h-24 flex-1 resize-none rounded bg-widget-surface px-2 py-1 text-xs text-widget-text placeholder:text-widget-muted/50 focus:outline-none"
              onPointerDown={(e) => {
                e.stopPropagation();
              }}
            />
            <button
              onClick={addNote}
              onPointerDown={(e) => {
                e.stopPropagation();
              }}
              className="rounded bg-accent px-2 py-1 text-xs text-white transition-colors hover:bg-accent/90 active:bg-accent/70"
            >
              +
            </button>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              {NOTE_COLORS.map((color) => (
                <button
                  key={color.id}
                  onClick={() => {
                    setNewColor(color.id);
                  }}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                  }}
                  className={`h-3.5 w-3.5 rounded-full ${color.swatch} ${
                    newColor === color.id
                      ? "ring-2 ring-accent ring-offset-1 ring-offset-widget-bg"
                      : ""
                  }`}
                  aria-label={color.id}
                />
              ))}
            </div>
            <input
              type="date"
              value={newDueDate}
              onChange={(e) => {
                setNewDueDate(e.target.value);
              }}
              onPointerDown={(e) => {
                e.stopPropagation();
              }}
              title={t("widgets.notes.dueDate")}
              className="ml-auto rounded bg-widget-surface px-1.5 py-0.5 text-[10px] text-widget-muted outline-none focus:bg-widget-surface-hover"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {notes.length === 0 ? (
            <span className="text-xs text-widget-muted">{t("widgets.notes.noNotes")}</span>
          ) : (
            notes.map((note) => (
              <div
                key={note.id}
                className={`mb-1 flex items-start gap-2 rounded p-2 text-xs ${rowClass(note.color)}`}
              >
                <button
                  onClick={() => {
                    toggleNote(note.id);
                  }}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                  }}
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[10px] transition-colors ${
                    note.completed
                      ? "border-accent bg-accent text-white"
                      : "border-widget-muted/50 text-transparent hover:border-accent"
                  }`}
                  aria-label={
                    note.completed
                      ? t("widgets.notes.markIncomplete")
                      : t("widgets.notes.markComplete")
                  }
                >
                  ✓
                </button>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <span
                    className={`whitespace-pre-wrap wrap-break-word ${
                      note.completed
                        ? "text-widget-muted line-through opacity-60"
                        : "text-widget-text"
                    }`}
                  >
                    {note.text}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <div className="flex items-center gap-1">
                      {NOTE_COLORS.map((color) => (
                        <button
                          key={color.id}
                          onClick={() => {
                            setNoteColor(note.id, color.id);
                          }}
                          onPointerDown={(e) => {
                            e.stopPropagation();
                          }}
                          className={`h-2.5 w-2.5 rounded-full ${color.swatch} ${
                            note.color === color.id
                              ? "ring-1 ring-accent ring-offset-1 ring-offset-widget-bg"
                              : "opacity-50 hover:opacity-100"
                          }`}
                          aria-label={color.id}
                        />
                      ))}
                    </div>
                    <input
                      type="date"
                      value={note.dueDate}
                      onChange={(e) => {
                        setNoteDueDate(note.id, e.target.value);
                      }}
                      onPointerDown={(e) => {
                        e.stopPropagation();
                      }}
                      title={t("widgets.notes.dueDate")}
                      className="rounded bg-transparent px-1 py-0 text-[9px] text-widget-muted outline-none hover:bg-widget-surface-hover"
                    />
                    {note.dueDate && !note.completed && (
                      <span
                        className={`text-[9px] font-medium ${
                          isOverdue(note.dueDate) ? "text-red-400" : "text-widget-muted"
                        }`}
                      >
                        {isOverdue(note.dueDate)
                          ? `⚠ ${t("widgets.notes.overdue")}`
                          : `📅 ${formatDueDate(note.dueDate)}`}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => {
                    deleteNote(note.id);
                  }}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                  }}
                  className="shrink-0 text-widget-muted hover:text-red-400"
                >
                  ×
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </WidgetContextMenu>
  );
}
