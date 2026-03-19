from fastapi import APIRouter, HTTPException
from schema.data import URLRequest
from core.model import model, vectorizer
from core.agent import run_link_agent

import urllib.parse
import numpy as np
import whois
from datetime import datetime

router = APIRouter()


@router.post("/link")
def analyze_url(request: URLRequest):

    if model is None or vectorizer is None:
        raise HTTPException(status_code=500, detail="Models not loaded")

    try:
        url = request.url

        # ---------------- DOMAIN EXTRACTION ----------------
        parsed = urllib.parse.urlparse(url if "://" in url else "http://" + url)
        domain = parsed.netloc or parsed.path.split('/')[0]

        if domain.startswith("www."):
            domain = domain[4:]

        # ---------------- MODEL ----------------
        tfidf = vectorizer.transform([domain])

        pred = model.predict(tfidf)[0]
        prob = model.predict_proba(tfidf)[0][1]

        # ---------------- SHAP ----------------
        shap_values = []  # simplified for now

        # ---------------- DOMAIN AGE ----------------
        domain_age = None
        try:
            domain_info = whois.whois(domain)
            creation_date = domain_info.creation_date

            if isinstance(creation_date, list):
                creation_date = creation_date[0]

            if creation_date:
                domain_age = (datetime.now() - creation_date).days

        except Exception:
            domain_age = None

        # ---------------- RAW RESPONSE ----------------
        raw_response = {
            "is_phishing": bool(pred == 1),
            "score": round(prob * 100, 2),
            "top_features": [
                {
                    "feature": "ML model prediction",
                    "impact": round(prob, 4),
                    "effect": "phishing" if pred == 1 else "legitimate"
                }
            ]
        }

        # ---------------- AGENT ----------------
        agent_output = run_link_agent(
            url=url,
            domain_age=domain_age,
            model_output=raw_response,
            shap_values=shap_values
        )

        # ---------------- FALLBACK ----------------
        if agent_output:
            return agent_output

        raw_response["explanation"] = "Fallback: ML model used due to agent failure."
        return raw_response

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))