const express = require('express');
const commandDefs = require('../gameData/commands');
const levels = require('../gameData/levels');

const router = express.Router();

// GET /api/meta - safe, non-spoiler info the client needs to render the sidebar.
// Never exposes keys, codes, or file contents.
router.get('/', (req, res) => {
  res.json({
    commands: commandDefs.map((c) => ({ name: c.name, description: c.description, locked: !!c.requiresKey })),
    totalLevels: levels.length
  });
});

module.exports = router;
