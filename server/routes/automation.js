const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const {
  generateFollowupSequence,
  generateEmailSequence,
  generateSocialPosts,
  generateProposal,
  generateContentCalendar,
  generateBio,
  generateFaq,
} = require('../controllers/automationController');

router.post('/followup-sequence',  authenticate, generateFollowupSequence);
router.post('/email-sequence',     authenticate, generateEmailSequence);
router.post('/social-posts',       authenticate, generateSocialPosts);
router.post('/proposal',           authenticate, generateProposal);
router.post('/content-calendar',   authenticate, generateContentCalendar);
router.post('/bio',                authenticate, generateBio);
router.post('/faq',                authenticate, generateFaq);

module.exports = router;
