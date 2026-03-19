# core/agent.py

import json
import os
from google import genai
from dotenv import load_dotenv

load_dotenv()

# ---------------- GEMINI SETUP ----------------
GEMINI_MODEL = "gemini-2.5-flash"

api_key = os.getenv("GEMINI_API_KEY")

gemini_client = None

if api_key:
    try:
        gemini_client = genai.Client(api_key=api_key)
        print(f"✅ Gemini initialized (model = {GEMINI_MODEL})")
    except Exception as e:
        print("❌ Gemini init failed:", e)
else:
    print("⚠️ No GEMINI_API_KEY found")


# ---------------- SAFE JSON PARSER ----------------
def safe_parse(text):
    try:
        print("\n🧪 [DEBUG] Raw text BEFORE parsing:\n", text)

        text = text.strip()

        # Remove markdown safely
        if "```" in text:
            parts = text.split("```")
            if len(parts) > 1:
                text = parts[1]
                if text.startswith("json"):
                    text = text[4:]

        print("\n🧪 [DEBUG] Cleaned text:\n", text)

        parsed = json.loads(text)

        print("\n✅ [DEBUG] JSON Parsed Successfully:\n", parsed)

        return parsed

    except Exception as e:
        print("\n❌ [DEBUG] JSON Parse Error:", e)
        print("❌ [DEBUG] Failed text:\n", text)

        return None


# ================= EMAIL AGENT =================
def run_email_agent(email_text, model_output, shap_values):

    print("\n================ EMAIL AGENT START ================")

    if not gemini_client:
        print("❌ Gemini client not available")
        return None

    print("📩 Email Input:\n", email_text[:200])
    print("📊 Model Output:\n", model_output)

    prompt = f"""
You are a professional Cybersecurity Analyst.

Analyze this email for phishing.

EMAIL:
{email_text}

MODEL OUTPUT:
{json.dumps(model_output)}

Return ONLY JSON:

{{
  "is_phishing": true/false,
  "score": 0-100,
  "top_features": [],
  "explanation": "Explain in 5-6 lines"
}}
"""

    try:
        print("\n🚀 Calling Gemini API...")

        response = gemini_client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
            config={"response_mime_type": "application/json"}
        )

        print("\n✅ Gemini RAW RESPONSE OBJECT:\n", response)

        print("\n📄 Gemini TEXT RESPONSE:\n", response.text)

        parsed = safe_parse(response.text)

        print("\n🎯 FINAL EMAIL AGENT OUTPUT:\n", parsed)
        print("================ EMAIL AGENT END ================\n")

        return parsed

    except Exception as e:
        print("\n❌ Email Agent Error:", e)
        return None


# ================= LINK AGENT =================
def run_link_agent(url, domain_age, model_output, shap_values):

    print("\n================ LINK AGENT START ================")

    if not gemini_client:
        print("❌ Gemini client not available")
        return None

    print("🔗 URL:", url)
    print("📅 Domain Age:", domain_age)
    print("📊 Model Output:", model_output)

    prompt = f"""
You are a Cybersecurity Expert.

Analyze this URL:

URL: {url}
Domain Age: {domain_age}

MODEL OUTPUT:
{json.dumps(model_output)}

Return ONLY JSON:

{{
  "is_phishing": true/false,
  "score": 0-100,
  "top_features": [],
  "explanation": "Explain in 5-6 lines"
}}
"""

    try:
        print("\n🚀 Calling Gemini API...")

        response = gemini_client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
            config={"response_mime_type": "application/json"}
        )

        print("\n✅ Gemini RAW RESPONSE OBJECT:\n", response)

        print("\n📄 Gemini TEXT RESPONSE:\n", response.text)

        parsed = safe_parse(response.text)

        print("\n🎯 FINAL LINK AGENT OUTPUT:\n", parsed)
        print("================ LINK AGENT END ================\n")

        return parsed

    except Exception as e:
        print("\n❌ Link Agent Error:", e)
        return None
# # core/agent.py

# import json
# import os
# from google import genai
# from dotenv import load_dotenv

# load_dotenv()

# # ---------------- GEMINI SETUP ----------------
# GEMINI_MODEL = "gemini-2.5-flash"

# api_key = os.getenv("GEMINI_API_KEY")

# gemini_client = None

# if api_key:
#     try:
#         gemini_client = genai.Client(api_key=api_key)
#         print(f"✅ Gemini initialized (model = {GEMINI_MODEL})")
#     except Exception as e:
#         print("❌ Gemini init failed:", e)
# else:
#     print("⚠️ No GEMINI_API_KEY found")


# # ---------------- SAFE JSON PARSER ----------------
# def safe_parse(text):
#     try:
#         text = text.strip()

#         # Remove markdown if present
#         if text.startswith("```"):
#             text = text.split("```")[1]

#         return json.loads(text)

#     except Exception:
#         return {
#             "is_phishing": False,
#             "score": 50,
#             "top_features": [],
#             "explanation": "Agent response parsing failed. Fallback used."
#         }


# # ================= EMAIL AGENT =================
# def run_email_agent(email_text, model_output, shap_values):

#     if not gemini_client:
#         return None

#     prompt = f"""
# You are a professional Cybersecurity Analyst.

# You are analyzing an EMAIL for phishing.

# IMPORTANT:
# - ML model output and SHAP values are ONLY reference.
# - DO NOT depend on them.
# - You MUST make your own decision.

# --------------------------
# EMAIL:
# {email_text}

# MODEL OUTPUT:
# {json.dumps(model_output)}

# SHAP FEATURES:
# {json.dumps(shap_values)}
# --------------------------

# ANALYSIS RULES:

# 1. Look for:
#    - urgency or pressure
#    - suspicious links
#    - credential requests
#    - financial traps
#    - impersonation

# 2. If multiple suspicious signals → phishing

# 3. Prefer detecting phishing over missing it

# 4. Use reasoning, NOT model blindly

# --------------------------

# Return STRICT JSON:

# {{
#   "is_phishing": true/false,
#   "score": 0-100,
#   "top_features": [key signals you detected],
#   "explanation": "Write a clear 6-7 line paragraph explaining your reasoning and final decision."
# }}

# Be logical. Be strict. No hallucination.
# """

#     try:
#         response = gemini_client.models.generate_content(
#             model=GEMINI_MODEL,
#             contents=prompt
#         )

#         return safe_parse(response.text)

#     except Exception as e:
#         print("Email Agent Error:", e)
#         return None


# # ================= LINK AGENT =================
# def run_link_agent(url, domain_age, model_output, shap_values):

#     if not gemini_client:
#         return None

#     prompt = f"""
# You are a Cybersecurity Expert specializing in malicious URL detection.

# You are analyzing a WEBSITE LINK.

# IMPORTANT:
# - Model output and SHAP values are ONLY hints.
# - DO NOT rely on them.
# - Make your own expert decision.

# --------------------------
# URL:
# {url}

# DOMAIN AGE (days):
# {domain_age}

# MODEL OUTPUT:
# {json.dumps(model_output)}

# SHAP FEATURES:
# {json.dumps(shap_values)}
# --------------------------

# ANALYSIS RULES:

# 1. Check domain:
#    - random or suspicious naming
#    - impersonation patterns

# 2. Domain age:
#    - newly created domains are high risk

# 3. Detect:
#    - phishing intent
#    - login scams
#    - fake brand signals

# 4. Use model only as reference

# 5. Prefer catching phishing over missing it

# --------------------------

# Return STRICT JSON:

# {{
#   "is_phishing": true/false,
#   "score": 0-100,
#   "top_features": [important signals],
#   "explanation": "Write a 6-7 line explanation explaining your decision."
# }}

# Be strict. Be logical. No guessing.
# """

#     try:
#         response = gemini_client.models.generate_content(
#             model=GEMINI_MODEL,
#             contents=prompt
#         )

#         return safe_parse(response.text)

#     except Exception as e:
#         print("Link Agent Error:", e)
#         return None