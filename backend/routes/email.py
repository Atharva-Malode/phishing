from fastapi import APIRouter, HTTPException
from schema.data import EmailRequest
from core.model import classifier
from core.agent import run_email_agent

router = APIRouter()


@router.post("/email")
def predict_email(request: EmailRequest):

    if classifier is None:
        raise HTTPException(status_code=500, detail="Model not loaded")

    try:
        # ---------------- MODEL ----------------
        result = classifier(request.text)[0]

        model_score = result['score']
        model_label = result['label']

        # ---------------- RAW MODEL OUTPUT ----------------
        raw_response = {
            "is_phishing": model_label == "spam",
            "score": round(model_score * 100, 2),
            "top_features": [
                {
                    "feature": "BERT classification",
                    "impact": round(model_score, 4),
                    "effect": "phishing" if model_label == "spam" else "legitimate"
                }
            ]
        }

        # ---------------- AGENT ----------------
        agent_output = run_email_agent(
            email_text=request.text,
            model_output=raw_response,
            shap_values=[]   # no shap for email
        )

        # ---------------- FALLBACK ----------------
        if agent_output:
            return agent_output

        raw_response["explanation"] = "Fallback: ML model used due to agent failure."
        return raw_response

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))