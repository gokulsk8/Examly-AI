import type { AuthChangeEvent, Session } from '@supabase/supabase-js'
import type { DemoSession } from '../types/session'
import { requireSupabaseClient } from './supabaseClient'

const portalStorageKey = 'examly-auth-portal'

export function getSelectedAuthPortal(): 'member' | 'admin' {
  return window.sessionStorage.getItem(portalStorageKey) === 'admin' ? 'admin' : 'member'
}

export function setSelectedAuthPortal(portal: 'member' | 'admin') {
  window.sessionStorage.setItem(portalStorageKey, portal)
}

function authErrorMessage(action: string, error: { code?: string; message: string; status?: number }) {
  const details = error.message.toLowerCase()
  if (
    error.status === 429
    || error.code?.toLowerCase().includes('rate')
    || details.includes('rate limit')
    || details.includes('too many requests')
  ) {
    return `${action} Supabase has temporarily rate-limited email delivery for this project. Wait before trying again. Using another email address will not bypass the project limit. The project owner can review Authentication rate limits or configure custom SMTP in Supabase.`
  }
  return `${action} ${error.message}`
}

export function sessionFromSupabase(session: Session | null): DemoSession | null {
  if (!session?.user) return null
  const metadata = session.user.user_metadata
  return {
    id: session.user.id,
    name: typeof metadata.full_name === 'string' ? metadata.full_name : session.user.email ?? 'User',
    role: session.user.app_metadata.workspace_role === 'admin' ? 'admin' : 'user',
    email: session.user.email ?? '',
  }
}

export function subscribeToAuthChanges(
  onChange: (session: DemoSession | null, event: AuthChangeEvent) => void,
) {
  const { data } = requireSupabaseClient().auth.onAuthStateChange((event, session) => {
    onChange(sessionFromSupabase(session), event)
  })
  return data.subscription
}

export async function getCurrentCloudSession() {
  const client = requireSupabaseClient()
  const { data, error } = await client.auth.getSession()
  if (error) throw new Error(`Could not restore your cloud session: ${error.message}`)
  if (!data.session) return null

  const { data: refreshedData, error: refreshError } = await client.auth.refreshSession(data.session)
  if (refreshError) throw new Error(`Could not refresh your cloud session: ${refreshError.message}`)
  const session = sessionFromSupabase(refreshedData.session)
  if (!session) return null

  const portal = getSelectedAuthPortal()
  if ((portal === 'admin') !== (session.role === 'admin')) {
    const { error: signOutError } = await client.auth.signOut({ scope: 'local' })
    window.sessionStorage.removeItem(portalStorageKey)
    if (signOutError) throw new Error(`Could not reset the sign-in portal for this session: ${signOutError.message}`)
    return null
  }
  return session
}

export async function createDemoAccount(input: {
  name: string
  email: string
  password: string
  confirmation: string
}) {
  if (input.password.length < 8) throw new Error('Use a password with at least 8 characters.')
  if (input.password !== input.confirmation) throw new Error('The passwords do not match.')
  if (!input.name.trim()) throw new Error('Enter your name.')

  const { data, error } = await requireSupabaseClient().auth.signUp({
    email: input.email.trim().toLowerCase(),
    password: input.password,
    options: { data: { full_name: input.name.trim() } },
  })
  if (error) throw new Error(authErrorMessage('Could not create your account.', error))
  const session = sessionFromSupabase(data.session)
  if (!session) return null
  setSelectedAuthPortal('member')
  return session
}

export async function signInDemo(email: string, password: string, portal: 'member' | 'admin' = 'member') {
  const { data, error } = await requireSupabaseClient().auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  })
  if (error) {
    if (error.code === 'email_not_confirmed') {
      throw new Error('Confirm your email address before signing in. Use the button below to request a new confirmation email.')
    }
    if (error.code === 'invalid_credentials' || error.message.toLowerCase() === 'invalid login credentials') {
      throw new Error('Email or password not recognized. If this is your first time, create an account. Otherwise, reset your password. If email confirmation is enabled, confirm your address before signing in.')
    }
    throw new Error(`Could not sign in: ${error.message}`)
  }
  const session = sessionFromSupabase(data.session)
  if (!session) throw new Error('Sign-in completed without an active session. Please try again.')
  if (portal === 'admin' && session.role !== 'admin') {
    const { error: signOutError } = await requireSupabaseClient().auth.signOut({ scope: 'local' })
    if (signOutError) {
      throw new Error(`This account does not have administrator access. Sign-out also failed: ${signOutError.message}`)
    }
    throw new Error('This account does not have administrator access. Use a member account or contact your workspace administrator.')
  }
  if (portal === 'member' && session.role === 'admin') {
    const { error: signOutError } = await requireSupabaseClient().auth.signOut({ scope: 'local' })
    if (signOutError) {
      throw new Error(`This account must use the Admin portal. Sign-out also failed: ${signOutError.message}`)
    }
    throw new Error('This account has administrator access. Sign out and choose the Admin portal to continue.')
  }
  setSelectedAuthPortal(portal)
  return session
}

export async function resendDemoConfirmation(email: string) {
  const normalizedEmail = email.trim().toLowerCase()
  if (!normalizedEmail) throw new Error('Enter your email address first.')
  const emailRedirectTo = new URL('/', window.location.origin).toString()
  const { error } = await requireSupabaseClient().auth.resend({
    type: 'signup',
    email: normalizedEmail,
    options: { emailRedirectTo },
  })
  if (error) throw new Error(authErrorMessage('Could not resend the confirmation email.', error))
}

export async function resetDemoPassword(input: { email: string }) {
  const email = input.email.trim().toLowerCase()
  if (!email) throw new Error('Enter the email address for your account.')

  const redirectTo = new URL('/', window.location.origin).toString()
  const { error } = await requireSupabaseClient().auth.resetPasswordForEmail(
    email,
    { redirectTo },
  )
  if (error) throw new Error(authErrorMessage('Could not send the password reset email.', error))
}

export async function signOutCloud() {
  const { error } = await requireSupabaseClient().auth.signOut()
  if (error) throw new Error(`Could not sign out: ${error.message}`)
  window.sessionStorage.removeItem(portalStorageKey)
}
