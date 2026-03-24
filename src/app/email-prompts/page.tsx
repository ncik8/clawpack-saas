import PromptsLayout from '../components/PromptsLayout'
import PromptsContent from '../components/PromptsContent'
export const metadata = { title: 'Email Prompts - ClawPack', description: 'AI prompts for writing better emails, cold outreach, and email automation.' }
async function get() {
  const r = await fetch('https://clawpack.net/wp-json/wp/v2/pages/2076', { next: { revalidate: 3600 } })
  if (!r.ok) return ''
  return (await r.json()).content.rendered
}
export default async function Page() {
  return <PromptsLayout heading="Email Prompts" description="Write emails that get responses. Cold outreach, follow-ups, and sales emails."><PromptsContent html={await get()} /></PromptsLayout>
}
