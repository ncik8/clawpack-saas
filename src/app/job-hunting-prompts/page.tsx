'use client';

import { useState, useEffect } from 'react'
import Link from 'next/link'

async function getPrompts() {
  const res = await fetch('https://clawpack.net/wp-json/wp/v2/pages/2053', { next: { revalidate: 3600 } })
  if (!res.ok) return ''
  const page = await res.json()
  return page.content.rendered
}

async function translateText(text: string, lang: string): Promise<string> {
  if (lang === 'en' || !text.trim()) return text
  
  try {
    const encoded = encodeURIComponent(text)
    const res = await fetch(`https://api.mymemory.translated.net/get?q=${encoded}&langpair=en|${lang}`)
    const data = await res.json()
    if (data.responseStatus === 200 && data.responseData?.translatedText) {
      return data.responseData.translatedText
    }
  } catch {}
  return text
}

async function translateHtml(html: string, lang: string): Promise<string> {
  if (lang === 'en') return html
  
  if (typeof window === 'undefined') return html
  
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  
  const summaries = doc.querySelectorAll('summary, h3')
  for (const el of Array.from(summaries)) {
    const original = el.textContent || ''
    if (original.trim()) {
      el.textContent = await translateText(original, lang)
    }
  }
  
  return doc.body.innerHTML
}

export default function JobHuntingPrompts() {
  const [content, setContent] = useState('')
  const [lang, setLang] = useState('en')
  const [translatedContent, setTranslatedContent] = useState('')
  const [translating, setTranslating] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getPrompts().then((data) => {
      const clean = data.replace(/style="background:\s*[^"]*"/gi, '')
      setContent(data)
      setTranslatedContent(clean)
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    if (loading) return
    if (lang === 'en') {
      const clean = content.replace(/style="background:\s*[^"]*"/gi, '')
      setTranslatedContent(clean)
      return
    }
    
    setTranslating(true)
    translateHtml(content, lang).then((translated) => {
      const clean = translated.replace(/style="background:\s*[^"]*"/gi, '')
      setTranslatedContent(clean)
      setTranslating(false)
    })
  }, [lang, content, loading])

  return (
    <main className="font-sans bg-white min-h-screen">
      {/* Header */}
      <header className="bg-gradient-to-r from-[#083056] to-[#1780e3] text-white py-16 px-8">
        <div className="max-w-4xl mx-auto">
          <Link href="/job-hunting-prompts" className="text-white/80 hover:text-white text-sm mb-4 inline-block">← Back to Prompts</Link>
          <h1 className="text-4xl font-bold mb-4">Job Hunting Prompts</h1>
          <p className="text-xl text-white/90">AI prompts to help with job hunting, salary negotiation, LinkedIn optimization, and more.</p>
        </div>
      </header>

      {/* Language selector */}
      <div className="max-w-4xl mx-auto px-8 py-4 flex justify-end">
        <select 
          value={lang} 
          onChange={(e) => setLang(e.target.value)}
          className="input w-auto"
        >
          <option value="en">🇬🇧 English</option>
          <option value="zh-CN">🇨🇳 简体中文</option>
          <option value="zh-TW">🇹🇼 繁體中文</option>
          <option value="yue">🇭🇰 粤语</option>
        </select>
      </div>

      {/* Content */}
      <article className="max-w-4xl mx-auto px-8 py-8">
        {loading ? (
          <div className="text-center py-12">
            <div className="spinner mx-auto mb-4" />
            <p className="text-gray-500">Loading prompts...</p>
          </div>
        ) : translating ? (
          <div className="text-center py-12">
            <div className="spinner mx-auto mb-4" />
            <p className="text-gray-500">Translating...</p>
          </div>
        ) : (
          <div 
            className="prose max-w-none"
            dangerouslySetInnerHTML={{ __html: translatedContent }}
          />
        )}
      </article>
    </main>
  )
}
