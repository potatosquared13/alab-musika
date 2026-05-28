import { useEffect, useState } from 'react'
import { supabase, type Question } from '../lib/supabase'

type Tab = 'pending' | 'approved' | 'on_screen'

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

  // Re-render every 30s so timestamps stay fresh
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
        .in('status', ['pending', 'approved', 'on_screen'])
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

  const approve    = (id: string) => supabase.from('questions').update({ status: 'approved'  }).eq('id', id)
  const showScreen = (id: string) => supabase.from('questions').update({ status: 'on_screen' }).eq('id', id)
  const unshow     = (id: string) => supabase.from('questions').update({ status: 'approved'  }).eq('id', id)
  const remove     = (id: string) => supabase.from('questions').update({ status: 'deleted'   }).eq('id', id)

  const pending   = questions.filter(q => q.status === 'pending')
  const approved  = questions.filter(q => q.status === 'approved')
  const onScreen  = questions.filter(q => q.status === 'on_screen')

  const screenFull = onScreen.length >= 3

  const tabData: Record<Tab, Question[]> = { pending, approved, on_screen: onScreen }
  const visible = tabData[tab]

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'pending',   label: 'Pending',   count: pending.length },
    { key: 'approved',  label: 'Approved',  count: approved.length },
    { key: 'on_screen', label: 'On Screen', count: onScreen.length },
  ]

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <div className="border-b border-zinc-800 px-6 py-4 flex items-center">
        <div>
          <p className="text-amber-400 text-xs font-bold tracking-[0.2em] uppercase">Alab Musika</p>
          <h1 className="text-white text-lg font-black leading-none">Admin</h1>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-zinc-500 text-xs">Live</span>
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
              {tab === 'approved'  && 'No questions waiting to show.'}
              {tab === 'on_screen' && 'Nothing on screen right now.'}
            </p>
          </div>
        )}

        {visible.map(q => (
          <div key={q.id} className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
            <p className="text-white text-base leading-snug mb-1">{q.text}</p>
            <p className="text-zinc-600 text-xs mb-4">{timeAgo(q.created_at)}</p>

            <div className="flex gap-2">
              {/* PENDING: approve or dismiss */}
              {tab === 'pending' && <>
                <button onClick={() => approve(q.id)}
                  className="flex-1 bg-amber-400 text-zinc-950 font-bold text-sm py-2 rounded-lg hover:bg-amber-300 active:scale-95 transition-all">
                  ✓ Approve
                </button>
                <button onClick={() => remove(q.id)}
                  className="px-4 bg-zinc-800 text-zinc-400 font-bold text-sm py-2 rounded-lg hover:bg-zinc-700 hover:text-white active:scale-95 transition-all">
                  Dismiss
                </button>
              </>}

              {/* APPROVED: show on screen or delete */}
              {tab === 'approved' && <>
                <button onClick={() => showScreen(q.id)} disabled={screenFull}
                  className="flex-1 bg-amber-400 text-zinc-950 font-bold text-sm py-2 rounded-lg hover:bg-amber-300 active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed">
                  {screenFull ? '⚠ Screen full (3/3)' : '↑ Show on screen'}
                </button>
                <button onClick={() => remove(q.id)}
                  className="px-4 bg-zinc-800 text-zinc-400 font-bold text-sm py-2 rounded-lg hover:bg-zinc-700 hover:text-white active:scale-95 transition-all">
                  Delete
                </button>
              </>}

              {/* ON SCREEN: pull off screen or delete */}
              {tab === 'on_screen' && <>
                <button onClick={() => unshow(q.id)}
                  className="flex-1 bg-zinc-800 text-zinc-300 font-bold text-sm py-2 rounded-lg hover:bg-zinc-700 hover:text-white active:scale-95 transition-all">
                  ↓ Remove from screen
                </button>
                <button onClick={() => remove(q.id)}
                  className="px-4 bg-red-900/40 text-red-400 font-bold text-sm py-2 rounded-lg hover:bg-red-900/60 active:scale-95 transition-all">
                  Delete
                </button>
              </>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
