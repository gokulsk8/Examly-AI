import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import {
  Bell, BookOpen, Building2, Check, ChevronRight, CircleHelp, CreditCard, FileText,
  Laptop, LockKeyhole, LogOut, Moon, Palette, Save, ShieldCheck, Sun, UserRound,
} from 'lucide-react'
import { resetDemoPassword } from '../services/demoAuth'
import { requireSupabaseClient } from '../services/supabaseClient'
import type { WorkspacePage } from './Sidebar'

type SettingsSection =
  | 'profile' | 'institution' | 'exams' | 'templates' | 'notifications'
  | 'appearance' | 'security' | 'subscription' | 'help'

type UserSettings = {
  institutionName: string
  examType: 'semester' | 'internal' | 'assessment'
  notifications: {
    productUpdates: boolean
    paperReminders: boolean
  }
  theme: 'light' | 'dark'
}

type Props = {
  email: string
  name: string
  onProfileSaved: (name: string) => void
  onInstitutionSaved: (name: string) => void
  onApplyExamPreference: (type: UserSettings['examType']) => void
  onNavigate: (page: WorkspacePage) => void
  onSignOut: () => void
}

const storageKey = 'papertrail-user-settings'
const defaultSettings: UserSettings = {
  institutionName: '',
  examType: 'semester',
  notifications: { productUpdates: true, paperReminders: true },
  theme: 'light',
}

const sections: { id: SettingsSection; label: string; icon: typeof UserRound; group: string }[] = [
  { id: 'profile', label: 'My Profile', icon: UserRound, group: 'ACCOUNT' },
  { id: 'institution', label: 'Institution Details', icon: Building2, group: 'WORKSPACE' },
  { id: 'exams', label: 'Exam Preferences', icon: BookOpen, group: 'WORKSPACE' },
  { id: 'templates', label: 'Paper Templates', icon: FileText, group: 'WORKSPACE' },
  { id: 'notifications', label: 'Notifications', icon: Bell, group: 'PREFERENCES' },
  { id: 'appearance', label: 'Appearance', icon: Palette, group: 'PREFERENCES' },
  { id: 'security', label: 'Security & Privacy', icon: ShieldCheck, group: 'ACCOUNT' },
  { id: 'subscription', label: 'Subscription & Upgrade', icon: CreditCard, group: 'PLAN' },
  { id: 'help', label: 'Help & Support', icon: CircleHelp, group: 'PLAN' },
]

function readSettings(): UserSettings {
  const rawSettings = window.localStorage.getItem(storageKey)
  if (!rawSettings) return defaultSettings
  const parsed = JSON.parse(rawSettings) as Partial<UserSettings>
  return {
    ...defaultSettings,
    ...parsed,
    notifications: { ...defaultSettings.notifications, ...parsed.notifications },
  }
}

function SettingsCard({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section className="settings-card">
      <div className="settings-card-heading">
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
      </div>
      <div className="settings-card-content">{children}</div>
    </section>
  )
}

function SaveButton({ children = 'Save changes', disabled = false }: { children?: ReactNode; disabled?: boolean }) {
  return (
    <button className="settings-primary-button" type="submit" disabled={disabled}>
      <Save size={15} />{children}
    </button>
  )
}

export function Settings({
  email, name, onProfileSaved, onInstitutionSaved, onApplyExamPreference, onNavigate, onSignOut,
}: Props) {
  const [activeSection, setActiveSection] = useState<SettingsSection>('profile')
  const [initialPreferences] = useState(() => {
    try {
      return { settings: readSettings(), error: '' }
    } catch (loadError) {
      return {
        settings: defaultSettings,
        error: loadError instanceof Error ? `Could not load saved settings: ${loadError.message}` : 'Could not load saved settings.',
      }
    }
  })
  const [settings, setSettings] = useState(initialPreferences.settings)
  const [profileName, setProfileName] = useState(name)
  const [isSaving, setIsSaving] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState(initialPreferences.error)
  const [isResettingPassword, setIsResettingPassword] = useState(false)

  useEffect(() => {
    document.documentElement.classList.toggle('theme-dark', settings.theme === 'dark')
  }, [settings.theme])

  function saveSettings(next: UserSettings, message: string) {
    setError('')
    setStatus('')
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(next))
      setSettings(next)
      setStatus(message)
      return true
    } catch (saveError) {
      setError(saveError instanceof Error ? `Could not save settings: ${saveError.message}` : 'Could not save settings.')
      return false
    }
  }

  async function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmedName = profileName.trim()
    if (!trimmedName) {
      setError('Enter your name before saving.')
      return
    }
    setIsSaving(true)
    setError('')
    setStatus('')
    try {
      const { error: updateError } = await requireSupabaseClient().auth.updateUser({
        data: { full_name: trimmedName },
      })
      if (updateError) throw new Error(`Could not update your profile: ${updateError.message}`)
      onProfileSaved(trimmedName)
      setStatus('Profile updated.')
    } catch (profileError) {
      setError(profileError instanceof Error ? profileError.message : 'Could not update your profile.')
    } finally {
      setIsSaving(false)
    }
  }

  function handleInstitutionSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const institutionName = settings.institutionName.trim()
    if (!saveSettings({ ...settings, institutionName }, 'Institution details saved.')) return
    onInstitutionSaved(institutionName)
  }

  function handleExamSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!saveSettings(settings, 'Exam preference saved and applied to the paper builder.')) return
    onApplyExamPreference(settings.examType)
  }

  async function handlePasswordReset() {
    setIsResettingPassword(true)
    setError('')
    setStatus('')
    try {
      await resetDemoPassword({ email })
      setStatus(`Password reset email sent to ${email}.`)
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : 'Could not send the password reset email.')
    } finally {
      setIsResettingPassword(false)
    }
  }

  const activeItem = sections.find((section) => section.id === activeSection) ?? sections[0]
  const ActiveIcon = activeItem.icon

  return (
    <div className="settings-layout mx-auto mt-6 max-w-[1440px]">
      <aside className="settings-navigation" aria-label="Settings sections">
        <div className="settings-navigation-heading">
          <div className="settings-navigation-icon"><LockKeyhole size={18} /></div>
          <div><h2>Settings</h2><p>Manage your workspace</p></div>
        </div>
        {['ACCOUNT', 'WORKSPACE', 'PREFERENCES', 'PLAN'].map((group) => (
          <div className="settings-nav-group" key={group}>
            <p className="settings-nav-label">{group}</p>
            {sections.filter((section) => section.group === group).map(({ id, label, icon: Icon }) => (
              <button
                className={`settings-nav-item${activeSection === id ? ' is-active' : ''}`}
                key={id}
                type="button"
                aria-current={activeSection === id ? 'page' : undefined}
                onClick={() => { setActiveSection(id); setError(''); setStatus('') }}
              >
                <Icon size={17} /><span>{label}</span><ChevronRight className="settings-nav-chevron" size={15} />
              </button>
            ))}
          </div>
        ))}
        <button className="settings-logout-button" type="button" onClick={onSignOut}>
          <LogOut size={17} />Log out
        </button>
      </aside>

      <section className="settings-content">
        <header className="settings-page-heading">
          <div className="settings-page-icon"><ActiveIcon size={20} /></div>
          <div><p>YOUR WORKSPACE</p><h1>{activeItem.label}</h1></div>
        </header>
        {error && <p className="settings-message is-error" role="alert">{error}</p>}
        {status && <p className="settings-message is-success" role="status"><Check size={16} />{status}</p>}

        {activeSection === 'profile' && (
          <SettingsCard title="Profile information" description="Update the name associated with your Examly AI account.">
            <form className="settings-form" onSubmit={(event) => void handleProfileSubmit(event)}>
              <label>Full name<input value={profileName} onChange={(event) => setProfileName(event.target.value)} autoComplete="name" required /></label>
              <label>Email address<input value={email} readOnly aria-describedby="profile-email-note" /><span id="profile-email-note">Your sign-in email is managed securely by Supabase.</span></label>
              <SaveButton disabled={isSaving}>{isSaving ? 'Saving…' : 'Save profile'}</SaveButton>
            </form>
          </SettingsCard>
        )}

        {activeSection === 'institution' && (
          <SettingsCard title="Institution details" description="Save your institution name to prefill it when creating a question paper.">
            <form className="settings-form" onSubmit={handleInstitutionSubmit}>
              <label>College or school name<input value={settings.institutionName} onChange={(event) => setSettings({ ...settings, institutionName: event.target.value })} placeholder="Enter your institution name" /></label>
              <p className="settings-inline-note">This preference is stored in this browser and used as the institution name in the paper builder.</p>
              <SaveButton />
            </form>
          </SettingsCard>
        )}

        {activeSection === 'exams' && (
          <SettingsCard title="Default exam format" description="Choose the assessment format to apply when you use the paper builder.">
            <form className="settings-form" onSubmit={handleExamSubmit}>
              <label>Assessment type
                <select value={settings.examType} onChange={(event) => setSettings({ ...settings, examType: event.target.value as UserSettings['examType'] })}>
                  <option value="semester">Semester examination</option>
                  <option value="internal">Internal assessment (CIAT)</option>
                  <option value="assessment">School assessment</option>
                </select>
              </label>
              <p className="settings-inline-note">Applying this preference updates the assessment type and question counts in the builder.</p>
              <SaveButton />
            </form>
          </SettingsCard>
        )}

        {activeSection === 'templates' && (
          <SettingsCard title="Paper templates" description="Manage reusable exam structures and question counts.">
            <div className="settings-action-row">
              <div className="settings-row-icon"><FileText size={19} /></div>
              <div><strong>Question patterns</strong><p>Review and customize your existing school and college exam patterns.</p></div>
              <button className="settings-secondary-button" type="button" onClick={() => onNavigate('patterns')}>Open patterns<ChevronRight size={15} /></button>
            </div>
          </SettingsCard>
        )}

        {activeSection === 'notifications' && (
          <SettingsCard title="Notification preferences" description="Choose which optional product reminders are enabled in this browser.">
            <div className="settings-toggle-list">
              {([
                ['productUpdates', 'Product updates', 'Occasional updates about new question-paper features.'],
                ['paperReminders', 'Paper reminders', 'Reminders to review and save a paper you are working on.'],
              ] as const).map(([key, label, description]) => (
                <label className="settings-toggle-row" key={key}>
                  <span><strong>{label}</strong><small>{description}</small></span>
                  <input
                    type="checkbox"
                    checked={settings.notifications[key]}
                    onChange={(event) => {
                      const next = { ...settings, notifications: { ...settings.notifications, [key]: event.target.checked } }
                      saveSettings(next, 'Notification preferences saved.')
                    }}
                  />
                </label>
              ))}
            </div>
            <p className="settings-inline-note">Email notifications are not sent unless a notification service is configured.</p>
          </SettingsCard>
        )}

        {activeSection === 'appearance' && (
          <SettingsCard title="Appearance" description="Choose the display theme for your workspace.">
            <div className="settings-theme-options">
              {([
                ['light', Sun, 'Light', 'Bright workspace with white cards'],
                ['dark', Moon, 'Dark', 'Low-light navy workspace'],
              ] as const).map(([theme, Icon, label, description]) => (
                <button
                  className={`settings-theme-option${settings.theme === theme ? ' is-selected' : ''}`}
                  key={theme}
                  type="button"
                  aria-pressed={settings.theme === theme}
                  onClick={() => {
                    const next = { ...settings, theme }
                    if (!saveSettings(next, `${label} appearance enabled.`)) return
                    document.documentElement.classList.toggle('theme-dark', theme === 'dark')
                  }}
                >
                  <Icon size={20} /><span><strong>{label} mode</strong><small>{description}</small></span>
                  {settings.theme === theme && <Check size={17} />}
                </button>
              ))}
            </div>
          </SettingsCard>
        )}

        {activeSection === 'security' && (
          <SettingsCard title="Security & privacy" description="Your sign-in and password are managed by Supabase authentication.">
            <div className="settings-action-row">
              <div className="settings-row-icon"><LockKeyhole size={19} /></div>
              <div><strong>Password</strong><p>Request a secure password reset link for {email}.</p></div>
              <button className="settings-secondary-button" type="button" disabled={isResettingPassword} onClick={() => void handlePasswordReset()}>
                {isResettingPassword ? 'Sending…' : 'Reset password'}
              </button>
            </div>
            <div className="settings-action-row">
              <div className="settings-row-icon"><ShieldCheck size={19} /></div>
              <div><strong>Account security</strong><p>Your credentials are handled by Supabase; this app does not store your password.</p></div>
            </div>
          </SettingsCard>
        )}

        {activeSection === 'subscription' && (
          <SettingsCard title="Subscription & upgrade" description="Plan and payment options for this workspace.">
            <div className="settings-plan-card">
              <div className="settings-plan-badge"><Laptop size={17} />CURRENT WORKSPACE</div>
              <h3>Question Paper Generator</h3>
              <p>Your current app includes the available paper-building, syllabus, and question-bank features.</p>
              <button className="settings-secondary-button" type="button" disabled title="No billing provider is configured for this project">Upgrade options unavailable</button>
              <small>No subscription or billing provider is connected, so paid upgrades cannot be processed here.</small>
            </div>
          </SettingsCard>
        )}

        {activeSection === 'help' && (
          <SettingsCard title="Help & support" description="Find your way around the question-paper workspace.">
            <div className="settings-action-row">
              <div className="settings-row-icon"><BookOpen size={19} /></div>
              <div><strong>Question paper guides</strong><p>Use the builder, school papers, question patterns, and saved papers from the main workspace.</p></div>
            </div>
            <div className="settings-action-row">
              <div className="settings-row-icon"><CircleHelp size={19} /></div>
              <div><strong>Contact support</strong><p>Send a support email with details about what you need help with.</p></div>
              <a className="settings-secondary-button" href="mailto:?subject=Question%20Paper%20Generator%20support">Email support</a>
            </div>
          </SettingsCard>
        )}
      </section>
    </div>
  )
}
