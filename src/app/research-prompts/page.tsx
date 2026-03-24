/* eslint-disable */
import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function ResearchPrompts() {
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [lang, setLang] = useState('en')

  useEffect(() => {
    fetch('https://clawpack.net/wp-json/wp/v2/pages/2074', { next: { revalidate: 3600 } })
      .then(res => res.json())
      .then(data => {
        setContent(data.content?.rendered || '')
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const handleTranslate = async (targetLang: string) => {
    if (targetLang === 'en') {
      window.location.reload()
      return
    }
    alert('Translation requires API key setup')
  }

  return (
    <main className="font-sans bg-white min-h-screen">
      <header className="bg-gradient-to-r from-[#083056] to-[#1780e3] text-white py-16 px-8">
        <div className="max-w-4xl mx-auto">
          <Link href="/research-prompts" className="text-white/80 hover:text-white text-sm mb-4 inline-block">← Back to Prompts</Link>
          <h1 className="text-4xl font-bold mb-4">Research Prompts</h1>
          <p className="text-xl text-white/90">AI prompts to help with research, analysis, and information synthesis.</p>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-8 py-4 flex justify-end">
        <select 
          value={lang} 
          onChange={(e) => {
            setLang(e.target.value)
            handleTranslate(e.target.value)
          }}
          className="input w-auto"
        >
          <option value="en">🇬🇧 English</option>
          <option value="zh-CN">🇨🇳 简体中文</option>
          <option value="zh-TW">🇹🇼 繁體中文</option>
        </select>
      </div>

      <article className="max-w-4xl mx-auto px-8 py-8">
        {loading ? (
          <div className="text-center py-12">
            <div className="spinner mx-auto mb-4" />
            <p className="text-gray-500">Loading...</p>
          </div>
        ) : (
          <div dangerouslySetInnerHTML={{ __html: content }} />
        )}
      </article>
    </main>
  )
}
