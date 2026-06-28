import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

const POLICY_VERSION = '1.0'
const EFFECTIVE_DATE = '1 June 2026'
const CONTROLLER = 'RemitFlow Ltd'
const DPO_EMAIL = 'privacy@remitflow.app'

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="space-y-3">
      <h2 className="text-base font-bold text-white">{title}</h2>
      <div className="text-sm text-white/55 leading-relaxed space-y-3">{children}</div>
    </section>
  )
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen pb-16" style={{ background: '#080706' }}>

      {/* Header */}
      <div className="sticky top-0 z-40" style={{ background: 'rgba(8,7,6,0.90)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center gap-3">
          <Link href="/" className="w-9 h-9 flex items-center justify-center rounded-full text-white/70 hover:text-white transition-colors" style={{ background: 'rgba(255,255,255,0.08)' }}>
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <span className="font-bold text-white">Privacy Policy</span>
            <span className="ml-2 text-xs text-white/35">v{POLICY_VERSION} · Effective {EFFECTIVE_DATE}</span>
          </div>
        </div>
      </div>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-8">

        {/* Intro */}
        <div className="rounded-3xl p-5 space-y-2" style={{ background: 'rgba(19,38,253,0.10)', border: '1px solid rgba(19,38,253,0.20)' }}>
          <p className="text-sm text-white/70">
            <strong className="text-white">{CONTROLLER}</strong> ("RemitFlow", "we", "us") is the data controller
            for personal information processed through this service. This policy explains what we collect,
            why we collect it, who we share it with, and your rights under UK GDPR and the Data Protection
            Act 2018.
          </p>
          <p className="text-xs text-white/40">Data Protection Officer: <a href={`mailto:${DPO_EMAIL}`} className="text-[#7B8CFF] underline">{DPO_EMAIL}</a></p>
        </div>

        <div className="rounded-3xl p-5 space-y-8" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>

          <Section id="data-we-collect" title="1. Data we collect">
            <p><strong className="text-white">Identity data:</strong> name, date of birth, nationality, government-issued ID number and document image, selfie photograph.</p>
            <p><strong className="text-white">Contact data:</strong> email address, phone number, postal address.</p>
            <p><strong className="text-white">Financial data:</strong> transfer amounts, currencies, recipient details, payment method details.</p>
            <p><strong className="text-white">Biometric data:</strong> facial geometry captured during identity verification liveness check (Article 9 special category data). Processed only with your explicit consent.</p>
            <p><strong className="text-white">Device and technical data:</strong> IP address, browser type, device fingerprint (derived from IP subnet and user agent), session identifiers, login timestamps.</p>
            <p><strong className="text-white">Usage data:</strong> pages visited, actions taken within the app.</p>
          </Section>

          <Section id="legal-basis" title="2. Legal basis for processing">
            <p><strong className="text-white">Contract (Art. 6(1)(b)):</strong> processing your identity, contact, and financial data to provide the money transfer service you have contracted with us for.</p>
            <p><strong className="text-white">Legal obligation (Art. 6(1)(c)):</strong> customer due diligence, sanctions screening, and transaction monitoring required by the Money Laundering Regulations 2017 and Payment Services Regulations 2017. Transaction records retained 5 years post-relationship end.</p>
            <p><strong className="text-white">Legitimate interests (Art. 6(1)(f)):</strong> fraud prevention, security monitoring, account abuse detection, and improving our service.</p>
            <p><strong className="text-white">Explicit consent (Art. 9(2)(a)):</strong> biometric data processing during liveness verification. You may withdraw this consent at any time — withdrawal does not affect processing already carried out and will require us to use alternative manual identity verification.</p>
          </Section>

          <Section id="data-sharing" title="3. Who we share data with">
            <p>We share data only with the following categories of sub-processors, each under a Data Processing Agreement:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li><strong className="text-white">Twilio Inc.</strong> — SMS delivery (phone verification codes). US-based, EU-US Data Privacy Framework.</li>
              <li><strong className="text-white">Resend Inc.</strong> — transactional email. US-based, standard contractual clauses.</li>
              <li><strong className="text-white">Stripe Inc.</strong> — payment processing. EU data localisation available.</li>
              <li><strong className="text-white">OpenSanctions</strong> — sanctions and PEP screening. Data minimised to name, DOB, nationality only.</li>
              <li><strong className="text-white">Mobile money providers</strong> (MTN, Safaricom, Airtel, Orange, Wave) — transfer disbursement to recipient. Only recipient name and mobile number shared.</li>
            </ul>
            <p>We do not sell your data to third parties or use it for advertising.</p>
          </Section>

          <Section id="international-transfers" title="4. International transfers">
            <p>Some sub-processors are based outside the UK. Where data is transferred to countries without an adequacy decision, we rely on UK International Data Transfer Agreements (IDTAs) or the UK addendum to the EU Standard Contractual Clauses.</p>
          </Section>

          <Section id="retention" title="5. How long we keep data">
            <p><strong className="text-white">Transaction records:</strong> 5 years from the date of the transaction, as required by Regulation 40 of the Money Laundering Regulations 2017.</p>
            <p><strong className="text-white">KYC documents and identity records:</strong> 5 years from the end of the business relationship.</p>
            <p><strong className="text-white">Security logs (login attempts, session records):</strong> 12 months.</p>
            <p><strong className="text-white">Marketing preferences:</strong> until you withdraw consent.</p>
            <p><strong className="text-white">Biometric data (liveness images):</strong> deleted upon completion of the verification check. We do not store raw biometric images beyond the verification session.</p>
          </Section>

          <Section id="your-rights" title="6. Your rights">
            <p>Under UK GDPR you have the right to:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li><strong className="text-white">Access</strong> — request a copy of your personal data (Article 15). Available via Settings → Export data.</li>
              <li><strong className="text-white">Rectification</strong> — correct inaccurate data (Article 16).</li>
              <li><strong className="text-white">Erasure</strong> — request deletion of your account (Article 17). Available via Settings → Delete account. Note: AML records are retained as required by law.</li>
              <li><strong className="text-white">Portability</strong> — receive your data in a machine-readable format (Article 20). Available via Settings → Export data.</li>
              <li><strong className="text-white">Restriction</strong> — restrict processing in certain circumstances (Article 18).</li>
              <li><strong className="text-white">Object</strong> — object to processing based on legitimate interests (Article 21).</li>
              <li><strong className="text-white">Withdraw consent</strong> — for biometric data processing at any time via Settings.</li>
            </ul>
            <p>To exercise any right, contact <a href={`mailto:${DPO_EMAIL}`} className="text-[#7B8CFF] underline">{DPO_EMAIL}</a>. We will respond within 30 days.</p>
            <p>You have the right to lodge a complaint with the <strong className="text-white">Information Commissioner's Office (ICO)</strong> at <a href="https://ico.org.uk" className="text-[#7B8CFF] underline" target="_blank" rel="noopener">ico.org.uk</a>.</p>
          </Section>

          <Section id="cookies" title="7. Cookies and session storage">
            <p>We use a single httpOnly, SameSite=Strict session cookie (<code className="text-[#7B8CFF] text-xs">rf_session</code>) strictly necessary for authentication. We do not use advertising, analytics, or tracking cookies. No cookie consent banner is displayed because we do not set non-essential cookies.</p>
          </Section>

          <Section id="security" title="8. Security measures">
            <p>Personal data is protected by: encrypted HTTPS transport (TLS 1.2+), bcrypt password hashing (cost factor 12), httpOnly session cookies with revocation, device fingerprinting for anomaly detection, rate limiting on all authentication endpoints, and AML transaction monitoring.</p>
          </Section>

          <Section id="changes" title="9. Changes to this policy">
            <p>Material changes will be notified by email at least 30 days before taking effect. The current version number and effective date are shown at the top of this page.</p>
          </Section>

        </div>

        <div className="text-center text-xs text-white/25 pb-4">
          {CONTROLLER} · Privacy Policy v{POLICY_VERSION} · Effective {EFFECTIVE_DATE}
        </div>
      </main>
    </div>
  )
}
