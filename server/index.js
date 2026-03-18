/**
 * Server entry point.
 * Loads env vars, then starts the Express listener.
 */
require('dotenv').config({ path: '../.env' });

const app = require('./app');

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`GlobeBotter API running on http://localhost:${PORT}`);
});
