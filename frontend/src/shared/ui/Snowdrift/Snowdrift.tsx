import styles from './Snowdrift.module.scss'

export function Snowdrift() {
  return (
    <div className={styles.drifts} aria-hidden="true">
      <span className={styles.moundLeft} />
      <span className={styles.moundCenter} />
      <span className={styles.moundRight} />
    </div>
  )
}
