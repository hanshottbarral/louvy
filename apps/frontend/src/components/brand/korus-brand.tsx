import { cn } from '@/lib/utils';

type Tone = 'light' | 'dark';

function palette(tone: Tone) {
  if (tone === 'light') {
    return {
      primary: '#F5F5F5',
      secondary: '#C8A96A',
      tertiary: 'rgba(245,245,245,0.65)',
    };
  }

  return {
    primary: '#121212',
    secondary: '#C8A96A',
    tertiary: '#1A2A44',
  };
}

export function KorusMark({
  tone = 'dark',
  className,
  size = 128,
}: {
  tone?: Tone;
  className?: string;
  size?: number;
}) {
  const colors = palette(tone);

  return (
    <svg
      viewBox="0 0 128 128"
      width={size}
      height={size}
      className={cn('shrink-0', className)}
      aria-hidden="true"
    >
      <rect x="28" y="18" width="8" height="92" rx="4" fill={colors.primary} />
      <path
        d="M40 64 L82 24"
        stroke={colors.secondary}
        strokeWidth="8"
        strokeLinecap="round"
      />
      <path
        d="M40 66 L84 108"
        stroke={colors.secondary}
        strokeWidth="8"
        strokeLinecap="round"
      />
      <path
        d="M62 64 C78 54 90 52 104 64"
        stroke={colors.tertiary}
        strokeWidth="6"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M68 76 C82 70 91 70 102 78"
        stroke={colors.tertiary}
        strokeWidth="5"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function KorusWordmark({
  tone = 'dark',
  stacked = false,
  className,
}: {
  tone?: Tone;
  stacked?: boolean;
  className?: string;
}) {
  const colors = palette(tone);
  const width = stacked ? 320 : 540;
  const height = stacked ? 280 : 160;
  const textX = stacked ? 160 : 130;
  const textY = stacked ? 178 : 92;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={cn('shrink-0', className)}
      role="img"
      aria-label="KORUS"
    >
      <g transform={stacked ? 'translate(114 30)' : 'translate(18 24)'}>
        <KorusMark tone={tone} size={stacked ? 92 : 84} />
      </g>
      <text
        x={textX}
        y={textY}
        fill={colors.primary}
        fontFamily="Poppins, Inter, Arial, sans-serif"
        fontWeight="700"
        fontSize={stacked ? '64' : '72'}
        letterSpacing="0.22em"
        textAnchor={stacked ? 'middle' : 'start'}
      >
        KORUS
      </text>
      <text
        x={stacked ? 160 : 132}
        y={stacked ? 222 : 122}
        fill={colors.secondary}
        fontFamily="Inter, Arial, sans-serif"
        fontWeight="500"
        fontSize={stacked ? '18' : '16'}
        letterSpacing="0.18em"
        textAnchor={stacked ? 'middle' : 'start'}
      >
        TEAM SOUND COLLABORATION
      </text>
    </svg>
  );
}
