import { cx } from '@/shared/lib'
import styles from './Garland.module.scss'

// Цвета лампочек — токены темы: акцент-красный, золото, ёлка-зелёный, морозный
// синий. Порядок подобран, чтобы соседние не сливались.
const COLORS = ['var(--accent)', 'var(--gold)', 'var(--green)', 'var(--primary)']

const WIRE_WIDTH = 1200
const HEIGHT = 44
const AMPLITUDE = 7
const WAVES = 5
const BULB_COUNT = 28

// Волна провода: в viewBox Y совпадает с пикселями (высота фиксирована),
// поэтому лампочки можно позиционировать по той же формуле.
function wireY(x: number): number {
  return 15 + Math.sin((x / WIRE_WIDTH) * WAVES * 2 * Math.PI) * AMPLITUDE
}

function buildWirePath(): string {
  const points: string[] = []
  for (let x = 0; x <= WIRE_WIDTH; x += 12) {
    points.push(`${x === 0 ? 'M' : 'L'} ${x} ${wireY(x).toFixed(1)}`)
  }
  return points.join(' ')
}

const WIRE_PATH = buildWirePath()

// Гирлянда сверху, как на новогодних дудлах Google: провод-волна и лампочки,
// мягко переливающиеся вразнобой. Чисто декорация — pointer-events нет.
export function Garland({ className }: { className?: string }) {
  return (
    <div className={cx(styles.garland, className)} aria-hidden="true">
      <svg
        className={styles.wire}
        viewBox={`0 0 ${WIRE_WIDTH} ${HEIGHT}`}
        preserveAspectRatio="none"
      >
        <path
          d={WIRE_PATH}
          fill="none"
          stroke="var(--border-strong)"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      {Array.from({ length: BULB_COUNT }, (_, i) => {
        const xShare = i / (BULB_COUNT - 1)
        const x = xShare * WIRE_WIDTH
        return (
          <span
            key={i}
            className={styles.bulbSlot}
            style={{ left: `${xShare * 100}%`, top: wireY(x) }}
          >
            <span className={styles.string} />
            <svg
              className={styles.bulb}
              style={{ color: COLORS[i % COLORS.length], animationDelay: `${(i % 7) * 0.45}s` }}
              viewBox="0 0 12 18"
              width={12}
              height={18}
            >
              <rect x="4" y="0" width="4" height="3.5" rx="1" fill="var(--text-faint)" />
              <path
                d="M6 4 C 9.5 4 11 7 11 9.5 C 11 13 8.8 15.5 6 15.5 C 3.2 15.5 1 13 1 9.5 C 1 7 2.5 4 6 4 Z"
                fill="currentColor"
              />
            </svg>
          </span>
        )
      })}
    </div>
  )
}
