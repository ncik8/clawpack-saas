export const dynamic = 'force-dynamic';
import PromptsLayout from '../components/PromptsLayout'
import PromptsContent from '../components/PromptsContent'
export const metadata = { title: 'Research Prompts - ClawPack', description: 'AI prompts for market research, competitor analysis, and data gathering.' }
async function get() {
  const r = await fetch('https://clawpack.net/wp-json/wp/v2/pages/2074', { next: { revalidate: 3600 } })
  if (!r.ok) return ''
  return (await r.json()).content.rendered
}
export default async function Page() {
  return <PromptsLayout heading="Research Prompts" description="Research faster with AI. Market analysis, competitor insights, and data synthesis."><PromptsContent html={await get()} /></PromptsLayout>
}
