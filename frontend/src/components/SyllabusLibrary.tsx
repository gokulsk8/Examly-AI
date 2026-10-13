import { BookOpen, FileText, HardDrive, Trash2, Upload } from 'lucide-react'
import { useRef, useState, type FormEvent } from 'react'
import { CURRICULA } from '../data/topicSuggestions'
import type { DemoRole } from '../types/session'
import type { StoredSyllabus } from '../types/syllabus'

type Props = {
  role: DemoRole
  syllabi: StoredSyllabus[]
  storageReady: boolean
  onUpload: (file: File, title: string, subject: string, subjectCode: string, curriculum: string, gradeLevel: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onUse: (syllabus: StoredSyllabus) => void
}

function formatSize(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function SyllabusLibrary({ role, syllabi, storageReady, onUpload, onDelete, onUse }: Props) {
  const fileInput = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [subject, setSubject] = useState('')
  const [subjectCode, setSubjectCode] = useState('')
  const [curriculum, setCurriculum] = useState<string>('Tamil Nadu State Board')
  const [gradeLevel, setGradeLevel] = useState('Class 12')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const isAdmin = role === 'admin'

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!file) {
      setError('Choose a syllabus file to upload.')
      return
    }

    setError('')
    setIsSaving(true)
    try {
      await onUpload(file, title, subject, subjectCode, curriculum, gradeLevel)
      setFile(null)
      setTitle('')
      setSubject('')
      setSubjectCode('')
      setCurriculum('Tamil Nadu State Board')
      setGradeLevel('Class 12')
      if (fileInput.current) fileInput.current.value = ''
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Could not save this syllabus.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="mx-auto mt-6 max-w-[1440px] space-y-5">
      <section className="rounded-xl border border-[#e0e8e3] bg-white p-5 shadow-[0_4px_20px_rgba(29,56,43,0.035)] sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold tracking-[0.14em] text-[#4c9a76]">{isAdmin ? 'ADMIN WORKSPACE' : 'YOUR WORKSPACE'}</p>
            <h2 className="mt-1.5 text-[19px] font-semibold">Syllabus upload dashboard</h2>
            <p className="mt-1.5 max-w-2xl text-xs leading-5 text-[#7f8d84]">Upload a syllabus document, tag it with its curriculum and class, then use its extracted topics to build a paper.</p>
          </div>
          <span className="hidden items-center gap-1.5 rounded-full bg-[#edf5f0] px-3 py-1.5 text-[10px] font-semibold text-[#468260] sm:flex"><HardDrive size={13} /> IndexedDB</span>
        </div>

        {!storageReady && <p className="mt-4 rounded-lg border border-[#f0c9bb] bg-[#fff5f0] px-3 py-2.5 text-xs text-[#9c4d36]">Browser storage is unavailable. Check private browsing settings or storage permissions.</p>}

        <form className="mt-6 border-t border-[#edf0ee] pt-5" onSubmit={handleUpload}>
            <h3 className="text-sm font-semibold text-[#35483d]">Add a syllabus</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <label className="space-y-1.5 text-xs font-semibold text-[#52645a]">
                Syllabus title
                <input className="w-full rounded-lg border border-[#dce5df] px-3 py-2.5 text-sm font-medium outline-none focus:border-[#5eaa83] focus:ring-3 focus:ring-[#5eaa83]/15" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Unit 1: Data Structures" />
              </label>
              <label className="space-y-1.5 text-xs font-semibold text-[#52645a]">
                Subject
                <input className="w-full rounded-lg border border-[#dce5df] px-3 py-2.5 text-sm font-medium outline-none focus:border-[#5eaa83] focus:ring-3 focus:ring-[#5eaa83]/15" value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Auto-detected from PDF, or enter manually" />
                <span className="block text-[10px] font-normal text-[#89968e]">PDF uploads keep only the subject name and unit-wise syllabus topics.</span>
              </label>
              <label className="space-y-1.5 text-xs font-semibold text-[#52645a]">
                Subject code
                <input className="w-full rounded-lg border border-[#dce5df] px-3 py-2.5 text-sm font-medium outline-none focus:border-[#5eaa83] focus:ring-3 focus:ring-[#5eaa83]/15" value={subjectCode} onChange={(event) => setSubjectCode(event.target.value)} placeholder="e.g. CS301" required />
              </label>
              <label className="space-y-1.5 text-xs font-semibold text-[#52645a]">
                Curriculum
                <select className="w-full rounded-lg border border-[#dce5df] bg-white px-3 py-2.5 text-sm font-medium outline-none focus:border-[#5eaa83] focus:ring-3 focus:ring-[#5eaa83]/15" value={curriculum} onChange={(event) => setCurriculum(event.target.value)}>
                  {CURRICULA.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>
              <label className="space-y-1.5 text-xs font-semibold text-[#52645a]">
                Class or semester
                <input className="w-full rounded-lg border border-[#dce5df] px-3 py-2.5 text-sm font-medium outline-none focus:border-[#5eaa83] focus:ring-3 focus:ring-[#5eaa83]/15" value={gradeLevel} onChange={(event) => setGradeLevel(event.target.value)} placeholder="e.g. Class 12" required />
              </label>
            </div>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
              <label className="min-w-0 flex-1 space-y-1.5 text-xs font-semibold text-[#52645a]">
                Syllabus file
                <input ref={fileInput} className="block w-full rounded-lg border border-[#dce5df] bg-white text-xs text-[#67766d] file:mr-3 file:border-0 file:bg-[#eef5f0] file:px-3 file:py-2.5 file:text-xs file:font-semibold file:text-[#3e7857]" type="file" accept=".pdf,.docx,.txt,.md,.csv,application/pdf,text/plain,text/markdown,text/csv,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={(event) => setFile(event.target.files?.[0] ?? null)} required />
                <span className="block text-[10px] font-normal text-[#89968e]">PDF, DOCX, TXT, MD, or CSV. Maximum 20 MB.</span>
              </label>
              <button className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-[#286748] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#20583c] disabled:cursor-wait disabled:opacity-60" type="submit" disabled={!storageReady || isSaving}>
                <Upload size={15} />{isSaving ? 'Saving syllabus…' : 'Save syllabus'}
              </button>
            </div>
            {error && <p className="mt-3 text-xs text-[#a34e38]" role="alert">{error}</p>}
          </form>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between px-1">
          <h3 className="text-sm font-semibold">Saved syllabi <span className="ml-1 text-xs font-medium text-[#8b9890]">{syllabi.length}</span></h3>
          <span className="text-[10px] text-[#89968e]">Available on this browser only</span>
        </div>

        {syllabi.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#d8e3dc] bg-white px-5 py-12 text-center">
            <span className="mx-auto grid size-11 place-items-center rounded-full bg-[#edf5f0] text-[#4a8967]"><BookOpen size={19} /></span>
            <p className="mt-3 text-sm font-semibold text-[#4b5e52]">No syllabi saved yet</p>
            <p className="mt-1 text-xs text-[#8a978f]">Upload a syllabus document above, then it will be available here to use for question-paper generation.</p>
          </div>
        ) : (
          <ul className="divide-y divide-[#e7ece9] rounded-xl border border-[#e0e8e3] bg-white">
            {syllabi.map((syllabus) => (
              <li key={syllabus.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#edf5f0] text-[#468260]"><FileText size={17} /></span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[#35483d]">{syllabus.title}</p>
                    <p className="mt-1 text-xs text-[#718077]">{syllabus.subject} <span className="px-1 text-[#c0c9c3]">·</span> {syllabus.subjectCode || 'No code'} <span className="px-1 text-[#c0c9c3]">·</span> {syllabus.curriculum ?? 'Curriculum not set'} <span className="px-1 text-[#c0c9c3]">·</span> {syllabus.gradeLevel ?? 'Class not set'} <span className="px-1 text-[#c0c9c3]">·</span> {syllabus.fileName}</p>
                    <p className="mt-1 text-[10px] text-[#98a39c]">{formatSize(syllabus.size)} <span className="px-1">·</span> {new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(syllabus.createdAt))}</p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2 pl-12 sm:pl-0">
                  <button className="rounded-md bg-[#286748] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#20583c]" type="button" onClick={() => onUse(syllabus)}>Use syllabus</button>
                  {isAdmin && <button className="grid size-9 place-items-center rounded-md border border-[#e3e9e5] text-[#7e8c83] transition hover:border-[#e8bcb0] hover:text-[#a34e38]" type="button" aria-label={`Delete ${syllabus.title}`} title="Delete syllabus" onClick={() => void onDelete(syllabus.id)}><Trash2 size={15} /></button>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="rounded-lg bg-[#eef3ef] px-4 py-3 text-[11px] leading-5 text-[#77867d]">Browser-only demo: uploads are stored in IndexedDB on this device. Clearing browser data removes them; another user or device will not see this library.</p>
    </div>
  )
}