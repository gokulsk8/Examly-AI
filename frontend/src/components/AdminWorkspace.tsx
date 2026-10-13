import { useEffect, useState, type FormEvent } from 'react'
import { Check, ClipboardList, FileCheck2, FileText, BarChart3, X } from 'lucide-react'
import { getPaperTemplates, updatePaperReviewStatus } from '../services/cloudPapers'
import { getAdminOverview, type AdminOverview } from '../services/adminConsole'
import { requireSupabaseClient, type Json, type PaperTemplateRow } from '../services/supabaseClient'
import type { SavedPaper } from '../types/paper'

type AdminPanel = 'approvals' | 'templates' | 'reports'

type TemplateDraft = {
  name: string
  description: string
  subject: string
  course: string
  assessmentType: string
  configuration: string
  isPublished: boolean
}

type Props = {
  papers: SavedPaper[]
  signedInUserId: string
  onOpenPaper: (paper: SavedPaper) => void
  onPapersChanged: () => void
}

const emptyTemplate: TemplateDraft = {
  name: '',
  description: '',
  subject: '',
  course: '',
  assessmentType: '',
  configuration: JSON.stringify({ marksDistribution: {}, instructions: [], header: '', footer: '', layout: {} }, null, 2),
  isPublished: false,
}

const panels: Array<{ id: AdminPanel; title: string; description: string; icon: typeof FileCheck2 }> = [
  { id: 'approvals', title: 'Paper approvals', description: 'Review papers before sharing them with faculty.', icon: FileCheck2 },
  { id: 'templates', title: 'Templates', description: 'Create and publish reusable paper templates.', icon: ClipboardList },
  { id: 'reports', title: 'Usage reports', description: 'See account and paper-generation totals.', icon: BarChart3 },
]

function formatDate(value: string | null | undefined) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date)
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return <article className="rounded-xl border border-[#e2e8f0] bg-white p-5"><p className="text-xs font-medium text-[#64748b]">{label}</p><p className="mt-2 text-3xl font-bold text-[#172554]">{value}</p></article>
}

export function AdminWorkspace({ papers, signedInUserId, onOpenPaper, onPapersChanged }: Props) {
  const [panel, setPanel] = useState<AdminPanel>('approvals')
  const [overview, setOverview] = useState<AdminOverview | null>(null)
  const [templates, setTemplates] = useState<PaperTemplateRow[]>([])
  const [templateDraft, setTemplateDraft] = useState<TemplateDraft>(emptyTemplate)
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null)
  const [isTemplateFormOpen, setIsTemplateFormOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const pendingPapers = papers.filter((paper) => paper.status === 'pending_review')

  useEffect(() => {
    let active = true
    void getAdminOverview()
      .then((result) => { if (active) setOverview(result) })
      .catch((loadError) => { if (active) setError(loadError instanceof Error ? loadError.message : 'Could not load usage reports.') })
    void getPaperTemplates()
      .then((result) => { if (active) setTemplates(result) })
      .catch((loadError) => { if (active) setError(loadError instanceof Error ? loadError.message : 'Could not load templates.') })
    return () => { active = false }
  }, [])

  async function refreshTemplates() {
    setTemplates(await getPaperTemplates())
  }

  async function handlePaperDecision(paper: SavedPaper, status: 'approved' | 'rejected') {
    setError('')
    setNotice('')
    try {
      await updatePaperReviewStatus(paper.id, status)
      onPapersChanged()
      setNotice(status === 'approved' ? 'Paper approved and made available to faculty.' : 'Paper rejected; it remains private to its author.')
    } catch (decisionError) {
      setError(decisionError instanceof Error ? decisionError.message : 'Could not update this paper.')
    }
  }

  function beginTemplateEdit(template: PaperTemplateRow) {
    setEditingTemplateId(template.id)
    setTemplateDraft({
      name: template.name,
      description: template.description,
      subject: template.subject,
      course: template.course,
      assessmentType: template.assessment_type,
      configuration: JSON.stringify(template.configuration, null, 2),
      isPublished: template.is_published,
    })
    setIsTemplateFormOpen(true)
    setError('')
    setNotice('')
  }

  function closeTemplateForm() {
    setIsTemplateFormOpen(false)
    setEditingTemplateId(null)
    setTemplateDraft(emptyTemplate)
  }

  async function handleTemplateSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setNotice('')
    let configuration: Json
    try {
      const parsed: unknown = JSON.parse(templateDraft.configuration)
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) throw new Error('Template configuration must be a JSON object.')
      configuration = parsed as Json
    } catch (parseError) {
      setError(parseError instanceof Error ? parseError.message : 'Enter valid template configuration JSON.')
      return
    }
    setIsSaving(true)
    try {
      const client = requireSupabaseClient()
      const values = {
        name: templateDraft.name.trim(),
        description: templateDraft.description.trim(),
        subject: templateDraft.subject.trim(),
        course: templateDraft.course.trim(),
        assessment_type: templateDraft.assessmentType.trim(),
        configuration,
        is_published: templateDraft.isPublished,
      }
      const result = editingTemplateId
        ? await client.from('paper_templates').update({ ...values, updated_by: signedInUserId }).eq('id', editingTemplateId)
        : await client.from('paper_templates').insert(values)
      if (result.error) throw new Error(`Could not save the template: ${result.error.message}`)
      await refreshTemplates()
      closeTemplateForm()
      setNotice('Template saved.')
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save this template.')
    } finally {
      setIsSaving(false)
    }
  }

  async function updateTemplate(template: PaperTemplateRow, updates: Partial<PaperTemplateRow>, message: string) {
    setError('')
    setNotice('')
    try {
      const { error: updateError } = await requireSupabaseClient()
        .from('paper_templates')
        .update({ ...updates, updated_by: signedInUserId })
        .eq('id', template.id)
      if (updateError) throw new Error(`Could not update the template: ${updateError.message}`)
      await refreshTemplates()
      setNotice(message)
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Could not update this template.')
    }
  }

  async function setDefaultTemplate(template: PaperTemplateRow) {
    setError('')
    setNotice('')
    try {
      const { error: rpcError } = await requireSupabaseClient().rpc('set_default_paper_template', { template_id: template.id })
      if (rpcError) throw new Error(`Could not set the default template: ${rpcError.message}`)
      await refreshTemplates()
      setNotice('Default template updated.')
    } catch (defaultError) {
      setError(defaultError instanceof Error ? defaultError.message : 'Could not set the default template.')
    }
  }

  async function deleteTemplate(template: PaperTemplateRow) {
    if (!window.confirm(`Delete “${template.name}”? This cannot be undone.`)) return
    setError('')
    setNotice('')
    try {
      const { error: deleteError } = await requireSupabaseClient().from('paper_templates').delete().eq('id', template.id)
      if (deleteError) throw new Error(`Could not delete the template: ${deleteError.message}`)
      await refreshTemplates()
      setNotice('Template deleted.')
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Could not delete this template.')
    }
  }

  return (
    <section className="mx-auto mt-6 max-w-[1440px] space-y-5">
      <header>
        <p className="text-[10px] font-bold tracking-[0.15em] text-[#2563eb]">ADMIN CONTROLS</p>
        <h2 className="mt-1 text-2xl font-bold text-[#172554]">Manage the essentials</h2>
        <p className="mt-1 text-sm text-[#64748b]">Three simple controls for templates, paper approval, and usage.</p>
      </header>

      <nav className="grid gap-2 sm:grid-cols-3" aria-label="Admin controls">
        {panels.map(({ id, title, description, icon: Icon }) => (
          <button key={id} type="button" onClick={() => { setPanel(id); setError(''); setNotice('') }} aria-pressed={panel === id}
            className={`flex items-start gap-3 rounded-xl border p-4 text-left transition ${panel === id ? 'border-[#93c5fd] bg-[#eff6ff]' : 'border-[#e2e8f0] bg-white hover:border-[#bfdbfe]'}`}>
            <Icon size={19} className="mt-0.5 shrink-0 text-[#2563eb]" />
            <span><span className="block text-sm font-semibold text-[#1e293b]">{title}</span><span className="mt-1 block text-xs leading-5 text-[#64748b]">{description}</span></span>
          </button>
        ))}
      </nav>

      {error && <p className="rounded-lg border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-sm text-[#b91c1c]" role="alert">{error}</p>}
      {notice && <p className="rounded-lg border border-[#bbf7d0] bg-[#f0fdf4] px-4 py-3 text-sm text-[#166534]" role="status">{notice}</p>}

      {panel === 'approvals' && (
        <section className="overflow-hidden rounded-xl border border-[#e2e8f0] bg-white">
          <div className="border-b border-[#e2e8f0] p-5"><h3 className="font-semibold text-[#172554]">Papers awaiting approval</h3><p className="mt-1 text-xs text-[#64748b]">Approved papers become available to other faculty. Rejected papers stay private to their author.</p></div>
          {pendingPapers.length === 0 ? <p className="p-8 text-center text-sm text-[#64748b]">No papers are waiting for review.</p> : (
            <ul className="divide-y divide-[#eef2f7]">
              {pendingPapers.map((paper) => (
                <li key={paper.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-lg bg-[#eff6ff] text-[#2563eb]"><FileText size={18} /></span><div className="min-w-0"><p className="truncate text-sm font-semibold text-[#1e293b]">{paper.paper.title}</p><p className="mt-1 text-xs text-[#64748b]">{paper.paper.subject} · {paper.paper.gradeLevel} · {formatDate(paper.createdAt)}</p><p className="mt-1 text-[11px] text-[#64748b]">Submitted by {paper.createdBy === signedInUserId ? 'you' : paper.createdBy || 'a faculty member'}</p></div></div>
                  <div className="flex shrink-0 flex-wrap gap-2 pl-[52px] sm:pl-0">
                    <button type="button" className="rounded-md border border-[#dbe5f2] px-3 py-2 text-xs font-semibold text-[#334155] hover:bg-[#f8fafc]" onClick={() => onOpenPaper(paper)}>Review</button>
                    <button type="button" className="inline-flex items-center gap-1 rounded-md bg-[#15803d] px-3 py-2 text-xs font-semibold text-white hover:bg-[#166534]" onClick={() => void handlePaperDecision(paper, 'approved')}><Check size={14} />Approve</button>
                    <button type="button" className="inline-flex items-center gap-1 rounded-md border border-[#fecaca] px-3 py-2 text-xs font-semibold text-[#b91c1c] hover:bg-[#fef2f2]" onClick={() => void handlePaperDecision(paper, 'rejected')}><X size={14} />Reject</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {panel === 'templates' && (
        <section className="overflow-hidden rounded-xl border border-[#e2e8f0] bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e2e8f0] p-5"><div><h3 className="font-semibold text-[#172554]">Paper templates</h3><p className="mt-1 text-xs text-[#64748b]">Create a template and publish it when it is ready for faculty.</p></div><button type="button" className="rounded-lg bg-[#2563eb] px-4 py-2.5 text-sm font-semibold text-white" onClick={() => { setEditingTemplateId(null); setTemplateDraft(emptyTemplate); setIsTemplateFormOpen(true) }}>New template</button></div>
          {isTemplateFormOpen && (
            <form className="grid gap-4 border-b border-[#e2e8f0] bg-[#f8fbff] p-5 md:grid-cols-2" onSubmit={(event) => void handleTemplateSubmit(event)}>
              <label className="text-xs font-semibold text-[#475569]">Template name<input className="mt-1 block w-full rounded-lg border border-[#dbe5f2] bg-white px-3 py-2.5 text-sm" value={templateDraft.name} onChange={(event) => setTemplateDraft({ ...templateDraft, name: event.target.value })} required /></label>
              <label className="text-xs font-semibold text-[#475569]">Subject<input className="mt-1 block w-full rounded-lg border border-[#dbe5f2] bg-white px-3 py-2.5 text-sm" value={templateDraft.subject} onChange={(event) => setTemplateDraft({ ...templateDraft, subject: event.target.value })} /></label>
              <label className="text-xs font-semibold text-[#475569]">Course<input className="mt-1 block w-full rounded-lg border border-[#dbe5f2] bg-white px-3 py-2.5 text-sm" value={templateDraft.course} onChange={(event) => setTemplateDraft({ ...templateDraft, course: event.target.value })} /></label>
              <label className="text-xs font-semibold text-[#475569]">Assessment type<input className="mt-1 block w-full rounded-lg border border-[#dbe5f2] bg-white px-3 py-2.5 text-sm" value={templateDraft.assessmentType} onChange={(event) => setTemplateDraft({ ...templateDraft, assessmentType: event.target.value })} /></label>
              <label className="text-xs font-semibold text-[#475569] md:col-span-2">Description<textarea className="mt-1 block w-full rounded-lg border border-[#dbe5f2] bg-white px-3 py-2.5 text-sm" value={templateDraft.description} onChange={(event) => setTemplateDraft({ ...templateDraft, description: event.target.value })} rows={2} /></label>
              <label className="text-xs font-semibold text-[#475569] md:col-span-2">Template configuration (JSON)<textarea className="mt-1 block w-full rounded-lg border border-[#dbe5f2] bg-white px-3 py-2.5 font-mono text-xs" value={templateDraft.configuration} onChange={(event) => setTemplateDraft({ ...templateDraft, configuration: event.target.value })} rows={6} required /></label>
              <label className="flex items-center gap-2 text-sm text-[#334155] md:col-span-2"><input type="checkbox" checked={templateDraft.isPublished} onChange={(event) => setTemplateDraft({ ...templateDraft, isPublished: event.target.checked })} />Publish for faculty</label>
              <div className="flex gap-2 md:col-span-2"><button type="submit" className="rounded-lg bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white" disabled={isSaving}>{isSaving ? 'Saving…' : editingTemplateId ? 'Save template' : 'Create template'}</button><button type="button" className="rounded-lg border border-[#dbe5f2] px-4 py-2 text-sm" onClick={closeTemplateForm}>Cancel</button></div>
            </form>
          )}
          <ul className="divide-y divide-[#eef2f7]">
            {templates.map((template) => (
              <li key={template.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div><p className="text-sm font-semibold text-[#1e293b]">{template.name}{template.is_default ? <span className="ml-2 rounded-full bg-[#eff6ff] px-2 py-1 text-[10px] font-bold text-[#1d4ed8]">Default</span> : null}</p><p className="mt-1 text-xs text-[#64748b]">{template.subject || 'Any subject'} · {template.course || 'Any course'} · {template.is_published ? 'Published' : 'Draft'} · updated {formatDate(template.updated_at)}</p></div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" className="rounded-md border px-3 py-2 text-xs font-semibold" onClick={() => beginTemplateEdit(template)}>Edit</button>
                  <button type="button" className="rounded-md border px-3 py-2 text-xs font-semibold" onClick={() => void setDefaultTemplate(template)}>Set default</button>
                  <button type="button" className="rounded-md border px-3 py-2 text-xs font-semibold text-[#1d4ed8]" onClick={() => void updateTemplate(template, { is_published: !template.is_published }, template.is_published ? 'Template unpublished.' : 'Template published for faculty.')}>{template.is_published ? 'Unpublish' : 'Publish'}</button>
                  <button type="button" className="rounded-md border px-3 py-2 text-xs font-semibold text-[#b91c1c]" onClick={() => void deleteTemplate(template)}>Delete</button>
                </div>
              </li>
            ))}
            {templates.length === 0 && <li className="p-8 text-center text-sm text-[#64748b]">No templates have been created.</li>}
          </ul>
        </section>
      )}

      {panel === 'reports' && (
        <section>
          <h3 className="mb-4 font-semibold text-[#172554]">Workspace usage</h3>
          {!overview ? <p className="rounded-lg border border-[#e2e8f0] bg-white p-5 text-sm text-[#64748b]">Loading usage reports…</p> : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <Metric label="Total accounts" value={overview.totalUsers} />
              <Metric label="Active in last 30 days" value={overview.activeUsers30Days} />
              <Metric label="Papers generated" value={overview.totalPapers} />
              <Metric label="Generated this month" value={overview.papersThisMonth} />
              <Metric label="Awaiting approval" value={overview.pendingApprovals} />
              <Metric label="Published templates" value={overview.publishedTemplates} />
            </div>
          )}
        </section>
      )}
    </section>
  )
}
