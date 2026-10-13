import { createClient } from '@supabase/supabase-js'

const email = process.argv[2]?.trim().toLowerCase()
const supabaseUrl = process.env.SUPABASE_URL?.trim()
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
const pageSize = 1000

function fail(message) {
  throw new Error(message)
}

function validateInputs() {
  if (!email || process.argv.length !== 3 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    fail('Usage: node scripts/grant-admin.mjs <user-email>')
  }
  if (!supabaseUrl || !serviceRoleKey) {
    fail('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment before running this script.')
  }

  let parsedUrl
  try {
    parsedUrl = new URL(supabaseUrl)
  } catch {
    fail('SUPABASE_URL must be a valid absolute URL.')
  }
  const isLocalhost = ['localhost', '127.0.0.1', '::1'].includes(parsedUrl.hostname)
  if (
    (parsedUrl.protocol !== 'https:' && !(isLocalhost && parsedUrl.protocol === 'http:'))
    || parsedUrl.username
    || parsedUrl.password
    || parsedUrl.search
    || parsedUrl.hash
  ) {
    fail('SUPABASE_URL must use HTTPS (HTTP is allowed only for localhost) and must not contain credentials or query parameters.')
  }

  if (serviceRoleKey.startsWith('sb_publishable_')) {
    fail('The supplied key is a publishable key. Use a server-only Supabase secret key or legacy service_role key.')
  }
  const tokenPayload = serviceRoleKey.split('.')[1]
  if (tokenPayload) {
    try {
      const claims = JSON.parse(Buffer.from(tokenPayload, 'base64url').toString('utf8'))
      if (claims.role && claims.role !== 'service_role') {
        fail('The supplied JWT is not a service_role key. Use a server-only Supabase secret key or legacy service_role key.')
      }
    } catch (error) {
      if (error instanceof SyntaxError) {
        fail('The supplied JWT key is malformed.')
      }
      throw error
    }
  } else if (!serviceRoleKey.startsWith('sb_secret_')) {
    fail('Use a server-only Supabase secret key or legacy service_role key.')
  }

  return parsedUrl
}

async function main() {
  const parsedUrl = validateInputs()
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  let targetUser
  for (let page = 1; ; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: pageSize })
    if (error) fail(`Could not list Supabase users: ${error.message}`)

    targetUser = data.users.find((user) => user.email?.toLowerCase() === email)
    if (targetUser || data.users.length < pageSize) break
  }

  if (!targetUser) {
    fail(`No account for ${email} was found in the Supabase project at ${parsedUrl.origin}. Check that the account exists and that SUPABASE_URL is the same project used by the website.`)
  }

  const existingAppMetadata = targetUser.app_metadata
  const { data, error } = await supabase.auth.admin.updateUserById(targetUser.id, {
    app_metadata: {
      ...existingAppMetadata,
      workspace_role: 'admin',
    },
  })
  if (error) fail(`Could not update App Metadata: ${error.message}`)
  if (data.user.app_metadata.workspace_role !== 'admin') {
    fail('Supabase did not confirm the administrator role update. Check the account in Authentication > Users.')
  }

  console.log(`Administrator role assigned to ${data.user.email}.`)
  console.log('Sign out of the website and sign in again using the Admin portal.')
}

main().catch((error) => {
  console.error(`Admin role update failed: ${error instanceof Error ? error.message : 'Unexpected error.'}`)
  process.exitCode = 1
})
