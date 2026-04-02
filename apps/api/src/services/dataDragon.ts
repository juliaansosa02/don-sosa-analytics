import type { ItemCatalogEntry } from '@don-sosa/core';
import { httpJson } from '../lib/http.js';
import type { DataDragonItemNode, RuneNode } from '../types/riot.js';

let cachedVersion: string | null = null;
let cachedRunes: RuneNode[] | null = null;
let cachedItemCatalog: Record<string, ItemCatalogEntry> | null = null;

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

export async function buildItemCatalog() {
  if (cachedItemCatalog) return cachedItemCatalog;

  const version = await getLatestDDragonVersion();
  const payload = await httpJson<{ data: Record<string, DataDragonItemNode> }>(
    `https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/item.json`
  );

  cachedItemCatalog = Object.fromEntries(
    Object.entries(payload.data).map(([id, item]) => [
      id,
      {
        id: Number(id),
        name: item.name,
        description: item.description,
        plaintext: item.plaintext,
        goldTotal: item.gold?.total ?? 0,
        tags: item.tags ?? [],
        from: (item.from ?? []).map((value) => Number(value)),
        into: (item.into ?? []).map((value) => Number(value)),
        depth: item.depth ?? 1
      } satisfies ItemCatalogEntry
    ])
  );

  return cachedItemCatalog;
}
