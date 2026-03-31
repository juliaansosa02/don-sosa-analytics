import { httpJson } from '../lib/http.js';
import type { RuneNode } from '../types/riot.js';

let cachedVersion: string | null = null;
let cachedRunes: RuneNode[] | null = null;

export async function getLatestDDragonVersion() {
  if (cachedVersion) return cachedVersion;
  const versions = await httpJson<string[]>('https://ddragon.leagueoflegends.com/api/versions.json');
  cachedVersion = versions[0];
  return cachedVersion;
}

export async function getRuneTree() {
  if (cachedRunes) return cachedRunes;
  const version = await getLatestDDragonVersion();
  cachedRunes = await httpJson<RuneNode[]>(`https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/runesReforged.json`);
  return cachedRunes;
}

export async function buildRuneIndex() {
  const trees = await getRuneTree();
  const index = new Map<number, RuneNode>();
  for (const tree of trees) {
    index.set(tree.id, tree);
    for (const slot of tree.slots ?? []) {
      for (const rune of slot.runes) {
        index.set(rune.id, rune);
      }
    }
  }
  return index;
}
