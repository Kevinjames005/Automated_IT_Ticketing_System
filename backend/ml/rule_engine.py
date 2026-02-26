def rule_based_override(subject, body):
    text = f"{subject} {body}".lower()

    def build_response(category, priority, confidence):
        return {
            "category": {
                "value": category,
                "confidence": confidence
            },
            "priority": {
                "value": priority,
                "confidence": confidence
            },
            "source": "rule"
        }

    if any(word in text for word in [
        "unauthorized", "breach", "hacked", "malware",
        "ransomware", "suspicious login", "compromised", "admin access"
    ]):
        return build_response("security", "high", 0.98)

    if any(word in text for word in [
        "server down", "system down", "service unavailable",
        "outage", "500 error", "cannot access"
    ]):
        return build_response("infrastructure", "high", 0.95)

    if any(word in text for word in [
        "network down","dns issue", "packet loss", "latency"
    ]):
        return build_response("network", "high", 0.93)

    if any(word in text for word in [
        "payment failed", "charged twice",
        "invoice missing", "billing error"
    ]):
        return build_response("billing", "medium", 0.85)

    if any(word in text for word in [
        "cannot login", "login failed",
        "password not working", "locked out"
    ]):
        return build_response("login", "medium", 0.85)

    if any(word in text for word in [
        "api not working", "sync failed",
        "third party", "webhook error"
    ]):
        return build_response("integration", "low", 0.80)

    if any(word in text for word in [
        "disk failure", "hardware issue",
        "printer not working", "overheating"
    ]):
        return build_response("hardware", "medium", 0.80)

    if any(word in text for word in [
        "bug", "error in app",
        "unexpected behavior", "crash"
    ]):
        return build_response("bug", "low", 0.75)

    return None