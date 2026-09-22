const express = require('express');
const Player = require('../models/Player');
const levels = require('../gameData/levels');
const { runCommand } = require('../engine/gameEngine');
const { pathToString } = require('../engine/vfs');

const router = express.Router();
const TOTAL_LEVELS = levels.length;

function serialize(player) {
  return {
    id: player._id,
    name: player.name,
    cwd: pathToString(player.cwd),
    score: player.score,
    levelsCompleted: player.completedLevels.length,
    totalLevels: TOTAL_LEVELS,
    unlockedCommands: player.unlockedCommands,
    startedAt: player.startedAt,
    completedAt: player.completedAt,
    isComplete: !!player.completedAt
  };
}

// POST /api/players  { name }  -> create a new player/session
router.post('/', async (req, res) => {
  try {
    const name = (req.body.name || '').trim();
    if (!name) return res.status(400).json({ error: 'A name is required.' });
    if (name.length > 40) return res.status(400).json({ error: 'Name is too long.' });

    const player = await Player.create({ name });
    res.status(201).json({ player: serialize(player) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not create player.' });
  }
});

// GET /api/players/:id -> current state
router.get('/:id', async (req, res) => {
  try {
    const player = await Player.findById(req.params.id);
    if (!player) return res.status(404).json({ error: 'Player not found.' });
    res.json({ player: serialize(player) });
  } catch (err) {
    res.status(404).json({ error: 'Player not found.' });
  }
});

// POST /api/players/:id/command  { input } -> execute one terminal command
router.post('/:id/command', async (req, res) => {
  try {
    const player = await Player.findById(req.params.id);
    if (!player) return res.status(404).json({ error: 'Player not found.' });

    const input = req.body.input;
    if (typeof input !== 'string') return res.status(400).json({ error: 'input must be a string.' });
    if (input.length > 300) return res.status(400).json({ error: 'Command too long.' });

    const { output, events } = runCommand(player, input);
    player.lastActiveAt = new Date();
    player.markModified('hintProgress');
    await player.save();

    res.json({ output, events, player: serialize(player) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Command failed to execute.' });
  }
});

module.exports = router;
