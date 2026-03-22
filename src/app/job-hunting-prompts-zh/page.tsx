'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

export default function PromptsContent({ html }: { html: string }) {
  const lang = useSearchParams().get('lang') || 'en'

  useEffect(() => {
    // Load Google Translate element
    if (!document.getElementById('google-translate-script')) {
      const script = document.createElement('script')
      script.id = 'google-translate-script'
      script.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit'
      script.async = true
      document.body.appendChild(script)
    }

    ;(window as any).googleTranslateElementInit = () => {
      new (window as any).google.translate.TranslateElement({
        pageLanguage: 'en',
        includedLanguages: 'zh-CN,zh-TW,en',
        layout: (window as any).google.translate.TranslateElement.InlineLayout.SIMPLE,
        multilanguagePage: true,
      }, 'google_translate_element')
    }
  }, [])

  return (
    <main className="font-sans bg-white min-h-screen">
      {/* Header - Fixed */}
      <header className="fixed top-0 left-0 right-0 z-50 p-6 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <Link href="/" className="flex items-center gap-3">
            <img src="/logo.jpg" alt="ClawPack" className="h-10 w-10 object-contain" />
            <span className="text-2xl font-bold text-slate-900">ClawPack</span>
          </Link>
          <div className="flex items-center gap-4">
            {/* Language Toggle */}
            <div className="flex items-center gap-2 bg-slate-100 rounded-full p-1">
              <Link
                href="/job-hunting-prompts?lang=en"
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${lang === 'en' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
              >
                EN
              </Link>
              <Link
                href="/job-hunting-prompts?lang=zh"
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${lang === 'zh' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
              >
                中文
              </Link>
            </div>
            <Link href="/" className="text-sm text-slate-600 hover:text-slate-900 transition font-medium">
              Back
            </Link>
          </div>
        </div>
      </header>

      <div className="h-[73px]" />

      {/* Google Translate Widget */}
      <div className="py-3 px-6 bg-slate-50 border-b border-slate-200">
        <div className="max-w-4xl mx-auto">
          <div id="google_translate_element" />
        </div>
      </div>

      {/* Hero */}
      <section className="py-16 px-6 bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-slate-900 mb-4">
            {lang === 'zh' ? '求職提示' : 'Job Hunting Prompts'}
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            {lang === 'zh'
              ? 'AI提示助您求職更順利。薪酬談判、LinkedIn優化 — 更快搵到心水工作。'
              : 'AI prompts to supercharge your job search. From salary negotiation to LinkedIn optimization — get hired faster.'}
          </p>
        </div>
      </section>

      {/* Prompts */}
      <section className="py-16 px-6 bg-slate-50">
        <div className="max-w-4xl mx-auto">
          <div id="prompts-content" dangerouslySetInnerHTML={{ __html: html }} />
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 bg-slate-900">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-slate-400 text-sm">© 2026 ClawPack. All rights reserved.</p>
          <div className="flex gap-6 text-slate-400 text-sm">
            <Link href="/privacy-page" className="hover:text-white transition">Privacy</Link>
            <Link href="/terms-of-service" className="hover:text-white transition">Terms</Link>
          </div>
        </div>
      </footer>

      <style>{`
        #prompts-content h3 { font-size: 1.5rem; font-weight: bold; color: #1e293b; margin: 2rem 0 1rem 0; }
        #prompts-content details { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; margin: 15px 0; overflow: hidden; }
        #prompts-content summary { background: linear-gradient(to right, #6344ec, #9a3dda); color: white; padding: 15px; cursor: pointer; font-weight: bold; font-size: 16px; border-radius: 12px 12px 0 0; }
        #prompts-content summary:hover { filter: brightness(1.1); }
        #prompts-content .prompt-inner { background: #1e293b; color: #fff; padding: 20px; border-radius: 0 0 12px 12px; font-size: 13px; white-space: pre-wrap; line-height: 1.6; max-height: 500px; overflow-y: auto; font-family: Arial, sans-serif; }
        #prompts-content .copy-btn { background: #28a745; color: white; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: bold; margin-bottom: 10px; }
        #prompts-content .copy-btn:hover { background: #218838; }
        #prompts-content .prompt-inner p { margin: 0 0 1rem 0; }
        #google_translate_element select { padding: 4px 8px; border: 1px solid #e2e8f0; border-radius: 6px; background: white; }
        .goog-te-gadget { font-family: Arial, sans-serif !important; }
        .goog-te-gadget-simple { background: #f8fafc !important; border: 1px solid #e2e8f0 !important; border-radius: 8px !important; padding: 6px 10px !important; }
      `}</style>

      <script dangerouslySetInnerHTML={{ __html: `
        document.addEventListener('DOMContentLoaded', function() {
          var lang = window.location.search.includes('lang=zh') ? 'zh' : 'en';
          document.querySelectorAll('.copy-btn').forEach(function(btn) {
            btn.addEventListener('click', function() {
              var sibling = btn.nextElementSibling;
              while (sibling) {
                if (sibling.innerText && sibling.innerText.trim()) {
                  navigator.clipboard.writeText(sibling.innerText).catch(function(){});
                  var original = btn.innerText;
                  btn.innerText = lang === 'zh' ? '✅ 已複製!' : '✅ Copied!';
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
    </main>
  )
}
