import { FileText, Printer, Sparkles } from 'lucide-react'
import { ASSESSMENT_FORMATS, BLOOM_LEVELS, QUESTION_TYPES } from '../data/options'
import type { GeneratedPaper, PaperSet } from '../types/paper'

type Props = {
  paper: GeneratedPaper | null
  papers: GeneratedPaper[]
  onSelectSet: (set: PaperSet) => void
  questionCount: number
  estimatedMarks: number
  durationMinutes: number
  bloomsLevels: string[]
  examDate: string
  examTime: string
  onExamDateChange: (date: string) => void
  onExamTimeChange: (time: string) => void
}

function formatExamDate(date: string) {
  if (!date) return 'Not set'
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'long' }).format(new Date(`${date}T00:00:00`))
}

function QuestionOutcomeBox({
  courseOutcome,
}: {
  courseOutcome: string
}) {
  return (
    <span className="question-outcome-box" aria-label={courseOutcome}>{courseOutcome}</span>
  )
}

export function PaperPreview({
  paper,
  papers,
  onSelectSet,
  questionCount,
  estimatedMarks,
  durationMinutes,
  bloomsLevels,
  examDate,
  examTime,
  onExamDateChange,
  onExamTimeChange,
}: Props) {
  return (
    <section className="print-preview rise-in xl:sticky xl:top-6" aria-label="Question paper preview">
      <div className="no-print mb-3 flex items-center justify-between px-1">
        <div>
          <p className="text-[10px] font-bold tracking-[0.14em] text-[#4c9a76]">LIVE PREVIEW</p>
          <h2 className="mt-1 text-[17px] font-semibold">{paper ? paper.curriculum === 'College / University' || papers.length < 2 ? 'Question paper' : `Question paper · Set ${paper.set}` : 'Your paper'}</h2>
        </div>
        <button className="inline-flex items-center gap-2 rounded-md border border-[#dce5df] bg-white px-3 py-2 text-xs font-semibold text-[#53675b] transition hover:border-[#abc9b5] hover:text-[#286748] disabled:cursor-not-allowed disabled:opacity-40" type="button" disabled={!paper} onClick={() => window.print()}>
            <Printer size={14} /> {paper && papers.length > 1 && paper.curriculum !== 'College / University' ? `Print Set ${paper.set}` : 'Print paper'}
        </button>
      </div>

        {papers.length > 1 && (
          <div className="no-print mb-3 grid grid-cols-2 gap-2" role="group" aria-label="Question paper sets">
            {papers.map((setPaper) => (
              <button
                key={setPaper.set}
                className={`rounded-lg border px-3 py-2.5 text-left transition ${paper?.set === setPaper.set ? 'border-[#79ad8c] bg-[#edf6f0] text-[#286748]' : 'border-[#dce5df] bg-white text-[#68786e] hover:border-[#abc9b5]'}`}
                type="button"
                aria-pressed={paper?.set === setPaper.set}
                onClick={() => onSelectSet(setPaper.set)}
              >
                <span className="block text-xs font-bold">Set {setPaper.set}</span>
                <span className="mt-1 block text-[10px]">{setPaper.set === 'B' ? 'Hard · indirect questions' : 'Mixed · direct and indirect'}</span>
              </button>
            ))}
          </div>
        )}

      <div className="no-print mb-4 grid grid-cols-2 gap-3 rounded-lg border border-[#e0e8e3] bg-white px-4 py-3">
        <p className="col-span-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[#718077]">Exam date &amp; time</p>
        <label className="space-y-1 text-[10px] font-semibold text-[#617067]">
          Date
          <input className="block w-full rounded-md border border-[#dce5df] bg-white px-2 py-2 text-xs font-medium text-[#31453a] outline-none focus:border-[#5eaa83] focus:ring-2 focus:ring-[#5eaa83]/15" type="date" value={examDate} onChange={(event) => onExamDateChange(event.target.value)} />
        </label>
        <label className="space-y-1 text-[10px] font-semibold text-[#617067]">
          Start time
          <input className="block w-full rounded-md border border-[#dce5df] bg-white px-2 py-2 text-xs font-medium text-[#31453a] outline-none focus:border-[#5eaa83] focus:ring-2 focus:ring-[#5eaa83]/15" type="time" value={examTime} onChange={(event) => onExamTimeChange(event.target.value)} />
        </label>
      </div>

      <div className={`print-paper min-h-[420px] overflow-hidden rounded-xl border border-[#dfe7e2] bg-white shadow-[0_8px_28px_rgba(29,56,43,0.05)]${paper?.curriculum === 'College / University' ? ' print-paper-college' : ''}`}>
        {paper ? (
          <div className="p-6 sm:p-8">
            <div className={`text-center${paper.curriculum === 'College / University' ? ' college-paper-header' : ''}`}>
              <div className="relative flex min-h-8 items-start justify-center">
              {paper.curriculum === 'College / University' && (
                <p className="college-paper-code">QP Code: {paper.questionPaperCode || 'Not set'}</p>
              )}
                {paper.institutionName && (
                  <h3 className="max-w-[72%] font-display text-2xl font-bold text-[#20372b]">{paper.institutionName}</h3>
                )}
                {paper.curriculum !== 'College / University' && (
                  <p className="absolute right-0 top-0 rounded border border-[#213c30] px-2 py-1 text-right text-[10px] font-bold uppercase tracking-[0.08em] text-[#52645a]">
                    QP Code: {paper.questionPaperCode || 'Not set'}
                  </p>
                )}
              </div>
              {paper.isSchoolPaper && paper.examName && (
                <p className="mt-2 text-base font-bold text-[#35483d]">{paper.examName}</p>
              )}
              {!paper.isSchoolPaper && paper.curriculum === 'College / University' && (
                <>
                  <p className="mt-2 text-base font-bold uppercase tracking-[0.1em] text-[#35483d]">{ASSESSMENT_FORMATS[paper.assessmentType].title}</p>
                  {paper.assessmentType === 'internal' && paper.internalAssessmentType && (
                    <p className="mt-1 text-sm font-bold text-[#35483d]">{paper.internalAssessmentType}</p>
                  )}
                </>
              )}
              <div className="mt-4 overflow-hidden rounded-md border-2 border-[#213c30] text-left text-[11px] text-[#35483d]">
                <div className="grid grid-cols-1 gap-px bg-[#aebbb2] sm:grid-cols-3">
                  <p className="bg-white px-3 py-2.5"><span className="font-bold">Subject name</span><br />{paper.subject || 'Not set'}</p>
                  <p className="bg-white px-3 py-2.5"><span className="font-bold">{paper.codeLabel || 'Course code'}</span><br />{paper.subjectCode || 'Not set'}</p>
                  {paper.gradeLevel && (
                    <p className="bg-white px-3 py-2.5"><span className="font-bold">{paper.isSchoolPaper ? 'Class' : 'Semester'}</span><br />{paper.gradeLevel}{paper.assessmentType === 'internal' && paper.internalAssessmentType ? ` (${paper.internalAssessmentType})` : ''}</p>
                  )}
                  <p className="bg-white px-3 py-2.5"><span className="font-bold">Exam date</span><br />{formatExamDate(examDate)}</p>
                  <p className="bg-white px-3 py-2.5"><span className="font-bold">Duration</span><br />{paper.durationMinutes} minutes</p>
                  <p className="bg-white px-3 py-2.5"><span className="font-bold">Total marks</span><br />{paper.totalMarks}</p>
                </div>
              </div>
              {!paper.isSchoolPaper && paper.curriculum !== 'College / University' && paper.assessmentType !== 'semester' && (
                <p className="mt-3 text-xs font-bold uppercase tracking-[0.12em] text-[#52645a]">
                  {paper.title.split(' · ').slice(-2).join(' · ')}
                </p>
              )}
            </div>

            {[...new Set(paper.questions.map((question) => question.section))].map((section) => (
              <section key={section} className={`mt-5${paper.curriculum === 'College / University' ? ' college-paper-section' : ''}`}>
                <h4 className="mb-1 border-b border-[#9ba99f] pb-2 text-xs font-bold uppercase tracking-[0.1em] text-[#42594b]">{paper.curriculum === 'College / University' ? section.replace(/^Section ([A-Z]) · /, 'PART $1 — ') : section}</h4>
                <ol className="divide-y divide-[#edf0ee]">
                  {paper.questions.map((question, index) => question.section === section && (
                <li key={`${question.question}-${index}`} value={index + 1} className="py-4">
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm leading-6 text-[#2e4035]">
                          <span className="mr-2 font-bold text-[#4a8b66]">{index + 1}{question.eitherOrQuestion ? ' a' : ''}.</span>
                          {question.question}
                        </p>
                        {question.options?.length > 0 && (
                          <ol className="mt-2 grid gap-1.5 pl-1 text-xs leading-5 text-[#6c7b72] sm:grid-cols-2">
                            {question.options.map((option, optionIndex) => <li key={`${option}-${optionIndex}`}>{String.fromCharCode(65 + optionIndex)}. {option}</li>)}
                          </ol>
                        )}
                      </div>
                      <div className="question-meta-rail">
                        <QuestionOutcomeBox courseOutcome={question.courseOutcome ?? `CO${question.unitNumber ?? Math.min(5, Math.floor(index * 5 / paper.questions.length) + 1)}`} />
                        <span className="question-marks">({question.marks} mark{question.marks === 1 ? '' : 's'})</span>
                      </div>
                    </div>
                    {question.eitherOrQuestion && (
                      <>
                        <p className="text-center text-[10px] font-bold uppercase tracking-[0.14em] text-[#617067]">OR</p>
                        <div className="flex items-start gap-3">
                          <p className="min-w-0 flex-1 text-sm leading-6 text-[#2e4035]">
                            <span className="mr-2 font-bold text-[#4a8b66]">{index + 1} b.</span>
                            {question.eitherOrQuestion}
                          </p>
                          <div className="question-meta-rail">
                            <QuestionOutcomeBox courseOutcome={question.eitherOrCourseOutcome ?? question.courseOutcome ?? `CO${question.unitNumber ?? Math.min(5, Math.floor(index * 5 / paper.questions.length) + 1)}`} />
                            <span className="question-marks">({question.marks} marks)</span>
                          </div>
                        </div>
                      </>
                    )}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="no-print rounded bg-[#f1f5f2] px-1.5 py-0.5 text-[9px] font-semibold text-[#6c7a71]">{QUESTION_TYPES.find((option) => option.id === question.type)?.label ?? `${question.marks}-mark question`}</span>
                      <span className="no-print rounded bg-[#edf4ff] px-1.5 py-0.5 text-[9px] font-semibold text-[#55749d]">{question.bloomLevel}</span>
                    </div>
                    {question.answer && <details className="no-print text-xs text-[#55705f]"><summary className="w-fit cursor-pointer font-semibold">Answer key</summary><p className="mt-1 leading-5">{question.answer}</p></details>}
                    {question.eitherOrAnswer && <details className="no-print text-xs text-[#55705f]"><summary className="w-fit cursor-pointer font-semibold">Alternative answer key</summary><p className="mt-1 leading-5">{question.eitherOrAnswer}</p></details>}
                  </div>
                </li>
                  ))}
                </ol>
              </section>
            ))}
          </div>
        ) : (
          <div className="p-5 sm:p-6">
            <div className="flex items-center justify-between border-b border-[#edf0ee] pb-4">
              <div className="flex items-center gap-2.5">
                <span className="grid size-9 place-items-center rounded-lg bg-[#edf5f0] text-[#448563]"><FileText size={18} /></span>
                <div>
                  <p className="text-sm font-bold text-[#31453a]">Paper overview</p>
                  <p className="mt-0.5 text-[10px] text-[#89958e]">Updates as you configure</p>
                </div>
              </div>
              <Sparkles size={16} className="text-[#d78d5d]" />
            </div>

            <div className="mt-5 grid grid-cols-3 divide-x divide-[#e8eeea] rounded-lg border border-[#e8eeea] py-3 text-center">
              <div><p className="text-xl font-bold text-[#315d43]">{questionCount}</p><p className="mt-1 text-[10px] font-medium text-[#839087]">Questions</p></div>
              <div><p className="text-xl font-bold text-[#315d43]">{estimatedMarks}</p><p className="mt-1 text-[10px] font-medium text-[#839087]">Est. marks</p></div>
              <div><p className="text-xl font-bold text-[#315d43]">{durationMinutes || 0}</p><p className="mt-1 text-[10px] font-medium text-[#839087]">Minutes</p></div>
            </div>

            <div className="mt-5">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-xs font-bold text-[#52645a]">Thinking skills</h3>
                <span className="text-[10px] text-[#839087]">{bloomsLevels.length} of 6 levels</span>
              </div>
              <div className="flex h-2 overflow-hidden rounded-full bg-[#eef2ef]">
                {BLOOM_LEVELS.map((level) => <span key={level.name} className={`flex-1 border-r border-white/70 transition-colors ${bloomsLevels.includes(level.name) ? level.color.split(' ')[0] : ''}`} />)}
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {bloomsLevels.map((level) => <span key={level} className="rounded bg-[#f1f5f2] px-2 py-1 text-[10px] font-medium text-[#66756c]">{level}</span>)}
                {bloomsLevels.length === 0 && <span className="text-[10px] text-[#9aa69f]">Select at least one level</span>}
              </div>
            </div>

            <div className="mt-6 rounded-lg border border-dashed border-[#dce6df] bg-[#f8faf8] px-4 py-8 text-center">
              <span className="mx-auto grid size-10 place-items-center rounded-full bg-white text-[#5c9a75] shadow-sm"><FileText size={18} /></span>
              <p className="mt-3 text-sm font-semibold text-[#4e6255]">Ready when you are</p>
              <p className="mx-auto mt-1 max-w-[240px] text-xs leading-5 text-[#8a978f]">Generated questions and the printable exam layout will appear here.</p>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}