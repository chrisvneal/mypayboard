'use client'

import { use } from 'react'
import { TemplateEditor } from '@/components/templates/TemplateEditor'

type PageProps = {
  params: Promise<{ id: string }>
}

export default function TemplateEditPage({ params }: PageProps) {
  const { id } = use(params)
  return <TemplateEditor templateId={id} />
}
