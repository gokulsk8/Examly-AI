import { useState, type FormEvent } from 'react'
import { KeyRound } from 'lucide-react'
import { requireSupabaseClient } from '../services/supabaseClient'

type Props = {
  onComplete: () => void
}

export function PasswordRecovery({ onComplete }: Props) {
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    if (password.length < 8) {
      setError('Use a password with at least 8 characters.')
      return
    }
    if (password !== confirmation) {
      setError('The passwords do not match.')
      return
    }

    setIsSaving(true)
    try {
      const { error: updateError } = await requireSupabaseClient().auth.updateUser({ password })
      if (updateError) throw new Error(`Could not update your password: ${updateError.message}`)
      onComplete()
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Could not update your password.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#f5f1e8] px-5 py-10 text-[#1c2b25]">
      <form className="w-full max-w-[420px] border border-[#ded9ce] bg-white/75 p-6 shadow-sm sm:p-8" onSubmit={(event) => void handleSubmit(event)}>
        <span className="grid size-11 place-items-center rounded-lg bg-[#eaf3ed] text-[#267252]"><KeyRound size={20} /></span>
        <h1 className="mt-5 font-display text-3xl text-[#20382e]">Choose a new password</h1>
        <p className="mt-2 text-sm leading-6 text-[#78857c]">Use at least 8 characters for your Supabase account.</p>
        <label className="mt-6 block space-y-1.5 text-xs font-semibold text-[#485950]">New password
          <input className="mt-1.5 block w-full border border-[#d9d6cd] bg-white px-3 py-3 text-sm outline-none focus:border-[#b28c55]" type="password" autoComplete="new-password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} required />
        </label>
        <label className="mt-4 block space-y-1.5 text-xs font-semibold text-[#485950]">Confirm new password
          <input className="mt-1.5 block w-full border border-[#d9d6cd] bg-white px-3 py-3 text-sm outline-none focus:border-[#b28c55]" type="password" autoComplete="new-password" minLength={8} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required />
        </label>
        {error && <p className="mt-4 border border-[#f0c9bb] bg-[#fff5f0] px-3 py-2.5 text-xs text-[#9c4d36]" role="alert">{error}</p>}
        <button className="mt-5 w-full bg-[#173d32] px-4 py-3 text-sm font-semibold text-white hover:bg-[#285845] disabled:opacity-60" type="submit" disabled={isSaving}>{isSaving ? 'Updating...' : 'Update password'}</button>
      </form>
    </main>
  )
}
