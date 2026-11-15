import styles from './Snowfall.module.scss'

interface Flake {
  left: number
  size: number
  fall: number
  delay: number
  drift: number
  opacity: number
}

const FLAKES: Flake[] = Array.from({ length: 40 }, () => ({
  left: Math.random() * 100,
  size: 7 + Math.random() * 9,
  fall: 8 + Math.random() * 9,
  delay: -Math.random() * 17,
  drift: (Math.random() - 0.5) * 60,
  opacity: 0.35 + Math.random() * 0.55,
}))

export function Snowfall() {
  return (
    <div className={styles.snowfall} aria-hidden="true">
      {FLAKES.map((flake, index) => (
        <span
          key={index}
          className={styles.fall}
          style={{
            left: `${flake.left}%`,
            animationDuration: `${flake.fall}s`,
            animationDelay: `${flake.delay}s`,
          }}
        >
          <span
            className={styles.sway}
            style={
              {
                fontSize: flake.size,
                opacity: flake.opacity,
                '--drift': `${flake.drift}px`,
                animationDuration: `${2.5 + (flake.size % 3)}s`,
              } as React.CSSProperties
            }
          >
            ❄
          </span>
        </span>
      ))}
    </div>
  )
}
