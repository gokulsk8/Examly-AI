import type { AssessmentType, QuestionTypeId } from '../types/paper'

export type CollegePatternId = 'internal-14' | 'internal-7' | 'semester-14' | 'semester-7'

export type CollegePattern = {
  id: CollegePatternId
  title: string
  assessmentType: AssessmentType
  targetMarks: 60 | 100
  longQuestionMarks: 7 | 14
  eitherOr: boolean
  questionCounts: Record<QuestionTypeId, number>
}

const makeCounts = (one: number, two: number, seven: number, fourteen: number): Record<QuestionTypeId, number> => ({
  'one-mark': one,
  'two-mark': two,
  'three-mark': 0,
  'five-mark': 0,
  'seven-mark': seven,
  'fourteen-mark': fourteen,
})

export const COLLEGE_EXAM_PATTERNS: CollegePattern[] = [
  {
    id: 'internal-14',
    title: 'College internal examination · 14-mark either/or',
    assessmentType: 'internal',
    targetMarks: 60,
    longQuestionMarks: 14,
    eitherOr: true,
    questionCounts: makeCounts(10, 4, 0, 3),
  },
  {
    id: 'internal-7',
    title: 'College internal examination · 7-mark questions',
    assessmentType: 'internal',
    targetMarks: 60,
    longQuestionMarks: 7,
    eitherOr: false,
    questionCounts: makeCounts(10, 4, 6, 0),
  },
  {
    id: 'semester-14',
    title: 'End-semester examination · 14-mark either/or',
    assessmentType: 'semester',
    targetMarks: 100,
    longQuestionMarks: 14,
    eitherOr: true,
    questionCounts: makeCounts(10, 10, 0, 5),
  },
  {
    id: 'semester-7',
    title: 'End-semester examination · 7-mark questions',
    assessmentType: 'semester',
    targetMarks: 100,
    longQuestionMarks: 7,
    eitherOr: false,
    questionCounts: makeCounts(10, 10, 10, 0),
  },
]

export function createCollegePatternCounts() {
  return Object.fromEntries(
    COLLEGE_EXAM_PATTERNS.map(({ id, questionCounts }) => [id, { ...questionCounts }]),
  ) as Record<CollegePatternId, Record<QuestionTypeId, number>>
}
