import { ButtonHTMLAttributes, ReactNode } from 'react'
import { classNames } from '../../utils/helpers'
import styles from './Button.module.css'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'google' | 'icon' | 'taskAction'
  size?: 'default' | 'full' | 'small'
  className?: string
  children: ReactNode
  archive?: boolean
  restore?: boolean
}

export default function Button({
  variant = 'secondary',
  size = 'default',
  className,
  children,
  archive,
  restore,
  ...props
}: ButtonProps) {
  const classes = classNames(
    styles.button,
    styles[variant],
    size !== 'default' && styles[size],
    archive && styles.archive,
    restore && styles.restore,
    className
  )

  return (
    <button className={classes} {...props}>
      {children}
    </button>
  )
}
