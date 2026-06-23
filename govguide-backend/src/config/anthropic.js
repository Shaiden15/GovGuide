import Anthropic from '@anthropic-ai/sdk'

const apiKey = process.env.ANTHROPIC_API_KEY

if (!apiKey) {
  console.warn('[anthropic] Missing ANTHROPIC_API_KEY env var.')
}

export const anthropic = new Anthropic({ apiKey })

export const CLAUDE_MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-4-6'