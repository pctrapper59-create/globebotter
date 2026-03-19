'use strict';
const { z } = require('zod');

const VALID_CATEGORIES = ['trading', 'marketing', 'social_media', 'custom'];

const createBotSchema = z.object({
  name: z.string().min(1, 'Bot name is required').max(100),
  description: z.string().max(2000).optional(),
  category: z.enum(VALID_CATEGORIES, { errorMap: () => ({ message: `Category must be one of: ${VALID_CATEGORIES.join(', ')}` }) }),
  price: z.number().nonnegative('Price must be 0 or greater').max(10000),
  pricing_model: z.enum(['once', 'subscription', 'both']).optional().default('once'),
});

module.exports = { createBotSchema };
