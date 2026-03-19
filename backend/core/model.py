# core/models.py

import pickle
import os
from transformers import pipeline
from dotenv import load_dotenv
from google import genai

load_dotenv()

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

MODEL_PATH = os.path.join(BASE_DIR, "model", "phishing_model.pkl")
VECTORIZER_PATH = os.path.join(BASE_DIR, "model", "vectorizer.pkl")

model = None
vectorizer = None
classifier = None
gemini_client = None

# Load ML model
try:
    with open(MODEL_PATH, "rb") as f:
        model = pickle.load(f)

    with open(VECTORIZER_PATH, "rb") as f:
        vectorizer = pickle.load(f)

    print("ML model loaded")
except:
    print("ML model failed")

# Load BERT classifier
try:
    classifier = pipeline(
        "text-classification",
        model="mrm8488/bert-tiny-finetuned-sms-spam-detection"
    )
    print("BERT loaded")
except:
    print("BERT failed")

# Load Gemini
try:
    import os
    api_key = os.getenv("GEMINI_API_KEY")

    if api_key:
        gemini_client = genai.Client(api_key=api_key)
        print("Gemini loaded")
except:
    print("Gemini failed")