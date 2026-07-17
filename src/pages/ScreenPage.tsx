import { useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { supabase, type Question } from '../lib/supabase'

const QUESTION_URL = 'https://projectignition.dricko.com'

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  return `${Math.floor(diff / 3600)}h ago`
}

function FlameMark() {
  return <svg viewBox="0 0 48 56" className="h-20 w-16" fill="none" aria-hidden="true"><path d="M25 3c2 12-7 14-7 25 0 5 3 9 7 11-1-7 5-10 7-17 7 7 11 13 11 20 0 8-8 12-19 12S5 49 5 39C5 25 19 20 25 3Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>
}

export default function ScreenPage() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [, setTick] = useState(0)

  useEffect(() => { const timer = setInterval(() => setTick(n => n + 1), 30_000); return () => clearInterval(timer) }, [])
  useEffect(() => {
    supabase.from('questions').select('*').eq('status', 'on_screen').order('created_at', { ascending: false }).then(({ data }) => { if (data) setQuestions(data) })
    const channel = supabase.channel('screen-questions').on('postgres_changes', { event: '*', schema: 'public', table: 'questions' }, payload => {
      if (payload.eventType === 'INSERT') { const q = payload.new as Question; if (q.status === 'on_screen') setQuestions(prev => [q, ...prev]) }
      if (payload.eventType === 'UPDATE') { const q = payload.new as Question; setQuestions(prev => { const without = prev.filter(x => x.id !== q.id); return q.status === 'on_screen' ? [q, ...without] : without }) }
      if (payload.eventType === 'DELETE') setQuestions(prev => prev.filter(x => x.id !== payload.old.id))
    }).subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  return (
    <main className="brand-grid relative flex min-h-screen flex-col overflow-hidden bg-[var(--crest)] text-[var(--ink)]">
      <div className="brand-rays -bottom-72 -right-64" />
      <header className="relative z-10 flex flex-shrink-0 items-center justify-between border-b border-[rgba(31,27,25,.2)] px-10 py-6">
        <div className="flex items-center gap-4">
          <img src="/nyd-crest.png" alt="National Youth Department crest" className="h-14 w-14 object-contain" />
          <div>
            <p className="font-label text-[10px] uppercase tracking-[.22em] text-[var(--sun)]">Project Ignition</p>
            <h1 className="font-brand text-2xl font-medium leading-tight">Live Q&amp;A</h1>
          </div>
        </div>
        {questions.length > 0 ? (
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="font-label mb-1 text-[10px] uppercase tracking-[.18em] text-[var(--fire)]">Scan to ask</p>
              <p className="text-sm font-semibold text-[var(--ink)]">projectignition.dricko.com</p>
            </div>
            <div className="border border-[rgba(31,27,25,.2)] bg-white p-2" aria-label="QR code for submitting a question">
              <QRCodeSVG value={QUESTION_URL} size={136} level="M" fgColor="#1F1B19" bgColor="#FFFFFF" marginSize={1} />
            </div>
          </div>
        ) : (
          <div className="font-label flex items-center gap-3 text-[10px] uppercase tracking-[.18em] text-[var(--ink-3)]">
            <span className="h-2 w-2 bg-[var(--fire)]" /><span>Live</span>
          </div>
        )}
      </header>

      {questions.length === 0 ? (
        <section className="relative z-10 flex flex-1 items-center justify-center gap-16 px-10 text-left">
          <div className="max-w-3xl">
            <div className="mb-8 text-[var(--sun)]"><FlameMark /></div>
            <p className="font-label mb-5 text-xs uppercase tracking-[.22em] text-[var(--sun)]">The room is open</p>
            <h2 className="font-brand text-6xl font-light tracking-[-.03em]">Waiting for questions.</h2>
            <p className="mt-6 text-lg text-[var(--ink-3)]">Scan or visit <span className="font-semibold text-[var(--ink)]">projectignition.dricko.com</span></p>
          </div>
          <div className="flex-shrink-0 border border-[rgba(31,27,25,.2)] bg-white p-5 shadow-[10px_10px_0_var(--bone)]" aria-label="QR code for submitting a question">
            <QRCodeSVG value={QUESTION_URL} size={220} level="M" fgColor="#1F1B19" bgColor="#FFFFFF" marginSize={1} />
          </div>
        </section>
      ) : (
        <section className={`relative z-10 grid flex-1 gap-5 overflow-hidden px-10 py-6 ${questions.length === 1 ? 'grid-cols-1' : 'grid-cols-1'}`}>
          {questions.map((question, index) => (
            <article key={question.id} className="question-card flex min-h-0 flex-col justify-center border border-[rgba(31,27,25,.18)] bg-[rgba(237,230,214,.88)] px-10 py-7">
              <div className="mb-4 flex items-center justify-between">
                <span className="font-label text-[10px] uppercase tracking-[.2em] text-[var(--sun)]">{index === 0 && questions.length > 1 ? 'Latest question' : `Question ${questions.length - index}`}</span>
                <span className="font-label text-[10px] tracking-[.08em] text-[var(--ink-3)]">{timeAgo(question.created_at)}</span>
              </div>
              <p className="font-brand font-medium leading-[1.08] tracking-[-.025em]" style={{ fontSize: question.text.length > 120 ? '2.15rem' : question.text.length > 60 ? '2.75rem' : '3.35rem' }}>{question.text}</p>
            </article>
          ))}
        </section>
      )}

      <footer className="font-label relative z-10 flex flex-shrink-0 items-center justify-between border-t border-[rgba(31,27,25,.2)] px-10 py-4 text-[10px] uppercase tracking-[.16em] text-[var(--ink-3)]">
        <span>Anonymous questions · Reviewed live</span><span>projectignition.dricko.com</span>
      </footer>
    </main>
  )
}
