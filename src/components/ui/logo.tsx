interface Props {
  size?: 'sm' | 'md' | 'lg';
  showSlogan?: boolean;
}

export function Logo({ size = 'md', showSlogan = false }: Props) {
  const scales = { sm: 0.45, md: 0.7, lg: 1 };
  const s = scales[size];
  const w = Math.round(200 * s);
  const h = showSlogan ? Math.round(80 * s) : Math.round(52 * s);

  return (
    <svg width={w} height={h} viewBox={`0 0 200 ${showSlogan ? 80 : 52}`} aria-label="BibOn">
      {/* BibOn text */}
      <text
        x="0" y="40"
        fill="#0f172a"
        fontFamily="Inter, system-ui, sans-serif"
        fontWeight="900"
        fontSize="46"
        letterSpacing="-2"
      >
        BibOn
      </text>
      {/* red underline */}
      <rect x="0" y="46" width="154" height="4" rx="2" fill="#CC0001" />
      {/* red dot above i */}
      <circle cx="119" cy="6" r="6" fill="#CC0001" />
      {showSlogan && (
        <text
          x="0" y="72"
          fill="#94a3b8"
          fontFamily="Inter, system-ui, sans-serif"
          fontSize="13"
          letterSpacing="3"
        >
          السباق بدا
        </text>
      )}
    </svg>
  );
}
