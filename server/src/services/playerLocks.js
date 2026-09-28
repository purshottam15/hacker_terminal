const locks = new Map();

function withPlayerLock(playerId, task) {
  const key = String(playerId);
  const previous = locks.get(key) || Promise.resolve();
  const next = previous.catch(() => {}).then(task);
  locks.set(key, next.finally(() => {
    if (locks.get(key) === next) locks.delete(key);
  }));
  return next;
}

module.exports = { withPlayerLock };
