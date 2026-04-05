from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.models.request_models import PlanRequest
from app.engines.portfolio_engine import generate_portfolio
from app.engines.financial_engine import (
    calculate_total_corpus, calculate_required_corpus, analyze_allocation, generate_insights,
    years_to_fi, fi_progress, current_passive_income
)
from app.engines.scenario_engine import simulate_sip_increase
from app.services.ai_service import get_ai_advice
from pydantic import BaseModel

class AIRequest(BaseModel):
    user_data: dict

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

def get_return_rate(risk_profile: str):
    return {"aggressive":0.12, "moderate":0.10}.get(risk_profile, 0.07)

@app.get("/")
def home():
    return {"message":"Financial Independence Planner API running"}

@app.post("/plan")
def plan(data: PlanRequest):
    portfolio = generate_portfolio(data)
    yield_rate = 0.04
    current_corpus = calculate_total_corpus(data)
    required_corpus = calculate_required_corpus(data.target_monthly_income, yield_rate)
    rate = get_return_rate(data.risk_profile)
    years = years_to_fi(current_corpus, data.monthly_investment, required_corpus, rate)
    allocation = analyze_allocation(data)
    insights = generate_insights(allocation, data.risk_profile)
    progress = fi_progress(current_corpus, required_corpus)
    passive_income = current_passive_income(current_corpus, yield_rate)
    scenario = simulate_sip_increase(current_corpus, data.monthly_investment, required_corpus, rate, data.increment) if data.increment>0 else None
    return {
        "current_corpus": current_corpus,
        "required_corpus": required_corpus,
        "years_to_financial_independence": years,
        "financial_independence_progress_percent": progress,
        "current_passive_income": passive_income,
        "allocation": allocation,
        "insights": insights,
        "scenario": scenario,
        "portfolio": portfolio
    }


@app.get("/test-ai")
def test_ai():
    from app.services.ai_service import get_ai_advice

    prompt = "I invest ₹50,000 monthly. Give simple financial advice."

    response = get_ai_advice(prompt)

    return {"response": response}

@app.post("/ai-advice")
def ai_advice(req: AIRequest):
    user_data = req.user_data

    prompt = f"""
    User financial details:
    {user_data}

    Give:
    - Personalized financial advice
    - Investment strategy
    - Risk suggestions
    - Mistakes to avoid

    Keep it simple and actionable.
    """

    advice = get_ai_advice(prompt)

    return {"advice": advice}