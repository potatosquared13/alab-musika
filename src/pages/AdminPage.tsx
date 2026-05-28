import { useEffect, useState } from 'react'
import { supabase, type Question } from '../lib/supabase'

type Tab = 'pending' | 'approved'

export default function AdminPage() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [tab, setTab] = useState<Tab>('pending')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetch = async () => {
      setLoading(true)
      const { data } = await supabase
        .from('questions')
        .select('*')
        .in('status', ['pending', 'approved'])
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

  const approve = async (id: string) => {
    await supabase.from('questions').update({ status: 'approved' }).eq('id', id)
  }

  const remove = async (id: string) => {
    await supabase.from('questions').update({ status: 'deleted' }).eq('id', id)
  }

  const pending = questions.filter(q => q.status === 'pending')
  const approved = questions.filter(q => q.status === 'approved')
  const visible = tab === 'pending' ? pending : approved

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <div className="border-b border-zinc-800 px-6 py-4 flex items-center gap-4">
        <div>
          <p className="text-amber-400 text-xs font-bold tracking-[0.2em] uppercase">Alab Musika</p>
          <h1 className="text-white text-lg font-black leading-none">Admin</h1>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-zinc-500 text-xs">Live</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-800">
        {(['pending', 'approved'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-3 text-sm font-bold capitalize tracking-wide transition-colors ${
              tab === t
                ? 'text-amber-400 border-b-2 border-amber-400'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {t}
            <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${
              tab === t ? 'bg-amber-400/20 text-amber-400' : 'bg-zinc-800 text-zinc-500'
            }`}>
              {t === 'pending' ? pending.length : approved.length}
            </span>
          </button>
        ))}
      </div>

      {/* List */}
      <div className="p-4 space-y-3 max-w-xl mx-auto">
        {loading && (
          <p className="text-zinc-600 text-sm text-center py-10">Loading…</p>
        )}
        {!loading && visible.length === 0 && (
          <div className="text-center py-16">
            <p className="text-zinc-600 text-sm">
              {tab === 'pending' ? 'No pending questions.' : 'Nothing approved yet.'}
            </p>
          </div>
        )}
        {visible.map(q => (
          <div key={q.id} className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
            <p className="text-white text-base leading-snug mb-4">{q.text}</p>
            <div className="flex gap-2">
              {tab === 'pending' && (
                <button
                  onClick={() => approve(q.id)}
                  className="flex-1 bg-amber-400 text-zinc-950 font-bold text-sm py-2 rounded-lg hover:bg-amber-300 active:scale-95 transition-all"
                >
                  ✓ Show on screen
                </button>
              )}
              <button
                onClick={() => remove(q.id)}
                className={`font-bold text-sm py-2 rounded-lg active:scale-95 transition-all ${
                  tab === 'pending'
                    ? 'px-4 bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'
                    : 'flex-1 bg-red-900/40 text-red-400 hover:bg-red-900/60'
                }`}
              >
                {tab === 'pending' ? 'Dismiss' : '✕ Remove from screen'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
