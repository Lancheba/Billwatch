import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { billsApi } from '../api'
import { fmtCurrency } from '../utils'

export default function ScanIngest() {
  const queryClient = useQueryClient()
  const [rawText, setRawText] = useState('')
  const [scannedBill, setScannedBill] = useState<any | null>(null)
  const [emailCandidates, setEmailCandidates] = useState<any[]>([])

  const scanMutation = useMutation({
    mutationFn: (text: string) => billsApi.scanReceipt(text),
    onSuccess: (data) => {
      setScannedBill(data.extracted)
    },
  })

  const emailScanMutation = useMutation({
    mutationFn: () => billsApi.scanEmail(),
    onSuccess: (data) => {
      setEmailCandidates(data.candidates)
    },
  })

  const saveBillMutation = useMutation({
    mutationFn: (billData: any) => billsApi.create(billData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
      alert('Bill successfully saved to your catalog!')
      setScannedBill(null)
      setRawText('')
    },
  })

  const importEmailCandidate = (candidate: any) => {
    saveBillMutation.mutate({
      name: candidate.name,
      merchant: candidate.merchant,
      amount: candidate.amount,
      category: candidate.category,
      recurrence: candidate.recurrence,
      due_date: candidate.due_date,
      is_subscription: candidate.is_subscription,
      confidence_score: candidate.confidence_score,
      status: 'active',
    })
    setEmailCandidates(prev => prev.filter(c => c.name !== candidate.name))
  }

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0, color: '#1e1b4b' }}>
          📄 Smart Ingest & AI Scanner
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.875rem', margin: '0.25rem 0 0' }}>
          Scan receipts, invoice texts, and automatically sync recurring bills from email feeds.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>
        {/* Box 1: Receipt / Invoice OCR Scanner */}
        <div className="card">
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem', color: '#1e293b' }}>
            🧾 AI Receipt & Invoice Scanner
          </h2>
          <p style={{ fontSize: '0.8125rem', color: '#64748b', marginBottom: '1rem' }}>
            Paste raw receipt text, invoice dumps, or email confirmations:
          </p>

          <textarea
            rows={6}
            value={rawText}
            onChange={e => setRawText(e.target.value)}
            placeholder="e.g. Netflix Subscription Receipt&#10;Date: 2026-09-15&#10;Amount: $15.99&#10;Thank you for your payment to Netflix US."
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              fontSize: '0.875rem',
              fontFamily: 'inherit',
              marginBottom: '1rem',
            }}
          />

          <button
            className="btn btn-primary"
            onClick={() => scanMutation.mutate(rawText)}
            disabled={!rawText.trim() || scanMutation.isPending}
            style={{ background: '#4f46e5', width: '100%', justifyContent: 'center' }}
          >
            {scanMutation.isPending ? '⏳ Extracting Metadata...' : '🔍 Parse with AI'}
          </button>

          {/* Extracted Preview */}
          {scannedBill && (
            <div style={{ marginTop: '1.25rem', background: '#f8fafc', padding: '1rem', borderRadius: 8, border: '1px solid #cbd5e1' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Parsed Bill Preview</span>
                <span className="badge" style={{ background: '#dcfce7', color: '#15803d' }}>
                  {Math.round(scannedBill.confidence_score * 100)}% Confidence
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.8125rem', marginBottom: '1rem' }}>
                <div><strong>Name:</strong> {scannedBill.name}</div>
                <div><strong>Amount:</strong> {fmtCurrency(scannedBill.amount)}</div>
                <div><strong>Due Date:</strong> {scannedBill.due_date}</div>
                <div><strong>Category:</strong> {scannedBill.category}</div>
                <div><strong>Recurrence:</strong> {scannedBill.recurrence}</div>
                <div><strong>Subscription:</strong> {scannedBill.is_subscription ? 'Yes' : 'No'}</div>
              </div>
              <button
                className="btn btn-primary"
                style={{ background: '#16a34a', width: '100%', justifyContent: 'center' }}
                onClick={() => saveBillMutation.mutate(scannedBill)}
              >
                ✓ Save to My Bills
              </button>
            </div>
          )}
        </div>

        {/* Box 2: Smart Email Mailbox Sync */}
        <div className="card">
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem', color: '#1e293b' }}>
            📧 Smart Email Bill Ingestion
          </h2>
          <p style={{ fontSize: '0.8125rem', color: '#64748b', marginBottom: '1rem' }}>
            Sync and scan inbox statements for known recurring billing receipts (Adobe, ConEd, GitHub, AWS).
          </p>

          <button
            className="btn"
            onClick={() => emailScanMutation.mutate()}
            disabled={emailScanMutation.isPending}
            style={{ background: '#4338ca', color: 'white', width: '100%', justifyContent: 'center', padding: '0.75rem' }}
          >
            {emailScanMutation.isPending ? '⏳ Scanning Inboxes...' : '🔄 Scan Connected Mailbox'}
          </button>

          {emailCandidates.length > 0 && (
            <div style={{ marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#334155' }}>
                Found {emailCandidates.length} Recurring Invoices:
              </span>
              {emailCandidates.map((c, i) => (
                <div key={i} style={{ background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: 8, border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{c.name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      {c.category} · {fmtCurrency(c.amount)} · Due {c.due_date}
                    </div>
                  </div>
                  <button
                    className="btn btn-primary"
                    style={{ background: '#16a34a', fontSize: '0.75rem' }}
                    onClick={() => importEmailCandidate(c)}
                  >
                    + Import
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
