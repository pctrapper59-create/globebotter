/**
 * Bot controller — list, get, and create bots.
 * POST /api/bots is protected; creator_id is sourced from the JWT payload.
 */
const Bot = require('../models/Bot');

const VALID_CATEGORIES = ['trading', 'marketing', 'social_media', 'custom'];

const getBots = async (req, res) => {
  try {
    const { category, search } = req.query;
    const bots = await Bot.findAll({ category, search });
    res.json({ bots });
  } catch (err) {
    console.error('getBots error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

const getBot = async (req, res) => {
  try {
    const bot = await Bot.findById(req.params.id);
    if (!bot) return res.status(404).json({ error: 'Bot not found' });
    res.json({ bot });
  } catch (err) {
    console.error('getBot error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

const createBot = async (req, res) => {
  try {
    const { name, description, price, category } = req.body;

    if (!name || !description || price == null || !category) {
      return res.status(400).json({
        error: 'name, description, price, and category are required',
      });
    }

    if (typeof price !== 'number' || price < 0) {
      return res.status(400).json({ error: 'Price must be a positive number' });
    }

    const bot = await Bot.create({
      name,
      description,
      price,
      category,
      creator_id: req.user.userId, // set from JWT by auth middleware
    });

    res.status(201).json({ bot });
  } catch (err) {
    console.error('createBot error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { getBots, getBot, createBot };
