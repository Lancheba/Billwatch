import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { billsApi } from '../api'
import { fmtCurrency } from '../utils'
import { HiOutlineDocumentMagnifyingGlass, HiOutlineInboxArrowDown, HiOutlineCheck } from 'react-icons/hi2'

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
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <HiOutlineDocumentMagnifyingGlass size={24} style={{ color: '#ffffff' }} />
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, color: '#ffffff', letterSpacing: '-0.02em' }}>
            Smart Ingest & AI Scanner
          </h1>
        </div>
        <p style={{ color: '#94a3b8', fontSize: '0.875rem', margin: '0.25rem 0 0' }}>
          Scan receipts, invoice texts, and automatically sync recurring bills from email feeds.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>
        {/* Box 1: Receipt / Invoice OCR Scanner */}
        <div className="glass-card">
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem', color: '#ffffff' }}>
            AI Receipt & Invoice Scanner
          </h2>
          <p style={{ fontSize: '0.8125rem', color: '#94a3b8', marginBottom: '1rem' }}>
            Paste raw receipt text, invoice dumps, or email confirmations:
          </p>

          <textarea
            rows={6}
            value={rawText}
            onChange={e => setRawText(e.target.value)}
            placeholder="e.g. Netflix Subscription Receipt&#10;Date: 2026-09-15&#10;Amount: $15.99&#10;Thank you for your payment to Netflix US."
            style={{
              width: '100%',
              marginBottom: '1rem',
              fontFamily: 'inherit',
            }}
          />

          <button
            className="glass-pill glass-pill-active"
            onClick={() => scanMutation.mutate(rawText)}
            disabled={!rawText.trim() || scanMutation.isPending}
            style={{ width: '100%', justifyContent: 'center', padding: '0.75rem' }}
          >
            <HiOutlineDocumentMagnifyingGlass size={16} />
            <span>{scanMutation.isPending ? 'Extracting Metadata...' : 'Parse with AI'}</span>
          </button>

          {/* Extracted Preview */}
          {scannedBill && (
            <div className="glass-card" style={{ marginTop: '1.25rem', padding: '1rem', background: 'rgba(255,255,255,0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#ffffff' }}>Parsed Bill Preview</span>
                <span className="glass-pill" style={{ fontSize: '0.7rem' }}>
                  {Math.round(scannedBill.confidence_score * 100)}% Confidence
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.8125rem', marginBottom: '1rem', color: '#cbd5e1' }}>
                <div><strong>Name:</strong> {scannedBill.name}</div>
                <div><strong>Amount:</strong> {fmtCurrency(scannedBill.amount)}</div>
                <div><strong>Due Date:</strong> {scannedBill.due_date}</div>
                <div><strong>Category:</strong> {scannedBill.category}</div>
                <div><strong>Recurrence:</strong> {scannedBill.recurrence}</div>
                <div><strong>Subscription:</strong> {scannedBill.is_subscription ? 'Yes' : 'No'}</div>
              </div>
              <button
                className="glass-pill glass-pill-active"
                style={{ width: '100%', justifyContent: 'center', padding: '0.65rem' }}
                onClick={() => saveBillMutation.mutate(scannedBill)}
              >
                <HiOutlineCheck size={16} /> Save to My Bills
              </button>
            </div>
          )}
        </div>

        {/* Box 2: Smart Email Mailbox Sync */}
        <div className="glass-card">
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem', color: '#ffffff' }}>
            Smart Email Bill Ingestion
          </h2>
          <p style={{ fontSize: '0.8125rem', color: '#94a3b8', marginBottom: '1rem' }}>
            Sync and scan inbox statements for known recurring billing receipts (Adobe, ConEd, GitHub, AWS).
          </p>

          <button
            className="glass-pill glass-pill-active"
            onClick={() => emailScanMutation.mutate()}
            disabled={emailScanMutation.isPending}
            style={{ width: '100%', justifyContent: 'center', padding: '0.75rem' }}
          >
            <HiOutlineInboxArrowDown size={16} />
            <span>{emailScanMutation.isPending ? 'Scanning Inboxes...' : 'Scan Connected Mailbox'}</span>
          </button>

          {emailCandidates.length > 0 && (
            <div style={{ marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#ffffff' }}>
                Found {emailCandidates.length} Recurring Invoices:
              </span>
              {emailCandidates.map((c, i) => (
                <div key={i} className="glass-card" style={{ padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#ffffff' }}>{c.name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                      {c.category} · {fmtCurrency(c.amount)} · Due {c.due_date}
                    </div>
                  </div>
                  <button
                    className="glass-pill"
                    style={{ fontSize: '0.75rem' }}
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
