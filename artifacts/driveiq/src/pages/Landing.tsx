import { useEffect, useRef } from "react";
import "./landing.css";

const LOGIN_URL = "/api/auth/google";

function NavLogo() {
  return (
    <svg width="152" height="32" viewBox="0 0 152 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <clipPath id="nav-mark-clip">
          <rect width="32" height="32" rx="7"/>
        </clipPath>
      </defs>
      <g clipPath="url(#nav-mark-clip)">
        <rect width="32" height="32" fill="#c9ff33"/>
        <rect x="6.4" y="5.3" width="5.3" height="21.3" rx="0.7" fill="#1c0f2e"/>
        <rect x="6.4" y="5.3" width="17.8" height="5.3" rx="0.7" fill="#1c0f2e"/>
        <rect x="6.4" y="14.2" width="12.8" height="4.6" rx="0.7" fill="#1c0f2e"/>
        <line x1="24.2" y1="7.8" x2="29.2" y2="2.1" stroke="#1c0f2e" strokeWidth="1.8" strokeLinecap="round"/>
        <line x1="24.2" y1="7.8" x2="30.5" y2="7.8" stroke="#1c0f2e" strokeWidth="1.8" strokeLinecap="round"/>
        <line x1="24.2" y1="7.8" x2="29.2" y2="13.5" stroke="#1c0f2e" strokeWidth="1.8" strokeLinecap="round"/>
      </g>
      <text x="44" y="23" fontFamily="'Bricolage Grotesque', Arial Black, sans-serif" fontWeight="800" fontSize="20" fill="#0b0718" letterSpacing="-0.8">fileray</text>
      <text x="42" y="21" fontFamily="'Bricolage Grotesque', Arial Black, sans-serif" fontWeight="800" fontSize="20" fill="#ffffff" letterSpacing="-0.8">fileray</text>
    </svg>
  );
}

function FooterLogo() {
  return (
    <svg width="130" height="28" viewBox="0 0 130 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <clipPath id="foot-mark-clip">
          <rect width="28" height="28" rx="6"/>
        </clipPath>
      </defs>
      <g clipPath="url(#foot-mark-clip)">
        <rect width="28" height="28" fill="#c9ff33"/>
        <rect x="5.6" y="4.7" width="4.7" height="18.7" rx="0.6" fill="#1c0f2e"/>
        <rect x="5.6" y="4.7" width="15.6" height="4.7" rx="0.6" fill="#1c0f2e"/>
        <rect x="5.6" y="12.4" width="11.2" height="4.0" rx="0.6" fill="#1c0f2e"/>
        <line x1="21.2" y1="6.8" x2="25.6" y2="1.9" stroke="#1c0f2e" strokeWidth="1.6" strokeLinecap="round"/>
        <line x1="21.2" y1="6.8" x2="26.7" y2="6.8" stroke="#1c0f2e" strokeWidth="1.6" strokeLinecap="round"/>
        <line x1="21.2" y1="6.8" x2="25.6" y2="11.8" stroke="#1c0f2e" strokeWidth="1.6" strokeLinecap="round"/>
      </g>
      <text x="39" y="21" fontFamily="'Bricolage Grotesque', Arial Black, sans-serif" fontWeight="800" fontSize="18" fill="#0b0718" letterSpacing="-0.7">fileray</text>
      <text x="37" y="19" fontFamily="'Bricolage Grotesque', Arial Black, sans-serif" fontWeight="800" fontSize="18" fill="#ffffff" letterSpacing="-0.7">fileray</text>
    </svg>
  );
}

export function Landing() {
  const pageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!pageRef.current) return;
    const els = pageRef.current.querySelectorAll(".reveal");
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("on");
            obs.unobserve(e.target);
          }
        });
      },
      { threshold: 0.10 }
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  return (
    <div className="landing-page" ref={pageRef}>
      {/* NAV */}
      <nav className="lp-nav">
        <a className="logo" href="#">
          <NavLogo />
        </a>
        <ul className="nav-links">
          <li><a href="#pain">The problem</a></li>
          <li><a href="#features">Features</a></li>
          <li><a href="#how">How it works</a></li>
          <li><a href="#pricing">Pricing</a></li>
          <li><a href={LOGIN_URL} className="nav-cta">Log in</a></li>
        </ul>
      </nav>

      {/* HERO */}
      <div className="hero">
        <svg style={{position:"absolute",bottom:"-40px",left:"-60px",width:"340px",height:"340px",pointerEvents:"none",opacity:0.55}} viewBox="0 0 340 340" fill="none" xmlns="http://www.w3.org/2000/svg">
          <line x1="0" y1="340" x2="340" y2="340" stroke="#c9ff33" strokeWidth="14" transform="rotate(-80 0 340)"/>
          <line x1="0" y1="340" x2="340" y2="340" stroke="#c9ff33" strokeWidth="14" transform="rotate(-72 0 340)"/>
          <line x1="0" y1="340" x2="340" y2="340" stroke="#c9ff33" strokeWidth="14" transform="rotate(-64 0 340)"/>
          <line x1="0" y1="340" x2="340" y2="340" stroke="#c9ff33" strokeWidth="14" transform="rotate(-56 0 340)"/>
          <line x1="0" y1="340" x2="340" y2="340" stroke="#c9ff33" strokeWidth="14" transform="rotate(-48 0 340)"/>
          <line x1="0" y1="340" x2="340" y2="340" stroke="#c9ff33" strokeWidth="14" transform="rotate(-40 0 340)"/>
          <line x1="0" y1="340" x2="340" y2="340" stroke="#c9ff33" strokeWidth="14" transform="rotate(-32 0 340)"/>
          <line x1="0" y1="340" x2="340" y2="340" stroke="#c9ff33" strokeWidth="14" transform="rotate(-24 0 340)"/>
          <line x1="0" y1="340" x2="340" y2="340" stroke="#c9ff33" strokeWidth="14" transform="rotate(-16 0 340)"/>
          <line x1="0" y1="340" x2="340" y2="340" stroke="#c9ff33" strokeWidth="14" transform="rotate(-8 0 340)"/>
        </svg>

        <svg style={{position:"absolute",top:"-80px",right:"-80px",width:"360px",height:"360px",pointerEvents:"none"}} viewBox="0 0 360 360" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="360" cy="0" r="280" stroke="#c9ff33" strokeWidth="60" fill="none" opacity="0.18"/>
          <circle cx="360" cy="0" r="200" stroke="#c9ff33" strokeWidth="30" fill="none" opacity="0.12"/>
        </svg>

        <div className="hero-inner">
          <div className="hero-badge"><div className="badge-pip"></div>Now in early access</div>
          <h1>Google Drive,<br/><span className="lime">finally</span> fixed</h1>
          <p className="hero-sub">Fileray is the layer on top of Google Drive that makes files findable, permissions readable, and team access actually transparent.</p>
          <div className="hero-btns">
            <a href={LOGIN_URL} className="btn-lime">Connect your Drive — it's free</a>
            <a href="#features" className="btn-outline">See how it works →</a>
          </div>
        </div>
      </div>

      {/* STATS BAR */}
      <div className="stats-bar">
        <div className="stat"><div className="stat-n">1.8 hrs</div><div className="stat-l">Lost daily searching for files</div></div>
        <div className="stat"><div className="stat-n">~50%</div><div className="stat-l">Of employees can't find what they need</div></div>
        <div className="stat"><div className="stat-n">44%</div><div className="stat-l">Of breaches from over-permissive access</div></div>
        <div className="stat"><div className="stat-n">2B</div><div className="stat-l">Monthly Drive users — all affected</div></div>
      </div>

      {/* PAIN */}
      <section className="pain-sec" id="pain">
        <svg style={{position:"absolute",top:0,right:0,width:"220px",height:"220px",pointerEvents:"none",opacity:0.25}} viewBox="0 0 220 220" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="20" y="0" width="18" height="220" fill="#c9ff33" rx="2"/>
          <rect x="56" y="0" width="18" height="220" fill="#c9ff33" rx="2"/>
          <rect x="92" y="0" width="18" height="220" fill="#c9ff33" rx="2"/>
          <rect x="128" y="0" width="18" height="220" fill="#c9ff33" rx="2"/>
          <rect x="164" y="0" width="18" height="220" fill="#c9ff33" rx="2"/>
          <rect x="200" y="0" width="18" height="220" fill="#c9ff33" rx="2"/>
        </svg>

        <div className="wrap">
          <div className="pain-head reveal">
            <div className="eyebrow">The problem</div>
            <h2>Drive was built for storage.<br/>Not for teams.</h2>
            <p className="sec-body">After scanning thousands of complaints across Reddit, Quora, Google's own support forums, and UX research — the same six problems keep appearing.</p>
          </div>
          <div className="pain-grid reveal">
            <div className="pain-card"><div className="pain-num">01</div><span className="pain-emoji">🔍</span><div className="pain-title">Files vanish into the void</div><div className="pain-body">Drive's search assumes you remember the exact filename. When naming is inconsistent — and it always is across a team — even OCR search fails you.</div><div className="pain-quote">"Twenty minutes later, you're still looking."</div></div>
            <div className="pain-card"><div className="pain-num">02</div><span className="pain-emoji">📥</span><div className="pain-title">"Shared with me" is a graveyard</div><div className="pain-body">A flat chronological dump of everything anyone has ever shared with you. No grouping. No organising. You're at the mercy of whoever named the file.</div><div className="pain-quote">"A huge list that makes it difficult to find what you need." — Medium UX review</div></div>
            <div className="pain-card"><div className="pain-num">03</div><span className="pain-emoji">🚫</span><div className="pain-title">Access denied — no explanation</div><div className="pain-body">Wrong account? Expired link? Domain restriction? Drive shows the same cryptic error for every scenario with zero indication of what's wrong or how to fix it.</div><div className="pain-quote">"There was no indication which account the file was shared with." — Quora</div></div>
            <div className="pain-card"><div className="pain-num">04</div><span className="pain-emoji">👁</span><div className="pain-title">Who has access? Nobody knows.</div><div className="pain-body">Even Google's own learning centre admits this is confusing. Five permission levels interact with folder and file overrides in ways that are basically impossible to audit.</div><div className="pain-quote">"It can be confusing trying to tell who can access a file." — Google Workspace Docs</div></div>
            <div className="pain-card"><div className="pain-num">05</div><span className="pain-emoji">⚠️</span><div className="pain-title">Previews silently fail</div><div className="pain-body">Browser extensions, multi-account conflicts, and slow connections cause "couldn't preview file" with no explanation — dropping you into a forced download.</div><div className="pain-quote">"One of the most-posted issues on Drive's support forums, across years of threads."</div></div>
            <div className="pain-card"><div className="pain-num">06</div><span className="pain-emoji">📂</span><div className="pain-title">Folder chaos multiplies</div><div className="pain-body">No naming rules, no structure enforcement. "Untitled document", "Copy of Copy of Q3 plan" — chaos is the natural end state. Manual cleanup never happens.</div><div className="pain-quote">"Drive is great at storing files. Terrible at enforcing organisation." — Filently</div></div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="feat-sec" id="features">
        <div className="wrap">
          <div className="feat-top reveal">
            <div>
              <div className="eyebrow">Six features</div>
              <h2>One fix for every broken part of Drive</h2>
            </div>
            <p className="sec-body">Fileray connects to your Google Drive via OAuth and layers a purpose-built interface over the top. Your files stay in Drive — you just interact with them through something that actually works.</p>
          </div>

          {/* F1 */}
          <div className="feat-block reveal">
            <div>
              <div className="feat-num">01 / 06</div>
              <div className="feat-title">Smart File Finder</div>
              <p className="feat-desc">One search bar covering My Drive, Shared Drives, and Shared With Me simultaneously — with filters for type, owner, date, and location. Every result shows a full folder path so you always know where a file lives.</p>
              <div className="feat-pills"><span className="pill">Universal search</span><span className="pill">Path breadcrumbs</span><span className="pill">Multi-filter</span><span className="pill">Recent searches</span></div>
            </div>
            <div className="mock">
              <div className="mock-bar"><div className="md md-r"></div><div className="md md-y"></div><div className="md md-g"></div><div className="mock-label">Fileray — Search</div></div>
              <div className="mock-body">
                <div className="m-searchbar">⌕ &nbsp;Q3 campaign brief</div>
                <div className="m-chips"><span className="m-chip m-chip-on">All locations</span><span className="m-chip m-chip-off">Docs</span><span className="m-chip m-chip-off">Last 30 days</span><span className="m-chip m-chip-off">Owner: me</span></div>
                <div className="m-row"><span className="m-icon">📄</span><div className="m-info"><div className="m-name">Q3 Campaign Brief — Final.docx</div><div className="m-meta">Sarah M · Modified 2 days ago</div></div><span className="m-path">Marketing › Campaigns</span></div>
                <div className="m-row"><span className="m-icon">📊</span><div className="m-info"><div className="m-name">Q3 Campaign Budget Tracker</div><div className="m-meta">James T · Modified 1 week ago</div></div><span className="m-path">Shared Drive › Finance</span></div>
                <div className="m-row"><span className="m-icon">🎨</span><div className="m-info"><div className="m-name">Q3 Creative Brief v2</div><div className="m-meta">Alex K · Shared with me</div></div><span className="m-path">Shared with me</span></div>
              </div>
            </div>
          </div>

          {/* F2 */}
          <div className="feat-block flip reveal">
            <div>
              <div className="feat-num">02 / 06</div>
              <div className="feat-title">Organised "Shared With Me"</div>
              <p className="feat-desc">Group everything shared with you by sender, file type, or time period. Flag files that haven't been touched in 90+ days. Finally, a Shared With Me section you can actually navigate.</p>
              <div className="feat-pills"><span className="pill">Group by sender</span><span className="pill">Stale file alerts</span><span className="pill">In-view search</span><span className="pill">Save to Drive</span></div>
            </div>
            <div className="mock">
              <div className="mock-bar"><div className="md md-r"></div><div className="md md-y"></div><div className="md md-g"></div><div className="mock-label">Fileray — Shared With Me</div></div>
              <div className="mock-body">
                <div style={{fontSize:"10px",color:"var(--lp-faint)",textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:"10px",fontWeight:700}}>Group by: Sender</div>
                <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"8px",paddingBottom:"8px",borderBottom:"1px solid var(--lp-border)"}}>
                  <div className="m-av av-l" style={{width:"22px",height:"22px",fontSize:"8px"}}>SM</div>
                  <span style={{fontSize:"12px",color:"var(--lp-off)",fontWeight:600}}>Sarah Mitchell</span>
                  <span style={{fontSize:"10px",color:"var(--lp-faint)",marginLeft:"auto"}}>4 files</span>
                </div>
                <div className="m-row" style={{marginLeft:"10px"}}><span className="m-icon">📄</span><div className="m-info"><div className="m-name">Brand Guidelines 2025</div><div className="m-meta">Shared 3 days ago</div></div></div>
                <div className="m-row" style={{marginLeft:"10px",border:"1px solid rgba(255,184,48,0.25)"}}><span className="m-icon">📊</span><div className="m-info"><div className="m-name">Budget Overview Q1</div><div className="m-meta">Shared 4 months ago</div></div><span style={{fontSize:"9px",padding:"2px 8px",background:"rgba(255,184,48,0.12)",color:"var(--lp-amber)",borderRadius:"100px",fontWeight:700}}>Stale</span></div>
              </div>
            </div>
          </div>

          {/* F3 */}
          <div className="feat-block reveal">
            <div>
              <div className="feat-num">03 / 06</div>
              <div className="feat-title">Instant Preview Panel</div>
              <p className="feat-desc">A slide-in panel handles Docs, Sheets, Slides, PDFs, and images — without leaving the file list. When preview isn't possible, it tells you exactly why. No silent failures or mystery download buttons.</p>
              <div className="feat-pills"><span className="pill">Docs / Sheets / Slides</span><span className="pill">PDF viewer</span><span className="pill">Image render</span><span className="pill">Clear error states</span></div>
            </div>
            <div className="mock">
              <div className="mock-bar"><div className="md md-r"></div><div className="md md-y"></div><div className="md md-g"></div><div className="mock-label">Fileray — Preview</div></div>
              <div className="mock-body">
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"10px"}}>
                  <div style={{fontSize:"12px",color:"var(--lp-off)",fontWeight:600}}>Brand Guidelines 2025.docx</div>
                  <div style={{display:"flex",gap:"5px"}}><span style={{fontSize:"10px",padding:"3px 9px",border:"1px solid var(--lp-border2)",borderRadius:"100px",color:"var(--lp-faint)"}}>Download</span><span style={{fontSize:"10px",padding:"3px 9px",border:"1px solid var(--lp-border2)",borderRadius:"100px",color:"var(--lp-faint)"}}>Open ↗</span></div>
                </div>
                <div style={{fontSize:"10px",color:"var(--lp-faint)",marginBottom:"10px"}}>Sarah Mitchell · 2.4 MB · 3 days ago</div>
                <div style={{height:"110px",background:"var(--lp-plum2)",borderRadius:"8px",border:"1px solid var(--lp-border)",display:"flex",alignItems:"center",justifyContent:"center",marginBottom:"10px"}}><span style={{fontSize:"11px",color:"var(--lp-faint)"}}>[ Document preview renders here ]</span></div>
                <div style={{display:"flex",alignItems:"center",gap:"8px",padding:"7px 10px",background:"rgba(201,255,51,0.07)",border:"1px solid rgba(201,255,51,0.15)",borderRadius:"8px"}}><span style={{fontSize:"10px",color:"var(--lp-faint)"}}>Access:</span><span style={{fontSize:"10px",color:"var(--lp-lime)",fontWeight:600}}>3 people · link sharing OFF</span></div>
              </div>
            </div>
          </div>

          {/* F4 */}
          <div className="feat-block flip reveal">
            <div>
              <div className="feat-num">04 / 06</div>
              <div className="feat-title">Permission Inspector</div>
              <p className="feat-desc">Click "Who has access?" on any file and get a plain-English breakdown — every person, their permission level, how they got it, and a colour-coded risk banner for link sharing. Export as CSV for audits.</p>
              <div className="feat-pills"><span className="pill">Plain-English summary</span><span className="pill">Risk banners</span><span className="pill">Per-person audit</span><span className="pill">CSV export</span></div>
            </div>
            <div className="mock">
              <div className="mock-bar"><div className="md md-r"></div><div className="md md-y"></div><div className="md md-g"></div><div className="mock-label">Permission Inspector</div></div>
              <div className="mock-body">
                <div className="m-risk risk-amber">⚠ Anyone with the link can view this file</div>
                <div style={{fontSize:"10px",color:"var(--lp-faint)",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:"8px"}}>People with access (3)</div>
                <div className="m-person"><div className="m-av av-l">SM</div><div style={{flex:1}}><div className="m-pname">Sarah Mitchell</div><div className="m-pemail">s.mitchell@acme.com</div></div><span className="m-badge b-owner">Owner</span></div>
                <div className="m-person"><div className="m-av av-b">JT</div><div style={{flex:1}}><div className="m-pname">James Torres</div><div className="m-pemail">j.torres@acme.com</div></div><span className="m-badge b-editor">Editor</span></div>
                <div className="m-person"><div className="m-av av-p">AK</div><div style={{flex:1}}><div className="m-pname">Alex Kim</div><div className="m-pemail">alex@partner.io</div></div><span className="m-badge b-viewer">Viewer</span></div>
              </div>
            </div>
          </div>

          {/* F5 */}
          <div className="feat-block reveal">
            <div>
              <div className="feat-num">05 / 06</div>
              <div className="feat-title">Team Access Dashboard</div>
              <p className="feat-desc">Add your team's emails and Fileray scans for stale permissions, oversharing risk, and shows a full access matrix across your team — surfacing the things you'd never find manually.</p>
              <div className="feat-pills"><span className="pill">Stale access alerts</span><span className="pill">Oversharing detection</span><span className="pill">Access matrix</span><span className="pill">Risk scoring</span></div>
            </div>
            <div className="mock">
              <div className="mock-bar"><div className="md md-r"></div><div className="md md-y"></div><div className="md md-g"></div><div className="mock-label">Team Access Dashboard</div></div>
              <div className="mock-body">
                <div style={{fontSize:"10px",color:"var(--lp-faint)",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:"8px"}}>Stale access alerts</div>
                <div className="m-alert"><div className="m-adot"></div><div className="m-atext">Old contractor still has edit access to 12 files</div><span className="m-alabel">High risk</span></div>
                <div className="m-alert"><div className="m-adot"></div><div className="m-atext">3 files publicly link-shared with editor access</div><span className="m-alabel">Critical</span></div>
                <table className="m-table"><thead><tr><th style={{textAlign:"left"}}>Person</th><th>Marketing</th><th>Finance</th><th>Dev</th></tr></thead><tbody>
                  <tr><td className="td-l">Sarah M.</td><td className="td-mg">Manage</td><td className="td-vw">View</td><td className="td-no">—</td></tr>
                  <tr><td className="td-l">James T.</td><td className="td-ed">Edit</td><td className="td-mg">Manage</td><td className="td-no">—</td></tr>
                  <tr><td className="td-l">Alex K.</td><td className="td-vw">View</td><td className="td-no">—</td><td className="td-ed">Edit</td></tr>
                </tbody></table>
              </div>
            </div>
          </div>

          {/* F6 */}
          <div className="feat-block flip reveal">
            <div>
              <div className="feat-num">06 / 06</div>
              <div className="feat-title">Smart Organiser</div>
              <p className="feat-desc">Automatically surfaces the mess: duplicate files with side-by-side comparison, filenames that break your naming convention, files titled "Untitled document", and orphaned files with nowhere to live.</p>
              <div className="feat-pills"><span className="pill">Duplicate detector</span><span className="pill">Naming linter</span><span className="pill">Untitled file finder</span><span className="pill">Orphan detector</span></div>
            </div>
            <div className="mock">
              <div className="mock-bar"><div className="md md-r"></div><div className="md md-y"></div><div className="md md-g"></div><div className="mock-label">Smart Organiser</div></div>
              <div className="mock-body">
                <div className="m-kpi-row">
                  <div className="m-kpi"><div className="m-kpi-n" style={{color:"var(--lp-red)"}}>14</div><div className="m-kpi-l">Dupes</div></div>
                  <div className="m-kpi"><div className="m-kpi-n" style={{color:"var(--lp-amber)"}}>31</div><div className="m-kpi-l">Bad names</div></div>
                  <div className="m-kpi"><div className="m-kpi-n" style={{color:"var(--lp-muted)"}}>8</div><div className="m-kpi-l">Orphans</div></div>
                </div>
                <div className="m-row" style={{border:"1px solid rgba(255,184,48,0.2)"}}><span className="m-icon">📄</span><div className="m-info"><div className="m-name" style={{color:"var(--lp-amber)"}}>Untitled document (3)</div><div className="m-meta">Naming violation · Drive root</div></div><span style={{fontSize:"10px",color:"var(--lp-lime)",fontWeight:700,cursor:"pointer"}}>Rename →</span></div>
                <div className="m-row" style={{border:"1px solid rgba(255,77,106,0.2)"}}><span className="m-icon">📊</span><div className="m-info"><div className="m-name" style={{color:"var(--lp-red)"}}>Copy of Q3 Plan FINAL v2</div><div className="m-meta">Likely duplicate of original</div></div><span style={{fontSize:"10px",color:"var(--lp-muted)",cursor:"pointer"}}>Review →</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW */}
      <section className="how-sec" id="how">
        <svg style={{position:"absolute",bottom:"-160px",left:"-120px",width:"440px",height:"440px",pointerEvents:"none"}} viewBox="0 0 440 440" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="220" cy="220" r="200" stroke="#c9ff33" strokeWidth="40" fill="none" opacity="0.07"/>
          <circle cx="220" cy="220" r="140" stroke="#c9ff33" strokeWidth="24" fill="none" opacity="0.05"/>
        </svg>

        <div className="wrap">
          <div className="reveal">
            <div className="eyebrow">Setup in 3 minutes</div>
            <h2>Connect once.<br/>Fix everything.</h2>
          </div>
          <div className="steps reveal">
            <div className="step"><div className="step-n">01</div><div className="step-label">Step one</div><div className="step-title">Connect your Google account</div><p className="step-body">Complete the standard Google OAuth flow. Fileray requests read-only metadata access — it never modifies, moves, or deletes any of your files. You stay in control.</p></div>
            <div className="step"><div className="step-n">02</div><div className="step-label">Step two</div><div className="step-title">Fileray scans and indexes</div><p className="step-body">The app scans your file metadata, permission records, and folder structure via the Drive API. Initial scan typically takes under 60 seconds. Results are cached so subsequent loads are instant.</p></div>
            <div className="step"><div className="step-n">03</div><div className="step-label">Step three</div><div className="step-title">Search, inspect, and organise</div><p className="step-body">Use Smart File Finder as your daily search interface. Open the Team Dashboard to audit permissions. Run the Smart Organiser monthly to clear accumulated chaos.</p></div>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="testi-sec">
        <svg style={{position:"absolute",top:"-40px",right:"-40px",width:"260px",height:"260px",pointerEvents:"none",opacity:0.18}} viewBox="0 0 260 260" fill="none" xmlns="http://www.w3.org/2000/svg">
          <line x1="260" y1="0" x2="0" y2="0" stroke="#c9ff33" strokeWidth="16" transform="rotate(10 260 0)"/>
          <line x1="260" y1="0" x2="0" y2="0" stroke="#c9ff33" strokeWidth="16" transform="rotate(22 260 0)"/>
          <line x1="260" y1="0" x2="0" y2="0" stroke="#c9ff33" strokeWidth="16" transform="rotate(34 260 0)"/>
          <line x1="260" y1="0" x2="0" y2="0" stroke="#c9ff33" strokeWidth="16" transform="rotate(46 260 0)"/>
          <line x1="260" y1="0" x2="0" y2="0" stroke="#c9ff33" strokeWidth="16" transform="rotate(58 260 0)"/>
          <line x1="260" y1="0" x2="0" y2="0" stroke="#c9ff33" strokeWidth="16" transform="rotate(70 260 0)"/>
          <line x1="260" y1="0" x2="0" y2="0" stroke="#c9ff33" strokeWidth="16" transform="rotate(82 260 0)"/>
        </svg>

        <div className="wrap">
          <div className="reveal">
            <div className="eyebrow">What teams say</div>
            <h2>The frustration is real.<br/>Now so is the fix.</h2>
          </div>
          <div className="testi-grid reveal">
            <div className="testi-card"><div className="testi-mark">"</div><p className="testi-text">We had a contractor who left six months ago. Fileray's Team Dashboard found they still had edit access to 23 files across three shared drives. We had no idea. Fixed in ten minutes.</p><div className="testi-author"><div className="testi-av t-av1">RK</div><div><div className="testi-name">Rachel K.</div><div className="testi-role">Head of Operations, Series B startup</div></div></div></div>
            <div className="testi-card"><div className="testi-mark">"</div><p className="testi-text">The Permission Inspector alone is worth it. I used to right-click, go into share settings, scroll through, and still not know who inherited access from which folder. Now it's one click.</p><div className="testi-author"><div className="testi-av t-av2">TL</div><div><div className="testi-name">Tom L.</div><div className="testi-role">Engineering Manager, 40-person agency</div></div></div></div>
            <div className="testi-card"><div className="testi-mark">"</div><p className="testi-text">Our "Shared with me" had 400+ files from three years of collaborations. Fileray grouped them by sender in seconds. I found a vendor contract I'd been looking for for two weeks.</p><div className="testi-author"><div className="testi-av t-av3">MJ</div><div><div className="testi-name">Maya J.</div><div className="testi-role">Marketing Lead, consulting firm</div></div></div></div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="price-sec" id="pricing">
        <svg style={{position:"absolute",top:0,right:0,width:"180px",height:"180px",pointerEvents:"none",opacity:0.12}} viewBox="0 0 180 180" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="0" y="0" width="16" height="180" fill="#c9ff33" rx="2"/>
          <rect x="32" y="0" width="16" height="180" fill="#c9ff33" rx="2"/>
          <rect x="64" y="0" width="16" height="180" fill="#c9ff33" rx="2"/>
          <rect x="96" y="0" width="16" height="180" fill="#c9ff33" rx="2"/>
          <rect x="128" y="0" width="16" height="180" fill="#c9ff33" rx="2"/>
          <rect x="160" y="0" width="16" height="180" fill="#c9ff33" rx="2"/>
        </svg>

        <div className="wrap">
          <div className="reveal">
            <div className="eyebrow">Pricing</div>
            <h2>Simple. Transparent.<br/>No tricks.</h2>
            <p className="sec-body">All plans include the core Smart File Finder and Preview Panel. Team features scale with your needs.</p>
          </div>
          <div className="price-grid reveal">
            <div className="price-card">
              <div className="price-tier">Solo</div>
              <div className="price-amt">Free</div>
              <div className="price-per">Forever, no card required</div>
              <div className="price-div"></div>
              <ul className="price-list">
                <li>Smart File Finder (all locations)</li>
                <li>Instant Preview Panel</li>
                <li>Organised Shared With Me</li>
                <li>Permission Inspector (5 lookups/day)</li>
                <li>1 Google account</li>
              </ul>
              <a href={LOGIN_URL} className="price-btn-main">Get started free</a>
            </div>
            <div className="price-card hot">
              <div className="pop-tag">Most popular</div>
              <div className="price-tier">Team</div>
              <div className="price-amt"><sub>$</sub>9<span style={{fontSize:"20px",fontWeight:500}}>/mo</span></div>
              <div className="price-per">per user, billed monthly</div>
              <div className="price-div"></div>
              <ul className="price-list">
                <li>Everything in Solo</li>
                <li>Team Access Dashboard</li>
                <li>Stale permission alerts</li>
                <li>Oversharing risk scoring</li>
                <li>Smart Organiser</li>
                <li>Unlimited Permission Inspector</li>
                <li>CSV export for audits</li>
                <li>Up to 25 team members</li>
              </ul>
              <a href={LOGIN_URL} className="price-btn-main">Start 14-day free trial</a>
            </div>
            <div className="price-card">
              <div className="price-tier">Enterprise</div>
              <div className="price-amt">Custom</div>
              <div className="price-per">Volume pricing available</div>
              <div className="price-div"></div>
              <ul className="price-list">
                <li>Everything in Team</li>
                <li>Unlimited team members</li>
                <li>SSO / SAML support</li>
                <li>Scheduled automated scans</li>
                <li>Webhook alerts for changes</li>
                <li>Priority support + onboarding</li>
                <li>Custom data retention policies</li>
              </ul>
              <a href={LOGIN_URL} className="price-btn-main">Talk to us</a>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-sec">
        <svg style={{position:"absolute",left:"-60px",bottom:"-60px",width:"300px",height:"300px",opacity:0.22,pointerEvents:"none"}} viewBox="0 0 300 300" fill="none" xmlns="http://www.w3.org/2000/svg">
          <line x1="0" y1="300" x2="300" y2="300" stroke="#1c0f2e" strokeWidth="18" transform="rotate(-80 0 300)"/>
          <line x1="0" y1="300" x2="300" y2="300" stroke="#1c0f2e" strokeWidth="18" transform="rotate(-66 0 300)"/>
          <line x1="0" y1="300" x2="300" y2="300" stroke="#1c0f2e" strokeWidth="18" transform="rotate(-52 0 300)"/>
          <line x1="0" y1="300" x2="300" y2="300" stroke="#1c0f2e" strokeWidth="18" transform="rotate(-38 0 300)"/>
          <line x1="0" y1="300" x2="300" y2="300" stroke="#1c0f2e" strokeWidth="18" transform="rotate(-24 0 300)"/>
          <line x1="0" y1="300" x2="300" y2="300" stroke="#1c0f2e" strokeWidth="18" transform="rotate(-10 0 300)"/>
        </svg>
        <svg style={{position:"absolute",right:"-60px",top:"-60px",width:"300px",height:"300px",opacity:0.22,pointerEvents:"none",transform:"rotate(180deg)"}} viewBox="0 0 300 300" fill="none" xmlns="http://www.w3.org/2000/svg">
          <line x1="0" y1="300" x2="300" y2="300" stroke="#1c0f2e" strokeWidth="18" transform="rotate(-80 0 300)"/>
          <line x1="0" y1="300" x2="300" y2="300" stroke="#1c0f2e" strokeWidth="18" transform="rotate(-66 0 300)"/>
          <line x1="0" y1="300" x2="300" y2="300" stroke="#1c0f2e" strokeWidth="18" transform="rotate(-52 0 300)"/>
          <line x1="0" y1="300" x2="300" y2="300" stroke="#1c0f2e" strokeWidth="18" transform="rotate(-38 0 300)"/>
          <line x1="0" y1="300" x2="300" y2="300" stroke="#1c0f2e" strokeWidth="18" transform="rotate(-24 0 300)"/>
          <line x1="0" y1="300" x2="300" y2="300" stroke="#1c0f2e" strokeWidth="18" transform="rotate(-10 0 300)"/>
        </svg>

        <div style={{position:"relative",zIndex:2}}>
          <div className="eyebrow" style={{background:"rgba(28,15,46,0.12)",borderColor:"rgba(28,15,46,0.2)",color:"var(--lp-plum)"}}>Get started today</div>
          <h2>Your Drive.<br/>Under control.</h2>
          <p className="cta-sub">Connect in under three minutes. No data stored. No files modified. Just a better interface for the Drive you already have.</p>
          <a href={LOGIN_URL} className="btn-plum">Connect your Google Drive — free</a>
          <p className="cta-fine">Read-only access &nbsp;·&nbsp; No credit card &nbsp;·&nbsp; Cancel anytime</p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="lp-footer">
        <FooterLogo />
        <ul className="foot-links">
          <li><a href="#">Privacy policy</a></li>
          <li><a href="#">Terms of service</a></li>
          <li><a href="#">Security</a></li>
          <li><a href="#">Documentation</a></li>
          <li><a href="#">Contact</a></li>
        </ul>
        <div className="foot-copy">© 2025 Fileray. Not affiliated with Google.</div>
      </footer>
    </div>
  );
}
