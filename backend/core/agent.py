# core/agent.py

import json
import os
from dotenv import load_dotenv

from google import genai
from groq import Groq

load_dotenv()

# ================= CONFIG =================
GEMINI_MODEL = "gemini-3.1-flash-lite-preview"
GROQ_MODEL = "llama-3.1-8b-instant"

# ================= CLIENT INIT =================
def init_gemini():
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("⚠️ No GEMINI_API_KEY found")
        return None

    try:
        client = genai.Client(api_key=api_key)
        print(f"✅ Gemini initialized ({GEMINI_MODEL})")
        return client
    except Exception as e:
        print("❌ Gemini init failed:", e)
        return None


def init_groq():
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        print("⚠️ No GROQ_API_KEY found")
        return None

    try:
        client = Groq(api_key=api_key)
        print(f"✅ Groq initialized ({GROQ_MODEL})")
        return client
    except Exception as e:
        print("❌ Groq init failed:", e)
        return None


gemini_client = init_gemini()
groq_client = init_groq()

# ================= JSON PARSER =================
def clean_text(text):
    text = text.strip()

    if "```" in text:
        parts = text.split("```")
        if len(parts) > 1:
            text = parts[1]
            if text.startswith("json"):
                text = text[4:]

    return text.strip()


def safe_parse(text):
    try:
        print("\n🧪 RAW TEXT:\n", text)

        cleaned = clean_text(text)
        print("\n🧪 CLEANED TEXT:\n", cleaned)

        parsed = json.loads(cleaned)
        print("\n✅ JSON PARSED:\n", parsed)

        return parsed

    except Exception as e:
        print("\n❌ JSON Parse Error:", e)
        return None


# ================= LLM CALLS =================
def call_gemini(prompt):
    if not gemini_client:
        return None

    try:
        print("\n🚀 Calling Gemini...")

        response = gemini_client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
            config={"response_mime_type": "application/json"}
        )

        return safe_parse(response.text)

    except Exception as e:
        print("\n❌ Gemini Error:", e)
        return None


def call_groq(prompt):
    if not groq_client:
        return None

    try:
        print("\n⚡ Calling Groq...")

        response = groq_client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": "You are a strict JSON generator. Return ONLY valid JSON. No markdown, no explanation."
                },
                {"role": "user", "content": prompt}
            ],
            temperature=0
        )

        text = response.choices[0].message.content
        return safe_parse(text)

    except Exception as e:
        print("\n❌ Groq Error:", e)
        return None


# ================= FALLBACK HANDLER =================
def call_llm_with_fallback(prompt):
    # Try Gemini first
    result = call_gemini(prompt)

    if result:
        return result

    print("⚠️ Gemini failed or invalid JSON → switching to Groq")

    # Fallback to Groq
    result = call_groq(prompt)

    if result:
        return result

    print("❌ Both Gemini and Groq failed")
    return None


# ================= PROMPT BUILDERS =================
def build_email_prompt(email_text, model_output):
    return f"""
You are a professional Cybersecurity Analyst.

Analyze this email for phishing.

EMAIL:
{email_text}

MODEL OUTPUT:
{json.dumps(model_output)}

Return ONLY valid JSON:

{{
  "is_phishing": true/false,
  "score": 0-100,
  "top_features": [],
  "explanation": "Explain in 5-6 lines"
}}
"""


def build_link_prompt(url, domain_age, model_output):
    return f"""
You are a Cybersecurity Expert.

Analyze this URL:

URL: {url}
Domain Age: {domain_age}

MODEL OUTPUT:
{json.dumps(model_output)}

Return ONLY valid JSON:

{{
  "is_phishing": true/false,
  "score": 0-100,
  "top_features": [],
  "explanation": "Explain in 5-6 lines"
}}
"""


# ================= AGENTS =================
def run_email_agent(email_text, model_output, shap_values=None):

    print("\n================ EMAIL AGENT START ================")

    prompt = build_email_prompt(email_text, model_output)

    result = call_llm_with_fallback(prompt)

    print("\n🎯 EMAIL AGENT OUTPUT:\n", result)
    print("================ EMAIL AGENT END ================\n")

    return result


def run_link_agent(url, domain_age, model_output, shap_values=None):

    print("\n================ LINK AGENT START ================")

    prompt = build_link_prompt(url, domain_age, model_output)

    result = call_llm_with_fallback(prompt)

    print("\n🎯 LINK AGENT OUTPUT:\n", result)
    print("================ LINK AGENT END ================\n")

    return result
# # core/agent.py

# import json
# import os
# from google import genai
# from dotenv import load_dotenv

# load_dotenv()

# # ---------------- GEMINI SETUP ----------------
# GEMINI_MODEL = "gemini-3.1-flash-lite-preview"

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
#         print("\n🧪 [DEBUG] Raw text BEFORE parsing:\n", text)

#         text = text.strip()

#         # Remove markdown safely
#         if "```" in text:
#             parts = text.split("```")
#             if len(parts) > 1:
#                 text = parts[1]
#                 if text.startswith("json"):
#                     text = text[4:]

#         print("\n🧪 [DEBUG] Cleaned text:\n", text)

#         parsed = json.loads(text)

#         print("\n✅ [DEBUG] JSON Parsed Successfully:\n", parsed)

#         return parsed

#     except Exception as e:
#         print("\n❌ [DEBUG] JSON Parse Error:", e)
#         print("❌ [DEBUG] Failed text:\n", text)

#         return None


# # ================= EMAIL AGENT =================
# def run_email_agent(email_text, model_output, shap_values):

#     print("\n================ EMAIL AGENT START ================")

#     if not gemini_client:
#         print("❌ Gemini client not available")
#         return None

#     print("📩 Email Input:\n", email_text[:200])
#     print("📊 Model Output:\n", model_output)

#     prompt = f"""
# You are a professional Cybersecurity Analyst.

# Analyze this email for phishing.

# EMAIL:
# {email_text}

# MODEL OUTPUT:
# {json.dumps(model_output)}

# Return ONLY JSON:

# {{
#   "is_phishing": true/false,
#   "score": 0-100,
#   "top_features": [],
#   "explanation": "Explain in 5-6 lines"
# }}
# """

#     try:
#         print("\n🚀 Calling Gemini API...")

#         response = gemini_client.models.generate_content(
#             model=GEMINI_MODEL,
#             contents=prompt,
#             config={"response_mime_type": "application/json"}
#         )

#         print("\n✅ Gemini RAW RESPONSE OBJECT:\n", response)

#         print("\n📄 Gemini TEXT RESPONSE:\n", response.text)

#         parsed = safe_parse(response.text)

#         print("\n🎯 FINAL EMAIL AGENT OUTPUT:\n", parsed)
#         print("================ EMAIL AGENT END ================\n")

#         return parsed

#     except Exception as e:
#         print("\n❌ Email Agent Error:", e)
#         return None


# # ================= LINK AGENT =================
# def run_link_agent(url, domain_age, model_output, shap_values):

#     print("\n================ LINK AGENT START ================")

#     if not gemini_client:
#         print("❌ Gemini client not available")
#         return None

#     print("🔗 URL:", url)
#     print("📅 Domain Age:", domain_age)
#     print("📊 Model Output:", model_output)

#     prompt = f"""
# You are a Cybersecurity Expert.

# Analyze this URL:

# URL: {url}
# Domain Age: {domain_age}

# MODEL OUTPUT:
# {json.dumps(model_output)}

# Return ONLY JSON:

# {{
#   "is_phishing": true/false,
#   "score": 0-100,
#   "top_features": [],
#   "explanation": "Explain in 5-6 lines"
# }}
# """

#     try:
#         print("\n🚀 Calling Gemini API...")

#         response = gemini_client.models.generate_content(
#             model=GEMINI_MODEL,
#             contents=prompt,
#             config={"response_mime_type": "application/json"}
#         )

#         print("\n✅ Gemini RAW RESPONSE OBJECT:\n", response)

#         print("\n📄 Gemini TEXT RESPONSE:\n", response.text)

#         parsed = safe_parse(response.text)

#         print("\n🎯 FINAL LINK AGENT OUTPUT:\n", parsed)
#         print("================ LINK AGENT END ================\n")

#         return parsed

#     except Exception as e:
#         print("\n❌ Link Agent Error:", e)
#         return None
