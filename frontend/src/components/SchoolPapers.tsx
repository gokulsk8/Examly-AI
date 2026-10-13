import { ArrowRight, BookOpenCheck, CalendarDays, GraduationCap } from 'lucide-react'
import { useState } from 'react'
import { SCHOOL_EXAM_TEMPLATES, type SchoolExamId } from '../data/schoolPatterns'

type Props = {
  onChoose: (examId: SchoolExamId, schoolName: string) => void
}

export function SchoolPapers({ onChoose }: Props) {
  const [examType, setExamType] = useState<'quarterly' | 'half-yearly' | 'annual' | 'public'>('quarterly')
  const [schoolName, setSchoolName] = useState('')
  const exams = examType === 'public'
    ? SCHOOL_EXAM_TEMPLATES.filter((exam) => exam.category === 'Tamil Nadu public examination')
    : SCHOOL_EXAM_TEMPLATES.filter((exam) => exam.id === examType)

  return (
    <div className="mx-auto mt-6 max-w-[1120px] space-y-8">
      <section className="rounded-xl border border-[#e0e8e3] bg-white p-5 shadow-[0_4px_20px_rgba(29,56,43,0.035)] sm:p-7">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-[#e8f3ec] text-[#347a55]"><CalendarDays size={20} /></span>
          <div>
            <h2 className="text-lg font-semibold">Create a school question paper</h2>
            <p className="mt-1 text-sm leading-6 text-[#7c8981]">Enter your school name and choose the exam type. You can customize the subject, syllabus, duration, and question mix next.</p>
          </div>
        </div>
        <label className="mt-5 block max-w-xl space-y-1.5 text-xs font-semibold text-[#52645a]">
          School name
          <input className="w-full rounded-lg border border-[#dce5df] bg-white px-3 py-2.5 text-sm font-medium text-[#24352c] outline-none transition focus:border-[#5eaa83] focus:ring-3 focus:ring-[#5eaa83]/15" value={schoolName} onChange={(event) => setSchoolName(event.target.value)} placeholder="e.g. Government Higher Secondary School" required />
        </label>
        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4" role="group" aria-label="School exam type">
          {([
            ['quarterly', 'Quarterly Examination'],
            ['half-yearly', 'Half-yearly Examination'],
            ['annual', 'Annual Examination'],
            ['public', 'Public Examination'],
          ] as const).map(([id, label]) => (
            <button key={id} className={`min-h-14 rounded-lg border px-3 py-3 text-xs font-semibold leading-5 transition sm:text-sm ${examType === id ? 'border-[#79ad8c] bg-[#edf6f0] text-[#286748]' : 'border-[#dce5df] text-[#68786e] hover:border-[#abc9b5]'}`} type="button" aria-pressed={examType === id} onClick={() => setExamType(id)}>
              {label}
            </button>
          ))}
        </div>
        {examType === 'public' && (
          <p className="mt-3 flex items-start gap-2 text-xs leading-5 text-[#7c8981]"><GraduationCap size={15} className="mt-0.5 shrink-0 text-[#94652b]" />Tamil Nadu SSLC and HSE templates are editable starters. Check the latest subject-specific public-exam blueprint before use.</p>
        )}
        <div className={`mt-5 grid gap-3 ${examType === 'public' ? 'md:grid-cols-2' : 'max-w-xl'}`}>
          {exams.map((exam) => (
            <ExamCard key={exam.id} examId={exam.id} title={exam.title} description={exam.description} grade={exam.gradeLevel} schoolName={schoolName} disabled={!schoolName.trim()} onChoose={onChoose} />
          ))}
        </div>
      </section>
    </div>
  )
}

type ExamCardProps = {
  examId: SchoolExamId
  title: string
  description: string
  grade: string
  schoolName: string
  disabled: boolean
  onChoose: (examId: SchoolExamId, schoolName: string) => void
}

function ExamCard({ examId, title, description, grade, schoolName, disabled, onChoose }: ExamCardProps) {
  return (
    <article className="flex flex-col rounded-lg border border-[#e4ebe6] bg-[#fcfdfc] p-4">
      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[#558369]">
        <BookOpenCheck size={14} /> {grade}
      </div>
      <h3 className="mt-3 text-sm font-semibold text-[#35483d]">{title}</h3>
      <p className="mt-1 flex-1 text-xs leading-5 text-[#7c8981]">{description}</p>
      <button className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg bg-[#173d32] px-3 py-2.5 text-xs font-semibold text-white transition hover:bg-[#285845] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5eaa83] disabled:cursor-not-allowed disabled:opacity-45" type="button" disabled={disabled} onClick={() => onChoose(examId, schoolName)}>
        Customize paper <ArrowRight size={14} />
      </button>
    </article>
  )
}
