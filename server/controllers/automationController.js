/**
 * AI Automation Suite Controller
 * 7 tools: followup sequence, email sequence, social posts, proposal,
 *          content calendar, bio, FAQ
 *
 * AI chain: OpenAI gpt-3.5-turbo → Anthropic claude-3-haiku-20240307 → template fallback
 */

// ── Shared AI helpers ─────────────────────────────────────────────────────────

async function callOpenAI(systemPrompt, userPrompt, maxTokens = 1200) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('No OpenAI key');

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userPrompt },
      ],
      temperature: 0.8,
      max_tokens: maxTokens,
    }),
  });

  if (!res.ok) throw new Error(`OpenAI ${res.status}`);
  const data = await res.json();
  const text = data.choices[0].message.content.trim();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No JSON in OpenAI response');
  return JSON.parse(jsonMatch[0]);
}

async function callAnthropic(systemPrompt, userPrompt, maxTokens = 1200) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('No Anthropic key');

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-3-haiku-20240307',
      max_tokens: maxTokens,
      system: systemPrompt,
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

// ── Tool 1: Follow-up Sequence ────────────────────────────────────────────────

const FOLLOWUP_SYSTEM = `You are an expert sales follow-up specialist. Generate a 3-message follow-up sequence for a cold outreach prospect. Each message should be different in approach: msg1 is a gentle check-in (2-3 sentences), msg2 adds value with a specific insight (3-4 sentences), msg3 is a final breakup email (2-3 sentences). Return JSON: {"msg1": "...", "msg2": "...", "msg3": "..."}`;

function followupTemplate(businessName) {
  const biz = businessName || 'your business';
  return {
    msg1: `Hi there, just checking in to see if you had a chance to look at my previous message about ${biz}. I know things get busy — no pressure at all. Would love to connect when the time is right.`,
    msg2: `I wanted to share a quick insight that might be relevant to ${biz}: businesses in your space that adopt AI automation typically reduce manual tasks by 40% within the first month. That translates directly to time saved and revenue recovered. I've seen it work across dozens of similar companies, and I think you'd see similar results. Would a 15-minute call be worth exploring?`,
    msg3: `I'll keep this short — I've reached out a few times and haven't heard back, so I'll assume the timing isn't right for ${biz}. No hard feelings at all. If things change down the road, feel free to reach out — I'd still love to help. Wishing you all the best!`,
  };
}

const generateFollowupSequence = async (req, res) => {
  try {
    const { businessName, businessType, previousMessage, senderName } = req.body;

    if (!businessName || !businessType) {
      return res.status(400).json({ error: 'businessName and businessType are required' });
    }

    const userPrompt = `Generate a 3-message follow-up sequence for:
Business name: ${businessName}
Business type: ${businessType}
Previous message sent: ${previousMessage || 'Initial cold outreach about AI automation tools'}
Sender name: ${senderName || 'the sender'}

Return ONLY valid JSON: {"msg1": "...", "msg2": "...", "msg3": "..."}`;

    let sequence;
    let provider = 'template';

    try {
      sequence = await callOpenAI(FOLLOWUP_SYSTEM, userPrompt, 600);
      provider = 'openai';
    } catch (e1) {
      try {
        sequence = await callAnthropic(FOLLOWUP_SYSTEM, userPrompt, 600);
        provider = 'anthropic';
      } catch (e2) {
        sequence = followupTemplate(businessName);
        provider = 'template';
      }
    }

    if (!sequence.msg1 || !sequence.msg2 || !sequence.msg3) {
      sequence = followupTemplate(businessName);
      provider = 'template';
    }

    res.json({ sequence, provider });
  } catch (err) {
    console.error('generateFollowupSequence error:', err);
    res.status(500).json({ error: 'Server error generating follow-up sequence' });
  }
};

// ── Tool 2: Email Sequence ────────────────────────────────────────────────────

const EMAIL_SEQUENCE_SYSTEM = `You are an email marketing expert. Create a 5-email drip sequence for a cold prospect. Email 1: Value intro (no pitch). Email 2: Pain point education. Email 3: Case study/social proof. Email 4: Direct offer. Email 5: Final follow-up. Each email should have a subject line and body. Return JSON: {"email1": {"subject": "...", "body": "..."}, "email2": {...}, "email3": {...}, "email4": {...}, "email5": {...}}`;

function emailSequenceTemplate(businessName, businessType, offer, senderName) {
  const biz = businessName || 'your business';
  const type = businessType || 'business';
  const offerText = offer || 'AI automation tools';
  const sender = senderName || 'the team';

  return {
    email1: {
      subject: `A quick tip for ${biz}`,
      body: `Hi there,\n\nI wanted to share something valuable with ${biz} — no pitch, just a helpful insight.\n\nMost ${type}s are leaving significant time and revenue on the table by handling repetitive tasks manually. Automation can change that dramatically.\n\nHope this is useful!\n\nBest,\n${sender}`,
    },
    email2: {
      subject: `The #1 challenge for ${type}s right now`,
      body: `Hi,\n\nThe biggest pain point I hear from ${type} owners like you? Time. Specifically, the time lost to manual follow-ups, lead tracking, and content creation.\n\nThese tasks feel necessary but they pull you away from the work that actually grows your business.\n\nSound familiar?\n\nBest,\n${sender}`,
    },
    email3: {
      subject: `How a ${type} like ${biz} saved 10 hours a week`,
      body: `Hi,\n\nI recently worked with a ${type} similar to ${biz}. Before working together, they were spending 10+ hours a week on manual outreach and content tasks.\n\nAfter implementing ${offerText}, they cut that to under 2 hours — and saw a 30% increase in leads.\n\nResults like this are more common than you'd think.\n\nBest,\n${sender}`,
    },
    email4: {
      subject: `Ready to help ${biz} grow?`,
      body: `Hi,\n\nI've shared a few insights over the past few emails, and I'd love to put them to work for ${biz}.\n\nHere's what I'm offering: ${offerText} — designed specifically for ${type}s like yours.\n\nI'd love to hop on a quick 15-minute call to see if it's a fit. Would any time this week work for you?\n\nBest,\n${sender}`,
    },
    email5: {
      subject: `Last note for ${biz}`,
      body: `Hi,\n\nThis will be my last email — I don't want to clutter your inbox.\n\nIf the timing ever feels right to explore ${offerText} for ${biz}, just reply here and I'll be happy to chat.\n\nWishing you continued success!\n\nBest,\n${sender}`,
    },
  };
}

const generateEmailSequence = async (req, res) => {
  try {
    const { businessName, businessType, offer, senderName } = req.body;

    if (!businessName || !businessType) {
      return res.status(400).json({ error: 'businessName and businessType are required' });
    }

    const userPrompt = `Create a 5-email drip sequence for:
Business name: ${businessName}
Business type: ${businessType}
Offer: ${offer || 'AI automation tools to save time and grow faster'}
Sender name: ${senderName || 'the sender'}

Return ONLY valid JSON: {"email1": {"subject": "...", "body": "..."}, "email2": {...}, "email3": {...}, "email4": {...}, "email5": {...}}`;

    let sequence;
    let provider = 'template';

    try {
      sequence = await callOpenAI(EMAIL_SEQUENCE_SYSTEM, userPrompt, 1500);
      provider = 'openai';
    } catch (e1) {
      try {
        sequence = await callAnthropic(EMAIL_SEQUENCE_SYSTEM, userPrompt, 1500);
        provider = 'anthropic';
      } catch (e2) {
        sequence = emailSequenceTemplate(businessName, businessType, offer, senderName);
        provider = 'template';
      }
    }

    if (!sequence.email1 || !sequence.email5) {
      sequence = emailSequenceTemplate(businessName, businessType, offer, senderName);
      provider = 'template';
    }

    res.json({ sequence, provider });
  } catch (err) {
    console.error('generateEmailSequence error:', err);
    res.status(500).json({ error: 'Server error generating email sequence' });
  }
};

// ── Tool 3: Social Posts ──────────────────────────────────────────────────────

const SOCIAL_POSTS_SYSTEM = `You are a social media expert. Generate 12 posts for a business: 6 Instagram posts (casual, with emojis, 150-200 chars each), 3 LinkedIn posts (professional, 200-300 chars each), 3 Twitter/X posts (punchy, under 280 chars each). Return JSON: {"instagram": ["...", ...], "linkedin": ["...", ...], "twitter": ["...", ...]}`;

function socialPostsTemplate(businessName, businessType, tone) {
  const biz = businessName || 'our business';
  const type = businessType || 'business';

  return {
    instagram: [
      `✨ Running a ${type} is hard work — we get it! That's why we're here to make things easier for ${biz}. Drop a comment if you'd like to learn more! 👇`,
      `🚀 Big things happening at ${biz}! We're on a mission to help ${type}s like yours save time and grow faster. Follow along for tips and updates! 💪`,
      `💡 Did you know most ${type}s waste hours each week on tasks that could be automated? At ${biz}, we're changing that. DM us to find out how! 📩`,
      `🙌 Shoutout to all the hard-working ${type} owners out there! You're building something amazing. ${biz} is here to support your journey. Tag a fellow entrepreneur! 🏆`,
      `⏰ Time is your most valuable asset. ${biz} helps ${type}s reclaim hours every week. Ready to work smarter, not harder? Link in bio! 🔗`,
      `🌟 Success doesn't happen overnight, but the right tools make the journey faster. ${biz} is here to help your ${type} thrive. Learn more in our bio! 🎯`,
    ],
    linkedin: [
      `Running a successful ${type} requires more than hard work — it requires smart systems. At ${biz}, we've seen firsthand how the right automation tools can transform operations, reduce costs, and free up time for what truly matters: growing your business. If you're a ${type} owner looking to scale efficiently, let's connect.`,
      `The ${type} landscape is changing rapidly. Businesses that adapt early to AI-powered tools are seeing significant competitive advantages — from faster lead response times to more consistent customer communication. ${biz} is at the forefront of this shift. I'd love to share what we're seeing in the market.`,
      `Lessons from working with dozens of ${type}s: the ones that grow fastest aren't necessarily the ones working the hardest — they're the ones working the smartest. Automation, systemization, and clear processes are the common threads. What's working for your ${type} right now? Share in the comments.`,
    ],
    twitter: [
      `Most ${type} owners spend 40% of their day on tasks that could be automated. ${biz} is changing that. What would you do with 10 extra hours a week? 🤔 #${type.replace(/\s+/g, '')} #Automation`,
      `Hot take: the best investment a ${type} can make isn't more ads — it's better systems. ${biz} helps you build them. #SmallBusiness #GrowthHacks`,
      `If your ${type} runs on manual processes, you're leaving money on the table. ${biz} makes automation simple, affordable, and fast. DM to learn more. 🚀`,
    ],
  };
}

const generateSocialPosts = async (req, res) => {
  try {
    const { businessName, businessType, tone = 'professional' } = req.body;

    if (!businessName || !businessType) {
      return res.status(400).json({ error: 'businessName and businessType are required' });
    }

    const userPrompt = `Generate 12 social media posts for:
Business name: ${businessName}
Business type: ${businessType}
Tone: ${tone}

Return ONLY valid JSON: {"instagram": ["...", "...", "...", "...", "...", "..."], "linkedin": ["...", "...", "..."], "twitter": ["...", "...", "..."]}`;

    let posts;
    let provider = 'template';

    try {
      posts = await callOpenAI(SOCIAL_POSTS_SYSTEM, userPrompt, 1500);
      provider = 'openai';
    } catch (e1) {
      try {
        posts = await callAnthropic(SOCIAL_POSTS_SYSTEM, userPrompt, 1500);
        provider = 'anthropic';
      } catch (e2) {
        posts = socialPostsTemplate(businessName, businessType, tone);
        provider = 'template';
      }
    }

    if (!posts.instagram || !posts.linkedin || !posts.twitter) {
      posts = socialPostsTemplate(businessName, businessType, tone);
      provider = 'template';
    }

    res.json({ posts, provider });
  } catch (err) {
    console.error('generateSocialPosts error:', err);
    res.status(500).json({ error: 'Server error generating social posts' });
  }
};

// ── Tool 4: Proposal ──────────────────────────────────────────────────────────

const PROPOSAL_SYSTEM = `You are a professional proposal writer. Write a concise business proposal (400-600 words) including: Executive Summary, The Problem, Our Solution, What's Included, Investment, Next Steps. Use professional but accessible language.`;

function proposalTemplate(businessName, businessType, offer, senderName, price) {
  const biz = businessName || 'Your Business';
  const type = businessType || 'business';
  const offerText = offer || 'AI automation services';
  const sender = senderName || 'Our Team';
  const investment = price ? `$${price}` : 'competitive pricing tailored to your needs';

  return `BUSINESS PROPOSAL
Prepared for: ${biz}
Prepared by: ${sender}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

EXECUTIVE SUMMARY

We are pleased to present this proposal for ${biz}. This document outlines how ${offerText} can help your ${type} save time, increase efficiency, and drive measurable growth.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

THE PROBLEM

Many ${type}s struggle with time-consuming manual processes — from outreach and follow-ups to content creation and customer communication. These tasks are essential but pull focus away from core business activities. The result: slower growth, missed opportunities, and team burnout.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

OUR SOLUTION

We offer ${offerText} specifically designed for ${type}s like ${biz}. Our approach combines cutting-edge AI technology with proven business strategies to automate repetitive tasks, personalize customer interactions at scale, and free your team to focus on high-value work.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

WHAT'S INCLUDED

• Automated outreach and follow-up sequences
• AI-powered content creation for social media and email
• Custom proposal and document generation
• 30-day content calendar planning
• Full onboarding and setup support
• Ongoing priority support

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

INVESTMENT

${investment}

We believe in delivering measurable ROI. Most clients recover their investment within the first 30 days through time savings and increased conversions.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

NEXT STEPS

1. Review this proposal and note any questions
2. Schedule a 30-minute discovery call with our team
3. We'll customize the solution for ${biz}'s specific needs
4. Kick off onboarding within 48 hours of agreement

We're excited about the possibility of partnering with ${biz} and are confident we can deliver exceptional results. Please don't hesitate to reach out with any questions.

Best regards,
${sender}`;
}

const generateProposal = async (req, res) => {
  try {
    const { businessName, businessType, offer, senderName, price } = req.body;

    if (!businessName || !businessType) {
      return res.status(400).json({ error: 'businessName and businessType are required' });
    }
    if (!offer) {
      return res.status(400).json({ error: 'offer is required' });
    }

    const userPrompt = `Write a business proposal for:
Client business name: ${businessName}
Client business type: ${businessType}
What we are offering: ${offer}
Sender/company name: ${senderName || 'Our Company'}
Price/investment: ${price ? `$${price}` : 'to be discussed'}

Return ONLY valid JSON: {"proposal": "the full proposal text here"}`;

    let result;
    let provider = 'template';

    try {
      result = await callOpenAI(PROPOSAL_SYSTEM, userPrompt, 1000);
      provider = 'openai';
    } catch (e1) {
      try {
        result = await callAnthropic(PROPOSAL_SYSTEM, userPrompt, 1000);
        provider = 'anthropic';
      } catch (e2) {
        result = { proposal: proposalTemplate(businessName, businessType, offer, senderName, price) };
        provider = 'template';
      }
    }

    if (!result.proposal) {
      result = { proposal: proposalTemplate(businessName, businessType, offer, senderName, price) };
      provider = 'template';
    }

    res.json({ proposal: result.proposal, provider });
  } catch (err) {
    console.error('generateProposal error:', err);
    res.status(500).json({ error: 'Server error generating proposal' });
  }
};

// ── Tool 5: Content Calendar ──────────────────────────────────────────────────

const CONTENT_CALENDAR_SYSTEM = `You are a content strategist. Create a 30-day content calendar for a business. For each day provide: day number (1-30), platform, content type (Post/Reel/Story/Article), and topic. Return JSON: {"calendar": [{"day": 1, "platform": "Instagram", "type": "Post", "topic": "..."}, ...]}`;

function contentCalendarTemplate(businessName, businessType, platforms) {
  const biz = businessName || 'the business';
  const type = businessType || 'business';
  const platformList = platforms ? platforms.split(',').map(p => p.trim()) : ['Instagram', 'LinkedIn'];

  const contentTypes = ['Post', 'Reel', 'Story', 'Article'];
  const topics = [
    `Introducing ${biz} — who we are and what we do`,
    `Top 3 challenges facing ${type}s today`,
    `How we help ${type}s save time with automation`,
    `Client success story: before and after`,
    `Behind the scenes at ${biz}`,
    `5 tips for growing your ${type} in 2025`,
    `Why most ${type}s struggle with consistency`,
    `The #1 mistake ${type} owners make`,
    `How to generate more leads without spending more on ads`,
    `Q&A: your top questions answered`,
    `Feature spotlight: automated follow-up sequences`,
    `Team introduction at ${biz}`,
    `Industry trends every ${type} owner should know`,
    `Case study: how we helped a ${type} double their leads`,
    `Myth vs. reality: AI automation for ${type}s`,
    `How to write a follow-up email that gets replies`,
    `Social proof: testimonials from happy clients`,
    `Free resource: content calendar template for ${type}s`,
    `The power of email drip campaigns`,
    `How ${biz} is different from the competition`,
    `Step-by-step: setting up your first automation`,
    `What to post on social media when you're out of ideas`,
    `ROI of AI automation for small ${type}s`,
    `Weekend motivation for ${type} owners`,
    `Announcement: new feature or offering from ${biz}`,
    `Educational post: how algorithms work for ${type}s`,
    `Poll: what's your biggest challenge right now?`,
    `Partner spotlight or collaboration announcement`,
    `Monthly recap and wins`,
    `Sneak peek: what's coming next from ${biz}`,
  ];

  return topics.map((topic, i) => ({
    day: i + 1,
    platform: platformList[i % platformList.length],
    type: contentTypes[i % contentTypes.length],
    topic,
  }));
}

const generateContentCalendar = async (req, res) => {
  try {
    const { businessName, businessType, platforms = 'Instagram, LinkedIn' } = req.body;

    if (!businessName || !businessType) {
      return res.status(400).json({ error: 'businessName and businessType are required' });
    }

    const userPrompt = `Create a 30-day content calendar for:
Business name: ${businessName}
Business type: ${businessType}
Platforms: ${platforms}

Return ONLY valid JSON: {"calendar": [{"day": 1, "platform": "...", "type": "...", "topic": "..."}, ... up to day 30]}`;

    let result;
    let provider = 'template';

    try {
      result = await callOpenAI(CONTENT_CALENDAR_SYSTEM, userPrompt, 2000);
      provider = 'openai';
    } catch (e1) {
      try {
        result = await callAnthropic(CONTENT_CALENDAR_SYSTEM, userPrompt, 2000);
        provider = 'anthropic';
      } catch (e2) {
        result = { calendar: contentCalendarTemplate(businessName, businessType, platforms) };
        provider = 'template';
      }
    }

    if (!result.calendar || !Array.isArray(result.calendar)) {
      result = { calendar: contentCalendarTemplate(businessName, businessType, platforms) };
      provider = 'template';
    }

    res.json({ calendar: result.calendar, provider });
  } catch (err) {
    console.error('generateContentCalendar error:', err);
    res.status(500).json({ error: 'Server error generating content calendar' });
  }
};

// ── Tool 6: Bio ───────────────────────────────────────────────────────────────

const BIO_SYSTEM = `You are a copywriter specializing in business bios. Write 3 versions of an About Us / Business Bio: short (50 words), medium (100 words), long (200 words). Professional, warm, benefit-focused. Return JSON: {"short": "...", "medium": "...", "long": "..."}`;

function bioTemplate(businessName, businessType, offer, location) {
  const biz = businessName || 'Our Business';
  const type = businessType || 'business';
  const offerText = offer || 'innovative solutions';
  const loc = location ? ` Based in ${location}.` : '';

  return {
    short: `${biz} is a ${type} dedicated to helping clients achieve more through ${offerText}.${loc} We combine expertise, technology, and a passion for results to deliver real value for every client we serve.`,
    medium: `${biz} is a forward-thinking ${type} specializing in ${offerText}.${loc} We work closely with our clients to understand their unique challenges and deliver tailored solutions that drive measurable results. Our team brings deep industry expertise and a commitment to excellence to every engagement. Whether you're looking to grow faster, work smarter, or reach new customers, ${biz} has the tools and experience to help you get there. We're proud of the results we've achieved — and we're just getting started.`,
    long: `${biz} is a results-driven ${type} built on a simple belief: every business deserves access to the tools and strategies that drive real growth.${loc}\n\nWe specialize in ${offerText}, combining cutting-edge technology with proven business principles to help our clients save time, increase revenue, and build sustainable competitive advantages. Our approach is collaborative, transparent, and always focused on delivering measurable outcomes.\n\nSince our founding, we've had the privilege of working with a wide range of clients — from ambitious startups to established enterprises. Across industries, the story is the same: when the right systems are in place, businesses grow faster and owners reclaim their time.\n\nAt ${biz}, we don't just deliver a product — we become partners in your success. Our team is passionate, experienced, and genuinely invested in helping you reach your goals. We're here for the long haul, and we can't wait to show you what's possible.\n\nReady to take the next step? Let's talk.`,
  };
}

const generateBio = async (req, res) => {
  try {
    const { businessName, businessType, offer, location } = req.body;

    if (!businessName || !businessType) {
      return res.status(400).json({ error: 'businessName and businessType are required' });
    }

    const userPrompt = `Write 3 business bio versions for:
Business name: ${businessName}
Business type: ${businessType}
What they offer: ${offer || 'products and services for their target market'}
Location: ${location || 'not specified'}

Return ONLY valid JSON: {"short": "...", "medium": "...", "long": "..."}`;

    let bios;
    let provider = 'template';

    try {
      bios = await callOpenAI(BIO_SYSTEM, userPrompt, 800);
      provider = 'openai';
    } catch (e1) {
      try {
        bios = await callAnthropic(BIO_SYSTEM, userPrompt, 800);
        provider = 'anthropic';
      } catch (e2) {
        bios = bioTemplate(businessName, businessType, offer, location);
        provider = 'template';
      }
    }

    if (!bios.short || !bios.medium || !bios.long) {
      bios = bioTemplate(businessName, businessType, offer, location);
      provider = 'template';
    }

    res.json({ bios, provider });
  } catch (err) {
    console.error('generateBio error:', err);
    res.status(500).json({ error: 'Server error generating bio' });
  }
};

// ── Tool 7: FAQ ───────────────────────────────────────────────────────────────

const FAQ_SYSTEM = `You are a customer success expert. Generate 10 FAQ pairs for a business website. Questions should address: pricing, process, timeline, results, guarantees, comparisons, getting started. Return JSON: {"faq": [{"q": "...", "a": "..."}, ...]}`;

function faqTemplate(businessName, businessType, offer) {
  const biz = businessName || 'our business';
  const type = businessType || 'business';
  const offerText = offer || 'our services';

  return [
    {
      q: `How much does ${offerText} cost?`,
      a: `Our pricing is designed to be accessible for ${type}s of all sizes. We offer flexible plans to fit different budgets and needs. Contact us for a custom quote tailored specifically to ${biz}.`,
    },
    {
      q: `How does the process work?`,
      a: `Getting started is simple: we begin with a discovery call to understand your goals, then we set up and customize the solution for ${biz}, and provide full onboarding support. You'll be up and running quickly.`,
    },
    {
      q: `How long does it take to see results?`,
      a: `Most clients start seeing results within the first 2-4 weeks. Significant ROI is typically visible within 60-90 days, though many clients report time savings from day one.`,
    },
    {
      q: `Do you offer a guarantee?`,
      a: `Yes — we stand behind our work. If you're not satisfied with the results after following our recommended approach, we'll work with you until you are or provide a full refund within 30 days.`,
    },
    {
      q: `How is ${biz} different from competitors?`,
      a: `We combine AI-powered tools with hands-on support, so you're never left figuring things out alone. Our solutions are tailored specifically for ${type}s, not generic one-size-fits-all software.`,
    },
    {
      q: `Do I need any technical experience to use ${offerText}?`,
      a: `Not at all! Our platform is designed to be intuitive and user-friendly. We also provide full onboarding, video tutorials, and ongoing support to ensure you're confident using every feature.`,
    },
    {
      q: `Can I cancel at any time?`,
      a: `Yes, there are no long-term contracts required. You can cancel your subscription at any time, though we're confident you won't want to once you see the results.`,
    },
    {
      q: `What kind of support do you provide?`,
      a: `We offer email support, a help center with tutorials, and regular check-ins for active clients. Premium plans include priority support with faster response times.`,
    },
    {
      q: `How do I get started with ${biz}?`,
      a: `Getting started is easy! Simply reach out through our website, schedule a free discovery call, and we'll walk you through everything. Most clients are onboarded within 48 hours.`,
    },
    {
      q: `Is my data secure?`,
      a: `Absolutely. We take data privacy and security seriously. All data is encrypted in transit and at rest, and we comply with industry-standard security practices to keep your information safe.`,
    },
  ];
}

const generateFaq = async (req, res) => {
  try {
    const { businessName, businessType, offer } = req.body;

    if (!businessName || !businessType) {
      return res.status(400).json({ error: 'businessName and businessType are required' });
    }

    const userPrompt = `Generate 10 FAQ pairs for:
Business name: ${businessName}
Business type: ${businessType}
What they offer: ${offer || 'products and services for their target market'}

Return ONLY valid JSON: {"faq": [{"q": "...", "a": "..."}, ... 10 pairs total]}`;

    let result;
    let provider = 'template';

    try {
      result = await callOpenAI(FAQ_SYSTEM, userPrompt, 1200);
      provider = 'openai';
    } catch (e1) {
      try {
        result = await callAnthropic(FAQ_SYSTEM, userPrompt, 1200);
        provider = 'anthropic';
      } catch (e2) {
        result = { faq: faqTemplate(businessName, businessType, offer) };
        provider = 'template';
      }
    }

    if (!result.faq || !Array.isArray(result.faq)) {
      result = { faq: faqTemplate(businessName, businessType, offer) };
      provider = 'template';
    }

    res.json({ faq: result.faq, provider });
  } catch (err) {
    console.error('generateFaq error:', err);
    res.status(500).json({ error: 'Server error generating FAQ' });
  }
};

// ── Exports ───────────────────────────────────────────────────────────────────

module.exports = {
  generateFollowupSequence,
  generateEmailSequence,
  generateSocialPosts,
  generateProposal,
  generateContentCalendar,
  generateBio,
  generateFaq,
};
