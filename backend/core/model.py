# core/models.py
import os
import pickle
from dotenv import load_dotenv
from transformers import pipeline


load_dotenv()

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

MODEL_PATH = os.path.join(BASE_DIR, "model", "phishing_model.pkl")
VECTORIZER_PATH = os.path.join(BASE_DIR, "model", "vectorizer.pkl")

# ---------------- GLOBAL OBJECTS ----------------
model = None
vectorizer = None
classifier = None

# ---------------- LOAD ML MODEL ----------------
try:
    with open(MODEL_PATH, "rb") as f:
        model = pickle.load(f)

    with open(VECTORIZER_PATH, "rb") as f:
        vectorizer = pickle.load(f)

    print("✅ ML model loaded")

except Exception as e:
    print("❌ ML model failed:", e)

# ---------------- LOAD BERT ----------------
try:
    classifier = pipeline(
        "text-classification",
        model="mrm8488/bert-tiny-finetuned-sms-spam-detection"
    )
    print("✅ BERT classifier loaded")

except Exception as e:
    print("❌ BERT failed:", e)

