import { useEffect, useState } from 'react'
import { supabase, type Question } from '../lib/supabase'

export default function ScreenPage() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [visible, setVisible] = useState(true)

  // Fade transition when question changes
  const triggerFade = () => {
    setVisible(false)
    setTimeout(() => setVisible(true), 300)
  }

  useEffect(() => {
    // Initial fetch — get all approved, most recent first
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
              triggerFade()
              setQuestions(prev => [q, ...prev])
            }
          }
          if (payload.eventType === 'UPDATE') {
            const q = payload.new as Question
            setQuestions(prev => {
              const without = prev.filter(x => x.id !== q.id)
              if (q.status === 'approved') {
                triggerFade()
                return [q, ...without]
              }
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

  const current = questions[0] ?? null

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col">

      {/* Header */}
      <div className="flex items-center justify-between px-10 pt-8">
        <div>
          <p className="text-amber-400 text-xs font-bold tracking-[0.25em] uppercase">Alab Musika</p>
          <h1 className="text-white text-lg font-black leading-none">Live Q&A</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-zinc-500 text-xs tracking-wide">Live</span>
        </div>
      </div>

      {/* Main content — centered */}
      <div className="flex-1 flex flex-col items-center justify-center px-16 text-center">
        {!current ? (
          <div>
            <div className="text-6xl mb-6">🎸</div>
            <p className="text-zinc-600 text-2xl font-medium">Waiting for questions…</p>
            <p className="text-zinc-700 text-base mt-3">
              Submit at <span className="text-amber-400 font-bold">alabmusika.dricko.com</span>
            </p>
          </div>
        ) : (
          <div
            className="max-w-4xl transition-opacity duration-300"
            style={{ opacity: visible ? 1 : 0 }}
          >
            <p className="text-zinc-600 text-sm font-bold tracking-[0.2em] uppercase mb-8">Question</p>
            <p className="text-white font-bold leading-tight"
              style={{ fontSize: current.text.length > 120 ? '2.4rem' : current.text.length > 60 ? '3rem' : '3.8rem' }}>
              {current.text}
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-10 pb-8 text-center">
        <p className="text-zinc-700 text-sm">
          Submit at <span className="text-amber-400">alabmusika.dricko.com</span>
        </p>
      </div>
    </div>
  )
}
