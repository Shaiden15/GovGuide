import { supabase } from '../config/supabase.js'

// Broaden a free-text query into an OR-matched tsquery so results surface on
// ANY meaningful word matching, not just when every word is present.
function toOrTsQuery(q) {
  const words = q
    .trim()
    .split(/\s+/)
    .map((w) => w.replace(/[^\w]/g, ''))
    .filter((w) => w.length > 1)
  if (!words.length) return null
  return words.map((w) => `${w}:*`).join(' | ')
}

export async function searchFaq(req, res, next) {
  try {
    const { q, serviceSlug } = req.query
    if (!q || !q.trim()) {
      return res.status(400).json({ error: 'q (search query) is required.' })
    }

    const tsQuery = toOrTsQuery(q)
    if (!tsQuery) return res.status(200).json({ results: [] })

    let serviceId = null
    if (serviceSlug) {
      const { data: service } = await supabase.from('services').select('id').eq('slug', serviceSlug).single()
      serviceId = service?.id ?? null
    }

    // 1. Curated FAQ entries, ranked by relevance — best match first.
    const { data: faqMatches, error: faqError } = await supabase.rpc('search_faq_entries', {
      tsquery_string: tsQuery,
      filter_service_id: serviceId,
      match_count: 5,
    })
    if (faqError) throw faqError

    const results = (faqMatches ?? []).map((r) => ({
      type: 'faq',
      question: r.question,
      answer: r.answer,
      sourceUrl: r.source_url,
    }))

    // 2. Fall back to (or supplement with) structured data — requirements,
    // eligibility rules, rejection reasons — so questions not covered by a
    // curated FAQ entry still surface something useful, scoped to a service.
    if (results.length < 2 && serviceId) {
      const like = `%${q.trim()}%`

      const [{ data: requirements }, { data: eligibilityRules }, { data: rejectionReasons }] = await Promise.all([
        supabase
          .from('requirements')
          .select('doc_type, description')
          .eq('service_id', serviceId)
          .or(`doc_type.ilike.${like},description.ilike.${like}`),
        supabase
          .from('eligibility_rules')
          .select('rule_type, condition, value')
          .eq('service_id', serviceId)
          .or(`rule_type.ilike.${like},value.ilike.${like}`),
        supabase
          .from('rejection_reasons')
          .select('description, fix_instructions')
          .eq('service_id', serviceId)
          .or(`description.ilike.${like},fix_instructions.ilike.${like}`),
      ])

      for (const r of requirements ?? []) {
        results.push({ type: 'requirement', question: `Do I need: ${r.doc_type}?`, answer: r.description })
      }
      for (const r of eligibilityRules ?? []) {
        results.push({
          type: 'eligibility',
          question: `Eligibility — ${r.rule_type.replace(/_/g, ' ')}`,
          answer: `${r.condition} ${r.value}`,
        })
      }
      for (const r of rejectionReasons ?? []) {
        results.push({ type: 'rejection', question: r.description, answer: r.fix_instructions })
      }
    }

    res.status(200).json({ results: results.slice(0, 10) })
  } catch (err) {
    next(err)
  }
}
