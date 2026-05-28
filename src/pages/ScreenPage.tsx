import { useEffect, useState } from 'react'
import { supabase, type Question } from '../lib/supabase'

export default function ScreenPage() {
  const [questions, setQuestions] = useState<Question[]>([])

  useEffect(() => {
    // Initial fetch
    supabase
      .from('questions')
      .select('*')
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) setQuestions(data)
      })

    // Real-time subscription
    const channel = supabase
      .channel('screen-questions')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'questions' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const q = payload.new as Question
            if (q.status === 'approved') {
              setQuestions(prev => [q, ...prev])
            }
          }
          if (payload.eventType === 'UPDATE') {
            const q = payload.new as Question
            setQuestions(prev => {
              // Remove if deleted/revoked, add if newly approved
              const without = prev.filter(x => x.id !== q.id)
              if (q.status === 'approved') return [q, ...without]
              return without
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
    <div className="min-h-screen bg-zinc-950 text-white p-10 flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-4 mb-10">
        <div>
          <p className="text-amber-400 text-xs font-bold tracking-[0.2em] uppercase">Alab Musika</p>
          <h1 className="text-white text-2xl font-black leading-none">Live Q&A</h1>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-zinc-500 text-xs">Live</span>
        </div>
      </div>

      {/* Questions */}
      {questions.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <div className="text-6xl mb-4">🎸</div>
          <p className="text-zinc-600 text-xl font-medium">Waiting for questions…</p>
          <p className="text-zinc-700 text-sm mt-2">Ask at <span className="text-amber-400 font-bold">alabmusika.dricko.com</span></p>
        </div>
      ) : (
        <div className="columns-2 gap-6">
          {questions.map((q, i) => (
            <div
              key={q.id}
              className="break-inside-avoid mb-6 bg-zinc-900 rounded-2xl px-8 py-6 border border-zinc-800"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <p className="text-white text-2xl font-semibold leading-snug">{q.text}</p>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="mt-auto pt-8 text-center">
        <p className="text-zinc-700 text-sm">
          Submit at <span className="text-amber-400">alabmusika.dricko.com</span>
        </p>
      </div>
    </div>
  )
}
