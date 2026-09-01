import { useState, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { billsApi, type Bill } from '../api'

type FormData = {
  name: string
  category: Bill['category']
  amount: string
  previous_amount: string
  due_date: string
  recurrence: Bill['recurrence']
  is_subscription: boolean
  last_used_date: string
  notes: string
}

const EMPTY: FormData = {
  name: '',
  category: 'other',
  amount: '',
  previous_amount: '',
  due_date: '',
  recurrence: 'monthly',
  is_subscription: false,
  last_used_date: '',
  notes: '',
}

export default function AddBill() {
  const qc = useQueryClient()
  const [form, setForm] = useState<FormData>(EMPTY)
  const [success, setSuccess] = useState<string | null>(null)
  const [csvStatus, setCsvStatus] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const set = (field: keyof FormData, value: string | boolean) =>
    setForm(f => ({ ...f, [field]: value }))

  const createMut = useMutation({
    mutationFn: (data: Partial<Bill>) => billsApi.create(data),
    onSuccess: (bill) => {
      qc.invalidateQueries({ queryKey: ['bills'] })
      setSuccess(`"${bill.name}" added successfully!`)
      setForm(EMPTY)
      setTimeout(() => setSuccess(null), 4000)
    },
  })

  const csvMut = useMutation({
    mutationFn: (file: File) => billsApi.importCsv(file),
    onSuccess: (resp) => {
      qc.invalidateQueries({ queryKey: ['bills'] })
      const d = resp.data as { created: number; errors: unknown[] }
      setCsvStatus(`Imported ${d.created} bill(s).${d.errors.length ? ` ${d.errors.length} row(s) failed.` : ''}`)
      if (fileRef.current) fileRef.current.value = ''
      setTimeout(() => setCsvStatus(null), 6000)
    },
    onError: () => setCsvStatus('Import failed — check your CSV format.'),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const payload: Partial<Bill> = {
      name: form.name,
      category: form.category,
      amount: form.amount as unknown as string,
      due_date: form.due_date,
      recurrence: form.recurrence,
      is_subscription: form.is_subscription,
      notes: form.notes,
      ...(form.previous_amount ? { previous_amount: form.previous_amount } : {}),
      ...(form.last_used_date ? { last_used_date: form.last_used_date } : {}),
    }
    createMut.mutate(payload)
  }

  return (
    <div>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.25rem' }}>Add Bill</h1>
      <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
        Add a bill or subscription manually, or import from a CSV file.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1.5rem', alignItems: 'start' }}>

        {/* Manual form */}
        <div className="card">
          <h2 style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '1.25rem' }}>Manual Entry</h2>
          {success && (
            <div style={{
              padding: '0.75rem 1rem', borderRadius: '0.5rem',
              background: '#f0fdf4', border: '1px solid #bbf7d0',
              color: '#15803d', marginBottom: '1rem', fontSize: '0.875rem',
            }}>
              ✅ {success}
            </div>
          )}
          {createMut.isError && (
            <div style={{
              padding: '0.75rem 1rem', borderRadius: '0.5rem',
              background: '#fef2f2', border: '1px solid #fecaca',
              color: '#b91c1c', marginBottom: '1rem', fontSize: '0.875rem',
            }}>
              ⚠️ {(createMut.error as Error)?.message ?? 'Failed to create bill.'}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label>Bill / Subscription Name *</label>
                <input
                  required value={form.name}
                  onChange={e => set('name', e.target.value)}
                  placeholder="e.g. Netflix, Electric Bill"
                />
              </div>

              <div className="form-group">
                <label>Category *</label>
                <select value={form.category} onChange={e => set('category', e.target.value as Bill['category'])}>
                  <option value="utility">⚡ Utility</option>
                  <option value="subscription">📺 Subscription</option>
                  <option value="loan">🏦 Loan</option>
                  <option value="other">📋 Other</option>
                </select>
              </div>

              <div className="form-group">
                <label>Recurrence *</label>
                <select value={form.recurrence} onChange={e => set('recurrence', e.target.value as Bill['recurrence'])}>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                  <option value="weekly">Weekly</option>
                  <option value="one_time">One-time</option>
                </select>
              </div>

              <div className="form-group">
                <label>Current Amount ($) *</label>
                <input
                  required type="number" step="0.01" min="0"
                  value={form.amount}
                  onChange={e => set('amount', e.target.value)}
                  placeholder="0.00"
                />
              </div>

              <div className="form-group">
                <label>Previous Amount ($) <span style={{ color: '#94a3b8' }}>(for hike detection)</span></label>
                <input
                  type="number" step="0.01" min="0"
                  value={form.previous_amount}
                  onChange={e => set('previous_amount', e.target.value)}
                  placeholder="0.00"
                />
              </div>

              <div className="form-group">
                <label>Due Date *</label>
                <input
                  required type="date" value={form.due_date}
                  onChange={e => set('due_date', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Last Used Date <span style={{ color: '#94a3b8' }}>(subscriptions)</span></label>
                <input
                  type="date" value={form.last_used_date}
                  onChange={e => set('last_used_date', e.target.value)}
                />
              </div>

              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label>Notes</label>
                <textarea
                  rows={2} value={form.notes}
                  onChange={e => set('notes', e.target.value)}
                  placeholder="Optional notes about this bill…"
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', gridColumn: '1 / -1' }}>
                <input
                  type="checkbox" id="is_sub" checked={form.is_subscription}
                  onChange={e => set('is_subscription', e.target.checked)}
                  style={{ width: 'auto' }}
                />
                <label htmlFor="is_sub" style={{ margin: 0, cursor: 'pointer' }}>
                  This is a cancellable subscription
                </label>
              </div>
            </div>

            <button
              type="submit" className="btn btn-primary"
              disabled={createMut.isPending}
              style={{ alignSelf: 'flex-start' }}
            >
              {createMut.isPending ? '⏳ Saving…' : '+ Add Bill'}
            </button>
          </form>
        </div>

        {/* CSV Import */}
        <div className="card">
          <h2 style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '0.5rem' }}>CSV Import</h2>
          <p style={{ fontSize: '0.8125rem', color: '#64748b', marginBottom: '1rem', lineHeight: 1.5 }}>
            Import multiple bills at once. The CSV must have a header row with these columns:
          </p>
          <pre style={{
            fontSize: '0.7rem', background: '#f8fafc', border: '1px solid #e2e8f0',
            borderRadius: '0.375rem', padding: '0.625rem', marginBottom: '1rem',
            overflowX: 'auto', lineHeight: 1.6,
          }}>
{`name,category,amount,due_date,
recurrence,is_subscription,
last_used_date`}
          </pre>

          <div style={{ marginBottom: '0.75rem' }}>
            <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>Example CSV:</p>
            <pre style={{
              fontSize: '0.68rem', background: '#f1f5f9', border: '1px solid #e2e8f0',
              borderRadius: '0.375rem', padding: '0.5rem', overflowX: 'auto', lineHeight: 1.5,
            }}>
{`name,category,amount,due_date,recurrence,is_subscription,last_used_date
Netflix,subscription,17.99,2026-09-10,monthly,true,2026-08-30
Electric Bill,utility,120.00,2026-09-13,monthly,false,`}
            </pre>
          </div>

          <input
            ref={fileRef}
            type="file" accept=".csv"
            onChange={e => {
              const file = e.target.files?.[0]
              if (file) csvMut.mutate(file)
            }}
            style={{ marginBottom: '0.75rem' }}
          />

          {csvStatus && (
            <div style={{
              padding: '0.625rem 0.875rem', borderRadius: '0.5rem', fontSize: '0.8125rem',
              background: csvStatus.includes('failed') ? '#fef2f2' : '#f0fdf4',
              border: `1px solid ${csvStatus.includes('failed') ? '#fecaca' : '#bbf7d0'}`,
              color: csvStatus.includes('failed') ? '#b91c1c' : '#15803d',
            }}>
              {csvStatus}
            </div>
          )}

          {csvMut.isPending && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b', fontSize: '0.8125rem' }}>
              <div className="spinner" style={{ width: '1rem', height: '1rem', borderWidth: 2 }} />
              Importing…
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
