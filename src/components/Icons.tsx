import type { ReactNode } from 'react'

export function Icon({ name, size = 24, color = 'currentColor' }: { name: string; size?: number; color?: string }) {
  const p: Record<string, ReactNode> = {
    home: (
      <path
        d="M3 10.5L12 3l9 7.5v9.5a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1v-9.5z"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
    garden: (
      <>
        <path
          d="M12 21v-7M12 14c-3.5-3-4-8 1-10 4 3 3 8-1 10zM12 17c3.5-3 4-6 0-8"
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </>
    ),
    pill: (
      <>
        <rect
          x="4"
          y="4"
          width="16"
          height="16"
          rx="4"
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path d="M12 8v8M8 12h8" stroke={color} strokeWidth="2" strokeLinecap="round" />
      </>
    ),
    people: (
      <>
        <circle cx="9" cy="8" r="3.5" fill="none" stroke={color} strokeWidth="2" />
        <path d="M3 19c0-3.3 2.7-6 6-6s6 2.7 6 6" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
        <circle cx="16.5" cy="8.5" r="2.5" fill="none" stroke={color} strokeWidth="1.8" />
        <path d="M16 13.5c2.2.3 4 2.1 4 4.5" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      </>
    ),
    mic: (
      <>
        <rect x="9" y="3" width="6" height="11" rx="3" fill="none" stroke={color} strokeWidth="2" />
        <path d="M5 10a7 7 0 0 0 14 0M12 18v3M8 21h8" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
      </>
    ),
    speaker: (
      <>
        <path d="M4 10v4h3l4 3.5v-11L7 10H4z" fill={color} />
        <path d="M15 9.5a3.5 3.5 0 0 1 0 5M17.5 7a7 7 0 0 1 0 10" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
      </>
    ),
    speakerMute: (
      <>
        <path d="M4 10v4h3l4 3.5v-11L7 10H4z" fill={color} />
        <line x1="16" y1="9" x2="22" y2="15" stroke={color} strokeWidth="2" strokeLinecap="round" />
        <line x1="22" y1="9" x2="16" y2="15" stroke={color} strokeWidth="2" strokeLinecap="round" />
      </>
    ),
    back: <path d="M15 6l-6 6 6 6" fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />,
    bell: (
      <>
        <path
          d="M6 9a6 6 0 0 1 12 0c0 4 1.5 5.5 2 6H4c.5-.5 2-2 2-6z"
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path d="M10 18a2.2 2.2 0 0 0 4 0" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
      </>
    ),
    volume: (
      <>
        <path d="M4 10v4h3l4 3.5v-11L7 10H4z" fill={color} />
        <path d="M15 9.5a3.5 3.5 0 0 1 0 5M17.5 7a7 7 0 0 1 0 10" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
      </>
    ),
    close: <path d="M6 6l12 12M18 6L6 18" fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" />,
    check: <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />,
    plus: <path d="M12 5v14M5 12h14" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" />,
    camera: (
      <>
        <path
          d="M4 8a2 2 0 0 1 2-2h2.5L10 4h4l1.5 2H18a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8z"
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <circle cx="12" cy="13" r="3.5" fill="none" stroke={color} strokeWidth="2" />
      </>
    ),
    cameraPlus: (
      <>
        <path
          d="M3 9a2 2 0 0 1 2-2h2.5L9 5h5l1.5 2H18a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9z"
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <circle cx="11.5" cy="13.5" r="3.5" fill="none" stroke={color} strokeWidth="2" />
        <path d="M18 4v4M16 6h4" stroke={color} strokeWidth="2" strokeLinecap="round" />
      </>
    ),
    lock: (
      <>
        <rect x="5" y="11" width="14" height="10" rx="2.5" fill="none" stroke={color} strokeWidth="2" />
        <path d="M8 11V7a4 4 0 0 1 8 0v4" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
      </>
    ),
    shield: (
      <path
        d="M12 3l7 3v6c0 5-3.5 9.5-7 11-3.5-1.5-7-6-7-11V6l7-3z"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
    leaf: (
      <path
        d="M5 20c0-8 6-15 14-15 0 8-7 15-14 15zm0 0c5-5 9-9 14-15"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
    star: (
      <path
        d="M12 3l2.8 6 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.5l1.1-6.2L3 9.9l6.2-.9L12 3z"
        fill={color}
      />
    ),
    drop: (
      <path
        d="M12 3.5C12 3.5 6 10.5 6 15a6 6 0 0 0 12 0c0-4.5-6-11.5-6-11.5z"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
      />
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" fill="none" stroke={color} strokeWidth="2" />
        <path d="M12 7v5l3.5 2" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
      </>
    ),
    calendar: (
      <>
        <rect x="3" y="4" width="18" height="17" rx="3" fill="none" stroke={color} strokeWidth="2" />
        <path d="M3 9h18M8 2v4M16 2v4" stroke={color} strokeWidth="2" strokeLinecap="round" />
      </>
    ),
    user: (
      <>
        <circle cx="12" cy="8" r="4" fill="none" stroke={color} strokeWidth="2" />
        <path d="M4 20c0-4.4 3.6-8 8-8s8 3.6 8 8" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
      </>
    ),
    arrowRight: <path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />,
    backspace: (
      <>
        <path d="M7 6l-5 6 5 6h14a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2H7z" fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
        <path d="M12 9l5 5M17 9l-5 5" stroke={color} strokeWidth="2" strokeLinecap="round" />
      </>
    ),
    wind: (
      <>
        <path d="M3 8h12a3 3 0 1 0-3-3" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
        <path d="M3 13h16a2.5 2.5 0 1 0-2.5-2.5" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
        <path d="M3 18h9a2 2 0 1 0-2-2" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
      </>
    ),
    help: (
      <>
        <circle cx="12" cy="12" r="9" fill="none" stroke={color} strokeWidth="2" />
        <path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 1.5-2 2-2 3M12 17h.01" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
      </>
    ),
    upload: (
      <>
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </>
    ),
  }

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={{ display: 'block', flexShrink: 0 }}>
      {p[name] ?? null}
    </svg>
  )
}
