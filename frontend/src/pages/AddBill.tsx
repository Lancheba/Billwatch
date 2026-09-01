import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { billsApi, type BillCategory, type BillRecurrence } from '../api'
import { HiOutlinePlusCircle, HiOutlineArrowUpTray } from 'react-icons/hi2'

export default function AddBill() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [form, setForm] = useState({
    name: '',
    merchant: '',
    category: 'utility' as BillCategory,
    amount: '',
    previous_amount: '',
    due_date: '',
    recurrence: 'monthly' as BillRecurrence,
    is_subscription: false,
    last_used_date: '',
    notes: '',
  })

  const createMutation = useMutation({
    mutationFn: (data: typeof form) =>
      billsApi.create({
        ...data,
        previous_amount: data.previous_amount || null,
        last_used_date: data.last_used_date || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
      navigate('/dashboard')
    },
  })

  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [csvStatus, setCsvStatus] = useState<string | null>(null)

  const importMutation = useMutation({
    mutationFn: (file: File) => billsApi.importCsv(file),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['bills'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
      setCsvStatus(`Imported ${data.data?.created ?? 0} bills successfully!`)
      setTimeout(() => navigate('/dashboard'), 1500)
    },
    onError: () => setCsvStatus('CSV import failed. Check column headers.'),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createMutation.mutate(form)
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <HiOutlinePlusCircle size={24} style={{ color: '#ffffff' }} />
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, color: '#ffffff', letterSpacing: '-0.02em' }}>
            Add Bill or Subscription
          </h1>
        </div>
        <p style={{ color: '#94a3b8', fontSize: '0.875rem', margin: '0.25rem 0 0' }}>
          Add an obligation manually or bulk import a statement via CSV.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        {/* Form Card */}
        <div className="glass-card">
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', color: '#ffffff' }}>
            Manual Entry
          </h2>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div>
              <label style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: 4, display: 'block' }}>Bill / Service Name</label>
              <input
                required
                type="text"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Electric Utility"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: 4, display: 'block' }}>Amount</label>
                <input
                  required
                  type="number"
                  step="0.01"
                  value={form.amount}
                  onChange={e => setForm({ ...form, amount: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: 4, display: 'block' }}>Previous Amount</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.previous_amount}
                  onChange={e => setForm({ ...form, previous_amount: e.target.value })}
                  placeholder="Optional"
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: 4, display: 'block' }}>Category</label>
                <select
                  value={form.category}
                  onChange={e => setForm({ ...form, category: e.target.value as BillCategory, is_subscription: e.target.value === 'subscription' })}
                >
                  <option value="utility">Utility</option>
                  <option value="subscription">Subscription</option>
                  <option value="loan">Loan / EMI</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: 4, display: 'block' }}>Recurrence</label>
                <select
                  value={form.recurrence}
                  onChange={e => setForm({ ...form, recurrence: e.target.value as BillRecurrence })}
                >
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                  <option value="weekly">Weekly</option>
                  <option value="one_time">One Time</option>
                </select>
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: 4, display: 'block' }}>Due Date</label>
              <input
                required
                type="date"
                value={form.due_date}
                onChange={e => setForm({ ...form, due_date: e.target.value })}
              />
            </div>

            <button
              type="submit"
              disabled={createMutation.isPending}
              className="glass-pill glass-pill-active"
              style={{ marginTop: '0.5rem', justifyContent: 'center', padding: '0.75rem' }}
            >
              {createMutation.isPending ? 'Saving...' : 'Save Bill'}
            </button>
          </form>
        </div>

        {/* Bulk CSV Card */}
        <div className="glass-card">
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', color: '#ffffff' }}>
            Bulk CSV Import
          </h2>
          <p style={{ fontSize: '0.8125rem', color: '#94a3b8', marginBottom: '1rem' }}>
            Import your credit card or bank statement export in CSV format.
          </p>

          <input
            type="file"
            accept=".csv"
            onChange={e => setCsvFile(e.target.files?.[0] || null)}
            style={{ marginBottom: '1rem' }}
          />

          <button
            onClick={() => csvFile && importMutation.mutate(csvFile)}
            disabled={!csvFile || importMutation.isPending}
            className="glass-pill glass-pill-active"
            style={{ width: '100%', justifyContent: 'center', padding: '0.75rem' }}
          >
            <HiOutlineArrowUpTray size={16} />
            <span>{importMutation.isPending ? 'Importing...' : 'Upload & Import CSV'}</span>
          </button>

          {csvStatus && (
            <div style={{ marginTop: '1rem', fontSize: '0.8125rem', color: '#ffffff', textAlign: 'center' }}>
              {csvStatus}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
