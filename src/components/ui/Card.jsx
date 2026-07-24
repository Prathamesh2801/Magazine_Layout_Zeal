export default function Card({ className = '', children, ...props }) {
  return (
    <div
      className={`rounded-2xl border border-line bg-paper-100/80 backdrop-blur-sm
        shadow-soft ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}
