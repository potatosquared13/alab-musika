import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function AskPage() {
  const [text, setText] = useState('')
  const [status, setStatus] = useState<'idle' | 'submitting' | 'done' | 'error'>('idle')

  const submit = async () => {
    const trimmed = text.trim()
    if (!trimmed) return
    setStatus('submitting')
    const { error } = await supabase
      .from('questions')
      .insert({ text: trimmed, status: 'pending' })
    if (error) {
      setStatus('error')
    } else {
      setStatus('done')
      setText('')
    }
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  if (status === 'done') {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-6 text-center">
        <div className="mb-6 text-5xl">🎵</div>
        <h2 className="text-white text-2xl font-bold mb-2">Question sent!</h2>
        <p className="text-zinc-400 text-sm mb-8">The host will put it on screen.</p>
        <button
          onClick={() => setStatus('idle')}
          className="text-sm text-zinc-400 underline underline-offset-4 hover:text-white transition-colors"
        >
          Ask another
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-10">
          <p className="text-amber-400 text-xs font-bold tracking-[0.2em] uppercase mb-3">
            Alab Musika
          </p>
          <h1 className="text-white text-3xl font-black leading-tight mb-2">
            Got a question?
          </h1>
          <p className="text-zinc-500 text-sm">
            Anonymous — no name needed.
          </p>
        </div>

        {/* Input */}
        <div className="bg-zinc-900 rounded-2xl p-1 mb-3">
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Type your question here…"
            rows={4}
            maxLength={280}
            className="w-full bg-transparent text-white text-base placeholder-zinc-600 px-4 pt-4 pb-2 resize-none outline-none leading-relaxed"
          />
          <div className="flex items-center justify-between px-4 pb-3">
            <span className="text-zinc-600 text-xs">{text.length}/280</span>
            <button
              onClick={submit}
              disabled={!text.trim() || status === 'submitting'}
              className="bg-amber-400 text-zinc-950 font-black text-sm px-5 py-2 rounded-xl disabled:opacity-30 hover:bg-amber-300 active:scale-95 transition-all"
            >
              {status === 'submitting' ? 'Sending…' : 'Send →'}
            </button>
          </div>
        </div>

        {status === 'error' && (
          <p className="text-red-400 text-xs text-center">
            Something went wrong. Try again.
          </p>
        )}

        <p className="text-zinc-700 text-xs text-center mt-6">
          Questions are reviewed before appearing on screen.
        </p>
      </div>
    </div>
  )
}
