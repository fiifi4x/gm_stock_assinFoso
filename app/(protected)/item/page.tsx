'use client'
import { useState, useEffect, useRef, Suspense } from 'react'
import Link from 'next/link'
import { usePolling } from '@/lib/usePolling'
import ItemsTab from './_components/ItemsTab'
import SalesTab from './_components/SalesTab'
import BillsTab from './_components/BillsTab'
import CountsTab from './_components/CountsTab'
import AliasesTab from './_components/AliasesTab'
import ExpensesTab from './_components/ExpensesTab'
import CABTab from './_components/CABTab'

type OuterTab = 'items' | 'sales' | 'bills' | 'counts' | 'aliases' | 'expenses' | 'cab'

type Item = {
  id: number
  item_name: string
  cf_group: string | null
  selling_rate: string | null
  purchase_rate: string | null
  units_per_pack: string | null
  unit_name: string | null
  calculated_soh: number
}

const VIOLATIONS: Record<OuterTab, { key: string; label: string }[]> = {
  items: [
    { key: 'neg_soh',    label: 'Neg SOH' },
    { key: 'no_sp',      label: 'No SP' },
    { key: 'no_cp',      label: 'No CP' },
    { key: 'no_group',   label: 'No Group' },
    { key: 'duplicates', label: 'Duplicates' },
  ],
  sales: [
    { key: 'no_cash',      label: 'No Cash' },
    { key: 'missing_days', label: 'Missing Days' },
    { key: 'cost_price',   label: 'Cost Price' },
  ],
  bills: [],
  counts: [
    { key: 'daily', label: 'Daily' },
    { key: '15day', label: '15-Day' },
  ],
  aliases: [
    { key: 'prezoho-sales', label: 'Pre-Zoho Sales' },
    { key: 'prezoho-bills', label: 'Pre-Zoho Bills' },
    { key: 'zoho-sales',    label: 'Zoho Sales' },
    { key: 'zoho-bills',    label: 'Zoho Bills' },
  ],
  expenses: [],
  cab: [],
}

function tabCls(active: boolean) {
  return `shrink-0 text-[9px] font-semibold px-2 py-1 rounded transition whitespace-nowrap
    ${active ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`
}

function HubInner() {
  const [outerTab, setOuterTab] = useState<OuterTab>('items')
  const [group, setGroup] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [violation, setViolation] = useState<string | null>(null)
  const [groupOpen, setGroupOpen] = useState(false)
  const [violationOpen, setViolationOpen] = useState(false)
  const groupRef = useRef<HTMLDivElement>(null)
  const violRef  = useRef<HTMLDivElement>(null)

  const [items, setItems] = useState<Item[]>([])
  const [itemsLoading, setItemsLoading] = useState(true)

  function loadItems() {
    fetch('/api/items').then(r => r.json()).then(d => {
      setItems(Array.isArray(d) ? d : [])
      setItemsLoading(false)
    })
  }

  useEffect(() => { loadItems() }, [])
  usePolling(loadItems, 5000)

  // Close dropdowns on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (groupRef.current && !groupRef.current.contains(e.target as Node)) setGroupOpen(false)
      if (violRef.current && !violRef.current.contains(e.target as Node)) setViolationOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function changeTab(t: OuterTab) {
    setOuterTab(t)
    setViolation(null)
  }

  const groups = ['All', ...Array.from(new Set(items.map(i => i.cf_group ?? 'Ungrouped'))).sort()]
  const currentViolations = VIOLATIONS[outerTab]
  const activeViolationLabel = currentViolations.find(v => v.key === violation)?.label ?? null

  return (
    <div className="-mx-4 -mt-4 flex flex-col h-[calc(100dvh-60px)] md:h-[calc(100dvh-56px)]">

      {/* ── Header ── */}
      <div className="shrink-0 bg-white border-b border-gray-200">

        {/* Row 1: outer tabs */}
        <div className="flex items-center gap-0.5 px-2 pt-1 pb-0.5 overflow-x-auto">
          <button onClick={() => changeTab('items')} className={tabCls(outerTab === 'items')}>Items</button>

          <div className="flex items-center shrink-0">
            <button onClick={() => changeTab('sales')} className={tabCls(outerTab === 'sales')}>Sales</button>
            <Link href="/sales/new"
              className="text-[9px] text-blue-500 font-bold px-0.5 py-0.5 hover:text-blue-700 leading-none">+</Link>
          </div>

          <div className="w-px h-3.5 bg-gray-200 mx-0.5 shrink-0" />

          <div className="flex items-center shrink-0">
            <button onClick={() => changeTab('bills')} className={tabCls(outerTab === 'bills')}>Bills</button>
            <Link href="/bills/new"
              className="text-[9px] text-blue-500 font-bold px-0.5 py-0.5 hover:text-blue-700 leading-none">+</Link>
          </div>

          <div className="w-px h-3.5 bg-gray-200 mx-0.5 shrink-0" />

          <button onClick={() => changeTab('counts')} className={tabCls(outerTab === 'counts')}>Counts</button>
          <button onClick={() => changeTab('aliases')} className={tabCls(outerTab === 'aliases')}>Aliases</button>

          <div className="w-px h-3.5 bg-gray-200 mx-0.5 shrink-0" />

          <div className="flex items-center shrink-0">
            <button onClick={() => changeTab('expenses')} className={tabCls(outerTab === 'expenses')}>Exp.</button>
            <Link href="/expenses/new"
              className="text-[9px] text-blue-500 font-bold px-0.5 py-0.5 hover:text-blue-700 leading-none">+</Link>
          </div>

          <button onClick={() => changeTab('cab')} className={tabCls(outerTab === 'cab')}>CAB</button>
        </div>

        {/* Row 2: groups dropdown + violations + search */}
        <div className="flex items-center gap-1 px-2 py-1">

          {/* Groups dropdown */}
          <div className="relative shrink-0" ref={groupRef}>
            <button onClick={() => setGroupOpen(o => !o)}
              className={`text-[9px] font-semibold px-2 py-0.5 rounded whitespace-nowrap flex items-center gap-0.5 transition
                ${group ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
              {group ?? 'All'} <span className="text-[8px]">▾</span>
            </button>
            {groupOpen && (
              <div className="absolute top-full left-0 mt-0.5 bg-white border border-gray-200 rounded-lg shadow-lg z-30 min-w-[120px] max-h-48 overflow-y-auto">
                {groups.map(g => (
                  <button key={g} onClick={() => { setGroup(g === 'All' ? null : g); setGroupOpen(false) }}
                    className={`w-full text-left px-2.5 py-1 text-[9px] hover:bg-blue-50 transition
                      ${(g === 'All' && !group) || g === group ? 'text-blue-600 font-semibold' : 'text-gray-700'}`}>
                    {g}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Violations dropdown — only when violations exist for this tab */}
          {currentViolations.length > 0 && (
            <>
              <div className="w-px h-3 bg-gray-200 shrink-0" />
              <div className="relative shrink-0" ref={violRef}>
                <button onClick={() => setViolationOpen(o => !o)}
                  className={`text-[9px] font-semibold px-2 py-0.5 rounded whitespace-nowrap flex items-center gap-0.5 transition
                    ${violation ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                  {activeViolationLabel ?? 'Violations'} <span className="text-[8px]">▾</span>
                </button>
                {violationOpen && (
                  <div className="absolute top-full left-0 mt-0.5 bg-white border border-gray-200 rounded-lg shadow-lg z-30 min-w-[140px]">
                    {currentViolations.map(v => (
                      <button key={v.key} onClick={() => { setViolation(violation === v.key ? null : v.key); setViolationOpen(false) }}
                        className={`w-full text-left px-2.5 py-1 text-[9px] hover:bg-red-50 transition
                          ${violation === v.key ? 'text-red-600 font-semibold' : 'text-gray-700'}`}>
                        {v.label}
                      </button>
                    ))}
                    {violation && (
                      <button onClick={() => { setViolation(null); setViolationOpen(false) }}
                        className="w-full text-left px-2.5 py-1 text-[9px] text-gray-400 hover:bg-gray-50 border-t border-gray-100 transition">
                        Clear filter
                      </button>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Search */}
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search items…"
            className="flex-1 min-w-0 text-[9px] bg-gray-50 border border-gray-200 rounded px-2 py-0.5 outline-none focus:ring-1 focus:ring-blue-400" />
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 min-h-0">
        {outerTab === 'items' && (
          itemsLoading
            ? <div className="py-20 text-center text-gray-400 text-xs">Loading…</div>
            : <ItemsTab
                items={items}
                group={group}
                search={search}
                violation={violation}
                onItemsChanged={setItems}
              />
        )}
        {outerTab === 'sales' && (
          <SalesTab items={items} groupFilter={group} search={search} violation={violation} />
        )}
        {outerTab === 'bills' && (
          <BillsTab items={items} groupFilter={group} search={search} />
        )}
        {outerTab === 'counts' && (
          <CountsTab items={items} groupFilter={group} search={search} violation={violation} />
        )}
        {outerTab === 'aliases' && (
          <AliasesTab defaultTab={violation} />
        )}
        {outerTab === 'expenses' && (
          <ExpensesTab search={search} />
        )}
        {outerTab === 'cab' && (
          <CABTab />
        )}
      </div>
    </div>
  )
}

export default function ItemHubPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-gray-400 text-xs">Loading…</div>}>
      <HubInner />
    </Suspense>
  )
}
