def calculate_total_corpus(data):
    return data.ppf + data.pf + data.fd + data.equity + data.other

def calculate_required_corpus(target_monthly_income, yield_rate=0.04):
    return (target_monthly_income * 12) / yield_rate

def analyze_allocation(data):
    total = calculate_total_corpus(data)
    return {
        "ppf_pct": data.ppf / total if total else 0,
        "pf_pct": data.pf / total if total else 0,
        "fd_pct": data.fd / total if total else 0,
        "equity_pct": data.equity / total if total else 0
    }

def generate_insights(allocation, risk_profile):
    insights = []
    if allocation["equity_pct"] < 0.3 and risk_profile == "aggressive":
        insights.append("Your equity allocation is low for an aggressive profile.")
    if allocation["fd_pct"] > 0.5:
        insights.append("High fixed income exposure may slow wealth creation.")
    return insights

def project_corpus(current, monthly, rate, years):
    months = years * 12
    for _ in range(months):
        current = current * (1 + rate / 12) + monthly
    return current

def years_to_fi(current, monthly, target, rate):
    years = 0
    while current < target:
        current = project_corpus(current, monthly, rate, 1)
        years += 1
        if years > 50:
            break
    return years

def fi_progress(current, required):
    return min((current / required) * 100, 100)

def current_passive_income(current_corpus, yield_rate=0.04):
    return (current_corpus * yield_rate) / 12