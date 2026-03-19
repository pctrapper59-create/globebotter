import os
import anthropic
from dotenv import load_dotenv

load_dotenv()

client = anthropic.Anthropic(
    api_key=os.getenv("ANTHROPIC_API_KEY")
)

SYSTEM_PROMPT = """You are an expert sales copywriter AI.
Your job is to generate high-converting outreach messages for businesses.
Rules:
- Keep messages short (3–6 sentences)
- Make them personalized using the business name
- Focus on benefits (getting more customers, saving time, increasing revenue)
- Use a friendly, natural tone (not robotic)
- Include a soft call-to-action
You will generate:
1. Cold email
2. Short DM message
3. Follow-up message
Always return clean, ready-to-send messages."""

def generate_outreach(prompt: str) -> str:
    """Call Claude API and return the generated outreach messages."""
    response = client.messages.create(
        model="claude-3-haiku-20240307",
        max_tokens=800,
        system=SYSTEM_PROMPT,
        messages=[
            {"role": "user", "content": prompt}
        ]
    )
    return response.content[0].text
