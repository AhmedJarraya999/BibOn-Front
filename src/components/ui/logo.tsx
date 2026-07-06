interface Props {
  size?: 'sm' | 'md' | 'lg';
  showSlogan?: boolean;
  variant?: 'dark' | 'light';
}

export function Logo({ size = 'md', showSlogan = false, variant = 'dark' }: Props) {
  const scales = { sm: 0.42, md: 0.65, lg: 1 };
  const s = scales[size];
  const baseW = 480;
  const baseH = showSlogan ? 200 : 168;
  const w = Math.round(baseW * s);
  const h = Math.round(baseH * s);

  const textColor = variant === 'dark' ? '#ffffff' : '#0f172a';
  const sloganColor = variant === 'dark' ? 'rgba(255,255,255,0.4)' : '#94a3b8';
  const id = `logo-${size}-${variant}`;

  return (
    <svg width={w} height={h} viewBox={`0 0 ${baseW} ${baseH}`} aria-label="كورسة" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id={`glow-${id}`}>
          <feGaussianBlur stdDeviation="4" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id={`bigGlow-${id}`}>
          <feGaussianBlur stdDeviation="12" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <linearGradient id={`flame-${id}`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#FF2200"/>
          <stop offset="55%" stopColor="#FF8C00"/>
          <stop offset="100%" stopColor="#FFD700" stopOpacity="0"/>
        </linearGradient>
        <linearGradient id={`underline-${id}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#FF2200"/>
          <stop offset="60%" stopColor="#FF8C00"/>
          <stop offset="100%" stopColor="#FFD700" stopOpacity="0.4"/>
        </linearGradient>
      </defs>

      {/* Flame trails behind runner */}
      <ellipse cx="32" cy="108" rx="30" ry="9" fill={`url(#flame-${id})`} opacity="0.75" transform="rotate(-10,32,108)"/>
      <ellipse cx="16" cy="122" rx="22" ry="6" fill={`url(#flame-${id})`} opacity="0.5" transform="rotate(-16,16,122)"/>
      <ellipse cx="52" cy="96" rx="20" ry="5" fill={`url(#flame-${id})`} opacity="0.4" transform="rotate(-5,52,96)"/>
      <ellipse cx="22" cy="136" rx="16" ry="5" fill="#FF2200" opacity="0.25" transform="rotate(-22,22,136)"/>

      {/* Glow halo behind runner */}
      <ellipse cx="90" cy="100" rx="58" ry="58" fill="#FF8C00" opacity="0.07" filter={`url(#bigGlow-${id})`}/>

      {/* Runner silhouette */}
      <g fill="#FF8C00" filter={`url(#glow-${id})`}>
        {/* head */}
        <circle cx="108" cy="36" r="14"/>
        {/* torso */}
        <path d="M100 50 Q82 74 76 106 L96 108 Q99 82 110 62 Z"/>
        {/* arm back */}
        <path d="M100 64 Q76 55 62 66 Q70 76 87 74 Z"/>
        {/* arm forward */}
        <path d="M104 66 Q124 55 132 65 Q122 76 105 74 Z"/>
        {/* front leg */}
        <path d="M80 106 Q68 130 54 152 Q66 160 76 150 Q90 126 96 108 Z"/>
        {/* back leg */}
        <path d="M92 106 Q108 126 128 118 Q122 106 110 96 Z"/>
        {/* front shoe */}
        <path d="M50 146 Q34 156 40 166 Q58 166 70 154 Z"/>
        {/* back shoe */}
        <path d="M126 118 Q146 124 142 134 Q126 134 116 124 Z"/>
      </g>

      {/* كورسة wordmark */}
      <text
        x="155" y="126"
        fill={textColor}
        fontFamily="'Segoe UI', Tahoma, Arial, sans-serif"
        fontWeight="900"
        fontSize="82"
        letterSpacing="-2"
      >
        كورسة
      </text>

      {/* Flame underline */}
      <path
        d="M155 140 Q290 158 465 140"
        fill="none"
        stroke={`url(#underline-${id})`}
        strokeWidth="5"
        strokeLinecap="round"
      />

      {/* Tagline */}
      {showSlogan && (
        <text
          x="155" y="178"
          fill={sloganColor}
          fontFamily="'Segoe UI', Tahoma, Arial, sans-serif"
          fontSize="18"
          letterSpacing="1"
        >
          الكورسة الكل في بلاتفورم وحدة
        </text>
      )}
    </svg>
  );
}
