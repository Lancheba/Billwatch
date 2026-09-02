import { useState, useRef, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { agentApi } from '../api'
import { HiOutlineSparkles, HiOutlinePaperAirplane, HiOutlineLightBulb } from 'react-icons/hi2'

interface Message {
  sender: 'user' | 'assistant'
  text: string
  suggestions?: string[]
  timestamp: string
}

export default function AIAssistantChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'assistant',
      text: "Hello, I am your Billwatch AI Financial Assistant. Ask me anything about your subscriptions, price increases, cashflow forecasts, or simulated cancellations.",
      suggestions: [
        'Which subscriptions can I cancel to save money?',
        'What is my total monthly spend by category?',
        'Show bills due in the next 7 days',
        'What if I cancel my streaming services?',
      ],
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ])
  const [input, setInput] = useState('')
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const chatMutation = useMutation({
    mutationFn: (msg: string) => agentApi.chat(msg),
    onSuccess: (data) => {
      setMessages(prev => [
        ...prev,
        {
          sender: 'assistant',
          text: data.reply,
          suggestions: data.suggestions,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ])
    },
    onError: () => {
      setMessages(prev => [
        ...prev,
        {
          sender: 'assistant',
          text: "Notice: Encountered an error connecting to the AI engine. Please make sure the backend is running.",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ])
    },
    meta: { errorMessage: 'Encountered an error connecting to the AI engine.' },
  })

  const handleSend = (textToSend?: string) => {
    const q = textToSend ?? input
    if (!q.trim()) return

    setMessages(prev => [
      ...prev,
      {
        sender: 'user',
        text: q,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ])
    if (!textToSend) setInput('')
    chatMutation.mutate(q)
  }

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', height: 'calc(100vh - 4.5rem)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <HiOutlineSparkles size={22} style={{ color: 'var(--text-white)' }} />
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, color: 'var(--text-white)', letterSpacing: '-0.02em' }}>
            AI Financial Assistant
          </h1>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: '0.25rem 0 0' }}>
          Conversational copilot powered by your real-time bills, health scores, and agent tools.
        </p>
      </div>

      {/* Chat messages container */}
      <div
        className="glass-card"
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
          background: 'rgba(var(--surface-rgb), 0.02)',
        }}
      >
        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              alignSelf: m.sender === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '80%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: m.sender === 'user' ? 'flex-end' : 'flex-start',
            }}
          >
            <div
              style={{
                background: m.sender === 'user' ? 'rgba(var(--surface-rgb), 0.15)' : 'rgba(var(--surface-rgb), 0.05)',
                color: 'var(--text-white)',
                padding: '0.875rem 1.125rem',
                borderRadius: 18,
                border: '1px solid rgba(var(--surface-rgb), 0.15)',
                boxShadow: 'inset 0 1px 1px rgba(var(--surface-rgb),0.2)',
                fontSize: '0.9rem',
                lineHeight: 1.5,
                whiteSpace: 'pre-wrap',
              }}
            >
              {m.text}
            </div>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4 }}>
              {m.timestamp}
            </span>

            {/* Suggested action chips */}
            {m.suggestions && m.suggestions.length > 0 && (
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                {m.suggestions.map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(s)}
                    className="glass-pill"
                    style={{
                      fontSize: '0.75rem',
                      padding: '0.35rem 0.75rem',
                      background: 'rgba(var(--surface-rgb), 0.04)',
                      borderColor: 'rgba(var(--surface-rgb), 0.12)',
                    }}
                  >
                    <HiOutlineLightBulb size={13} /> {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
        {chatMutation.isPending && (
          <div style={{ alignSelf: 'flex-start', color: 'var(--text-secondary)', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div className="spinner" style={{ width: 16, height: 16 }} />
            AI is analyzing your financial data...
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input bar */}
      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder="Ask a question (e.g. 'How much did my bills increase this month?')..."
          style={{
            flex: 1,
            padding: '0.875rem 1.125rem',
            borderRadius: 9999,
            border: '1px solid rgba(var(--surface-rgb), 0.15)',
            fontSize: '0.95rem',
            background: 'rgba(var(--surface-rgb), 0.04)',
            color: 'var(--text-white)',
          }}
        />
        <button
          className="glass-pill glass-pill-active"
          onClick={() => handleSend()}
          disabled={chatMutation.isPending}
          style={{ padding: '0 1.5rem', fontWeight: 700 }}
        >
          <HiOutlinePaperAirplane size={16} />
          <span>Send</span>
        </button>
      </div>
    </div>
  )
}
