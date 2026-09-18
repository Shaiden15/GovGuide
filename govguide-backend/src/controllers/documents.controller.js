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

    const { serviceSlug } = req.body
    let serviceId = null
    if (serviceSlug) {
      const { data: service } = await supabase.from('services').select('id').eq('slug', serviceSlug).single()
      serviceId = service?.id ?? null
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

    if (analysis.isRejectionLetter && serviceId) {
      const { data: rejectionReasons } = await supabase
        .from('rejection_reasons')
        .select('reason_code, description, fix_instructions')
        .eq('service_id', serviceId)

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
        service_id: serviceId,
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
