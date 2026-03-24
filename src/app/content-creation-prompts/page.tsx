export const dynamic = 'force-dynamic';
import PromptsLayout from '../components/PromptsLayout'
import PromptsContent from '../components/PromptsContent'
export const metadata = { title: 'Content Creation Prompts - ClawPack', description: 'AI prompts for content creation, social media, blogging, and more.' }
async function get() {
  const r = await fetch('https://clawpack.net/wp-json/wp/v2/pages/2072', { next: { revalidate: 3600 } })
  if (!r.ok) return ''
  return (await r.json()).content.rendered
}
export default async function Page() {
  return <PromptsLayout heading="Content Creation Prompts" description="Create better content with AI. Blogging, social media, video scripts, and more."><PromptsContent html={await get()} /></PromptsLayout>
}
