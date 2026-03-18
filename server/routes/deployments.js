/**
 * Deployment routes — all protected.
 * POST  /api/deployments
 * GET   /api/deployments
 * PATCH /api/deployments/:id/stop
 */
const express      = require('express');
const router       = express.Router();
const authenticate = require('../middleware/auth');
const { deploy, getDeployments, stopDeployment } = require('../controllers/deploymentController');

router.use(authenticate);

router.post('/',           deploy);
router.get('/',            getDeployments);
router.patch('/:id/stop',  stopDeployment);

module.exports = router;
