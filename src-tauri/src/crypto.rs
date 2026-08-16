//! Crypto price backend with multi-exchange support.
//!
//! Three public, keyless data sources are supported:
//! - **CoinGecko** — richest data (1h/24h/7d changes + 7-day sparkline).
//! - **Binance** — 24h ticker stats (no sparkline, no 1h/7d changes).
//! - **Coinbase** — spot price only (no changes, no sparkline).
//!
//! Each exchange has its own symbol conventions and coin coverage, so the
//! frontend sends the list of catalog coin ids it wants and this module maps
//! them to per-exchange symbols, skipping coins an exchange doesn't list.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Mutex;
use std::time::{Duration, Instant};

/// How long a cached response is served without hitting the network.
const CACHE_TTL: Duration = Duration::from_secs(45);
/// HTTP request timeout.
const REQUEST_TIMEOUT: Duration = Duration::from_secs(10);

/// One coin in the trackable catalog. `symbol` is the ticker (BTC, ETH…)
/// used to build per-exchange pair symbols.
struct CatalogEntry {
    id: &'static str,
    symbol: &'static str,
    name: &'static str,
    coingecko_id: &'static str,
    binance: bool,
    coinbase: bool,
}

/// Static catalog of coins the user can track.
const CATALOG: &[CatalogEntry] = &[
    CatalogEntry {
        id: "bitcoin",
        symbol: "BTC",
        name: "Bitcoin",
        coingecko_id: "bitcoin",
        binance: true,
        coinbase: true,
    },
    CatalogEntry {
        id: "ethereum",
        symbol: "ETH",
        name: "Ethereum",
        coingecko_id: "ethereum",
        binance: true,
        coinbase: true,
    },
    CatalogEntry {
        id: "solana",
        symbol: "SOL",
        name: "Solana",
        coingecko_id: "solana",
        binance: true,
        coinbase: true,
    },
    CatalogEntry {
        id: "cardano",
        symbol: "ADA",
        name: "Cardano",
        coingecko_id: "cardano",
        binance: true,
        coinbase: true,
    },
    CatalogEntry {
        id: "ripple",
        symbol: "XRP",
        name: "XRP",
        coingecko_id: "ripple",
        binance: true,
        coinbase: true,
    },
    CatalogEntry {
        id: "dogecoin",
        symbol: "DOGE",
        name: "Dogecoin",
        coingecko_id: "dogecoin",
        binance: true,
        coinbase: true,
    },
    CatalogEntry {
        id: "polkadot",
        symbol: "DOT",
        name: "Polkadot",
        coingecko_id: "polkadot",
        binance: true,
        coinbase: true,
    },
    CatalogEntry {
        id: "avalanche-2",
        symbol: "AVAX",
        name: "Avalanche",
        coingecko_id: "avalanche-2",
        binance: true,
        coinbase: true,
    },
    CatalogEntry {
        id: "chainlink",
        symbol: "LINK",
        name: "Chainlink",
        coingecko_id: "chainlink",
        binance: true,
        coinbase: true,
    },
    CatalogEntry {
        id: "litecoin",
        symbol: "LTC",
        name: "Litecoin",
        coingecko_id: "litecoin",
        binance: true,
        coinbase: true,
    },
    CatalogEntry {
        id: "shiba-inu",
        symbol: "SHIB",
        name: "Shiba Inu",
        coingecko_id: "shiba-inu",
        binance: true,
        coinbase: true,
    },
    CatalogEntry {
        id: "tron",
        symbol: "TRX",
        name: "TRON",
        coingecko_id: "tron",
        binance: true,
        coinbase: true,
    },
    CatalogEntry {
        id: "uniswap",
        symbol: "UNI",
        name: "Uniswap",
        coingecko_id: "uniswap",
        binance: true,
        coinbase: true,
    },
    CatalogEntry {
        id: "near",
        symbol: "NEAR",
        name: "NEAR Protocol",
        coingecko_id: "near",
        binance: true,
        coinbase: true,
    },
    CatalogEntry {
        id: "aptos",
        symbol: "APT",
        name: "Aptos",
        coingecko_id: "aptos",
        binance: true,
        coinbase: true,
    },
    CatalogEntry {
        id: "pepe",
        symbol: "PEPE",
        name: "Pepe",
        coingecko_id: "pepe",
        binance: true,
        coinbase: true,
    },
];

/// Catalog entry as exposed to the frontend.
#[derive(Debug, Clone, Serialize)]
pub struct CatalogCoin {
    pub id: String,
    pub symbol: String,
    pub name: String,
    /// Which exchanges list this coin: ["coingecko", "binance", "coinbase"].
    pub exchanges: Vec<String>,
}

/// One coin's market data, as exposed to the frontend.
#[derive(Debug, Clone, Serialize)]
pub struct CryptoCoin {
    pub id: String,
    pub symbol: String,
    pub name: String,
    pub current_price: f64,
    pub change_1h: Option<f64>,
    pub change_24h: Option<f64>,
    pub change_7d: Option<f64>,
    /// 7-day prices, downsampled for the mini chart (CoinGecko only).
    pub sparkline: Vec<f64>,
}

/// Cache key: exchange + sorted coin ids.
type CacheKey = String;
type CacheValue = (Instant, Vec<CryptoCoin>);

/// Shared per-exchange cache: last successful responses + fetch times.
pub struct CryptoState {
    cache: Mutex<HashMap<CacheKey, CacheValue>>,
}

impl CryptoState {
    pub fn new() -> Self {
        Self {
            cache: Mutex::new(HashMap::new()),
        }
    }
}

/// Downsamples a series to at most `target` points (keeps first/last).
fn downsample(series: &[f64], target: usize) -> Vec<f64> {
    if series.len() <= target || target < 2 {
        return series.to_vec();
    }
    let step = (series.len() - 1) as f64 / (target - 1) as f64;
    (0..target)
        .map(|i| series[(i as f64 * step).round() as usize])
        .collect()
}

fn build_client() -> Result<reqwest::Client, String> {
    reqwest::Client::builder()
        .timeout(REQUEST_TIMEOUT)
        .user_agent("AetherWidgets/0.1")
        .build()
        .map_err(|e| e.to_string())
}

/// Returns the full trackable coin catalog with per-exchange availability.
#[tauri::command]
pub fn get_crypto_catalog() -> Vec<CatalogCoin> {
    CATALOG
        .iter()
        .map(|c| {
            let mut exchanges = vec!["coingecko".to_string()];
            if c.binance {
                exchanges.push("binance".to_string());
            }
            if c.coinbase {
                exchanges.push("coinbase".to_string());
            }
            CatalogCoin {
                id: c.id.to_string(),
                symbol: c.symbol.to_string(),
                name: c.name.to_string(),
                exchanges,
            }
        })
        .collect()
}

/// Returns crypto market data for the requested coins from the requested
/// exchange, served from a 45-second per-exchange cache when possible.
///
/// On network or rate-limit failure, stale cached data is returned instead
/// of an error so the widget never goes blank.
#[tauri::command]
pub async fn get_crypto_prices(
    state: tauri::State<'_, CryptoState>,
    exchange: &str,
    coins: Vec<String>,
) -> Result<Vec<CryptoCoin>, String> {
    let mut requested: Vec<&CatalogEntry> = coins
        .iter()
        .filter_map(|id| CATALOG.iter().find(|c| c.id == id))
        .collect();
    requested.sort_by_key(|c| c.id);
    requested.dedup_by_key(|c| c.id);

    if requested.is_empty() {
        return Ok(Vec::new());
    }

    let cache_key = format!(
        "{}:{}",
        exchange,
        requested.iter().map(|c| c.id).collect::<Vec<_>>().join(",")
    );

    // Serve fresh-enough cache without any network call.
    {
        let cache = state.cache.lock().map_err(|e| e.to_string())?;
        if let Some((fetched_at, data)) = cache.get(&cache_key) {
            if fetched_at.elapsed() < CACHE_TTL {
                return Ok(data.clone());
            }
        }
    }

    let result = match exchange {
        "binance" => fetch_binance(&requested).await,
        "coinbase" => fetch_coinbase(&requested).await,
        _ => fetch_coingecko(&requested).await,
    };

    match result {
        Ok(data) => {
            let mut cache = state.cache.lock().map_err(|e| e.to_string())?;
            cache.insert(cache_key, (Instant::now(), data.clone()));
            Ok(data)
        }
        Err(e) => {
            // Fall back to stale cache if we have it.
            let cache = state.cache.lock().map_err(|e2| e2.to_string())?;
            if let Some((_, data)) = cache.get(&cache_key) {
                Ok(data.clone())
            } else {
                Err(e)
            }
        }
    }
}

// ---------------------------------------------------------------------------
// CoinGecko
// ---------------------------------------------------------------------------

#[derive(Debug, Deserialize)]
struct GeckoMarketEntry {
    id: String,
    current_price: Option<f64>,
    price_change_percentage_1h_in_currency: Option<f64>,
    price_change_percentage_24h_in_currency: Option<f64>,
    price_change_percentage_7d_in_currency: Option<f64>,
    sparkline_in_7d: Option<GeckoSparkline>,
}

#[derive(Debug, Deserialize)]
struct GeckoSparkline {
    price: Vec<f64>,
}

async fn fetch_coingecko(coins: &[&CatalogEntry]) -> Result<Vec<CryptoCoin>, String> {
    let ids = coins
        .iter()
        .map(|c| c.coingecko_id)
        .collect::<Vec<_>>()
        .join(",");
    let url = format!(
        "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids={ids}&price_change_percentage=1h,24h,7d&sparkline=true"
    );

    let response = build_client()?
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("Network error: {e}"))?;

    if !response.status().is_success() {
        return Err(format!("CoinGecko error: HTTP {}", response.status()));
    }

    let entries = response
        .json::<Vec<GeckoMarketEntry>>()
        .await
        .map_err(|e| format!("CoinGecko response could not be parsed: {e}"))?;

    Ok(coins
        .iter()
        .filter_map(|coin| {
            let entry = entries.iter().find(|e| e.id == coin.coingecko_id)?;
            Some(CryptoCoin {
                id: coin.id.to_string(),
                symbol: coin.symbol.to_string(),
                name: coin.name.to_string(),
                current_price: entry.current_price.unwrap_or(0.0),
                change_1h: entry.price_change_percentage_1h_in_currency,
                change_24h: entry.price_change_percentage_24h_in_currency,
                change_7d: entry.price_change_percentage_7d_in_currency,
                sparkline: entry
                    .sparkline_in_7d
                    .as_ref()
                    .map(|s| downsample(&s.price, 40))
                    .unwrap_or_default(),
            })
        })
        .collect())
}

// ---------------------------------------------------------------------------
// Binance — public 24h ticker, no API key. Symbols look like "BTCUSDT".
// ---------------------------------------------------------------------------

#[derive(Debug, Deserialize)]
struct BinanceTicker {
    symbol: String,
    #[serde(rename = "lastPrice")]
    last_price: String,
    #[serde(rename = "priceChangePercent")]
    price_change_percent: String,
}

async fn fetch_binance(coins: &[&CatalogEntry]) -> Result<Vec<CryptoCoin>, String> {
    let listed: Vec<&&CatalogEntry> = coins.iter().filter(|c| c.binance).collect();
    if listed.is_empty() {
        return Ok(Vec::new());
    }

    let symbols = listed
        .iter()
        .map(|c| format!("\"{}USDT\"", c.symbol))
        .collect::<Vec<_>>()
        .join(",");
    let url = format!("https://api.binance.com/api/v3/ticker/24hr?symbols=[{symbols}]");

    let response = build_client()?
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("Network error: {e}"))?;

    if !response.status().is_success() {
        return Err(format!("Binance error: HTTP {}", response.status()));
    }

    let tickers = response
        .json::<Vec<BinanceTicker>>()
        .await
        .map_err(|e| format!("Binance response could not be parsed: {e}"))?;

    Ok(listed
        .iter()
        .filter_map(|coin| {
            let pair = format!("{}USDT", coin.symbol);
            let ticker = tickers.iter().find(|t| t.symbol == pair)?;
            Some(CryptoCoin {
                id: coin.id.to_string(),
                symbol: coin.symbol.to_string(),
                name: coin.name.to_string(),
                current_price: ticker.last_price.parse::<f64>().unwrap_or(0.0),
                change_1h: None,
                change_24h: ticker.price_change_percent.parse::<f64>().ok(),
                change_7d: None,
                sparkline: Vec::new(),
            })
        })
        .collect())
}

// ---------------------------------------------------------------------------
// Coinbase — public spot price per pair, no API key. Pairs look like "BTC-USD".
// ---------------------------------------------------------------------------

#[derive(Debug, Deserialize)]
struct CoinbaseSpot {
    data: CoinbaseSpotData,
}

#[derive(Debug, Deserialize)]
struct CoinbaseSpotData {
    amount: String,
}

async fn fetch_coinbase(coins: &[&CatalogEntry]) -> Result<Vec<CryptoCoin>, String> {
    let client = build_client()?;
    let mut out = Vec::new();

    // Coinbase has no batch spot endpoint; fetch each pair sequentially.
    for coin in coins.iter().filter(|c| c.coinbase) {
        let url = format!(
            "https://api.coinbase.com/v2/prices/{}-USD/spot",
            coin.symbol
        );
        let response = client
            .get(&url)
            .send()
            .await
            .map_err(|e| format!("Network error: {e}"))?;

        if !response.status().is_success() {
            // Skip coins Coinbase doesn't list instead of failing the batch.
            continue;
        }

        let spot = response
            .json::<CoinbaseSpot>()
            .await
            .map_err(|e| format!("Coinbase response could not be parsed: {e}"))?;

        out.push(CryptoCoin {
            id: coin.id.to_string(),
            symbol: coin.symbol.to_string(),
            name: coin.name.to_string(),
            current_price: spot.data.amount.parse::<f64>().unwrap_or(0.0),
            change_1h: None,
            change_24h: None,
            change_7d: None,
            sparkline: Vec::new(),
        });
    }

    Ok(out)
}
