// Runs a command with NEXT_PUBLIC_ARCA_MODE set (DN-09 4). Variables set here win over .env.local, which is never edited.
// Usage: node scripts/with-mode.mjs <production|live-debug|mock> <command…>
import { spawn } from 'node:child_process';

// The same list as lib/arca-mode.ts; next.config.ts refuses anything else on start anyway.
const MODES = ['production', 'live-debug', 'mock'];
const [mode, ...command] = process.argv.slice(2);
if (!MODES.includes(mode) || command.length === 0) {
  console.error(`Usage: node scripts/with-mode.mjs <${MODES.join('|')}> <command…>`);
  process.exit(1);
}
const child = spawn(command.join(' '), { env: { ...process.env, NEXT_PUBLIC_ARCA_MODE: mode }, shell: true, stdio: 'inherit' });
// Ctrl+C reaches the child from the terminal as well: wait for it to stop and report its exit code.
process.on('SIGINT', () => {});
process.on('SIGTERM', () => child.kill('SIGTERM'));
child.on('error', error => { console.error(`[with-mode] ${error.message}`); process.exit(1); });
child.on('exit', code => process.exit(code ?? 1));
