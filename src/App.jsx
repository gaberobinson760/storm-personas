import { useState } from 'react'

const PERSONA_COLORS = ['#4f8ef7', '#e05c5c', '#4ec97a', '#c97ae0', '#f7a84f', '#4fc9c9']

const PRESET_PERSONAS = [
  {
    id: 'preset_philosopher',
    name: 'The Philosopher',
    icon: '🏛️',
    color: '#a0897a',
    role: 'A philosopher who examines the underlying assumptions, ethics, and first principles behind any idea.',
    angle: 'What are the foundational assumptions here? What does this idea say about our values? What would a first-principles thinker challenge?',
  },
  {
    id: 'preset_progressive',
    name: 'The Progressive',
    icon: '🌿',
    color: '#4ec97a',
    role: 'A progressive thinker focused on equity, systemic change, collective wellbeing, and challenging existing power structures.',
    angle: 'Who benefits and who is left out? What systemic barriers does this ignore? How does this address or perpetuate inequality?',
  },
  {
    id: 'preset_moderate',
    name: 'The Moderate',
    icon: '⚖️',
    color: '#c9b84f',
    role: 'A centrist focused on pragmatic compromise, weighing tradeoffs, and finding common ground across divides.',
    angle: 'What are the legitimate concerns on both sides? Where is the pragmatic middle ground? What would actually get broad buy-in?',
  },
  {
    id: 'preset_conservative',
    name: 'The Conservative',
    icon: '🏔️',
    color: '#c97a4f',
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

async function anthropicCall(apiKey, system, userMessage, maxTokens = 800) {
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
      messages: [{ role: 'user', content: userMessage }],
    }),
  })
  const data = await res.json()
  if (data.error) throw new Error(data.error.message)
  return data.content[0].text
}

function PersonaCard({ persona, response, loading, discovering, selected, onToggle, panelRan }) {
  const color = persona?.color || '#555'
  const dimmed = panelRan && !selected

  return (
    <div
      onClick={() => !panelRan && onToggle && persona && onToggle(persona.id)}
      style={{
        background: '#1a1a1a',
        border: `1px solid ${selected ? color + '88' : '#2a2a2a'}`,
        borderRadius: '12px',
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        transition: 'border-color 0.2s, opacity 0.2s',
        opacity: dimmed ? 0.35 : 1,
        cursor: !panelRan && onToggle && persona ? 'pointer' : 'default',
        position: 'relative',
      }}
    >
      {!panelRan && persona && onToggle && (
        <div style={{
          position: 'absolute',
          top: '1rem',
          right: '1rem',
          width: '18px',
          height: '18px',
          borderRadius: '4px',
          border: `2px solid ${selected ? color : '#444'}`,
          background: selected ? color : 'transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.15s',
          flexShrink: 0,
        }}>
          {selected && <span style={{ color: '#fff', fontSize: '11px', fontWeight: 700 }}>✓</span>}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', paddingRight: '1.8rem' }}>
        {discovering ? (
          <div style={{ width: '1.4rem', height: '1.4rem', borderRadius: '50%', background: '#2a2a2a', animation: 'pulse 1.5s infinite' }} />
        ) : (
          <span style={{ fontSize: '1.4rem' }}>{persona.icon}</span>
        )}
        <span style={{ fontWeight: 600, color: selected ? color : '#666', fontSize: '1rem', transition: 'color 0.2s' }}>
          {discovering ? <span style={{ color: '#444' }}>Discovering...</span> : persona.name}
        </span>
      </div>

      {(loading || discovering) && (
        <div style={{ color: '#555', fontSize: '0.85rem', fontStyle: 'italic' }}>
          {discovering ? 'Identifying the right lens...' : 'Thinking...'}
        </div>
      )}

      {!loading && !discovering && !response && persona && (
        <div style={{ color: '#555', fontSize: '0.85rem', fontStyle: 'italic' }}>
          {persona.role}
        </div>
      )}

      {response && !loading && !discovering && (
        <div style={{ fontSize: '0.88rem', lineHeight: 1.7, color: '#ccc' }}>
          {formatResponse(response)}
        </div>
      )}
    </div>
  )
}

function formatResponse(text) {
  return text.split('\n').map((line, i) => {
    if (line.startsWith('**') && line.endsWith('**')) {
      return (
        <div key={i} style={{ fontWeight: 700, color: '#e8e8e8', marginTop: i > 0 ? '1rem' : 0, marginBottom: '0.3rem' }}>
          {line.replace(/\*\*/g, '')}
        </div>
      )
    }
    if (line.startsWith('- ')) {
      return <div key={i} style={{ paddingLeft: '1rem', color: '#aaa' }}>• {line.slice(2)}</div>
    }
    return <div key={i}>{line}</div>
  })
}

function SectionLabel({ children }) {
  return (
    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#444', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
      {children}
    </div>
  )
}

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

  const allPersonas = [...PRESET_PERSONAS, ...(discovered || [])]

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
        if (PRESET_PERSONAS.find(p => p.id === id)) next.add(id)
      }
      return next
    })
    setDiscovering(true)

    try {
      const raw = await anthropicCall(apiKey, DISCOVER_PERSONAS_PROMPT, idea.trim(), 600)
      const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      const disc = JSON.parse(cleaned).personas.map((p, i) => ({
        ...p,
        id: `persona_${i}`,
        color: PERSONA_COLORS[i % PERSONA_COLORS.length],
      }))
      setDiscovered(disc)
      setSelected(prev => {
        const next = new Set(prev)
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
    if (selected.size === 0) return
    const toRun = allPersonas.filter(p => selected.has(p.id))
    setResponses({})
    setPanelRan(true)

    toRun.forEach(p => {
      setLoading(prev => ({ ...prev, [p.id]: true }))
      anthropicCall(apiKey, PERSONA_PROMPT_TEMPLATE(p.name, p.role, p.angle), idea.trim())
        .then(text => setResponses(prev => ({ ...prev, [p.id]: text })))
        .catch(err => setResponses(prev => ({ ...prev, [p.id]: `Error: ${err.message}` })))
        .finally(() => setLoading(prev => ({ ...prev, [p.id]: false })))
    })
  }

  function handleReset() {
    setDiscovered(null)
    setResponses({})
    setSelected(new Set())
    setPanelRan(false)
  }

  const anyLoading = Object.values(loading).some(Boolean)
  const displayDiscovered = discovered || (discovering ? Array(4).fill(null) : null)

  return (
    <div>
      <div style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: '0.4rem' }}>STORM Personas</h1>
        <p style={{ color: '#666', fontSize: '0.95rem' }}>
          Pick your lenses, drop in an idea, get honest reads from each perspective.
        </p>
      </div>

      {showKeyInput && (
        <div style={{
          background: '#1a1a1a',
          border: '1px solid #2a2a2a',
          borderRadius: '10px',
          padding: '1.2rem',
          marginBottom: '1.5rem',
          display: 'flex',
          gap: '0.8rem',
          alignItems: 'center',
          flexWrap: 'wrap',
        }}>
          <span style={{ color: '#888', fontSize: '0.85rem', flexShrink: 0 }}>Anthropic API key:</span>
          <input
            type="password"
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            placeholder="sk-ant-..."
            style={{
              flex: 1,
              minWidth: '200px',
              background: '#111',
              border: '1px solid #333',
              borderRadius: '6px',
              padding: '0.5rem 0.8rem',
              color: '#e8e8e8',
              fontSize: '0.85rem',
              outline: 'none',
            }}
          />
          <button onClick={() => setShowKeyInput(false)} style={{ background: 'transparent', border: 'none', color: '#555', cursor: 'pointer', fontSize: '0.8rem' }}>
            Hide
          </button>
        </div>
      )}

      {/* Preset personas — always visible */}
      <div style={{ marginBottom: '2rem' }}>
        <SectionLabel>Preset personas — click to select</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
          {PRESET_PERSONAS.map(p => (
            <PersonaCard
              key={p.id}
              persona={p}
              response={responses[p.id]}
              loading={loading[p.id]}
              discovering={false}
              selected={selected.has(p.id)}
              onToggle={togglePersona}
              panelRan={panelRan}
            />
          ))}
        </div>
      </div>

      {/* Idea input */}
      <form onSubmit={handleDiscover} style={{ marginBottom: '1.5rem' }}>
        <textarea
          value={idea}
          onChange={e => setIdea(e.target.value)}
          placeholder="Describe your idea, decision, or problem..."
          rows={4}
          style={{
            width: '100%',
            background: '#1a1a1a',
            border: '1px solid #2a2a2a',
            borderRadius: '10px',
            padding: '1rem',
            color: '#e8e8e8',
            fontSize: '0.95rem',
            resize: 'vertical',
            outline: 'none',
            marginBottom: '1rem',
            lineHeight: 1.6,
          }}
          onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleDiscover(e) }}
        />
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="submit"
            disabled={discovering || anyLoading || !idea.trim()}
            style={{
              background: '#4f8ef7',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              padding: '0.7rem 1.4rem',
              fontSize: '0.9rem',
              fontWeight: 600,
              cursor: discovering || anyLoading || !idea.trim() ? 'not-allowed' : 'pointer',
              opacity: discovering || anyLoading || !idea.trim() ? 0.5 : 1,
              transition: 'opacity 0.2s',
            }}
          >
            {discovering ? 'Finding lenses...' : '+ Discover context-specific personas'}
          </button>

          <button
            type="button"
            onClick={handleRunPanel}
            disabled={selected.size === 0 || anyLoading || discovering || !idea.trim()}
            style={{
              background: selected.size === 0 || !idea.trim() ? '#1a1a1a' : '#4ec97a',
              color: selected.size === 0 || !idea.trim() ? '#444' : '#000',
              border: selected.size === 0 || !idea.trim() ? '1px solid #2a2a2a' : 'none',
              borderRadius: '8px',
              padding: '0.7rem 1.4rem',
              fontSize: '0.9rem',
              fontWeight: 600,
              cursor: selected.size === 0 || anyLoading || discovering || !idea.trim() ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
            }}
          >
            Run {selected.size > 0 ? `${selected.size} ` : ''}selected
          </button>

          {!showKeyInput && (
            <button type="button" onClick={() => setShowKeyInput(true)} style={{ background: 'transparent', border: 'none', color: '#444', cursor: 'pointer', fontSize: '0.8rem' }}>
              API key
            </button>
          )}
        </div>
        {error && <p style={{ color: '#e05c5c', marginTop: '0.6rem', fontSize: '0.85rem' }}>{error}</p>}
      </form>

      {/* Context-specific discovered personas */}
      {displayDiscovered && (
        <div style={{ marginBottom: '1.5rem' }}>
          <SectionLabel>Context-specific personas</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
            {displayDiscovered.map((p, i) => (
              <PersonaCard
                key={p?.id || i}
                persona={p}
                response={p ? responses[p.id] : null}
                loading={p ? loading[p.id] : false}
                discovering={discovering || !p}
                selected={p ? selected.has(p.id) : false}
                onToggle={togglePersona}
                panelRan={panelRan}
              />
            ))}
          </div>
        </div>
      )}

      {/* Post-run controls */}
      {panelRan && !anyLoading && (
        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
          <button
            onClick={() => { setPanelRan(false); setResponses({}) }}
            style={{ background: 'transparent', border: '1px solid #2a2a2a', color: '#666', borderRadius: '6px', padding: '0.4rem 1rem', cursor: 'pointer', fontSize: '0.8rem' }}
          >
            Adjust selection
          </button>
          <button
            onClick={handleReset}
            style={{ background: 'transparent', border: 'none', color: '#444', cursor: 'pointer', fontSize: '0.8rem' }}
          >
            Start over
          </button>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.7; }
        }
      `}</style>
    </div>
  )
}
