'use client'

import React, { Suspense } from 'react'
import { PDFViewer as PDFView } from '@react-pdf/renderer'
import { Document, DocumentProps } from '@react-pdf/renderer'
import { Loader2 } from 'lucide-react'

interface PDFViewerProps {
  children: React.ReactElement<DocumentProps>
}

export function PDFViewer({ children }: PDFViewerProps) {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-[80vh] border rounded-lg bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Loading PDF Viewer...</p>
        </div>
      </div>
    }>
      <PDFView style={{ width: '100%', height: '80vh', border: 'none' }}>
        {children}
      </PDFView>
    </Suspense>
  )
}