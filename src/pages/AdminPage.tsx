import { useEffect, useState } from 'react'
import { supabase, type Question } from '../lib/supabase'

type Tab = 'pending' | 'on_screen' | 'asked'

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  return `${Math.floor(diff / 3600)}h ago`
}

export default function AdminPage() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [tab, setTab] = useState<Tab>('pending')
  const [loading, setLoading] = useState(true)
  const [, setTick] = useState(0)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')

  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 30_000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    const fetch = async () => {
      setLoading(true)
      const { data } = await supabase
        .from('questions')
        .select('*')
        .in('status', ['pending', 'next', 'on_screen', 'asked'])
        .order('created_at', { ascending: false })
      if (data) setQuestions(data)
      setLoading(false)
    }
    fetch()

    const channel = supabase
      .channel('admin-questions')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'questions' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setQuestions(prev => [payload.new as Question, ...prev])
          }
          if (payload.eventType === 'UPDATE') {
            const q = payload.new as Question
            setQuestions(prev =>
              q.status === 'deleted'
                ? prev.filter(x => x.id !== q.id)
                : prev.map(x => x.id === q.id ? q : x)
            )
          }
          if (payload.eventType === 'DELETE') {
            setQuestions(prev => prev.filter(x => x.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const saveEdit = async (id: string) => {
    if (!editText.trim()) return
    await supabase.from('questions').update({ text: editText.trim() }).eq('id', id)
    setEditingId(null)
  }

  const sendToScreen = async (id: string) => { await supabase.from('questions').update({ status: 'on_screen' }).eq('id', id) }
  const markNext     = async (id: string) => { await supabase.from('questions').update({ status: 'next'      }).eq('id', id) }
  const unmarkNext   = async (id: string) => { await supabase.from('questions').update({ status: 'pending'   }).eq('id', id) }
  const markAsked    = async (id: string) => { await supabase.from('questions').update({ status: 'asked'     }).eq('id', id) }
  const dismiss      = async (id: string) => { await supabase.from('questions').update({ status: 'deleted'   }).eq('id', id) }

  const clearAll = async () => {
    await supabase.from('questions').update({ status: 'asked' }).eq('status', 'on_screen')
    const { data: nextQs } = await supabase.from('questions').select('id').eq('status', 'next').limit(3)
    if (nextQs && nextQs.length > 0) {
      await supabase.from('questions').update({ status: 'on_screen' }).in('id', nextQs.map(q => q.id))
    }
  }

  const pending  = questions.filter(q => q.status === 'pending')
  const next     = questions.filter(q => q.status === 'next')
  const onScreen = questions.filter(q => q.status === 'on_screen')
  const asked    = questions.filter(q => q.status === 'asked')

  const screenFull = onScreen.length >= 3
  const nextFull   = next.length >= 3

  // Pending tab shows next (highlighted) first, then regular pending
  const pendingVisible = [...next, ...pending]
  const tabData: Record<Tab, Question[]> = { pending: pendingVisible, on_screen: onScreen, asked }
  const visible = tabData[tab]

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'pending',   label: 'Pending',   count: pending.length + next.length },
    { key: 'on_screen', label: 'On Screen', count: onScreen.length },
    { key: 'asked',     label: 'Asked',     count: asked.length },
  ]

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <div className="border-b border-zinc-800 px-6 py-4 flex items-center">
        <div>
          <p className="text-amber-400 text-xs font-bold tracking-[0.2em] uppercase">Alab Musika</p>
          <h1 className="text-white text-lg font-black leading-none">Admin</h1>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <button
            onClick={clearAll}
            className="text-xs font-bold text-red-400 border border-red-900/50 bg-red-900/20 px-3 py-1.5 rounded-lg hover:bg-red-900/40 active:scale-95 transition-all"
          >
            Clear All
          </button>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-zinc-500 text-xs">Live</span>
          </div>
        </div>
      </div>

      {/* On-screen counter banner */}
      {onScreen.length > 0 && (
        <div className="bg-amber-400/10 border-b border-amber-400/20 px-6 py-2 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          <span className="text-amber-400 text-xs font-bold">
            {onScreen.length}/3 question{onScreen.length !== 1 ? 's' : ''} on screen
          </span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-zinc-800">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-3 text-sm font-bold tracking-wide transition-colors ${
              tab === t.key
                ? 'text-amber-400 border-b-2 border-amber-400'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {t.label}
            <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${
              tab === t.key ? 'bg-amber-400/20 text-amber-400' : 'bg-zinc-800 text-zinc-500'
            }`}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* List */}
      <div className="p-4 space-y-3 max-w-xl mx-auto">
        {loading && <p className="text-zinc-600 text-sm text-center py-10">Loading…</p>}

        {!loading && visible.length === 0 && (
          <div className="text-center py-16">
            <p className="text-zinc-600 text-sm">
              {tab === 'pending'   && 'No pending questions.'}
              {tab === 'on_screen' && 'Nothing on screen right now.'}
              {tab === 'asked'     && 'No questions asked yet.'}
            </p>
          </div>
        )}

        {visible.map((q, i) => {
          const isNext = q.status === 'next'
          return (
            <div
              key={q.id}
              className={`rounded-xl p-4 border transition-all ${
                isNext
                  ? 'bg-amber-400/10 border-amber-400/50'
                  : 'bg-zinc-900 border-zinc-800'
              }`}
            >
              {/* Next for showing label */}
              {isNext && (
                <span className="inline-block text-amber-400 text-xs font-bold tracking-[0.15em] uppercase mb-2">
                  ⏭ Next for showing
                </span>
              )}

              {/* Latest badge for non-next questions */}
              {!isNext && i === 0 && visible.filter(x => x.status !== 'next').length > 1 && tab !== 'pending' && (
                <span className="inline-block text-amber-400 text-xs font-bold tracking-[0.15em] uppercase mb-2">
                  ★ Latest
                </span>
              )}

              {editingId === q.id ? (
                <>
                  <textarea
                    className="w-full bg-zinc-800 text-white text-base leading-snug rounded-lg px-3 py-2 mb-2 resize-none border border-zinc-600 focus:outline-none focus:border-amber-400"
                    rows={3}
                    value={editText}
                    onChange={e => setEditText(e.target.value)}
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button onClick={() => saveEdit(q.id)}
                      className="flex-1 bg-amber-400 text-zinc-950 font-bold text-sm py-2 rounded-lg hover:bg-amber-300 active:scale-95 transition-all">
                      Save
                    </button>
                    <button onClick={() => setEditingId(null)}
                      className="px-4 bg-zinc-800 text-zinc-400 font-bold text-sm py-2 rounded-lg hover:bg-zinc-700 hover:text-white active:scale-95 transition-all">
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className={`text-base leading-snug mb-1 ${isNext ? 'text-white font-semibold' : 'text-white'}`}>
                    {q.text}
                  </p>
                  <p className="text-zinc-500 text-xs mb-4">{timeAgo(q.created_at)}</p>

                  <div className="flex gap-2">
                    {/* PENDING tab — regular */}
                    {tab === 'pending' && !isNext && <>
                      <button onClick={() => sendToScreen(q.id)} disabled={screenFull}
                        className="flex-1 bg-amber-400 text-zinc-950 font-bold text-sm py-2 rounded-lg hover:bg-amber-300 active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed">
                        {screenFull ? '⚠ Screen full' : '↑ Send to screen'}
                      </button>
                      <button onClick={() => markNext(q.id)} disabled={nextFull}
                        className="px-4 bg-zinc-800 text-zinc-300 font-bold text-sm py-2 rounded-lg hover:bg-amber-400/20 hover:text-amber-400 active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed">
                        Next
                      </button>
                      <button onClick={() => { setEditingId(q.id); setEditText(q.text) }}
                        className="px-4 bg-zinc-800 text-zinc-500 font-bold text-sm py-2 rounded-lg hover:bg-zinc-700 hover:text-white active:scale-95 transition-all">
                        Edit
                      </button>
                      <button onClick={() => dismiss(q.id)}
                        className="px-4 bg-zinc-800 text-zinc-500 font-bold text-sm py-2 rounded-lg hover:bg-zinc-700 hover:text-white active:scale-95 transition-all">
                        ✕
                      </button>
                    </>}

                    {/* PENDING tab — next */}
                    {tab === 'pending' && isNext && <>
                      <button onClick={() => sendToScreen(q.id)} disabled={screenFull}
                        className="flex-1 bg-amber-400 text-zinc-950 font-bold text-sm py-2 rounded-lg hover:bg-amber-300 active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed">
                        {screenFull ? '⚠ Screen full' : '↑ Send now'}
                      </button>
                      <button onClick={() => unmarkNext(q.id)}
                        className="px-4 bg-zinc-800 text-zinc-300 font-bold text-sm py-2 rounded-lg hover:bg-zinc-700 hover:text-white active:scale-95 transition-all">
                        Unmark
                      </button>
                      <button onClick={() => { setEditingId(q.id); setEditText(q.text) }}
                        className="px-4 bg-zinc-800 text-zinc-500 font-bold text-sm py-2 rounded-lg hover:bg-zinc-700 hover:text-white active:scale-95 transition-all">
                        Edit
                      </button>
                      <button onClick={() => dismiss(q.id)}
                        className="px-4 bg-zinc-800 text-zinc-500 font-bold text-sm py-2 rounded-lg hover:bg-zinc-700 hover:text-white active:scale-95 transition-all">
                        ✕
                      </button>
                    </>}

                    {/* ON SCREEN tab */}
                    {tab === 'on_screen' && <>
                      <button onClick={() => markAsked(q.id)}
                        className="flex-1 bg-zinc-800 text-zinc-300 font-bold text-sm py-2 rounded-lg hover:bg-zinc-700 hover:text-white active:scale-95 transition-all">
                        ✓ Done
                      </button>
                      <button onClick={() => dismiss(q.id)}
                        className="px-4 bg-red-900/40 text-red-400 font-bold text-sm py-2 rounded-lg hover:bg-red-900/60 active:scale-95 transition-all">
                        Delete
                      </button>
                    </>}

                    {/* ASKED tab */}
                    {tab === 'asked' && <>
                      <button onClick={() => sendToScreen(q.id)} disabled={screenFull}
                        className="flex-1 bg-zinc-800 text-zinc-300 font-bold text-sm py-2 rounded-lg hover:bg-zinc-700 hover:text-white active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed">
                        {screenFull ? '⚠ Screen full' : '↑ Re-show on screen'}
                      </button>
                      <button onClick={() => dismiss(q.id)}
                        className="px-4 bg-red-900/40 text-red-400 font-bold text-sm py-2 rounded-lg hover:bg-red-900/60 active:scale-95 transition-all">
                        Delete
                      </button>
                    </>}
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
