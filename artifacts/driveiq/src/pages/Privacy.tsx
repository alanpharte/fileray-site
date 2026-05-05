import { Link } from "wouter";

export function Privacy() {
  return (
    <div className="min-h-screen bg-[#1c0f2e] text-[#f0e8ff]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div className="max-w-3xl mx-auto px-6 py-16">
        <Link href="/" className="text-[#c9ff33] text-sm hover:underline">← Back to fileray.io</Link>
        <h1 className="text-4xl font-extrabold mt-6 mb-2 text-white" style={{ fontFamily: "'Bricolage Grotesque', sans-serif", letterSpacing: "-0.02em" }}>Privacy Policy</h1>
        <p className="text-[#a08ec0] mb-10">Last updated: 5 May 2026</p>

        <section className="space-y-6 text-[#f0e8ff]/90 leading-relaxed">
          <div>
            <h2 className="text-xl font-bold text-white mb-2">Who we are</h2>
            <p>Fileray ("we", "us") provides a software layer on top of Google Drive that helps you find files, audit permissions, and tidy up your storage. This policy explains what data we access, why, and what we do (and don't do) with it.</p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-white mb-2">Google user data — Limited Use disclosure</h2>
            <p>Fileray's use and transfer of information received from Google APIs adheres to the <a className="text-[#c9ff33] underline" href="https://developers.google.com/terms/api-services-user-data-policy">Google API Services User Data Policy</a>, including the Limited Use requirements.</p>
            <ul className="list-disc ml-6 mt-3 space-y-2">
              <li>We request the narrow <code className="bg-[#2e1b50] px-1.5 py-0.5 rounded text-[#c9ff33]">drive.file</code> scope, which only grants access to files you create or open through Fileray.</li>
              <li>We do <strong>not</strong> use your Drive data for advertising.</li>
              <li>We do <strong>not</strong> sell your Drive data to third parties.</li>
              <li>We do <strong>not</strong> let humans read your Drive data, except where required to fix a bug you report, comply with the law, or address a security incident.</li>
              <li>We do <strong>not</strong> use your Drive data to train AI models.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-bold text-white mb-2">What we collect</h2>
            <ul className="list-disc ml-6 space-y-2">
              <li><strong>Account data</strong> — your email, display name, profile photo, and a Google refresh token (encrypted at rest).</li>
              <li><strong>Drive metadata</strong> — file names, owners, permissions, and folder structure for files in scope. We do not download or store file contents.</li>
              <li><strong>Billing data</strong> — your Stripe customer ID and subscription status. Card numbers are handled by Stripe and never reach our servers.</li>
              <li><strong>Usage data</strong> — basic logs (request timing, error rates) to keep the service healthy.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-bold text-white mb-2">How we use it</h2>
            <p>Drive metadata is fetched on demand to populate the Fileray UI and is cached briefly to speed up repeated views. Billing data is used to manage your subscription and trial. We do not share, sell, or rent your data to third parties.</p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-white mb-2">Sub-processors</h2>
            <ul className="list-disc ml-6 space-y-1">
              <li>Google LLC — for the underlying Drive API.</li>
              <li>Stripe Inc. — for payment processing.</li>
              <li>Replit Inc. — for hosting and database.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-bold text-white mb-2">Your rights</h2>
            <p>You can disconnect Fileray from your Google account at any time at <a className="text-[#c9ff33] underline" href="https://myaccount.google.com/permissions">myaccount.google.com/permissions</a>. To delete your Fileray account and all stored data, email <a className="text-[#c9ff33] underline" href="mailto:privacy@fileray.io">privacy@fileray.io</a>. We respond within 30 days.</p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-white mb-2">Contact</h2>
            <p>Questions: <a className="text-[#c9ff33] underline" href="mailto:privacy@fileray.io">privacy@fileray.io</a></p>
          </div>
        </section>

        <div className="mt-16 pt-8 border-t border-white/10 text-sm text-[#5c4880]">
          © 2026 Fileray. Not affiliated with Google.
        </div>
      </div>
    </div>
  );
}
