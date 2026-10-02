const fs = require('fs');
const path = require('path');

let inputData = '';

process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  inputData += chunk;
});

process.stdin.on('end', () => {
  try {
    const payload = JSON.parse(inputData || '{}');
    const cmd = payload?.toolCall?.args?.CommandLine || '';

    // If running a commit or build, enforce clean entrypoint invariant
    if (cmd.includes('git commit') || cmd.includes('run build')) {
      const serverFile = path.join(__dirname, '..', 'server.ts');
      if (fs.existsSync(serverFile)) {
        const content = fs.readFileSync(serverFile, 'utf8');
        const lines = content.split('\n');
        const exports = lines.filter((l) => l.trim().startsWith('export ') || l.trim().startsWith('export{'));
        if (exports.length > 0) {
          console.log(JSON.stringify({
            decision: 'deny',
            reason: 'server.ts contains forbidden export statements. In Bun v1.4+, entrypoint exports trigger Bun.serve() crash loop. Move exports to server/app.ts.',
          }));
          process.exit(0);
        }
      }
    }

    console.log(JSON.stringify({ decision: 'allow' }));
  } catch (err) {
    // Fallback to allow if payload parsing fails
    console.log(JSON.stringify({ decision: 'allow' }));
  }
});
