import Link from 'next/link'
import { useState, useEffect } from 'react'

export const metadata = {
  title: 'Job Hunting Prompts - ClawPack',
  description: 'AI prompts to help with job hunting, salary negotiation, LinkedIn optimization, and more.',
}

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
  
  // Simple HTML translator - translates text nodes, preserves structure
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  
  // Translate summary (prompt titles) and h3 (section headers)
  const summaries = doc.querySelectorAll('summary, h3')
  for (const el of Array.from(summaries)) {
    const original = el.textContent || ''
    if (original.trim()) {
      el.textContent = await translateText(original, lang)
    }
  }
  
  return doc.body.innerHTML
}

export default async function JobHuntingPrompts() {
  const content = await getPrompts()

  return (
    <main className="font-sans bg-white min-h-screen">
      <LanguageWrapper content={content} />
    </main>
  )
}

function LanguageWrapper({ content }: { content: string }) {
  const [lang, setLang] = useState('en')
  const [translatedContent, setTranslatedContent] = useState(content)
  const [translating, setTranslating] = useState(false)

  useEffect(() => {
    if (lang === 'en') {
      setTranslatedContent(content)
      return
    }
    
    setTranslating(true)
    translateHtml(content, lang).then((translated) => {
      setTranslatedContent(translated)
      setTranslating(false)
    })
  }, [lang, content])

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 p-6 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <Link href="/" className="flex items-center gap-3">
            <img src="/logo.jpg" alt="ClawPack" className="h-10 w-10 object-contain" />
            <span className="text-2xl font-bold text-slate-900">ClawPack</span>
          </Link>
          <div className="flex items-center gap-4">
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value)}
              className="appearance-none bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold pl-3 pr-8 py-2 rounded-lg cursor-pointer hover:bg-slate-200 transition"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 8px center',
                backgroundSize: '12px',
              }}
            >
              <option value="en">🇬🇧 English</option>
              <option value="yue">🇭🇰 粵語 (Cantonese)</option>
              <option value="zh-CN">🇨🇳 简体 (Simplified)</option>
              <option value="zh-TW">🇹🇼 繁體 (Traditional)</option>
            </select>
            {translating && <span className="text-xs text-slate-500">Translating...</span>}
            <Link href="/#prompts" className="text-sm text-slate-600 hover:text-slate-900 transition font-medium">Prompts</Link>
            <Link href="/" className="text-sm text-slate-600 hover:text-slate-900 transition font-medium">Back</Link>
          </div>
        </div>
      </header>

      <div className="h-[73px]" />

      <section className="py-16 px-6 bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-slate-900 mb-4">
            {lang === 'en' ? 'Job Hunting Prompts' : lang === 'yue' ? '求職提示' : lang === 'zh-CN' ? '求职提示' : '求職提示'}
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            {lang === 'en' ? 'AI prompts to supercharge your job search. From salary negotiation to LinkedIn optimization — get hired faster.' 
              : lang === 'yue' ? 'AI提示助您求職更順利。薪酬談判、LinkedIn優化 — 更快搵到心水工作。'
              : lang === 'zh-CN' ? 'AI提示助您求职更顺利。薪酬谈判、LinkedIn优化 — 更快找到好工作。'
              : 'AI提示助您求職更順利。薪酬談判、LinkedIn優化 — 更快搵到心水工作。'}
          </p>
        </div>
      </section>

      <section className="py-16 px-6 bg-slate-50">
        <div className="max-w-4xl mx-auto">
          <div id="prompts-content" dangerouslySetInnerHTML={{ __html: translatedContent }} />
        </div>
      </section>

      <footer className="py-8 px-6 bg-slate-900">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-slate-400 text-sm">© 2026 ClawPack. All rights reserved.</p>
          <div className="flex gap-6 text-slate-400 text-sm">
            <Link href="/privacy-page" className="hover:text-white transition">Privacy</Link>
            <Link href="/terms-of-service" className="hover:text-white transition">Terms</Link>
          </div>
        </div>
      </footer>

      <script dangerouslySetInnerHTML={{ __html: `
        document.addEventListener('DOMContentLoaded', function() {
          document.querySelectorAll('.copy-btn').forEach(function(btn) {
            btn.addEventListener('click', function() {
              var sibling = btn.nextElementSibling;
              while (sibling) {
                if (sibling.innerText && sibling.innerText.trim()) {
                  navigator.clipboard.writeText(sibling.innerText).catch(function(){});
                  var original = btn.innerText;
                  btn.innerText = '✅ Copied!';
                  btn.style.background = '#16a34a';
                  setTimeout(function() {
                    btn.innerText = original;
                    btn.style.background = '#28a745';
                  }, 2000);
                  break;
                }
                sibling = sibling.nextElementSibling;
              }
            });
          });
        });
      ` }} />

      <style>{`
        #prompts-content h3 { font-size: 1.5rem; font-weight: bold; color: #1e293b; margin: 2rem 0 1rem 0; }
        #prompts-content details { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; margin: 15px 0; overflow: hidden; }
        #prompts-content summary { background: linear-gradient(to right, #6344ec, #9a3dda); color: white; padding: 15px; cursor: pointer; font-weight: bold; font-size: 16px; border-radius: 12px 12px 0 0; }
        #prompts-content summary:hover { filter: brightness(1.1); }
        #prompts-content .prompt-inner { background: #1e293b; color: #fff; padding: 20px; border-radius: 0 0 12px 12px; font-size: 13px; white-space: pre-wrap; line-height: 1.6; max-height: 500px; overflow-y: auto; font-family: Arial, sans-serif; }
        #prompts-content .copy-btn { background: #28a745; color: white; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: bold; margin-bottom: 10px; }
        #prompts-content .copy-btn:hover { background: #218838; }
        #prompts-content .prompt-inner p { margin: 0 0 1rem 0; }
      `}</style>
    </>
  )
}
