import { useState, useRef, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { agentApi } from '../api'

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
      text: "👋 Hi! I'm your Billwatch AI Financial Assistant. Ask me anything about your subscriptions, price increases, cashflow forecasts, or simulated cancellations.",
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
          text: "⚠️ Sorry, I encountered an error connecting to the AI engine. Please make sure the backend is running.",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ])
    },
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
    <div style={{ maxWidth: 900, margin: '0 auto', height: 'calc(100vh - 8rem)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ marginBottom: '1rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0, color: '#1e1b4b' }}>
          💬 AI Financial Assistant
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.875rem', margin: '0.25rem 0 0' }}>
          Conversational copilot powered by your real-time bills, health scores, and agent tools.
        </p>
      </div>

      {/* Chat messages container */}
      <div
        className="card"
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          background: '#f8fafc',
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
                background: m.sender === 'user' ? '#4f46e5' : '#ffffff',
                color: m.sender === 'user' ? 'white' : '#1e293b',
                padding: '0.875rem 1.125rem',
                borderRadius: 12,
                border: m.sender === 'user' ? 'none' : '1px solid #e2e8f0',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                fontSize: '0.9rem',
                lineHeight: 1.5,
                whiteSpace: 'pre-wrap',
              }}
            >
              {m.text}
            </div>
            <span style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: 4 }}>
              {m.timestamp}
            </span>

            {/* Suggested action chips */}
            {m.suggestions && m.suggestions.length > 0 && (
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                {m.suggestions.map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(s)}
                    className="btn"
                    style={{
                      background: '#e0e7ff',
                      color: '#3730a3',
                      fontSize: '0.75rem',
                      padding: '0.3rem 0.6rem',
                      borderRadius: 14,
                    }}
                  >
                    💡 {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
        {chatMutation.isPending && (
          <div style={{ alignSelf: 'flex-start', color: '#64748b', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
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
            borderRadius: 8,
            border: '1px solid #cbd5e1',
            fontSize: '0.95rem',
          }}
        />
        <button
          className="btn btn-primary"
          onClick={() => handleSend()}
          disabled={chatMutation.isPending}
          style={{ background: '#4f46e5', padding: '0 1.5rem', fontWeight: 600 }}
        >
          Send
        </button>
      </div>
    </div>
  )
}
