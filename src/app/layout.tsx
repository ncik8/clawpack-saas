import './globals.css'

export const metadata = {
  title: 'ClawPack AI - Your AI Business Assistant',
  description: 'One platform that builds your website, books appointments, posts to social media, and talks to your customers.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
