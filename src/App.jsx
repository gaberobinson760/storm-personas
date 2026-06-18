import { useState } from 'react'

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
          position: 'absolute',
          top: '1rem',
          right: '1rem',
          width: '17px',
          height: '17px',
          borderRadius: '4px',
          border: `1.5px solid ${selected ? color : '#ccd0e0'}`,
          background: selected ? color : 'transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
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
        <span style={{
          fontWeight: 600,
          fontSize: '0.9rem',
          color: discovering ? '#bbb' : selected ? color : '#888',
          transition: 'color 0.2s',
        }}>
          {discovering ? 'Discovering...' : persona.name}
        </span>
      </div>

      {/* Accent bar */}
      {!discovering && (
        <div style={{
          height: '2px',
          borderRadius: '2px',
          background: selected ? color : '#e8ecf4',
          transition: 'background 0.3s',
          width: selected ? '40%' : '20%',
        }} />
      )}

      {/* Content */}
      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ display: 'flex', gap: '3px' }}>
            {[0,1,2].map(i => (
              <div key={i} style={{
                width: '5px', height: '5px', borderRadius: '50%',
                background: color,
                animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
              }} />
            ))}
          </div>
          <span style={{ color: '#aaa', fontSize: '0.8rem' }}>Thinking...</span>
        </div>
      )}

      {discovering && (
        <div style={{ color: '#bbb', fontSize: '0.8rem', fontStyle: 'italic' }}>Finding the right lens...</div>
      )}

      {!loading && !discovering && !response && persona && (
        <div style={{ color: '#aaa', fontSize: '0.82rem', lineHeight: 1.6, fontStyle: 'italic' }}>
          {persona.role}
        </div>
      )}

      {response && !loading && !discovering && (
        <div style={{ fontSize: '0.85rem', lineHeight: 1.75, color: '#444' }}>
          {formatResponse(response, color)}
        </div>
      )}
    </div>
  )
}

function formatResponse(text, color) {
  return text.split('\n').map((line, i) => {
    if (line.startsWith('**') && line.endsWith('**')) {
      return (
        <div key={i} style={{
          fontWeight: 700,
          color: color,
          marginTop: i > 0 ? '1rem' : 0,
          marginBottom: '0.4rem',
          fontSize: '0.72rem',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
        }}>
          {line.replace(/\*\*/g, '')}
        </div>
      )
    }
    if (line.startsWith('- ')) {
      return (
        <div key={i} style={{ paddingLeft: '1rem', color: '#666', marginBottom: '0.2rem' }}>
          · {line.slice(2)}
        </div>
      )
    }
    return line ? <div key={i} style={{ color: '#555' }}>{line}</div> : <div key={i} style={{ height: '0.3rem' }} />
  })
}

function SectionLabel({ children }) {
  return (
    <div style={{
      fontSize: '0.68rem',
      fontWeight: 700,
      color: '#aab0c8',
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
      marginBottom: '1rem',
    }}>
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
  const displayDiscovered = [PHILOSOPHER, ...(discovered || (discovering ? Array(4).fill(null) : []))]
  const canRun = selected.size > 0 && idea.trim() && !anyLoading && !discovering

  return (
    <div>
      {/* Hero header */}
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
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        justifyContent: 'flex-start',
        paddingTop: '3.5rem',
      }}>
        {/* Dark overlay for text legibility */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to bottom, rgba(10,20,40,0.45) 0%, rgba(10,20,40,0.65) 100%)',
        }} />

        <div style={{ position: 'relative', textAlign: 'center', padding: '0 2rem' }}>
          <div style={{
            fontSize: '0.7rem',
            fontWeight: 600,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.4)',
            marginBottom: '1rem',
          }}>
            Broaden your perspective
          </div>
          <h1 style={{
            fontSize: 'clamp(3rem, 7vw, 5rem)',
            fontWeight: 700,
            letterSpacing: '-0.03em',
            lineHeight: 1,
            color: '#fff',
            marginBottom: '1.2rem',
            textShadow: '0 2px 40px rgba(100,140,255,0.3)',
          }}>
            Elevation
          </h1>
          <p style={{
            color: 'rgba(255,255,255,0.5)',
            fontSize: '1rem',
            maxWidth: '380px',
            margin: '0 auto',
            lineHeight: 1.65,
            fontWeight: 300,
          }}>
            Sometimes, all you need is a little Elevation to broaden your perspective.
          </p>
        </div>
      </div>

      {/* API Key */}
      {showKeyInput && (
        <div style={{
          background: '#fff',
          border: '1px solid #e0e4f0',
          borderRadius: '12px',
          padding: '1rem 1.2rem',
          marginBottom: '2rem',
          display: 'flex',
          gap: '0.8rem',
          alignItems: 'center',
          flexWrap: 'wrap',
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        }}>
          <span style={{ color: '#aaa', fontSize: '0.82rem', flexShrink: 0 }}>API key</span>
          <input
            type="password"
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            placeholder="sk-ant-..."
            style={{
              flex: 1,
              minWidth: '200px',
              background: '#f7f8fc',
              border: '1px solid #e0e4f0',
              borderRadius: '8px',
              padding: '0.45rem 0.8rem',
              color: '#1a1a2e',
              fontSize: '0.82rem',
              outline: 'none',
              fontFamily: 'inherit',
            }}
          />
          <button onClick={() => setShowKeyInput(false)} style={{ background: 'transparent', border: 'none', color: '#ccc', cursor: 'pointer', fontSize: '0.75rem' }}>
            Hide
          </button>
        </div>
      )}

      {/* Political presets */}
      <div style={{ marginBottom: '2.5rem' }}>
        <SectionLabel>Political perspectives</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '0.8rem' }}>
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

      {/* Divider */}
      <div style={{ height: '1px', background: '#e8ecf4', marginBottom: '2.5rem' }} />

      {/* Idea input */}
      <div style={{ marginBottom: '2.5rem' }}>
        <SectionLabel>Your idea or question</SectionLabel>
        <form onSubmit={handleDiscover}>
          <textarea
            value={idea}
            onChange={e => setIdea(e.target.value)}
            placeholder="What's on your mind? Describe your idea, decision, or problem..."
            rows={4}
            style={{
              width: '100%',
              background: '#fff',
              border: '1.5px solid #e0e4f0',
              borderRadius: '12px',
              padding: '1rem 1.1rem',
              color: '#1a1a2e',
              fontSize: '0.95rem',
              resize: 'vertical',
              outline: 'none',
              marginBottom: '1rem',
              lineHeight: 1.65,
              fontFamily: 'inherit',
              boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
              transition: 'border-color 0.2s',
            }}
            onFocus={e => e.target.style.borderColor = '#7090d0'}
            onBlur={e => e.target.style.borderColor = '#e0e4f0'}
            onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleDiscover(e) }}
          />

          <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              type="submit"
              disabled={discovering || anyLoading || !idea.trim()}
              style={{
                background: 'transparent',
                color: discovering || anyLoading || !idea.trim() ? '#ccc' : '#4a6ab0',
                border: `1.5px solid ${discovering || anyLoading || !idea.trim() ? '#e8ecf4' : '#a0b8e8'}`,
                borderRadius: '8px',
                padding: '0.65rem 1.2rem',
                fontSize: '0.85rem',
                fontWeight: 500,
                cursor: discovering || anyLoading || !idea.trim() ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                fontFamily: 'inherit',
              }}
            >
              {discovering ? 'Discovering...' : '+ Discover context-specific lenses'}
            </button>

            <button
              type="button"
              onClick={handleRunPanel}
              disabled={!canRun}
              style={{
                background: canRun ? 'linear-gradient(135deg, #2a4a8a, #4a6ab0)' : '#e8ecf4',
                color: canRun ? '#fff' : '#bbb',
                border: 'none',
                borderRadius: '8px',
                padding: '0.65rem 1.4rem',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: canRun ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s',
                boxShadow: canRun ? '0 4px 16px rgba(42,74,138,0.3)' : 'none',
                fontFamily: 'inherit',
              }}
            >
              {anyLoading ? 'Running...' : `Elevate${selected.size > 0 ? ` · ${selected.size} selected` : ''}`}
            </button>

          </div>
          {error && <p style={{ color: '#c94f4f', marginTop: '0.6rem', fontSize: '0.82rem' }}>{error}</p>}
        </form>
      </div>

      {/* Philosopher + discovered */}
      <div style={{ marginBottom: '1.5rem' }}>
        <SectionLabel>Philosophical & context-specific lenses</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '0.8rem' }}>
          {displayDiscovered.map((p, i) => (
            <PersonaCard
              key={p?.id || i}
              persona={p}
              response={p ? responses[p.id] : null}
              loading={p ? loading[p.id] : false}
              discovering={!p}
              selected={p ? selected.has(p.id) : false}
              onToggle={togglePersona}
              panelRan={panelRan}
            />
          ))}
        </div>
      </div>

      {/* Post-run controls */}
      {panelRan && !anyLoading && (
        <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #e8ecf4' }}>
          <button
            onClick={() => { setPanelRan(false); setResponses({}) }}
            style={{ background: '#fff', border: '1px solid #e0e4f0', color: '#888', borderRadius: '8px', padding: '0.45rem 1rem', cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'inherit' }}
          >
            Adjust selection
          </button>
          <button
            onClick={handleReset}
            style={{ background: 'transparent', border: 'none', color: '#bbb', cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'inherit' }}
          >
            Start over
          </button>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.8; }
        }
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-4px); }
        }
      `}</style>
    </div>
  )
}
