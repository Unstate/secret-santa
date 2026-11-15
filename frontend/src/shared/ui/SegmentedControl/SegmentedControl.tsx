import { cx } from '@/shared/lib'
import styles from './SegmentedControl.module.scss'

export interface SegmentedOption<T extends string> {
  value: T
  label: string
}

export interface SegmentedControlProps<T extends string> {
  options: Array<SegmentedOption<T>>
  value: T
  onChange: (value: T) => void
  'aria-label'?: string
  className?: string
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className,
  ...rest
}: SegmentedControlProps<T>) {
  return (
    <div className={cx(styles.control, className)} {...rest}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={cx(styles.option, option.value === value && styles.active)}
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
