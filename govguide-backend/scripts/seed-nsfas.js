import 'dotenv/config'
import { supabase } from '../src/config/supabase.js'
import { embedText } from '../src/services/gemini.service.js'

const REQUIREMENTS = [
  { doc_type: 'Certified copy of ID', mandatory: true, description: 'A certified copy of your South African ID, not older than 3 months.' },
  { doc_type: 'Proof of household income', mandatory: true, description: 'Payslips, UIF letter, SASSA letter, or affidavit of unemployment for all parents/guardians.' },
  { doc_type: 'Proof of registration or acceptance', mandatory: true, description: 'Confirmation of registration or a conditional acceptance letter from a public university or TVET college.' },
  { doc_type: "Parents'/guardians' certified ID copies", mandatory: true, description: 'Certified ID copies of both parents or legal guardians (or death certificate if deceased).' },
]

const ELIGIBILITY_RULES = [
  { rule_type: 'citizenship', condition: '=', value: 'South African citizen' },
  { rule_type: 'household_income', condition: '<=', value: 'R350,000 per year (combined household income)' },
  { rule_type: 'institution', condition: '=', value: 'Registered at a public university or TVET college' },
  { rule_type: 'academic_standing', condition: '>=', value: 'Meets minimum academic pass requirements set by the institution' },
]

const REJECTION_REASONS = [
  { reason_code: 'INCOME_EXCEEDS_THRESHOLD', description: 'Combined household income exceeds the R350,000 annual threshold.', fix_instructions: 'Submit an appeal with updated proof of income if your household circumstances have changed (e.g. job loss).' },
  { reason_code: 'MISSING_SUPPORTING_DOCS', description: 'One or more required documents were missing or illegible.', fix_instructions: 'Re-submit certified, legible copies of all required documents via the myNSFAS portal.' },
  { reason_code: 'NOT_REGISTERED', description: 'No valid registration or acceptance confirmation was found for the applicant.', fix_instructions: 'Ask your institution to confirm registration status with NSFAS, then follow up via the myNSFAS portal.' },
]

const KNOWLEDGE_CHUNKS = [
  {
    title: 'How to apply for NSFAS',
    content: 'Applications for NSFAS funding are submitted online via the myNSFAS portal (mynsfas.nsfas.org.za). Create an account, complete the application form, and upload all required supporting documents. Applications typically open in September for the following academic year.',
    source_url: 'https://www.nsfas.org.za',
  },
  {
    title: 'NSFAS appeals process',
    content: 'If your NSFAS application is rejected, you can submit an appeal through the myNSFAS portal within the appeal window announced by NSFAS. Appeals should include a motivation letter and any updated supporting documents relevant to the rejection reason.',
    source_url: 'https://www.nsfas.org.za',
  },
  {
    title: 'What NSFAS covers',
    content: 'NSFAS funding covers tuition fees, accommodation (or a living allowance), a book allowance, and a travel allowance where applicable, for the duration of the qualifying academic programme.',
    source_url: 'https://www.nsfas.org.za',
  },
]

async function main() {
  const { data: service, error: serviceError } = await supabase
    .from('services')
    .select('id')
    .eq('slug', 'nsfas')
    .single()

  if (serviceError || !service) {
    throw new Error('NSFAS service not found — run migration 0001 first.')
  }
  const serviceId = service.id

  const { error: reqError } = await supabase
    .from('requirements')
    .insert(REQUIREMENTS.map((r) => ({ ...r, service_id: serviceId })))
  if (reqError) throw reqError
  console.log(`Inserted ${REQUIREMENTS.length} requirements.`)

  const { error: ruleError } = await supabase
    .from('eligibility_rules')
    .insert(ELIGIBILITY_RULES.map((r) => ({ ...r, service_id: serviceId })))
  if (ruleError) throw ruleError
  console.log(`Inserted ${ELIGIBILITY_RULES.length} eligibility rules.`)

  const { error: rejError } = await supabase
    .from('rejection_reasons')
    .insert(REJECTION_REASONS.map((r) => ({ ...r, service_id: serviceId })))
  if (rejError) throw rejError
  console.log(`Inserted ${REJECTION_REASONS.length} rejection reasons.`)

  for (const chunk of KNOWLEDGE_CHUNKS) {
    const embedding = await embedText(`${chunk.title}\n${chunk.content}`)
    const { error } = await supabase.from('knowledge_chunks').insert({
      service_id: serviceId,
      title: chunk.title,
      content: chunk.content,
      source_url: chunk.source_url,
      language: 'en',
      last_verified: new Date().toISOString().slice(0, 10),
      embedding,
    })
    if (error) throw error
    console.log(`Inserted knowledge chunk: ${chunk.title}`)
  }

  console.log('NSFAS seed complete.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
