export function Landing() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      <div className="text-center max-w-lg">
        <div className="flex items-center justify-center gap-3 mb-6">
          <svg width="44" height="44" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="28" height="28" rx="7" fill="hsl(76, 100%, 60%)"/>
            <path d="M8 8.5h12v2.5H10.5v2.5H17v2.5h-6.5V20H8V8.5z" fill="hsl(265, 51%, 12%)"/>
          </svg>
          <h1 className="text-5xl font-extrabold text-foreground tracking-tight" style={{ fontFamily: 'var(--app-font-heading)' }}>fileray</h1>
        </div>
        <p className="text-lg text-muted-foreground mb-10 leading-relaxed">
          The layer on top of Google Drive that makes files findable, permissions readable, and team access transparent.
        </p>
        <button 
          className="bg-primary text-primary-foreground px-8 py-3.5 rounded-full font-bold text-base hover:opacity-90 transition-all hover:-translate-y-0.5"
          onClick={() => window.location.href = '/api/auth/google'}
        >
          Connect your Drive
        </button>
      </div>
    </div>
  );
}
