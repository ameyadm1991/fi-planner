import json
import yfinance as yf

def load_stocks():
    with open("data/stocks.json", "r") as f:
        return json.load(f)

def fetch_market_data(ticker):
    try:
        stock = yf.Ticker(ticker)
        info = stock.info
        price = info.get("currentPrice", 0) or 0
        dividend_yield = info.get("dividendYield", 0) or 0
        dividend_yield = dividend_yield if dividend_yield < 1 else dividend_yield
        return {"price": price, "dividend_yield": dividend_yield}
    except Exception:
        return {"price": 0, "dividend_yield": 0}

def enrich_stocks(stocks):
    enriched = []
    for s in stocks:
        market_data = fetch_market_data(s["ticker"])
        enriched.append({
            **s,
            "price": market_data["price"],
            "dividend_yield": market_data["dividend_yield"]
        })
    return enriched

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

def build_monthly_portfolio(stocks, equity_amount, preference, months=12):
    stocks_per_month = min(5, len(stocks))
    if preference == "dividend":
        stocks = sorted(stocks, key=lambda x: x["dividend_yield"], reverse=True)
    else:
        stocks = sorted(stocks, key=lambda x: x["price"])
    monthly_plan = []
    total_stocks = len(stocks)
    for month in range(months):
        start_idx = (month * stocks_per_month) % total_stocks
        selected = []
        total_yield = sum([stocks[(start_idx + i) % total_stocks]["dividend_yield"] for i in range(stocks_per_month)]) or 1
        for i in range(stocks_per_month):
            s = stocks[(start_idx + i) % total_stocks]
            weight = s["dividend_yield"] / total_yield if preference == "dividend" else 1 / stocks_per_month
            allocation = equity_amount * weight
            price = s["price"] if s["price"] > 0 else 1
            shares = max(1,int(allocation / price))
            final_amount = shares * price
            selected.append({
                "ticker": s["ticker"],
                "amount": round(final_amount, 0),
                "shares": shares,
                "price": round(price, 2),
                "dividend_yield": round(s["dividend_yield"], 2),
                "comment": s.get("comment", "")
            })
        monthly_plan.append({"month": month + 1, "stocks": selected})
    return monthly_plan

def generate_portfolio(data):
    stocks = load_stocks()
    stocks = enrich_stocks(stocks)
    asset_split = allocate_assets(data.monthly_investment, data.risk_profile)
    monthly_equity = build_monthly_portfolio(stocks, asset_split["equity_amount"], data.income_preference)
    return {
        "monthly_equity": monthly_equity,
        "gold": {"ticker": "GOLDBEES", "amount": round(asset_split["gold_amount"], 0), "comment": "Gold ETF"},
        "debt": {"instrument": "FD/Debt Funds", "amount": round(asset_split["debt_amount"], 0), "comment": "Stable income"}
    }