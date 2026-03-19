def build_prompt(business_name: str, service: str, sender_name: str = "") -> str:
    """Build the prompt for outreach message generation."""
    sender_line = f"Sender name: {sender_name}" if sender_name else ""
    return f"""Write 3 outreach messages for this business:

Business Name: {business_name}
Service Offered: {service}
{sender_line}

Create:
1. Cold email (include subject line)
2. Instagram/DM message
3. Follow-up message

Make them persuasive, friendly, and focused on getting a response.
Personalize each message using the business name.
"""
