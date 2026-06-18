import { useState } from 'react'

const PERSONA_COLORS = ['#4f8ef7', '#e05c5c', '#4ec97a', '#c97ae0', '#f7a84f', '#4fc9c9']

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

const DISCOVER_PERSONAS_PROMPT = `You are a thinking partner. Given an idea or problem, your job is to identify the 4 most useful expert perspectives to pressure-test it.

These should NOT be generic archetypes (avoid: "devil's advocate", "pragmatist", "visionary"). Instead, identify the specific expert lenses that matter most for THIS particular idea.

For example, for a new healthcare app idea you might pick: a frontline clinician, a health policy expert, a patient who's navigated the system, and a startup operator who's tried this before.

Return ONLY valid JSON — no markdown, no explanation — in this exact format:
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

function PersonaCard({ persona, response, loading, discovering }) {
  const color = persona?.color || '#555'

  return (
    <div style={{
      background: '#1a1a1a',
      border: `1px solid ${loading || response ? color + '44' : '#2a2a2a'}`,
      borderRadius: '12px',
      padding: '1.5rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem',
      transition: 'border-color 0.3s',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
        {discovering ? (
          <div style={{ width: '1.4rem', height: '1.4rem', borderRadius: '50%', background: '#2a2a2a', animation: 'pulse 1.5s infinite' }} />
        ) : (
          <span style={{ fontSize: '1.4rem' }}>{persona.icon}</span>
        )}
        <span style={{ fontWeight: 600, color, fontSize: '1rem' }}>
          {discovering ? <span style={{ color: '#444' }}>Discovering...</span> : persona.name}
        </span>
      </div>

      {(loading || discovering) && (
        <div style={{ color: '#555', fontSize: '0.85rem', fontStyle: 'italic' }}>
          {discovering ? 'Identifying the right lens...' : 'Thinking...'}
        </div>
      )}

      {response && !loading && !discovering && (
        <div style={{ fontSize: '0.88rem', lineHeight: 1.7, color: '#ccc', whiteSpace: 'pre-wrap' }}>
          {formatResponse(response)}
        </div>
      )}

      {!loading && !discovering && !response && persona && (
        <div style={{ color: '#333', fontSize: '0.85rem', fontStyle: 'italic' }}>
          {persona.role}
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

export default function App() {
  const [idea, setIdea] = useState('')
  const [apiKey, setApiKey] = useState(import.meta.env.VITE_ANTHROPIC_API_KEY || '')
  const [showKeyInput, setShowKeyInput] = useState(!import.meta.env.VITE_ANTHROPIC_API_KEY)
  const [personas, setPersonas] = useState(null)
  const [responses, setResponses] = useState({})
  const [loading, setLoading] = useState({})
  const [discovering, setDiscovering] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!idea.trim()) return
    if (!apiKey.trim()) { setError('Enter your Anthropic API key first.'); return }

    setError('')
    setResponses({})
    setPersonas(null)
    setLoading({})
    setDiscovering(true)

    let discovered
    try {
      const raw = await anthropicCall(apiKey, DISCOVER_PERSONAS_PROMPT, idea.trim(), 600)
      // Strip markdown fences if present
      const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      discovered = JSON.parse(cleaned).personas.map((p, i) => ({
        ...p,
        id: `persona_${i}`,
        color: PERSONA_COLORS[i % PERSONA_COLORS.length],
      }))
    } catch (err) {
      setError(`Failed to discover personas: ${err.message}`)
      setDiscovering(false)
      return
    }

    setDiscovering(false)
    setPersonas(discovered)

    // Fan out to all personas in parallel
    discovered.forEach(p => {
      setLoading(prev => ({ ...prev, [p.id]: true }))
      anthropicCall(
        apiKey,
        PERSONA_PROMPT_TEMPLATE(p.name, p.role, p.angle),
        idea.trim()
      )
        .then(text => setResponses(prev => ({ ...prev, [p.id]: text })))
        .catch(err => setResponses(prev => ({ ...prev, [p.id]: `Error: ${err.message}` })))
        .finally(() => setLoading(prev => ({ ...prev, [p.id]: false })))
    })
  }

  const anyActive = discovering || Object.values(loading).some(Boolean)

  // Show placeholder cards while discovering
  const displayPersonas = personas || (discovering ? Array(4).fill(null) : null)

  return (
    <div>
      <div style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: '0.4rem' }}>STORM Personas</h1>
        <p style={{ color: '#666', fontSize: '0.95rem' }}>
          Drop in an idea. The right expert lenses are identified for your specific context, then each gives you their honest read.
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

      <form onSubmit={handleSubmit} style={{ marginBottom: '2rem' }}>
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
          onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit(e) }}
        />
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button
            type="submit"
            disabled={anyActive || !idea.trim()}
            style={{
              background: '#4f8ef7',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              padding: '0.7rem 1.6rem',
              fontSize: '0.95rem',
              fontWeight: 600,
              cursor: anyActive || !idea.trim() ? 'not-allowed' : 'pointer',
              opacity: anyActive || !idea.trim() ? 0.5 : 1,
              transition: 'opacity 0.2s',
            }}
          >
            {discovering ? 'Finding the right lenses...' : anyActive ? 'Analyzing...' : 'Run the panel'}
          </button>
          {!showKeyInput && (
            <button type="button" onClick={() => setShowKeyInput(true)} style={{ background: 'transparent', border: 'none', color: '#444', cursor: 'pointer', fontSize: '0.8rem' }}>
              API key
            </button>
          )}
          <span style={{ fontSize: '0.75rem', color: '#444' }}>⌘↵ to submit</span>
        </div>
        {error && <p style={{ color: '#e05c5c', marginTop: '0.6rem', fontSize: '0.85rem' }}>{error}</p>}
      </form>

      {displayPersonas && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.2rem' }}>
          {displayPersonas.map((p, i) => (
            <PersonaCard
              key={p?.id || i}
              persona={p}
              response={p ? responses[p.id] : null}
              loading={p ? loading[p.id] : false}
              discovering={discovering || !p}
            />
          ))}
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
