import { ASSESSMENT_FORMATS, QUESTION_TYPES } from '../data/options'
import type { GeneratedPaper, GeneratedQuestion, PaperRequest, PaperSet, QuestionTypeId } from '../types/paper'

const answerGuides: Record<string, string> = {
  Remember: 'Accurate definition, relevant key terms, and a correct example or sequence.',
  Understand: 'Clear explanation in the student’s own words and an accurate statement of purpose.',
  Apply: 'Appropriate method, correct steps, and a reasoned result for the scenario.',
  Analyze: 'Relevant components, accurate relationships, and a supported conclusion.',
  Evaluate: 'Clear criteria, balanced evidence, and a justified judgment.',
  Create: 'An original, feasible example or design with an explanation of its choices.',
}

type SyllabusTopic = {
  topic: string
  unitNumber?: number
}

function unitNumberFromLabel(value: string) {
  if (/^[1-5]$/.test(value)) return Number(value)
  const romanNumerals: Record<string, number> = { i: 1, ii: 2, iii: 3, iv: 4, v: 5 }
  return romanNumerals[value.toLowerCase()]
}

function parseTopics(syllabus: string): SyllabusTopic[] {
  const topics: SyllabusTopic[] = []
  let currentUnit: number | undefined
  const normalizedSyllabus = syllabus
    .replace(/\u00a0/g, ' ')
    .replace(/\s+(?=(?:unit|module|lesson|chapter)\s*[-:]?\s*(?:1|2|3|4|5|iv|i{1,3}|v)\b)/gi, '\n')
    .replace(/([.!?])\s+(?=[A-Z0-9])/g, '$1\n')
    .replace(/^\s*(?:page\s+)?\d+\s*(?:of\s+\d+)?\s*$/gim, '')
  for (const line of normalizedSyllabus.split(/[\r\n;]+/)) {
    const cleanedLine = line.replace(/^\s*(?:(?:[-*•])|(?:\d+[.)]))\s*/, '').trim()
    if (!cleanedLine) continue
    if (/^(?:course outcomes?|course objectives?|subject|course code|semester|curriculum|syllabus)\s*[:-]/i.test(cleanedLine)) continue
    const unitMatch = cleanedLine.match(/^(?:unit|module|lesson|chapter)\s*[-:]?\s*(1|2|3|4|5|iv|i{1,3}|v)\s*[:.)–—-]?\s*(.*)$/i)
    let topic = cleanedLine
    let explicitUnit = currentUnit
    if (unitMatch) {
      explicitUnit = unitNumberFromLabel(unitMatch[1])
      currentUnit = explicitUnit
      topic = unitMatch[2].trim()
      if (!topic) continue
    }
    const topicEntries = (explicitUnit ? topic.split(/\s*,\s*/) : [topic])
      .map((entry) => entry.replace(/\s+/g, ' ').trim())
      .filter(Boolean)
    for (const topicEntry of topicEntries) {
      if (!topics.some((entry) => entry.topic.toLowerCase() === topicEntry.toLowerCase())) {
        topics.push({ topic: topicEntry, unitNumber: explicitUnit })
      }
    }
  }

  return topics.map((entry, index) => ({
    ...entry,
    unitNumber: entry.unitNumber ?? Math.min(5, Math.floor(index * 5 / topics.length) + 1),
  }))
}

function questionsBeforeType(selectedTypes: PaperRequest['questionTypes'], currentType: QuestionTypeId) {
  let count = 0
  for (const item of selectedTypes) {
    if (item.type === currentType) return count
    count += item.count
  }
  return count
}

function topicForUnit(topics: SyllabusTopic[], unitNumber: number, lessonIndex: number) {
  const unitTopics = topics.filter((topic) => topic.unitNumber === unitNumber)
  if (unitTopics.length > 0) return unitTopics[lessonIndex % unitTopics.length]
  return topics[(unitNumber - 1 + lessonIndex) % topics.length]
}

function unitForQuestion(questionIndex: number, questionCount: number) {
  const questionsPerUnit = Math.floor(questionCount / 5)
  const unitsWithExtraQuestion = questionCount % 5
  let remaining = questionIndex
  for (let unitIndex = 0; unitIndex < 5; unitIndex += 1) {
    const questionsInUnit = questionsPerUnit + (unitIndex < unitsWithExtraQuestion ? 1 : 0)
    if (remaining < questionsInUnit) return unitIndex + 1
    remaining -= questionsInUnit
  }
  return 5
}

const topicStopWords = new Set([
  'a', 'an', 'and', 'as', 'at', 'by', 'for', 'from', 'in', 'of', 'on', 'or', 'the', 'their', 'to', 'with',
  'applications', 'application', 'methods', 'method', 'properties', 'property', 'problems', 'problem',
  'related', 'relevant', 'systems', 'system', 'using',
])

function topicTerms(topic: string) {
  return topic
    .toLowerCase()
    .match(/[a-z][a-z0-9-]*/g)
    ?.filter((term) => term.length > 2 && !topicStopWords.has(term)) ?? []
}

function createQuestion(
  type: QuestionTypeId,
  topic: string,
  syllabusTopics: string[],
  relatedTopic: string,
  bloomLevel: string,
  subject: string,
  difficulty: string,
  marks: number,
  index: number,
): GeneratedQuestion {
  const questionType = QUESTION_TYPES.find((option) => option.id === type)
  const challenge = difficulty === 'Foundational'
    ? 'a straightforward example'
    : difficulty === 'Challenging'
      ? 'a complex example with at least one constraint'
      : 'a realistic example'
  const relatedConcept = relatedTopic === topic ? 'its main components' : `its relationship to ${relatedTopic}`
  let question: string
  let options: string[] = []
  let answer = `${answerGuides[bloomLevel]} Connect the response to ${topic} in ${subject}.`

  if (type === 'one-mark') {
    const terms = topicTerms(topic)
    const distractors = [...new Set(syllabusTopics.flatMap(topicTerms))]
      .filter((term) => !terms.includes(term))
    const correctTerm = terms[index % Math.max(terms.length, 1)] ?? 'concept'
    const fallbackOptions = ['definition', 'method', 'structure', 'process', 'feature', 'principle', 'formula', 'function']
      .filter((term) => term !== correctTerm && !terms.includes(term))
    const otherOptions = [...distractors, ...fallbackOptions]
    const choiceTerms = [correctTerm]
    for (let offset = 0; choiceTerms.length < 4 && offset < otherOptions.length; offset += 1) {
      const option = otherOptions[(index + offset) % otherOptions.length]
      if (option && !choiceTerms.includes(option)) choiceTerms.push(option)
    }
    while (choiceTerms.length < 4) {
      const fallback = `concept ${choiceTerms.length}`
      if (!choiceTerms.includes(fallback)) choiceTerms.push(fallback)
    }
    const useLongChoices = index % 2 === 1
    options = choiceTerms.map((term, optionIndex) => {
      if (!useLongChoices) return term
      const longChoiceTemplates = [
        `The role of ${term} within ${topic}`,
        `${term} as a core concept in ${topic}`,
        `The principle of ${term} applied to ${topic}`,
        `${term} used in the study of ${topic}`,
      ]
      return longChoiceTemplates[optionIndex % longChoiceTemplates.length]
    })
    const prompts = [
      `In ${subject}, which key term best identifies a fundamental concept covered when studying ${topic}?`,
      `While reviewing ${topic} in ${subject}, which concise term should a student recognize as a core idea?`,
      `Which short term is most closely connected to the key concepts taught under ${topic} in ${subject}?`,
      `During an examination on ${topic}, which syllabus-related term best represents one of its central concepts in ${subject}?`,
    ]
    question = prompts[index % prompts.length]
    answer = options[0]
  } else if (type === 'two-mark') {
    const prompts = [
      `State two key points about ${topic} in ${subject}. (2 × 1 marks)`,
      `List two important terms or features of ${topic} in ${subject}. (2 × 1 marks)`,
      `Name two facts related to ${topic} in ${subject}. (2 × 1 marks)`,
    ]
    question = prompts[index % prompts.length]
    answer = `Any two accurate, distinct syllabus-relevant points about ${topic}.`
  } else if (bloomLevel === 'Remember') {
    question = type === 'three-mark'
        ? `What is ${topic}? Define it and explain two key terms or steps.`
        : type === 'five-mark'
          ? `What are the main ideas in ${topic}? Define its key terms and outline its steps.`
        : type === 'seven-mark'
          ? `What are the key principles of ${topic}? Explain its terms and steps, then give ${challenge}.`
          : `What are the principles of ${topic}? Explain its key terms, steps, applications, and limitations, with ${challenge}.`
  } else if (bloomLevel === 'Understand') {
    question = type === 'three-mark'
        ? `How does ${topic} work? Explain it in your own words and give an example.`
        : type === 'five-mark'
          ? `How does ${topic} work? Explain its main ideas and illustrate them with an example.`
        : type === 'seven-mark'
          ? `How does ${topic} work in ${subject}? Explain its key ideas and illustrate them with ${challenge}.`
          : `How do the key ideas in ${topic} relate to one another? Explain their significance in ${subject} and illustrate them with ${challenge}.`
  } else if (bloomLevel === 'Apply') {
    question = type === 'three-mark'
        ? `How can ${topic} be applied to ${challenge}? Show the main steps and result.`
        : type === 'five-mark'
          ? `How would you apply ${topic} to ${challenge}? Show the method, key steps, and result.`
        : type === 'seven-mark'
          ? `How would you use ${topic} to solve ${challenge}? Show your method, steps, and result.`
          : `How can ${topic} be used to solve ${challenge}? State assumptions, show the steps, justify your method, and evaluate the result.`
  } else if (bloomLevel === 'Analyze') {
    question = type === 'three-mark'
        ? `What are two key components of ${topic}, and how do they relate to ${relatedTopic}?`
        : type === 'five-mark'
          ? `What are the main components of ${topic}, and how do they relate to ${relatedTopic}? Support your analysis with an example.`
        : type === 'seven-mark'
          ? `How are the components of ${topic} related in ${subject}? Analyze ${relatedConcept} using ${challenge}.`
          : `How do the components of ${topic} compare and interact? Analyze ${relatedConcept} and support your conclusion with ${challenge}.`
  } else if (bloomLevel === 'Evaluate') {
    question = type === 'three-mark'
        ? `Which criterion would you use to judge an approach to ${topic}, and why?`
        : type === 'five-mark'
          ? `How would you evaluate an approach to ${topic}? State your criteria and justify your conclusion.`
        : type === 'seven-mark'
          ? `Which approach to ${topic} is most suitable for ${challenge}? State your criteria, weigh the evidence, and justify your choice.`
          : `Which approach to ${topic} is most suitable for ${challenge}? Establish criteria, compare alternatives, weigh evidence, and defend your conclusion.`
  } else {
    question = type === 'three-mark'
        ? `How could you create an example using ${topic}? Describe it and explain how it works.`
        : type === 'five-mark'
          ? `How could you design a solution using ${topic}? Describe the main features and justify your choices.`
        : type === 'seven-mark'
          ? `How would you design a solution using ${topic} for ${challenge}? Explain your design choices and how they meet the requirements.`
          : `How would you design a complete solution using ${topic} for ${challenge}? Explain the design, alternatives, and how it meets the requirements.`
  }

  if (type === 'five-mark') {
    answer = `${answerGuides[bloomLevel]} Include clear supporting details and an example related to ${topic}.`
  }

  return {
    type,
    bloomLevel: type === 'one-mark' || type === 'two-mark' ? 'Remember' : bloomLevel,
    marks,
    section: questionType?.section ?? 'Section A',
    question,
    options,
    answer,
  }
}

function isMathematicsSubject(subject: string) {
  return /\b(math(?:s|ematics)?|algebra|calculus|geometry|trigonometry|statistics|probability|numerical methods|numerical analysis|mathematical methods|quantitative (?:aptitude|techniques))\b/i.test(subject)
}

function isPhysicsSubject(subject: string) {
  return /\bphysics\b/i.test(subject)
}

function createMathematicsQuestion(marks: number, topic: string, set: PaperSet, index: number) {
  const seed = index + (set === 'B' ? 11 : 0)
  const x = 2 + (seed % 9)
  const y = 3 + (seed % 7)
  const z = 1 + (seed % 5)
  let question: string
  let answer: string

  if (marks === 1) {
    const a = 3 + (seed % 8)
    const b = 2 + ((seed * 3) % 9)
    const c = 2 + ((seed * 5) % 7)
    question = `Numerical problem (${topic}): calculate ${a} + ${b} × ${c}.`
    answer = String(a + b * c)
  } else if (marks === 2) {
    const a = set === 'B' ? 4 + (seed % 7) : 2 + (seed % 5)
    const b = 3 + ((seed * 2) % 11)
    question = `Numerical problem (${topic}): solve ${a}x + ${b} = ${a * x + b} and find x.`
    answer = `x = ${x}`
  } else if (marks === 3) {
    const a = set === 'B' ? 8 + (seed % 5) : 4 + (seed % 4)
    const c = 1 + (seed % 3)
    const b = 5 + ((seed * 2) % 9)
    const d = (a - c) * x + b
    question = `Numerical problem (${topic}): solve ${a}x + ${b} = ${c}x + ${d} and show the calculation.`
    answer = `x = ${x}`
  } else if (marks === 5) {
    const matrix = set === 'B' ? [[5, 2], [3, -1]] : [[2, 1], [1, -1]]
    const [first, second] = matrix
    const firstTotal = first[0] * x + first[1] * y
    const secondTotal = second[0] * x + second[1] * y
    const expression = (a: number, b: number) => `${a}x ${b < 0 ? '−' : '+'} ${Math.abs(b)}y`
    question = `Numerical problem (${topic}): solve ${expression(first[0], first[1])} = ${firstTotal} and ${expression(second[0], second[1])} = ${secondTotal}. Find x and y.`
    answer = `x = ${x}, y = ${y}`
  } else if (marks === 7) {
    const firstRoot = 2 + (seed % 6)
    const secondRoot = 3 + ((seed * 2) % 7)
    const sum = firstRoot + secondRoot
    const product = firstRoot * secondRoot
    question = `Numerical problem (${topic}): solve x² − ${sum}x + ${product} = 0. Show the factorisation and calculate both roots.`
    answer = `x = ${firstRoot} or x = ${secondRoot}`
  } else {
    const values = [x, y, z]
    const matrix = set === 'B'
      ? [[4, 2, -1], [1, 5, 2], [3, -2, 4]]
      : [[2, 1, -1], [1, 3, 2], [3, -1, 2]]
    const totals = matrix.map((row) => row.reduce((sum, coefficient, column) => sum + coefficient * values[column], 0))
    const expression = (coefficients: number[]) => coefficients
      .map((coefficient, position) => {
        const variable = ['x', 'y', 'z'][position]
        if (coefficient === 0) return ''
        const magnitude = Math.abs(coefficient) === 1 ? '' : String(Math.abs(coefficient))
        const term = `${magnitude}${variable}`
        return position === 0
          ? coefficient < 0 ? `−${term}` : term
          : `${coefficient < 0 ? '−' : '+'} ${term}`
      })
      .filter(Boolean)
      .join(' ')
    question = `Numerical problem (${topic}): solve the simultaneous equations ${expression(matrix[0])} = ${totals[0]}, ${expression(matrix[1])} = ${totals[1]}, and ${expression(matrix[2])} = ${totals[2]}. Show your working and find x, y, and z.`
    answer = `x = ${x}, y = ${y}, z = ${z}`
  }

  return { question, options: [], answer }
}

function createClass12MathematicsQuestion(marks: number, topic: string, set: PaperSet, index: number) {
  const seed = index + (set === 'B' ? 3 : 0)
  const n = 2 + (seed % 5)
  const m = 3 + ((seed * 2) % 5)
  const hard = set === 'B'
  const subject = topic.toLowerCase()
  let calculation: string
  let answer: string

  if (/matri(?:x|ces)|determinant/.test(subject)) {
    const a = n + (hard ? 2 : 0)
    const b = 2 + (seed % 4)
    const c = 1 + ((seed * 2) % 3)
    const d = m + (hard ? 1 : 0)
    calculation = `find the determinant of the matrix [[${a}, ${b}], [${c}, ${d}]]`
    answer = `determinant = ${a * d - b * c}`
  } else if (/complex number/.test(subject)) {
    const real = n + (hard ? 2 : 0)
    const imaginary = m
    calculation = `find the modulus and square of z = ${real} + ${imaginary}i`
    answer = `|z| = √${real * real + imaginary * imaginary}; z² = ${real * real - imaginary * imaginary} + ${2 * real * imaginary}i`
  } else if (/trigonometric|inverse trigonometric/.test(subject)) {
    const opposite = n
    const adjacent = m
    calculation = `if θ = tan⁻¹(${opposite}/${adjacent}), calculate sin θ, cos θ, and tan θ`
    answer = `tan θ = ${opposite}/${adjacent}; sin θ = ${opposite}/√${opposite * opposite + adjacent * adjacent}; cos θ = ${adjacent}/√${opposite * opposite + adjacent * adjacent}`
  } else if (/differenti|derivative|extrema|rates of change/.test(subject)) {
    const power = hard ? 4 : 3
    const at = n
    calculation = `for f(x) = x^${power} − ${m}x² + ${n}x, calculate f′(${at})`
    answer = `f′(${at}) = ${power * at ** (power - 1) - 2 * m * at + n}`
  } else if (/integrat|area under/.test(subject)) {
    const power = hard ? 3 : 2
    const limit = n
    calculation = `evaluate the definite integral ∫₀^${limit} x^${power} dx`
    answer = `${limit ** (power + 1)}/${power + 1}`
  } else if (/probability/.test(subject)) {
    const total = hard ? 12 : 10
    const event = 3 + (seed % 4)
    const favorable = 2 + (seed % 3)
    calculation = `an experiment has ${total} equally likely outcomes and event A has ${event} outcomes. Event B has ${favorable} outcomes, all within A. Calculate P(A), P(B|A), and P(A ∩ B)`
    answer = `P(A) = ${event}/${total}; P(B|A) = ${favorable}/${event}; P(A ∩ B) = ${favorable}/${total}`
  } else if (/vector/.test(subject)) {
    const vectors = [[n, 2, 1], [1, m, 3]]
    const [u, v] = vectors
    calculation = `for u = (${u.join(', ')}) and v = (${v.join(', ')}), calculate u · v and |u × v|`
    const cross = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]]
    answer = `u · v = ${u.reduce((sum, value, i) => sum + value * v[i], 0)}; |u × v| = √${cross.reduce((sum, value) => sum + value * value, 0)}`
  } else if (/three-dimensional|3d geometry|analytical geometry|conic/.test(subject)) {
    const points = [[n, 1, 2], [1, m, 2]]
    const [a, b] = points
    calculation = `find the distance between P(${a.join(', ')}) and Q(${b.join(', ')})`
    answer = `PQ = √${(a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2}`
  } else if (/differential equation|ordinary differential/.test(subject)) {
    const value = n
    const constant = m
    calculation = `solve dy/dx = ${constant}x with y(0) = ${value}, then calculate y(2)`
    answer = `y = ${constant}x²/2 + ${value}; y(2) = ${2 * constant + value}`
  } else if (/linear programming|optimization/.test(subject)) {
    const x = n
    const y = m
    const a = 2 + (seed % 3)
    const b = 1 + (seed % 4)
    calculation = `a feasible region has vertices (0, 0), (${x}, 0), and (0, ${y}). Find the maximum of Z = ${a}x + ${b}y by checking all vertices`
    answer = `Z(0,0) = 0; Z(${x},0) = ${a * x}; Z(0,${y}) = ${b * y}; maximum = ${Math.max(0, a * x, b * y)}`
  } else if (/relation|function|composition/.test(subject)) {
    const a = n
    const b = m
    calculation = `if f(x) = ${a}x + 1 and g(x) = x² − ${b}, calculate (g ∘ f)(2)`
    answer = `(g ∘ f)(2) = ${((a * 2 + 1) ** 2) - b}`
  } else if (/theory of equation|equation|polynomial/.test(subject)) {
    const firstRoot = n
    const secondRoot = m
    calculation = `form the quadratic equation with roots ${firstRoot} and ${secondRoot}, then verify the sum and product of its roots`
    answer = `x² − ${firstRoot + secondRoot}x + ${firstRoot * secondRoot} = 0; sum = ${firstRoot + secondRoot}; product = ${firstRoot * secondRoot}`
  } else if (/discrete|counting|boolean/.test(subject)) {
    const items = n + 4
    calculation = `calculate the number of ways to choose 3 objects from ${items} distinct objects`
    answer = `${items}C3 = ${items * (items - 1) * (items - 2) / 6}`
  } else {
    const a = n + (hard ? 2 : 0)
    const b = m
    calculation = `solve ${a}x² − ${b} = ${a * n * n - b} and find the positive value of x`
    answer = `x = ${n}`
  }

  const extension = marks >= 5 ? ' Show each step clearly and verify your result.' : ' Show the calculation.'
  const indirectPrefix = hard
    ? `A Class 12 examination problem on ${topic} is presented through an unfamiliar set of values. Determine the required quantity: `
    : ''
  return {
    question: `Numerical problem (${topic}): ${indirectPrefix}${calculation}.${extension}`,
    options: [],
    answer,
  }
}

function createPhysicsNumericalQuestion(topic: string, set: PaperSet, index: number) {
  const seed = index + (set === 'B' ? 9 : 0)
  const first = 4 + (seed % 11)
  const second = 2 + ((seed * 3) % 8)
  const normalizedTopic = topic.toLowerCase()
  let question: string
  let answer: string

  if (/electric|current|circuit|resistance|ohm|voltage/.test(normalizedTopic)) {
    question = `Numerical problem (${topic}): a resistor of ${second} Ω carries a current of ${first} A. Calculate the potential difference using V = IR.`
    answer = `V = ${first * second} V`
  } else if (/force|newton|acceleration/.test(normalizedTopic)) {
    question = `Numerical problem (${topic}): a ${first} kg object accelerates at ${second} m/s². Calculate the net force using F = ma.`
    answer = `F = ${first * second} N`
  } else if (/work|energy|power/.test(normalizedTopic)) {
    question = `Numerical problem (${topic}): a constant force of ${first} N moves an object ${second} m in ${first} s. Calculate the work done and average power.`
    answer = `Work = ${first * second} J; average power = ${second} W`
  } else {
    question = `Numerical problem (${topic}): an object travels ${first * second} m in ${second} s. Calculate its average speed.`
    answer = `Average speed = ${first} m/s`
  }

  if (set === 'B') {
    question = `A real-world situation involving ${topic} requires an indirect calculation. ${question} Check that your result is consistent with the given quantities.`
  }
  return { question, options: [], answer }
}

export async function generatePaper(request: PaperRequest, set: PaperSet): Promise<GeneratedPaper> {
  const syllabusTopics = parseTopics(request.syllabus)
  const topics = syllabusTopics.map(({ topic }) => topic)
  if (topics.length === 0) {
    throw new Error('Add at least one syllabus topic before generating a paper.')
  }

  if (request.bloomsLevels.length === 0) {
    throw new Error('Select at least one Bloom’s taxonomy level.')
  }

  const selectedTypes = request.questionTypes.filter((item) => item.count > 0)
  const totalQuestions = selectedTypes.reduce((total, item) => total + item.count, 0)
  const format = ASSESSMENT_FORMATS[request.assessmentType]
  if (totalQuestions === 0) {
    throw new Error('Choose at least one question to generate a paper.')
  }

  let questionIndex = 0
  let styledQuestionIndex = 0
  const questions = selectedTypes.flatMap(({ type, count }) =>
    Array.from({ length: count }, (_, itemIndex) => {
      const index = questionsBeforeType(selectedTypes, type) + itemIndex
      const topicOffset = set === 'B' ? 1 : 0
      const unitNumber = unitForQuestion(itemIndex, count)
      const questionsPerUnit = Math.ceil(count / 5)
      const lessonIndex = itemIndex % questionsPerUnit + topicOffset
      const topicDetails = topicForUnit(syllabusTopics, unitNumber, lessonIndex)
      const topic = topicDetails.topic
      const relatedTopic = topics[(index + topicOffset + 1) % topics.length]
      const courseOutcome = `CO${topicDetails.unitNumber ?? unitNumber}`
      const indirect = set === 'B' || index % 3 === 1
      const higherOrderLevels = ['Apply', 'Analyze', 'Evaluate', 'Create']
      const availableHigherOrderLevels = request.bloomsLevels.filter((level) => higherOrderLevels.includes(level))
      const questionBloomLevels = set === 'B'
        ? (availableHigherOrderLevels.length > 0 ? availableHigherOrderLevels : higherOrderLevels)
        : indirect && availableHigherOrderLevels.length > 0
          ? availableHigherOrderLevels
          : request.bloomsLevels
      const bloomLevel = questionBloomLevels[questionIndex++ % questionBloomLevels.length]
      const marks = format.marksPerQuestion[type]
      let question = createQuestion(
        type,
        topic,
        topics,
        relatedTopic,
        bloomLevel,
        request.subject,
        set === 'B' || indirect ? 'Challenging' : request.difficulty,
        marks,
        index,
      )
      question = {
        ...question,
        unitNumber,
        courseOutcome,
        lesson: topic,
      }
      if (type === 'one-mark' || type === 'two-mark') return question

      const attachEitherOr = (primary: GeneratedQuestion) => {
        if (type !== 'fourteen-mark' || !request.longQuestionEitherOr) return primary
        const alternativeIndex = index + topics.length * (set === 'B' ? 2 : 1)
        const alternativeTopicDetails = topicForUnit(
          syllabusTopics,
          unitNumber,
          lessonIndex + 1,
        )
        const alternativeTopic = alternativeTopicDetails.topic
        let alternative = createQuestion(
          type,
          alternativeTopic,
          topics,
          topic,
          bloomLevel,
          request.subject,
          'Challenging',
          marks,
          alternativeIndex,
        )
        if (isMathematicsSubject(request.subject)) {
          alternative = {
            ...alternative,
            ...(Number(request.gradeLevel.match(/\d+/)?.[0]) === 12
              ? createClass12MathematicsQuestion(marks, alternativeTopic, set, alternativeIndex)
              : createMathematicsQuestion(marks, alternativeTopic, set, alternativeIndex)),
          }
        } else if (isPhysicsSubject(request.subject)) {
          alternative = {
            ...alternative,
            ...createPhysicsNumericalQuestion(alternativeTopic, set, alternativeIndex),
          }
        } else {
          alternative = {
            ...alternative,
            question: `${alternative.question} Use a different valid approach and justify each step.`,
          }
        }
        return {
          ...primary,
          eitherOrQuestion: alternative.question,
          eitherOrAnswer: alternative.answer,
          eitherOrUnitNumber: alternativeTopicDetails.unitNumber ?? unitNumber,
          eitherOrCourseOutcome: `CO${alternativeTopicDetails.unitNumber ?? unitNumber}`,
          eitherOrLesson: alternativeTopic,
        }
      }
      if (isMathematicsSubject(request.subject)) {
        return attachEitherOr({
          ...question,
          ...(Number(request.gradeLevel.match(/\d+/)?.[0]) === 12
            ? createClass12MathematicsQuestion(marks, topic, set, index)
            : createMathematicsQuestion(marks, topic, set, index)),
          bloomLevel: 'Apply',
        })
      }
      if (isPhysicsSubject(request.subject) && (set === 'B' ? index % 2 === 0 : index % 3 === 0)) {
        return attachEitherOr({
          ...question,
          ...createPhysicsNumericalQuestion(topic, set, index),
          bloomLevel: 'Apply',
        })
      }
      if (marks < 3 || request.schoolQuestionStyles.length === 0) return attachEitherOr(question)

      const style = request.schoolQuestionStyles[styledQuestionIndex++ % request.schoolQuestionStyles.length]
      if (style === 'diagram') {
        question = {
          ...question,
          question: `${question.question} Draw and label a clear diagram illustrating ${topic}. Identify its important parts and briefly explain their roles.`,
        }
      } else if (style === 'equation') {
        question = {
          ...question,
          question: `${question.question} Write the relevant equation or formula for ${topic}. Define each term and show how it is used in a suitable example.`,
        }
      }
      return attachEitherOr(question)
    }),
  )

  const totalMarks = questions.reduce((total, question) => total + question.marks, 0)

  return {
    title: `${request.subjectCode} · ${request.subject} · ${format.title} · Set ${set}`,
    assessmentType: request.assessmentType,
    set,
    curriculum: request.curriculum,
    subject: request.subject,
    subjectCode: request.subjectCode,
    questionPaperCode: createQuestionPaperCode(request.subject, request.subjectCode, set),
    gradeLevel: request.gradeLevel,
    generatedAt: new Date().toISOString(),
    durationMinutes: request.durationMinutes,
    totalMarks,
    instructions: [
      'Answer all questions.',
      'Choose one best response for each multiple-choice question.',
      'Use the mark allocation as a guide for the depth of each written answer.',
    ],
    questions,
  }
}

function createQuestionPaperCode(subject: string, subjectCode: string, set: PaperSet) {
  const words = subject.trim().split(/\s+/).filter(Boolean)
  const subjectPrefix = (words.length > 1
    ? words.map((word) => word[0]).join('')
    : (words[0] ?? 'paper').slice(0, 2)).toLowerCase()
  const courseNumber = subjectCode.match(/\d+/g)?.join('') || subjectCode.replace(/[^a-z\d]/gi, '')
  return `${subjectPrefix}qp${courseNumber || 'paper'}-${set.toLowerCase()}`
}