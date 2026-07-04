export const COUNTRY_FLAGS: Record<string, string> = {
  'Tunisie': '🇹🇳',
  'Algérie': '🇩🇿',
  'Maroc': '🇲🇦',
  'Libye': '🇱🇾',
  'Égypte': '🇪🇬',
  'France': '🇫🇷',
  'Italie': '🇮🇹',
  'Allemagne': '🇩🇪',
  'Espagne': '🇪🇸',
  'Belgique': '🇧🇪',
  'Suisse': '🇨🇭',
  'Canada': '🇨🇦',
  'Autre': '🌍',
};

export function countryDisplay(country?: string | null): string {
  if (!country) return '';
  const flag = COUNTRY_FLAGS[country] ?? '🌍';
  return `${flag} ${country}`;
}
