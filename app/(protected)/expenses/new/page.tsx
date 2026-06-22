'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const ACCOUNTS = ['Office Expenses','Rent','Utilities','Salaries','Transport','Repairs','Supplies','Other']

export default function NewExpensePage() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [description, setDescription] = useState('')
  const [account, setAccount] = useState('Other')
  const [amount, setAmount] = useState('')
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!amount || !description) return
    setSaving(true)
    const res = await fetch('/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, description, account, amount: Number(amount) }),
    })
    setSaving(false)
    if (res.ok) { setDone(true); setTimeout(() => router.push('/dashboard'), 1200) }
  }

  if (done) return (
    <div className="py-20 text-center">
      <p className="text-5xl mb-4">✅</p>
      <p className="text-white font-semibold text-lg">Expense saved!</p>
    </div>
  )

  return (
    <div className="py-4 max-w-lg space-y-4">
      <h1 className="text-xl font-bold">New Expense</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-sm text-gray-400 block mb-1.5">Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-base text-white outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="text-sm text-gray-400 block mb-1.5">Description</label>
          <input value={description} onChange={e => setDescription(e.target.value)}
            placeholder="What was this expense for?"
            className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-base text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="text-sm text-gray-400 block mb-1.5">Category</label>
          <select value={account} onChange={e => setAccount(e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-base text-white outline-none focus:ring-2 focus:ring-blue-500">
            {ACCOUNTS.map(a => <option key={a}>{a}</option>)}
          </select>
        </div>
        <div>
          <label className="text-sm text-gray-400 block mb-1.5">Amount (GHS)</label>
          <input type="number" min="0" step="0.01" value={amount}
            onChange={e => setAmount(e.target.value)} placeholder="0.00"
            inputMode="decimal"
            className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-base text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <button type="submit" disabled={!description || !amount || saving}
          className="w-full bg-purple-600 hover:bg-purple-500 active:bg-purple-700 disabled:opacity-40 text-white font-semibold rounded-xl py-4 text-base transition">
          {saving ? 'Saving…' : 'Save Expense'}
        </button>
      </form>
    </div>
  )
}
