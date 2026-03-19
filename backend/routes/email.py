from fastapi import APIRouter, HTTPException
from schema.data import EmailRequest
from core.model import classifier, gemini_client
from core.rules import rule_engine
from core.agent import run_agent
import json

router = APIRouter()

@router.post("/email")
def predict_email(request: EmailRequest):

    if classifier is None:
        raise HTTPException(status_code=500, detail="Model not loaded")

    result = classifier(request.text)[0]

    model_score = result['score']
    model_label = result['label']

    rules = rule_engine(request.text)

    risk_score = model_score * 100 + len(rules) * 5
    risk_score = min(risk_score, 100)

    is_phishing = risk_score > 50

    raw_response = {
        "is_phishing": is_phishing,
        "score": round(risk_score, 2),
        "top_features": rules
    }

    agent_output = run_agent(gemini_client, request.text, raw_response, rules)

    return agent_output if agent_output else raw_response