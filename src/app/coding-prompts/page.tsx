import PromptsLayout from '../components/PromptsLayout'
import PromptsContent from '../components/PromptsContent'
export const metadata = { title: 'Coding Prompts - ClawPack', description: 'AI prompts for coding, debugging, code review, and technical documentation.' }
async function get() {
  const r = await fetch('https://clawpack.net/wp-json/wp/v2/pages/2266', { next: { revalidate: 3600 } })
  if (!r.ok) return ''
  return (await r.json()).content.rendered
}
export default async function Page() {
  return <PromptsLayout heading="Coding Prompts" description="Code better with AI. Debugging, code review, and technical writing."><PromptsContent html={await get()} /></PromptsLayout>
}
