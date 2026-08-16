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
}

interface ForecastDay {
  date: string;
  maxTemp: number;
  minTemp: number;
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
      timeout: 12_000,
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

async function getSystemCity(locale: string, fallbackName: string): Promise<City | null> {
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
    return null;
  }
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

      const city = await getSystemCity(locale, t("widgets.weather.currentLocation"));
      if (city) {
        setSystemLocation(city);
        setLocationMode("system");
        setLocationStatus("idle");
      } else {
        setSystemLocation(null);
        setLocationStatus(interactive ? "blocked" : "unavailable");
        setLocationError(t("widgets.weather.locationPermissionNeeded"));
      }

      setResolvingLocation(false);
    },
    [locale, t],
  );

  useEffect(() => {
    let cancelled = false;

    const initializeLocation = async () => {
      if (!("geolocation" in navigator)) {
        setResolvingLocation(false);
        setLocationStatus("unavailable");
        setLocationError(t("widgets.weather.locationPermissionNeeded"));
        return;
      }

      if (!("permissions" in navigator)) {
        setResolvingLocation(false);
        return;
      }

      try {
        const permission = await navigator.permissions.query({
          name: "geolocation",
        });

        if (cancelled) return;

        if (permission.state === "granted") {
          void resolveSystemLocation(false);
          return;
        }

        setResolvingLocation(false);
        if (permission.state === "denied") {
          setLocationStatus("blocked");
          setLocationError(t("widgets.weather.locationPermissionNeeded"));
        }
      } catch {
        setResolvingLocation(false);
      }
    };

    void initializeLocation();
    return () => {
      cancelled = true;
    };
  }, [resolveSystemLocation, t]);

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

    async function fetchWeather() {
      setLoading(true);

      try {
        const response = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${String(resolvedLocation.latitude)}&longitude=${String(resolvedLocation.longitude)}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,apparent_temperature,uv_index&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=auto&forecast_days=7`,
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
        });
        setError(null);
      } catch {
        if (!cancelled) {
          setError(t("widgets.weather.error"));
        }
      } finally {
        if (!cancelled) {
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
        className={`flex h-full w-full flex-col gap-3 rounded-2xl border border-widget-border bg-widget-bg p-3 shadow-2xl backdrop-blur-xl ${
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
              <span className="rounded-full bg-white/5 px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-widget-muted">
                Custom
              </span>
            )}
            <span className="truncate text-xs text-widget-muted">{locationSubtitle}</span>
            <button
              onClick={useSystemLocation}
              onPointerDown={(e) => {
                e.stopPropagation();
              }}
              className={`rounded-md p-1 text-sm transition-colors hover:bg-white/10 hover:text-widget-text ${
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
                className="w-full rounded bg-white/5 px-2 py-1 text-xs text-widget-text placeholder:text-widget-muted/50 focus:outline-none"
                onPointerDown={(e) => {
                  e.stopPropagation();
                }}
              />
            </div>
            <div className="max-h-36 overflow-y-auto border-t border-white/5">
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
                    className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs text-widget-text transition-colors hover:bg-white/10"
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

        <div className="flex min-h-0 flex-1 flex-col gap-3">
          {showLocationPrompt ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-xl bg-white/5 px-4 py-5 text-center">
              <div className="text-3xl">🧭</div>
              <div className="space-y-1">
                <div className="text-sm font-semibold text-widget-text">
                  {t("widgets.weather.currentLocation")}
                </div>
                <div className="text-xs text-widget-muted">{locationMessage}</div>
              </div>
              <button
                onClick={useSystemLocation}
                className="rounded-lg bg-accent/20 px-3 py-1.5 text-xs font-medium text-accent transition-colors hover:bg-accent/30"
              >
                {locationActionLabel}
              </button>
            </div>
          ) : loading || resolvingLocation ? (
            <div className="flex flex-1 items-center justify-center rounded-xl bg-white/5">
              <span className="text-widget-muted">{t("widgets.weather.loading")}</span>
            </div>
          ) : error ? (
            <div className="flex flex-1 items-center justify-center rounded-xl bg-white/5 px-4 text-center">
              <span className="text-widget-muted">{error}</span>
            </div>
          ) : weather ? (
            <>
              <div className="flex min-h-28 w-full items-center justify-between gap-3 rounded-xl bg-white/5 px-3 py-3">
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
                      index === 0 ? "bg-accent/15 ring-accent/30" : "bg-white/4 ring-transparent"
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
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center rounded-xl bg-white/5 px-4 text-center">
              <span className="text-widget-muted">{t("widgets.weather.loading")}</span>
            </div>
          )}
        </div>
      </div>
    </WidgetContextMenu>
  );
}
