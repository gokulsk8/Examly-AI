export type QuestionTypeId = 'one-mark' | 'two-mark' | 'three-mark' | 'five-mark' | 'seven-mark' | 'fourteen-mark'
export type AssessmentType = 'semester' | 'internal' | 'assessment'
export type CollegeInternalAssessmentType = 'CIAT - 1' | 'CIAT - 2' | 'CIAT - 3'
export type SchoolQuestionStyle = 'theory' | 'diagram' | 'equation'
export type PaperSet = 'A' | 'B'

export type QuestionCount = {
  type: QuestionTypeId
  count: number
}

export type PaperRequest = {
  curriculum: string
  assessmentType: AssessmentType
  internalAssessmentType?: CollegeInternalAssessmentType
  course: string
  subject: string
  subjectCode: string
  gradeLevel: string
  durationMinutes: number
  syllabus: string
  difficulty: string
  questionTypes: QuestionCount[]
  bloomsLevels: string[]
  schoolQuestionStyles: SchoolQuestionStyle[]
  longQuestionEitherOr?: boolean
}

export type GeneratedQuestion = {
  type: QuestionTypeId
  section: string
  bloomLevel: string
  marks: number
  question: string
  unitNumber?: number
  courseOutcome?: string
  lesson?: string
  options: string[]
  answer: string
  eitherOrQuestion?: string
  eitherOrAnswer?: string
  eitherOrUnitNumber?: number
  eitherOrCourseOutcome?: string
  eitherOrLesson?: string
}

export type GeneratedPaper = {
  title: string
  assessmentType: AssessmentType
  internalAssessmentType?: CollegeInternalAssessmentType
  set: PaperSet
  isSchoolPaper?: boolean
  examName?: string
  institutionName?: string
  course?: string
  curriculum?: string
  subject: string
  subjectCode: string
  codeLabel?: string
  questionPaperCode?: string
  gradeLevel: string
  generatedAt: string
  durationMinutes: number
  totalMarks: number
  instructions: string[]
  questions: GeneratedQuestion[]
}

export type SavedPaper = {
  kind: 'paper'
  id: string
  paper: GeneratedPaper
  paperSets?: GeneratedPaper[]
  cloudId?: string
  examDate: string
  examTime: string
  createdAt: string
  createdBy?: string
  status?: 'draft' | 'pending_review' | 'approved' | 'rejected' | 'completed' | 'archived'
}