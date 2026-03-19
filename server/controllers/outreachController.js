/**
 * AI Outreach Message Controller
 * POST /api/outreach/generate
 *
 * Generates 3 personalized outreach messages for a business:
 *   1. Cold email
 *   2. Short DM
 *   3. Follow-up message
 *
 * AI chain: OpenAI → Anthropic → smart template fallback
 */

const SYSTEM_PROMPT = `You are an expert sales copywriter AI.
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
Always return clean, ready-to-send messages.`;

// ── Template fallback ────────────────────────────────────────────────────────
function templateMessages(businessName, businessType, offer, senderName) {
  const sender = senderName || 'a fellow entrepreneur';
  const biz    = businessName || 'your business';
  const type   = businessType || 'business';
  const offerLine = offer
    ? `I help ${type}s like yours with ${offer}.`
    : `I help ${type}s like yours get more customers and save time with AI automation.`;

  return {
    coldEmail: `Subject: Quick idea for ${biz}

Hi there,

I came across ${biz} and wanted to reach out. ${offerLine}

Most ${type}s I work with see results within the first two weeks — more leads, less manual work, and a noticeable bump in revenue.

Would you be open to a quick 15-minute call to see if it's a fit? No pressure at all.

Best,
${sender}`,

    dm: `Hey! I noticed ${biz} and thought you'd be a great fit for what I do. ${offerLine} Mind if I share a quick overview? Takes 2 minutes — could be worth it. 🚀`,

    followUp: `Hi again,

Just circling back on my last message about ${biz}. I know things get busy, so no worries if the timing wasn't right.

If you're still open to it, I'd love to show you how I've helped similar ${type}s grow — happy to make it quick and painless.

Worth a short chat? Just reply here and we'll set something up.

Best,
${sender}`,
  };
}

// ── OpenAI generation ────────────────────────────────────────────────────────
async function generateWithOpenAI(businessName, businessType, offer, senderName) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('No OpenAI key');

  const userPrompt = `Generate 3 outreach messages for this business:
Business name: ${businessName}
Business type: ${businessType}
What I'm offering: ${offer || 'AI automation tools to get more customers and save time'}
Sender name: ${senderName || 'the sender'}

Return ONLY valid JSON in this exact format:
{
  "coldEmail": "...",
  "dm": "...",
  "followUp": "..."
}`;

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user',   content: userPrompt },
      ],
      temperature: 0.8,
      max_tokens: 800,
    }),
  });

  if (!res.ok) throw new Error(`OpenAI ${res.status}`);
  const data = await res.json();
  const text = data.choices[0].message.content.trim();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No JSON in OpenAI response');
  return JSON.parse(jsonMatch[0]);
}

// ── Anthropic generation ─────────────────────────────────────────────────────
async function generateWithAnthropic(businessName, businessType, offer, senderName) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('No Anthropic key');

  const userPrompt = `Generate 3 outreach messages for this business:
Business name: ${businessName}
Business type: ${businessType}
What I'm offering: ${offer || 'AI automation tools to get more customers and save time'}
Sender name: ${senderName || 'the sender'}

Return ONLY valid JSON:
{
  "coldEmail": "...",
  "dm": "...",
  "followUp": "..."
}`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-20240307',
      max_tokens: 800,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!res.ok) throw new Error(`Anthropic ${res.status}`);
  const data = await res.json();
  const text = data.content[0].text.trim();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No JSON in Anthropic response');
  return JSON.parse(jsonMatch[0]);
}

// ── Main handler ─────────────────────────────────────────────────────────────
const generateOutreach = async (req, res) => {
  try {
    const { businessName, businessType, offer, senderName } = req.body;

    if (!businessName || !businessType) {
      return res.status(400).json({ error: 'businessName and businessType are required' });
    }

    let messages;
    let provider = 'template';

    try {
      messages = await generateWithOpenAI(businessName, businessType, offer, senderName);
      provider = 'openai';
    } catch (e1) {
      try {
        messages = await generateWithAnthropic(businessName, businessType, offer, senderName);
        provider = 'anthropic';
      } catch (e2) {
        messages = templateMessages(businessName, businessType, offer, senderName);
        provider = 'template';
      }
    }

    // Validate response shape
    if (!messages.coldEmail || !messages.dm || !messages.followUp) {
      messages = templateMessages(businessName, businessType, offer, senderName);
      provider = 'template';
    }

    res.json({ messages, provider });
  } catch (err) {
    console.error('generateOutreach error:', err);
    res.status(500).json({ error: 'Server error generating messages' });
  }
};

module.exports = { generateOutreach };
