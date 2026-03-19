'use strict';
const { ZodError } = require('zod');

/**
 * validate(schema) — middleware factory for req.body validation
 */
const validate = (schema) => (req, res, next) => {
  try {
    req.body = schema.parse(req.body);
    next();
  } catch (err) {
    if (err instanceof ZodError) {
      const issues = err.issues || err.errors || [];
      return res.status(400).json({
        error: 'Validation failed',
        details: issues.map(e => ({ field: e.path.join('.'), message: e.message })),
      });
    }
    next(err);
  }
};

module.exports = validate;
