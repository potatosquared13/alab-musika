import { useState } from 'react'
import { supabase } from '../lib/supabase'

function FlameMark() {
  return (
    <svg viewBox="0 0 48 56" className="h-12 w-10" fill="none" aria-hidden="true">
      <path d="M25 3c2 12-7 14-7 25 0 5 3 9 7 11-1-7 5-10 7-17 7 7 11 13 11 20 0 8-8 12-19 12S5 49 5 39C5 25 19 20 25 3Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
    </svg>
  )
}

export default function AskPage() {
  const [text, setText] = useState('')
  const [status, setStatus] = useState<'idle' | 'submitting' | 'done' | 'error'>('idle')

  const submit = async () => {
    const trimmed = text.trim()
    if (!trimmed || status === 'submitting') return
    setStatus('submitting')
    const { error } = await supabase.from('questions').insert({ text: trimmed, status: 'pending' })
    if (error) setStatus('error')
    else { setStatus('done'); setText('') }
  }

  const handleKey = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); submit() }
  }

  return (
    <main className="brand-grid relative min-h-screen overflow-hidden bg-[var(--crest)] px-5 py-8 sm:px-8">
      <div className="brand-rays -right-72 -top-72" />
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl flex-col">
        <header className="relative z-10 flex items-center justify-between border-b border-[rgba(31,27,25,.2)] pb-5">
          <div className="flex items-center gap-3">
            <img src="/nyd-crest.png" alt="National Youth Department crest" className="h-12 w-12 object-contain" />
            <div>
              <p className="font-label text-[10px] font-medium uppercase tracking-[.2em] text-[var(--fire)]">National Youth Department</p>
              <p className="font-brand text-xl font-medium leading-tight">Project Ignition</p>
            </div>
          </div>
          <p className="font-label hidden text-[10px] uppercase tracking-[.18em] text-[var(--ink-3)] sm:block">Live Q&amp;A · 2026</p>
        </header>

        <section className="relative z-10 grid flex-1 items-center gap-12 py-14 lg:grid-cols-[.9fr_1.1fr] lg:py-20">
          <div className="max-w-xl">
            <p className="font-label mb-5 text-xs font-medium uppercase tracking-[.2em] text-[var(--water)]">Live Q&amp;A</p>
            <h1 className="font-brand text-5xl font-medium leading-[.98] tracking-[-.035em] sm:text-6xl lg:text-7xl">
              What would you like <em className="font-light text-[var(--fire)]">to ask?</em>
            </h1>
            <p className="mt-6 max-w-md text-base leading-relaxed text-[var(--ink-3)] sm:text-lg">
              Send your question anonymously. No name needed.
            </p>
          </div>

          <div className="w-full max-w-xl justify-self-end">
            {status === 'done' ? (
              <div className="border border-[rgba(31,27,25,.18)] bg-[var(--bone)] p-7 sm:p-10" role="status">
                <div className="mb-8 flex h-16 w-16 items-center justify-center border border-[var(--fire)] text-[var(--fire)]"><FlameMark /></div>
                <p className="font-label mb-3 text-[10px] uppercase tracking-[.2em] text-[var(--water)]">Received</p>
                <h2 className="font-brand text-4xl font-medium tracking-[-.02em]">Question sent.</h2>
                <p className="mt-3 leading-relaxed text-[var(--ink-3)]">The host will review it for the live screen.</p>
                <button onClick={() => setStatus('idle')} className="mt-8 border-b border-[var(--ink)] pb-1 text-sm font-semibold hover:text-[var(--fire)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--water)]">
                  Ask another question
                </button>
              </div>
            ) : (
              <div>
                <div className="border border-[rgba(31,27,25,.2)] bg-[var(--bone)] p-2">
                  <label htmlFor="question" className="sr-only">Your anonymous question</label>
                  <textarea id="question" value={text} onChange={event => setText(event.target.value)} onKeyDown={handleKey}
                    placeholder="Write your question here…" rows={6} maxLength={280}
                    className="w-full resize-none bg-transparent px-4 pb-3 pt-4 text-lg leading-relaxed text-[var(--ink)] outline-none placeholder:text-[rgba(74,65,59,.55)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--water)]" />
                  <div className="flex items-center justify-between border-t border-[rgba(31,27,25,.14)] px-4 py-3">
                    <span className="font-label text-[10px] tracking-[.08em] text-[var(--ink-3)]">{text.length} / 280</span>
                    <button onClick={submit} disabled={!text.trim() || status === 'submitting'}
                      className="min-h-11 bg-[var(--sun)] px-6 text-sm font-bold text-[var(--ink)] hover:bg-[var(--sun-deep)] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--water)] active:translate-y-px disabled:cursor-not-allowed disabled:opacity-35">
                      {status === 'submitting' ? 'Sending…' : 'Send question →'}
                    </button>
                  </div>
                </div>
                {status === 'error' && <p className="mt-3 text-center text-sm font-medium text-[var(--fire)]" role="alert">Something went wrong. Please try again.</p>}
                <p className="font-label mt-5 text-center text-[10px] uppercase tracking-[.1em] text-[var(--ink-3)]">Questions are reviewed before they appear on screen.</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}
