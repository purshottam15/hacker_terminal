const filesystem = require('../gameData/filesystem');

/** A folder is enterable if it has no lock, or the player already has that key. */
function isAccessible(node, unlockedKeys) {
  if (!node) return false;
  if (!node.requiresKey) return true;
  return unlockedKeys.includes(node.requiresKey);
}

/** Walk cwd (array of segments) from root, returns the folder node or null. */
function getFolderAtPath(pathSegments, unlockedKeys) {
  let node = filesystem;
  if (!isAccessible(node, unlockedKeys)) return null;
  for (const segment of pathSegments) {
    if (!node.children) return null;
    const next = node.children.find((c) => c.type === 'folder' && c.name === segment);
    if (!next) return null;
    if (!isAccessible(next, unlockedKeys)) return null;
    node = next;
  }
  return node;
}

/** Resolve a user-typed path argument against the current cwd. Returns a new segment array (or null if malformed). */
function resolvePath(cwdSegments, target) {
  if (!target || target === '.') return [...cwdSegments];

  let segments = target.startsWith('/') ? [] : [...cwdSegments];
  const parts = target.split('/').filter((p) => p.length > 0);

  for (const part of parts) {
    if (part === '.') continue;
    if (part === '..') {
      if (segments.length > 0) segments.pop();
    } else {
      segments.push(part);
    }
  }
  return segments;
}

/** Find a named child (file or folder) inside a folder node, regardless of lock state (caller checks lock). */
function findChild(folderNode, name) {
  if (!folderNode || !folderNode.children) return null;
  return folderNode.children.find((c) => c.name === name) || null;
}

function pathToString(segments) {
  return '/' + segments.join('/');
}

module.exports = {
  filesystem,
  isAccessible,
  getFolderAtPath,
  resolvePath,
  findChild,
  pathToString
};
