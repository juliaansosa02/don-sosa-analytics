const championKeyMap = {
    ChoGath: 'Chogath',
    DrMundo: 'DrMundo',
    JarvanIV: 'JarvanIV',
    KhaZix: 'Khazix',
    KogMaw: 'KogMaw',
    LeeSin: 'LeeSin',
    MasterYi: 'MasterYi',
    MissFortune: 'MissFortune',
    MonkeyKing: 'MonkeyKing',
    RekSai: 'RekSai',
    TahmKench: 'TahmKench',
    TwistedFate: 'TwistedFate',
    VelKoz: 'Velkoz',
    XinZhao: 'XinZhao'
};
const roleLabels = {
    ALL: 'Todos los roles',
    TOP: 'Top',
    JUNGLE: 'Jungla',
    MIDDLE: 'Mid',
    BOTTOM: 'ADC',
    UTILITY: 'Support',
    NONE: 'Sin rol'
};
const rankTierPalette = {
    UNRANKED: { primary: '#6b7483', secondary: '#202734', glow: '#8f9bb2' },
    IRON: { primary: '#8b5f53', secondary: '#2b1d1a', glow: '#b17f72' },
    BRONZE: { primary: '#b37b45', secondary: '#342417', glow: '#d2a06e' },
    SILVER: { primary: '#b8c2d0', secondary: '#27303d', glow: '#dbe5f2' },
    GOLD: { primary: '#e0bb63', secondary: '#332812', glow: '#ffe39c' },
    PLATINUM: { primary: '#53d0bf', secondary: '#0d2b2b', glow: '#84f5df' },
    EMERALD: { primary: '#4bd38d', secondary: '#102a20', glow: '#7ef0b2' },
    DIAMOND: { primary: '#6bb8ff', secondary: '#142238', glow: '#a2d5ff' },
    MASTER: { primary: '#c674ff', secondary: '#29163a', glow: '#e4b0ff' },
    GRANDMASTER: { primary: '#ff7686', secondary: '#35131c', glow: '#ffadb6' },
    CHALLENGER: { primary: '#8cecff', secondary: '#102b34', glow: '#c2f7ff' }
};
export function normalizeChampionKey(championName) {
    return championKeyMap[championName] ?? championName.replace(/[\s'.]/g, '');
}
export function getChampionIconUrl(championName, version) {
    if (!version)
        return null;
    return `https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${normalizeChampionKey(championName)}.png`;
}
export function getProfileIconUrl(profileIconId, version) {
    if (!version || typeof profileIconId !== 'number')
        return null;
    return `https://ddragon.leagueoflegends.com/cdn/${version}/img/profileicon/${profileIconId}.png`;
}
export function getRuneIconUrl(icon) {
    return icon ? `https://ddragon.leagueoflegends.com/cdn/img/${icon}` : null;
}
export function getRoleLabel(role) {
    return roleLabels[role] ?? role;
}
export function getQueueLabel(queueId) {
    const queueLabels = {
        420: 'Ranked Solo/Duo',
        440: 'Ranked Flex',
        400: 'Normal Draft',
        430: 'Normal Blind',
        450: 'ARAM'
    };
    return queueLabels[queueId] ?? `Queue ${queueId}`;
}
export function getQueueBucket(queueId) {
    if (queueId === 420)
        return 'RANKED_SOLO';
    if (queueId === 440)
        return 'RANKED_FLEX';
    if (queueId === 420 || queueId === 440)
        return 'RANKED';
    return 'OTHER';
}
export function getRankPalette(tier) {
    return rankTierPalette[tier ?? 'UNRANKED'] ?? rankTierPalette.UNRANKED;
}
export function getRankEmblemDataUrl(tier) {
    const palette = getRankPalette(tier);
    const tierKey = tier ?? 'UNRANKED';
    const safeTier = tierKey.slice(0, 2).toUpperCase();
    const coreShapeMap = {
        IRON: 'M36 20L48 28V44L36 52L24 44V28L36 20Z',
        BRONZE: 'M36 18L50 30L43 50H29L22 30L36 18Z',
        SILVER: 'M36 19L41 29L52 30L44 38L47 49L36 43L25 49L28 38L20 30L31 29L36 19Z',
        GOLD: 'M36 16L46 24L51 36L46 48L36 56L26 48L21 36L26 24L36 16Z',
        PLATINUM: 'M36 16L49 25L46 45L36 56L26 45L23 25L36 16Z',
        EMERALD: 'M36 15L47 21L50 35L44 49L36 57L28 49L22 35L25 21L36 15Z',
        DIAMOND: 'M36 14L48 24L44 46L36 58L28 46L24 24L36 14Z',
        MASTER: 'M24 48L21 29L29 19L36 25L43 19L51 29L48 48L36 56L24 48Z',
        GRANDMASTER: 'M20 31L29 16L36 22L43 16L52 31L47 49L36 57L25 49L20 31Z',
        CHALLENGER: 'M18 31L28 14L36 20L44 14L54 31L49 50L36 58L23 50L18 31Z'
    };
    const wingMap = {
        MASTER: '<path d="M17 29L9 24L13 36L21 38" fill="none" stroke="' + palette.glow + '" stroke-width="2" stroke-linecap="round"/><path d="M55 29L63 24L59 36L51 38" fill="none" stroke="' + palette.glow + '" stroke-width="2" stroke-linecap="round"/>',
        GRANDMASTER: '<path d="M16 30L7 25L11 38L21 40" fill="none" stroke="' + palette.glow + '" stroke-width="2" stroke-linecap="round"/><path d="M56 30L65 25L61 38L51 40" fill="none" stroke="' + palette.glow + '" stroke-width="2" stroke-linecap="round"/>',
        CHALLENGER: '<path d="M15 30L5 24L10 40L22 42" fill="none" stroke="' + palette.glow + '" stroke-width="2" stroke-linecap="round"/><path d="M57 30L67 24L62 40L50 42" fill="none" stroke="' + palette.glow + '" stroke-width="2" stroke-linecap="round"/>'
    };
    const crownMap = {
        MASTER: 'M27 16L32 22L36 16L40 22L45 16L45 24H27V16Z',
        GRANDMASTER: 'M25 15L30 22L36 14L42 22L47 15L47 25H25V15Z',
        CHALLENGER: 'M23 14L29 23L36 13L43 23L49 14L49 26H23V14Z'
    };
    const coreShape = coreShapeMap[tierKey] ?? 'M36 18L48 26L44 46L36 54L28 46L24 26L36 18Z';
    const wingMarkup = wingMap[tierKey] ?? '<path d="M26 22L19 30L22 40" stroke="' + palette.glow + '" stroke-width="2" stroke-linecap="round" opacity="0.75"/><path d="M46 22L53 30L50 40" stroke="' + palette.glow + '" stroke-width="2" stroke-linecap="round" opacity="0.75"/>';
    const crownMarkup = crownMap[tierKey] ? `<path d="${crownMap[tierKey]}" fill="${palette.glow}" opacity="0.92"/>` : '';
    const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 72 72" fill="none">
      <defs>
        <linearGradient id="g" x1="36" y1="8" x2="36" y2="64" gradientUnits="userSpaceOnUse">
          <stop stop-color="${palette.glow}"/>
          <stop offset="1" stop-color="${palette.primary}"/>
        </linearGradient>
        <linearGradient id="bg" x1="36" y1="10" x2="36" y2="62" gradientUnits="userSpaceOnUse">
          <stop stop-color="${palette.secondary}"/>
          <stop offset="1" stop-color="#060a10"/>
        </linearGradient>
      </defs>
      <circle cx="36" cy="36" r="28" fill="url(#bg)" stroke="url(#g)" stroke-width="2"/>
      <path d="${coreShape}" fill="url(#g)" opacity="0.26"/>
      <path d="${coreShape}" fill="url(#g)" opacity="0.98" transform="translate(0 2) scale(0.92 0.88) translate(3.2 2.6)"/>
      <path d="M36 25L42 30L40 40L36 46L32 40L30 30L36 25Z" fill="#08101a"/>
      ${wingMarkup}
      ${crownMarkup}
      <text x="36" y="64" text-anchor="middle" font-size="8" font-family="Manrope, Arial, sans-serif" fill="${palette.glow}" letter-spacing="1.3">${safeTier}</text>
    </svg>
  `;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
