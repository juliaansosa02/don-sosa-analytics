export type Locale = 'es' | 'en';

export function detectLocale(): Locale {
  if (typeof navigator === 'undefined') return 'es';
  const language = navigator.language.toLowerCase();
  return language.startsWith('en') ? 'en' : 'es';
}

export function translateRole(role: string, locale: Locale) {
  if (locale === 'es') return role;

  const map: Record<string, string> = {
    JUNGLE: 'Jungle',
    TOP: 'Top',
    MIDDLE: 'Mid',
    BOTTOM: 'ADC',
    UTILITY: 'Support',
    ALL: 'All roles'
  };

  return map[role] ?? role;
}
