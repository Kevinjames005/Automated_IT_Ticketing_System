import logging

logger = logging.getLogger(__name__)


def rule_based_override(subject: str, body: str):
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
        logger.info("Rule matched | rule=security | priority=high | confidence=0.98")
        return build_response("security", "high", 0.98)

    if any(word in text for word in [
        "server down", "system down", "service unavailable",
        "outage", "500 error", "cannot access"
    ]):
        logger.info("Rule matched | rule=infrastructure | priority=high | confidence=0.95")
        return build_response("infrastructure", "high", 0.95)

    if any(word in text for word in [
        "network down", "dns issue", "packet loss", "latency"
    ]):
        logger.info("Rule matched | rule=network | priority=high | confidence=0.93")
        return build_response("network", "high", 0.93)

    if any(word in text for word in [
        "payment failed", "charged twice",
        "invoice missing", "billing error"
    ]):
        logger.info("Rule matched | rule=billing | priority=medium | confidence=0.85")
        return build_response("billing", "medium", 0.85)

    if any(word in text for word in [
        "cannot login", "login failed",
        "password not working", "locked out"
    ]):
        logger.info("Rule matched | rule=login | priority=medium | confidence=0.85")
        return build_response("login", "medium", 0.85)

    if any(word in text for word in [
        "api not working", "sync failed",
        "third party", "webhook error"
    ]):
        logger.info("Rule matched | rule=integration | priority=low | confidence=0.80")
        return build_response("integration", "low", 0.80)

    if any(word in text for word in [
        "disk failure", "hardware issue",
        "printer not working", "overheating"
    ]):
        logger.info("Rule matched | rule=hardware | priority=medium | confidence=0.80")
        return build_response("hardware", "medium", 0.80)

    if any(word in text for word in [
        "bug", "error in app",
        "unexpected behavior", "crash"
    ]):
        logger.info("Rule matched | rule=bug | priority=low | confidence=0.75")
        return build_response("bug", "low", 0.75)

    logger.info("No rule matched | falling through to semantic search / ML model")
    return None