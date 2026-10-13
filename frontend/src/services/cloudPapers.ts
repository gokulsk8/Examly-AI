import type { GeneratedPaper, SavedPaper } from '../types/paper'
import type { Json, PaperTemplateRow, QuestionBankRow, QuestionPaperRow } from './supabaseClient'
import { formatDatabaseError, requireSupabaseClient } from './supabaseClient'

function mapPaperRow(row: QuestionPaperRow): SavedPaper {
  const paper = row.paper as unknown as GeneratedPaper
  const paperSets = Array.isArray(row.paper_sets) ? row.paper_sets as unknown as GeneratedPaper[] : [paper]
  return {
    kind: 'paper',
    id: row.id,
    paper,
    paperSets,
    examDate: row.exam_date,
    examTime: row.exam_time,
    createdAt: row.created_at,
    createdBy: row.created_by,
    status: row.status,
  }
}

export async function getCloudPapers() {
  const client = requireSupabaseClient()
  const { data, error } = await client
    .from('question_papers')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw new Error(formatDatabaseError('Could not load saved question papers.', error))
  return (data ?? []).map(mapPaperRow)
}

export async function saveCloudPaper(
  paperSets: GeneratedPaper[],
  examDate: string,
  examTime: string,
  ownerId: string,
) {
  const primary = paperSets[0]
  if (!primary) throw new Error('Cannot save an empty question-paper set.')
  const client = requireSupabaseClient()
  const { data: saved, error } = await client
    .from('question_papers')
    .insert({
      title: primary.title,
      assessment_type: primary.assessmentType,
      subject: primary.subject,
      subject_code: primary.subjectCode,
      status: 'pending_review',
      paper: primary as unknown as Json,
      paper_sets: paperSets as unknown as Json,
      exam_date: examDate,
      exam_time: examTime,
      created_by: ownerId,
    })
    .select('*')
    .single()
  if (error) throw new Error(formatDatabaseError('Could not save the generated question paper.', error))

  const questions = paperSets.flatMap((setPaper) => setPaper.questions.flatMap((question) => {
    const common = {
      paper_id: saved.id,
      subject: setPaper.subject,
      subject_code: setPaper.subjectCode,
      curriculum: setPaper.curriculum ?? (setPaper.isSchoolPaper ? 'School' : 'College / University'),
      grade_level: setPaper.gradeLevel,
      topic: '',
      marks: question.marks,
      source_type: 'generated' as const,
      source_name: setPaper.title,
      exam_set: setPaper.set,
      created_by: ownerId,
    }
    const variants = [{ question: question.question, answer: question.answer }]
    if (question.eitherOrQuestion) {
      variants.push({ question: question.eitherOrQuestion, answer: question.eitherOrAnswer ?? '' })
    }
    return variants.map((variant) => ({ ...common, ...variant }))
  }))
  const { error: questionError } = await client.from('question_bank').insert(questions)
  if (questionError) {
    const { error: rollbackError } = await client.from('question_papers').delete().eq('id', saved.id)
    const rollbackNote = rollbackError ? ` The incomplete paper remains saved (cleanup failed: ${rollbackError.message}).` : ' The incomplete paper was removed.'
    throw new Error(`${formatDatabaseError('Could not save generated questions to the question bank.', questionError)}${rollbackNote}`)
  }

  return mapPaperRow(saved)
}

export async function deleteCloudPaper(id: string) {
  const { error } = await requireSupabaseClient().from('question_papers').delete().eq('id', id)
  if (error) throw new Error(formatDatabaseError('Could not delete saved question paper.', error))
}

export async function updatePaperReviewStatus(id: string, status: 'approved' | 'rejected') {
  const { error } = await requireSupabaseClient()
    .from('question_papers')
    .update({ status })
    .eq('id', id)
  if (error) throw new Error(formatDatabaseError('Could not update paper approval.', error))
}

export async function getPaperTemplates() {
  const { data, error } = await requireSupabaseClient()
    .from('paper_templates')
    .select('*')
    .eq('is_archived', false)
    .order('updated_at', { ascending: false })
  if (error) throw new Error(formatDatabaseError('Could not load question paper templates.', error))
  return (data ?? []) as PaperTemplateRow[]
}

export async function getQuestionBank() {
  const { data, error } = await requireSupabaseClient()
    .from('question_bank')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw new Error(formatDatabaseError('Could not load your question bank.', error))
  return data ?? []
}

export async function addQuestionBankItems(
  questions: Array<Omit<QuestionBankRow, 'id' | 'created_by' | 'created_at' | 'updated_at'>>,
) {
  if (questions.length === 0) throw new Error('Add at least one question before saving.')
  const { data: userData, error: userError } = await requireSupabaseClient().auth.getUser()
  if (userError) throw new Error(`Could not verify the signed-in user: ${userError.message}`)
  if (!userData.user) throw new Error('Sign in before saving questions to your question bank.')
  const { error } = await requireSupabaseClient()
    .from('question_bank')
    .insert(questions.map((question) => ({ ...question, created_by: userData.user.id })))
  if (error) throw new Error(formatDatabaseError('Could not save imported questions.', error))
}

export async function updateQuestionBankItem(
  id: string,
  updates: Pick<QuestionBankRow, 'question' | 'answer' | 'subject' | 'subject_code' | 'curriculum' | 'grade_level' | 'topic' | 'marks'>,
) {
  const { error } = await requireSupabaseClient()
    .from('question_bank')
    .update(updates)
    .eq('id', id)
  if (error) throw new Error(formatDatabaseError('Could not update the question.', error))
}

export async function deleteQuestionBankItem(id: string) {
  const { error } = await requireSupabaseClient().from('question_bank').delete().eq('id', id)
  if (error) throw new Error(formatDatabaseError('Could not delete the question.', error))
}
