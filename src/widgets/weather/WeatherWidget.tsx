import { useCallback, useEffect, useState } from "react";
import { WidgetContextMenu } from "@/components/WidgetContextMenu";
import { useLanguage } from "@/lib/i18n";
import { useWidgetDrag } from "@/lib/useWidgetDrag";

interface WeatherData {
  temperature: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  icon: string;
  feelsLike: number;
  uvIndex: number;
  forecast: ForecastDay[];
  hourly: HourlyPoint[];
}

interface ForecastDay {
  date: string;
  maxTemp: number;
  minTemp: number;
  icon: string;
}

interface HourlyPoint {
  label: string;
  temperature: number;
  icon: string;
}

interface OpenMeteoResponse {
  current: {
    temperature_2m: number;
    relative_humidity_2m: number;
    weather_code: number;
    wind_speed_10m: number;
    apparent_temperature: number;
    uv_index: number;
  };
  daily: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    weather_code: number[];
  };
  hourly?: {
    time: string[];
    temperature_2m: number[];
    weather_code: number[];
  };
}

interface City {
  name: string;
  latitude: number;
  longitude: number;
  country: string;
  admin1?: string;
  admin2?: string;
}

interface GeocodingResult {
  name: string;
  latitude: number;
  longitude: number;
  country: string;
  admin1?: string;
  admin2?: string;
}

type LocationMode = "system" | "custom";
type LocationStatus = "idle" | "requesting" | "blocked" | "unavailable";

const FALLBACK_CITY: City = {
  name: "Istanbul",
  latitude: 41.0082,
  longitude: 28.9784,
  country: "Turkey",
};

const weatherIcons: Record<number, string> = {
  0: "☀️",
  1: "🌤️",
  2: "⛅",
  3: "☁️",
  45: "🌫️",
  48: "🌫️",
  51: "🌦️",
  53: "🌦️",
  55: "🌦️",
  61: "🌧️",
  63: "🌧️",
  65: "🌧️",
  71: "🌨️",
  73: "🌨️",
  75: "🌨️",
  77: "🌨️",
  80: "🌦️",
  81: "🌦️",
  82: "🌦️",
  85: "🌨️",
  86: "🌨️",
  95: "⛈️",
  96: "⛈️",
  99: "⛈️",
};

function getLanguageCode(locale: string) {
  return locale.split("-")[0];
}

function normalizeText(value: string) {
  return value
    .toLocaleLowerCase("en-US")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim();
}

function formatSubtitle(city: City) {
  const parts = [city.admin2, city.admin1, city.country].filter(Boolean);
  return parts.join(", ");
}

function scoreCity(query: string, city: City) {
  const normalizedQuery = normalizeText(query);
  const name = normalizeText(city.name);
  const admin1 = normalizeText(city.admin1 ?? "");
  const admin2 = normalizeText(city.admin2 ?? "");
  const country = normalizeText(city.country);

  if (name === normalizedQuery) return 0;
  if (name.startsWith(normalizedQuery)) return 1;
  if (admin2 === normalizedQuery) return 2;
  if (admin2.startsWith(normalizedQuery)) return 3;
  if (admin1 === normalizedQuery) return 4;
  if (admin1.startsWith(normalizedQuery)) return 5;
  if (name.includes(normalizedQuery)) return 6;
  if (admin2.includes(normalizedQuery)) return 7;
  if (admin1.includes(normalizedQuery)) return 8;
  if (country.includes(normalizedQuery)) return 9;
  return 10;
}

function getCurrentPosition() {
  return new Promise<GeolocationPosition>((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("Geolocation unavailable"));
      return;
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      // Keep this short: when geolocation is unavailable (e.g. WebView2
      // without a permission handler) we want to fall back to IP geolocation
      // quickly instead of making the user wait.
      timeout: 6_000,
      maximumAge: 60_000,
    });
  });
}

async function reverseGeocode(
  latitude: number,
  longitude: number,
  locale: string,
): Promise<City | null> {
  const response = await fetch(
    `https://geocoding-api.open-meteo.com/v1/reverse?latitude=${String(latitude)}&longitude=${String(longitude)}&count=5&language=${getLanguageCode(locale)}&format=json`,
  );

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as { results?: GeocodingResult[] };
  const result = data.results?.[0];
  if (!result) return null;

  return {
    name: result.name,
    latitude: result.latitude,
    longitude: result.longitude,
    country: result.country,
    admin1: result.admin1,
    admin2: result.admin2,
  };
}

interface IpGeoResult {
  success?: boolean;
  latitude?: number;
  longitude?: number;
  city?: string;
  country?: string;
  region?: string;
}

/**
 * Resolves the current city from the public IP address. Used as a fallback
 * when the browser Geolocation API is unavailable or denied — WebView2 does
 * not surface a permission prompt, so `navigator.geolocation` often fails
 * even when Windows location access is granted.
 */
async function getIpCity(): Promise<City | null> {
  try {
    const response = await fetch("https://ipwho.is/");
    if (!response.ok) return null;
    const data = (await response.json()) as IpGeoResult;
    if (data.success === false) return null;
    if (typeof data.latitude !== "number" || typeof data.longitude !== "number") {
      return null;
    }
    return {
      name: data.city ?? "Unknown",
      latitude: data.latitude,
      longitude: data.longitude,
      country: data.country ?? "",
      admin1: data.region,
    };
  } catch {
    return null;
  }
}

/**
 * Resolves the city to show weather for, trying in order:
 *  1. Browser Geolocation API (most accurate, when permitted).
 *  2. IP-based geolocation (works without any permission).
 *  3. The static fallback city, so the widget never renders empty.
 */
async function getSystemCity(locale: string, fallbackName: string): Promise<City> {
  try {
    const position = await getCurrentPosition();
    const { latitude, longitude } = position.coords;
    const reverse = await reverseGeocode(latitude, longitude, locale);
    if (reverse) return reverse;
    return {
      name: fallbackName,
      latitude,
      longitude,
      country: "",
    };
  } catch {
    // Geolocation unavailable or denied — fall through to the IP lookup.
  }

  const ipCity = await getIpCity();
  if (ipCity) return ipCity;

  return FALLBACK_CITY;
}

export function WeatherWidget() {
  const { t, locale, weatherDescriptions } = useLanguage();
  const { onPointerDown, onPointerMove, onPointerUp, isDragging } = useWidgetDrag();

  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [locationMode, setLocationMode] = useState<LocationMode>("system");
  const [systemLocation, setSystemLocation] = useState<City | null>(null);
  const [customLocation, setCustomLocation] = useState<City>(FALLBACK_CITY);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locationStatus, setLocationStatus] = useState<LocationStatus>("idle");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<City[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [resolvingLocation, setResolvingLocation] = useState(true);

  const activeLocation = locationMode === "system" ? systemLocation : customLocation;
  const locationSubtitle = activeLocation
    ? formatSubtitle(activeLocation)
    : (locationError ?? t("widgets.weather.locationPermissionNeeded"));

  const resolveSystemLocation = useCallback(
    async (interactive = false) => {
      setResolvingLocation(true);
      setLocationStatus(interactive ? "requesting" : "idle");
      setLocationError(null);

      // getSystemCity never fails: it falls back to IP geolocation and then
      // to the default city, so the widget always has a location to show.
      const city = await getSystemCity(locale, t("widgets.weather.currentLocation"));
      setSystemLocation(city);
      setLocationMode("system");
      setLocationStatus("idle");
      setResolvingLocation(false);
    },
    [locale, t],
  );

  // Resolve the location on mount. The fallback chain (geolocation → IP →
  // default city) guarantees a result, so the widget never stays empty even
  // when WebView2 cannot provide browser geolocation.
  useEffect(() => {
    void resolveSystemLocation(false);
  }, [resolveSystemLocation]);

  const requestSystemLocation = () => {
    setShowSearch(false);
    setSearchQuery("");
    setSearchResults([]);
    void resolveSystemLocation(true);
  };

  useEffect(() => {
    const weatherLocation = locationMode === "system" ? systemLocation : customLocation;
    if (!weatherLocation) {
      setWeather(null);
      setError(null);
      setLoading(false);
      return;
    }

    const resolvedLocation = weatherLocation;

    let cancelled = false;
    // Abort any in-flight request so a hung network call cannot leave the
    // widget stuck in its loading state forever.
    let abortController: AbortController | null = null;

    async function fetchWeather() {
      setLoading(true);
      abortController?.abort();
      const controller = new AbortController();
      abortController = controller;
      const timeoutId = window.setTimeout(() => {
        controller.abort();
      }, 15_000);

      try {
        const response = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${String(resolvedLocation.latitude)}&longitude=${String(resolvedLocation.longitude)}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,apparent_temperature,uv_index&hourly=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=auto&forecast_days=7`,
          { signal: controller.signal },
        );
        if (!response.ok) throw new Error("Weather fetch failed");

        const data = (await response.json()) as OpenMeteoResponse;
        const current = data.current;
        const code = current.weather_code;

        const forecast: ForecastDay[] = data.daily.time.slice(0, 7).map((date, index) => ({
          date: new Date(date).toLocaleDateString(locale, { weekday: "short" }),
          maxTemp: Math.round(data.daily.temperature_2m_max[index]),
          minTemp: Math.round(data.daily.temperature_2m_min[index]),
          icon: weatherIcons[data.daily.weather_code[index]] ?? "❓",
        }));

        // Next 24 hours, one point every 2 hours (12 points) starting from
        // the current hour — compact enough to fit in two rows.
        const hourly: HourlyPoint[] = [];
        if (data.hourly) {
          const fetchTime = new Date();
          const nowIndex = data.hourly.time.findIndex((time) => new Date(time) >= fetchTime);
          const startIndex = nowIndex >= 0 ? nowIndex : 0;
          for (let i = startIndex; i < Math.min(startIndex + 24, data.hourly.time.length); i += 2) {
            hourly.push({
              label: new Date(data.hourly.time[i]).toLocaleTimeString(locale, { hour: "numeric" }),
              temperature: Math.round(data.hourly.temperature_2m[i]),
              icon: weatherIcons[data.hourly.weather_code[i]] ?? "❓",
            });
          }
        }

        if (cancelled) return;

        setWeather({
          temperature: Math.round(current.temperature_2m),
          condition: weatherDescriptions[code] ?? "Unknown",
          humidity: current.relative_humidity_2m,
          windSpeed: Math.round(current.wind_speed_10m),
          icon: weatherIcons[code] ?? "❓",
          feelsLike: Math.round(current.apparent_temperature),
          uvIndex: Math.round(current.uv_index),
          forecast,
          hourly,
        });
        setError(null);
      } catch {
        // Only the latest fetch may update the UI: a superseded fetch's
        // abort must not clobber the newer request's state, but a genuine
        // failure (including the 15 s timeout) still surfaces an error.
        if (!cancelled && abortController === controller) {
          setError(t("widgets.weather.error"));
        }
      } finally {
        window.clearTimeout(timeoutId);
        if (!cancelled && abortController === controller) {
          setLoading(false);
        }
      }
    }

    void fetchWeather();
    const interval = window.setInterval(
      () => {
        void fetchWeather();
      },
      10 * 60 * 1000,
    );

    return () => {
      cancelled = true;
      abortController?.abort();
      window.clearInterval(interval);
    };
  }, [customLocation, locationMode, locale, systemLocation, t, weatherDescriptions]);

  useEffect(() => {
    if (!showSearch) return;

    const query = searchQuery.trim();
    if (query.length < 2) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => {
      setSearchLoading(true);

      void (async () => {
        try {
          const response = await fetch(
            `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=20&language=${getLanguageCode(locale)}&format=json`,
            { signal: controller.signal },
          );
          if (!response.ok) return;

          const data = (await response.json()) as { results?: GeocodingResult[] };
          const next = (data.results ?? []).map((result) => ({
            name: result.name,
            latitude: result.latitude,
            longitude: result.longitude,
            country: result.country,
            admin1: result.admin1,
            admin2: result.admin2,
          }));

          next.sort((a, b) => scoreCity(query, a) - scoreCity(query, b));
          setSearchResults(next);
        } catch {
          if (!controller.signal.aborted) {
            setSearchResults([]);
          }
        } finally {
          if (!controller.signal.aborted) {
            setSearchLoading(false);
          }
        }
      })();
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [locale, searchQuery, showSearch]);

  const selectLocation = (selected: City) => {
    setCustomLocation(selected);
    setLocationMode("custom");
    setLocationError(null);
    setShowSearch(false);
    setSearchQuery("");
    setSearchResults([]);
  };

  const useSystemLocation = () => {
    setLocationMode("system");
    setLocationError(null);
    requestSystemLocation();
  };

  const showLocationPrompt = locationMode === "system" && !systemLocation && !resolvingLocation;
  const locationActionLabel =
    locationStatus === "requesting"
      ? t("widgets.weather.loading")
      : t("widgets.weather.useSystemLocation");
  const locationMessage = locationError ?? t("widgets.weather.locationPermissionNeeded");

  return (
    <WidgetContextMenu>
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        className={`flex h-full w-full flex-col gap-3 rounded-(--aw-widget-radius) border border-widget-border bg-widget-bg p-3 shadow-2xl backdrop-blur-(--aw-widget-blur) ${
          isDragging ? "cursor-grabbing" : "cursor-grab"
        }`}
      >
        <div className="flex w-full items-center justify-between gap-2 px-1">
          <button
            onClick={() => {
              setShowSearch((open) => !open);
            }}
            onPointerDown={(e) => {
              e.stopPropagation();
            }}
            className="min-w-0 truncate text-xs text-widget-muted transition-colors hover:text-widget-text"
            title={t("widgets.weather.searchPlaceholder")}
          >
            📍 {activeLocation?.name ?? t("widgets.weather.currentLocation")}
          </button>
          <div className="flex items-center gap-1.5">
            {locationMode === "custom" && (
              <span className="rounded-full bg-widget-surface px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-widget-muted">
                Custom
              </span>
            )}
            <span className="truncate text-xs text-widget-muted">{locationSubtitle}</span>
            <button
              onClick={useSystemLocation}
              onPointerDown={(e) => {
                e.stopPropagation();
              }}
              className={`rounded-md p-1 text-sm transition-colors hover:bg-widget-surface-hover hover:text-widget-text ${
                locationMode === "system" ? "text-accent" : "text-widget-muted"
              }`}
              title={t("widgets.weather.useSystemLocation")}
              aria-label={t("widgets.weather.useSystemLocation")}
            >
              🧭
            </button>
          </div>
        </div>

        {showSearch && (
          <div className="w-full overflow-hidden rounded-lg border border-widget-border bg-widget-bg shadow-xl backdrop-blur-xl">
            <div className="p-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                }}
                placeholder={t("widgets.weather.searchPlaceholder")}
                autoComplete="off"
                className="w-full rounded bg-widget-surface px-2 py-1 text-xs text-widget-text placeholder:text-widget-muted/50 focus:outline-none"
                onPointerDown={(e) => {
                  e.stopPropagation();
                }}
              />
            </div>
            <div className="max-h-36 overflow-y-auto border-t border-widget-border">
              {searchLoading ? (
                <div className="px-3 py-2 text-xs text-widget-muted">
                  {t("widgets.weather.loading")}
                </div>
              ) : searchResults.length > 0 ? (
                searchResults.map((result) => (
                  <button
                    key={`${result.name}-${String(result.latitude)}-${String(result.longitude)}`}
                    onClick={() => {
                      selectLocation(result);
                    }}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                    }}
                    className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs text-widget-text transition-colors hover:bg-widget-surface-hover"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-medium">{result.name}</div>
                      <div className="truncate text-[10px] text-widget-muted">
                        {[result.admin2, result.admin1, result.country].filter(Boolean).join(", ")}
                      </div>
                    </div>
                    <span className="shrink-0 text-[10px] text-widget-muted">
                      {Math.round(result.latitude * 10) / 10}° /{" "}
                      {Math.round(result.longitude * 10) / 10}°
                    </span>
                  </button>
                ))
              ) : searchQuery.trim().length >= 2 ? (
                <div className="px-3 py-2 text-xs text-widget-muted">
                  {t("widgets.weather.searchNoResults")}
                </div>
              ) : null}
            </div>
          </div>
        )}

        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
          {showLocationPrompt ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-xl bg-widget-surface px-4 py-5 text-center">
              <div className="text-3xl">🧭</div>
              <div className="space-y-1">
                <div className="text-sm font-semibold text-widget-text">
                  {t("widgets.weather.currentLocation")}
                </div>
                <div className="text-xs text-widget-muted">{locationMessage}</div>
              </div>
              <button
                onClick={useSystemLocation}
                className="rounded-lg bg-accent/20 px-3 py-1.5 text-xs font-medium text-accent transition-colors hover:bg-accent/30 active:bg-accent/40"
              >
                {locationActionLabel}
              </button>
            </div>
          ) : loading || resolvingLocation ? (
            <div className="flex flex-1 items-center justify-center rounded-xl bg-widget-surface">
              <span className="text-widget-muted">{t("widgets.weather.loading")}</span>
            </div>
          ) : error ? (
            <div className="flex flex-1 items-center justify-center rounded-xl bg-widget-surface px-4 text-center">
              <span className="text-widget-muted">{error}</span>
            </div>
          ) : weather ? (
            <>
              <div className="flex min-h-28 w-full items-center justify-between gap-3 rounded-xl bg-widget-surface px-3 py-3">
                <div className="flex items-center gap-3">
                  <span className="text-4xl">{weather.icon}</span>
                  <div className="flex flex-col">
                    <span className="text-3xl font-semibold text-widget-text tabular-nums">
                      {weather.temperature}°
                    </span>
                    <span className="text-sm text-widget-muted">{weather.condition}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-right text-xs text-widget-muted">
                  <span>💧 %{weather.humidity}</span>
                  <span>💨 {weather.windSpeed} km/h</span>
                  <span>🌡️ {weather.feelsLike}°</span>
                  <span>☀️ UV {weather.uvIndex}</span>
                </div>
              </div>

              <div className="grid h-22 flex-none grid-cols-7 gap-1 border-t border-widget-border pt-4">
                {weather.forecast.map((day, index) => (
                  <div
                    key={`${day.date}-${String(index)}`}
                    className={`flex min-h-0 flex-col items-center justify-around gap-0.5 rounded-lg px-1 py-1 text-[12px] ring-1 ${
                      index === 0
                        ? "bg-accent/15 ring-accent/30"
                        : "bg-widget-inset ring-transparent"
                    }`}
                  >
                    <span className="font-medium text-widget-muted">{day.date}</span>
                    <span className="text-base leading-none">{day.icon}</span>
                    <span className="text-center text-widget-text tabular-nums leading-none">
                      {day.maxTemp}°/{day.minTemp}°
                    </span>
                  </div>
                ))}
              </div>

              {weather.hourly.length > 0 && (
                <div className="flex-none border-t border-widget-border pt-2">
                  <div className="mb-1 px-1 text-[10px] font-medium text-widget-muted">
                    {t("widgets.weather.hourly")}
                  </div>
                  <div className="grid grid-cols-6 gap-1 pb-1">
                    {weather.hourly.map((point, index) => (
                      <div
                        key={`${point.label}-${String(index)}`}
                        className="flex flex-col items-center gap-0.5 rounded-lg bg-widget-inset px-1 py-1"
                      >
                        <span className="text-[9px] text-widget-muted">{point.label}</span>
                        <span className="text-sm leading-none">{point.icon}</span>
                        <span className="text-[11px] font-medium text-widget-text tabular-nums">
                          {point.temperature}°
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center rounded-xl bg-widget-surface px-4 text-center">
              <span className="text-widget-muted">{t("widgets.weather.loading")}</span>
            </div>
          )}
        </div>
      </div>
    </WidgetContextMenu>
  );
}
