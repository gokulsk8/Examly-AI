import { ChevronDown, ClipboardList } from 'lucide-react'
import { useState } from 'react'
import { ASSESSMENT_FORMATS } from '../data/options'
import { COLLEGE_EXAM_PATTERNS, type CollegePatternId } from '../data/collegePatterns'
import { SCHOOL_EXAM_TEMPLATES, SCHOOL_MAX_MARKS, SCHOOL_QUESTION_TYPE_IDS, type SchoolExamId } from '../data/schoolPatterns'
import type { QuestionTypeId } from '../types/paper'
import { QuestionTypeSelector } from './QuestionTypeSelector'

type Props = {
  patterns: Record<SchoolExamId, Record<QuestionTypeId, number>>
  onChange: (examId: SchoolExamId, type: QuestionTypeId, count: number) => void
  onApply: (examId: SchoolExamId) => void
  collegePatterns: Record<CollegePatternId, Record<QuestionTypeId, number>>
  onCollegeChange: (patternId: CollegePatternId, type: QuestionTypeId, count: number) => void
  onCollegeApply: (patternId: CollegePatternId) => void
}

export function QuestionPatterns({ patterns, onChange, onApply, collegePatterns, onCollegeChange, onCollegeApply }: Props) {
  const [expandedPattern, setExpandedPattern] = useState<SchoolExamId | null>(null)
  const [expandedCollegePattern, setExpandedCollegePattern] = useState<CollegePatternId | null>(null)
  const schoolGroups = [
    { title: 'School term patterns', subtitle: 'Editable starting mixes for common school exams.', ids: ['quarterly', 'half-yearly', 'annual'] as SchoolExamId[] },
    { title: 'Tamil Nadu public-exam patterns', subtitle: 'Separate editable starting mixes for SSLC and HSE.', ids: ['tn-sslc', 'tn-hse'] as SchoolExamId[] },
  ]

  return (
    <div className="mx-auto mt-6 max-w-[1120px] space-y-6">
      <section className="rounded-xl border border-[#e0e8e3] bg-white p-5 shadow-[0_4px_20px_rgba(29,56,43,0.035)] sm:p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">College / university examination patterns</h2>
          <p className="mt-1 text-xs leading-5 text-[#829087]">Choose internal (60 marks) or end-semester (100 marks), then select 14-mark either/or questions or the 7-mark variant.</p>
        </div>
        <div className="space-y-3">
          {COLLEGE_EXAM_PATTERNS.map((pattern) => {
            const counts = collegePatterns[pattern.id]
            const marks = Object.entries(counts).reduce((total, [type, count]) => (
              total + count * ASSESSMENT_FORMATS[pattern.assessmentType].marksPerQuestion[type as QuestionTypeId]
            ), 0)
            const questionCount = Object.values(counts).reduce((total, count) => total + count, 0)
            const expanded = expandedCollegePattern === pattern.id
            const questionTypeIds = pattern.longQuestionMarks === 14
              ? ['one-mark', 'two-mark', 'fourteen-mark'] as QuestionTypeId[]
              : ['one-mark', 'two-mark', 'seven-mark'] as QuestionTypeId[]

            return (
              <article key={pattern.id} className="rounded-lg border border-[#e4ebe6] p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-md bg-[#edf5f0] text-[#398260]"><ClipboardList size={17} /></span>
                    <div>
                      <h3 className="text-sm font-semibold text-[#35483d]">{pattern.title}</h3>
                      <p className="mt-1 text-xs text-[#829087]">{questionCount} questions · {marks}/{pattern.targetMarks} marks{pattern.eitherOr ? ' · One A-or-B choice per 14-mark question' : ''}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button className="inline-flex items-center gap-1.5 rounded-md border border-[#dce5df] px-3 py-2 text-xs font-semibold text-[#52645a] hover:bg-[#f5f8f6]" type="button" aria-expanded={expanded} onClick={() => setExpandedCollegePattern(expanded ? null : pattern.id)}>
                      <ChevronDown size={14} className={expanded ? 'rotate-180 transition-transform' : 'transition-transform'} />
                      {expanded ? 'Close editor' : 'Edit counts'}
                    </button>
                    <button className="rounded-md bg-[#173d32] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#285845] disabled:cursor-not-allowed disabled:opacity-45" type="button" disabled={marks !== pattern.targetMarks} onClick={() => onCollegeApply(pattern.id)}>
                      Use this pattern
                    </button>
                  </div>
                </div>
                {expanded && (
                  <div className="mt-4 border-t border-[#edf0ee] pt-4">
                    <p className="mb-3 text-xs leading-5 text-[#829087]">
                      Adjust the 1-, 2-, and {pattern.longQuestionMarks}-mark counts to exactly {pattern.targetMarks} marks. {pattern.eitherOr ? 'Each 14-mark question prints a different alternative; students answer either one option for the marks shown.' : 'This pattern has no either/or alternatives.'}
                    </p>
                    <QuestionTypeSelector
                      assessmentType={pattern.assessmentType}
                      counts={Object.entries(counts).map(([type, count]) => ({ type: type as QuestionTypeId, count }))}
                      questionTypeIds={questionTypeIds}
                      maxTotalMarks={pattern.targetMarks}
                      onChange={(type, count) => onCollegeChange(pattern.id, type, count)}
                    />
                  </div>
                )}
              </article>
            )
          })}
        </div>
      </section>
      <div className="rounded-lg border border-[#e7d6b5] bg-[#fbf5e8] px-4 py-3 text-xs leading-5 text-[#80633a]">
        These are editable starting patterns, not verified official subject blueprints. Confirm the current school or Tamil Nadu board pattern for your subject before printing.
      </div>
      {schoolGroups.map((group) => (
        <section key={group.title} className="rounded-xl border border-[#e0e8e3] bg-white p-5 shadow-[0_4px_20px_rgba(29,56,43,0.035)] sm:p-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold">{group.title}</h2>
            <p className="mt-1 text-xs text-[#829087]">{group.subtitle}</p>
          </div>
          <div className="space-y-3">
            {group.ids.map((examId) => {
              const exam = SCHOOL_EXAM_TEMPLATES.find((item) => item.id === examId)
              if (!exam) return null
              const counts = patterns[examId]
              const marks = Object.entries(counts).reduce((total, [type, count]) => (
                total + count * ASSESSMENT_FORMATS.assessment.marksPerQuestion[type as QuestionTypeId]
              ), 0)
              const questionCount = Object.values(counts).reduce((total, count) => total + count, 0)
              const expanded = expandedPattern === examId

              return (
                <article key={exam.id} className="rounded-lg border border-[#e4ebe6] p-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-md bg-[#edf5f0] text-[#398260]"><ClipboardList size={17} /></span>
                      <div>
                        <h3 className="text-sm font-semibold text-[#35483d]">{exam.title}</h3>
                        <p className="mt-1 text-xs text-[#829087]">{exam.gradeLevel} · {questionCount} questions · {marks} estimated marks</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button className="inline-flex items-center gap-1.5 rounded-md border border-[#dce5df] px-3 py-2 text-xs font-semibold text-[#52645a] hover:bg-[#f5f8f6]" type="button" aria-expanded={expanded} onClick={() => setExpandedPattern(expanded ? null : examId)}>
                        <ChevronDown size={14} className={expanded ? 'rotate-180 transition-transform' : 'transition-transform'} />
                        {expanded ? 'Close editor' : 'Edit counts'}
                      </button>
                      <button className="rounded-md bg-[#173d32] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#285845]" type="button" onClick={() => onApply(examId)}>
                        Use this pattern
                      </button>
                    </div>
                  </div>
                  {expanded && (
                    <div className="mt-4 border-t border-[#edf0ee] pt-4">
                      <p className="mb-3 text-xs text-[#829087]">Choose a mix of 1-, 2-, 3-, and 5-mark questions. Each pattern is capped at {SCHOOL_MAX_MARKS} marks.</p>
                      <QuestionTypeSelector
                        assessmentType="assessment"
                        counts={Object.entries(counts).map(([type, count]) => ({ type: type as QuestionTypeId, count }))}
                        questionTypeIds={SCHOOL_QUESTION_TYPE_IDS}
                        maxTotalMarks={SCHOOL_MAX_MARKS}
                        onChange={(type, count) => onChange(examId, type, count)}
                      />
                    </div>
                  )}
                </article>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
