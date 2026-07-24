const VARIANTS = {
  primary:
    'bg-clay text-white hover:bg-clay-hover shadow-soft disabled:bg-clay/50',
  secondary:
    'bg-paper-200 text-ink hover:bg-paper-300 disabled:opacity-50',
  ghost:
    'bg-transparent text-ink-soft hover:bg-paper-200 disabled:opacity-50',
  outline:
    'border border-line text-ink hover:bg-paper-100 disabled:opacity-50',
}

const SIZES = {
  sm: 'px-3 py-1.5 text-sm gap-1.5',
  md: 'px-5 py-2.5 text-base gap-2',
  lg: 'px-7 py-3.5 text-lg gap-2.5',
}

export default function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  type = 'button',
  children,
  ...props
}) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center rounded-xl font-semibold
        transition-colors duration-150 focus:outline-none focus-visible:ring-2
        focus-visible:ring-clay/60 disabled:cursor-not-allowed
        ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
