# core/rules.py

def rule_engine(text):
    text = text.lower()
    rules = []

    if "click here" in text:
        rules.append("Urgent call-to-action")

    if "verify your account" in text:
        rules.append("Account verification pressure")

    if "urgent" in text or "immediately" in text:
        rules.append("Urgency manipulation")

    if "http://" in text or "bit.ly" in text:
        rules.append("Suspicious link")

    if "free" in text or "won" in text:
        rules.append("Reward scam")

    return rules