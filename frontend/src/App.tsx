import { lazy, Suspense, useEffect, useRef, useState, type FormEvent } from 'react'
import { DemoLogin } from './components/DemoLogin'
import { PasswordRecovery } from './components/PasswordRecovery'
import { Sidebar } from './components/Sidebar'
import { COLLEGE_EXAM_PATTERNS, createCollegePatternCounts, type CollegePatternId } from './data/collegePatterns'
import { ASSESSMENT_FORMATS, UNIVERSITY_QUESTION_TYPE_IDS } from './data/options'
import { createSchoolPatternCounts, SCHOOL_EXAM_TEMPLATES, SCHOOL_MAX_MARKS, SCHOOL_QUESTION_TYPE_IDS, type SchoolExamId } from './data/schoolPatterns'
import { CURRICULA, suggestTopics } from './data/topicSuggestions'
import { deleteCloudPaper, getCloudPapers, saveCloudPaper } from './services/cloudPapers'
import { getCurrentCloudSession, getSelectedAuthPortal, setSelectedAuthPortal, signOutCloud, subscribeToAuthChanges } from './services/demoAuth'
import { getSupabaseClient } from './services/supabaseClient'
import { deleteSavedPaper as deleteLocalSavedPaper, deleteSyllabus, getSavedPapers as getLocalSavedPapers, getSyllabi, markSavedPaperSynced, saveSyllabus } from './services/syllabusDb'
import type { AssessmentType, CollegeInternalAssessmentType, GeneratedPaper, PaperRequest, PaperSet, QuestionTypeId, SavedPaper, SchoolQuestionStyle } from './types/paper'
import type { WorkspacePage } from './components/Sidebar'
import type { DemoSession } from './types/session'
import type { StoredSyllabus } from './types/syllabus'

const AdminWorkspace = lazy(() => import('./components/AdminWorkspace').then(({ AdminWorkspace }) => ({ default: AdminWorkspace })))
const BloomSelector = lazy(() => import('./components/BloomSelector').then(({ BloomSelector }) => ({ default: BloomSelector })))
const PaperPreview = lazy(() => import('./components/PaperPreview').then(({ PaperPreview }) => ({ default: PaperPreview })))
const QuestionBank = lazy(() => import('./components/QuestionBank').then(({ QuestionBank }) => ({ default: QuestionBank })))
const QuestionPatterns = lazy(() => import('./components/QuestionPatterns').then(({ QuestionPatterns }) => ({ default: QuestionPatterns })))
const QuestionTypeSelector = lazy(() => import('./components/QuestionTypeSelector').then(({ QuestionTypeSelector }) => ({ default: QuestionTypeSelector })))
const SavedPapersLibrary = lazy(() => import('./components/SavedPapersLibrary').then(({ SavedPapersLibrary }) => ({ default: SavedPapersLibrary })))
const SchoolPapers = lazy(() => import('./components/SchoolPapers').then(({ SchoolPapers }) => ({ default: SchoolPapers })))
const Settings = lazy(() => import('./components/Settings').then(({ Settings }) => ({ default: Settings })))
const SyllabusLibrary = lazy(() => import('./components/SyllabusLibrary').then(({ SyllabusLibrary }) => ({ default: SyllabusLibrary })))
const TopicSelection = lazy(() => import('./components/TopicSelection').then(({ TopicSelection }) => ({ default: TopicSelection })))

const initialTopics = suggestTopics('College / University', 'Data Structures', 'Semester 3')
const initialSemesterPattern = COLLEGE_EXAM_PATTERNS.find((pattern) => pattern.id === 'semester-14')
const adminWorkspacePages: WorkspacePage[] = ['adminDashboard']
const workspacePageTitles: Record<WorkspacePage, string> = {
  builder: 'Question paper builder',
  school: 'School papers',
  patterns: 'Question patterns',
  library: 'Syllabus upload dashboard',
  papers: 'My question papers',
  database: 'My question bank',
  settings: 'Profile & settings',
  adminDashboard: 'Admin controls',
}

const initialForm: PaperRequest = {
  curriculum: 'College / University',
  assessmentType: 'semester',
  course: '',
  subject: 'Data Structures',
  subjectCode: 'CS301',
  gradeLevel: 'Semester 3',
  durationMinutes: ASSESSMENT_FORMATS.semester.durationMinutes,
  syllabus: initialTopics.join('\n'),
  difficulty: 'Balanced',
  questionTypes: Object.entries(initialSemesterPattern?.questionCounts ?? ASSESSMENT_FORMATS.semester.questionCounts)
    .map(([type, count]) => ({ type: type as QuestionTypeId, count })),
  bloomsLevels: ['Remember', 'Understand', 'Apply', 'Analyze'],
  schoolQuestionStyles: [],
  longQuestionEitherOr: true,
}

function getLocalSchedule() {
  const now = new Date()
  const pad = (value: number) => String(value).padStart(2, '0')
  return {
    date: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
    time: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
  }
}

function getStartupPreferences() {
  try {
    const savedPreferences = window.localStorage.getItem('papertrail-user-settings')
    if (!savedPreferences) return {}
    const preferences: unknown = JSON.parse(savedPreferences)
    if (typeof preferences !== 'object' || preferences === null) return {}
    const institutionName = 'institutionName' in preferences && typeof preferences.institutionName === 'string'
      ? preferences.institutionName
      : undefined
    const theme = 'theme' in preferences && (preferences.theme === 'light' || preferences.theme === 'dark')
      ? preferences.theme
      : undefined
    return { institutionName, theme }
  } catch (preferenceError) {
    return {
      error: preferenceError instanceof Error
        ? `Could not load saved workspace preferences: ${preferenceError.message}`
        : 'Could not load saved workspace preferences.',
    }
  }
}

function collegePatternFor(assessmentType: AssessmentType) {
  return COLLEGE_EXAM_PATTERNS.find((pattern) => (
    pattern.assessmentType === assessmentType && pattern.longQuestionMarks === 14
  ))
}

function App() {
  const [startupPreferences] = useState(getStartupPreferences)
  const [session, setSession] = useState<DemoSession | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [authError, setAuthError] = useState('')
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false)
  const [activePage, setActivePage] = useState<WorkspacePage>('builder')
  const selectedPortal = useRef<'member' | 'admin'>(getSelectedAuthPortal())
  const [builderStep, setBuilderStep] = useState<1 | 2 | 3>(1)
  const builderStepContentRef = useRef<HTMLDivElement>(null)
  const [syllabi, setSyllabi] = useState<StoredSyllabus[]>([])
  const [savedPapers, setSavedPapers] = useState<SavedPaper[]>([])
  const [legacyPapers, setLegacyPapers] = useState<SavedPaper[]>([])
  const [storageReady, setStorageReady] = useState(false)
  const [form, setForm] = useState(() => ({
    ...initialForm,
    course: startupPreferences.institutionName ?? initialForm.course,
  }))
  const [schoolExamId, setSchoolExamId] = useState<SchoolExamId | null>(null)
  const [schoolPatternCounts, setSchoolPatternCounts] = useState(createSchoolPatternCounts)
  const [collegePatternCounts, setCollegePatternCounts] = useState(createCollegePatternCounts)
  const [examSchedule, setExamSchedule] = useState(getLocalSchedule)
  const [paper, setPaper] = useState<GeneratedPaper | null>(null)
  const [paperSets, setPaperSets] = useState<GeneratedPaper[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState('')
  const [cloudError, setCloudError] = useState(startupPreferences.error ?? '')
  const [syncingLocalPaperId, setSyncingLocalPaperId] = useState<string | null>(null)

  useEffect(() => {
    let isConfigured: boolean
    try {
      isConfigured = Boolean(getSupabaseClient())
    } catch (configurationError) {
      queueMicrotask(() => {
        setAuthError(configurationError instanceof Error ? configurationError.message : 'Supabase configuration is invalid.')
        setAuthReady(true)
      })
      return
    }
    if (!isConfigured) {
      queueMicrotask(() => {
        setAuthError('Supabase is not configured. Copy frontend/.env.example to frontend/.env, add the Supabase project URL and anon key, then restart the app.')
        setAuthReady(true)
      })
      return
    }

    const subscription = subscribeToAuthChanges((nextSession, event) => {
      if (
        (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')
        && nextSession
        && ((selectedPortal.current === 'admin' && nextSession.role !== 'admin')
          || (selectedPortal.current === 'member' && nextSession.role === 'admin'))
      ) return
      if (event === 'PASSWORD_RECOVERY' && nextSession) {
        selectedPortal.current = nextSession.role === 'admin' ? 'admin' : 'member'
        setSelectedAuthPortal(selectedPortal.current)
      }
      setSession(nextSession)
      if (event === 'SIGNED_IN' && nextSession) setActivePage(nextSession.role === 'admin' ? 'adminDashboard' : 'builder')
      if (event === 'PASSWORD_RECOVERY') setIsPasswordRecovery(true)
      if (event === 'SIGNED_OUT') setIsPasswordRecovery(false)
    })
    void getCurrentCloudSession()
      .then((currentSession) => {
        setSession(currentSession)
        if (currentSession) setActivePage(currentSession.role === 'admin' ? 'adminDashboard' : 'builder')
        setAuthError('')
      })
      .catch((sessionError) => {
        setAuthError(sessionError instanceof Error ? sessionError.message : 'Could not connect to Supabase authentication.')
      })
      .finally(() => setAuthReady(true))

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    void Promise.all([getSyllabi(), getLocalSavedPapers()])
      .then(([savedSyllabi, localPapers]) => {
        setSyllabi(savedSyllabi)
        setLegacyPapers(localPapers.filter((savedPaper) => !savedPaper.cloudId))
        setStorageReady(true)
      })
      .catch((storageError) => {
        setCloudError(storageError instanceof Error ? storageError.message : 'Could not load the local syllabus library.')
      })
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('theme-dark', startupPreferences.theme === 'dark')
  }, [startupPreferences.theme])

  useEffect(() => {
    if (!session?.id) return
    let isCurrent = true
    void getCloudPapers()
      .then((papers) => {
        if (isCurrent) {
          setSavedPapers(papers)
          setCloudError('')
        }
      })
      .catch((loadError) => {
        if (isCurrent) setCloudError(loadError instanceof Error ? loadError.message : 'Could not load saved question papers.')
      })
    return () => { isCurrent = false }
  }, [session?.id])
  const totalQuestions = form.questionTypes.reduce((total, item) => total + item.count, 0)
  const suggestedTopics = suggestTopics(form.curriculum, form.subject, form.gradeLevel)
  const assessmentFormat = ASSESSMENT_FORMATS[form.assessmentType]
  const estimatedMarks = form.questionTypes.reduce((total, item) => {
    return total + item.count * assessmentFormat.marksPerQuestion[item.type]
  }, 0)
  const isCollegeCurriculum = !schoolExamId && form.curriculum === 'College / University'
  const isSchoolCurriculum = !schoolExamId && ['Tamil Nadu State Board', 'CBSE'].includes(form.curriculum)
  const isSchoolContext = schoolExamId !== null || isSchoolCurriculum
  const schoolEstimatedMarks = form.questionTypes
    .filter((item) => SCHOOL_QUESTION_TYPE_IDS.includes(item.type))
    .reduce((total, item) => total + item.count * assessmentFormat.marksPerQuestion[item.type], 0)

  function updateField<K extends keyof PaperRequest>(field: K, value: PaperRequest[K]) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function updateTopicContext(field: 'curriculum' | 'subject' | 'gradeLevel', value: string) {
    if (field === 'curriculum' && schoolExamId && value === 'College / University') return

    setForm((current) => {
      const nextContext = { ...current, [field]: value }
      if (field === 'curriculum') {
        const switchingToSchool = ['Tamil Nadu State Board', 'CBSE'].includes(value)
        const wasSchoolCurriculum = ['Tamil Nadu State Board', 'CBSE'].includes(current.curriculum)
        if (value === 'College / University') {
          nextContext.course = ''
          nextContext.gradeLevel = ''
          if (wasSchoolCurriculum) {
            nextContext.assessmentType = 'semester'
            const pattern = collegePatternFor(nextContext.assessmentType)
            if (pattern) {
              nextContext.questionTypes = Object.entries(pattern.questionCounts).map(([type, count]) => ({
                type: type as QuestionTypeId,
                count,
              }))
              nextContext.longQuestionEitherOr = pattern.eitherOr
            } else {
              const format = ASSESSMENT_FORMATS.semester
              nextContext.questionTypes = Object.entries(format.questionCounts).map(([type, count]) => ({
                type: type as QuestionTypeId,
                count,
              }))
            }
          }
        } else if (switchingToSchool && !wasSchoolCurriculum) {
          nextContext.course = ''
          nextContext.gradeLevel = ''
          const defaultSchoolCounts = createSchoolPatternCounts().quarterly
          nextContext.assessmentType = 'assessment'
          nextContext.questionTypes = SCHOOL_QUESTION_TYPE_IDS.map((type) => ({
            type,
            count: defaultSchoolCounts[type],
          }))
        } else if (wasSchoolCurriculum && !switchingToSchool) {
          nextContext.course = ''
          nextContext.gradeLevel = ''
          const pattern = collegePatternFor(nextContext.assessmentType)
          if (pattern) {
            nextContext.questionTypes = Object.entries(pattern.questionCounts).map(([type, count]) => ({
              type: type as QuestionTypeId,
              count,
            }))
            nextContext.longQuestionEitherOr = pattern.eitherOr
          } else {
            const format = ASSESSMENT_FORMATS[nextContext.assessmentType]
            nextContext.questionTypes = Object.entries(format.questionCounts).map(([type, count]) => ({
              type: type as QuestionTypeId,
              count,
            }))
          }
        } else if (current.curriculum === 'College / University') {
          nextContext.course = ''
          nextContext.gradeLevel = ''
        }
      }
      const topics = suggestTopics(nextContext.curriculum, nextContext.subject, nextContext.gradeLevel)
      if (topics.length > 0) nextContext.syllabus = topics.join('\n')
      return nextContext
    })
  }

  function updateQuestionCount(type: QuestionTypeId, count: number) {
    setForm((current) => ({
      ...current,
      questionTypes: current.questionTypes.map((item) =>
        item.type === type
          ? {
              ...item,
              count: isSchoolContext
                ? Math.max(0, Math.min(
                    count,
                    Math.floor((SCHOOL_MAX_MARKS - current.questionTypes
                      .filter((question) => question.type !== type && SCHOOL_QUESTION_TYPE_IDS.includes(question.type))
                      .reduce((total, question) => total + question.count * ASSESSMENT_FORMATS.assessment.marksPerQuestion[question.type], 0))
                      / ASSESSMENT_FORMATS.assessment.marksPerQuestion[type]),
                  ))
                : isCollegeCurriculum && assessmentFormat.targetMarks !== null
                  ? Math.max(0, Math.min(
                      count,
                      Math.floor((assessmentFormat.targetMarks - current.questionTypes
                        .filter((question) => question.type !== type)
                        .reduce((total, question) => total + question.count * assessmentFormat.marksPerQuestion[question.type], 0))
                        / assessmentFormat.marksPerQuestion[type]),
                    ))
                  : count,
            }
          : item,
      ),
    }))
  }

  function updateSchoolPatternCount(examId: SchoolExamId, type: QuestionTypeId, count: number) {
    setSchoolPatternCounts((current) => ({
      ...current,
      [examId]: {
        ...current[examId],
        [type]: Math.max(0, Math.min(
          count,
          Math.floor((SCHOOL_MAX_MARKS - Object.entries(current[examId])
            .filter(([existingType]) => existingType !== type)
            .reduce((total, [existingType, existingCount]) => total + existingCount * ASSESSMENT_FORMATS.assessment.marksPerQuestion[existingType as QuestionTypeId], 0))
            / ASSESSMENT_FORMATS.assessment.marksPerQuestion[type]),
        )),
      },
    }))
  }

  function updateCollegePatternCount(patternId: CollegePatternId, type: QuestionTypeId, count: number) {
    const pattern = COLLEGE_EXAM_PATTERNS.find((item) => item.id === patternId)
    if (!pattern) return
    const marksPerQuestion = ASSESSMENT_FORMATS[pattern.assessmentType].marksPerQuestion
    setCollegePatternCounts((current) => ({
      ...current,
      [patternId]: {
        ...current[patternId],
        [type]: Math.max(0, Math.min(
          count,
          Math.floor((pattern.targetMarks - Object.entries(current[patternId])
            .filter(([existingType]) => existingType !== type)
            .reduce((total, [existingType, existingCount]) => total + existingCount * marksPerQuestion[existingType as QuestionTypeId], 0))
            / marksPerQuestion[type]),
        )),
      },
    }))
  }

  function applyCollegePattern(patternId: CollegePatternId) {
    const pattern = COLLEGE_EXAM_PATTERNS.find((item) => item.id === patternId)
    if (!pattern) return
    const format = ASSESSMENT_FORMATS[pattern.assessmentType]

    setSchoolExamId(null)
    setForm((current) => ({
      ...current,
      curriculum: 'College / University',
      assessmentType: pattern.assessmentType,
      internalAssessmentType: pattern.assessmentType === 'internal'
        ? current.internalAssessmentType ?? 'CIAT - 1'
        : undefined,
      course: '',
      gradeLevel: current.gradeLevel.startsWith('Semester') ? current.gradeLevel : 'Semester 1',
      durationMinutes: format.durationMinutes,
      questionTypes: Object.entries(collegePatternCounts[patternId]).map(([type, count]) => ({
        type: type as QuestionTypeId,
        count,
      })),
      longQuestionEitherOr: pattern.eitherOr,
      schoolQuestionStyles: [],
    }))
    setPaper(null)
    setPaperSets([])
    setError('')
    setActivePage('builder')
  }

  function toggleSchoolQuestionStyle(style: SchoolQuestionStyle) {
    setForm((current) => ({
      ...current,
      schoolQuestionStyles: current.schoolQuestionStyles.includes(style)
        ? current.schoolQuestionStyles.filter((item) => item !== style)
        : [...current.schoolQuestionStyles, style],
    }))
  }

  function applySchoolPattern(examId: SchoolExamId, schoolName = form.course) {
    const exam = SCHOOL_EXAM_TEMPLATES.find((item) => item.id === examId)
    if (!exam) return

    setSchoolExamId(examId)
    setForm((current) => ({
      ...current,
      curriculum: 'Tamil Nadu State Board',
      assessmentType: 'assessment',
      course: schoolName,
      subject: '',
      subjectCode: '',
      gradeLevel: exam.gradeLevel === 'School' ? '' : exam.gradeLevel,
      durationMinutes: exam.durationMinutes,
      syllabus: '',
      questionTypes: (Object.keys(schoolPatternCounts[examId]) as QuestionTypeId[]).map((type) => ({
        type,
        count: schoolPatternCounts[examId][type],
      })),
      schoolQuestionStyles: ['theory', 'diagram', 'equation'],
      longQuestionEitherOr: false,
    }))
    setPaper(null)
    setPaperSets([])
    setError('')
    setActivePage('builder')
  }

  function updateAssessmentType(assessmentType: AssessmentType) {
    const format = ASSESSMENT_FORMATS[assessmentType]
    const collegePattern = isCollegeCurriculum ? collegePatternFor(assessmentType) : undefined
    setForm((current) => ({
      ...current,
      assessmentType,
      internalAssessmentType: assessmentType === 'internal'
        ? current.internalAssessmentType ?? 'CIAT - 1'
        : undefined,
      durationMinutes: format.durationMinutes,
      questionTypes: collegePattern
        ? Object.entries(collegePattern.questionCounts).map(([type, count]) => ({ type: type as QuestionTypeId, count }))
        : (Object.keys(format.questionCounts) as QuestionTypeId[]).map((type) => ({
            type,
            count: format.questionCounts[type],
          })),
      longQuestionEitherOr: collegePattern?.eitherOr ?? false,
      schoolQuestionStyles: [],
    }))
    setSchoolExamId(null)
    setPaper(null)
    setPaperSets([])
    setError('')
  }

  function toggleBloomLevel(level: string) {
    setForm((current) => ({
      ...current,
      bloomsLevels: current.bloomsLevels.includes(level)
        ? current.bloomsLevels.filter((item) => item !== level)
        : [...current.bloomsLevels, level],
    }))
  }

  function handleSignIn(nextSession: DemoSession) {
    selectedPortal.current = nextSession.role === 'admin' ? 'admin' : 'member'
    setSelectedAuthPortal(selectedPortal.current)
    setAuthError('')
    setSession(nextSession)
    setActivePage(nextSession.role === 'admin' ? 'adminDashboard' : 'builder')
  }

  function handlePortalChange(portal: 'member' | 'admin') {
    selectedPortal.current = portal
    setSelectedAuthPortal(portal)
  }

  function handleSignOut() {
    selectedPortal.current = 'member'
    setSelectedAuthPortal('member')
    void signOutCloud().catch((signOutError) => {
      setCloudError(signOutError instanceof Error ? signOutError.message : 'Could not sign out.')
    })
  }

  function handleRefreshCloudPapers() {
    void getCloudPapers()
      .then((papers) => {
        setSavedPapers(papers)
        setCloudError('')
      })
      .catch((loadError) => {
        setCloudError(loadError instanceof Error ? loadError.message : 'Could not refresh question papers.')
      })
  }

  function handleApplyExamPreference(assessmentType: AssessmentType) {
    setSchoolExamId(null)
    const format = ASSESSMENT_FORMATS[assessmentType]
    setForm((current) => ({
      ...current,
      assessmentType,
      questionTypes: Object.entries(format.questionCounts).map(([type, count]) => ({
        type: type as QuestionTypeId,
        count,
      })),
    }))
    setPaper(null)
    setPaperSets([])
    setActivePage('builder')
  }

  async function handleUpload(file: File, title: string, subject: string, subjectCode: string, curriculum: string, gradeLevel: string) {
    const savedSyllabus = await saveSyllabus(file, title, subject, subjectCode, curriculum, gradeLevel)
    setSyllabi((current) => [savedSyllabus, ...current])
  }

  async function handleDelete(id: string) {
    await deleteSyllabus(id)
    setSyllabi((current) => current.filter((syllabus) => syllabus.id !== id))
  }

  async function handleDeleteSavedPaper(id: string) {
    try {
      await deleteCloudPaper(id)
      setSavedPapers((current) => current.filter((savedPaper) => savedPaper.id !== id))
      setCloudError('')
    } catch (deleteError) {
      setCloudError(deleteError instanceof Error ? deleteError.message : 'Could not delete this question paper.')
    }
  }

  async function handleImportLocalPaper(savedPaper: SavedPaper) {
    if (!session?.id) {
      setCloudError('Sign in before syncing local question papers.')
      return
    }
    setSyncingLocalPaperId(savedPaper.id)
    setCloudError('')
    try {
      const cloudPaper = await saveCloudPaper(
        savedPaper.paperSets ?? [savedPaper.paper],
        savedPaper.examDate,
        savedPaper.examTime,
        session.id,
      )
      await markSavedPaperSynced(savedPaper.id, cloudPaper.id)
      setSavedPapers((current) => [cloudPaper, ...current])
      setLegacyPapers((current) => current.filter((paperItem) => paperItem.id !== savedPaper.id))
    } catch (syncError) {
      setCloudError(syncError instanceof Error ? syncError.message : 'Could not sync this local question paper.')
    } finally {
      setSyncingLocalPaperId(null)
    }
  }

  async function handleDeleteLocalPaper(id: string) {
    try {
      await deleteLocalSavedPaper(id)
      setLegacyPapers((current) => current.filter((savedPaper) => savedPaper.id !== id))
    } catch (deleteError) {
      setCloudError(deleteError instanceof Error ? deleteError.message : 'Could not delete this local question paper.')
    }
  }

  function handleUseSyllabus(syllabus: StoredSyllabus) {
    setSchoolExamId(null)
    setForm((current) => ({
      ...current,
      subject: syllabus.subject,
      subjectCode: syllabus.subjectCode,
      curriculum: syllabus.curriculum ?? current.curriculum,
      gradeLevel: syllabus.gradeLevel ?? current.gradeLevel,
      ...(syllabus.curriculum && ['Tamil Nadu State Board', 'CBSE'].includes(syllabus.curriculum)
        ? {
            assessmentType: 'assessment' as const,
            questionTypes: SCHOOL_QUESTION_TYPE_IDS.map((type) => ({
              type,
              count: createSchoolPatternCounts().quarterly[type],
            })),
          }
        : {}),
      syllabus: syllabus.text,
      schoolQuestionStyles: [],
    }))
    setPaper(null)
    setPaperSets([])
    setError('')
    setActivePage('builder')
  }

  function handleOpenSavedPaper(savedPaper: SavedPaper) {
    setSchoolExamId(null)
    const { paper: saved } = savedPaper
    setPaper(saved)
    setPaperSets(savedPaper.paperSets ?? [saved])
    setExamSchedule({ date: savedPaper.examDate, time: savedPaper.examTime })
    setForm((current) => ({
      ...current,
      course: saved.institutionName ?? '',
      assessmentType: saved.assessmentType,
      internalAssessmentType: saved.internalAssessmentType,
      subject: saved.subject,
      subjectCode: saved.subjectCode,
      gradeLevel: saved.gradeLevel,
      durationMinutes: saved.durationMinutes,
      questionTypes: current.questionTypes.map((item) => ({
        ...item,
        count: saved.questions.filter((question) => question.type === item.type).length,
      })),
      bloomsLevels: [...new Set(saved.questions.map((question) => question.bloomLevel))],
      schoolQuestionStyles: [],
    }))
    setError('')
    setActivePage('builder')
  }

  async function handleGenerate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setPaper(null)
    setPaperSets([])
    const signedInUserId = session?.id
    if (!signedInUserId) {
      setError('Your Supabase session is missing an account ID. Sign in again and retry.')
      return
    }

    if (isSchoolContext && schoolEstimatedMarks > SCHOOL_MAX_MARKS) {
      setError(`School question patterns cannot exceed ${SCHOOL_MAX_MARKS} marks. Reduce the question counts before generating.`)
      return
    }
    setIsGenerating(true)

    try {
      const generationSets: PaperSet[] = isCollegeCurriculum ? ['A'] : ['A', 'B']
      const { generatePaper } = await import('./services/paperApi')
      const generatedPapers = await Promise.all(generationSets.map((set) => generatePaper(form, set)))
      const schoolExam = schoolExamId
        ? SCHOOL_EXAM_TEMPLATES.find((item) => item.id === schoolExamId)
        : undefined
      const examName = schoolExam?.title ?? (isSchoolCurriculum
        ? form.assessmentType === 'semester'
          ? 'School Examination'
          : form.assessmentType === 'internal'
            ? 'Internal Examination'
            : assessmentFormat.title
        : undefined)
      const results = generatedPapers.map((generatedPaper) => schoolExam || isSchoolCurriculum
        ? {
            ...generatedPaper,
            course: '',
            isSchoolPaper: true,
            examName,
            institutionName: form.course,
            codeLabel: 'Subject code',
            title: `${examName} · ${form.subject} · Set ${generatedPaper.set}`,
          }
        : isCollegeCurriculum
          ? {
              ...generatedPaper,
              course: '',
              title: `${form.subjectCode} · ${form.subject} · ${assessmentFormat.title}`,
              questionPaperCode: generatedPaper.questionPaperCode?.replace(/-[ab]$/i, ''),
              internalAssessmentType: form.assessmentType === 'internal' ? form.internalAssessmentType : undefined,
              institutionName: form.course,
              codeLabel: 'Course code',
            }
          : {
              ...generatedPaper,
              course: form.course,
              codeLabel: 'Subject code',
            })
      setPaperSets(results)
      setPaper(results[0])
      const savedPaper = await saveCloudPaper(results, examSchedule.date, examSchedule.time, signedInUserId)
      setSavedPapers((current) => [savedPaper, ...current])
      setCloudError('')
    } catch (generationError) {
      setError(
        generationError instanceof Error
          ? generationError.message
          : 'Could not generate this paper. Please try again.',
      )
    } finally {
      setIsGenerating(false)
    }
  }

  function advanceBuilderStep() {
    if (builderStep === 1) {
      const invalidControl = builderStepContentRef.current?.querySelector<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(':invalid')
      if (invalidControl) {
        invalidControl.reportValidity()
        return
      }
    }
    if (builderStep === 2) {
      if (totalQuestions === 0) {
        setError('Choose at least one question type and count before continuing.')
        return
      }
      if (isSchoolContext && schoolEstimatedMarks > SCHOOL_MAX_MARKS) {
        setError(`School question patterns cannot exceed ${SCHOOL_MAX_MARKS} marks. Reduce the question counts before continuing.`)
        return
      }
    }
    setError('')
    setBuilderStep((current) => Math.min(3, current + 1) as 1 | 2 | 3)
  }

  function goBackBuilderStep() {
    setError('')
    setBuilderStep((current) => Math.max(1, current - 1) as 1 | 2 | 3)
  }

  if (!authReady) {
    return <main className="grid min-h-screen place-items-center bg-[#f5f1e8] text-sm text-[#52665c]">Connecting to the shared workspace...</main>
  }

  if (isPasswordRecovery) {
    return <PasswordRecovery onComplete={() => setIsPasswordRecovery(false)} />
  }

  if (!session) {
    return <DemoLogin onSignIn={handleSignIn} onPortalChange={handlePortalChange} configurationError={authError} />
  }

  const visiblePage: WorkspacePage = session.role === 'admin' || activePage !== 'adminDashboard'
    ? activePage
    : 'builder'

  return (
    <div className="workspace-shell print-shell min-h-screen bg-[#f4f7f5] text-[#1c2b25] lg:flex">
      <Sidebar role={session.role} name={session.name} activePage={visiblePage} onNavigate={setActivePage} onSignOut={handleSignOut} />

      <main className="workspace-main print-main min-w-0 flex-1 px-4 pb-10 sm:px-7 lg:px-9">
        <header className="workspace-header no-print mx-auto flex max-w-[1440px] items-center justify-between gap-4 border-b border-[#dfe7e2] py-5">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#7a8981]">
              {session.role === 'admin' ? 'Admin workspace' : 'Faculty workspace'} <span className="px-1.5 text-[#bbc6bf]">/</span> {workspacePageTitles[visiblePage]}
            </p>
            <h1 className="mt-1 font-display text-[28px] leading-tight sm:text-[32px]">{workspacePageTitles[visiblePage]}</h1>
            <p className="mt-1.5 hidden text-xs text-[#748278] sm:block">
              {visiblePage === 'settings'
                ? 'Personalize your account and question-paper workspace.'
                : visiblePage === 'builder'
                ? 'Shape a syllabus-based assessment and review it before printing.'
                : visiblePage === 'database'
                  ? 'Import, review, and maintain your private question collection.'
                  : visiblePage === 'papers'
                    ? 'Return to saved papers and continue editing or printing.'
                    : visiblePage === 'library'
                      ? 'Keep course syllabi organized for your next assessment.'
                      : visiblePage === 'patterns'
                        ? 'Use an editable exam format as a starting point.'
                        : 'Choose a template and tailor it to your syllabus.'}
            </p>
          </div>
          <div className="flex min-w-0 shrink-0 items-center gap-2 rounded-full border border-[#dfe7e2] bg-white px-3 py-2 text-xs font-medium text-[#52665c]" aria-label={`Signed in as ${session.name}`}>
            <span className="size-2 rounded-full bg-[#31a878]" />
            <span className="max-w-[150px] truncate font-semibold text-[#263b30]">{session.name}</span>
            <span className="rounded-full bg-[#eef2ff] px-2 py-1 text-[9px] font-bold tracking-wide text-[#3730a3]">{session.role === 'admin' ? 'ADMIN' : 'FACULTY'}</span>
          </div>
        </header>

        {visiblePage === 'builder' && (
          <section className="workspace-hero no-print mx-auto mt-5 max-w-[1440px]" aria-label="Question paper workspace">
            <div className="workspace-hero-copy">
              <p className="workspace-hero-eyebrow"><span /> YOUR ASSESSMENT STUDIO</p>
              <h2>Welcome back, {session.name}</h2>
              <p>Turn your syllabus into a thoughtful, beautifully structured question paper.</p>
            </div>
            <button
              className="workspace-hero-action"
              type="button"
              onClick={() => {
                setBuilderStep(1)
                builderStepContentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
              }}
            >
              <span className="workspace-hero-action-icon" aria-hidden="true">+</span>
              Create Question Paper
              <span aria-hidden="true">→</span>
            </button>
          </section>
        )}

        {cloudError && <p className="no-print mx-auto mt-4 max-w-[1440px] border border-[#f0c9bb] bg-[#fff5f0] px-4 py-3 text-sm text-[#9c4d36]" role="alert">{cloudError}</p>}

        <Suspense fallback={<p className="mx-auto mt-6 max-w-[1440px] rounded-xl border border-[#e2e8f0] bg-white p-5 text-sm text-[#64748b]">Loading workspace…</p>}>
        {visiblePage === 'settings' ? (
          <Settings
            email={session.email}
            name={session.name}
            onProfileSaved={(name) => setSession((current) => current ? { ...current, name } : current)}
            onInstitutionSaved={(name) => setForm((current) => ({ ...current, course: name }))}
            onApplyExamPreference={handleApplyExamPreference}
            onNavigate={setActivePage}
            onSignOut={handleSignOut}
          />
        ) : session.role === 'admin' && adminWorkspacePages.includes(visiblePage) ? (
          <AdminWorkspace
            key={session.id}
            papers={savedPapers}
            signedInUserId={session.id ?? ''}
            onOpenPaper={handleOpenSavedPaper}
            onPapersChanged={handleRefreshCloudPapers}
          />
        ) : visiblePage === 'database' ? (
          <QuestionBank userId={session.id ?? ''} />
        ) : visiblePage === 'library' ? (
          <SyllabusLibrary role={session.role} syllabi={syllabi} storageReady={storageReady} onUpload={handleUpload} onDelete={handleDelete} onUse={handleUseSyllabus} />
        ) : visiblePage === 'papers' ? (
          <SavedPapersLibrary
            papers={savedPapers}
            localPapers={legacyPapers}
            syncingLocalPaperId={syncingLocalPaperId}
            signedInUserId={session.id ?? ''}
            onOpen={handleOpenSavedPaper}
            onDelete={handleDeleteSavedPaper}
            onImportLocal={(savedPaper) => void handleImportLocalPaper(savedPaper)}
            onDeleteLocal={(id) => void handleDeleteLocalPaper(id)}
          />
        ) : visiblePage === 'school' ? (
          <SchoolPapers onChoose={applySchoolPattern} />
        ) : visiblePage === 'patterns' ? (
          <QuestionPatterns
            patterns={schoolPatternCounts}
            onChange={updateSchoolPatternCount}
            onApply={applySchoolPattern}
            collegePatterns={collegePatternCounts}
            onCollegeChange={updateCollegePatternCount}
            onCollegeApply={applyCollegePattern}
          />
        ) : (
        <div className="print-layout mx-auto mt-6 grid max-w-[1440px] grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(380px,0.92fr)]">
          <form
            className="no-print rise-in space-y-5"
            onSubmit={(event) => {
              if (builderStep !== 3) {
                event.preventDefault()
                return
              }
              void handleGenerate(event)
            }}
          >
            <div className="builder-progress" aria-label="Paper creation progress">
              {([
                [1, 'Course & syllabus'],
                [2, 'Exam format'],
                [3, 'Bloom’s taxonomy'],
              ] as const).map(([step, label]) => (
                <div className={`builder-progress-step${builderStep === step ? ' is-current' : ''}${builderStep > step ? ' is-complete' : ''}`} key={step}>
                  <span>{builderStep > step ? '✓' : step}</span>
                  <strong>{label}</strong>
                </div>
              ))}
            </div>

            <div ref={builderStepContentRef} data-step-content={builderStep}>
            {builderStep === 1 && (
            <section className="rounded-xl border border-[#e0e8e3] bg-white p-5 shadow-[0_4px_20px_rgba(29,56,43,0.035)] sm:p-6">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-bold tracking-[0.14em] text-[#4c9a76]">01 / SET THE CONTEXT</p>
                  <h2 className="mt-1.5 text-[17px] font-semibold">{schoolExamId || isSchoolCurriculum ? 'School & syllabus' : 'Course & syllabus'}</h2>
                </div>
                <span className="rounded-md bg-[#edf5f0] px-2.5 py-1.5 text-[11px] font-semibold text-[#398260]">Editable details</span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-1.5 text-xs font-semibold text-[#52645a]">
                  Curriculum
                  <select
                    className="w-full rounded-lg border border-[#dce5df] bg-white px-3 py-2.5 text-sm font-medium text-[#24352c] outline-none transition focus:border-[#5eaa83] focus:ring-3 focus:ring-[#5eaa83]/15"
                    value={form.curriculum}
                    onChange={(event) => updateTopicContext('curriculum', event.target.value)}
                  >
                    {CURRICULA.map((curriculum) => <option key={curriculum} value={curriculum} disabled={schoolExamId !== null && curriculum === 'College / University'}>{curriculum}</option>)}
                  </select>
                </label>
                <label className="space-y-1.5 text-xs font-semibold text-[#52645a]">
                  {schoolExamId || isSchoolCurriculum ? 'School name' : isCollegeCurriculum ? 'College / institution name' : 'Course'}
                  <input className="w-full rounded-lg border border-[#dce5df] bg-white px-3 py-2.5 text-sm font-medium text-[#24352c] outline-none transition focus:border-[#5eaa83] focus:ring-3 focus:ring-[#5eaa83]/15" value={form.course} onChange={(event) => updateField('course', event.target.value)} placeholder={schoolExamId || isSchoolCurriculum ? 'e.g. Government Higher Secondary School' : isCollegeCurriculum ? 'e.g. Anna University' : 'e.g. B.Sc. Computer Science'} required />
                </label>
                <label className="space-y-1.5 text-xs font-semibold text-[#52645a]">
                  Subject
                  <input className="w-full rounded-lg border border-[#dce5df] bg-white px-3 py-2.5 text-sm font-medium text-[#24352c] outline-none transition focus:border-[#5eaa83] focus:ring-3 focus:ring-[#5eaa83]/15" value={form.subject} onChange={(event) => updateTopicContext('subject', event.target.value)} placeholder={schoolExamId ? 'e.g. Mathematics' : isCollegeCurriculum ? 'e.g. Data Structures' : 'e.g. Mathematics'} required />
                </label>
                <label className="space-y-1.5 text-xs font-semibold text-[#52645a]">
                  {isCollegeCurriculum ? 'Course code' : 'Subject code'}
                  <input className="w-full rounded-lg border border-[#dce5df] bg-white px-3 py-2.5 text-sm font-medium text-[#24352c] outline-none transition focus:border-[#5eaa83] focus:ring-3 focus:ring-[#5eaa83]/15" value={form.subjectCode} onChange={(event) => updateField('subjectCode', event.target.value)} placeholder={schoolExamId ? 'Optional' : 'e.g. CS301'} required={!schoolExamId} />
                </label>
                {isCollegeCurriculum ? (
                  <label className="space-y-1.5 text-xs font-semibold text-[#52645a]">
                    Semester
                    <select
                      className="w-full rounded-lg border border-[#dce5df] bg-white px-3 py-2.5 text-sm font-medium text-[#24352c] outline-none transition focus:border-[#5eaa83] focus:ring-3 focus:ring-[#5eaa83]/15"
                      value={form.gradeLevel.match(/\d+/)?.[0] ?? ''}
                      onChange={(event) => updateTopicContext('gradeLevel', event.target.value ? `Semester ${event.target.value}` : '')}
                      required
                    >
                      <option value="">Select semester</option>
                      {Array.from({ length: 8 }, (_, index) => (
                        <option key={index + 1} value={index + 1}>Semester {index + 1}</option>
                      ))}
                    </select>
                  </label>
                ) : (
                  <label className="space-y-1.5 text-xs font-semibold text-[#52645a]">
                    {schoolExamId || isSchoolCurriculum ? 'Class / grade' : 'Class / semester'}
                    <input className="w-full rounded-lg border border-[#dce5df] bg-white px-3 py-2.5 text-sm font-medium text-[#24352c] outline-none transition focus:border-[#5eaa83] focus:ring-3 focus:ring-[#5eaa83]/15" value={form.gradeLevel} onChange={(event) => updateTopicContext('gradeLevel', event.target.value)} placeholder={schoolExamId ? 'e.g. Class 8' : 'e.g. Class 8'} required />
                  </label>
                )}
                <label className="space-y-1.5 text-xs font-semibold text-[#52645a]">
                  Exam duration
                  <span className="flex items-center rounded-lg border border-[#dce5df] px-3 focus-within:border-[#5eaa83] focus-within:ring-3 focus-within:ring-[#5eaa83]/15">
                    <input className="w-full bg-transparent py-2.5 text-sm font-medium text-[#24352c] outline-none" type="number" min={15} max={300} step={15} value={form.durationMinutes} onChange={(event) => updateField('durationMinutes', Number(event.target.value))} required />
                    <span className="text-xs font-medium text-[#87958d]">minutes</span>
                  </span>
                </label>
              </div>

              <label className="mt-4 block space-y-1.5 text-xs font-semibold text-[#52645a]">
                Syllabus topics
                <textarea className="min-h-28 w-full resize-y rounded-lg border border-[#dce5df] bg-white px-3 py-2.5 text-sm leading-6 font-normal text-[#24352c] outline-none transition placeholder:text-[#a1ada6] focus:border-[#5eaa83] focus:ring-3 focus:ring-[#5eaa83]/15" value={form.syllabus} onChange={(event) => updateField('syllabus', event.target.value)} placeholder="Enter the syllabus or paste topics here, one per line" required />
                <span className="block font-normal text-[#89968e]">Questions will be based only on these topics. For accurate course-outcome labels, group syllabus entries as Unit 1: topics through Unit 5: topics. Each question will show its lesson, unit, and matching CO in a compact box; unlabeled topics are distributed across five units in order.</span>
              </label>
              {suggestedTopics.length > 0 && (
                <>
                  <p className="mt-3 text-[11px] leading-5 text-[#829087]">Topic catalog: {form.subject} · {form.curriculum}{!isCollegeCurriculum && form.gradeLevel ? ` · ${form.gradeLevel}` : ''}. Choose the full subject coverage or select only the topics for this exam.</p>
                  <TopicSelection topics={suggestedTopics} syllabus={form.syllabus} onChange={(syllabus) => updateField('syllabus', syllabus)} />
                </>
              )}
            </section>
            )}

            {builderStep === 2 && (
            <section className="rounded-xl border border-[#e0e8e3] bg-white p-5 shadow-[0_4px_20px_rgba(29,56,43,0.035)] sm:p-6">
              <div className="mb-5">
                {schoolExamId ? (
                  <div className="flex flex-col gap-3 rounded-lg border border-[#dce9df] bg-[#f5faf6] p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-[10px] font-bold tracking-[0.14em] text-[#4c9a76]">SCHOOL PAPER TEMPLATE</p>
                      <p className="mt-1 text-sm font-semibold text-[#35483d]">{SCHOOL_EXAM_TEMPLATES.find((exam) => exam.id === schoolExamId)?.title}</p>
                      <p className="mt-1 text-xs leading-5 text-[#718077]">Update the editable question mix below. Public-exam patterns should be checked against the latest subject blueprint.</p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button className="rounded-md border border-[#cbdcd0] px-3 py-2 text-xs font-semibold text-[#42644f] hover:bg-white" type="button" onClick={() => setActivePage('patterns')}>Edit pattern</button>
                      <button className="rounded-md px-3 py-2 text-xs font-semibold text-[#65756b] hover:bg-white" type="button" onClick={() => updateAssessmentType('assessment')}>Use standard builder</button>
                    </div>
                  </div>
                ) : (
                  <>
                <p className="mb-2 text-[10px] font-bold tracking-[0.14em] text-[#4c9a76]">CHOOSE EXAM FORMAT</p>
                <div className="grid grid-cols-3 gap-1 rounded-lg bg-[#f1f5f2] p-1" role="group" aria-label="Exam format">
                  {(Object.keys(ASSESSMENT_FORMATS) as AssessmentType[]).map((assessmentType) => {
                    const format = ASSESSMENT_FORMATS[assessmentType]
                    return (
                      <button key={assessmentType} className={`min-h-14 rounded-md px-2 py-2 text-center transition ${form.assessmentType === assessmentType ? 'bg-white text-[#285f42] shadow-sm' : 'text-[#75847a] hover:text-[#33483a]'}`} type="button" aria-pressed={form.assessmentType === assessmentType} onClick={() => updateAssessmentType(assessmentType)}>
                        <span className="block text-[11px] font-bold">{format.label}</span>
                        <span className="mt-1 block text-[9px] font-medium">{format.targetMarks === null ? 'Custom marks' : `${format.targetMarks} marks`}</span>
                      </button>
                    )
                  })}
                </div>
                <p className="mt-2 text-[11px] text-[#829087]">{assessmentFormat.description}. {assessmentFormat.targetMarks === null ? 'Choose the question mix and total marks.' : `Preset target: ${assessmentFormat.targetMarks} marks. Adjust the counts to create your question pattern.`}</p>
                {isCollegeCurriculum && form.assessmentType === 'internal' && (
                  <label className="mt-3 block max-w-xs space-y-1.5 text-xs font-semibold text-[#52645a]">
                    Internal assessment
                    <select
                      className="w-full rounded-lg border border-[#dce5df] bg-white px-3 py-2.5 text-sm font-medium text-[#24352c] outline-none transition focus:border-[#5eaa83] focus:ring-3 focus:ring-[#5eaa83]/15"
                      value={form.internalAssessmentType ?? 'CIAT - 1'}
                      onChange={(event) => updateField('internalAssessmentType', event.target.value as CollegeInternalAssessmentType)}
                    >
                      <option value="CIAT - 1">CIAT - 1</option>
                      <option value="CIAT - 2">CIAT - 2</option>
                      <option value="CIAT - 3">CIAT - 3</option>
                    </select>
                  </label>
                )}
                  </>
                )}
              </div>

              <div className="mb-4 flex items-end justify-between gap-4">
                <div>
                  <p className="text-[10px] font-bold tracking-[0.14em] text-[#4c9a76]">02 / SHAPE THE PAPER</p>
                  <h2 className="mt-1.5 text-[17px] font-semibold">Question mix</h2>
                </div>
                <span className="text-xs font-medium text-[#7f8d84]">{totalQuestions} questions · {isSchoolContext ? `${schoolEstimatedMarks} / ${SCHOOL_MAX_MARKS} marks` : `${estimatedMarks} estimated marks`}</span>
              </div>
              <QuestionTypeSelector
                assessmentType={form.assessmentType}
                counts={form.questionTypes}
                onChange={updateQuestionCount}
                questionTypeIds={isSchoolContext ? SCHOOL_QUESTION_TYPE_IDS : UNIVERSITY_QUESTION_TYPE_IDS}
                maxTotalMarks={isSchoolContext ? SCHOOL_MAX_MARKS : undefined}
              />
              {isCollegeCurriculum && form.longQuestionEitherOr && form.questionTypes.some((item) => item.type === 'fourteen-mark' && item.count > 0) && (
                <p className="mt-2 rounded-md bg-[#f5f8f6] px-3 py-2 text-xs leading-5 text-[#64756b]">
                  Every 14-mark question includes an alternative option. Students answer either the main question or its “OR” question; marks are counted once.
                </p>
              )}

              {schoolExamId && (
                <fieldset className="mt-5 rounded-lg border border-[#e4ebe6] p-4">
                  <legend className="px-1 text-xs font-semibold text-[#52645a]">Question content</legend>
                  <p className="mb-3 text-xs leading-5 text-[#829087]">Choose the kinds of questions to include alongside theory questions. Diagram and equation prompts are generated from your syllabus topics.</p>
                  <div className="flex flex-wrap gap-2">
                    {([
                      ['theory', 'Theory'],
                      ['diagram', 'Diagrams'],
                      ['equation', 'Equations'],
                    ] as const).map(([style, label]) => (
                      <label key={style} className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition ${form.schoolQuestionStyles.includes(style) ? 'border-[#b8d7c4] bg-[#f2f8f4] text-[#347a55]' : 'border-[#dce5df] text-[#65756b]'}`}>
                        <input
                          className="size-3.5 accent-[#438962]"
                          type="checkbox"
                          checked={form.schoolQuestionStyles.includes(style)}
                          onChange={() => toggleSchoolQuestionStyle(style)}
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </fieldset>
              )}
            </section>
            )}

            {builderStep === 3 && (
            <section className="rounded-xl border border-[#e0e8e3] bg-white p-5 shadow-[0_4px_20px_rgba(29,56,43,0.035)] sm:p-6">
              <div className="mb-5">
                <p className="text-[10px] font-bold tracking-[0.14em] text-[#7457f5]">03 / THINKING SKILLS</p>
                <h2 className="mt-1.5 text-[17px] font-semibold">Bloom’s taxonomy</h2>
                <p className="mt-1 text-xs text-[#839087]">Choose the thinking skills to assess in the generated questions.</p>
              </div>
              <div className="mb-3 flex items-end justify-between gap-3">
                <h3 className="text-sm font-semibold">Select taxonomy levels</h3>
                <span className="text-[11px] font-semibold text-[#3157d5]">{form.bloomsLevels.length} selected</span>
              </div>
              <BloomSelector levels={form.bloomsLevels} onToggle={toggleBloomLevel} />

              <div className="mt-6 border-t border-[#edf0ee] pt-5">
                <h3 className="mb-3 text-sm font-semibold">Difficulty balance</h3>
                <div className="grid grid-cols-3 gap-2 rounded-lg bg-[#f3f6f4] p-1">
                  {['Foundational', 'Balanced', 'Challenging'].map((difficulty) => (
                    <button key={difficulty} className={`rounded-md px-2 py-2 text-xs font-semibold transition ${form.difficulty === difficulty ? 'bg-white text-[#3157d5] shadow-sm' : 'text-[#77857c] hover:text-[#34483d]'}`} type="button" aria-pressed={form.difficulty === difficulty} onClick={() => updateField('difficulty', difficulty)}>
                      {difficulty}
                    </button>
                  ))}
                </div>
              </div>
            </section>
            )}
            </div>

            {error && <p className="rounded-lg border border-[#f0c9bb] bg-[#fff5f0] px-4 py-3 text-sm text-[#9c4d36]" role="alert">{error}</p>}

            <div className="no-print flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                {builderStep > 1 && (
                  <button className="builder-back-button" type="button" onClick={goBackBuilderStep}>← Back</button>
                )}
                {builderStep === 1 && <p className="text-xs text-[#829087]">Step 1 of 3 · Set the course and syllabus details.</p>}
                {builderStep === 2 && <p className="text-xs text-[#829087]">Step 2 of 3 · Choose the exam pattern and question mix.</p>}
                {builderStep === 3 && <p className="text-xs text-[#829087]">Step 3 of 3 · Choose thinking skills and generate your paper.</p>}
              </div>
              {builderStep < 3 ? (
                <button className="builder-next-button" type="button" onClick={advanceBuilderStep}>
                  Continue to {builderStep === 1 ? 'exam format' : 'Bloom’s taxonomy'} <span aria-hidden="true">→</span>
                </button>
              ) : (
                <button className="builder-next-button" type="submit" disabled={isGenerating || totalQuestions === 0 || (isSchoolContext && schoolEstimatedMarks > SCHOOL_MAX_MARKS) || form.bloomsLevels.length === 0 || !form.syllabus.trim()}>
                  {isGenerating ? <><span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />Building your paper…</> : <>Generate question paper <span aria-hidden="true">→</span></>}
                </button>
              )}
            </div>

          </form>

          <PaperPreview
            paper={paper}
            papers={paperSets}
            onSelectSet={(set: PaperSet) => setPaper(paperSets.find((setPaper) => setPaper.set === set) ?? null)}
            questionCount={totalQuestions}
            estimatedMarks={estimatedMarks}
            durationMinutes={form.durationMinutes}
            bloomsLevels={form.bloomsLevels}
            examDate={examSchedule.date}
            examTime={examSchedule.time}
            onExamDateChange={(date) => setExamSchedule((current) => ({ ...current, date }))}
            onExamTimeChange={(time) => setExamSchedule((current) => ({ ...current, time }))}
          />
        </div>
        )}
        </Suspense>
      </main>
    </div>
  )
}

export default App
