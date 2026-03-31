export function detectLocale() {
    if (typeof navigator === 'undefined')
        return 'es';
    const language = navigator.language.toLowerCase();
    return language.startsWith('en') ? 'en' : 'es';
}
export function translateRole(role, locale) {
    if (locale === 'es')
        return role;
    const map = {
        JUNGLE: 'Jungle',
        TOP: 'Top',
        MIDDLE: 'Mid',
        BOTTOM: 'ADC',
        UTILITY: 'Support',
        ALL: 'All roles'
    };
    return map[role] ?? role;
}
