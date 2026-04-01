import { fileURLToPath } from 'node:url';
import { access } from 'node:fs/promises';
import { ensureWrite } from '../utils/fs.js';

const patchNotesDir = fileURLToPath(new URL('../../data/patch-notes', import.meta.url));

async function main() {
  const [patch, sourceUrl] = process.argv.slice(2);

  if (!patch) {
    throw new Error('Usage: npm run coach:patch:scaffold -w @don-sosa/api -- <patch> [sourceUrl]');
  }

  const targetPath = `${patchNotesDir}/${patch}.json`;

  try {
    await access(targetPath);
    throw new Error(`Patch file already exists: ${targetPath}`);
  } catch (error) {
    if (!(error instanceof Error) || !('code' in error) || error.code !== 'ENOENT') {
      throw error;
    }
  }

  const scaffold = {
    patch,
    publishedAt: new Date().toISOString(),
    sourceUrl: sourceUrl ?? 'https://www.leagueoflegends.com/en-us/news/tags/patch-notes/',
    summary: [
      `Replace this line with the main coaching takeaway for patch ${patch}.`,
      'Replace this line with the second most important gameplay or meta change.',
      'Replace this line with any system impact that should change coaching emphasis.'
    ],
    championUpdates: [],
    systemUpdates: []
  };

  await ensureWrite(targetPath, `${JSON.stringify(scaffold, null, 2)}\n`);
  console.log(`Created patch scaffold: ${targetPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
