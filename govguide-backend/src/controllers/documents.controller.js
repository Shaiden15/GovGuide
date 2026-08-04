import { randomUUID } from 'crypto'
import { supabase } from '../config/supabase.js'
import { analyzeDocument, matchRejectionReason } from '../services/gemini.service.js'

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']

export async function uploadDocument(req, res, next) {
  try {
    const file = req.file
    if (!file) {
      return res.status(400).json({ error: 'A file is required.' })
    }
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return res.status(400).json({ error: `Unsupported file type: ${file.mimetype}` })
    }

    const { sessionId } = req.body
    let session = null
    if (sessionId) {
      const { data, error } = await supabase
        .from('sessions')
        .select('id, user_id, service_id')
        .eq('id', sessionId)
        .single()
      if (error || !data || data.user_id !== req.user.id) {
        return res.status(404).json({ error: 'Session not found.' })
      }
      session = data
    }

    const storagePath = `${req.user.id}/${randomUUID()}-${file.originalname}`
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(storagePath, file.buffer, { contentType: file.mimetype })
    if (uploadError) throw uploadError

    const analysis = await analyzeDocument({
      base64Data: file.buffer.toString('base64'),
      mimeType: file.mimetype,
    })

    if (analysis.isRejectionLetter && session?.service_id) {
      const { data: rejectionReasons } = await supabase
        .from('rejection_reasons')
        .select('reason_code, description, fix_instructions')
        .eq('service_id', session.service_id)

      const match = await matchRejectionReason({
        extractedText: analysis.extractedText,
        rejectionReasons: rejectionReasons ?? [],
      })
      if (match) analysis.rejectionMatch = match
    }

    const { data: document, error: docError } = await supabase
      .from('documents_uploaded')
      .insert({
        user_id: req.user.id,
        session_id: sessionId ?? null,
        file_url: storagePath,
        doc_type_detected: analysis.docTypeDetected,
        checked_at: new Date().toISOString(),
      })
      .select('id')
      .single()
    if (docError) throw docError

    const { error: analysisError } = await supabase.from('document_analyses').insert({
      document_id: document.id,
      extracted_text: analysis.extractedText,
      analysis,
    })
    if (analysisError) throw analysisError

    res.status(200).json({ documentId: document.id, analysis })
  } catch (err) {
    next(err)
  }
}
