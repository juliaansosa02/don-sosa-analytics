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
    const safeTier = (tier ?? 'UNRANKED').slice(0, 2).toUpperCase();
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
      <path d="M36 14L50 24L46 46L36 58L26 46L22 24L36 14Z" fill="url(#g)" opacity="0.22"/>
      <path d="M36 18L47 26L43 43L36 52L29 43L25 26L36 18Z" fill="url(#g)" opacity="0.96"/>
      <path d="M36 24L42 29L40 39L36 45L32 39L30 29L36 24Z" fill="#08101a"/>
      <path d="M26 22L19 30L22 40" stroke="${palette.glow}" stroke-width="2" stroke-linecap="round" opacity="0.75"/>
      <path d="M46 22L53 30L50 40" stroke="${palette.glow}" stroke-width="2" stroke-linecap="round" opacity="0.75"/>
      <text x="36" y="64" text-anchor="middle" font-size="8" font-family="Manrope, Arial, sans-serif" fill="${palette.glow}" letter-spacing="1.3">${safeTier}</text>
    </svg>
  `;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
