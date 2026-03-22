interface Props { html: string }
export default function PromptsContent({ html }: Props) {
  return <div id="prompts-content" dangerouslySetInnerHTML={{ __html: html }} />
}
