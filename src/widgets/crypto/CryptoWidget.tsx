import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useWidgetDrag } from "@/lib/useWidgetDrag";
import { WidgetContextMenu } from "@/components/WidgetContextMenu";
import { useLanguage } from "@/lib/i18n";
import { notify } from "@/lib/notify";
import { unlockAudio } from "@/lib/sound";

interface CryptoCoin {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  change_1h: number | null;
  change_24h: number | null;
  change_7d: number | null;
  sparkline: number[];
}

interface CatalogCoin {
  id: string;
  symbol: string;
  name: string;
  exchanges: string[];
}

interface Holding {
  amount: number;
  buyPrice: number;
}

interface PriceAlert {
  /** Notify when the price crosses above this value. */
  above?: number;
  /** Notify when the price crosses below this value. */
  below?: number;
}

type Exchange = "coingecko" | "binance" | "coinbase";

const EXCHANGES: { id: Exchange; label: string }[] = [
  { id: "coingecko", label: "CoinGecko" },
  { id: "binance", label: "Binance" },
  { id: "coinbase", label: "Coinbase" },
];

const DEFAULT_COINS = ["bitcoin", "ethereum", "solana", "cardano", "ripple", "dogecoin"];
const REFRESH_INTERVAL_SEC = 45;
const CONFIG_KEY = "aetherwidgets-crypto-config";

interface WidgetConfig {
  exchange: Exchange;
  /** Per-exchange tracked coin lists: coins[exchange] = [coinId, ...]. */
  coins: Partial<Record<Exchange, string[]>>;
  /** Per-exchange portfolios: portfolios[exchange][coinId] = holding. */
  portfolios: Partial<Record<Exchange, Partial<Record<string, Holding>>>>;
  /** Per-exchange price alerts: alerts[exchange][coinId] = alert. */
  alerts: Partial<Record<Exchange, Partial<Record<string, PriceAlert>>>>;
}

function loadConfig(): WidgetConfig {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<WidgetConfig>;
      return {
        exchange: EXCHANGES.some((e) => e.id === parsed.exchange)
          ? (parsed.exchange as Exchange)
          : "coingecko",
        coins: parsed.coins ?? {},
        portfolios: parsed.portfolios ?? {},
        alerts: parsed.alerts ?? {},
      };
    }
  } catch {
    // corrupted storage — fall through to defaults
  }
  return { exchange: "coingecko", coins: {}, portfolios: {}, alerts: {} };
}

/** Renders a mini sparkline chart as an SVG polyline. */
function Sparkline({ data, positive }: { data: number[]; positive: boolean }) {
  if (data.length < 2) return null;

  const width = 64;
  const height = 22;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data
    .map((value, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((value - min) / range) * (height - 2) - 1;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg width={width} height={height} className="shrink-0" aria-hidden="true">
      <polyline
        points={points}
        fill="none"
        stroke={positive ? "#4ade80" : "#f87171"}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Small colored percentage badge. */
function ChangeBadge({ label, value }: { label: string; value: number | null }) {
  if (value === null) return null;
  const positive = value >= 0;
  return (
    <span
      className={`rounded px-1 py-px text-[9px] font-medium tabular-nums ${
        positive ? "bg-green-400/10 text-green-400" : "bg-red-400/10 text-red-400"
      }`}
      title={`${label}: ${positive ? "+" : ""}${value.toFixed(2)}%`}
    >
      {label} {positive ? "▲" : "▼"}
      {Math.abs(value).toFixed(1)}
    </span>
  );
}

function formatPrice(price: number): string {
  const decimals = price >= 100 ? 0 : price >= 1 ? 2 : 6;
  return price.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function formatMoney(value: number): string {
  const sign = value >= 0 ? "+" : "-";
  return `${sign}$${Math.abs(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function CryptoWidget() {
  const { t } = useLanguage();
  const [config, setConfig] = useState<WidgetConfig>(loadConfig);
  const [catalog, setCatalog] = useState<CatalogCoin[]>([]);
  const [coins, setCoins] = useState<CryptoCoin[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL_SEC);
  const [showSettings, setShowSettings] = useState(false);
  const { onPointerDown, onPointerMove, onPointerUp, isDragging } = useWidgetDrag();
  const mountedRef = useRef(true);

  // Persist config on change.
  useEffect(() => {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  }, [config]);

  // Load the coin catalog once.
  useEffect(() => {
    invoke<CatalogCoin[]>("get_crypto_catalog")
      .then((data) => {
        if (mountedRef.current) setCatalog(data);
      })
      .catch(() => {
        // catalog is static; failure is non-fatal
      });
  }, []);

  // Tracked coins for the active exchange (defaults on first use).
  const activeCoins = useMemo(
    () => config.coins[config.exchange] ?? DEFAULT_COINS,
    [config.coins, config.exchange],
  );

  const fetchPrices = useCallback(
    async (manual = false) => {
      if (manual) setRefreshing(true);
      try {
        const data = await invoke<CryptoCoin[]>("get_crypto_prices", {
          exchange: config.exchange,
          coins: activeCoins,
        });
        if (!mountedRef.current) return;
        setCoins(data);
        setLastUpdated(new Date());
        setError(null);
        setCountdown(REFRESH_INTERVAL_SEC);
      } catch (e) {
        if (!mountedRef.current) return;
        setError(typeof e === "string" ? e : t("widgets.crypto.updateFailed"));
      } finally {
        if (mountedRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [config.exchange, activeCoins, t],
  );

  // Initial fetch + auto-refresh interval (re-runs when exchange/coins change).
  useEffect(() => {
    mountedRef.current = true;
    setLoading(true);
    void fetchPrices();
    const interval = window.setInterval(() => {
      void fetchPrices();
    }, REFRESH_INTERVAL_SEC * 1000);
    return () => {
      mountedRef.current = false;
      window.clearInterval(interval);
    };
  }, [fetchPrices]);

  // Countdown ticker (1s)
  useEffect(() => {
    const ticker = window.setInterval(() => {
      setCountdown((c) => (c > 0 ? c - 1 : REFRESH_INTERVAL_SEC));
    }, 1000);
    return () => {
      window.clearInterval(ticker);
    };
  }, []);

  const toggleCoin = useCallback((id: string) => {
    setConfig((cfg) => {
      const current = cfg.coins[cfg.exchange] ?? DEFAULT_COINS;
      const next = current.includes(id) ? current.filter((c) => c !== id) : [...current, id];
      return { ...cfg, coins: { ...cfg.coins, [cfg.exchange]: next } };
    });
  }, []);

  const setHolding = useCallback((id: string, field: keyof Holding, raw: string) => {
    const value = parseFloat(raw);
    setConfig((cfg) => {
      const exchangeHoldings = cfg.portfolios[cfg.exchange] ?? {};
      const current = exchangeHoldings[id] ?? { amount: 0, buyPrice: 0 };
      const next = { ...current, [field]: Number.isNaN(value) ? 0 : value };
      const updated: Partial<Record<string, Holding>> = { ...exchangeHoldings };
      // Keep the entry only while the user is actively editing (any field > 0);
      // remove it when both fields are cleared.
      if (next.amount <= 0 && next.buyPrice <= 0) {
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete updated[id];
      } else {
        updated[id] = next;
      }
      return { ...cfg, portfolios: { ...cfg.portfolios, [cfg.exchange]: updated } };
    });
  }, []);

  const setAlert = useCallback((id: string, field: keyof PriceAlert, raw: string) => {
    const value = parseFloat(raw);
    setConfig((cfg) => {
      const exchangeAlerts = cfg.alerts[cfg.exchange] ?? {};
      const current = exchangeAlerts[id] ?? {};
      const next = { ...current };
      if (Number.isNaN(value) || value <= 0) {
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete next[field];
      } else {
        next[field] = value;
      }
      const updated: Partial<Record<string, PriceAlert>> = { ...exchangeAlerts };
      // Drop the entry entirely once both thresholds are cleared.
      if (next.above === undefined && next.below === undefined) {
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete updated[id];
      } else {
        updated[id] = next;
      }
      return { ...cfg, alerts: { ...cfg.alerts, [cfg.exchange]: updated } };
    });
  }, []);

  // Removes a single alert threshold after it has fired so price alerts are
  // one-shot: they notify once, then clear themselves. If that empties the
  // coin's alert entirely, the entry is dropped.
  const clearAlertField = useCallback(
    (exchange: Exchange, coinId: string, field: keyof PriceAlert) => {
      setConfig((cfg) => {
        const exchangeAlerts = cfg.alerts[exchange] ?? {};
        const current = exchangeAlerts[coinId];
        if (!current) return cfg;
        const next = { ...current };
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete next[field];
        const updated: Partial<Record<string, PriceAlert>> = { ...exchangeAlerts };
        if (next.above === undefined && next.below === undefined) {
          // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
          delete updated[coinId];
        } else {
          updated[coinId] = next;
        }
        return { ...cfg, alerts: { ...cfg.alerts, [exchange]: updated } };
      });
    },
    [],
  );

  // Price alerts: notify when a price enters an alert zone (above/below a
  // threshold). Alerts are one-shot: they fire once when the condition first
  // becomes true, then remove themselves from the config so they never ring
  // again unless the user re-adds them. The "already met" state is keyed per
  // exchange and preserved across exchange switches (validKeys spans every
  // exchange's alerts), so switching exchanges never re-fires an
  // already-notified alert. Evaluation only runs on price updates, reading the
  // latest alert config from refs, so typing a threshold never fires a
  // spurious alert mid-keystroke.
  const alertsRef = useRef(config.alerts);
  alertsRef.current = config.alerts;
  const exchangeRef = useRef(config.exchange);
  exchangeRef.current = config.exchange;
  const alertMetRef = useRef<Map<string, boolean>>(new Map());
  useEffect(() => {
    const exchange = exchangeRef.current;
    const alerts = alertsRef.current[exchange] ?? {};

    // Build the set of valid keys across EVERY exchange so that switching
    // exchanges doesn't wipe the "already notified" state of other exchanges
    // (which used to re-fire alerts when switching back).
    const validKeys = new Set<string>();
    for (const { id: ex } of EXCHANGES) {
      const exAlerts = alertsRef.current[ex];
      if (!exAlerts) continue;
      for (const coinId of Object.keys(exAlerts)) {
        const alert = exAlerts[coinId];
        if (!alert) continue;
        if (alert.above !== undefined) validKeys.add(`${ex}:${coinId}:above`);
        if (alert.below !== undefined) validKeys.add(`${ex}:${coinId}:below`);
      }
    }

    for (const coin of coins) {
      const alert = alerts[coin.id];
      if (!alert) continue;
      const symbol = coin.symbol.toUpperCase();
      const price = coin.current_price;

      if (alert.above !== undefined) {
        const key = `${exchange}:${coin.id}:above`;
        const met = price >= alert.above;
        const wasMet = alertMetRef.current.get(key) ?? false;
        if (met && !wasMet) {
          void notify(
            t("widgets.crypto.alertTitle").replace("{symbol}", symbol),
            t("widgets.crypto.alertAboveBody")
              .replace("{symbol}", symbol)
              .replace("{price}", formatPrice(alert.above)),
          );
          // One-shot: clear the threshold now that it has fired.
          clearAlertField(exchange, coin.id, "above");
        }
        alertMetRef.current.set(key, met);
      }

      if (alert.below !== undefined) {
        const key = `${exchange}:${coin.id}:below`;
        const met = price <= alert.below;
        const wasMet = alertMetRef.current.get(key) ?? false;
        if (met && !wasMet) {
          void notify(
            t("widgets.crypto.alertTitle").replace("{symbol}", symbol),
            t("widgets.crypto.alertBelowBody")
              .replace("{symbol}", symbol)
              .replace("{price}", formatPrice(alert.below)),
          );
          // One-shot: clear the threshold now that it has fired.
          clearAlertField(exchange, coin.id, "below");
        }
        alertMetRef.current.set(key, met);
      }
    }
    // Drop state for alerts that no longer exist so re-adding them re-arms.
    for (const key of Array.from(alertMetRef.current.keys())) {
      if (!validKeys.has(key)) {
        alertMetRef.current.delete(key);
      }
    }
  }, [coins, t, clearAlertField]);

  // Holdings for the active exchange only.
  const holdings = useMemo(
    () => config.portfolios[config.exchange] ?? {},
    [config.portfolios, config.exchange],
  );

  // Alerts for the active exchange only.
  const alerts = useMemo(
    () => config.alerts[config.exchange] ?? {},
    [config.alerts, config.exchange],
  );

  // Current price lookup by coin id (from the active exchange's feed).
  const priceById = useMemo(() => {
    const map = new Map<string, number>();
    for (const coin of coins) map.set(coin.id, coin.current_price);
    return map;
  }, [coins]);

  // Per-exchange P/L: each exchange's holdings valued at current prices.
  // Coins not present in the current feed are valued at their buy price (P/L = 0).
  const exchangePnl = useMemo(() => {
    const result = new Map<Exchange, { pnl: number; current: number }>();
    for (const ex of EXCHANGES) {
      const exHoldings = config.portfolios[ex.id];
      if (!exHoldings) continue;
      const trackedCoins = config.coins[ex.id] ?? DEFAULT_COINS;
      let invested = 0;
      let current = 0;
      let hasHoldings = false;
      for (const [coinId, h] of Object.entries(exHoldings)) {
        if (!h || h.amount <= 0) continue;
        if (!trackedCoins.includes(coinId)) continue;
        hasHoldings = true;
        invested += h.amount * h.buyPrice;
        current += h.amount * (priceById.get(coinId) ?? h.buyPrice);
      }
      if (hasHoldings) {
        result.set(ex.id, { pnl: current - invested, current });
      }
    }
    return result;
  }, [config.coins, config.portfolios, priceById]);

  const totalPnl = useMemo(() => {
    let sum = 0;
    for (const v of exchangePnl.values()) sum += v.pnl;
    return sum;
  }, [exchangePnl]);

  const exchangeLabel = EXCHANGES.find((e) => e.id === config.exchange)?.label ?? config.exchange;

  return (
    <WidgetContextMenu>
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        className={`flex h-full w-full flex-col rounded-(--aw-widget-radius) border border-widget-border bg-widget-bg p-3 shadow-2xl backdrop-blur-(--aw-widget-blur) ${
          isDragging ? "cursor-grabbing" : "cursor-grab"
        }`}
      >
        {/* Header */}
        <div className="mb-1.5 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-sm">₿</span>
            <span className="text-xs font-semibold tracking-wide text-widget-text">
              {t("widgets.crypto.title")}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onPointerDown={(e) => {
                e.stopPropagation();
              }}
              onClick={() => {
                unlockAudio();
                setShowSettings((s) => !s);
              }}
              className={`rounded-md px-2 py-1 text-sm transition-colors hover:bg-widget-surface-hover ${
                showSettings ? "text-accent" : "text-widget-muted hover:text-widget-text"
              }`}
              title={t("widgets.crypto.settings")}
            >
              ⚙
            </button>
            <button
              onPointerDown={(e) => {
                e.stopPropagation();
              }}
              onClick={() => {
                void fetchPrices(true);
              }}
              disabled={refreshing}
              className="rounded-md px-2 py-1 text-xs text-widget-muted transition-colors hover:bg-widget-surface-hover hover:text-widget-text disabled:opacity-50"
              title={t("widgets.crypto.refreshNow")}
            >
              {refreshing ? "…" : `↻ ${t("widgets.crypto.refreshNow")}`}
            </button>
          </div>
        </div>

        {/* Exchange tabs: quick switch without opening settings (hidden while settings open) */}
        {!showSettings && (
          <div className="mb-2 flex gap-1 rounded-lg bg-widget-inset p-0.5">
            {EXCHANGES.map((ex) => (
              <button
                key={ex.id}
                onPointerDown={(e) => {
                  e.stopPropagation();
                }}
                onClick={() => {
                  setConfig((cfg) => ({ ...cfg, exchange: ex.id }));
                }}
                className={`flex-1 rounded-md px-1 py-1 text-[10px] font-medium transition-colors ${
                  config.exchange === ex.id
                    ? "bg-accent/25 text-accent"
                    : "text-widget-muted hover:bg-widget-surface-hover hover:text-widget-text"
                }`}
              >
                {ex.label}
              </button>
            ))}
          </div>
        )}

        {showSettings ? (
          /* Settings panel: exchange picker + coin selection */
          <div className="flex flex-1 flex-col gap-2 overflow-y-auto">
            <div>
              <div className="mb-1 text-[10px] font-medium text-widget-muted">
                {t("widgets.crypto.dataSource")}
              </div>
              <div className="flex gap-1">
                {EXCHANGES.map((ex) => (
                  <button
                    key={ex.id}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                    }}
                    onClick={() => {
                      setConfig((cfg) => ({ ...cfg, exchange: ex.id }));
                    }}
                    className={`flex-1 rounded-md px-1 py-1 text-[10px] font-medium transition-colors ${
                      config.exchange === ex.id
                        ? "bg-accent/20 text-accent"
                        : "bg-widget-surface text-widget-muted hover:bg-widget-surface-hover hover:text-widget-text"
                    }`}
                  >
                    {ex.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="mb-1 text-[10px] font-medium text-widget-muted">
                {t("widgets.crypto.trackedCoins")} ({activeCoins.length})
              </div>
              <div className="grid grid-cols-2 gap-1">
                {catalog.map((coin) => {
                  const active = activeCoins.includes(coin.id);
                  const available = coin.exchanges.includes(config.exchange);
                  return (
                    <button
                      key={coin.id}
                      onPointerDown={(e) => {
                        e.stopPropagation();
                      }}
                      onClick={() => {
                        toggleCoin(coin.id);
                      }}
                      disabled={!available && !active}
                      className={`flex items-center justify-between rounded-md px-1.5 py-1 text-left text-[10px] transition-colors ${
                        active
                          ? "bg-accent/20 text-accent"
                          : available
                            ? "bg-widget-surface text-widget-muted hover:bg-widget-surface-hover hover:text-widget-text"
                            : "cursor-not-allowed bg-widget-surface text-widget-muted/40"
                      }`}
                      title={available ? coin.name : `${coin.name} — ${exchangeLabel}'de yok`}
                    >
                      <span className="font-medium">{coin.symbol}</span>
                      <span>{active ? "✓" : available ? "+" : "—"}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <div className="mb-1 text-[10px] font-medium text-widget-muted">
                {t("widgets.crypto.alerts")}
              </div>
              <div className="flex flex-col gap-1">
                {activeCoins.map((coinId) => {
                  const catalogCoin = catalog.find((c) => c.id === coinId);
                  const alert = alerts[coinId];
                  return (
                    <div
                      key={coinId}
                      className="flex items-center gap-1.5 rounded-md bg-widget-surface px-1.5 py-1"
                    >
                      <span className="w-10 shrink-0 text-[10px] font-medium text-widget-text">
                        {catalogCoin?.symbol.toUpperCase() ?? coinId}
                      </span>
                      <span className="text-[9px] text-widget-muted">
                        {t("widgets.crypto.alertAbove")}
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        placeholder="$"
                        value={alert?.above ?? ""}
                        onPointerDown={(e) => {
                          e.stopPropagation();
                        }}
                        onChange={(e) => {
                          setAlert(coinId, "above", e.target.value);
                        }}
                        className="min-w-0 flex-1 rounded bg-widget-inset px-1.5 py-1 text-[10px] text-widget-text tabular-nums outline-none placeholder:text-widget-muted/50 focus:bg-widget-surface-hover"
                      />
                      <span className="text-[9px] text-widget-muted">
                        {t("widgets.crypto.alertBelow")}
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        placeholder="$"
                        value={alert?.below ?? ""}
                        onPointerDown={(e) => {
                          e.stopPropagation();
                        }}
                        onChange={(e) => {
                          setAlert(coinId, "below", e.target.value);
                        }}
                        className="min-w-0 flex-1 rounded bg-widget-inset px-1.5 py-1 text-[10px] text-widget-text tabular-nums outline-none placeholder:text-widget-muted/50 focus:bg-widget-surface-hover"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : loading ? (
          <div className="flex flex-1 flex-col justify-center gap-2">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="h-3 w-16 animate-pulse rounded bg-widget-surface-hover" />
                <div className="h-3 w-20 animate-pulse rounded bg-widget-surface-hover" />
              </div>
            ))}
          </div>
        ) : coins.length === 0 && error ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-1">
            <span className="text-lg">⚠️</span>
            <span className="text-center text-[11px] text-widget-muted">{error}</span>
          </div>
        ) : (
          <>
            {/* Coin list */}
            <div className="flex flex-1 flex-col gap-1 overflow-y-auto">
              {coins.map((coin) => {
                const positive = (coin.change_24h ?? 0) >= 0;
                const holding = holdings[coin.id];
                const pnl = holding
                  ? (coin.current_price - holding.buyPrice) * holding.amount
                  : null;
                const pnlPct =
                  holding && holding.buyPrice > 0
                    ? ((coin.current_price - holding.buyPrice) / holding.buyPrice) * 100
                    : null;
                const hasBadges = coin.change_1h !== null || coin.change_7d !== null;
                const hasSparkline = coin.sparkline.length >= 2;
                return (
                  <div key={coin.id} className="rounded-lg bg-widget-inset px-1.5 py-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 flex-col justify-center">
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-xs font-semibold text-widget-text">
                            {coin.symbol}
                          </span>
                          <span className="truncate text-[10px] text-widget-muted">
                            {coin.name}
                          </span>
                        </div>
                        {hasBadges && (
                          <div className="mt-0.5 flex gap-1">
                            <ChangeBadge label="1s" value={coin.change_1h} />
                            <ChangeBadge label="7g" value={coin.change_7d} />
                          </div>
                        )}
                      </div>
                      {hasSparkline && <Sparkline data={coin.sparkline} positive={positive} />}
                      <div className="flex shrink-0 flex-col items-end justify-center">
                        <span className="text-xs font-semibold text-widget-text tabular-nums">
                          ${formatPrice(coin.current_price)}
                        </span>
                        {coin.change_24h !== null && (
                          <span
                            className={`text-[10px] tabular-nums ${
                              positive ? "text-green-400" : "text-red-400"
                            }`}
                          >
                            {positive ? "▲" : "▼"} {Math.abs(coin.change_24h).toFixed(2)}%
                          </span>
                        )}
                      </div>
                    </div>
                    {/* Portfolio row: Amount | Buy | P/L */}
                    <div className="mt-1.5 flex items-stretch gap-1.5 border-t border-widget-border pt-1.5">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        placeholder={t("widgets.crypto.amount")}
                        value={holding && holding.amount > 0 ? holding.amount : ""}
                        onPointerDown={(e) => {
                          e.stopPropagation();
                        }}
                        onChange={(e) => {
                          setHolding(coin.id, "amount", e.target.value);
                        }}
                        className="min-w-0 flex-1 rounded bg-widget-surface px-2 py-1.5 text-[11px] text-widget-text tabular-nums outline-none placeholder:text-widget-muted/50 focus:bg-widget-surface-hover"
                        title={t("widgets.crypto.amount")}
                      />
                      <input
                        type="number"
                        min="0"
                        step="any"
                        placeholder={t("widgets.crypto.buyPrice")}
                        value={holding && holding.buyPrice > 0 ? holding.buyPrice : ""}
                        onPointerDown={(e) => {
                          e.stopPropagation();
                        }}
                        onChange={(e) => {
                          setHolding(coin.id, "buyPrice", e.target.value);
                        }}
                        className="min-w-0 flex-1 rounded bg-widget-surface px-2 py-1.5 text-[11px] text-widget-text tabular-nums outline-none placeholder:text-widget-muted/50 focus:bg-widget-surface-hover"
                        title={t("widgets.crypto.buyPrice")}
                      />
                      <div
                        className={`flex min-w-0 flex-1 items-center justify-end rounded px-2 py-1.5 text-[11px] font-semibold tabular-nums ${
                          pnl === null
                            ? "text-widget-muted/40"
                            : pnl >= 0
                              ? "bg-green-400/10 text-green-400"
                              : "bg-red-400/10 text-red-400"
                        }`}
                        title={t("widgets.crypto.instantPnl")}
                      >
                        {pnl === null
                          ? `${t("widgets.crypto.pnl")} —`
                          : `${formatMoney(pnl)}${pnlPct !== null ? ` (${pnlPct >= 0 ? "+" : ""}${pnlPct.toFixed(1)}%)` : ""}`}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Portfolio summary: per-exchange P/L side by side + total */}
            {exchangePnl.size > 0 && (
              <div className="mt-1.5 rounded-lg bg-widget-surface px-2 py-1.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
                    {EXCHANGES.filter((ex) => exchangePnl.has(ex.id)).map((ex) => {
                      const v = exchangePnl.get(ex.id);
                      if (!v) return null;
                      return (
                        <span key={ex.id} className="flex items-baseline gap-1">
                          <span className="text-[9px] text-widget-muted">{ex.label}</span>
                          <span
                            className={`text-[10px] font-semibold tabular-nums ${
                              v.pnl >= 0 ? "text-green-400" : "text-red-400"
                            }`}
                          >
                            {formatMoney(v.pnl)}
                          </span>
                        </span>
                      );
                    })}
                  </div>
                  <span className="flex items-baseline gap-1 border-l border-widget-border pl-2">
                    <span className="text-[9px] font-medium text-widget-muted">Toplam</span>
                    <span
                      className={`text-[11px] font-bold tabular-nums ${
                        totalPnl >= 0 ? "text-green-400" : "text-red-400"
                      }`}
                    >
                      {formatMoney(totalPnl)}
                    </span>
                  </span>
                </div>
              </div>
            )}
          </>
        )}

        {/* Footer */}
        <div className="mt-2 flex items-center justify-between border-t border-widget-border pt-1.5 text-[9px] text-widget-muted">
          <span>{error ? `⚠️ ${error}` : exchangeLabel}</span>
          <span className="tabular-nums">
            {lastUpdated
              ? `${lastUpdated.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })} · ${String(countdown)}sn`
              : "—"}
          </span>
        </div>
      </div>
    </WidgetContextMenu>
  );
}
