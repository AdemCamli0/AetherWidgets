import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useWidgetDrag } from "@/lib/useWidgetDrag";
import { WidgetContextMenu } from "@/components/WidgetContextMenu";
import { useLanguage } from "@/lib/i18n";

interface SystemStats {
  cpu_usage: number;
  memory_used: number;
  memory_total: number;
  disk_used: number;
  disk_total: number;
  uptime: number;
  cpu_temp: number | null;
  gpu_temp: number | null;
}

function formatBytes(bytes: number): string {
  const gb = bytes / (1024 * 1024 * 1024);
  return gb.toFixed(1);
}

function formatUptime(seconds: number, t: (path: string) => string): string {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return `${String(hours)}${t("widgets.system.uptimeHours")} ${String(mins)}${t("widgets.system.uptimeMinutes")}`;
}

export function SystemMonitorWidget() {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const { onPointerDown, onPointerMove, onPointerUp, isDragging } = useWidgetDrag();
  const { t } = useLanguage();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await invoke<SystemStats>("get_system_stats");
        setStats(data);
      } catch (error) {
        console.error("Failed to fetch system stats:", error);
      }
    };

    void fetchStats();
    const interval = window.setInterval(() => {
      void fetchStats();
    }, 2000);
    return () => {
      window.clearInterval(interval);
    };
  }, []);

  if (!stats) {
    return (
      <WidgetContextMenu>
        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          className={`flex h-full w-full items-center justify-center rounded-(--aw-widget-radius) border border-widget-border bg-widget-bg p-4 shadow-2xl backdrop-blur-(--aw-widget-blur) ${
            isDragging ? "cursor-grabbing" : "cursor-grab"
          }`}
        >
          <span className="text-xs text-widget-muted">{t("widgets.system.loading")}</span>
        </div>
      </WidgetContextMenu>
    );
  }

  const cpuPercent = Math.round(stats.cpu_usage);
  const memoryPercent = Math.round((stats.memory_used / stats.memory_total) * 100);
  const diskPercent = Math.round((stats.disk_used / stats.disk_total) * 100);

  const openTaskManager = () => {
    invoke("open_task_manager").catch((error: unknown) => {
      console.error("Failed to open task manager:", error);
    });
  };

  return (
    <WidgetContextMenu>
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        className={`flex h-full w-full flex-col justify-center gap-3 rounded-(--aw-widget-radius) border border-widget-border bg-widget-bg p-4 shadow-2xl backdrop-blur-(--aw-widget-blur) ${
          isDragging ? "cursor-grabbing" : "cursor-grab"
        }`}
      >
        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-xs">
            <span className="text-widget-muted">{t("widgets.system.cpu")}</span>
            <span className="text-widget-text tabular-nums">
              {cpuPercent}%
              {stats.cpu_temp !== null && (
                <span className="ml-1 text-widget-muted">🌡️ {Math.round(stats.cpu_temp)}°C</span>
              )}
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-widget-track">
            <div
              className="h-full rounded-full bg-accent transition-all duration-500"
              style={{ width: `${String(cpuPercent)}%` }}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-xs">
            <span className="text-widget-muted">{t("widgets.system.ram")}</span>
            <span className="text-widget-text tabular-nums">
              {formatBytes(stats.memory_used)}/{formatBytes(stats.memory_total)} GB
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-widget-track">
            <div
              className="h-full rounded-full bg-accent transition-all duration-500"
              style={{ width: `${String(memoryPercent)}%` }}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-xs">
            <span className="text-widget-muted">{t("widgets.system.disk")}</span>
            <span className="text-widget-text tabular-nums">
              {formatBytes(stats.disk_used)}/{formatBytes(stats.disk_total)} GB
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-widget-track">
            <div
              className="h-full rounded-full bg-accent transition-all duration-500"
              style={{ width: `${String(diskPercent)}%` }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-widget-muted">
          <span>
            {t("widgets.system.uptime")} {formatUptime(stats.uptime, t)}
          </span>
          {stats.gpu_temp !== null && <span>🎮 GPU 🌡️ {Math.round(stats.gpu_temp)}°C</span>}
        </div>

        <button
          onClick={openTaskManager}
          onPointerDown={(e) => {
            e.stopPropagation();
          }}
          className="mt-1 w-full rounded bg-widget-surface-hover px-2 py-1 text-xs text-widget-muted transition-colors hover:bg-widget-surface-active hover:text-widget-text"
        >
          {t("widgets.system.taskManager")}
        </button>
      </div>
    </WidgetContextMenu>
  );
}
