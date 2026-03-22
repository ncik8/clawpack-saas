import Link from 'next/link'

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

export default async function JobHuntingPrompts() {
  const content = await getPrompts()

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
            <div id="google_translate_element" />
            <Link href="/#prompts" className="text-sm text-slate-600 hover:text-slate-900 transition font-medium">Prompts</Link>
            <Link href="/" className="text-sm text-slate-600 hover:text-slate-900 transition font-medium">Back</Link>
          </div>
        </div>
      </header>

      <div className="h-[73px]" />

      {/* Hero */}
      <section className="py-16 px-6 bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-slate-900 mb-4">Job Hunting Prompts</h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            AI prompts to supercharge your job search. From salary negotiation to LinkedIn optimization — get hired faster.
          </p>
        </div>
      </section>

      {/* Prompts */}
      <section className="py-16 px-6 bg-slate-50">
        <div className="max-w-4xl mx-auto">
          <div id="prompts-content" dangerouslySetInnerHTML={{ __html: content }} />
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

      {/* Google Translate */}
      <script dangerouslySetInnerHTML={{ __html: `
        function googleTranslateElementInit() {
          new google.translate.TranslateElement({
            pageLanguage: 'en',
            includedLanguages: 'en,yue,zh-CN,zh-TW',
            layout: google.translate.TranslateElement.InlineLayout.SIMPLE,
            autoDisplay: false
          }, 'google_translate_element');
        }
      ` }} />
      <script src="//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit" defer />

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
        #google_translate_element { vertical-align: middle; }
        #google_translate_element .goog-te-gadget { font-family: Arial, sans-serif !important; font-size: 12px !important; }
        #google_translate_element .goog-te-gadget-simple { background: #f8fafc !important; border: 1px solid #e2e8f0 !important; border-radius: 8px !important; padding: 5px 8px !important; display: inline-block !important; }
        #google_translate_element .goog-te-gadget-simple span { color: #334155 !important; }
        #google_translate_element select { padding: 3px 6px !important; border: 1px solid #e2e8f0 !important; border-radius: 4px !important; background: white !important; font-size: 12px !important; }
        .goog-te-banner-frame { display: none !important; }
        body { top: 0 !important; }
      `}</style>
    </main>
  )
}
