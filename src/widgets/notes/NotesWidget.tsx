import { useEffect, useState } from "react";
import { useWidgetDrag } from "@/lib/useWidgetDrag";
import { WidgetContextMenu } from "@/components/WidgetContextMenu";
import { useLanguage } from "@/lib/i18n";

const STORAGE_KEY = "aetherwidgets-notes";

interface Note {
  id: string;
  text: string;
  createdAt: number;
  completed: boolean;
}

export function NotesWidget() {
  const { t } = useLanguage();
  const [notes, setNotes] = useState<Note[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as (Omit<Note, "completed"> & { completed?: boolean })[];
        // Migrate old notes that lack the completed field
        return parsed.map((n) => ({ ...n, completed: n.completed ?? false }));
      } catch {
        return [];
      }
    }
    return [];
  });
  const [newNote, setNewNote] = useState("");
  const { onPointerDown, onPointerMove, onPointerUp, isDragging } = useWidgetDrag();

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  }, [notes]);

  const addNote = () => {
    if (!newNote.trim()) return;
    setNotes((prev) => [
      { id: Date.now().toString(), text: newNote.trim(), createdAt: Date.now(), completed: false },
      ...prev,
    ]);
    setNewNote("");
  };

  const toggleNote = (id: string) => {
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, completed: !n.completed } : n)));
  };

  const deleteNote = (id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
  };

  const pendingCount = notes.filter((n) => !n.completed).length;

  return (
    <WidgetContextMenu>
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        className={`flex h-full w-full flex-col rounded-2xl border border-widget-border bg-widget-bg shadow-2xl backdrop-blur-xl ${
          isDragging ? "cursor-grabbing" : "cursor-grab"
        }`}
      >
        <div className="flex items-center border-b border-widget-border px-3 py-2">
          <span className="text-xs font-medium text-widget-muted">
            {t("widgets.notes.title")} ({pendingCount} {t("widgets.notes.pending")} / {notes.length}{" "}
            {t("widgets.notes.total")})
          </span>
        </div>

        <div className="flex items-end gap-1 border-b border-widget-border p-2">
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
            className="max-h-24 flex-1 resize-none rounded bg-white/5 px-2 py-1 text-xs text-widget-text placeholder:text-widget-muted/50 focus:outline-none"
            onPointerDown={(e) => {
              e.stopPropagation();
            }}
          />
          <button
            onClick={addNote}
            onPointerDown={(e) => {
              e.stopPropagation();
            }}
            className="rounded bg-accent px-2 py-1 text-xs text-white hover:bg-accent/80"
          >
            +
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {notes.length === 0 ? (
            <span className="text-xs text-widget-muted">{t("widgets.notes.noNotes")}</span>
          ) : (
            notes.map((note) => (
              <div
                key={note.id}
                className="mb-1 flex items-start gap-2 rounded bg-white/5 p-2 text-xs"
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
                <span
                  className={`min-w-0 flex-1 whitespace-pre-wrap wrap-break-word ${
                    note.completed
                      ? "text-widget-muted line-through opacity-60"
                      : "text-widget-text"
                  }`}
                >
                  {note.text}
                </span>
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
