/**
 * Lead Controller — AI Lead Generator Bot
 *
 * 1. Searches Google Places API for local businesses
 * 2. Fetches contact details per business
 * 3. Generates personalized AI outreach messages
 *    → Uses OpenAI if OPENAI_API_KEY is set
 *    → Uses Anthropic if ANTHROPIC_API_KEY is set
 *    → Falls back to high-quality smart templates (always works)
 */

const PLACES_BASE = 'https://maps.googleapis.com/maps/api/place';

/* ─────────────────── Message Generation ─────────────────── */

/**
 * Smart template messages — multiple patterns for natural variety.
 * Deterministic per business name so results are consistent.
 */
function templateMessage(businessName, businessType, location, offer) {
  const cleanName = businessName.replace(/^(the\s+)/i, '').trim();
  const svc = offer || 'help you get more clients';

  const templates = [
    `Hey ${cleanName}! I came across your ${businessType} in ${location} and wanted to reach out — I specialize in ${svc} for businesses like yours and have helped similar companies see real results. Would you be open to a quick 15-min call?`,
    `Hi ${cleanName}, I was searching for top ${businessType} businesses in ${location} and your name stood out. I help companies like yours with ${svc} — would love to share what's been working. Interested?`,
    `${cleanName} — I work with ${businessType} businesses in ${location} and my ${svc} has been a game-changer for similar companies. No commitment, just a quick chat to see if it's a fit. Worth it?`,
    `Hey ${cleanName}! I noticed your ${businessType} in ${location} and thought you'd be a perfect fit for my ${svc}. I've helped businesses just like yours grow significantly — can I send you a quick overview?`,
    `Hi there at ${cleanName} — reaching out because I specifically help ${businessType} businesses in ${location} with ${svc}. Curious if you've ever looked into this? I'd love to connect for 10 minutes.`,
  ];

  const hash = businessName.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return templates[hash % templates.length];
}

async function generateMessage(businessName, businessType, location, offer) {
  const prompt = `Write a short, natural-sounding cold outreach message (2-3 sentences max) to "${businessName}", a ${businessType} business in ${location}. The sender offers: ${offer || 'services to help their business grow'}. Be specific to their business type, sound human not salesy, and end with a soft call to action.`;

  // Try OpenAI
  const oaKey = process.env.OPENAI_API_KEY;
  if (oaKey && !oaKey.startsWith('sk-...') && oaKey.length > 20) {
    try {
      const r = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${oaKey}` },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          max_tokens: 150,
          temperature: 0.8,
          messages: [
            { role: 'system', content: 'You write punchy, personalized cold outreach messages for local businesses. Keep it under 3 sentences.' },
            { role: 'user', content: prompt },
          ],
        }),
      });
      if (r.ok) {
        const d = await r.json();
        const msg = d.choices?.[0]?.message?.content?.trim();
        if (msg) return msg;
      }
    } catch { /* fall through */ }
  }

  // Try Anthropic
  const antKey = process.env.ANTHROPIC_API_KEY;
  if (antKey && !antKey.startsWith('sk-ant-...') && antKey.length > 20) {
    try {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': antKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-haiku-20240307',
          max_tokens: 150,
          messages: [{ role: 'user', content: prompt }],
        }),
      });
      if (r.ok) {
        const d = await r.json();
        const msg = d.content?.[0]?.text?.trim();
        if (msg) return msg;
      }
    } catch { /* fall through */ }
  }

  // Smart template fallback
  return templateMessage(businessName, businessType, location, offer);
}

/* ─────────────────── Google Places Helpers ─────────────────── */

async function fetchPlaceDetails(placeId, apiKey) {
  const url = `${PLACES_BASE}/details/json?place_id=${encodeURIComponent(placeId)}&fields=name,website,formatted_phone_number,formatted_address&key=${apiKey}`;
  const r = await fetch(url);
  const d = await r.json();
  return d.result || {};
}

/* ─────────────────── Main Route Handler ─────────────────── */

/**
 * POST /api/leads/search
 * Body: { businessType, location, offer, limit }
 */
async function searchLeads(req, res) {
  const {
    businessType = '',
    location     = '',
    offer        = '',
    limit        = 10,
  } = req.body;

  if (!businessType.trim() || !location.trim()) {
    return res.status(400).json({ error: 'Business type and location are required.' });
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: 'GOOGLE_PLACES_API_KEY is not configured. Add it to your environment variables.',
    });
  }

  try {
    // 1. Text search
    const query      = encodeURIComponent(`${businessType.trim()} in ${location.trim()}`);
    const searchUrl  = `${PLACES_BASE}/textsearch/json?query=${query}&key=${apiKey}`;
    const searchRes  = await fetch(searchUrl);
    const searchData = await searchRes.json();

    if (searchData.status !== 'OK' && searchData.status !== 'ZERO_RESULTS') {
      return res.status(502).json({ error: `Google Places returned: ${searchData.status}` });
    }

    const places = (searchData.results || []).slice(0, Math.min(Number(limit), 20));

    // 2. Enrich + generate messages
    const seen  = new Set();
    const leads = [];

    for (const place of places) {
      if (seen.has(place.name)) continue;
      seen.add(place.name);

      try {
        const details = await fetchPlaceDetails(place.place_id, apiKey);
        const message = await generateMessage(place.name, businessType.trim(), location.trim(), offer.trim());

        leads.push({
          name:    place.name,
          address: details.formatted_address || place.formatted_address || '',
          website: details.website || '',
          phone:   details.formatted_phone_number || '',
          message,
        });
      } catch {
        // Skip leads that fail enrichment — don't crash the whole request
      }
    }

    return res.json({ leads, total: leads.length });

  } catch (err) {
    console.error('[leadController] searchLeads error:', err);
    return res.status(500).json({ error: 'Failed to fetch leads. Please try again.' });
  }
}

module.exports = { searchLeads };
