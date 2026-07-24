import { FiCheck } from 'react-icons/fi'

const STEPS = ['Upload', 'Compose', 'Export']

export default function Stepper({ current = 0 }) {
  return (
    <ol className="mx-auto flex w-full max-w-md items-center">
      {STEPS.map((label, i) => {
        const done = i < current
        const active = i === current
        return (
          <li key={label} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-1">
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full
                  border text-sm font-semibold transition-colors ${
                    done
                      ? 'border-clay bg-clay text-white'
                      : active
                        ? 'border-clay bg-paper text-clay'
                        : 'border-line bg-paper-100 text-ink-muted'
                  }`}
              >
                {done ? <FiCheck size={16} /> : i + 1}
              </span>
              <span
                className={`text-xs font-medium ${
                  active || done ? 'text-ink' : 'text-ink-muted'
                }`}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <span
                className={`mx-2 -mt-5 h-0.5 flex-1 rounded ${
                  done ? 'bg-clay' : 'bg-line'
                }`}
              />
            )}
          </li>
        )
      })}
    </ol>
  )
}
