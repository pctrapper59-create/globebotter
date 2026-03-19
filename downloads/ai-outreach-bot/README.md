# ✉️ AI Outreach Bot

Generate personalized cold emails, DMs, and follow-up messages in seconds — powered by Claude AI.

---

## Quick Start

### 1. Install dependencies
```bash
pip install -r requirements.txt
```

### 2. Set your API key
Copy `.env.example` to `.env` and add your Anthropic API key:
```
ANTHROPIC_API_KEY=your_key_here
```
Get a key at: https://console.anthropic.com

### 3. Run

**Web UI (recommended):**
```bash
streamlit run ui.py
```
Opens in your browser at http://localhost:8501

**CLI version:**
```bash
python main.py
```

---

## What it generates

For any business, it creates 3 ready-to-send messages:

1. **Cold Email** — Subject line + personalized email body
2. **DM / Instagram Message** — Short, punchy direct message
3. **Follow-Up Message** — Polite follow-up for non-responders

---

## Files

| File | Purpose |
|------|---------|
| `ui.py` | Streamlit web UI |
| `main.py` | CLI version |
| `claude_api.py` | Claude API integration |
| `prompts.py` | Prompt builder |
| `requirements.txt` | Python dependencies |
| `.env.example` | API key template |

---

## Powered by GlobeBotter
Visit [globebotter.com](https://globebotter.com) for more AI bots.
