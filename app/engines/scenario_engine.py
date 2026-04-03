from app.engines.financial_engine import years_to_fi, project_corpus

def simulate_sip_increase(current, monthly, target, rate, increment):
    old_years = years_to_fi(current, monthly, target, rate)
    new_monthly = monthly + increment
    new_years = years_to_fi(current, new_monthly, target, rate)
    return {
        "old_years": old_years,
        "new_monthly": new_monthly,
        "new_years": new_years,
        "years_saved": old_years - new_years
    }