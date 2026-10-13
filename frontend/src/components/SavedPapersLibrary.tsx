import { BookOpen, CalendarDays, Clock3, FileText, Search, Trash2 } from 'lucide-react'
import { useState } from 'react'
import type { SavedPaper } from '../types/paper'

type Props = {
  papers: SavedPaper[]
  localPapers: SavedPaper[]
  syncingLocalPaperId: string | null
  signedInUserId: string
  onOpen: (savedPaper: SavedPaper) => void
  onDelete: (id: string) => void
  onImportLocal: (savedPaper: SavedPaper) => void
  onDeleteLocal: (id: string) => void
}

function formatDate(date: string) {
  if (!date) return 'Date not set'
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(`${date}T00:00:00`))
}

function formatSavedDate(date: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(date))
}

export function SavedPapersLibrary({ papers, localPapers, syncingLocalPaperId, signedInUserId, onOpen, onDelete, onImportLocal, onDeleteLocal }: Props) {
  const [search, setSearch] = useState('')
  const allPapers = [
    ...papers.map((savedPaper) => ({ savedPaper, isLocal: false })),
    ...localPapers.map((savedPaper) => ({ savedPaper, isLocal: true })),
  ]
  const visiblePapers = allPapers.filter(({ savedPaper }) => {
    const { paper } = savedPaper
    return `${paper.title} ${paper.subject} ${paper.subjectCode} ${paper.questionPaperCode ?? ''} ${paper.gradeLevel}`
      .toLowerCase()
      .includes(search.trim().toLowerCase())
  })

  return (
    <div className="mx-auto mt-6 max-w-[1440px] space-y-5">
      <section className="rounded-xl border border-[#e0e8e3] bg-white p-5 shadow-[0_4px_20px_rgba(29,56,43,0.035)] sm:p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-[10px] font-bold tracking-[0.14em] text-[#4c9a76]">SHARED SUPABASE DATABASE</p>
            <h2 className="mt-1.5 text-[19px] font-semibold">Generated papers</h2>
            <p className="mt-1.5 text-xs leading-5 text-[#7f8d84]">Reopen and print your papers and papers approved for faculty use.</p>
          </div>
          <label className="flex w-full items-center gap-2 rounded-lg border border-[#dce5df] bg-white px-3 sm:max-w-[320px]">
            <Search size={15} className="shrink-0 text-[#849087]" />
            <span className="sr-only">Search generated papers</span>
            <input className="min-w-0 flex-1 bg-transparent py-2.5 text-xs text-[#35483d] outline-none placeholder:text-[#a1ada6]" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search subject, code, or title" />
          </label>
        </div>
      </section>

      {visiblePapers.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#d8e3dc] bg-white px-5 py-12 text-center">
          <span className="mx-auto grid size-11 place-items-center rounded-full bg-[#edf5f0] text-[#4a8967]"><BookOpen size={19} /></span>
          <p className="mt-3 text-sm font-semibold text-[#4b5e52]">{allPapers.length === 0 ? 'No saved papers yet' : 'No matching papers'}</p>
          <p className="mt-1 text-xs text-[#8a978f]">{allPapers.length === 0 ? 'Generate a question paper and it will appear here automatically.' : 'Try another subject, code, or title.'}</p>
        </div>
      ) : (
        <ul className="divide-y divide-[#e7ece9] rounded-xl border border-[#e0e8e3] bg-white">
          {visiblePapers.map(({ savedPaper, isLocal }) => {
            const { paper } = savedPaper
            const paperSets = savedPaper.paperSets ?? [paper]
            const isOwner = isLocal || savedPaper.createdBy === signedInUserId
            return (
              <li key={`${isLocal ? 'local' : 'cloud'}-${savedPaper.id}`} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-[#edf5f0] text-[#468260]"><FileText size={18} /></span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[#35483d]">{paper.title}</p>
                    <p className="mt-1 text-xs text-[#718077]">{paper.subjectCode} <span className="px-1 text-[#c0c9c3]">·</span> {paper.subject} <span className="px-1 text-[#c0c9c3]">·</span> {paper.gradeLevel}</p>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-[#7c8981]">
                      <span>{paper.assessmentType === 'semester' ? 'Semester' : paper.assessmentType === 'internal' ? 'Internal' : 'Assessment test'}</span>
                      <span>{paper.questions.length} questions</span>
                      {paperSets.length > 1 && <span>{paperSets.length} sets</span>}
                      <span>{paper.totalMarks} marks</span>
                      {!isLocal && savedPaper.status === 'pending_review' && <span className="font-semibold text-[#b45309]">Pending admin approval</span>}
                      {!isLocal && savedPaper.status === 'rejected' && <span className="font-semibold text-[#b91c1c]">Not approved</span>}
                      {!isLocal && savedPaper.status === 'approved' && !isOwner && <span className="font-semibold text-[#15803d]">Admin approved · shared</span>}
                      {isLocal && <span className="font-semibold text-[#9b6b2e]">Saved in this browser · not synced</span>}
                      <span className="inline-flex items-center gap-1"><CalendarDays size={11} /> {formatDate(savedPaper.examDate)}</span>
                      {savedPaper.examTime && <span className="inline-flex items-center gap-1"><Clock3 size={11} /> {savedPaper.examTime}</span>}
                    </div>
                    <p className="mt-1.5 text-[9px] text-[#9aa49d]">Saved {formatSavedDate(savedPaper.createdAt)}</p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2 pl-[52px] sm:pl-0">
                  {isLocal && <button className="rounded-md border border-[#dce5df] px-3 py-2 text-xs font-semibold text-[#286748] transition hover:bg-[#edf5f0] disabled:cursor-wait disabled:opacity-60" type="button" onClick={() => onImportLocal(savedPaper)} disabled={syncingLocalPaperId !== null}>{syncingLocalPaperId === savedPaper.id ? 'Syncing...' : 'Sync to cloud'}</button>}
                  <button className="rounded-md bg-[#286748] px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-[#20583c]" type="button" onClick={() => onOpen(savedPaper)}>Open paper</button>
                  {isOwner && <button className="grid size-9 place-items-center rounded-md border border-[#e3e9e5] text-[#7e8c83] transition hover:border-[#e8bcb0] hover:text-[#a34e38]" type="button" aria-label={`Delete ${paper.title}`} title={isLocal ? 'Delete browser copy' : 'Delete your paper'} onClick={() => isLocal ? onDeleteLocal(savedPaper.id) : onDelete(savedPaper.id)}><Trash2 size={15} /></button>}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <p className="rounded-lg bg-[#eef3ef] px-4 py-3 text-[11px] leading-5 text-[#77867d]">New papers stay private until an administrator approves them. Approved papers are available to faculty in the shared workspace. Earlier papers saved in this browser remain available until synced or deleted.</p>
    </div>
  )
}