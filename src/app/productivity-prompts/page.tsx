export const dynamic = 'force-dynamic';
import PromptsLayout from '../components/PromptsLayout'
import PromptsContent from '../components/PromptsContent'
export const metadata = { title: 'Productivity Prompts - ClawPack', description: 'AI prompts to boost your productivity and streamline your workflow.' }
async function get() {
  const r = await fetch('https://clawpack.net/wp-json/wp/v2/pages/2078', { next: { revalidate: 3600 } })
  if (!r.ok) return ''
  return (await r.json()).content.rendered
}
export default async function Page() {
  return <PromptsLayout heading="Productivity Prompts" description="Get more done with AI. Task management, planning, and workflow optimization."><PromptsContent html={await get()} /></PromptsLayout>
}
