'use client'

/** Botón/enlace cuadrado con icono Material (tablas admin). */
export default function IconAction({
  icon,
  title,
  href,
  onClick,
  variant = 'default',
  disabled = false,
  target,
  rel,
  type = 'button',
}) {
  const className = `icon-action-btn icon-action-btn--${variant}`
  const inner = (
    <span className="material-symbols-rounded" aria-hidden>
      {icon}
    </span>
  )

  if (href && !disabled) {
    return (
      <a className={className} href={href} title={title} aria-label={title} target={target} rel={rel}>
        {inner}
      </a>
    )
  }

  return (
    <button
      type={type}
      className={className}
      title={title}
      aria-label={title}
      disabled={disabled}
      onClick={onClick}
    >
      {inner}
    </button>
  )
}
