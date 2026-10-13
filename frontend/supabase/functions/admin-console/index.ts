import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

type ConsoleRequest = { action: 'overview' }
type DatabaseError = {
  code?: unknown
  message?: unknown
  details?: unknown
  hint?: unknown
} | null | undefined
type DatabaseResult = {
  error: DatabaseError
  status: number
  statusText: string
  count: number | null
}

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function reportDatabaseError(operation: string, result: DatabaseResult, projectHost: string) {
  const error = result.error && typeof result.error === 'object' ? result.error : null
  const value = (field: 'code' | 'message' | 'details' | 'hint') => (
    typeof error?.[field] === 'string' && error[field] ? error[field] : null
  )
  const code = value('code')
  const message = value('message')
  const details = value('details')
  const hint = value('hint')
  const diagnostic = {
    event: 'admin_console_database_error',
    operation,
    projectHost,
    httpStatus: result.status || null,
    httpStatusText: result.statusText || null,
    code,
    message,
    details,
    hint,
    count: result.count,
  }
  console.error(JSON.stringify(diagnostic))

  const errorCode = code ? ` (${code})` : ''
  const httpStatus = result.status ? ` HTTP ${result.status}${result.statusText ? ` ${result.statusText}` : ''}.` : ''
  const explanation = message || details || hint || (
    result.status >= 200 && result.status < 300 && result.count === null
      ? 'The database returned no exact count.'
      : 'The database returned an empty error payload.'
  )
  return `Could not load admin summary for ${operation}${errorCode}.${httpStatus} ${explanation}`
}

function isDatabaseFailure(result: DatabaseResult) {
  return Boolean(result.error) || result.status < 200 || result.status >= 300 || result.count === null
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return response({ error: 'Use POST for admin console actions.' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    console.error('Admin console function is missing required Supabase environment configuration.')
    return response({ error: 'Admin services are not configured.' }, 500)
  }

  const authorization = request.headers.get('Authorization')
  const accessToken = authorization?.match(/^Bearer\s+(.+)$/i)?.[1]
  if (!accessToken) return response({ error: 'Sign in with an administrator account to continue.' }, 401)

  const callerClient = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data: authData, error: authError } = await callerClient.auth.getUser(accessToken)
  if (authError || !authData.user) return response({ error: 'Your session is invalid or expired. Sign in again.' }, 401)
  if (authData.user.app_metadata.workspace_role !== 'admin') {
    return response({ error: 'Administrator access is required for this operation.' }, 403)
  }

  let body: ConsoleRequest
  try {
    body = await request.json()
  } catch {
    return response({ error: 'Request body must be valid JSON.' }, 400)
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const projectHost = new URL(supabaseUrl).host

  try {
    if (body.action === 'overview') {
      const now = new Date()
      const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString()
      const [paperCount, monthCount, pendingCount, templateCount] = await Promise.all([
        adminClient.from('question_papers').select('id', { count: 'exact', head: true }),
        adminClient.from('question_papers').select('id', { count: 'exact', head: true }).gte('created_at', monthStart),
        adminClient.from('question_papers').select('id', { count: 'exact', head: true }).eq('status', 'pending_review'),
        adminClient.from('paper_templates').select('id', { count: 'exact', head: true }).eq('is_published', true).eq('is_archived', false),
      ])
      const countErrors: Array<{ operation: string; result: DatabaseResult }> = [
        { operation: 'total question-paper count', result: paperCount },
        { operation: 'current-month question-paper count', result: monthCount },
        { operation: 'pending approval count', result: pendingCount },
        { operation: 'published-template count', result: templateCount },
      ]
      const countError = countErrors.find((result) => isDatabaseFailure(result.result))
      if (countError) {
        return response({ error: reportDatabaseError(countError.operation, countError.result, projectHost) }, 500)
      }

      let totalUsers = 0
      let activeUsers30Days = 0
      for (let page = 1; ; page += 1) {
        const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage: 1000 })
        if (error) {
          console.error(JSON.stringify({
            event: 'admin_console_auth_admin_error',
            operation: 'list users for overview',
            code: error.code ?? null,
            message: error.message || null,
          }))
          return response({
            error: `Could not load user statistics${error.code ? ` (${error.code})` : ''}: ${error.message || 'No Auth API error message was returned.'}`,
          }, 500)
        }
        totalUsers += data.users.length
        const activeThreshold = Date.now() - 30 * 24 * 60 * 60 * 1000
        activeUsers30Days += data.users.filter((user) => (
          user.last_sign_in_at && Date.parse(user.last_sign_in_at) >= activeThreshold
        )).length
        if (data.users.length < 1000) break
      }

      return response({
        totalUsers,
        activeUsers30Days,
        totalPapers: paperCount.count ?? 0,
        papersThisMonth: monthCount.count ?? 0,
        pendingApprovals: pendingCount.count ?? 0,
        publishedTemplates: templateCount.count ?? 0,
      })
    }

    return response({ error: 'Unknown admin console action.' }, 400)
  } catch (error) {
    console.error(`Admin console request failed: ${error instanceof Error ? error.message : 'Unexpected error.'}`)
    return response({ error: 'The admin operation could not be completed.' }, 500)
  }
})
