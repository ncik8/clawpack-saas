'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface PromptsContentProps {
  html: string
}

export default function PromptsContent({ html }: PromptsContentProps) {
  useEffect(() => {
    const content = document.getElementById('prompts-content')
    if (!content) return

    const buttons = content.querySelectorAll('button')
    buttons.forEach((btn) => {
      btn.addEventListener('click', () => {
        let sibling = btn.nextElementSibling as HTMLElement | null
        while (sibling) {
          if (sibling.innerText && sibling.innerText.trim()) {
            navigator.clipboard.writeText(sibling.innerText).catch(() => {})
            const original = btn.innerText
            btn.innerText = '✅ 已複製!'
            btn.style.background = '#16a34a'
            setTimeout(() => {
              btn.innerText = original
              btn.style.background = '#28a745'
            }, 2000)
            break
          }
          sibling = sibling.nextElementSibling as HTMLElement | null
        }
      })
    })
  }, [])

  return <div id="prompts-content" dangerouslySetInnerHTML={{ __html: html }} />
}
