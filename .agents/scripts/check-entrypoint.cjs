const fs = require('fs');
const path = require('path');

const serverFile = path.join(__dirname, '..', '..', 'server.ts');

if (!fs.existsSync(serverFile)) {
  console.error(`[check-entrypoint] Error: server.ts not found at ${serverFile}`);
  process.exit(1);
}

const content = fs.readFileSync(serverFile, 'utf8');
const lines = content.split('\n');

const exportLines = [];
lines.forEach((line, index) => {
  const trimmed = line.trim();
  if (trimmed.startsWith('export ') || trimmed.startsWith('export{')) {
    exportLines.push({ lineNum: index + 1, text: trimmed });
  }
});

if (exportLines.length > 0) {
  console.error('\x1b[31m[check-entrypoint] CRITICAL ERROR: server.ts must NEVER contain export statements!\x1b[0m');
  console.error('In Bun v1.4+, exports (especially "export const app") trigger automatic Bun.serve() which crashes Express in Docker.');
  console.error('Place Express configuration in server/app.ts and import it in server.ts without re-exporting.\n');
  console.error('Found forbidden exports:');
  exportLines.forEach((item) => {
    console.error(`  Line ${item.lineNum}: ${item.text}`);
  });
  process.exit(1);
}

console.log('\x1b[32m[check-entrypoint] PASS: server.ts is cleanly isolated with zero exports (safe for Bun & Docker).\x1b[0m');
process.exit(0);
