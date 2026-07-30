import { supabase } from '../config/supabase.js'
import { embedText, generateChatReply } from '../services/gemini.service.js'

const HISTORY_LIMIT = 10
const MATCH_COUNT = 5

export async function postMessage(req, res, next) {
  try {
    const { message, sessionId, serviceSlug } = req.body
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'message is required.' })
    }

    let session
    if (sessionId) {
      const { data, error } = await supabase
        .from('sessions')
        .select('id, service_id, user_id')
        .eq('id', sessionId)
        .single()
      if (error || !data || data.user_id !== req.user.id) {
        return res.status(404).json({ error: 'Session not found.' })
      }
      session = data
    } else {
      let serviceId = null
      if (serviceSlug) {
        const { data: service } = await supabase
          .from('services')
          .select('id')
          .eq('slug', serviceSlug)
          .single()
        serviceId = service?.id ?? null
      }
      const { data, error } = await supabase
        .from('sessions')
        .insert({ user_id: req.user.id, service_id: serviceId })
        .select('id, service_id, user_id')
        .single()
      if (error) throw error
      session = data
    }

    const { data: history } = await supabase
      .from('messages')
      .select('role, content')
      .eq('session_id', session.id)
      .order('created_at', { ascending: true })
      .limit(HISTORY_LIMIT)

    const queryEmbedding = await embedText(message)

    let contextBlocks = []
    if (queryEmbedding) {
      const { data: matches, error: matchError } = await supabase.rpc('match_knowledge_chunks', {
        query_embedding: queryEmbedding,
        match_count: MATCH_COUNT,
        filter_service_id: session.service_id,
      })
      if (matchError) throw matchError
      contextBlocks = matches ?? []
    }

    const { text: reply, webSources } = await generateChatReply({
      contextBlocks,
      history: history ?? [],
      userMessage: message,
    })

    const sources = [
      ...contextBlocks.map((c) => ({ id: c.id, title: c.title, source_url: c.source_url })),
      ...webSources.map((w) => ({ title: w.title, source_url: w.uri, live: true })),
    ]

    const { error: insertError } = await supabase.from('messages').insert([
      { session_id: session.id, role: 'user', content: message },
      { session_id: session.id, role: 'assistant', content: reply, sources },
    ])
    if (insertError) throw insertError

    res.status(200).json({ sessionId: session.id, reply, sources })

    // Cache what Gemini found on the web so future similar questions are
    // answered from the knowledge base instead of searching again.
    if (webSources.length > 0) {
      cacheWebFinding({ serviceId: session.service_id, question: message, answer: reply, webSources }).catch(
        (err) => console.error('[chat] failed to cache web finding:', err)
      )
    }
  } catch (err) {
    next(err)
  }
}

async function cacheWebFinding({ serviceId, question, answer, webSources }) {
  const embedding = await embedText(`${question}\n${answer}`)
  if (!embedding) return

  await supabase.from('knowledge_chunks').insert({
    service_id: serviceId,
    title: question.slice(0, 120),
    content: answer,
    source_url: webSources[0]?.uri ?? null,
    language: 'en',
    last_verified: new Date().toISOString().slice(0, 10),
    embedding,
  })
}
