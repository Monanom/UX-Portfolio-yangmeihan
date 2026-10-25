const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const originalWriteFileSync = fs.writeFileSync;
const unrelatedRuleFiles = new Set([
  path.join(os.homedir(), '.workbuddy', 'MEMORY.md'),
  path.join(os.homedir(), '.workbuddy', 'USER.md'),
]);

fs.writeFileSync = function guardedWriteFileSync(target, ...args) {
  if (typeof target === 'string' && unrelatedRuleFiles.has(path.resolve(target))) {
    throw Object.assign(new Error('Unrelated assistant-rule write blocked'), { code: 'EPERM' });
  }
  return originalWriteFileSync.call(this, target, ...args);
};
