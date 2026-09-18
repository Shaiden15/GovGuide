import { genAI, GEMINI_MODEL } from '../config/gemini.js'

// V1 is AI-free for chat/search — Gemini is used only for the Document Checker
// and Rejection Analyzer, since reading arbitrary uploaded documents has no
// free deterministic equivalent.

const DOCUMENT_ANALYSIS_PROMPT = `You are a document verification assistant for GovGuide SA, a South African government-services platform.
You will be shown an uploaded document (an ID, proof of address, payslip, rejection letter, or similar).

Analyse it and respond with ONLY a JSON object (no markdown fences, no extra text) matching this exact shape:
{
  "docTypeDetected": string,        // e.g. "South African ID card", "SASSA rejection letter", "payslip"
  "isRejectionLetter": boolean,     // true if this document is a rejection/decline notice from a government service
  "extractedText": string,          // the full text you can read from the document
  "isExpired": boolean | null,      // null if the document has no expiry date
  "expiryDate": string | null,      // ISO date if present, else null
  "isCertified": boolean | null,    // null if certification is not applicable to this document type
  "isComplete": boolean,            // false if pages/sections appear to be missing or cut off
  "issuesFound": string[],          // plain-language list of problems a caseworker should flag, empty array if none
  "summary": string                 // one or two sentences a user can read to understand the result
}

Only report issues you can actually see evidence of in the document. Do not guess at eligibility outcomes.`

export async function analyzeDocument({ base64Data, mimeType }) {
  const response = await genAI.models.generateContent({
    model: GEMINI_MODEL,
    contents: [
      {
        role: 'user',
        parts: [{ inlineData: { data: base64Data, mimeType } }, { text: DOCUMENT_ANALYSIS_PROMPT }],
      },
    ],
    config: { responseMimeType: 'application/json' },
  })

  const raw = response.text ?? '{}'
  try {
    return JSON.parse(raw)
  } catch {
    return {
      docTypeDetected: 'Unknown',
      isRejectionLetter: false,
      extractedText: raw,
      isExpired: null,
      expiryDate: null,
      isCertified: null,
      isComplete: true,
      issuesFound: [],
      summary: 'Could not fully parse the document analysis. Please review manually.',
    }
  }
}

const REJECTION_MATCH_PROMPT = `You are a rejection-letter analyst for GovGuide SA.
You will be given the extracted text of a rejection letter, and a list of KNOWN rejection reason codes for this service (each with a description and fix instructions).

Match the letter to the single best-fitting known reason code, if any genuinely fits. Respond with ONLY a JSON object (no markdown fences, no extra text):
{
  "matchedReasonCode": string | null,   // one of the known reason codes, or null if none genuinely match
  "explanation": string,                // plain-language explanation of why the application was rejected, grounded in the letter's actual text
  "fixInstructions": string             // specific next steps the user should take, using the matched reason's fix instructions if there is a match, otherwise general guidance to contact the department directly
}

Do not invent a reason code that isn't in the KNOWN list. If nothing matches well, set matchedReasonCode to null and give general guidance instead.`

export async function matchRejectionReason({ extractedText, rejectionReasons }) {
  if (!rejectionReasons.length) return null

  const knownReasons = rejectionReasons
    .map((r) => `- ${r.reason_code}: ${r.description} (Fix: ${r.fix_instructions})`)
    .join('\n')

  const response = await genAI.models.generateContent({
    model: GEMINI_MODEL,
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: `${REJECTION_MATCH_PROMPT}\n\nKNOWN REASONS:\n${knownReasons}\n\nLETTER TEXT:\n${extractedText}`,
          },
        ],
      },
    ],
    config: { responseMimeType: 'application/json' },
  })

  try {
    return JSON.parse(response.text ?? '{}')
  } catch {
    return null
  }
}
