import os
import logging
import google.generativeai as genai

logger = logging.getLogger(__name__)

# Reads GOOGLE_API_KEY from your environment
genai.configure(api_key=os.environ["GOOGLE_API_KEY"])
_model = genai.GenerativeModel("gemini-2.5-flash")


def refine_resolution(user_question: str, raw_article: str, user_name: str = None) -> str:
    """
    Refines a raw knowledge base article into a friendly, well-formatted reply
    using Google Gemini 2.5 Flash (free tier).
    Falls back to raw article if the API fails.
    """

    greeting = f"Hi {user_name}" if user_name else "Hi there"

    prompt = f"""You are a friendly and professional IT support assistant writing an email reply to a user.

The user's name is: {user_name or "unknown (use 'Hi there')"}
Their support request was:

---
{user_question}
---

The solution from our knowledge base is:

---
{raw_article}
---

Write a well-formatted, friendly email reply body using EXACTLY this structure:

{greeting},

[One warm sentence acknowledging their issue.]

[One sentence saying you found the solution.]

Here's what to do:

1. [Step one — clear and simple]

2. [Step two]

3. [Continue for all relevant steps]

[One closing sentence offering further help.]

Best regards,
IT Support Team

STRICT RULES:
- Use the exact structure above with blank lines between each section and between each numbered step.
- Each numbered step must be on its own line with a blank line before the next step.
- Do NOT use markdown (no **, no ##, no bullet points with -).
- Do NOT include a subject line.
- Do NOT mention the knowledge base or that this is automated.
- Plain text only — no special characters except normal punctuation.
- Keep the whole reply under 220 words.
"""

    try:
        response = _model.generate_content(prompt)
        refined = response.text.strip()
        logger.info("Resolution refined via Gemini | chars=%d", len(refined))
        return refined

    except Exception as e:
        logger.error("Gemini refinement failed | error=%s — falling back to raw article", e)
        return raw_article  # Safe fallback