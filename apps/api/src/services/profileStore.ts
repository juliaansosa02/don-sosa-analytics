import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { ensureWrite } from '../utils/fs.js';

interface StoredProfileDataset {
  player: string;
  tagLine: string;
}

const profilesDir = fileURLToPath(new URL('../../data/profiles', import.meta.url));

function normalizeKey(gameName: string, tagLine: string) {
  return `${gameName.trim().toLowerCase()}-${tagLine.trim().toLowerCase()}`
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/-+/g, '-');
}

function profilePath(gameName: string, tagLine: string) {
  return `${profilesDir}/${normalizeKey(gameName, tagLine)}.json`;
}

export async function saveProfileSnapshot(dataset: unknown & StoredProfileDataset) {
  await ensureWrite(profilePath(dataset.player, dataset.tagLine), JSON.stringify(dataset, null, 2));
}

export async function loadProfileSnapshot<T>(gameName: string, tagLine: string) {
  try {
    const raw = await readFile(profilePath(gameName, tagLine), 'utf8');
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}
