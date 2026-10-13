import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react'
import { BookPlus, Database, FileUp, Pencil, Search, Trash2, X } from 'lucide-react'
import { addQuestionBankItems, deleteQuestionBankItem, getQuestionBank, updateQuestionBankItem } from '../services/cloudPapers'
import { extractTextFromFile } from '../services/syllabusDb'
import type { QuestionBankRow } from '../services/supabaseClient'

type DraftQuestion = {
  question: string
  answer: string
  topic: string
  marks: number
}

type Props = {
  userId: string
}

const supportedExtensions = ['pdf', 'docx', 'txt', 'md', 'csv']
const textLimit = 100_000
const questionLimit = 300

function parseQuestions(text: string): DraftQuestion[] {
  const normalizedText = text.replace(/\r/g, '')
  const marker = /(?:^|\s)(?:question\s*)?\d{1,3}\s*[).:-]\s+/gim
  const markers = Array.from(normalizedText.matchAll(marker))
  let blocks: string[]

  if (markers.length > 0) {
    blocks = markers.map((match, index) => {
      const start = (match.index ?? 0) + match[0].length
      const end = markers[index + 1]?.index ?? normalizedText.length
      return normalizedText.slice(start, end).replace(/\s+/g, ' ').trim()
    })
  } else {
    blocks = normalizedText.split(/\n\s*\n/)
  }

  return blocks
    .map((block) => block.trim())
    .filter((block) => block.length > 0)
    .slice(0, questionLimit)
    .map((question) => ({
      question,
      answer: '',
      topic: '',
      marks: Number(question.match(/\(?(\d+)\s*(?:marks?|m)\)?\s*$/i)?.[1] ?? 1),
    }))
}

function emptyDraft(row: QuestionBankRow): DraftQuestion {
  return {
    question: row.question,
    answer: row.answer,
    topic: row.topic,
    marks: row.marks,
  }
}

export function QuestionBank({ userId }: Props) {
  const [questions, setQuestions] = useState<QuestionBankRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [search, setSearch] = useState('')
  const [fileName, setFileName] = useState('')
  const [subject, setSubject] = useState('')
  const [subjectCode, setSubjectCode] = useState('')
  const [curriculum, setCurriculum] = useState('')
  const [gradeLevel, setGradeLevel] = useState('')
  const [sourceQuestions, setSourceQuestions] = useState<DraftQuestion[]>([])
  const [drafts, setDrafts] = useState<Record<string, DraftQuestion>>({})

  async function reloadQuestions() {
    setIsLoading(true)
    setError('')
    try {
      setQuestions(await getQuestionBank())
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load the question bank.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    let isCurrent = true
    void getQuestionBank()
      .then((rows) => {
        if (isCurrent) setQuestions(rows)
      })
      .catch((loadError) => {
        if (isCurrent) setError(loadError instanceof Error ? loadError.message : 'Could not load the question bank.')
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false)
      })
    return () => { isCurrent = false }
  }, [])

  const visibleQuestions = useMemo(() => {
    const normalized = search.trim().toLocaleLowerCase()
    if (!normalized) return questions
    return questions.filter((item) => (
      item.question.toLocaleLowerCase().includes(normalized)
      || item.subject.toLocaleLowerCase().includes(normalized)
      || item.topic.toLocaleLowerCase().includes(normalized)
      || item.source_name.toLocaleLowerCase().includes(normalized)
    ))
  }, [questions, search])

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    setError('')
    setNotice('')
    setSourceQuestions([])
    setFileName('')
    if (file.size > 20 * 1024 * 1024) {
      setError('Question papers must be 20 MB or smaller.')
      event.target.value = ''
      return
    }
    const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
    if (!supportedExtensions.includes(extension)) {
      setError('Upload a PDF, DOCX, TXT, MD, or CSV file.')
      event.target.value = ''
      return
    }

    setIsUploading(true)
    try {
      const text = (await extractTextFromFile(file)).trim()
      if (!text) throw new Error('No selectable text was found. Scanned PDFs need OCR before they can be imported.')
      if (text.length > textLimit) throw new Error('Extracted text is over 100,000 characters. Split the paper into smaller files.')
      const parsed = parseQuestions(text)
      if (parsed.length === 0) throw new Error('No questions could be identified in the uploaded file.')
      setFileName(file.name)
      setSourceQuestions(parsed)
      if (parsed.length === questionLimit) {
        setNotice(`Showing the first ${questionLimit} questions. Split larger papers to import the rest.`)
      }
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Could not read the uploaded paper.')
    } finally {
      setIsUploading(false)
      event.target.value = ''
    }
  }

  function updateSourceQuestion(index: number, changes: Partial<DraftQuestion>) {
    setSourceQuestions((current) => current.map((item, itemIndex) => (
      itemIndex === index ? { ...item, ...changes } : item
    )))
  }

  async function handleImport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setNotice('')
    if (sourceQuestions.length === 0) {
      setError('Upload a paper and review its questions before importing.')
      return
    }
    setIsSaving(true)
    try {
      await addQuestionBankItems(sourceQuestions.map((item) => ({
        paper_id: null,
        question: item.question.trim(),
        answer: item.answer.trim(),
        subject: subject.trim(),
        subject_code: subjectCode.trim(),
        curriculum: curriculum.trim(),
        grade_level: gradeLevel.trim(),
        topic: item.topic.trim(),
        marks: item.marks,
        source_type: 'uploaded',
        source_name: fileName,
        exam_set: '',
      })))
      setSourceQuestions([])
      setFileName('')
      setNotice(`Imported ${sourceQuestions.length} question(s) from ${fileName}.`)
      await reloadQuestions()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not import these questions.')
    } finally {
      setIsSaving(false)
    }
  }

  function setDraft(id: string, row: QuestionBankRow, changes: Partial<DraftQuestion>) {
    setDrafts((current) => ({ ...current, [id]: { ...emptyDraft(row), ...current[id], ...changes } }))
  }

  async function handleUpdate(row: QuestionBankRow) {
    const draft = drafts[row.id] ?? emptyDraft(row)
    if (!draft.question.trim() || !Number.isInteger(draft.marks) || draft.marks < 1 || draft.marks > 100) {
      setError('Questions need text and a whole-number mark value between 1 and 100.')
      return
    }
    setError('')
    setIsSaving(true)
    try {
      await updateQuestionBankItem(row.id, {
        question: draft.question.trim(),
        answer: draft.answer.trim(),
        subject: row.subject,
        subject_code: row.subject_code,
        curriculum: row.curriculum,
        grade_level: row.grade_level,
        topic: draft.topic.trim(),
        marks: draft.marks,
      })
      setDrafts((current) => {
        const next = { ...current }
        delete next[row.id]
        return next
      })
      setNotice('Question updated in the shared database.')
      await reloadQuestions()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not update this question.')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete(row: QuestionBankRow) {
    if (!window.confirm('Delete this question from your question bank?')) return
    setError('')
    try {
      await deleteQuestionBankItem(row.id)
      setQuestions((current) => current.filter((item) => item.id !== row.id))
      setNotice('Question deleted from the shared database.')
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Could not delete this question.')
    }
  }

  return (
    <div className="mx-auto mt-6 max-w-[1440px] space-y-6">
      <section className="rounded-xl border border-[#e0e8e3] bg-white p-5 shadow-[0_4px_20px_rgba(29,56,43,0.035)] sm:p-6">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-[#eaf3ed] text-[#267252]"><FileUp size={19} /></span>
          <div>
            <h2 className="font-display text-2xl">Import an old question paper</h2>
            <p className="mt-1 text-sm leading-6 text-[#718078]">Upload a selectable-text PDF, DOCX, TXT, MD, or CSV. Review and edit parsed questions before they enter your private question bank. Scanned PDFs require OCR first.</p>
          </div>
        </div>
        <form className="mt-5 space-y-4" onSubmit={handleImport}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="text-xs font-semibold text-[#52645a]">Subject<input className="mt-1.5 w-full border border-[#dfe7e2] bg-[#fbfcfb] px-3 py-2.5 text-sm outline-none focus:border-[#579174]" value={subject} onChange={(event) => setSubject(event.target.value)} required /></label>
            <label className="text-xs font-semibold text-[#52645a]">Subject code<input className="mt-1.5 w-full border border-[#dfe7e2] bg-[#fbfcfb] px-3 py-2.5 text-sm outline-none focus:border-[#579174]" value={subjectCode} onChange={(event) => setSubjectCode(event.target.value)} /></label>
            <label className="text-xs font-semibold text-[#52645a]">Curriculum<input className="mt-1.5 w-full border border-[#dfe7e2] bg-[#fbfcfb] px-3 py-2.5 text-sm outline-none focus:border-[#579174]" value={curriculum} onChange={(event) => setCurriculum(event.target.value)} placeholder="CBSE, TN State Board, college..." /></label>
            <label className="text-xs font-semibold text-[#52645a]">Class / semester<input className="mt-1.5 w-full border border-[#dfe7e2] bg-[#fbfcfb] px-3 py-2.5 text-sm outline-none focus:border-[#579174]" value={gradeLevel} onChange={(event) => setGradeLevel(event.target.value)} placeholder="Class 12, Semester 3..." /></label>
          </div>
          <label className="flex cursor-pointer flex-wrap items-center gap-3 border border-dashed border-[#bdcec3] bg-[#f8fbf8] px-4 py-3 text-sm font-semibold text-[#285740] hover:bg-[#f1f7f2]">
            <FileUp size={18} />
            <span>{isUploading ? 'Reading question paper...' : fileName || 'Choose an old question paper'}</span>
            <span className="ml-auto text-xs font-medium text-[#84938a]">Max 20 MB</span>
            <input className="sr-only" type="file" accept=".pdf,.docx,.txt,.md,.csv" onChange={(event) => void handleFileChange(event)} disabled={isUploading || isSaving} />
          </label>

          {sourceQuestions.length > 0 && (
            <div className="space-y-3 border-t border-[#e6ece8] pt-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-bold text-[#30483b]">Review import <span className="font-medium text-[#829087]">({sourceQuestions.length} questions)</span></h3>
                <button type="button" className="inline-flex items-center gap-1 text-xs font-semibold text-[#718078] hover:text-[#a24434]" onClick={() => { setSourceQuestions([]); setFileName('') }}><X size={14} /> Clear</button>
              </div>
              <div className="max-h-[460px] space-y-3 overflow-y-auto pr-1">
                {sourceQuestions.map((item, index) => (
                  <article className="grid gap-2 rounded-lg border border-[#e2e9e4] bg-[#fbfcfb] p-3 sm:grid-cols-[minmax(0,1fr)_100px]" key={`${index}-${item.question.slice(0, 24)}`}>
                    <label className="text-[11px] font-semibold text-[#75847b]">Question {index + 1}<textarea className="mt-1 block min-h-20 w-full resize-y border border-[#dfe7e2] bg-white px-3 py-2 text-sm font-normal text-[#263a2f] outline-none focus:border-[#579174]" value={item.question} onChange={(event) => updateSourceQuestion(index, { question: event.target.value })} required /></label>
                    <label className="text-[11px] font-semibold text-[#75847b]">Marks<input className="mt-1 block w-full border border-[#dfe7e2] bg-white px-3 py-2 text-sm text-[#263a2f] outline-none focus:border-[#579174]" type="number" min="1" max="100" value={item.marks} onChange={(event) => updateSourceQuestion(index, { marks: Number(event.target.value) })} required /></label>
                    <label className="text-[11px] font-semibold text-[#75847b] sm:col-span-2">Topic (optional)<input className="mt-1 block w-full border border-[#dfe7e2] bg-white px-3 py-2 text-sm font-normal text-[#263a2f] outline-none focus:border-[#579174]" value={item.topic} onChange={(event) => updateSourceQuestion(index, { topic: event.target.value })} /></label>
                    <label className="text-[11px] font-semibold text-[#75847b] sm:col-span-2">Answer (optional)<textarea className="mt-1 block min-h-16 w-full resize-y border border-[#dfe7e2] bg-white px-3 py-2 text-sm font-normal text-[#263a2f] outline-none focus:border-[#579174]" value={item.answer} onChange={(event) => updateSourceQuestion(index, { answer: event.target.value })} /></label>
                  </article>
                ))}
              </div>
              <button className="inline-flex items-center gap-2 bg-[#173d32] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#285845] disabled:opacity-60" type="submit" disabled={isSaving}>
                <BookPlus size={16} /> {isSaving ? 'Saving questions...' : `Save ${sourceQuestions.length} questions to database`}
              </button>
            </div>
          )}
        </form>
      </section>

      <section className="rounded-xl border border-[#e0e8e3] bg-white p-5 shadow-[0_4px_20px_rgba(29,56,43,0.035)] sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-lg bg-[#eaf3ed] text-[#267252]"><Database size={19} /></span>
            <div><h2 className="font-display text-2xl">Question bank</h2><p className="mt-1 text-xs text-[#718078]">Your questions and papers approved for sharing with faculty.</p></div>
          </div>
          <label className="flex min-w-[220px] items-center gap-2 border border-[#dfe7e2] px-3 py-2 text-[#7b8b81] focus-within:border-[#579174]">
            <Search size={15} /><input className="min-w-0 flex-1 bg-transparent text-sm text-[#263a2f] outline-none" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search questions..." />
          </label>
        </div>

        {notice && <p className="mt-4 border border-[#cfe4d5] bg-[#f2faf4] px-3 py-2.5 text-xs text-[#32714d]" role="status">{notice}</p>}
        {error && <p className="mt-4 border border-[#f0c9bb] bg-[#fff5f0] px-3 py-2.5 text-xs text-[#9c4d36]" role="alert">{error}</p>}
        {isLoading ? <p className="py-12 text-center text-sm text-[#829087]">Loading your question bank...</p>
          : visibleQuestions.length === 0 ? <p className="py-12 text-center text-sm text-[#829087]">{questions.length ? 'No questions match this search.' : 'No saved questions yet. Import an old paper or generate a new one.'}</p>
            : <div className="mt-5 space-y-3">
              {visibleQuestions.map((row) => {
                const draft = drafts[row.id]
                const canEdit = row.created_by === userId
                return (
                  <article className="rounded-lg border border-[#e2e9e4] bg-[#fbfcfb] p-4" key={row.id}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex flex-wrap gap-1.5 text-[10px] font-semibold">
                        <span className="bg-[#eaf3ed] px-2 py-1 text-[#397153]">{row.subject || 'Unspecified subject'}</span>
                        {row.subject_code && <span className="bg-[#f1f3ef] px-2 py-1 text-[#637268]">{row.subject_code}</span>}
                        {row.topic && <span className="bg-[#f1f3ef] px-2 py-1 text-[#637268]">{row.topic}</span>}
                        <span className="bg-[#f1f3ef] px-2 py-1 text-[#637268]">{row.marks} mark{row.marks === 1 ? '' : 's'}</span>
                        <span className="bg-[#f1f3ef] px-2 py-1 text-[#637268]">{row.source_type === 'generated' ? `Generated · Set ${row.exam_set}` : `Uploaded · ${row.source_name}`}</span>
                        {!canEdit && <span className="bg-[#eff6ff] px-2 py-1 text-[#1d4ed8]">Admin approved · shared</span>}
                      </div>
                      {canEdit && <div className="flex gap-1">
                        {draft ? <>
                          <button className="px-2.5 py-1.5 text-xs font-semibold text-[#32714d] hover:bg-[#eaf3ed] disabled:opacity-60" type="button" onClick={() => void handleUpdate(row)} disabled={isSaving}>Save</button>
                          <button className="px-2.5 py-1.5 text-xs font-semibold text-[#718078] hover:bg-[#eef1ed]" type="button" onClick={() => setDrafts((current) => { const next = { ...current }; delete next[row.id]; return next })}>Cancel</button>
                        </> : <>
                          <button className="grid size-8 place-items-center text-[#718078] hover:bg-[#eaf3ed] hover:text-[#32714d]" aria-label="Edit question" title="Edit question" type="button" onClick={() => setDrafts((current) => ({ ...current, [row.id]: emptyDraft(row) }))}><Pencil size={15} /></button>
                          <button className="grid size-8 place-items-center text-[#718078] hover:bg-[#fff0ec] hover:text-[#a24434]" aria-label="Delete question" title="Delete question" type="button" onClick={() => void handleDelete(row)}><Trash2 size={15} /></button>
                        </>}
                      </div>}
                    </div>
                    {draft ? <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_90px]">
                      <label className="text-[11px] font-semibold text-[#75847b]">Question<textarea className="mt-1 block min-h-20 w-full border border-[#dfe7e2] bg-white px-3 py-2 text-sm font-normal text-[#263a2f] outline-none focus:border-[#579174]" value={draft.question} onChange={(event) => setDraft(row.id, row, { question: event.target.value })} /></label>
                      <label className="text-[11px] font-semibold text-[#75847b]">Marks<input className="mt-1 block w-full border border-[#dfe7e2] bg-white px-3 py-2 text-sm text-[#263a2f] outline-none focus:border-[#579174]" type="number" min="1" max="100" value={draft.marks} onChange={(event) => setDraft(row.id, row, { marks: Number(event.target.value) })} /></label>
                      <label className="text-[11px] font-semibold text-[#75847b] sm:col-span-2">Topic<input className="mt-1 block w-full border border-[#dfe7e2] bg-white px-3 py-2 text-sm font-normal text-[#263a2f] outline-none focus:border-[#579174]" value={draft.topic} onChange={(event) => setDraft(row.id, row, { topic: event.target.value })} /></label>
                      <label className="text-[11px] font-semibold text-[#75847b] sm:col-span-2">Answer<textarea className="mt-1 block min-h-16 w-full border border-[#dfe7e2] bg-white px-3 py-2 text-sm font-normal text-[#263a2f] outline-none focus:border-[#579174]" value={draft.answer} onChange={(event) => setDraft(row.id, row, { answer: event.target.value })} /></label>
                    </div> : <div className="mt-3 space-y-2 text-sm leading-6 text-[#31463a]">
                      <p>{row.question}</p>
                      {row.answer && <p className="border-l-2 border-[#c7d8cc] pl-3 text-xs text-[#718078]">Answer: {row.answer}</p>}
                    </div>}
                  </article>
                )
              })}
            </div>}
      </section>
    </div>
  )
}
