import { GoogleGenAI } from '@google/genai'

const apiKey = process.env.GEMINI_API_KEY

if (!apiKey) {
  console.warn('[gemini] Missing GEMINI_API_KEY env var.')
}

export const genAI = new GoogleGenAI({ apiKey })

export const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-flash-latest'
