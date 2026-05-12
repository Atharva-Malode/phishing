from fastapi import APIRouter, HTTPException
from schema.data import ImageRequest

import base64
import io
import urllib.parse

import cv2
import numpy as np
from PIL import Image
import pytesseract
import zxingcpp

from core.model import model, vectorizer, classifier
from core.agent import run_link_agent, run_email_agent

router = APIRouter()

# Windows only (comment/remove for Linux/Mac)
pytesseract.pytesseract.tesseract_cmd = r"C:/Program Files/Tesseract-OCR/tesseract.exe"


# -------------------------------------------------
# BASE64 IMAGE DECODER
# -------------------------------------------------
def decode_base64_image(base64_str: str):
    try:
        if "," in base64_str:
            base64_str = base64_str.split(",")[1]

        image_data = base64.b64decode(base64_str)

        image = Image.open(
            io.BytesIO(image_data)
        ).convert("RGB")

        return cv2.cvtColor(
            np.array(image),
            cv2.COLOR_RGB2BGR
        )

    except Exception:
        raise ValueError("Invalid base64 image")


# -------------------------------------------------
# QR DETECTION (ZXING + OpenCV fallback)
# -------------------------------------------------
def detect_qr(image):
    try:
        # ---------- PASS 1 ZXING ----------
        results = zxingcpp.read_barcodes(image)

        if results:
            qr_data = results[0].text.strip()
            if qr_data:
                print("✅ QR detected via zxingcpp")
                return qr_data


        # ---------- PASS 2 OpenCV ----------
        detector = cv2.QRCodeDetector()

        data, bbox, _ = detector.detectAndDecode(image)

        if data:
            print("✅ QR detected via OpenCV")
            return data.strip()


        # ---------- PASS 3 Enlarged ----------
        gray = cv2.cvtColor(
            image,
            cv2.COLOR_BGR2GRAY
        )

        enlarged = cv2.resize(
            gray,
            None,
            fx=4,
            fy=4,
            interpolation=cv2.INTER_CUBIC
        )

        data, bbox, _ = detector.detectAndDecode(
            enlarged
        )

        if data:
            print("✅ QR detected via enlarged fallback")
            return data.strip()


        return None

    except Exception as e:
        print("QR detection error:", e)
        return None


# -------------------------------------------------
# OCR TEXT DETECTION
# -------------------------------------------------
def detect_text(image):
    try:
        # -----------------------------
        # 1. grayscale
        # -----------------------------
        gray = cv2.cvtColor(
            image,
            cv2.COLOR_BGR2GRAY
        )

        # -----------------------------
        # 2. Upscale for sharper OCR
        # -----------------------------
        gray = cv2.resize(
            gray,
            None,
            fx=2.5,
            fy=2.5,
            interpolation=cv2.INTER_CUBIC
        )

        # -----------------------------
        # 3. Denoise
        # -----------------------------
        gray = cv2.fastNlMeansDenoising(
            gray,
            None,
            30,
            7,
            21
        )

        # -----------------------------
        # 4. Adaptive threshold
        # Better than fixed threshold
        # -----------------------------
        thresh = cv2.adaptiveThreshold(
            gray,
            255,
            cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY,
            31,
            11
        )

        # -----------------------------
        # 5. Morphology clean-up
        # -----------------------------
        kernel = np.ones((1,1),np.uint8)

        cleaned = cv2.morphologyEx(
            thresh,
            cv2.MORPH_CLOSE,
            kernel
        )

        # -----------------------------
        # 6. Better OCR config
        # psm 6 = block of text
        # -----------------------------
        config = (
            r'--oem 3 '
            r'--psm 6 '
            r'-c preserve_interword_spaces=1'
        )

        text = pytesseract.image_to_string(
            cleaned,
            config=config
        )

        text = text.strip()

        if len(text) > 10:
            return text

        return None

    except Exception as e:
        print("OCR error:", e)
        return None


# -------------------------------------------------
# URL CHECK
# -------------------------------------------------
def is_url(text: str):
    try:
        text = text.strip()

        parsed = urllib.parse.urlparse(
            text if "://" in text
            else "http://" + text
        )

        return bool(parsed.netloc)

    except Exception:
        return False


# -------------------------------------------------
# MAIN ROUTE
# -------------------------------------------------
@router.post("/image")
def analyze_image(request: ImageRequest):
    try:
        image = decode_base64_image(
            request.image
        )

        qr_data = detect_qr(image)
        text_data = detect_text(image)

        print("QR:", qr_data)
        print("OCR:", text_data)


        # ==========================================
        # CASE 1 QR FOUND
        # ==========================================
        if qr_data:

            # ----- URL QR -----
            if is_url(qr_data):

                if model is None or vectorizer is None:
                    raise HTTPException(
                        status_code=500,
                        detail="Link model not loaded"
                    )

                parsed = urllib.parse.urlparse(
                    qr_data if "://" in qr_data
                    else "http://" + qr_data
                )

                domain = (
                    parsed.netloc
                    or parsed.path.split("/")[0]
                )

                if domain.startswith("www."):
                    domain = domain[4:]

                tfidf = vectorizer.transform(
                    [domain]
                )

                pred = model.predict(tfidf)[0]

                prob = model.predict_proba(
                    tfidf
                )[0][1]

                raw_response = {
                    "is_phishing": bool(
                        pred == 1
                    ),
                    "score": round(
                        prob * 100,
                        2
                    ),
                    "top_features": []
                }

                analysis = (
                    run_link_agent(
                        url=qr_data,
                        domain_age=None,
                        model_output=raw_response,
                        shap_values=[]
                    )
                    or raw_response
                )

                return {
                    "category": "qr",
                    "qr_content": qr_data,
                    **analysis
                }


            # ----- TEXT QR -----
            else:

                if classifier is None:
                    raise HTTPException(
                        status_code=500,
                        detail="Email model not loaded"
                    )

                result = classifier(
                    qr_data
                )[0]

                raw_response = {
                    "is_phishing":
                        result["label"] == "spam",
                    "score":
                        round(
                            result["score"]*100,
                            2
                        ),
                    "top_features": []
                }

                analysis = (
                    run_email_agent(
                        email_text=qr_data,
                        model_output=raw_response,
                        shap_values=[]
                    )
                    or raw_response
                )

                return {
                    "category": "qr",
                    "qr_content": qr_data,
                    **analysis
                }


        # ==========================================
        # CASE 2 OCR TEXT IMAGE
        # ==========================================
        if text_data:

            if classifier is None:
                raise HTTPException(
                    status_code=500,
                    detail="Email model not loaded"
                )

            result = classifier(
                text_data
            )[0]

            raw_response = {
                "is_phishing":
                    result["label"] == "spam",

                "score":
                    round(
                        result["score"]*100,
                        2
                    ),

                "top_features": []
            }

            analysis = (
                run_email_agent(
                    email_text=text_data,
                    model_output=raw_response,
                    shap_values=[]
                )
                or raw_response
            )

            return {
                "category": "text",
                "ocr_text": text_data,
                **analysis
            }


        # ==========================================
        # CASE 3 GRAPHICS
        # ==========================================
        return {
            "category":"graphics",
            "is_phishing": False,
            "score":0,
            "explanation":
                "No QR or readable text detected."
        }


    except ValueError as ve:
        raise HTTPException(
            status_code=400,
            detail=str(ve)
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Internal error: {str(e)}"
        )