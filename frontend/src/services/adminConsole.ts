import { requireSupabaseClient } from './supabaseClient'
import { FunctionsFetchError, FunctionsHttpError, FunctionsRelayError } from '@supabase/supabase-js'

export type AdminOverview = {
  totalUsers: number
  activeUsers30Days: number
  totalPapers: number
  papersThisMonth: number
  pendingApprovals: number
  publishedTemplates: number
}

async function invokeAdminConsole<T extends object>(body: Record<string, unknown>) {
  const functionName = 'admin-console'
  const client = requireSupabaseClient()
  const projectUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
  const endpoint = projectUrl
    ? new URL(`/functions/v1/${functionName}`, projectUrl).toString()
    : functionName
  const { data, error } = await client.functions.invoke<T>(functionName, { body })
  if (error instanceof FunctionsFetchError) {
    const cause = error.context instanceof Error ? error.context.message : 'Unknown network error'
    if (import.meta.env.DEV) {
      console.error(`[Supabase Edge Function: ${functionName}] Request could not reach ${endpoint}.`, cause)
    }
    throw new Error(`Could not reach the "${functionName}" Edge Function. Confirm it is deployed to the project configured by VITE_SUPABASE_URL, then check the browser network connection and CORS settings.`)
  }
  if (error instanceof FunctionsRelayError) {
    const response = error.context instanceof Response ? ` (HTTP ${error.context.status})` : ''
    if (import.meta.env.DEV) console.error(`[Supabase Edge Function: ${functionName}] Relay error.`, error.context)
    throw new Error(`Supabase could not route the "${functionName}" Edge Function request${response}. Check the function deployment and Supabase project status.`)
  }
  if (error instanceof FunctionsHttpError) {
    const response = error.context instanceof Response ? error.context : null
    let detail = ''
    if (response) {
      try {
        const responseBody: unknown = await response.clone().json()
        if (
          typeof responseBody === 'object'
          && responseBody !== null
          && 'error' in responseBody
          && typeof responseBody.error === 'string'
        ) {
          detail = ` ${responseBody.error}`
        }
      } catch {
        detail = ''
      }
      if (import.meta.env.DEV) {
        console.error(`[Supabase Edge Function: ${functionName}] HTTP ${response.status}.`, detail || response.statusText)
      }
      throw new Error(`Admin operation failed: Edge Function "${functionName}" returned HTTP ${response.status}.${detail}`)
    }
    throw new Error(`Admin operation failed: ${error.message}`)
  }
  if (error) {
    if (import.meta.env.DEV) console.error(`[Supabase Edge Function: ${functionName}] Invocation failed.`, error)
    throw new Error(`Admin operation failed: ${error.message}`)
  }
  if (!data) throw new Error('Admin operation returned no data.')
  if ('error' in data && typeof data.error === 'string') throw new Error(data.error)
  return data
}

export function getAdminOverview() {
  return invokeAdminConsole<AdminOverview>({ action: 'overview' })
}
