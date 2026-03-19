import streamlit as st
from claude_api import generate_outreach
from prompts import build_prompt

# ── Page config ──────────────────────────────────────────────────────────────
st.set_page_config(
    page_title="AI Outreach Bot",
    page_icon="✉️",
    layout="centered"
)

# ── Custom CSS ───────────────────────────────────────────────────────────────
st.markdown("""
<style>
    .stApp { background-color: #0f1629; color: #e2e8f0; }
    .stTextInput > div > div > input { background: #0a0f1e; color: #e2e8f0; border: 1px solid #1e2a45; }
    .stTextArea > div > div > textarea { background: #0a0f1e; color: #e2e8f0; border: 1px solid #1e2a45; }
    .stButton > button { background: linear-gradient(135deg, #a78bfa, #38bdf8); color: white; border: none; font-weight: bold; width: 100%; }
    h1 { background: linear-gradient(135deg, #a78bfa, #38bdf8); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .message-box { background: #0a0f1e; border: 1px solid #1e2a45; border-radius: 10px; padding: 1rem; margin-bottom: 1rem; }
    .message-label { color: #a78bfa; font-size: 0.8rem; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.5rem; }
</style>
""", unsafe_allow_html=True)

# ── Header ───────────────────────────────────────────────────────────────────
st.title("✉️ AI Outreach Bot")
st.markdown("Generate personalized cold emails, DMs, and follow-ups — powered by Claude AI.")
st.markdown("---")

# ── Inputs ───────────────────────────────────────────────────────────────────
col1, col2 = st.columns(2)
with col1:
    business_name = st.text_input("Business Name *", placeholder="e.g. Mike's Plumbing")
with col2:
    business_type = st.text_input("Business Type *", placeholder="e.g. plumbing company")

col3, col4 = st.columns(2)
with col3:
    service = st.text_input("What you're offering", placeholder="e.g. AI marketing automation")
with col4:
    sender_name = st.text_input("Your name (optional)", placeholder="e.g. Alex Johnson")

# ── Generate ─────────────────────────────────────────────────────────────────
if st.button("⚡ Generate Outreach Messages"):
    if not business_name or not business_type:
        st.error("Business name and business type are required.")
    else:
        with st.spinner("Writing personalized messages with AI…"):
            try:
                prompt = build_prompt(
                    business_name=business_name,
                    service=service or "AI automation tools",
                    sender_name=sender_name
                )
                result = generate_outreach(prompt)

                st.success("Messages generated!")
                st.markdown("---")

                # Display in text areas for easy copying
                st.markdown("#### 📧 Cold Email")
                st.text_area("", result.split("2.")[0].strip(), height=200, key="email", label_visibility="collapsed")

                if "2." in result:
                    parts = result.split("2.")
                    dm_and_rest = "2." + parts[1] if len(parts) > 1 else ""
                    dm_part = dm_and_rest.split("3.")[0].strip() if "3." in dm_and_rest else dm_and_rest

                    st.markdown("#### 💬 DM / Instagram Message")
                    st.text_area("", dm_part, height=120, key="dm", label_visibility="collapsed")

                if "3." in result:
                    followup = "3." + result.split("3.")[1].strip()
                    st.markdown("#### 🔄 Follow-Up Message")
                    st.text_area("", followup, height=150, key="followup", label_visibility="collapsed")

            except Exception as e:
                st.error(f"Error: {str(e)}\n\nMake sure your ANTHROPIC_API_KEY is set in .env")

# ── Footer ───────────────────────────────────────────────────────────────────
st.markdown("---")
st.markdown(
    "<p style='text-align:center; color:#475569; font-size:0.8rem;'>Powered by Claude AI · Built with GlobeBotter</p>",
    unsafe_allow_html=True
)
