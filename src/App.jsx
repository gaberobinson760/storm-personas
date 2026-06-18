import { useState, useRef, useEffect } from 'react'

const PERSONA_COLORS = ['#3b6fd4', '#c94f4f', '#2e9e5e', '#8b4fc9', '#c97a2e', '#2e8fa0']

const PHILOSOPHER = {
  id: 'preset_philosopher',
  name: 'The Philosopher',
  icon: '🏛️',
  color: '#7a6a5a',
  role: 'A philosopher who examines the underlying assumptions, ethics, and first principles behind any idea.',
  angle: 'What are the foundational assumptions here? What does this idea say about our values? What would a first-principles thinker challenge?',
}

const PRESET_PERSONAS = [
  {
    id: 'preset_progressive',
    name: 'The Progressive',
    icon: '🌿',
    color: '#2e9e5e',
    role: 'A progressive thinker focused on equity, systemic change, collective wellbeing, and challenging existing power structures.',
    angle: 'Who benefits and who is left out? What systemic barriers does this ignore? How does this address or perpetuate inequality?',
  },
  {
    id: 'preset_moderate',
    name: 'The Moderate',
    icon: '⚖️',
    color: '#b8860b',
    role: 'A centrist focused on pragmatic compromise, weighing tradeoffs, and finding common ground across divides.',
    angle: 'What are the legitimate concerns on both sides? Where is the pragmatic middle ground? What would actually get broad buy-in?',
  },
  {
    id: 'preset_conservative',
    name: 'The Conservative',
    icon: '🏔️',
    color: '#b85a1a',
    role: 'A conservative thinker grounded in tradition, personal responsibility, institutional stability, and skepticism of rapid change.',
    angle: 'What time-tested principles does this risk undermining? What unintended consequences come from moving too fast? What works about the status quo that is worth preserving?',
  },
]

const PERSONA_PROMPT_TEMPLATE = (name, role, angle) => `You are ${name}. ${role}

Your job is to analyze the idea through this lens: ${angle}

First, ask 2-3 probing questions that are specific to this idea — not generic. Surface what's being overlooked from your angle.

Then give your honest read.

Format your response exactly like this:
**Questions I'd want answered first:**
- [question 1]
- [question 2]
- [question 3 if needed]

**My read:**
[Your honest take in 3-5 sentences. Be direct.]`

const CHAT_SYSTEM_PROMPT = (name, role, angle) => `You are ${name}. ${role}

You are now in a one-on-one conversation. The user wants to dig deeper into your perspective. Stay fully in character — respond through your specific lens: ${angle}

Be direct, thoughtful, and conversational. Ask follow-up questions when useful. Keep responses focused and under 200 words unless the question demands more depth.`

const BLEND_PROMPT = `You are a synthesis expert. You have been given an original idea and responses from multiple distinct perspectives. Your job is to blend these into one comprehensive, balanced thought.

Do not just summarize each perspective in sequence. Instead, weave them together — find where they agree, where they tension each other, and what a truly well-rounded view looks like when all lenses are considered simultaneously.

Write in clear, direct prose. No bullet points. 3-5 paragraphs. Start with the core insight that emerges from holding all perspectives at once, then work through the nuance.`

const DISCOVER_PERSONAS_PROMPT = `You are a thinking partner. Given an idea or problem, identify the 4 most useful expert perspectives to pressure-test it.

Do NOT use generic archetypes (avoid: "devil's advocate", "pragmatist", "visionary"). Identify specific expert lenses that matter most for THIS particular idea.

Return ONLY valid JSON — no markdown, no explanation:
{
  "personas": [
    {
      "name": "The [Title]",
      "icon": "[single emoji]",
      "role": "One sentence describing who this person is.",
      "angle": "One sentence describing the specific lens they bring to this idea."
    }
  ]
}`

async function anthropicCall(apiKey, system, messages, maxTokens = 800) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: maxTokens,
      system,
      messages,
    }),
  })
  const data = await res.json()
  if (data.error) throw new Error(data.error.message)
  return data.content[0].text
}

// ── Chat Modal ────────────────────────────────────────────────────────────────

function ChatModal({ persona, initialResponse, originalIdea, apiKey, onClose }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: initialResponse }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // Close on backdrop click
  function handleBackdrop(e) {
    if (e.target === e.currentTarget) onClose()
  }

  async function handleSend(e) {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userMsg = { role: 'user', content: input.trim() }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    try {
      // Include the original idea as context in the first user turn
      const apiMessages = newMessages.map((m, i) => {
        if (i === 0) return { role: 'user', content: `Context — the original idea we discussed: "${originalIdea}"\n\nYour initial response was:\n${m.content}` }
        if (i === 1) return { role: 'assistant', content: 'Understood. What would you like to explore further?' }
        return m
      })

      const reply = await anthropicCall(
        apiKey,
        CHAT_SYSTEM_PROMPT(persona.name, persona.role, persona.angle),
        apiMessages,
        600
      )
      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${err.message}` }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      onClick={handleBackdrop}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(10, 15, 30, 0.6)',
        backdropFilter: 'blur(4px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        padding: '0',
      }}
    >
      <div style={{
        background: '#fff',
        width: '100%',
        maxWidth: '720px',
        height: '82vh',
        borderRadius: '20px 20px 0 0',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: '0 -8px 40px rgba(0,0,0,0.2)',
      }}>
        {/* Modal header */}
        <div style={{
          padding: '1.2rem 1.5rem',
          borderBottom: `3px solid ${persona.color}`,
          display: 'flex',
          alignItems: 'center',
          gap: '0.7rem',
          background: '#fafbff',
          flexShrink: 0,
        }}>
          <span style={{ fontSize: '1.4rem' }}>{persona.icon}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, color: persona.color, fontSize: '1rem' }}>{persona.name}</div>
            <div style={{ fontSize: '0.75rem', color: '#aaa', marginTop: '0.1rem' }}>{persona.role}</div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#bbb',
              cursor: 'pointer',
              fontSize: '1.4rem',
              lineHeight: 1,
              padding: '0.2rem',
            }}
          >
            ×
          </button>
        </div>

        {/* Messages */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.2rem',
        }}>
          {messages.map((msg, i) => (
            <div key={i} style={{
              display: 'flex',
              justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
            }}>
              {msg.role === 'assistant' && (
                <span style={{ fontSize: '1.1rem', marginRight: '0.5rem', marginTop: '0.1rem', flexShrink: 0 }}>{persona.icon}</span>
              )}
              <div style={{
                maxWidth: '80%',
                padding: '0.9rem 1.1rem',
                borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                background: msg.role === 'user' ? 'linear-gradient(135deg, #2a4a8a, #4a6ab0)' : '#f4f5fa',
                color: msg.role === 'user' ? '#fff' : '#333',
                fontSize: '0.88rem',
                lineHeight: 1.7,
              }}>
                {formatChatResponse(msg.content, msg.role === 'assistant' ? persona.color : '#fff')}
              </div>
            </div>
          ))}

          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.1rem' }}>{persona.icon}</span>
              <div style={{ display: 'flex', gap: '4px', padding: '0.6rem 0' }}>
                {[0,1,2].map(i => (
                  <div key={i} style={{
                    width: '6px', height: '6px', borderRadius: '50%',
                    background: persona.color,
                    animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
                  }} />
                ))}
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <form
          onSubmit={handleSend}
          style={{
            padding: '1rem 1.2rem',
            borderTop: '1px solid #e8ecf4',
            display: 'flex',
            gap: '0.8rem',
            background: '#fafbff',
            flexShrink: 0,
          }}
        >
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={`Ask ${persona.name} to go deeper...`}
            autoFocus
            style={{
              flex: 1,
              background: '#fff',
              border: '1.5px solid #e0e4f0',
              borderRadius: '10px',
              padding: '0.7rem 1rem',
              fontSize: '0.9rem',
              color: '#1a1a2e',
              outline: 'none',
              fontFamily: 'inherit',
            }}
            onFocus={e => e.target.style.borderColor = persona.color}
            onBlur={e => e.target.style.borderColor = '#e0e4f0'}
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            style={{
              background: input.trim() && !loading ? persona.color : '#e8ecf4',
              color: input.trim() && !loading ? '#fff' : '#bbb',
              border: 'none',
              borderRadius: '10px',
              padding: '0.7rem 1.2rem',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s',
              fontFamily: 'inherit',
              flexShrink: 0,
            }}
          >
            Send
          </button>
        </form>
      </div>
    </div>
  )
}

// ── Formatting ────────────────────────────────────────────────────────────────

function formatChatResponse(text, color) {
  return text.split('\n').map((line, i) => {
    if (line.startsWith('**') && line.endsWith('**')) {
      return (
        <div key={i} style={{ fontWeight: 700, color, marginTop: i > 0 ? '0.8rem' : 0, marginBottom: '0.3rem', fontSize: '0.75rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          {line.replace(/\*\*/g, '')}
        </div>
      )
    }
    if (line.startsWith('- ')) {
      return <div key={i} style={{ paddingLeft: '1rem', marginBottom: '0.2rem' }}>· {line.slice(2)}</div>
    }
    return line ? <div key={i}>{line}</div> : <div key={i} style={{ height: '0.3rem' }} />
  })
}

function formatResponse(text, color) {
  return text.split('\n').map((line, i) => {
    if (line.startsWith('**') && line.endsWith('**')) {
      return (
        <div key={i} style={{ fontWeight: 700, color, marginTop: i > 0 ? '1rem' : 0, marginBottom: '0.4rem', fontSize: '0.72rem', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          {line.replace(/\*\*/g, '')}
        </div>
      )
    }
    if (line.startsWith('- ')) {
      return <div key={i} style={{ paddingLeft: '1rem', color: '#666', marginBottom: '0.2rem' }}>· {line.slice(2)}</div>
    }
    return line ? <div key={i} style={{ color: '#555' }}>{line}</div> : <div key={i} style={{ height: '0.3rem' }} />
  })
}

// ── Persona Card ──────────────────────────────────────────────────────────────

function PersonaCard({ persona, response, loading, discovering, selected, onToggle, panelRan, onDigDeeper, blended, onToggleBlend }) {
  const color = persona?.color || '#aaa'
  const dimmed = panelRan && !selected
  const clickable = !panelRan && onToggle && persona

  return (
    <div
      onClick={() => clickable && onToggle(persona.id)}
      style={{
        background: selected ? '#fff' : '#f7f8fc',
        border: `1.5px solid ${selected ? color + 'aa' : '#e0e4f0'}`,
        borderRadius: '14px',
        padding: '1.3rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.8rem',
        transition: 'all 0.2s ease',
        opacity: dimmed ? 0.3 : 1,
        cursor: clickable ? 'pointer' : 'default',
        position: 'relative',
        boxShadow: selected ? `0 4px 20px ${color}22` : '0 1px 4px rgba(0,0,0,0.06)',
      }}
    >
      {/* Checkbox */}
      {!panelRan && persona && onToggle && (
        <div style={{
          position: 'absolute', top: '1rem', right: '1rem',
          width: '17px', height: '17px', borderRadius: '4px',
          border: `1.5px solid ${selected ? color : '#ccd0e0'}`,
          background: selected ? color : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.15s',
        }}>
          {selected && <span style={{ color: '#fff', fontSize: '10px', fontWeight: 800 }}>✓</span>}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', paddingRight: '1.5rem' }}>
        {discovering ? (
          <div style={{ width: '1.2rem', height: '1.2rem', borderRadius: '50%', background: '#e0e4f0', animation: 'pulse 1.5s infinite' }} />
        ) : (
          <span style={{ fontSize: '1.2rem' }}>{persona.icon}</span>
        )}
        <span style={{ fontWeight: 600, fontSize: '0.9rem', color: discovering ? '#bbb' : selected ? color : '#888', transition: 'color 0.2s' }}>
          {discovering ? 'Discovering...' : persona.name}
        </span>
      </div>

      {/* Accent bar */}
      {!discovering && (
        <div style={{ height: '2px', borderRadius: '2px', background: selected ? color : '#e8ecf4', transition: 'all 0.3s', width: selected ? '40%' : '20%' }} />
      )}

      {/* Content */}
      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ display: 'flex', gap: '3px' }}>
            {[0,1,2].map(i => (
              <div key={i} style={{ width: '5px', height: '5px', borderRadius: '50%', background: color, animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />
            ))}
          </div>
          <span style={{ color: '#aaa', fontSize: '0.8rem' }}>Thinking...</span>
        </div>
      )}

      {discovering && <div style={{ color: '#bbb', fontSize: '0.8rem', fontStyle: 'italic' }}>Finding the right lens...</div>}

      {!loading && !discovering && !response && persona && (
        <div style={{ color: '#aaa', fontSize: '0.82rem', lineHeight: 1.6, fontStyle: 'italic' }}>{persona.role}</div>
      )}

      {response && !loading && !discovering && (
        <>
          <div style={{ fontSize: '0.85rem', lineHeight: 1.75, color: '#444' }}>
            {formatResponse(response, color)}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.4rem', flexWrap: 'wrap' }}>
            <button
              onClick={e => { e.stopPropagation(); onDigDeeper(persona, response) }}
              style={{ background: 'transparent', border: `1.5px solid ${color}66`, borderRadius: '8px', padding: '0.4rem 0.9rem', fontSize: '0.78rem', fontWeight: 600, color, cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit' }}
              onMouseEnter={e => { e.target.style.background = color; e.target.style.color = '#fff' }}
              onMouseLeave={e => { e.target.style.background = 'transparent'; e.target.style.color = color }}
            >
              Dig deeper →
            </button>
            <button
              onClick={e => { e.stopPropagation(); onToggleBlend(persona.id) }}
              style={{ background: blended ? color : 'transparent', border: `1.5px solid ${color}66`, borderRadius: '8px', padding: '0.4rem 0.9rem', fontSize: '0.78rem', fontWeight: 600, color: blended ? '#fff' : color, cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit' }}
            >
              {blended ? '✓ In blend' : '+ Blend'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ── Blend Modal ───────────────────────────────────────────────────────────────

function BlendModal({ result, loading, onClose }) {
  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(10,15,30,0.6)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
    >
      <div style={{ background: '#fff', width: '100%', maxWidth: '720px', maxHeight: '80vh', borderRadius: '20px 20px 0 0', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 -8px 40px rgba(0,0,0,0.2)' }}>
        {/* Header */}
        <div style={{ padding: '1.2rem 1.5rem', borderBottom: '3px solid #4a6ab0', display: 'flex', alignItems: 'center', gap: '0.7rem', background: '#fafbff', flexShrink: 0 }}>
          <span style={{ fontSize: '1.4rem' }}>🔀</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, color: '#2a4a8a', fontSize: '1rem' }}>Blended Perspective</div>
            <div style={{ fontSize: '0.75rem', color: '#aaa', marginTop: '0.1rem' }}>A synthesis of all selected viewpoints</div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#bbb', cursor: 'pointer', fontSize: '1.4rem', lineHeight: 1, padding: '0.2rem' }}>×</button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.8rem' }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', height: '200px' }}>
              <div style={{ display: 'flex', gap: '6px' }}>
                {[0,1,2].map(i => (
                  <div key={i} style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#4a6ab0', animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />
                ))}
              </div>
              <div style={{ color: '#aaa', fontSize: '0.85rem' }}>Weaving perspectives together...</div>
            </div>
          ) : (
            <div style={{ fontSize: '0.92rem', lineHeight: 1.85, color: '#333' }}>
              {result?.split('\n\n').map((para, i) => (
                <p key={i} style={{ marginBottom: '1.2rem' }}>{para}</p>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function SectionLabel({ children }) {
  return (
    <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#aab0c8', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '1rem' }}>
      {children}
    </div>
  )
}

// ── Main App ──────────────────────────────────────────────────────────────────

export default function App() {
  const [idea, setIdea] = useState('')
  const [apiKey, setApiKey] = useState(import.meta.env.VITE_ANTHROPIC_API_KEY || '')
  const [showKeyInput, setShowKeyInput] = useState(!import.meta.env.VITE_ANTHROPIC_API_KEY)
  const [discovered, setDiscovered] = useState(null)
  const [selected, setSelected] = useState(new Set())
  const [responses, setResponses] = useState({})
  const [loading, setLoading] = useState({})
  const [discovering, setDiscovering] = useState(false)
  const [panelRan, setPanelRan] = useState(false)
  const [error, setError] = useState('')
  const [activeChat, setActiveChat] = useState(null)
  const [blendSet, setBlendSet] = useState(new Set())
  const [blendModal, setBlendModal] = useState(false)
  const [blendResult, setBlendResult] = useState(null)
  const [blendLoading, setBlendLoading] = useState(false)

  const allPersonas = [...PRESET_PERSONAS, PHILOSOPHER, ...(discovered || [])]

  function togglePersona(id) {
    if (panelRan) return
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function handleDiscover(e) {
    e.preventDefault()
    if (!idea.trim()) return
    if (!apiKey.trim()) { setError('Enter your Anthropic API key first.'); return }

    setError('')
    setResponses({})
    setDiscovered(null)
    setLoading({})
    setPanelRan(false)
    setSelected(prev => {
      const next = new Set()
      for (const id of prev) {
        if ([...PRESET_PERSONAS, PHILOSOPHER].find(p => p.id === id)) next.add(id)
      }
      return next
    })
    setDiscovering(true)

    try {
      const raw = await anthropicCall(apiKey, DISCOVER_PERSONAS_PROMPT, [{ role: 'user', content: idea.trim() }], 600)
      const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      const disc = JSON.parse(cleaned).personas.map((p, i) => ({
        ...p, id: `persona_${i}`, color: PERSONA_COLORS[i % PERSONA_COLORS.length],
      }))
      setDiscovered(disc)
      setSelected(prev => {
        const next = new Set(prev)
        next.add(PHILOSOPHER.id)
        disc.forEach(p => next.add(p.id))
        return next
      })
    } catch (err) {
      setError(`Failed to discover personas: ${err.message}`)
    } finally {
      setDiscovering(false)
    }
  }

  async function handleRunPanel() {
    if (selected.size === 0 || !idea.trim()) return
    const toRun = allPersonas.filter(p => selected.has(p.id))
    setResponses({})
    setPanelRan(true)

    toRun.forEach(p => {
      setLoading(prev => ({ ...prev, [p.id]: true }))
      anthropicCall(apiKey, PERSONA_PROMPT_TEMPLATE(p.name, p.role, p.angle), [{ role: 'user', content: idea.trim() }])
        .then(text => setResponses(prev => ({ ...prev, [p.id]: text })))
        .catch(err => setResponses(prev => ({ ...prev, [p.id]: `Error: ${err.message}` })))
        .finally(() => setLoading(prev => ({ ...prev, [p.id]: false })))
    })
  }

  function toggleBlend(id) {
    setBlendSet(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function handleBlend() {
    const toBlend = allPersonas.filter(p => blendSet.has(p.id) && responses[p.id])
    if (toBlend.length < 2) return
    setBlendResult(null)
    setBlendLoading(true)
    setBlendModal(true)

    const content = `Original idea: "${idea}"\n\n` + toBlend.map(p =>
      `--- ${p.name} ---\n${responses[p.id]}`
    ).join('\n\n')

    try {
      const result = await anthropicCall(apiKey, BLEND_PROMPT, [{ role: 'user', content }], 1200)
      setBlendResult(result)
    } catch (err) {
      setBlendResult(`Error: ${err.message}`)
    } finally {
      setBlendLoading(false)
    }
  }

  function handleReset() {
    setDiscovered(null)
    setResponses({})
    setSelected(new Set())
    setPanelRan(false)
    setBlendSet(new Set())
    setBlendResult(null)
  }

  const anyLoading = Object.values(loading).some(Boolean)
  const showContextSection = discovering || discovered !== null
  const displayDiscovered = showContextSection
    ? [PHILOSOPHER, ...(discovered || Array(4).fill(null))]
    : null
  const canRun = selected.size > 0 && idea.trim() && !anyLoading && !discovering

  return (
    <div>
      {/* Hero */}
      <div style={{
        height: '340px',
        borderRadius: '0 0 24px 24px',
        marginLeft: '-1.5rem',
        marginRight: '-1.5rem',
        marginBottom: '2.5rem',
        backgroundImage: 'url(/mountaintop.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center 40%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        paddingTop: '3.5rem',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(10,20,40,0.45) 0%, rgba(10,20,40,0.65) 100%)' }} />
        <div style={{ position: 'relative', textAlign: 'center', padding: '0 2rem' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: '1rem' }}>
            Broaden your perspective
          </div>
          <h1 style={{ fontSize: 'clamp(3rem, 7vw, 5rem)', fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1, color: '#fff', marginBottom: '1.2rem', textShadow: '0 2px 40px rgba(100,140,255,0.3)' }}>
            Elevation
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '1rem', maxWidth: '380px', margin: '0 auto', lineHeight: 1.65, fontWeight: 300 }}>
            Sometimes, all you need is a little Elevation to broaden your perspective.
          </p>
        </div>
      </div>

      {/* API Key */}
      {showKeyInput && (
        <div style={{ background: '#fff', border: '1px solid #e0e4f0', borderRadius: '12px', padding: '1rem 1.2rem', marginBottom: '2rem', display: 'flex', gap: '0.8rem', alignItems: 'center', flexWrap: 'wrap', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <span style={{ color: '#aaa', fontSize: '0.82rem', flexShrink: 0 }}>API key</span>
          <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="sk-ant-..." style={{ flex: 1, minWidth: '200px', background: '#f7f8fc', border: '1px solid #e0e4f0', borderRadius: '8px', padding: '0.45rem 0.8rem', color: '#1a1a2e', fontSize: '0.82rem', outline: 'none', fontFamily: 'inherit' }} />
          <button onClick={() => setShowKeyInput(false)} style={{ background: 'transparent', border: 'none', color: '#ccc', cursor: 'pointer', fontSize: '0.75rem' }}>Hide</button>
        </div>
      )}


      {/* Idea input */}
      <div style={{ marginBottom: '2.5rem' }}>
        <SectionLabel>Your idea or question</SectionLabel>
        <form onSubmit={handleDiscover}>
          <textarea
            value={idea}
            onChange={e => setIdea(e.target.value)}
            placeholder="What's on your mind? Describe your idea, decision, or problem..."
            rows={4}
            style={{ width: '100%', background: '#fff', border: '1.5px solid #e0e4f0', borderRadius: '12px', padding: '1rem 1.1rem', color: '#1a1a2e', fontSize: '0.95rem', resize: 'vertical', outline: 'none', marginBottom: '1rem', lineHeight: 1.65, fontFamily: 'inherit', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', transition: 'border-color 0.2s' }}
            onFocus={e => e.target.style.borderColor = '#7090d0'}
            onBlur={e => e.target.style.borderColor = '#e0e4f0'}
            onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleDiscover(e) }}
          />
          <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <button type="submit" disabled={discovering || anyLoading || !idea.trim()} style={{ background: 'transparent', color: discovering || anyLoading || !idea.trim() ? '#ccc' : '#4a6ab0', border: `1.5px solid ${discovering || anyLoading || !idea.trim() ? '#e8ecf4' : '#a0b8e8'}`, borderRadius: '8px', padding: '0.65rem 1.2rem', fontSize: '0.85rem', fontWeight: 500, cursor: discovering || anyLoading || !idea.trim() ? 'not-allowed' : 'pointer', transition: 'all 0.2s', fontFamily: 'inherit' }}>
              {discovering ? 'Discovering...' : '+ Discover context-specific lenses'}
            </button>
            <button type="button" onClick={handleRunPanel} disabled={!canRun} style={{ background: canRun ? 'linear-gradient(135deg, #2a4a8a, #4a6ab0)' : '#e8ecf4', color: canRun ? '#fff' : '#bbb', border: 'none', borderRadius: '8px', padding: '0.65rem 1.4rem', fontSize: '0.85rem', fontWeight: 600, cursor: canRun ? 'pointer' : 'not-allowed', transition: 'all 0.2s', boxShadow: canRun ? '0 4px 16px rgba(42,74,138,0.3)' : 'none', fontFamily: 'inherit' }}>
              {anyLoading ? 'Running...' : `Elevate${selected.size > 0 ? ` · ${selected.size} selected` : ''}`}
            </button>
          </div>
          {error && <p style={{ color: '#c94f4f', marginTop: '0.6rem', fontSize: '0.82rem' }}>{error}</p>}
        </form>
      </div>

      {/* Philosopher + context-specific */}
      {displayDiscovered && <div style={{ marginBottom: '2.5rem' }}>
        <SectionLabel>Philosophical & context-specific lenses</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '0.8rem' }}>
          {displayDiscovered.map((p, i) => (
            <PersonaCard key={p?.id || i} persona={p} response={p ? responses[p.id] : null} loading={p ? loading[p.id] : false} discovering={!p} selected={p ? selected.has(p.id) : false} onToggle={togglePersona} panelRan={panelRan} onDigDeeper={(persona, response) => setActiveChat({ persona, response })} blended={p ? blendSet.has(p.id) : false} onToggleBlend={toggleBlend} />
          ))}
        </div>
      </div>}

      {/* Political perspectives — only shown after discovery */}
      {showContextSection && <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ height: '1px', background: '#e8ecf4', marginBottom: '2.5rem' }} />
        <SectionLabel>Political perspectives</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '0.8rem' }}>
          {PRESET_PERSONAS.map(p => (
            <PersonaCard key={p.id} persona={p} response={responses[p.id]} loading={loading[p.id]} discovering={false} selected={selected.has(p.id)} onToggle={togglePersona} panelRan={panelRan} onDigDeeper={(persona, response) => setActiveChat({ persona, response })} blended={blendSet.has(p.id)} onToggleBlend={toggleBlend} />
          ))}
        </div>
      </div>}

      {/* Post-run controls */}
      {panelRan && !anyLoading && (
        <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #e8ecf4' }}>
          <button onClick={() => { setPanelRan(false); setResponses({}) }} style={{ background: '#fff', border: '1px solid #e0e4f0', color: '#888', borderRadius: '8px', padding: '0.45rem 1rem', cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'inherit' }}>Adjust selection</button>
          <button onClick={handleReset} style={{ background: 'transparent', border: 'none', color: '#bbb', cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'inherit' }}>Start over</button>
        </div>
      )}

      {/* Floating blend bar */}
      {blendSet.size > 0 && (
        <div style={{
          position: 'fixed', bottom: '2rem', left: '50%', transform: 'translateX(-50%)',
          background: 'linear-gradient(135deg, #2a4a8a, #4a6ab0)',
          borderRadius: '50px',
          padding: '0.8rem 1.4rem',
          display: 'flex', alignItems: 'center', gap: '1rem',
          boxShadow: '0 8px 32px rgba(42,74,138,0.4)',
          zIndex: 900,
          whiteSpace: 'nowrap',
        }}>
          <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.82rem' }}>
            {blendSet.size} perspective{blendSet.size > 1 ? 's' : ''} selected
          </span>
          <button
            onClick={handleBlend}
            disabled={blendSet.size < 2}
            style={{
              background: blendSet.size >= 2 ? '#fff' : 'rgba(255,255,255,0.2)',
              color: blendSet.size >= 2 ? '#2a4a8a' : 'rgba(255,255,255,0.4)',
              border: 'none', borderRadius: '50px',
              padding: '0.45rem 1.1rem',
              fontSize: '0.82rem', fontWeight: 700,
              cursor: blendSet.size >= 2 ? 'pointer' : 'not-allowed',
              fontFamily: 'inherit',
              transition: 'all 0.2s',
            }}
          >
            {blendSet.size < 2 ? 'Select 2+ to blend' : 'Blend →'}
          </button>
          <button
            onClick={() => setBlendSet(new Set())}
            style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '1rem', lineHeight: 1, fontFamily: 'inherit' }}
          >
            ×
          </button>
        </div>
      )}

      {/* Chat modal */}
      {activeChat && (
        <ChatModal
          persona={activeChat.persona}
          initialResponse={activeChat.response}
          originalIdea={idea}
          apiKey={apiKey}
          onClose={() => setActiveChat(null)}
        />
      )}

      {/* Blend modal */}
      {blendModal && (
        <BlendModal
          result={blendResult}
          loading={blendLoading}
          onClose={() => setBlendModal(false)}
        />
      )}

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.8; } }
        @keyframes bounce { 0%, 80%, 100% { transform: translateY(0); } 40% { transform: translateY(-4px); } }
      `}</style>
    </div>
  )
}
