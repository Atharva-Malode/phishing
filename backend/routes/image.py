from fastapi import APIRouter, HTTPException
from schema.data import ImageRequest
import base64
import numpy as np
import cv2
from PIL import Image
import io
import pytesseract

router = APIRouter()

# 🔧 Set this ONLY if on Windows
pytesseract.pytesseract.tesseract_cmd = r"C:/Program Files/Tesseract-OCR/tesseract.exe"


def decode_base64_image(base64_str: str):
    try:
        # 🔥 Remove base64 prefix if present
        if "," in base64_str:
            base64_str = base64_str.split(",")[1]

        image_data = base64.b64decode(base64_str)
        image = Image.open(io.BytesIO(image_data)).convert("RGB")
        return cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)

    except Exception:
        raise ValueError("Invalid base64 image")


def detect_qr(image):
    try:
        detector = cv2.QRCodeDetector()
        data, bbox, _ = detector.detectAndDecode(image)

        if bbox is not None and data:
            return {
                "type": "qr",
                "data": data.strip()
            }
        return None
    except Exception:
        return None


def detect_text(image):
    try:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

        # Improve OCR accuracy
        gray = cv2.threshold(gray, 150, 255, cv2.THRESH_BINARY)[1]

        text = pytesseract.image_to_string(gray)

        cleaned = text.strip()
        if len(cleaned) > 10:  # threshold to avoid noise
            return {
                "type": "text",
                "data": cleaned
            }
        return None
    except Exception:
        return None


@router.post("/image")
def analyze_image(request: ImageRequest):
    try:
        image = decode_base64_image(request.image)

        qr_result = detect_qr(image)
        text_result = detect_text(image)

        # 🔥 Combine results (important)
        if qr_result and text_result:
            return {
                "category": "qr_with_text",
                "qr_content": qr_result["data"],
                "ocr_text": text_result["data"]
            }

        if qr_result:
            return {
                "category": "qr",
                "qr_content": qr_result["data"],
                "ocr_text": None
            }

        if text_result:
            return {
                "category": "text",
                "qr_content": None,
                "ocr_text": text_result["data"]
            }

        return {
            "category": "graphics",
            "qr_content": None,
            "ocr_text": None
        }

    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")