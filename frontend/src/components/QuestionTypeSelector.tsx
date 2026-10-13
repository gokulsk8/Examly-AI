import { AlignLeft, FileText, ListChecks, ScrollText } from 'lucide-react'
import { ASSESSMENT_FORMATS, QUESTION_TYPES, UNIVERSITY_QUESTION_TYPE_IDS } from '../data/options'
import type { AssessmentType, QuestionCount, QuestionTypeId } from '../types/paper'

const typeIcons = {
  'one-mark': ListChecks,
  'two-mark': AlignLeft,
  'three-mark': AlignLeft,
  'five-mark': FileText,
  'seven-mark': FileText,
  'fourteen-mark': ScrollText,
}

type Props = {
  assessmentType: AssessmentType
  counts: QuestionCount[]
  onChange: (type: QuestionTypeId, count: number) => void
  questionTypeIds?: QuestionTypeId[]
  maxTotalMarks?: number
}

export function QuestionTypeSelector({ assessmentType, counts, onChange, questionTypeIds = UNIVERSITY_QUESTION_TYPE_IDS, maxTotalMarks }: Props) {
  const format = ASSESSMENT_FORMATS[assessmentType]
  const questionTypes = QUESTION_TYPES.filter((type) => questionTypeIds.includes(type.id))
  const selectedMarks = questionTypes.reduce((total, questionType) => {
    const count = counts.find((item) => item.type === questionType.id)?.count ?? 0
    return total + count * format.marksPerQuestion[questionType.id]
  }, 0)
  return (
    <>
      <div className="@container overflow-hidden rounded-lg border border-[#e6ece8] bg-white">
        {questionTypes.map((questionType, index) => {
        const Icon = typeIcons[questionType.id]
        const count = counts.find((item) => item.type === questionType.id)?.count ?? 0
        const selected = count > 0
        const marks = format.marksPerQuestion[questionType.id]
        const marksInOtherTypes = questionTypes.reduce((total, otherType) => {
          if (otherType.id === questionType.id) return total
          const otherCount = counts.find((item) => item.type === otherType.id)?.count ?? 0
          return total + otherCount * format.marksPerQuestion[otherType.id]
        }, 0)
        const maxCount = Math.min(30, maxTotalMarks === undefined
          ? 30
          : Math.floor(Math.max(0, maxTotalMarks - marksInOtherTypes) / marks))

        return (
          <div
            key={questionType.id}
            className={`grid min-h-[76px] grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 px-3 py-3 transition @min-[36rem]:grid-cols-[minmax(0,1fr)_auto_auto] @min-[36rem]:gap-5 @min-[36rem]:px-4 ${selected ? 'bg-[#f5faf6]' : 'bg-white'} ${index < QUESTION_TYPES.length - 1 ? 'border-b border-[#e8eeea]' : ''}`}
          >
            <div className="col-span-2 flex min-w-0 items-center gap-3 @min-[36rem]:col-span-1">
              <span className={`grid size-9 shrink-0 place-items-center rounded-md ${selected ? 'bg-[#e2f1e7] text-[#347a55]' : 'bg-[#f0f3f1] text-[#89958e]'}`}>
                <Icon size={16} />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold leading-5 text-[#35483d]">{questionType.label}</p>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <p className="text-xs leading-4 text-[#87938b]">{questionType.description}</p>
                  <span className="text-[10px] font-semibold text-[#6e8d79]">{marks}m each</span>
                </div>
              </div>
            </div>
            <label className="col-start-1 row-start-2 inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-[#65756b] @min-[36rem]:col-auto @min-[36rem]:row-auto">
                <input
                  className="size-4 shrink-0 cursor-pointer accent-[#438962]"
                  type="checkbox"
                  checked={selected}
                  aria-label={`Include ${questionType.label}`}
                  onChange={(event) => onChange(questionType.id, event.target.checked ? Math.min(1, maxCount) : 0)}
                />
                <span>Include</span>
            </label>
            <label className="col-start-2 row-start-2 inline-flex items-center gap-2 text-xs font-semibold text-[#65756b] @min-[36rem]:col-auto @min-[36rem]:row-auto">
                <span>Count</span>
                <input
                  className="w-16 rounded-md border border-[#dce5df] bg-white px-2 py-1.5 text-center text-sm font-bold text-[#2f6748] outline-none focus:border-[#5eaa83] focus:ring-2 focus:ring-[#5eaa83]/15"
                  type="number"
                  min={0}
                  max={maxCount}
                  value={count}
                  aria-label={`${questionType.marks}-mark question count`}
                  onChange={(event) => {
                    const value = event.target.value === '' ? 0 : Number(event.target.value)
                    onChange(questionType.id, Math.max(0, Math.min(maxCount, value)))
                  }}
                />
            </label>
          </div>
        )
        })}
      </div>
      {maxTotalMarks !== undefined && (
        <p className="mt-2 text-right text-xs font-semibold text-[#65756b]" aria-live="polite">
          {selectedMarks} / {maxTotalMarks} marks
        </p>
      )}
    </>
  )
}