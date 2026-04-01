export const supportedRiotPlatformTuple = [
  'BR1',
  'EUN1',
  'EUW1',
  'JP1',
  'KR',
  'LA1',
  'LA2',
  'ME1',
  'NA1',
  'OC1',
  'PH2',
  'RU',
  'SG2',
  'TH2',
  'TR1',
  'TW2',
  'VN2'
] as const;

export const riotPlatformConfig = {
  BR1: { platform: 'BR1', regionalRoute: 'americas', label: 'Brazil' },
  EUN1: { platform: 'EUN1', regionalRoute: 'europe', label: 'Europe Nordic & East' },
  EUW1: { platform: 'EUW1', regionalRoute: 'europe', label: 'Europe West' },
  JP1: { platform: 'JP1', regionalRoute: 'asia', label: 'Japan' },
  KR: { platform: 'KR', regionalRoute: 'asia', label: 'Korea' },
  LA1: { platform: 'LA1', regionalRoute: 'americas', label: 'Latin America North' },
  LA2: { platform: 'LA2', regionalRoute: 'americas', label: 'Latin America South' },
  ME1: { platform: 'ME1', regionalRoute: 'europe', label: 'Middle East' },
  NA1: { platform: 'NA1', regionalRoute: 'americas', label: 'North America' },
  OC1: { platform: 'OC1', regionalRoute: 'sea', label: 'Oceania' },
  PH2: { platform: 'PH2', regionalRoute: 'sea', label: 'Philippines' },
  RU: { platform: 'RU', regionalRoute: 'europe', label: 'Russia' },
  SG2: { platform: 'SG2', regionalRoute: 'sea', label: 'Singapore, Malaysia & Indonesia' },
  TH2: { platform: 'TH2', regionalRoute: 'sea', label: 'Thailand' },
  TR1: { platform: 'TR1', regionalRoute: 'europe', label: 'Turkey' },
  TW2: { platform: 'TW2', regionalRoute: 'sea', label: 'Taiwan, Hong Kong & Macao' },
  VN2: { platform: 'VN2', regionalRoute: 'sea', label: 'Vietnam' }
} as const satisfies Record<(typeof supportedRiotPlatformTuple)[number], { platform: string; regionalRoute: string; label: string }>;

export type RiotPlatform = (typeof supportedRiotPlatformTuple)[number];
export type RiotRegionalRoute = (typeof riotPlatformConfig)[RiotPlatform]['regionalRoute'];
export type RiotPlatformInfo = (typeof riotPlatformConfig)[RiotPlatform];

export const supportedRiotPlatforms = [...supportedRiotPlatformTuple];

export function normalizeRiotPlatform(value?: string | null) {
  return value?.trim().toUpperCase() ?? '';
}

export function isSupportedRiotPlatform(value?: string | null): value is RiotPlatform {
  const normalized = normalizeRiotPlatform(value);
  return normalized in riotPlatformConfig;
}

export function resolveRiotPlatform(value?: string | null) {
  const normalized = normalizeRiotPlatform(value);
  return riotPlatformConfig[normalized as RiotPlatform] ?? null;
}

export function getRegionalRouteForPlatform(platform?: string | null, fallback: RiotRegionalRoute = 'americas') {
  return resolveRiotPlatform(platform)?.regionalRoute ?? fallback;
}

export function buildProfileStorageKey(gameName: string, tagLine: string, platform?: string | null) {
  const normalizedIdentity = `${gameName.trim().toLowerCase()}-${tagLine.trim().toLowerCase()}`
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/-+/g, '-');

  const normalizedPlatform = normalizeRiotPlatform(platform);
  if (!normalizedPlatform) return normalizedIdentity;
  return `${normalizedPlatform.toLowerCase()}-${normalizedIdentity}`;
}

export function buildLegacyProfileStorageKey(gameName: string, tagLine: string) {
  return `${gameName.trim().toLowerCase()}-${tagLine.trim().toLowerCase()}`
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/-+/g, '-');
}

export function buildProfileKeyCandidates(gameName: string, tagLine: string, platform?: string | null) {
  const candidates = [buildProfileStorageKey(gameName, tagLine, platform)];
  const legacyKey = buildLegacyProfileStorageKey(gameName, tagLine);
  if (!candidates.includes(legacyKey)) {
    candidates.push(legacyKey);
  }

  return candidates;
}
