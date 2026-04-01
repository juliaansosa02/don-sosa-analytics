import { getCurrentPatchNotes, loadPatchNotes } from './patchNotes.js';

async function main() {
  const notes = await loadPatchNotes();
  const current = await getCurrentPatchNotes();

  console.log(`Patch note files loaded: ${notes.length}`);
  for (const note of notes) {
    console.log(`- ${note.patch}: ${note.championUpdates.length} champion updates, ${note.systemUpdates.length} system updates`);
  }

  if (current) {
    console.log(`Current patch context: ${current.patch}`);
    console.log(`Source: ${current.sourceUrl}`);
  } else {
    console.log('Current patch context: none');
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
