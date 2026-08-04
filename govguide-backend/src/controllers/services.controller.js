import { supabase } from '../config/supabase.js'

export async function listServices(req, res, next) {
  try {
    const { data, error } = await supabase
      .from('services')
      .select('id, slug, name, department, description')
      .eq('active', true)
      .order('name')
    if (error) throw error
    res.status(200).json({ services: data })
  } catch (err) {
    next(err)
  }
}

export async function getServiceDetail(req, res, next) {
  try {
    const { slug } = req.params
    const { data: service, error } = await supabase
      .from('services')
      .select('id, slug, name, department, description')
      .eq('slug', slug)
      .single()
    if (error || !service) {
      return res.status(404).json({ error: 'Service not found.' })
    }

    const [{ data: requirements }, { data: eligibilityRules }, { data: rejectionReasons }] = await Promise.all([
      supabase.from('requirements').select('id, doc_type, description, mandatory, notes').eq('service_id', service.id),
      supabase.from('eligibility_rules').select('id, rule_type, condition, value').eq('service_id', service.id),
      supabase
        .from('rejection_reasons')
        .select('id, reason_code, description, fix_instructions')
        .eq('service_id', service.id),
    ])

    res.status(200).json({
      service,
      requirements: requirements ?? [],
      eligibilityRules: eligibilityRules ?? [],
      rejectionReasons: rejectionReasons ?? [],
    })
  } catch (err) {
    next(err)
  }
}
