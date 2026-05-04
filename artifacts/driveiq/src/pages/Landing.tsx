export function Landing() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      <div className="text-center max-w-md">
        <h1 className="text-4xl font-bold text-foreground mb-4">DriveIQ</h1>
        <p className="text-lg text-muted-foreground mb-8">
          Your mission control center for Google Drive. Find files instantly, manage permissions transparently, and organize your digital workspace.
        </p>
        <button 
          className="bg-primary text-primary-foreground px-6 py-3 rounded-md font-medium hover:bg-primary/90 transition-colors"
          onClick={() => window.location.href = '/api/auth/google'}
        >
          Connect Google Drive
        </button>
      </div>
    </div>
  );
}
