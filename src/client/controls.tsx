/**
 * The workbench's own controls.
 *
 * The DSH plugin rules forbid loading a Harness client package as a module:
 * those packages change without notice, a plugin that imports one has no type
 * check on it, and a throwing component blanks the whole slot entry. So the
 * controls are written here, matching the host's markup and behaviour so the
 * workbench feels native, and every colour is a `--dsw-alias-*` token so the
 * host's skin stays the only styling dependency.
 *
 * The class names carry the `psw-` prefix; the host's own names are left
 * alone so the two never collide.
 */
import type { ButtonHTMLAttributes, CSSProperties, InputHTMLAttributes, ReactNode } from 'react'
import styles from './controls.module.css'

/** A plain button. */
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** The button's weight: `primary` for the one main action, `ghost` for the rest. */
  variant?: 'primary' | 'ghost' | 'outline'
  /** The button's size. */
  size?: 'md' | 'sm'
  /** An icon rendered before the label. */
  icon?: ReactNode
  /** Extra class names. */
  className?: string
}

/** A button that looks like the host's. */
export function Button({ variant = 'ghost', size = 'md', icon, className, children, ...rest }: ButtonProps) {
  return (
    <button
      type="button"
      className={[styles.button, styles[variant], styles[size], className].filter(Boolean).join(' ')}
      {...rest}
    >
      {icon !== undefined ? <span className={styles.buttonIcon}>{icon}</span> : null}
      {children}
    </button>
  )
}

/** A text field that looks like the host's. */
export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** An icon rendered inside the field's leading edge. */
  icon?: ReactNode
  /** Extra class names. */
  className?: string
}

/** A text field. */
export function Input({ icon, className, ...rest }: InputProps) {
  return (
    <span className={styles.inputWrap}>
      {icon !== undefined ? <span className={styles.inputIcon}>{icon}</span> : null}
      <input className={[styles.input, className].filter(Boolean).join(' ')} {...rest} />
    </span>
  )
}

/** A checkbox that looks like the host's. */
export interface CheckboxProps {
  /** Whether the box is ticked. */
  checked: boolean
  /** Called with the next state. */
  onChange: (next: boolean) => void
  /** The label beside the box. */
  label: string
  /** Whether the box refuses interaction. */
  disabled?: boolean
  /** Extra class names. */
  className?: string
}

/** A checkbox. */
export function Checkbox({ checked, onChange, label, disabled, className }: CheckboxProps) {
  return (
    <label className={[styles.checkbox, className].filter(Boolean).join(' ')}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.currentTarget.checked)}
      />
      <span>{label}</span>
    </label>
  )
}

/** A switch that looks like the host's. */
export interface SwitchProps {
  /** Whether the switch is on. */
  checked: boolean
  /** Called with the next state. */
  onChange: (next: boolean) => void
  /** The switch's accessible name. */
  label: string
  /** Whether the switch refuses interaction. */
  disabled?: boolean
  /** Extra class names. */
  className?: string
}

/**
 * A switch.
 *
 * The state lives in `aria-checked` and the CSS keys off it, so the visual
 * state and the announced state can never drift apart.
 */
export function Switch({ checked, onChange, label, disabled, className }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      className={[styles.switch, className].filter(Boolean).join(' ')}
      onClick={() => onChange(!checked)}
    >
      <span className={styles.switchThumb} />
    </button>
  )
}

/** One choice in a segmented control. */
export interface SegmentedOption<Value extends string> {
  /** The value the choice stands for. */
  value: Value
  /** The choice's label. */
  label: string
  /** The choice's tooltip. */
  title?: string
  /** Whether the choice is refused. */
  disabled?: boolean
}

/** A segmented control that looks like the host's. */
export interface SegmentedControlProps<Value extends string> {
  /** The control's id, used to wire the tab/panel aria attributes. */
  id: string
  /** The chosen value. */
  value: Value
  /** The choices. */
  options: readonly SegmentedOption<Value>[]
  /** Called with the newly chosen value. */
  onChange: (next: Value) => void
  /** The control's accessible name. */
  label: string
  /** Whether the control refuses interaction. */
  disabled?: boolean
  /** Extra class names. */
  className?: string
}

/** A segmented control. */
export function SegmentedControl<Value extends string>({
  id,
  value,
  options,
  onChange,
  label,
  disabled,
  className,
}: SegmentedControlProps<Value>) {
  const index = Math.max(0, options.findIndex((option) => option.value === value))
  return (
    <div
      role="tablist"
      aria-label={label}
      className={[styles.segmented, className].filter(Boolean).join(' ')}
      style={{ '--psw-segment-count': options.length, '--psw-segment-index': index } as CSSProperties}
    >
      <span className={styles.segmentedIndicator} aria-hidden="true" />
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="tab"
          id={`${id}-${option.value}`}
          aria-controls={`${id}-${option.value}-panel`}
          aria-selected={option.value === value}
          tabIndex={option.value === value ? 0 : -1}
          disabled={disabled === true || option.disabled === true}
          title={option.title}
          className={styles.segmentedItem}
          onClick={() => onChange(option.value)}
          onKeyDown={(event) => {
            if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return
            event.preventDefault()
            const step = event.key === 'ArrowRight' ? 1 : -1
            const next = options[(index + step + options.length) % options.length]
            if (next !== undefined) onChange(next.value)
          }}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

/** A small tag that looks like the host's. */
export interface TagProps {
  /** The tag's tone. */
  tone?: 'neutral' | 'info' | 'success' | 'warning' | 'danger'
  /** The tag's content. */
  children?: ReactNode
  /** Extra class names. */
  className?: string
}

/** A small tag. */
export function Tag({ tone = 'neutral', children, className }: TagProps) {
  return (
    <span className={[styles.tag, styles[`tag${tone[0]!.toUpperCase()}${tone.slice(1)}`], className].filter(Boolean).join(' ')}>
      {children}
    </span>
  )
}
