# core/agent.py

import json

def run_agent(gemini_client, text, raw_response, rules):
    if not gemini_client:
        return None

    prompt = f"""
You are a STRICT Cybersecurity Agent.

Email:
{text}

Model Output:
{json.dumps(raw_response)}

Rules:
{rules}

Make final decision using logic (NOT blindly model).

Return JSON:
is_phishing, score, top_features, explanation
"""

    try:
        response = gemini_client.models.generate_content(
            model='gemini-1.5-flash',
            contents=prompt
        )

        return json.loads(response.text)

    except Exception as e:
        print("Agent failed:", e)
        return None