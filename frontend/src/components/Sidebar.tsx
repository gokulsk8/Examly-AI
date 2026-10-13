import { ClipboardList, Database, FilePlus2, Files, GraduationCap, Library, LogOut, Settings as SettingsIcon, ShieldCheck, UserRound, Shield } from 'lucide-react'
import { ExamlyLogo } from './ExamlyLogo'
import type { DemoRole } from '../types/session'

export type WorkspacePage =
  | 'builder' | 'school' | 'patterns' | 'library' | 'papers' | 'database' | 'settings'
  | 'adminDashboard'

type Props = {
  role: DemoRole
  name: string
  activePage: WorkspacePage
  onNavigate: (page: WorkspacePage) => void
  onSignOut: () => void
}

export function Sidebar({ role, name, activePage, onNavigate, onSignOut }: Props) {
  const navigation = [
    { page: 'builder' as const, label: 'Generate question paper', icon: FilePlus2 },
    { page: 'school' as const, label: 'School papers', icon: GraduationCap },
    { page: 'patterns' as const, label: 'Question patterns', icon: ClipboardList },
    { page: 'library' as const, label: 'Syllabus library', icon: Library },
    { page: 'papers' as const, label: 'Question papers', icon: Files },
    { page: 'database' as const, label: 'My question bank', icon: Database },
    ...(role === 'admin' ? [{ page: 'adminDashboard' as const, label: 'Admin controls', icon: Shield }] : []),
    { page: 'settings' as const, label: 'Profile & settings', icon: SettingsIcon },
  ]

  return (
    <aside className="workspace-sidebar no-print flex shrink-0 items-center justify-between gap-3 bg-[#173d32] px-4 py-3 text-white lg:min-h-screen lg:w-[236px] lg:flex-col lg:items-stretch lg:px-5 lg:py-6">
      <div className="flex items-center gap-3 lg:block">
        <div className="flex items-center gap-2.5">
          <ExamlyLogo size="small" />
        </div>
        <p className="mt-9 hidden px-2 text-[10px] font-bold tracking-[0.15em] text-[#8dac9d] lg:block">{role === 'admin' ? 'EXAMLY AI · ADMIN' : 'EXAMLY AI · FACULTY'}</p>
        <nav className="mt-3 hidden flex-col gap-1 lg:flex" aria-label="Main navigation">
          {navigation.map(({ page, label, icon: Icon }) => (
            <button className={`flex items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-semibold transition ${activePage === page ? 'bg-white/10 text-white' : 'text-[#c6d8cf] hover:bg-white/[0.06]'}`} type="button" onClick={() => onNavigate(page)} key={page}>
              <Icon size={17} className="text-[#efb46c]" /> {label}
            </button>
          ))}
          <button className="flex items-center gap-3 rounded-lg border-t border-white/10 px-3 py-3 text-left text-sm font-semibold text-[#c6d8cf] transition hover:bg-white/[0.06] hover:text-white" type="button" onClick={onSignOut}>
            <LogOut size={17} /> Log out
          </button>
        </nav>
      </div>

      <nav className="flex max-w-[58vw] items-center gap-1 overflow-x-auto lg:hidden" aria-label="Main navigation">
        {navigation.map(({ page, label, icon: Icon }) => (
          <button className={`grid size-10 shrink-0 place-items-center rounded-lg ${activePage === page ? 'bg-white/10 text-white' : 'text-[#c6d8cf]'}`} type="button" aria-label={label} title={label} onClick={() => onNavigate(page)} key={page}><Icon size={18} /></button>
        ))}
      </nav>

      <div className="hidden rounded-xl border border-white/10 bg-white/[0.045] p-3.5 lg:block">
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-[#e9f4ee]">
          {role === 'admin' ? <ShieldCheck size={14} className="text-[#efb46c]" /> : <UserRound size={14} className="text-[#efb46c]" />}
          {role === 'admin' ? 'ADMIN' : 'FACULTY'}
        </div>
        <p className="truncate text-[11px] leading-5 text-[#a8c5b7]">Signed in as {name}</p>
      </div>

      <button className="flex size-10 shrink-0 items-center justify-center rounded-lg text-[#c6d8cf] transition hover:bg-white/10 hover:text-white lg:hidden" type="button" aria-label="Sign out" title="Sign out" onClick={onSignOut}>
        <LogOut size={17} />
      </button>
    </aside>
  )
}