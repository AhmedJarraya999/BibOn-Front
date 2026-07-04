'use client';

const COUNTRY_CODES: Record<string, string> = {
  'Tunisie': 'TN',
  'Algérie': 'DZ',
  'Maroc': 'MA',
  'Libye': 'LY',
  'Égypte': 'EG',
  'France': 'FR',
  'Italie': 'IT',
  'Allemagne': 'DE',
  'Espagne': 'ES',
  'Belgique': 'BE',
  'Suisse': 'CH',
  'Canada': 'CA',
};

interface Props {
  country: string;
  size?: number;
  showName?: boolean;
  className?: string;
}

export function CountryFlag({ country, size = 20, showName = true, className = '' }: Props) {
  const code = COUNTRY_CODES[country];

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      {code ? (
        <img
          src={`https://flagcdn.com/w40/${code.toLowerCase()}.png`}
          alt={country}
          width={size}
          height={size * 0.75}
          className="rounded-sm object-cover"
          style={{ width: size, height: size * 0.75 }}
        />
      ) : (
        <span>🌍</span>
      )}
      {showName && <span>{country}</span>}
    </span>
  );
}
