import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type QuestionPaperRow = {
  id: string
  title: string
  assessment_type: string
  subject: string
  subject_code: string
  status: 'draft' | 'pending_review' | 'approved' | 'rejected' | 'completed' | 'archived'
  paper: Json
  paper_sets: Json
  exam_date: string
  exam_time: string
  created_by: string
  created_at: string
}

export type PaperTemplateRow = {
  id: string
  name: string
  description: string
  subject: string
  course: string
  assessment_type: string
  configuration: Json
  is_published: boolean
  is_archived: boolean
  is_default: boolean
  usage_count: number
  created_by: string
  updated_by: string | null
  created_at: string
  updated_at: string
}

export type QuestionBankRow = {
  id: string
  paper_id: string | null
  question: string
  answer: string
  subject: string
  subject_code: string
  curriculum: string
  grade_level: string
  topic: string
  marks: number
  source_type: 'generated' | 'uploaded'
  source_name: string
  exam_set: string
  created_by: string
  created_at: string
  updated_at: string
}

type Table<Row, Insert, Update> = {
  Row: Row
  Insert: Insert
  Update: Update
  Relationships: []
}

export type Database = {
  public: {
    Tables: {
      question_papers: Table<
        QuestionPaperRow,
        Omit<QuestionPaperRow, 'id' | 'created_at'> & Partial<Pick<QuestionPaperRow, 'id' | 'created_at'>>,
        Partial<QuestionPaperRow>
      >
      question_bank: Table<
        QuestionBankRow,
        Omit<QuestionBankRow, 'id' | 'created_by' | 'created_at' | 'updated_at'> & Partial<Pick<QuestionBankRow, 'id' | 'created_by' | 'created_at' | 'updated_at'>>,
        Partial<QuestionBankRow>
      >
      paper_templates: Table<
        PaperTemplateRow,
        Omit<PaperTemplateRow, 'id' | 'created_by' | 'created_at' | 'updated_at' | 'updated_by' | 'usage_count' | 'is_archived' | 'is_default'> & Partial<Pick<PaperTemplateRow, 'id' | 'created_by' | 'created_at' | 'updated_at' | 'updated_by' | 'usage_count' | 'is_archived' | 'is_default'>>,
        Partial<PaperTemplateRow>
      >
    }
    Views: Record<string, never>
    Functions: {
      set_default_paper_template: {
        Args: { template_id: string }
        Returns: undefined
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

let client: SupabaseClient<Database> | null | undefined

export function getSupabaseClient() {
  if (client !== undefined) return client
  const url = import.meta.env.VITE_SUPABASE_URL?.trim()
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()
  if (!url || !anonKey) {
    client = null
    return client
  }
  let parsedUrl: URL
  try {
    parsedUrl = new URL(url)
  } catch {
    throw new Error('VITE_SUPABASE_URL must be a valid absolute URL.')
  }
  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    throw new Error('VITE_SUPABASE_URL must use HTTP or HTTPS.')
  }
  client = createClient<Database>(url, anonKey, {
    auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true },
  })
  return client
}

export function requireSupabaseClient() {
  const configured = getSupabaseClient()
  if (!configured) {
    throw new Error('Cloud database is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in frontend/.env, then restart the app.')
  }
  return configured
}

function getMissingColumn(error: { message: string }) {
  const postgrestMatch = error.message.match(/Could not find the ['"]([^'"]+)['"] column of ['"]([^'"]+)['"]/i)
  if (postgrestMatch) return { column: postgrestMatch[1], table: postgrestMatch[2] }

  const postgresMatch = error.message.match(/column\s+(?:[a-z_][\w$]*\.)?["']?([a-z_][\w$]*)["']?\s+does not exist/i)
  return postgresMatch ? { column: postgresMatch[1], table: undefined } : undefined
}

export function formatDatabaseError(
  action: string,
  error: { code?: string; message: string },
) {
  if (import.meta.env.DEV) {
    console.error('[Supabase database error]', {
      action,
      code: error.code ?? 'unknown',
      message: error.message,
    })
  }
  if (error.code === '42P01') {
    return `${action} The required Supabase table does not exist. Run frontend/supabase/schema.sql in the Supabase SQL Editor, then retry.`
  }
  if (error.code === 'PGRST205') {
    return `${action} The Supabase API cannot find the required table. Run frontend/supabase/schema.sql in the Supabase SQL Editor. If the tables already exist, ensure public is listed under Project Settings > API > Exposed schemas, then retry.`
  }
  if (error.code === '42703' || error.code === 'PGRST204') {
    const missing = getMissingColumn(error)
    if (missing?.table === 'question_papers' && missing.column === 'status') {
      return `${action} The question_papers.status column is missing. Apply frontend/supabase/migrations/20261011000100_role_based_workspace.sql after frontend/supabase/schema.sql in the Supabase SQL Editor, then retry.`
    }
    const missingColumn = missing
      ? ` The missing column is ${missing.table ? `${missing.table}.` : ''}${missing.column}.`
      : ' A required database column is missing.'
    return `${action}${missingColumn} Compare the live table with frontend/supabase/schema.sql and the applicable migrations before changing the database.`
  }
  if (error.code === '42501') {
    return `${action} Supabase denied this database operation. Check that the user is signed in and that the row-level security policies in frontend/supabase/schema.sql and the paper-approval migration are applied.`
  }
  return `${action} Supabase rejected this database operation. Check the database schema, the signed-in account, and its database permissions.`
}
