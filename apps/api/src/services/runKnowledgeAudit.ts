import { loadKnowledgeCards } from './knowledgeBase.js';
import { getCoachKnowledgeAuditSnapshot } from './coachKnowledgeService.js';

async function main() {
  const [cards, knowledgeAudit] = await Promise.all([
    loadKnowledgeCards(),
    getCoachKnowledgeAuditSnapshot()
  ]);
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

  console.log('Identity layer:');
  console.log(`- Knowledge version: ${knowledgeAudit.knowledgeVersion}`);
  console.log(`- Role identities: ${knowledgeAudit.roleIdentities}`);
  console.log(`- Elo profiles: ${knowledgeAudit.eloProfiles}`);
  console.log(`- Champion identities: ${knowledgeAudit.championIdentities}`);
  console.log(`- Meta patch references: ${knowledgeAudit.metaPatchReferences}`);
  console.log(`- Active heuristics: ${knowledgeAudit.activeHeuristics}`);
  console.log(`- Blocked heuristics: ${knowledgeAudit.blockedHeuristics}`);
  console.log('Champion identity coverage by role:');
  for (const entry of knowledgeAudit.roleCoverage) {
    console.log(`- ${entry.role}: ${entry.count}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
