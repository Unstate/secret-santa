interface IconProps {
  size?: number
  className?: string
}

export function SnowflakeIcon({ size = 20, className }: IconProps) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} className={className} fill="none" aria-hidden="true">
      <g stroke="currentColor" strokeWidth="3.2" strokeLinecap="round">
        <path d="M24 6v36M8.4 15l31.2 18M39.6 15L8.4 33" />
        <path d="M24 10l-4 4M24 10l4 4M24 38l-4-4M24 38l4-4" />
        <path d="M12 17.5l1 5.5M12 17.5l5.5-1M36 30.5l-1-5.5M36 30.5l-5.5 1" />
        <path d="M36 17.5l-5.5-1M36 17.5l-1 5.5M12 30.5l1-5.5M12 30.5l5.5 1" />
      </g>
    </svg>
  )
}

export function SunIcon({ size = 20, className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="4.5" stroke="currentColor" strokeWidth="2" />
      <g stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M18.7 5.3l-1.8 1.8M7.1 16.9l-1.8 1.8" />
      </g>
    </svg>
  )
}

export function MoonIcon({ size = 20, className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="none" aria-hidden="true">
      <path
        d="M20 13.5A8 8 0 0 1 10.5 4a8 8 0 1 0 9.5 9.5Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M16 5.5h4M18 3.5v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

export function GiftIcon({ size = 20, className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="none" aria-hidden="true">
      <rect x="3.5" y="8.5" width="17" height="4" rx="1.5" stroke="currentColor" strokeWidth="2" />
      <path d="M5 12.5v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6M12 8.5v12" stroke="currentColor" strokeWidth="2" />
      <path
        d="M12 8.5C10 8.5 6.5 8 6.5 5.8 6.5 4.2 7.7 3.5 8.9 3.5c1.9 0 3.1 2.4 3.1 5Zm0 0c2 0 5.5-.5 5.5-2.7 0-1.6-1.2-2.3-2.4-2.3-1.9 0-3.1 2.4-3.1 5Z"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  )
}

export function HashIcon({ size = 20, className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="none" aria-hidden="true">
      <path
        d="M9.5 4L7.5 20M16.5 4l-2 16M4.5 9h16M3.5 15h16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function PlusIcon({ size = 20, className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="none" aria-hidden="true">
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  )
}

export function ArrowRightIcon({ size = 20, className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="none" aria-hidden="true">
      <path d="M4 12h15M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function ArrowLeftIcon({ size = 20, className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="none" aria-hidden="true">
      <path d="M20 12H5M11 6l-6 6 6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function CopyIcon({ size = 20, className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="none" aria-hidden="true">
      <rect x="9" y="9" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="2" />
      <path
        d="M15 5v-.5A1.5 1.5 0 0 0 13.5 3h-9A1.5 1.5 0 0 0 3 4.5v9A1.5 1.5 0 0 0 4.5 15H5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function ShuffleIcon({ size = 20, className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="none" aria-hidden="true">
      <g stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 3.5h4.5V8M20.5 3.5 14 10M20.5 16v4.5H16M14 14l6.5 6.5M3.5 3.5 8 8" />
      </g>
    </svg>
  )
}

export function PencilIcon({ size = 20, className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="none" aria-hidden="true">
      <path
        d="M4 20h4L19.5 8.5a2.1 2.1 0 0 0 0-3L18.5 4.5a2.1 2.1 0 0 0-3 0L4 16v4Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M13.5 6.5l4 4" stroke="currentColor" strokeWidth="2" />
    </svg>
  )
}

export function XIcon({ size = 20, className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="none" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  )
}

export function GearIcon({ size = 20, className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="3.2" stroke="currentColor" strokeWidth="2" />
      <path
        d="M12 3.5l1 2.6a6.2 6.2 0 0 1 2.3 1l2.7-.6 1.5 2.6-1.9 2a6.3 6.3 0 0 1 0 2.6l1.9 2-1.5 2.6-2.7-.6a6.2 6.2 0 0 1-2.3 1l-1 2.7h-3l-1-2.7a6.2 6.2 0 0 1-2.3-1l-2.7.6-1.5-2.6 1.9-2a6.3 6.3 0 0 1 0-2.6l-1.9-2 1.5-2.6 2.7.6a6.2 6.2 0 0 1 2.3-1l1-2.7h3Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function BanIcon({ size = 20, className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="2" />
      <path d="M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

export function ListIcon({ size = 20, className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="none" aria-hidden="true">
      <path d="M9 6h11M9 12h11M9 18h11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="4.8" cy="6" r="1.4" fill="currentColor" />
      <circle cx="4.8" cy="12" r="1.4" fill="currentColor" />
      <circle cx="4.8" cy="18" r="1.4" fill="currentColor" />
    </svg>
  )
}

export function TrashIcon({ size = 20, className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="none" aria-hidden="true">
      <path d="M4.5 6.5h15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path
        d="M9.5 6V4.8a1.3 1.3 0 0 1 1.3-1.3h2.4a1.3 1.3 0 0 1 1.3 1.3V6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M6.5 6.5l.7 11.6a2 2 0 0 0 2 1.9h5.6a2 2 0 0 0 2-1.9l.7-11.6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M10 10.5v5.5M14 10.5v5.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

export function UsersIcon({ size = 20, className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="none" aria-hidden="true">
      <circle cx="9" cy="8" r="3.5" stroke="currentColor" strokeWidth="2" />
      <path d="M3.5 19.5c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M15.5 5a3.5 3.5 0 0 1 0 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M17.5 14.9c1.7.8 2.7 2.4 3 4.6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

export function TreeIcon({ size = 20, className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="none" aria-hidden="true">
      <path
        d="M12 3.5 8.4 9.5h2L7.2 14.5h2.4l-2.6 5h10l-2.6-5h2.4l-3.2-5h2L12 3.5Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M12 19.5v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

export function SparklesIcon({ size = 20, className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="none" aria-hidden="true">
      <path
        d="M12 4.5l1.7 4.3 4.3 1.7-4.3 1.7L12 16.5l-1.7-4.3L6 10.5l4.3-1.7L12 4.5Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <g stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <path d="M18.5 15.5v3.5M16.75 17.25h3.5" />
        <path d="M5.5 16.5v3M4 18h3" />
      </g>
    </svg>
  )
}

export function LinkIcon({ size = 20, className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="none" aria-hidden="true">
      <g stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.5 13.5a4 4 0 0 0 6 .4l2.4-2.4a4 4 0 1 0-5.6-5.6l-1.4 1.3" />
        <path d="M13.5 10.5a4 4 0 0 0-6-.4l-2.4 2.4a4 4 0 1 0 5.6 5.6l1.4-1.3" />
      </g>
    </svg>
  )
}

export function CheckIcon({ size = 20, className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="none" aria-hidden="true">
      <path
        d="M5 12.5l4.2 4.2L18.8 7.3"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
