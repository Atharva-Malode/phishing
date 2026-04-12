from fastapi import APIRouter, HTTPException
from schema.data import ImageRequest
import base64
import numpy as np
import cv2
from PIL import Image
import io
import pytesseract
import urllib.parse
from core.model import model, vectorizer, classifier
from core.agent import run_link_agent, run_email_agent

router = APIRouter()

# 🔧 Set this ONLY if on Windows
pytesseract.pytesseract.tesseract_cmd = r"C:/Program Files/Tesseract-OCR/tesseract.exe"


# ---------------- UTIL: BASE64 DECODE ----------------
def decode_base64_image(base64_str: str):
    try:
        if "," in base64_str:
            base64_str = base64_str.split(",")[1]

        image_data = base64.b64decode(base64_str)
        image = Image.open(io.BytesIO(image_data)).convert("RGB")
        return cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)

    except Exception:
        raise ValueError("Invalid base64 image")


# ---------------- UTIL: QR DETECTION ----------------
def detect_qr(image):
    try:
        detector = cv2.QRCodeDetector()
        data, bbox, _ = detector.detectAndDecode(image)

        if bbox is not None and data:
            return data.strip()
        return None
    except Exception:
        return None


# ---------------- UTIL: OCR ----------------
def detect_text(image):
    try:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

        # Improve OCR accuracy
        gray = cv2.threshold(gray, 150, 255, cv2.THRESH_BINARY)[1]

        text = pytesseract.image_to_string(gray)

        cleaned = text.strip()
        if len(cleaned) > 10:  # avoid noise
            return cleaned
        return None

    except Exception:
        return None


# ---------------- UTIL: URL CHECK ----------------
def is_url(text: str):
    try:
        text = text.strip()
        parsed = urllib.parse.urlparse(text if "://" in text else "http://" + text)
        return bool(parsed.netloc)
    except Exception:
        return False


# ---------------- MAIN ROUTE ----------------
@router.post("/image")
def analyze_image(request: ImageRequest):
    try:
        image = decode_base64_image(request.image)

        qr_data = detect_qr(image)
        text_data = detect_text(image)

        # =========================
        # CASE 1: QR DETECTED
        # =========================
        if qr_data:

            # ---------- QR is URL ----------
            if is_url(qr_data):

                if model is None or vectorizer is None:
                    raise HTTPException(status_code=500, detail="Link model not loaded")

                parsed = urllib.parse.urlparse(
                    qr_data if "://" in qr_data else "http://" + qr_data
                )
                domain = parsed.netloc or parsed.path.split('/')[0]

                if domain.startswith("www."):
                    domain = domain[4:]

                tfidf = vectorizer.transform([domain])
                pred = model.predict(tfidf)[0]
                prob = model.predict_proba(tfidf)[0][1]

                raw_response = {
                    "is_phishing": bool(pred == 1),
                    "score": round(prob * 100, 2),
                    "top_features": []
                }

                agent_output = run_link_agent(
                    url=qr_data,
                    domain_age=None,
                    model_output=raw_response,
                    shap_values=[]
                )

                return {
                    "category": "qr",
                    "qr_content": qr_data,
                    "analysis": agent_output or raw_response
                }

            # ---------- QR is TEXT ----------
            else:

                if classifier is None:
                    raise HTTPException(status_code=500, detail="Email model not loaded")

                result = classifier(qr_data)[0]

                raw_response = {
                    "is_phishing": result["label"] == "spam",
                    "score": round(result["score"] * 100, 2),
                    "top_features": []
                }

                agent_output = run_email_agent(
                    email_text=qr_data,
                    model_output=raw_response,
                    shap_values=[]
                )

                return {
                    "category": "qr",
                    "qr_content": qr_data,
                    "analysis": agent_output or raw_response
                }

        # =========================
        # CASE 2: TEXT IMAGE
        # =========================
        if text_data:

            if classifier is None:
                raise HTTPException(status_code=500, detail="Email model not loaded")

            result = classifier(text_data)[0]

            raw_response = {
                "is_phishing": result["label"] == "spam",
                "score": round(result["score"] * 100, 2),
                "top_features": []
            }

            agent_output = run_email_agent(
                email_text=text_data,
                model_output=raw_response,
                shap_values=[]
            )

            return {
                "category": "text",
                "ocr_text": text_data,
                "analysis": agent_output or raw_response
            }

        # =========================
        # CASE 3: GRAPHICS
        # =========================
        return {
            "category": "graphics",
            "message": "No QR or readable text detected. Likely an infographic or plain image."
        }

    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")