import { Link } from "wouter";
import { CheckCircle2, XCircle } from "lucide-react";

export function CheckoutSuccess() {
  return (
    <div className="min-h-screen bg-[#1c0f2e] text-[#f0e8ff] flex items-center justify-center p-6" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div className="max-w-md text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#c9ff33]/15 border border-[#c9ff33]/30 mb-6">
          <CheckCircle2 className="h-8 w-8 text-[#c9ff33]" />
        </div>
        <h1 className="text-3xl font-extrabold text-white mb-3" style={{ fontFamily: "'Bricolage Grotesque', sans-serif", letterSpacing: "-0.02em" }}>
          You're in
        </h1>
        <p className="text-[#a08ec0] mb-8">Your 14-day free trial is active. Next, sign in with Google to connect your Drive and finish setup.</p>
        <a
          href="/api/auth/google"
          className="inline-block bg-[#c9ff33] text-[#1c0f2e] px-7 py-3 rounded-full font-bold hover:opacity-90 transition-opacity"
        >
          Continue with Google →
        </a>
        <div className="mt-6">
          <Link href="/" className="text-sm text-[#a08ec0] hover:text-white">Back to homepage</Link>
        </div>
      </div>
    </div>
  );
}

export function CheckoutCancel() {
  return (
    <div className="min-h-screen bg-[#1c0f2e] text-[#f0e8ff] flex items-center justify-center p-6" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div className="max-w-md text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/5 border border-white/10 mb-6">
          <XCircle className="h-8 w-8 text-[#a08ec0]" />
        </div>
        <h1 className="text-3xl font-extrabold text-white mb-3" style={{ fontFamily: "'Bricolage Grotesque', sans-serif", letterSpacing: "-0.02em" }}>
          Checkout cancelled
        </h1>
        <p className="text-[#a08ec0] mb-8">No card was charged. Whenever you're ready, you can start your free trial again.</p>
        <Link
          href="/"
          className="inline-block bg-[#c9ff33] text-[#1c0f2e] px-7 py-3 rounded-full font-bold hover:opacity-90 transition-opacity"
        >
          Back to fileray.io
        </Link>
      </div>
    </div>
  );
}
