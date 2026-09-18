import 'dotenv/config'
import { supabase } from '../src/config/supabase.js'

// Sourced directly from the official NSFAS "Eligibility Criteria and Conditions
// for Financial Aid — Policy Standard, 2026 Academic Year" document, approved
// by the NSFAS Board and the Minister of Higher Education.
const NSFAS_SOURCE = 'https://www.nsfas.org.za/content/downloads/Annexure%20A_NSFAS%202026%20Bursary%20Guidelines.pdf'
const NSFAS_HOME = 'https://www.nsfas.org.za'

const REQUIREMENTS = [
  { doc_type: 'Certified copy of ID or birth certificate', mandatory: true, description: 'A valid South African ID number is required. Both SA citizens and permanent residents may apply.' },
  { doc_type: 'NSFAS Consent Form', mandatory: true, description: 'Signed by the applicant\'s declared parent(s), guardian, or verified parental relationship. Gives NSFAS permission to verify household income with third parties (SARS, credit bureaus). Non-submission of a complete, accurate, signed Consent Form results in automatic rejection.' },
  { doc_type: 'NSFAS Declaration Form', mandatory: true, description: 'Attests to the accuracy and completeness of all information provided. Not required for an "Independent Learner" (unmarried, economically self-sufficient applicant).' },
  { doc_type: 'Proof of household income', mandatory: true, description: 'Required for non-SASSA applicants. Only a SARS ITA34 is accepted as proof of income if the application is later appealed — affidavits are not accepted as appeal evidence.' },
  { doc_type: 'Proof of registration at a public institution', mandatory: true, description: 'Confirmation of registration for an NSFAS-approved qualification at a public university or public TVET college. NSFAS does not fund students at private institutions.' },
  { doc_type: 'Disability Annexure Form', mandatory: false, description: 'Required only to access the R600,000 household income threshold and disability-specific allowances (assistive devices, human support, etc.), which are not granted automatically.' },
]

const ELIGIBILITY_RULES = [
  { rule_type: 'citizenship', condition: '=', value: 'South African citizen OR permanent resident, with a valid SA ID number' },
  { rule_type: 'institution_type', condition: '=', value: 'Registered at a public university or public TVET college only (not private institutions)' },
  { rule_type: 'qualification_level', condition: '<=', value: 'Undergraduate or certificate qualifications only, up to NQF Level 8 — no postgraduate funding' },
  { rule_type: 'first_qualification_only', condition: '=', value: 'Must be studying towards a first certificate or first undergraduate qualification — a second undergraduate/certificate or any postgraduate study is not funded' },
  { rule_type: 'household_income_standard', condition: '<=', value: 'R350,000 per year combined household income (non-SASSA applicants without a registered disability)' },
  { rule_type: 'household_income_disability', condition: '<=', value: 'R600,000 per year combined household income (applicants with a registered disability)' },
  { rule_type: 'sassa_auto_qualify', condition: '=', value: 'Confirmed recipients of the SASSA Foster Care, Care Dependency, or Child Support grant automatically meet financial eligibility (SRD grant recipients are excluded from this automatic qualification)' },
  { rule_type: 'academic_progression_university', condition: '>=', value: 'Non-first-time university students must pass at least 50% of their total registered modules in a year to remain funded the next year' },
  { rule_type: 'academic_progression_tvet', condition: '>=', value: 'Non-first-time TVET students must pass at least 70% of total enrolled modules/courses in a year to remain funded the next year' },
  { rule_type: 'n_plus_rule', condition: '<=', value: 'Funding is capped at N+1 years beyond the minimum time to complete a qualification (N+2 for students with disabilities). Distance-learning students get double the minimum time (N).' },
  { rule_type: 'no_double_funding', condition: '=', value: 'Cannot be funded if already receiving a full bursary/scholarship from another source covering the full cost of study; must declare partial funding from other sources within 10 business days' },
  { rule_type: 'one_qualification_only', condition: '=', value: 'A student can only be funded for one qualification at one institution at any one time' },
]

const REJECTION_REASONS = [
  { reason_code: 'INCOME_EXCEEDS_THRESHOLD', description: 'Combined household income exceeds R350,000 per year (or R600,000 for applicants with a registered disability).', fix_instructions: 'Appeal within 30 working days via the myNSFAS portal. Appeals for this reason are only considered if: your household\'s financial circumstances have genuinely changed since applying (with evidence), you can prove your income is actually below the threshold, a key income contributor has become incapacitated or died, or a court has declared you independent of your parents.' },
  { reason_code: 'MISSING_CONSENT_FORM', description: 'The NSFAS Consent Form was not submitted, or was incomplete/unsigned — this results in automatic rejection because NSFAS cannot verify household income without it.', fix_instructions: 'Re-submit a complete, accurate, and duly signed Consent Form via the myNSFAS portal within 30 working days of the request.' },
  { reason_code: 'INCOMPLETE_APPLICATION', description: 'The application was missing required forms or documents and could not be assessed for funding eligibility.', fix_instructions: 'Applicants have 30 working days from the request to submit outstanding information. Ensure the Consent Form, Declaration Form, and all required documents are complete and legible.' },
  { reason_code: 'NOT_REGISTERED', description: 'No valid registration record was found for the applicant at a public university or TVET college for an NSFAS-approved qualification.', fix_instructions: 'Confirm with your institution that they have submitted your registration data to NSFAS, then follow up via the myNSFAS portal.' },
  { reason_code: 'ALREADY_HAS_QUALIFICATION', description: 'The applicant has already obtained an undergraduate or certificate qualification and NSFAS generally only funds a first undergraduate/certificate qualification. Postgraduate study is never funded.', fix_instructions: 'This is generally not appealable under current policy — NSFAS does not fund a second undergraduate/certificate qualification or any postgraduate qualification.' },
  { reason_code: 'FAILED_ACADEMIC_PROGRESSION', description: 'The student did not pass the required percentage of modules to remain funded (50% for university students, 70% for TVET students).', fix_instructions: 'Continuing students (not first-time) may appeal via the myNSFAS portal, but only with proof of severe illness (2+ consecutive months), death of an immediate family member, being a victim of serious violent crime (with an institution propensity letter), a qualifying disability with a medical report, or evidence that NSFAS received incorrect results.' },
  { reason_code: 'EXCEEDED_N_PLUS_RULE', description: 'The student has exceeded the maximum funded duration (N+1 years beyond the minimum qualification time, or N+2 for students with disabilities).', fix_instructions: 'Appeal via the myNSFAS portal with proof of severe illness, death of an immediate family member, being a victim of violent crime, a qualifying disability, or (for university students) proof that 50% or less of final-year credits remain, or (for TVET students) proof that 2 or fewer Report 191 subjects or 3 or fewer NC(V) subjects remain.' },
]

const FAQ_ENTRIES = [
  {
    question: 'Who is eligible for NSFAS?',
    answer: 'South African citizens and permanent residents with a valid SA ID, registered for an NSFAS-approved undergraduate or certificate qualification at a public university or TVET college. Your combined household income must be R350,000 or less per year (R600,000 for applicants with a registered disability), or you must be a confirmed recipient of the SASSA Foster Care, Care Dependency, or Child Support grant (SRD grant does not automatically qualify). NSFAS generally only funds your first undergraduate or certificate qualification — not a second one, and not postgraduate study.',
    source_url: NSFAS_SOURCE,
  },
  {
    question: 'How do I apply for NSFAS?',
    answer: 'Applications are submitted online via the myNSFAS portal. You must submit a complete, accurate application including a signed NSFAS Consent Form (which lets NSFAS verify your household income with SARS and other sources) and a Declaration Form. Incomplete applications are not accepted into the system and will not be assessed. If NSFAS requests outstanding information, you have 30 working days to provide it.',
    source_url: NSFAS_SOURCE,
  },
  {
    question: 'What does NSFAS funding cover?',
    answer: 'For eligible students, NSFAS pays tuition fees in full (based on the institution\'s approved fee handbook, with no registration fee charged separately) directly to the institution. Students may also receive a learning material allowance, a living allowance (for food and incidentals, if not in catered accommodation), and either an accommodation allowance or a transport allowance (not both). Exact allowance amounts are published annually by NSFAS in the NSFAS handbook, so always check the current year\'s published rates.',
    source_url: NSFAS_SOURCE,
  },
  {
    question: 'What is the N+ rule?',
    answer: 'The N+ rule limits how many years NSFAS will fund your studies. "N" is the minimum time needed to complete your qualification. Most students are funded up to N+1 (one extra year beyond the minimum), while students with disabilities are funded up to N+2. If you\'re a distance-learning student at a non-contact university, your "N" is double the normal minimum time. Once you exceed your N+ limit, you can no longer be funded unless a successful appeal is granted.',
    source_url: NSFAS_SOURCE,
  },
  {
    question: 'What is the NSFAS appeals process?',
    answer: 'If rejected, you can appeal via the myNSFAS portal within 30 working days of receiving your outcome. You get two opportunities to upload the correct supporting documents — failing both closes the appeal. What counts as valid evidence depends on the rejection reason: income-threshold appeals need proof your financial circumstances changed (only a SARS ITA34 is accepted as proof of income, not affidavits); academic or N+ rule appeals need proof of serious illness, a death in the immediate family, being a crime victim, or a qualifying disability. You cannot appeal if you\'re registered for a qualification NSFAS doesn\'t fund, or if you\'ve already reached N+2 (N+3 for students with disabilities).',
    source_url: NSFAS_SOURCE,
  },
  {
    question: 'Can I keep receiving NSFAS funding every year without reapplying?',
    answer: 'If you remain both financially and academically eligible, continuing students generally do not need to reapply annually. However, NSFAS reassesses your eligibility each academic term and can withdraw funding if you no longer qualify — for example, if you fail to meet the pass-rate requirement (50% of modules for university, 70% for TVET) or exceed the N+ rule. If you switch institution type (TVET to university or vice versa) or change qualification, you must reapply.',
    source_url: NSFAS_SOURCE,
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

  // Idempotent: clear this service's seeded rows before re-inserting, so the
  // script can be safely re-run in a dev environment.
  await supabase.from('requirements').delete().eq('service_id', serviceId)
  await supabase.from('eligibility_rules').delete().eq('service_id', serviceId)
  await supabase.from('rejection_reasons').delete().eq('service_id', serviceId)
  await supabase.from('faq_entries').delete().eq('service_id', serviceId)

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

  const { error: faqError } = await supabase.from('faq_entries').insert(
    FAQ_ENTRIES.map((f) => ({
      ...f,
      service_id: serviceId,
      language: 'en',
      last_verified: new Date().toISOString().slice(0, 10),
    }))
  )
  if (faqError) throw faqError
  console.log(`Inserted ${FAQ_ENTRIES.length} FAQ entries.`)

  console.log('NSFAS seed complete — sourced from official NSFAS 2026 Eligibility Criteria policy document.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
