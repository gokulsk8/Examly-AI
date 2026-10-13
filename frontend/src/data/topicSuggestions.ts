export const CURRICULA = [
  'Tamil Nadu State Board',
  'CBSE',
  'College / University',
  'Other',
] as const

export type Curriculum = (typeof CURRICULA)[number]

const schoolTopics: Record<string, string[]> = {
  mathematics: [
    'Number systems, integers, fractions, and decimals',
    'Ratio, proportion, percentages, and commercial arithmetic',
    'Algebraic expressions, identities, and factorisation',
    'Linear equations and their applications',
    'Sequences, patterns, and progressions',
    'Geometry: lines, angles, triangles, and polygons',
    'Constructions, symmetry, and geometric diagrams',
    'Coordinate geometry and graphs',
    'Mensuration: perimeter, area, surface area, and volume',
    'Statistics, data handling, and graphical representation',
    'Probability and experimental outcomes',
    'Mathematical reasoning and word problems',
  ],
  science: [
    'Materials, mixtures, and separation methods',
    'Atoms, molecules, and chemical changes',
    'Living organisms, cells, and life processes',
    'Human body systems, health, and nutrition',
    'Plants, reproduction, and heredity',
    'Motion, force, pressure, and measurement',
    'Work, energy, heat, and temperature',
    'Light, reflection, refraction, and optical diagrams',
    'Sound, waves, and communication',
    'Electricity, circuits, and magnetism',
    'Earth, space, and natural resources',
    'Environment, ecosystems, and conservation',
  ],
  physics: [
    'Units, dimensions, measurement, and significant figures',
    'Motion in one and two dimensions',
    'Newton’s laws of motion and friction',
    'Work, energy, power, and conservation laws',
    'Gravitation and properties of matter',
    'Heat, thermodynamics, and kinetic theory',
    'Oscillations, waves, and sound',
    'Reflection, refraction, lenses, and optical instruments',
    'Electric charges, fields, and potential',
    'Current electricity and circuit diagrams',
    'Magnetism, electromagnetic induction, and AC',
    'Modern physics, atoms, nuclei, and semiconductors',
    'Relevant equations, units, graphs, and numerical problems',
  ],
  chemistry: [
    'Matter, atomic structure, and periodic properties',
    'Chemical bonding, molecular structure, and formulae',
    'Chemical reactions, equations, and stoichiometry',
    'States of matter, gases, and intermolecular forces',
    'Solutions, concentration, and colligative properties',
    'Acids, bases, salts, and ionic equilibria',
    'Chemical thermodynamics and spontaneity',
    'Chemical equilibrium and reaction rates',
    'Redox reactions and electrochemistry',
    'Metals, non-metals, and coordination compounds',
    'Organic chemistry, functional groups, and mechanisms',
    'Laboratory methods, observations, and chemical diagrams',
  ],
  biology: [
    'Cell structure, organelles, and cell division',
    'Biomolecules, enzymes, and cellular metabolism',
    'Plant anatomy, transport, and photosynthesis',
    'Human physiology: digestion, respiration, and circulation',
    'Nervous coordination, hormones, and homeostasis',
    'Reproduction, development, and reproductive health',
    'Genetics, inheritance, and molecular biology',
    'Evolution, biodiversity, and classification',
    'Ecology, populations, and ecosystems',
    'Health, disease, immunity, and prevention',
    'Biotechnology and its applications',
    'Experimental methods and labelled biological diagrams',
  ],
  'social science': [
    'History: societies, events, movements, and chronology',
    'Indian history, freedom movement, and nation building',
    'Geography: landforms, climate, and natural processes',
    'Resources, agriculture, industries, and livelihoods',
    'Maps, location skills, and spatial interpretation',
    'Civics: democracy, constitution, and citizenship',
    'Government institutions, rights, and responsibilities',
    'Economics: development, production, and distribution',
    'Money, markets, public finance, and globalisation',
    'Environment, sustainability, and disaster management',
    'Timelines, primary sources, graphs, and data interpretation',
  ],
  english: [
    'Reading comprehension, vocabulary, and inference',
    'Prose texts: plot, character, setting, and theme',
    'Poetry: meaning, form, imagery, and sound',
    'Drama and supplementary reading',
    'Literary devices, tone, and point of view',
    'Grammar, syntax, and language conventions',
    'Editing, transformation, and sentence construction',
    'Formal letters, reports, and notices',
    'Essays, creative writing, and composition',
    'Speaking, listening, and communication skills',
  ],
  tamil: [
    'Reading comprehension and vocabulary',
    'Tamil poetry, meaning, metre, and literary appreciation',
    'Prose lessons: theme, characters, and context',
    'Supplementary texts and moral or social themes',
    'Tamil grammar, word forms, and sentence structure',
    'Literary forms, figures of speech, and usage',
    'Comprehension, summary, and interpretation',
    'Letter writing, essays, and composition',
    'Translation and language skills',
    'Tamil culture, heritage, and authors',
  ],
  'computer science': [
    'Computer systems, hardware, and software',
    'Number systems, data representation, and encoding',
    'Problem solving, algorithms, and pseudocode',
    'Flowcharts, trace tables, and system diagrams',
    'Programming syntax, variables, and data types',
    'Operators, selection, iteration, and control structures',
    'Functions, modularity, and parameter passing',
    'Arrays, strings, records, and collections',
    'Data structures, searching, and sorting',
    'Databases, SQL, and information management',
    'Networks, cybersecurity, and the internet',
    'Ethics, privacy, and societal impacts of computing',
  ],
}

const cbseSchoolTopics: Record<string, string[]> = {
  mathematics: [
    'Number systems, rational numbers, and real numbers',
    'Algebra, polynomials, and linear equations',
    'Coordinate geometry, lines, and constructions',
    'Triangles, circles, and mensuration',
    'Statistics, probability, and data interpretation',
  ],
  science: [
    'Chemical substances, reactions, and equations',
    'Cell structure, tissues, and life processes',
    'Motion, force, work, and energy',
    'Light, electricity, and magnetic effects',
    'Natural resources, ecosystems, and scientific diagrams',
  ],
  'social science': [
    'History, nationalism, and social change',
    'Physical features, resources, and map work',
    'Democracy, institutions, and political processes',
    'Development, economics, and livelihoods',
    'Source interpretation, case studies, and data',
  ],
  english: [
    'Reading comprehension and analysis',
    'Literature: prose, poetry, and supplementary texts',
    'Grammar and language conventions',
    'Writing formats and composition',
    'Critical response and evidence from texts',
  ],
}

const cbseClass12MathematicsTopics = [
  'Relations and functions: types, composition, and invertibility',
  'Inverse trigonometric functions and principal values',
  'Matrices: operations, transpose, and inverse',
  'Determinants: properties, minors, cofactors, and applications',
  'Continuity and differentiability of functions',
  'Applications of derivatives: rates of change, tangents, and extrema',
  'Integrals: indefinite integration and standard techniques',
  'Definite integrals and their properties',
  'Applications of integrals: areas under curves',
  'Differential equations: formation and solution methods',
  'Vector algebra: products, projections, and applications',
  'Three-dimensional geometry: lines, planes, and angles',
  'Linear programming: constraints, feasible regions, and optimization',
  'Probability: conditional probability, Bayes’ theorem, and distributions',
]

const tamilNaduClass12MathematicsTopics = [
  'Applications of matrices and determinants: inverse matrices and solving systems',
  'Complex numbers: algebraic form, modulus, argument, and roots',
  'Theory of equations: roots, coefficients, and transformed equations',
  'Inverse trigonometric functions and trigonometric equations',
  'Two-dimensional analytical geometry: conics and their equations',
  'Applications of vector algebra: dot product, cross product, and geometry',
  'Applications of differential calculus: derivatives, tangents, and extrema',
  'Differentiation and partial derivatives',
  'Integration: methods, definite integrals, and properties',
  'Applications of integration: area and related calculations',
  'Ordinary differential equations and initial-value problems',
  'Probability distributions and expected value',
  'Discrete mathematics: logic, Boolean algebra, and counting',
]

const collegeTopics: Record<string, string[]> = {
  'data structures': [
    'Algorithm analysis and complexity',
    'Arrays, linked lists, and operations',
    'Stacks, queues, and applications',
    'Trees, traversals, and search trees',
    'Graphs, representations, and traversal algorithms',
    'Recursion, recurrence relations, and recursive algorithms',
    'Searching, sorting, and order statistics',
    'Hashing, hash tables, and collision resolution',
    'Heaps, priority queues, and heap operations',
    'Balanced trees, B-trees, and indexing',
    'Disjoint sets and union-find operations',
    'Algorithm design strategies and complexity trade-offs',
  ],
  'database management systems': [
    'Database architecture and data models',
    'ER modelling and relational schemas',
    'Relational algebra and SQL queries',
    'Normalization and functional dependencies',
    'Transactions, concurrency, and recovery',
    'Integrity constraints and relational design',
    'Indexing, hashing, and query processing',
    'Distributed databases and data warehousing',
    'Database security, authorization, and privacy',
  ],
  'operating systems': [
    'Processes, threads, and CPU scheduling',
    'Synchronization and deadlocks',
    'Memory management and virtual memory',
    'File systems and storage management',
    'Operating-system structures and diagrams',
    'I/O systems, device management, and disk scheduling',
    'Protection, security, and access control',
    'Virtualization, distributed systems, and case studies',
  ],
  programming: [
    'Variables, types, and expressions',
    'Control flow, functions, and modularity',
    'Arrays, collections, and data handling',
    'Object-oriented programming concepts',
    'Algorithms, debugging, and code tracing',
    'Exception handling, files, and input/output',
    'Testing, documentation, and software quality',
    'Programming language paradigms and runtime concepts',
  ],
  mathematics: [
    'Algebra, functions, and equations',
    'Calculus and applications',
    'Linear algebra and matrices',
    'Probability and statistical methods',
    'Proofs, models, and mathematical diagrams',
    'Differential equations and applications',
    'Discrete mathematics, logic, and combinatorics',
    'Numerical methods and computational mathematics',
  ],
  physics: [
    'Mechanics and mathematical models',
    'Waves, oscillations, and optics',
    'Electricity and magnetism',
    'Thermodynamics and physical systems',
    'Governing equations, units, and diagrams',
    'Electromagnetic waves and applications',
    'Quantum physics and atomic models',
    'Experimental methods, uncertainty, and data analysis',
  ],
  chemistry: [
    'Atomic structure and chemical bonding',
    'Chemical reactions and stoichiometry',
    'Thermodynamics and chemical equilibrium',
    'Organic chemistry and reaction mechanisms',
    'Structures, formulae, and laboratory methods',
    'Chemical kinetics and catalysis',
    'Spectroscopy and analytical methods',
    'Environmental and industrial chemistry',
  ],
  biology: [
    'Cell biology and molecular processes',
    'Genetics and inheritance',
    'Human physiology and body systems',
    'Ecology and evolution',
    'Experimental methods and biological diagrams',
    'Microbiology, immunology, and infectious disease',
    'Biotechnology, genomics, and bioinformatics',
    'Research methods, statistics, and experimental design',
  ],
  english: [
    'Close reading and textual analysis',
    'Literary forms, genres, and movements',
    'Critical interpretation and argument',
    'Language, grammar, and style',
    'Academic writing and research skills',
    'Rhetoric, discourse, and communication',
    'Comparative literature and cultural contexts',
    'Research methods, citation, and critical scholarship',
  ],
}

const genericCollegeTopics = [
  'Core concepts, terminology, and principles',
  'Models, structures, and their components',
  'Methods, processes, and applications',
  'Worked examples, equations, or diagrams',
  'Evaluation, limitations, and real-world uses',
]

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

function normalizeSubject(subject: string) {
  const normalized = normalize(subject)
  return ['math', 'maths'].includes(normalized) ? 'mathematics' : normalized
}

function findSubjectTopics(subject: string, topics: Record<string, string[]>) {
  const normalizedSubject = normalizeSubject(subject)
  const subjectKey = Object.keys(topics).find((key) => {
    const normalizedKey = normalize(key)
    return normalizedSubject === normalizedKey
      || normalizedSubject.includes(normalizedKey)
  })
  return subjectKey ? topics[subjectKey] : undefined
}

export function suggestTopics(curriculum: string, subject: string, gradeLevel: string) {
  if (!subject.trim()) return []

  if (curriculum === 'College / University') {
    return findSubjectTopics(subject, collegeTopics) ?? genericCollegeTopics
  }

  if (curriculum === 'Tamil Nadu State Board' || curriculum === 'CBSE' || curriculum === 'Other') {
    const normalizedSubject = normalizeSubject(subject)
    const gradeNumber = Number(gradeLevel.match(/\d+/)?.[0])
    if (normalizedSubject === 'mathematics' && gradeNumber === 12) {
      return curriculum === 'CBSE' ? cbseClass12MathematicsTopics : tamilNaduClass12MathematicsTopics
    }
    if (curriculum === 'CBSE') {
      return findSubjectTopics(subject, cbseSchoolTopics) ?? [
        `${subject} concepts and NCERT key terminology`,
        `Core principles and applications in ${subject}`,
        `Worked examples, activities, and case-based questions in ${subject}`,
        `Important diagrams, equations, or source material in ${subject}`,
          `Practice and competency-based questions for ${gradeLevel || 'the selected class'}`,
      ]
    }
    if (normalizedSubject === 'mathematics' && gradeNumber >= 6 && gradeNumber <= 8) {
      return [
        'Whole numbers, fractions, and decimals',
        'Basic algebra and simple equations',
        'Lines, angles, and two-dimensional shapes',
        'Measurement, perimeter, and area',
        'Data handling and pictorial representations',
      ]
    }
    if (normalizedSubject === 'mathematics' && gradeNumber >= 11) {
      return [
        'Sets, relations, and functions',
        'Algebra, sequences, and series',
        'Trigonometry and coordinate geometry',
        'Differentiation, integration, and applications',
        'Probability, statistics, and mathematical models',
      ]
    }
    return findSubjectTopics(subject, schoolTopics) ?? [
      `${subject} concepts and key terminology`,
      `Core principles and methods in ${subject}`,
      `Applications and worked examples in ${subject}`,
      `Important diagrams, equations, or source material in ${subject}`,
      `Review and practice questions for ${gradeLevel}`,
    ]
  }

  return []
}
