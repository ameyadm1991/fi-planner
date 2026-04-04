import json
import os
import time
import yfinance as yf
from nsepython import nse_quote

CACHE_FILE = "market_cache.json"
CACHE_EXPIRY = 8 * 60 * 60  # 8 hours

# --- Cache utils ---
def load_cache():
    if os.path.exists(CACHE_FILE):
        with open(CACHE_FILE, "r") as f:
            cache = json.load(f)
        now = time.time()
        return {k: v for k, v in cache.items() if now - v.get("timestamp", 0) < CACHE_EXPIRY}
    return {}

def save_cache(cache):
    now = time.time()
    for k in cache:
        cache[k]["timestamp"] = now
    with open(CACHE_FILE, "w") as f:
        json.dump(cache, f)

# --- Load stock metadata and dividend data ---
def load_stocks_metadata():
    with open("data/stocks.json", "r") as f:
        return json.load(f)

def load_stocks_div():
    with open("data/stocks_div.json", "r") as f:
        div_data = json.load(f)
    # multiply dividend yield by 100
    for s in div_data:
        s["dividend_yield"] *= 100
    return {s["ticker"]: s["dividend_yield"] for s in div_data}

# --- Fetch price helpers ---
def fetch_price_yf(ticker):
    try:
        stock = yf.Ticker(ticker)
        info = stock.info
        price = info.get("currentPrice", 0)
        return price if price and price > 0 else None
    except Exception:
        return None

def fetch_price_nse(ticker):
    try:
        nse_symbol = ticker.split(".")[0]
        quote = nse_quote(nse_symbol)
        price = quote.get("lastPrice")
        if isinstance(price, str):
            price = float(price.replace(",", "").strip())
        return price if price > 0 else None
    except Exception:
        return None

# --- Fetch market price with fallback and cache ---
def fetch_market_price(ticker, cache):
    if ticker in cache and cache[ticker].get("price"):
        return cache[ticker]["price"]

    price = fetch_price_yf(ticker)
    if not price:
        price = fetch_price_nse(ticker)

    if price:
        cache[ticker] = {"price": price, "timestamp": time.time()}

    return price

# --- Enrich stocks ---
def enrich_stocks(stocks, div_map, cache):
    enriched = []
    for s in stocks:
        ticker = s["ticker"]
        price = fetch_market_price(ticker, cache)
        dividend_yield = div_map.get(ticker, 0)
        enriched.append({
            **s,
            "price": price,
            "dividend_yield": dividend_yield
        })
    save_cache(cache)
    return enriched

# --- Allocate assets ---
def allocate_assets(monthly, risk_profile):
    if risk_profile == "aggressive":
        equity_pct, gold_pct, debt_pct = 0.7, 0.1, 0.2
    elif risk_profile == "moderate":
        equity_pct, gold_pct, debt_pct = 0.5, 0.2, 0.3
    else:
        equity_pct, gold_pct, debt_pct = 0.3, 0.2, 0.5
    return {
        "equity_amount": monthly * equity_pct,
        "gold_amount": monthly * gold_pct,
        "debt_amount": monthly * debt_pct
    }

# --- Build monthly portfolio ---
def build_monthly_portfolio(stocks, equity_amount, preference, months=12):
    stocks_per_month = min(5, len(stocks))
    if preference == "dividend":
        stocks = sorted(stocks, key=lambda x: x.get("dividend_yield", 0), reverse=True)
    else:
        stocks = sorted(stocks, key=lambda x: x.get("price") or 0)

    monthly_plan = []
    total_stocks = len(stocks)
    for month in range(months):
        start_idx = (month * stocks_per_month) % total_stocks
        selected = []
        total_yield = sum([stocks[(start_idx + i) % total_stocks].get("dividend_yield", 0) for i in range(stocks_per_month)]) or 1
        for i in range(stocks_per_month):
            s = stocks[(start_idx + i) % total_stocks]
            weight = s.get("dividend_yield", 0) / total_yield if preference == "dividend" else 1 / stocks_per_month
            allocation = equity_amount * weight
            price = s.get("price") or 1
            shares = max(1, int(allocation / price))
            final_amount = shares * price
            selected.append({
                "ticker": s["ticker"],
                "amount": round(final_amount, 0),
                "shares": shares,
                "price": round(price, 2),
                "dividend_yield": round(s.get("dividend_yield", 0), 2),
                "comment": s.get("comment", "")
            })
        monthly_plan.append({"month": month + 1, "stocks": selected})
    return monthly_plan

# --- Generate portfolio ---
def generate_portfolio(data):
    stocks_metadata = load_stocks_metadata()
    div_map = load_stocks_div()
    cache = load_cache()

    enriched_stocks = enrich_stocks(stocks_metadata, div_map, cache)
    # NO inflation adjustment here
    asset_split = allocate_assets(data.monthly_investment, data.risk_profile)

    monthly_equity = build_monthly_portfolio(enriched_stocks, asset_split["equity_amount"], data.income_preference)

    return {
        "monthly_equity": monthly_equity,
        "gold": {"ticker": "GOLDBEES", "amount": round(asset_split["gold_amount"], 0), "comment": "Gold ETF"},
        "debt": {"instrument": "FD/Debt Funds", "amount": round(asset_split["debt_amount"], 0), "comment": "Stable income"}
    }