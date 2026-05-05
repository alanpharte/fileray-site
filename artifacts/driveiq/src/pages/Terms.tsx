import { Link } from "wouter";

export function Terms() {
  return (
    <div className="min-h-screen bg-[#1c0f2e] text-[#f0e8ff]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div className="max-w-3xl mx-auto px-6 py-16">
        <Link href="/" className="text-[#c9ff33] text-sm hover:underline">← Back to fileray.io</Link>
        <h1 className="text-4xl font-extrabold mt-6 mb-2 text-white" style={{ fontFamily: "'Bricolage Grotesque', sans-serif", letterSpacing: "-0.02em" }}>Terms of Service</h1>
        <p className="text-[#a08ec0] mb-10">Last updated: 5 May 2026</p>

        <section className="space-y-6 text-[#f0e8ff]/90 leading-relaxed">
          <div>
            <h2 className="text-xl font-bold text-white mb-2">1. The service</h2>
            <p>Fileray is a software-as-a-service tool that connects to your Google Drive via OAuth and provides a complementary interface for searching, auditing, and organising your files. By creating an account, you agree to these terms.</p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-white mb-2">2. Free trial and billing</h2>
            <ul className="list-disc ml-6 space-y-2">
              <li>New customers get a 14-day free trial of the Solo plan. We collect your card via Stripe at signup but won't charge during the trial.</li>
              <li>After the trial ends, your card will be charged the listed monthly Solo price unless you cancel before the trial expires.</li>
              <li>Subscriptions renew monthly until cancelled. You can cancel at any time from the Settings page; cancellation takes effect at the end of the current billing period.</li>
              <li>We don't offer pro-rata refunds for partial months. If something goes wrong, email <a className="text-[#c9ff33] underline" href="mailto:billing@fileray.io">billing@fileray.io</a> and we'll do the right thing.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-bold text-white mb-2">3. Acceptable use</h2>
            <p>Don't use Fileray to access Google Drives you don't have permission to access, to harvest other users' data, to violate any law, or to interfere with the service. We may suspend accounts that abuse the service.</p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-white mb-2">4. Your data and your account</h2>
            <p>You own your Drive data — Fileray never claims ownership of any file. You can disconnect or delete your Fileray account at any time. See our <Link className="text-[#c9ff33] underline" href="/privacy">Privacy Policy</Link> for what we collect and how it's stored.</p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-white mb-2">5. Service availability</h2>
            <p>We aim for high uptime but don't guarantee uninterrupted service. Fileray depends on Google Drive's API; if Google has an outage, parts of Fileray will be affected.</p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-white mb-2">6. Liability</h2>
            <p>To the fullest extent permitted by law, Fileray's total liability for any claim relating to the service is limited to the amount you paid us in the 12 months before the claim. We are not liable for indirect or consequential damages.</p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-white mb-2">7. Changes</h2>
            <p>We may update these terms from time to time. If a change is material, we'll email you at least 14 days before it takes effect.</p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-white mb-2">8. Contact</h2>
            <p>Questions: <a className="text-[#c9ff33] underline" href="mailto:hello@fileray.io">hello@fileray.io</a></p>
          </div>
        </section>

        <div className="mt-16 pt-8 border-t border-white/10 text-sm text-[#5c4880]">
          © 2026 Fileray. Not affiliated with Google.
        </div>
      </div>
    </div>
  );
}
