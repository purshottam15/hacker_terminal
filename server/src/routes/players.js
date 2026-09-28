const express = require('express');

const router = express.Router();

router.use((req, res) => {
  res.status(410).json({
    error: 'The legacy player API has been removed. Use /api/auth and /api/game.'
  });
});

module.exports = router;
