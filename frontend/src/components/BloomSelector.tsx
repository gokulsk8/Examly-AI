import { Check } from 'lucide-react'
import { BLOOM_LEVELS } from '../data/options'

type Props = {
  levels: string[]
  onToggle: (level: string) => void
}

export function BloomSelector({ levels, onToggle }: Props) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {BLOOM_LEVELS.map((level) => {
        const selected = levels.includes(level.name)
        return (
          <button key={level.name} className={`flex min-h-[54px] items-center justify-between gap-2 rounded-lg border px-2.5 py-2 text-left transition ${selected ? 'border-[#cbded2] bg-[#f8fbf9]' : 'border-[#e7ece9] bg-white opacity-65 hover:opacity-100'}`} type="button" aria-pressed={selected} onClick={() => onToggle(level.name)}>
            <span>
              <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-bold ${level.color}`}>{level.name}</span>
              <span className="mt-1 block text-[10px] text-[#87938b]">{level.verb}</span>
            </span>
            {selected && <Check size={14} className="shrink-0 text-[#438962]" />}
          </button>
        )
      })}
    </div>
  )
}