import type { ReactNode } from 'react'

export function Icon({ name, size = 24 }: { name: string; size?: number }) {
  const p: Record<string, ReactNode> = {
    home: <path d="M3 11.5 12 4l9 7.5M5.5 10v9h13v-9" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />,
    garden: (
      <>
        <path d="M12 20v-8m0 0c-3-2.5-5.5-6-5-10 3.5-.5 7 2 5 10Zm0 0c3-2.5 5.5-6 5-10-3.5-.5-7 2-5 10Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12 20c-3 0-5-1.5-5-3m5 3c3 0 5-1.5 5-3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </>
    ),
    pill: (
      <>
        <rect x="3.5" y="9" width="17" height="6" rx="3" fill="none" stroke="currentColor" strokeWidth="1.8" transform="rotate(-35 12 12)" />
        <path d="m8.8 15.2 4.4-3.4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </>
    ),
    people: (
      <>
        <circle cx="9" cy="8.5" r="3" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M3.5 19c.6-3 2.8-4.5 5.5-4.5S13.9 16 14.5 19" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="16.5" cy="9.5" r="2.3" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M16.5 14.6c2.2.2 3.7 1.6 4.2 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </>
    ),
    speaker: (
      <>
        <path d="M4 10v4h3l4 3.5v-11L7 10H4Z" fill="currentColor" />
        <path d="M14 9.5a4 4 0 0 1 0 5M16.5 7a7 7 0 0 1 0 10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </>
    ),
    back: <path d="M14.5 5 8 12l6.5 7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />,
    check: <path d="m5 12.5 4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />,
    plus: <path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />,
    camera: (
      <>
        <rect x="3.5" y="7" width="17" height="12" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="12" cy="13" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M8.5 7l1.4-2h4.2l1.4 2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      </>
    ),
    lock: (
      <>
        <rect x="5.5" y="10.5" width="13" height="8.5" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      </>
    ),
    leaf: <path d="M5 19C5 9 12 5 19 5c0 8-4.5 14-12.5 14H5Zm0 0c1.5-5 5-8.5 9-10.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />,
    star: <path d="m12 4 2.35 4.98 5.65.63-4.2 3.83L17 19l-5-2.85L7 19l1.2-5.56-4.2-3.83 5.65-.63L12 4Z" fill="currentColor" />,
    drop: <path d="M12 3.5S6 10 6 14a6 6 0 0 0 12 0c0-4-6-10.5-6-10.5Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />,
    clock: (
      <>
        <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M12 8v4.5l3 2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </>
    ),
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      {p[name]}
    </svg>
  )
}

export function BrandMark({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <rect width="48" height="48" rx="14" fill="#9e2224" />
      {/* Traditional Muga Golden Silk Cross-Stitch Lotus / Kopou Flower Motif */}
      <rect x="2" y="2" width="44" height="44" rx="12" fill="none" stroke="#c98e34" strokeWidth="1.5" strokeDasharray="3 2" />
      <g fill="#fbf8f2">
        <circle cx="24" cy="14" r="4" />
        <circle cx="24" cy="34" r="4" />
        <circle cx="14" cy="24" r="4" />
        <circle cx="34" cy="24" r="4" />
        <ellipse cx="24" cy="24" rx="7" ry="7" fill="#c98e34" />
      </g>
      <circle cx="24" cy="24" r="3.2" fill="#9e2224" />
    </svg>
  )
}
