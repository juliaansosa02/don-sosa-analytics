import { loadKnowledgeCards } from './knowledgeBase.js';

async function main() {
  const cards = await loadKnowledgeCards();
  const byRole = new Map<string, number>();
  const byPhase = new Map<string, number>();

  for (const card of cards) {
    byRole.set(card.role, (byRole.get(card.role) ?? 0) + 1);
    byPhase.set(card.phase, (byPhase.get(card.phase) ?? 0) + 1);
  }

  console.log(`Knowledge cards loaded: ${cards.length}`);
  console.log('By role:');
  for (const [role, count] of [...byRole.entries()].sort()) {
    console.log(`- ${role}: ${count}`);
  }

  console.log('By phase:');
  for (const [phase, count] of [...byPhase.entries()].sort()) {
    console.log(`- ${phase}: ${count}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
