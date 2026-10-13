import { ArrowLeft, Eye, EyeOff, KeyRound, Mail, ShieldCheck, UserRound } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { ExamlyLogo } from './ExamlyLogo'
import { createDemoAccount, resendDemoConfirmation, resetDemoPassword, signInDemo } from '../services/demoAuth'
import type { DemoSession } from '../types/session'

type Props = {
  onSignIn: (session: DemoSession) => void
  onPortalChange: (portal: 'member' | 'admin') => void
  configurationError?: string
}

export function DemoLogin({ onSignIn, onPortalChange, configurationError }: Props) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [mode, setMode] = useState<'login' | 'create' | 'reset'>('login')
  const [portal, setPortal] = useState<'member' | 'admin'>(() => window.sessionStorage.getItem('examly-auth-portal') === 'admin' ? 'admin' : 'member')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isResendingConfirmation, setIsResendingConfirmation] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)

  async function handleResendConfirmation() {
    setError('')
    setNotice('')
    setIsResendingConfirmation(true)
    try {
      await resendDemoConfirmation(email)
      setNotice('Confirmation email requested. Open the newest message in your inbox or spam folder and click its confirmation link. You cannot sign in until you complete that step.')
    } catch (resendError) {
      setError(resendError instanceof Error ? resendError.message : 'Could not resend the confirmation email.')
    } finally {
      setIsResendingConfirmation(false)
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setNotice('')
    setIsSubmitting(true)

    try {
      if (mode === 'login') {
        onSignIn(await signInDemo(email, password, portal))
      } else if (mode === 'create') {
        const createdSession = await createDemoAccount({ name, email, password, confirmation })
        if (createdSession) onSignIn(createdSession)
        else setNotice('Your account was created. Check your email to confirm it, then sign in.')
      } else {
        await resetDemoPassword({ email })
        setNotice('If an account exists for that email, Supabase has sent password reset instructions. Check your inbox and spam folder, then open the link to choose a new password.')
      }
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : 'Could not complete this action.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const title = mode === 'reset'
    ? 'Reset password'
    : mode === 'create'
      ? 'Create your account'
    : portal === 'admin' ? 'Admin portal sign in' : 'Sign in to Examly AI'
  const emailDeliveryRateLimited = /temporarily rate-limited email delivery/i.test(error)

  return (
    <main className="auth-shell min-h-screen bg-[#f5f1e8] text-[#1c2b25] md:grid md:grid-cols-[minmax(0,1.08fr)_minmax(340px,0.92fr)]">
      <section className="auth-story relative isolate flex min-h-[260px] flex-col justify-between overflow-hidden bg-[#173d32] px-6 py-6 text-white sm:min-h-[290px] sm:px-9 md:min-h-screen md:px-8 md:py-9 xl:px-16 xl:py-12" aria-label="Examly AI">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-[#15382f]/75 via-[#15382f]/78 to-[#102720]/95" />
        <div className="pointer-events-none absolute inset-4 border border-[#e7c58a]/35 sm:inset-6" />

        <ExamlyLogo size="large" />

        <div className="relative z-10 max-w-[570px] py-8 lg:py-0">
          <p className="text-[10px] font-semibold tracking-[0.2em] text-[#e7c58a]">ACADEMIC EDITION · 2026</p>
          <h2 className="mt-4 max-w-[540px] font-display text-[38px] leading-[1.08] text-[#fbf7ed] sm:text-[46px] lg:text-[58px]">
            A better question changes everything.
          </h2>
          <div className="mt-6 flex items-center gap-3 text-xs text-[#e1e6d9]">
            <span className="h-px w-9 bg-[#d7b675]" />
            <span>Smarter Questions. Better Assessments.</span>
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between gap-4 border-t border-white/20 pt-4 text-[9px] font-semibold tracking-[0.16em] text-[#d9dfd4]">
          <span>PRIVATE WORKSPACE</span>
          <span>EXAMLY AI</span>
        </div>
      </section>

      <section className="auth-panel flex min-h-[620px] items-center justify-center px-5 py-10 sm:px-9 md:min-h-screen md:px-6 xl:px-14">
        <div className="auth-card w-full max-w-[410px]">
          {mode === 'login' && (
            <div className="auth-portal-switch" role="group" aria-label="Choose sign-in portal">
              <button
                className={portal === 'member' ? 'is-active' : ''}
                type="button"
                aria-pressed={portal === 'member'}
                onClick={() => {
                  setPortal('member')
                  onPortalChange('member')
                  setError('')
                  setNotice('')
                }}
              >
                <UserRound size={15} /> Member
              </button>
              <button
                className={portal === 'admin' ? 'is-active' : ''}
                type="button"
                aria-pressed={portal === 'admin'}
                onClick={() => {
                  setPortal('admin')
                  onPortalChange('admin')
                  setError('')
                  setNotice('')
                }}
              >
                <ShieldCheck size={15} /> Admin portal
              </button>
            </div>
          )}
          <div className="mb-8 flex items-center justify-between gap-4">
            <p className="text-[10px] font-bold tracking-[0.18em] text-[#748178]">{mode === 'reset' ? 'ACCOUNT RECOVERY' : mode === 'create' ? 'NEW MEMBERSHIP' : portal === 'admin' ? 'ADMINISTRATOR ACCESS' : 'MEMBER ACCESS'}</p>
            <span className="inline-flex items-center gap-1.5 border border-[#d8d2c4] px-2.5 py-1.5 text-[9px] font-semibold tracking-[0.1em] text-[#637268]">
              {mode === 'create'
                ? <><UserRound size={12} />WORKSPACE MEMBER</>
                : <><ShieldCheck size={12} />SECURE SIGN-IN</>}
            </span>
          </div>

          <h1 className="font-display text-[34px] leading-tight text-[#20382e] sm:text-[38px]">{title}</h1>
          <p className="mt-2 text-sm leading-6 text-[#78857c]">
            {mode === 'reset'
              ? 'We will email you a secure password reset link.'
              : mode === 'create'
                ? 'Create an account in the shared Examly AI workspace.'
                : portal === 'admin'
                  ? 'Sign in with an administrator account assigned by your workspace owner.'
                : 'Use the email and password you registered with. New here? Create an account below.'}
          </p>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            {configurationError && <p className="border border-[#e7d6b5] bg-[#fbf5e8] px-3 py-2.5 text-xs leading-5 text-[#80633a]" role="alert">{configurationError}</p>}
            {mode === 'create' && (
              <label className="block space-y-1.5 text-xs font-semibold text-[#485950]">
                Full name
                <span className="flex items-center gap-2 border border-[#d9d6cd] bg-white/75 px-3 focus-within:border-[#b28c55] focus-within:ring-3 focus-within:ring-[#b28c55]/15">
                  <UserRound size={15} className="shrink-0 text-[#8b958d]" />
                  <input className="min-w-0 flex-1 bg-transparent py-3 text-sm font-medium text-[#24352c] outline-none placeholder:text-[#a4aaa4]" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" required />
                </span>
              </label>
            )}

            <label className="block space-y-1.5 text-xs font-semibold text-[#485950]">
              Email address
              <span className="flex items-center gap-2 border border-[#d9d6cd] bg-white/75 px-3 focus-within:border-[#b28c55] focus-within:ring-3 focus-within:ring-[#b28c55]/15">
                <Mail size={15} className="shrink-0 text-[#8b958d]" />
                <input className="min-w-0 flex-1 bg-transparent py-3 text-sm font-medium text-[#24352c] outline-none placeholder:text-[#a4aaa4]" autoComplete="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required />
              </span>
            </label>

            {mode !== 'reset' && <label className="block space-y-1.5 text-xs font-semibold text-[#485950]">
              Password
              <span className="flex items-center gap-2 border border-[#d9d6cd] bg-white/75 px-3 focus-within:border-[#b28c55] focus-within:ring-3 focus-within:ring-[#b28c55]/15">
                <KeyRound size={15} className="shrink-0 text-[#8b958d]" />
                <input className="min-w-0 flex-1 bg-transparent py-3 text-sm font-medium text-[#24352c] outline-none placeholder:text-[#a4aaa4]" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} type={showPassword ? 'text' : 'password'} minLength={mode === 'create' ? 8 : undefined} value={password} onChange={(event) => setPassword(event.target.value)} placeholder={mode === 'login' ? 'Your password' : 'At least 8 characters'} required />
                <button className="grid size-7 shrink-0 place-items-center text-[#78857c] hover:text-[#20382e]" type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} title={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword((visible) => !visible)}>{showPassword ? <EyeOff size={15} /> : <Eye size={15} />}</button>
              </span>
            </label>}

            {mode === 'create' && (
              <label className="block space-y-1.5 text-xs font-semibold text-[#485950]">
                Confirm password
                <span className="flex items-center gap-2 border border-[#d9d6cd] bg-white/75 px-3 focus-within:border-[#b28c55] focus-within:ring-3 focus-within:ring-[#b28c55]/15">
                  <KeyRound size={15} className="shrink-0 text-[#8b958d]" />
                  <input className="min-w-0 flex-1 bg-transparent py-3 text-sm font-medium text-[#24352c] outline-none placeholder:text-[#a4aaa4]" autoComplete="new-password" type={showConfirmation ? 'text' : 'password'} minLength={8} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder="Re-enter password" required />
                  <button className="grid size-7 shrink-0 place-items-center text-[#78857c] hover:text-[#20382e]" type="button" aria-label={showConfirmation ? 'Hide confirmation password' : 'Show confirmation password'} title={showConfirmation ? 'Hide password' : 'Show password'} onClick={() => setShowConfirmation((visible) => !visible)}>{showConfirmation ? <EyeOff size={15} /> : <Eye size={15} />}</button>
                </span>
              </label>
            )}

            {notice && <p className="border border-[#cfe4d5] bg-[#f2faf4] px-3 py-2.5 text-xs text-[#32714d]" role="status">{notice}</p>}
            {error && (
              <div className="space-y-2">
                <p className={`border px-3 py-2.5 text-xs leading-5 ${emailDeliveryRateLimited ? 'border-[#e7d6b5] bg-[#fbf5e8] text-[#80633a]' : 'border-[#f0c9bb] bg-[#fff5f0] text-[#9c4d36]'}`} role="alert">
                  {emailDeliveryRateLimited && <strong className="mb-1 block">Supabase email delivery is temporarily unavailable</strong>}
                  {error}
                </p>
                {mode === 'login' && /confirm your email address/i.test(error) && (
                  <button className="w-full border border-[#d8d2c4] bg-white/75 px-3 py-2.5 text-xs font-semibold text-[#795d37] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60" type="button" onClick={() => void handleResendConfirmation()} disabled={isResendingConfirmation || isSubmitting || emailDeliveryRateLimited}>
                    {isResendingConfirmation ? 'Requesting email…' : 'Resend confirmation email'}
                  </button>
                )}
              </div>
            )}

            <button className="w-full border border-[#173d32] bg-[#173d32] px-4 py-3.5 text-sm font-semibold text-[#fbf7ed] transition hover:border-[#285845] hover:bg-[#285845] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b28c55] disabled:cursor-not-allowed disabled:opacity-60" type="submit" disabled={isSubmitting || (emailDeliveryRateLimited && mode !== 'login')}>
              {isSubmitting ? 'Please wait…' : emailDeliveryRateLimited && mode !== 'login' ? 'Email delivery unavailable' : mode === 'login' ? portal === 'admin' ? 'Sign in to admin portal' : 'Sign in' : mode === 'create' ? 'Create account' : 'Send reset link'}
            </button>
          </form>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-xs">
            {mode === 'login' ? (
              <>
                <button className="font-semibold text-[#795d37] underline decoration-[#c9b58f] underline-offset-4 hover:text-[#49351d]" type="button" onClick={() => { setMode('reset'); setError(''); setNotice('') }}>Forgot password?</button>
                {portal === 'member' && <button className="font-semibold text-[#795d37] underline decoration-[#c9b58f] underline-offset-4 hover:text-[#49351d]" type="button" onClick={() => { setPortal('member'); onPortalChange('member'); setMode('create'); setError(''); setNotice('') }}>Create account</button>}
              </>
            ) : (
              <button className="inline-flex items-center gap-1.5 font-semibold text-[#795d37] hover:text-[#49351d]" type="button" onClick={() => { setMode('login'); setError(''); setNotice('') }}><ArrowLeft size={14} /> Back to sign in</button>
            )}
          </div>

          <p className="mt-7 border-t border-[#ded9ce] pt-4 text-[10px] leading-5 text-[#879087]">Accounts and question-paper data are stored in the shared Supabase workspace. Workspace roles are assigned by an administrator and do not replace database access policies.</p>
        </div>
      </section>
    </main>
  )
}