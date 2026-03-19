'use strict';
const { z } = require('zod');

const leadSearchSchema = z.object({
  businessType: z.string().min(1, 'Business type is required').max(100),
  location: z.string().min(1, 'Location is required').max(200),
  offer: z.string().max(500).optional(),
  limit: z.coerce.number().int().min(1).max(20).optional().default(10),
});

module.exports = { leadSearchSchema };
