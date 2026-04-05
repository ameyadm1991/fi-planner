import os
import requests

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")


def call_groq(prompt: str):
    url = "https://api.groq.com/openai/v1/chat/completions"

    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }

    data = {
        "model": "llama3-70b-8192",
        "messages": [
            {"role": "system", "content": "You are a financial advisor helping users achieve financial independence in India."},
            {"role": "user", "content": prompt}
        ]
    }

    res = requests.post(url, headers=headers, json=data, timeout=10)
    return res.json()["choices"][0]["message"]["content"]


def call_openrouter(prompt: str):
    url = "https://openrouter.ai/api/v1/chat/completions"

    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json"
    }

    data = {
        "model": "mistralai/mistral-7b-instruct:free",
        "messages": [
            {"role": "user", "content": prompt}
        ]
    }

    res = requests.post(url, headers=headers, json=data, timeout=10)
    return res.json()["choices"][0]["message"]["content"]


def get_ai_advice(prompt: str):
    try:
        return call_groq(prompt)
    except Exception:
        try:
            return call_openrouter(prompt)
        except Exception:
            return "AI service is temporarily unavailable. Please try again later."