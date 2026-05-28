import { useEffect, useState } from 'react'
import { supabase, type Question } from '../lib/supabase'

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  return `${Math.floor(diff / 3600)}h ago`
}

export default function ScreenPage() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [, setTick] = useState(0)

  // Re-render every 30s so timestamps stay fresh
  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 30_000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    supabase
      .from('questions')
      .select('*')
      .eq('status', 'on_screen')
      .order('created_at', { ascending: false })
      .then(({ data }) => { if (data) setQuestions(data) })

    const channel = supabase
      .channel('screen-questions')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'questions' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const q = payload.new as Question
            if (q.status === 'on_screen') setQuestions(prev => [q, ...prev])
          }
          if (payload.eventType === 'UPDATE') {
            const q = payload.new as Question
            setQuestions(prev => {
              const without = prev.filter(x => x.id !== q.id)
              return q.status === 'on_screen' ? [q, ...without] : without
            })
          }
          if (payload.eventType === 'DELETE') {
            setQuestions(prev => prev.filter(x => x.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  return (
    <div className="bg-white text-zinc-900 flex flex-col min-h-screen">

      {/* Header */}
      <div className="flex items-center justify-between px-10 pt-7 pb-4 flex-shrink-0">
        <div>
          <p className="text-amber-500 text-xs font-bold tracking-[0.25em] uppercase">Alab Musika</p>
          <h1 className="text-zinc-900 text-base font-black leading-none">Live Q&A</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-zinc-400 text-xs tracking-wide">Live</span>
        </div>
      </div>

      {/* Questions area */}
      {questions.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-10">
          <div className="text-5xl mb-5">🎸</div>
          <p className="text-zinc-400 text-xl font-semibold">Waiting for questions…</p>
          <p className="text-zinc-400 text-sm mt-2">
            Submit at <span className="text-amber-500 font-bold">alabmusika.dricko.com</span>
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-10 pb-4 space-y-4"
          style={{ scrollbarWidth: 'none' }}>
          {questions.map((q, i) => (
            <div
              key={q.id}
              className="bg-zinc-50 rounded-2xl px-8 py-6 border border-zinc-200 animate-fade-in"
            >
              {/* Newest badge */}
              {i === 0 && questions.length > 1 && (
                <span className="inline-block text-amber-500 text-xs font-bold tracking-[0.15em] uppercase mb-3">
                  ★ Latest
                </span>
              )}
              <p
                className="text-zinc-900 font-bold leading-snug"
                style={{ fontSize: q.text.length > 120 ? '2.2rem' : q.text.length > 60 ? '2.8rem' : '3.5rem' }}
              >
                {q.text}
              </p>
              <p className="text-zinc-400 text-sm mt-3">{timeAgo(q.created_at)}</p>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex-shrink-0 pb-5 text-center">
        <p className="text-zinc-400 text-xs">
          Submit at <span className="text-amber-500">alabmusika.dricko.com</span>
        </p>
      </div>
    </div>
  )
}
