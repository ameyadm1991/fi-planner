from pydantic import BaseModel

class PlanRequest(BaseModel):
    ppf: float
    pf: float
    fd: float
    equity: float
    other: float
    monthly_investment: float
    target_monthly_income: float
    risk_profile: str
    income_preference: str
    increment: float = 0