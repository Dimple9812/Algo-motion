import clsx from 'clsx';
import type { ReactNode } from 'react';

/**
 * The AlgoMotion Crew — original characters drawn as inline SVG.
 * All artwork in this file is original to this project (MIT licensed).
 */

export type CharacterId = 'byte' | 'bit' | 'loop' | 'node' | 'pixel';
export type Mood = 'happy' | 'neutral' | 'thinking' | 'surprised' | 'sad' | 'excited' | 'error' | 'sleepy';
export type MascotAnimation =
  | 'idle'
  | 'wave'
  | 'walk'
  | 'run'
  | 'jump'
  | 'think'
  | 'celebrate'
  | 'confused'
  | 'point'
  | 'hint'
  | 'error'
  | 'loading'
  | 'sleep'
  | 'none';

export const CREW: Record<
  CharacterId,
  { name: string; role: string; color: string; dark: string; bio: string }
> = {
  byte: {
    name: 'Byte',
    role: 'Guide',
    color: '#38bdf8',
    dark: '#0369a1',
    bio: 'A pocket-sized robot who loves showing how things really work.',
  },
  bit: {
    name: 'Bit',
    role: 'Explorer',
    color: '#fb923c',
    dark: '#c2410c',
    bio: 'Maps every index, stack and queue — never leaves without goggles.',
  },
  loop: {
    name: 'Loop',
    role: 'Speedster',
    color: '#f472b6',
    dark: '#be185d',
    bio: 'Lives for iterations, races and comparing sort speeds.',
  },
  node: {
    name: 'Node',
    role: 'Builder',
    color: '#34d399',
    dark: '#047857',
    bio: 'Wires pointers, plants trees and charts graph routes.',
  },
  pixel: {
    name: 'Pixel',
    role: 'AI tutor',
    color: '#a78bfa',
    dark: '#6d28d9',
    bio: 'Offers hints and explanations, and is honest about what it is unsure of.',
  },
};

interface FaceProps {
  mood: Mood;
  cx: number;
  cy: number;
  scale?: number;
  eyeColor?: string;
}

function Face({ mood, cx, cy, scale = 1, eyeColor = '#a7f3d0' }: FaceProps) {
  const s = scale;
  const ex = 9 * s;
  const eyes: Record<Mood, ReactNode> = {
    happy: (
      <>
        <path
          d={`M${cx - ex - 4 * s} ${cy} q${4 * s} ${-6 * s} ${8 * s} 0`}
          stroke={eyeColor}
          strokeWidth={3 * s}
          fill="none"
          strokeLinecap="round"
        />
        <path
          d={`M${cx + ex - 4 * s} ${cy} q${4 * s} ${-6 * s} ${8 * s} 0`}
          stroke={eyeColor}
          strokeWidth={3 * s}
          fill="none"
          strokeLinecap="round"
        />
      </>
    ),
    excited: (
      <>
        <path
          d={`M${cx - ex} ${cy - 5 * s} l${2 * s} ${4 * s} l${4 * s} ${1 * s} l${-3 * s} ${3 * s} l${1 * s} ${4 * s} l${-4 * s} ${-2 * s} l${-4 * s} ${2 * s} l${1 * s} ${-4 * s} l${-3 * s} ${-3 * s} l${4 * s} ${-1 * s}z`}
          fill={eyeColor}
        />
        <path
          d={`M${cx + ex} ${cy - 5 * s} l${2 * s} ${4 * s} l${4 * s} ${1 * s} l${-3 * s} ${3 * s} l${1 * s} ${4 * s} l${-4 * s} ${-2 * s} l${-4 * s} ${2 * s} l${1 * s} ${-4 * s} l${-3 * s} ${-3 * s} l${4 * s} ${-1 * s}z`}
          fill={eyeColor}
        />
      </>
    ),
    neutral: (
      <g className="eyes">
        <rect x={cx - ex - 3 * s} y={cy - 5 * s} width={6 * s} height={9 * s} rx={3 * s} fill={eyeColor} />
        <rect x={cx + ex - 3 * s} y={cy - 5 * s} width={6 * s} height={9 * s} rx={3 * s} fill={eyeColor} />
      </g>
    ),
    thinking: (
      <>
        <rect x={cx - ex - 3 * s} y={cy - 2 * s} width={6 * s} height={4 * s} rx={2 * s} fill={eyeColor} />
        <rect x={cx + ex - 3 * s} y={cy - 6 * s} width={6 * s} height={8 * s} rx={3 * s} fill={eyeColor} />
      </>
    ),
    surprised: (
      <>
        <circle cx={cx - ex} cy={cy} r={4.5 * s} fill={eyeColor} />
        <circle cx={cx + ex} cy={cy} r={4.5 * s} fill={eyeColor} />
      </>
    ),
    sad: (
      <>
        <path
          d={`M${cx - ex - 4 * s} ${cy - 3 * s} l${8 * s} ${3 * s}`}
          stroke={eyeColor}
          strokeWidth={3 * s}
          strokeLinecap="round"
        />
        <path
          d={`M${cx + ex + 4 * s} ${cy - 3 * s} l${-8 * s} ${3 * s}`}
          stroke={eyeColor}
          strokeWidth={3 * s}
          strokeLinecap="round"
        />
      </>
    ),
    error: (
      <>
        <path
          d={`M${cx - ex - 3 * s} ${cy - 3 * s} l${6 * s} ${6 * s} m0 ${-6 * s} l${-6 * s} ${6 * s}`}
          stroke="#fca5a5"
          strokeWidth={2.6 * s}
          strokeLinecap="round"
        />
        <path
          d={`M${cx + ex - 3 * s} ${cy - 3 * s} l${6 * s} ${6 * s} m0 ${-6 * s} l${-6 * s} ${6 * s}`}
          stroke="#fca5a5"
          strokeWidth={2.6 * s}
          strokeLinecap="round"
        />
      </>
    ),
    sleepy: (
      <>
        <path
          d={`M${cx - ex - 4 * s} ${cy} q${4 * s} ${4 * s} ${8 * s} 0`}
          stroke={eyeColor}
          strokeWidth={2.6 * s}
          fill="none"
          strokeLinecap="round"
        />
        <path
          d={`M${cx + ex - 4 * s} ${cy} q${4 * s} ${4 * s} ${8 * s} 0`}
          stroke={eyeColor}
          strokeWidth={2.6 * s}
          fill="none"
          strokeLinecap="round"
        />
      </>
    ),
  };
  const mouthY = cy + 9 * s;
  const mouth: Record<Mood, ReactNode> = {
    happy: (
      <path
        d={`M${cx - 6 * s} ${mouthY} q${6 * s} ${6 * s} ${12 * s} 0`}
        stroke={eyeColor}
        strokeWidth={2.4 * s}
        fill="none"
        strokeLinecap="round"
      />
    ),
    excited: <path d={`M${cx - 7 * s} ${mouthY - 1 * s} q${7 * s} ${10 * s} ${14 * s} 0z`} fill={eyeColor} />,
    neutral: (
      <path
        d={`M${cx - 4 * s} ${mouthY + 1 * s} h${8 * s}`}
        stroke={eyeColor}
        strokeWidth={2.4 * s}
        strokeLinecap="round"
      />
    ),
    thinking: (
      <path
        d={`M${cx - 5 * s} ${mouthY + 2 * s} q${3 * s} ${-3 * s} ${6 * s} 0 t${5 * s} 0`}
        stroke={eyeColor}
        strokeWidth={2.2 * s}
        fill="none"
        strokeLinecap="round"
      />
    ),
    surprised: <circle cx={cx} cy={mouthY + 2 * s} r={3 * s} fill={eyeColor} />,
    sad: (
      <path
        d={`M${cx - 6 * s} ${mouthY + 4 * s} q${6 * s} ${-6 * s} ${12 * s} 0`}
        stroke={eyeColor}
        strokeWidth={2.4 * s}
        fill="none"
        strokeLinecap="round"
      />
    ),
    error: (
      <path
        d={`M${cx - 6 * s} ${mouthY + 2 * s} l${3 * s} ${-2 * s} l${3 * s} ${2 * s} l${3 * s} ${-2 * s} l${3 * s} ${2 * s}`}
        stroke="#fca5a5"
        strokeWidth={2 * s}
        fill="none"
        strokeLinecap="round"
      />
    ),
    sleepy: <circle cx={cx} cy={mouthY + 2 * s} r={1.8 * s} fill={eyeColor} />,
  };
  return (
    <g>
      {eyes[mood]}
      {mouth[mood]}
    </g>
  );
}

function Byte({ mood, color, dark }: { mood: Mood; color: string; dark: string }) {
  return (
    <g>
      <line x1="60" y1="26" x2="60" y2="12" stroke={dark} strokeWidth="3" strokeLinecap="round" />
      <rect className="antenna-glow" x="54" y="4" width="12" height="12" rx="3" fill="#f472b6" />
      <rect x="22" y="26" width="76" height="62" rx="26" fill={color} />
      <rect x="22" y="26" width="76" height="62" rx="26" fill="url(#shine)" />
      <rect x="32" y="38" width="56" height="34" rx="14" fill="#0b1020" />
      <Face mood={mood} cx={60} cy={53} scale={0.9} />
      <rect x="40" y="88" width="40" height="18" rx="8" fill={color} />
      <rect className="arm-left" x="8" y="54" width="16" height="10" rx="5" fill={dark} />
      <g className="arm-right">
        <rect x="96" y="54" width="16" height="10" rx="5" fill={dark} />
      </g>
      <rect x="42" y="104" width="12" height="10" rx="4" fill={dark} />
      <rect x="66" y="104" width="12" height="10" rx="4" fill={dark} />
      <circle cx="60" cy="96" r="3" fill="#fde68a" />
    </g>
  );
}

function Bit({ mood, color, dark }: { mood: Mood; color: string; dark: string }) {
  return (
    <g>
      <rect x="26" y="34" width="68" height="64" rx="18" fill={color} />
      <rect x="26" y="34" width="68" height="64" rx="18" fill="url(#shine)" />
      {/* goggles on head */}
      <rect x="30" y="22" width="60" height="14" rx="7" fill={dark} />
      <circle cx="46" cy="29" r="8" fill="#fef3c7" stroke={dark} strokeWidth="3" />
      <circle cx="74" cy="29" r="8" fill="#fef3c7" stroke={dark} strokeWidth="3" />
      <rect x="36" y="46" width="48" height="30" rx="12" fill="#1c1208" />
      <Face mood={mood} cx={60} cy={59} scale={0.85} eyeColor="#fde68a" />
      {/* scarf */}
      <path d="M30 82 h60 v8 h-60z" fill="#38bdf8" />
      <path d="M78 88 l8 16 l-8 -2z" fill="#38bdf8" />
      <rect className="arm-left" x="12" y="62" width="16" height="10" rx="5" fill={dark} />
      <g className="arm-right">
        <rect x="92" y="62" width="16" height="10" rx="5" fill={dark} />
      </g>
      <rect x="38" y="98" width="14" height="12" rx="5" fill={dark} />
      <rect x="68" y="98" width="14" height="12" rx="5" fill={dark} />
    </g>
  );
}

function Loop({ mood, color, dark }: { mood: Mood; color: string; dark: string }) {
  return (
    <g>
      <path
        d="M8 50 h16 M4 62 h18 M10 74 h14"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.6"
      />
      <circle cx="62" cy="60" r="38" fill={color} />
      <circle cx="62" cy="60" r="38" fill="url(#shine)" />
      <circle cx="62" cy="60" r="24" fill="#1f0a16" />
      <Face mood={mood} cx={62} cy={57} scale={0.8} eyeColor="#fbcfe8" />
      <path d="M40 24 q22 -16 44 0" stroke={dark} strokeWidth="5" fill="none" strokeLinecap="round" />
      <g className="arm-right">
        <rect x="96" y="56" width="16" height="9" rx="4.5" fill={dark} />
      </g>
      <rect className="arm-left" x="10" y="86" width="0" height="0" />
      <path d="M40 96 h20 v8 h-24 q-4 0 -4 -4z" fill="#f8fafc" />
      <path d="M66 96 h20 v8 h-24 q-4 0 -4 -4z" fill="#f8fafc" />
      <path d="M40 100 h18 M66 100 h18" stroke={dark} strokeWidth="2" />
    </g>
  );
}

function NodeChar({ mood, color, dark }: { mood: Mood; color: string; dark: string }) {
  return (
    <g>
      <polygon points="60,22 96,42 96,82 60,102 24,82 24,42" fill={color} />
      <polygon points="60,22 96,42 96,82 60,102 24,82 24,42" fill="url(#shine)" />
      {/* hard hat */}
      <path d="M34 30 q26 -26 52 0 z" fill="#facc15" />
      <rect x="28" y="28" width="64" height="6" rx="3" fill="#eab308" />
      <rect x="36" y="44" width="48" height="32" rx="12" fill="#03140e" />
      <Face mood={mood} cx={60} cy={58} scale={0.85} />
      {/* node arms: connected dots */}
      <line x1="24" y1="62" x2="8" y2="70" stroke={dark} strokeWidth="3" />
      <circle className="arm-left" cx="8" cy="70" r="5" fill={dark} />
      <g className="arm-right">
        <line x1="96" y1="62" x2="112" y2="54" stroke={dark} strokeWidth="3" />
        <circle cx="112" cy="54" r="5" fill={dark} />
      </g>
      <rect x="42" y="100" width="12" height="12" rx="4" fill={dark} />
      <rect x="66" y="100" width="12" height="12" rx="4" fill={dark} />
    </g>
  );
}

function Pixel({ mood, color, dark }: { mood: Mood; color: string; dark: string }) {
  return (
    <g>
      {/* floating pixel body */}
      <path d="M30 30 h60 v8 h8 v44 h-8 v8 h-12 v8 h-8 v-8 h-40 v-8 h-8 v-44 h8z" fill={color} />
      <path d="M30 30 h60 v8 h8 v44 h-8 v8 h-12 v8 h-8 v-8 h-40 v-8 h-8 v-44 h8z" fill="url(#shine)" />
      {/* mortarboard of pixels */}
      <path d="M36 22 h48 l-24 -10z" fill={dark} />
      <rect x="80" y="22" width="4" height="10" fill="#fde68a" />
      <rect x="34" y="44" width="52" height="32" rx="6" fill="#120a24" />
      {/* glasses */}
      <rect x="40" y="52" width="16" height="12" rx="3" fill="none" stroke="#e9d5ff" strokeWidth="2" />
      <rect x="64" y="52" width="16" height="12" rx="3" fill="none" stroke="#e9d5ff" strokeWidth="2" />
      <path d="M56 58 h8" stroke="#e9d5ff" strokeWidth="2" />
      <Face mood={mood} cx={60} cy={58} scale={0.7} eyeColor="#e9d5ff" />
      <rect className="arm-left" x="16" y="56" width="10" height="10" fill={dark} />
      <g className="arm-right">
        <rect x="94" y="56" width="10" height="10" fill={dark} />
        <rect x="104" y="48" width="6" height="6" fill="#fde68a" />
      </g>
    </g>
  );
}

const BODIES: Record<CharacterId, typeof Byte> = {
  byte: Byte,
  bit: Bit,
  loop: Loop,
  node: NodeChar,
  pixel: Pixel,
};

export interface MascotProps {
  character?: CharacterId;
  mood?: Mood;
  animation?: MascotAnimation;
  size?: number;
  speech?: string | null;
  label?: string;
  className?: string;
  bubbleSide?: 'right' | 'left' | 'top';
}

export function Mascot({
  character = 'byte',
  mood = 'happy',
  animation = 'idle',
  size = 96,
  speech,
  label,
  className,
  bubbleSide = 'right',
}: MascotProps) {
  const c = CREW[character];
  const Body = BODIES[character];
  const anim =
    animation === 'none' ? '' : `anim-${animation === 'hint' || animation === 'point' ? 'wave' : animation}`;
  return (
    <div
      className={clsx(
        'relative inline-flex items-end gap-2',
        bubbleSide === 'left' && 'flex-row-reverse',
        bubbleSide === 'top' && 'flex-col-reverse items-center',
        className,
      )}
    >
      <svg
        role="img"
        aria-label={label ?? `${c.name} the ${c.role.toLowerCase()} looks ${mood}`}
        viewBox="0 0 120 120"
        width={size}
        height={size}
        className={clsx('shrink-0 overflow-visible', anim)}
        data-character={character}
        data-mood={mood}
        data-animation={animation}
      >
        <defs>
          <linearGradient id="shine" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#fff" stopOpacity="0.28" />
            <stop offset="0.5" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
        </defs>
        <ellipse cx="60" cy="116" rx="30" ry="4" fill="#000" opacity="0.35" />
        <Body mood={mood} color={c.color} dark={c.dark} />
        {animation === 'sleep' && (
          <text className="zz" x="96" y="20" fill="#cbd5e1" fontSize="14" fontWeight="700">
            z
          </text>
        )}
        {animation === 'loading' && (
          <circle
            className="spin"
            style={{ transformOrigin: '60px 60px' }}
            cx="60"
            cy="4"
            r="4"
            fill={c.color}
          />
        )}
        {(animation === 'think' || mood === 'thinking') && (
          <g fill="#e2e8f0" opacity="0.8">
            <circle cx="104" cy="22" r="3" />
            <circle cx="112" cy="12" r="4.5" />
          </g>
        )}
      </svg>
      {speech && (
        <div
          role="status"
          aria-live="polite"
          className="relative mb-6 max-w-[260px] rounded-2xl border border-white/10 bg-ink-800/95 px-3 py-2 text-sm text-slate-100 shadow-lg"
          style={{ borderColor: `${c.color}55` }}
        >
          <span
            className="mb-0.5 block text-[11px] font-semibold uppercase tracking-wide"
            style={{ color: c.color }}
          >
            {c.name}
          </span>
          {speech}
        </div>
      )}
    </div>
  );
}
