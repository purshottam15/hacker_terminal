const EventState = require('../models/EventState');

async function getEventState() {
  return EventState.findByIdAndUpdate(
    'event',
    { $setOnInsert: { state: 'NOT_STARTED', totalPausedMs: 0 } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

module.exports = { getEventState };
