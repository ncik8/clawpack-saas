export const dynamic = 'force-dynamic';
import PromptsLayout from '../components/PromptsLayout'
import PromptsContent from '../components/PromptsContent'
export const metadata = { title: 'Marketing Prompts - ClawPack', description: 'AI prompts for marketing strategy, ad copy, and campaign planning.' }
async function get() {
  const r = await fetch('https://clawpack.net/wp-json/wp/v2/pages/2258', { next: { revalidate: 3600 } })
  if (!r.ok) return ''
  return (await r.json()).content.rendered
}
export default async function Page() {
  return <PromptsLayout heading="Marketing Prompts" description="Marketing that works. Ad copy, strategy, SEO, and campaign ideas."><PromptsContent html={await get()} /></PromptsLayout>
}
