"""
AI Outreach Bot — CLI version
Run: python main.py
"""
from claude_api import generate_outreach
from prompts import build_prompt

def run_bot():
    print("\n✉️  AI Outreach Bot — Powered by Claude AI")
    print("=" * 45)

    business_name = input("\nEnter business name: ").strip()
    business_type = input("Enter business type (e.g. plumbing company): ").strip()
    service       = input("What are you offering? (press Enter to skip): ").strip()
    sender_name   = input("Your name (press Enter to skip): ").strip()

    if not business_name or not business_type:
        print("❌ Business name and type are required.")
        return

    print("\n⚡ Generating messages...")

    prompt = build_prompt(
        business_name=business_name,
        service=service or "AI automation tools",
        sender_name=sender_name
    )

    result = generate_outreach(prompt)

    print("\n" + "=" * 45)
    print("=== GENERATED OUTREACH MESSAGES ===")
    print("=" * 45)
    print(result)
    print("=" * 45)
    print("\n✅ Done! Copy any message above and send it.\n")

if __name__ == "__main__":
    run_bot()
