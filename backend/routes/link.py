from fastapi import APIRouter

router = APIRouter()

@router.post("/link")
async def analyze_url(request: URLRequest):
    url = request.url
    
    if not url:
        raise HTTPException(status_code=400, detail="URL is required")
        
    if model is None or vectorizer is None or explainer is None:
        raise HTTPException(status_code=500, detail="Models are not loaded on the server.")

    try:
        # Extract domain from URL to prevent tokens/long paths from triggering false positives
        parsed_url = urllib.parse.urlparse(url if "://" in url else "http://" + url)
        domain = parsed_url.netloc or parsed_url.path.split('/')[0]
        
        # Remove common prefixes like www.
        if domain.startswith("www."):
            domain = domain[4:]
            
        # Vectorize using just the domain
        tfidf = vectorizer.transform([domain])

        # Predict
        pred = model.predict(tfidf)[0]
        prob = model.predict_proba(tfidf)[0][1]

        # SHAP Values
        shap_values = explainer.shap_values(tfidf)
        vals = shap_values[0]

        # Get top contributing features
        top_indices = np.argsort(np.abs(vals))[-5:]
        contributions = []

        for i in top_indices:
            word = feature_names[i]
            value = vals[i]

            if word in ignore_tokens:
                continue

            contributions.append({
                "feature": word,
                "impact": round(float(value), 4),
                "effect": "phishing" if value > 0 else "legitimate"
            })

        # Calculate domain age using whois
        try:
            domain_info = whois.whois(domain)
            creation_date = domain_info.creation_date
            
            if type(creation_date) is list:
                creation_date = creation_date[0]
                
            if creation_date:
                age_days = (datetime.now() - creation_date).days
                contributions.append({
                    "feature": "Domain Age",
                    "impact": round(1.0 / (age_days + 1), 4), # Inverse relation mapping logic approx
                    "effect": "phishing" if age_days < 30 else "legitimate" # Typically <30 days is risky
                })
            else:
                contributions.append({
                    "feature": "Domain Age",
                    "impact": 0,
                    "effect": "unknown"
                })
        except Exception as e:
            print(f"WHOIS lookup failed for {domain}: {e}")
            contributions.append({
                "feature": "Domain Age Check",
                "impact": 0,
                "effect": "failed"
            })

        # Calculate final percentage risk (0 to 100)
        risk_score = round(float(prob) * 100, 2)
        is_phishing = bool(pred == 1)

        raw_response = {
            "url": url,
            "domain_analyzed": domain,
            "prediction": "Phishing" if is_phishing else "Legitimate",
            "is_phishing": is_phishing,
            "confidence": round(float(prob), 3),
            "score": risk_score,
            "top_features": contributions
        }

        # Agent override
        if gemini_client:
            prompt = f"""You are an advanced AI Cybersecurity Agent. 
            Analyze the following raw assessment data of a URL: {json.dumps(raw_response)}
            
            Generate a final valid JSON response representing your final verdict. The JSON must exactly contain these keys:
            - "is_phishing" (boolean)
            - "score" (number, 0-100)
            - "top_features" (array of objects with "feature", "impact", "effect" indicating how different variables led to this conclusion)
            - "explanation" (A proper, natural language paragraph explaining why this link is phishing or safe. Mix all of the raw feature answers and domain age into your explanation. Do not use specific standard domain names like google.com, amazon.in, facebook.com, microsoft.com, etc. in your explanation or features; say 'the domain' instead.)
            
            Return ONLY valid JSON. Nothing else.
            """
            try:
                agent_response = gemini_client.models.generate_content(
                    model='gemini-1.5-flash',
                    contents=prompt,
                    config=types.GenerateContentConfig(response_mime_type="application/json"),
                )
                final_json = json.loads(agent_response.text)
                return final_json
            except Exception as e:
                print(f"Gemini analysis failed: {e}")

        # Fallback if agent fails
        raw_response["explanation"] = "API Agent is disabled or failed to synthesize the results."
        return raw_response

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")
