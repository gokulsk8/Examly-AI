type Props = {
  topics: string[]
  syllabus: string
  onChange: (syllabus: string) => void
}

function splitTopics(syllabus: string) {
  return syllabus
    .split(/[\r\n;]+/)
    .map((topic) => topic.trim())
    .filter(Boolean)
}

export function TopicSelection({ topics, syllabus, onChange }: Props) {
  const currentTopics = splitTopics(syllabus)
  const normalizedCurrent = new Set(currentTopics.map((topic) => topic.toLowerCase()))
  const normalizedAvailable = new Set(topics.map((topic) => topic.toLowerCase()))
  const selectedCount = topics.filter((topic) => normalizedCurrent.has(topic.toLowerCase())).length

  function setAvailableTopics(selectedTopics: string[]) {
    const customTopics = currentTopics.filter((topic) => !normalizedAvailable.has(topic.toLowerCase()))
    onChange([...customTopics, ...selectedTopics].join('\n'))
  }

  return (
    <section className="mt-4 rounded-lg border border-[#dce9df] bg-[#f7faf8] p-4" aria-label="Available subject topics">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-xs font-semibold text-[#42644f]">Available topics for this subject</h3>
          <p className="mt-1 text-[11px] leading-5 text-[#829087]">Select every topic to include in this exam. {selectedCount} of {topics.length} selected.</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            className="rounded-md border border-[#cbdcd0] px-3 py-2 text-[11px] font-semibold text-[#42644f] hover:bg-white"
            type="button"
            onClick={() => setAvailableTopics(topics)}
          >
            Select all
          </button>
          <button
            className="rounded-md px-3 py-2 text-[11px] font-semibold text-[#65756b] hover:bg-white"
            type="button"
            onClick={() => setAvailableTopics([])}
          >
            Clear selection
          </button>
        </div>
      </div>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {topics.map((topic) => {
          const checked = normalizedCurrent.has(topic.toLowerCase())
          return (
            <li key={topic}>
              <label className={`flex h-full cursor-pointer items-start gap-2.5 rounded-md border px-3 py-2.5 text-xs leading-5 transition ${checked ? 'border-[#c8ddce] bg-white text-[#3c5947]' : 'border-transparent text-[#6f7e74] hover:border-[#dce9df] hover:bg-white'}`}>
                <input
                  className="mt-0.5 size-3.5 shrink-0 accent-[#438962]"
                  type="checkbox"
                  checked={checked}
                  onChange={() => {
                    const nextSelection = checked
                      ? topics.filter((availableTopic) => availableTopic.toLowerCase() !== topic.toLowerCase() && normalizedCurrent.has(availableTopic.toLowerCase()))
                      : [...topics.filter((availableTopic) => normalizedCurrent.has(availableTopic.toLowerCase())), topic]
                    setAvailableTopics(nextSelection)
                  }}
                />
                <span>{topic}</span>
              </label>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
