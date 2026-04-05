import os
import requests
import sys
from dotenv import load_dotenv

# Load env variables
load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama3-8b-8192")


def log(msg):
    print(msg)
    sys.stdout.flush()


def call_groq(prompt: str):
    log("➡️ Calling Groq...")

    if not GROQ_API_KEY:
        raise Exception("Missing GROQ_API_KEY")

    url = "https://api.groq.com/openai/v1/chat/completions"

    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }

    data = {
        "model": "llama-3.1-8b-instant",
        "messages": [
            {"role": "system", "content": "You are a financial advisor for Indian users."},
            {"role": "user", "content": prompt}
        ]
    }

    res = requests.post(url, headers=headers, json=data, timeout=15)

    log(f"Groq Status: {res.status_code}")

    res.raise_for_status()

    return res.json()["choices"][0]["message"]["content"]


def get_ai_advice(prompt: str):
    try:
        return call_groq(prompt)
    except Exception as e:
        log(f"❌ Groq failed: {str(e)}")
        return "AI service is temporarily unavailable. Please try again later."