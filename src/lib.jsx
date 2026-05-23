// lib.jsx — shared atoms for the AI Travel Companion app.
// Icons (SVG, inline), pills, buttons, photo cards, AI shimmer text,
// weather/crowd indicators, transport chip, status dot.

const { useState, useEffect, useRef, useSyncExternalStore } = React;

// ─── useTheme — every screen reads palette through this so the global
// theme mode (dark/light) drives re-renders. Backed by themeState in
// theme.jsx (subscribeTheme + setThemeMode).
function useTheme() {
  useSyncExternalStore(
    window.subscribeTheme,
    () => window.themeState.mode
  );
  return window.getTheme();
}

// ─── Icon set — 20px viewBox, strokeWidth 1.7, rounded caps ─────────
// All icons take a `c` (color) prop, default `currentColor`.
function Ico({ name, size = 20, c = 'currentColor', sw = 1.7 }) {
  const p = { fill: 'none', stroke: c, strokeWidth: sw, strokeLinecap: 'round', strokeLinejoin: 'round' };
  const svg = (children) =>
  <svg width={size} height={size} viewBox="0 0 20 20" style={{ display: 'block' }}>{children}</svg>;

  switch (name) {
    case 'sparkle':return svg(<>
      <path d="M10 2v4M10 14v4M2 10h4M14 10h4M5 5l2.5 2.5M12.5 12.5L15 15M5 15l2.5-2.5M12.5 7.5L15 5" {...p} />
    </>);
    case 'pin':return svg(<>
      <path d="M10 18s6-5.5 6-10a6 6 0 1 0-12 0c0 4.5 6 10 6 10z" {...p} />
      <circle cx="10" cy="8" r="2" {...p} />
    </>);
    case 'compass':return svg(<>
      <circle cx="10" cy="10" r="7.5" {...p} />
      <path d="M13.5 6.5l-2 4.5-4.5 2 2-4.5z" {...p} />
    </>);
    case 'clock':return svg(<>
      <circle cx="10" cy="10" r="7.5" {...p} />
      <path d="M10 5.5v4.5l3 2" {...p} />
    </>);
    case 'walk':return svg(<>
      <circle cx="11" cy="3.5" r="1.4" {...p} />
      <path d="M9 18l1.5-5L9 11l-2 1.5M11 13l2 1 1 4M7.5 9l3-2 2.5 1.5" {...p} />
    </>);
    case 'train':return svg(<>
      <rect x="5" y="3" width="10" height="11" rx="3" {...p} />
      <path d="M5 9h10M7.5 17l-1.5 1M12.5 17l1.5 1" {...p} />
      <circle cx="7.5" cy="12" r="0.5" fill={c} />
      <circle cx="12.5" cy="12" r="0.5" fill={c} />
    </>);
    case 'taxi':return svg(<>
      <path d="M3 12l1.5-4a2 2 0 0 1 2-1.5h7a2 2 0 0 1 2 1.5L17 12M3 12h14v3a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1v-1H6v1a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" {...p} />
      <circle cx="6" cy="13.5" r="0.7" fill={c} /><circle cx="14" cy="13.5" r="0.7" fill={c} />
    </>);
    case 'bike':return svg(<>
      <circle cx="5" cy="13.5" r="3" {...p} /><circle cx="15" cy="13.5" r="3" {...p} />
      <path d="M5 13.5l4-6h4l2 6M9 7.5L10.5 4h2" {...p} />
    </>);
    case 'chat':return svg(<>
      <path d="M3 9a6 6 0 0 1 6-6h2a6 6 0 0 1 6 6v0a6 6 0 0 1-6 6H7l-4 3v-3a6 6 0 0 1 0-6z" {...p} />
    </>);
    case 'mic':return svg(<>
      <rect x="7.5" y="2.5" width="5" height="9" rx="2.5" {...p} />
      <path d="M4.5 9.5a5.5 5.5 0 0 0 11 0M10 15v3" {...p} />
    </>);
    case 'heart':return svg(<>
      <path d="M10 17S3 12.5 3 7.5A4 4 0 0 1 10 5a4 4 0 0 1 7 2.5C17 12.5 10 17 10 17z" {...p} />
    </>);
    case 'share':return svg(<>
      <circle cx="5" cy="10" r="2" {...p} /><circle cx="15" cy="5" r="2" {...p} /><circle cx="15" cy="15" r="2" {...p} />
      <path d="M7 9l6-3M7 11l6 3" {...p} />
    </>);
    case 'plus':return svg(<><path d="M10 4v12M4 10h12" {...p} /></>);
    case 'minus':return svg(<><path d="M4 10h12" {...p} /></>);
    case 'arrow':return svg(<><path d="M4 10h12M11 5l5 5-5 5" {...p} /></>);
    case 'arrowLeft':return svg(<><path d="M16 10H4M9 5l-5 5 5 5" {...p} /></>);
    case 'arrowUp':return svg(<><path d="M10 16V4M5 9l5-5 5 5" {...p} /></>);
    case 'check':return svg(<><path d="M4 10.5l3.5 3.5 8.5-9" {...p} /></>);
    case 'close':return svg(<><path d="M5 5l10 10M15 5L5 15" {...p} /></>);
    case 'sun':return svg(<>
      <circle cx="10" cy="10" r="3.5" {...p} />
      <path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.5 4.5l1.5 1.5M14 14l1.5 1.5M4.5 15.5L6 14M14 6l1.5-1.5" {...p} />
    </>);
    case 'cloud':return svg(<>
      <path d="M6 14a3.5 3.5 0 0 1-.5-7 5 5 0 0 1 9.5 1.5A3.5 3.5 0 0 1 14 14z" {...p} />
    </>);
    case 'rain':return svg(<>
      <path d="M6 11a3.5 3.5 0 0 1-.5-7 5 5 0 0 1 9.5 1.5A3.5 3.5 0 0 1 14 11M7 14l-1 2M10 14l-1 2M13 14l-1 2" {...p} />
    </>);
    case 'route':return svg(<>
      <circle cx="5" cy="5" r="2" {...p} /><circle cx="15" cy="15" r="2" {...p} />
      <path d="M5 7v3a3 3 0 0 0 3 3h1a3 3 0 0 1 3 3" {...p} />
    </>);
    case 'layers':return svg(<>
      <path d="M10 3l7 4-7 4-7-4 7-4zM3 11l7 4 7-4M3 14.5l7 4 7-4" {...p} />
    </>);
    case 'map':return svg(<>
      {/* tri-fold paper map with route */}
      <path d="M2 5.5l5-2 6 2 5-2v11l-5 2-6-2-5 2v-11z" {...p} />
      <path d="M7 3.5v13M13 5.5v13" {...p} />
      <circle cx="10" cy="9.5" r="1.4" fill={c} stroke="none" />
    </>);
    case 'globe':return svg(<>
      <circle cx="10" cy="10" r="7.5" {...p} />
      <path d="M2.5 10h15M10 2.5c2.5 2 2.5 13 0 15M10 2.5c-2.5 2-2.5 13 0 15" {...p} />
    </>);
    case 'settings':return svg(<>
      <circle cx="10" cy="10" r="2.5" {...p} />
      <path d="M10 1.5v2M10 16.5v2M3.5 6L5 7M15 13l1.5 1M1.5 10h2M16.5 10h2M3.5 14L5 13M15 7l1.5-1" {...p} />
    </>);
    case 'user':return svg(<>
      <circle cx="10" cy="7" r="3" {...p} />
      <path d="M3 17a7 7 0 0 1 14 0" {...p} />
    </>);
    case 'star':return svg(<>
      <path d="M10 2.5l2.4 5 5.4.8-3.9 3.8 1 5.4L10 14.9l-4.9 2.6 1-5.4-3.9-3.8 5.4-.8z" {...p} />
    </>);
    case 'flame':return svg(<>
      <path d="M10 18c3.5 0 6-2.5 6-6 0-3-2-4.5-3-7-1 2-2 2.5-3 4-1-1-1.5-2-1.5-3.5-2 1.5-4.5 4-4.5 6.5 0 3.5 2.5 6 6 6z" {...p} />
    </>);
    case 'apple':return svg(<>
      <path d="M14 11c0 2.5 2 3.5 2 3.5-1.5 3-3 4-4 4-1 0-1.5-.5-2.5-.5s-2 .5-3 .5c-2 0-4-2.5-4-6 0-3.5 2.5-5.5 4.5-5.5 1 0 2 .5 2.5.5s2-1 4-1c1.5 0 3 1 3.5 2-2 1-3 2.5-3 2.5zM12 4.5c0-1.5 1-3 2.5-3 0 1.5-1.5 3-2.5 3z" fill={c} stroke="none" />
    </>);
    case 'google':return svg(<>
      <path d="M17.5 10c0-.5 0-1-.2-1.5H10V11h4.3c-.2 1-.8 1.8-1.7 2.4v2h2.7c1.6-1.5 2.5-3.6 2.5-5.4z" fill="#4285F4" stroke="none" />
      <path d="M10 18c2.3 0 4.2-.8 5.6-2l-2.7-2c-.7.5-1.7.8-2.9.8-2.2 0-4.1-1.5-4.8-3.5H2.4v2.2C3.8 16.2 6.6 18 10 18z" fill="#34A853" stroke="none" />
      <path d="M5.2 11.4c-.2-.6-.3-1.2-.3-1.9s.1-1.3.3-1.9V5.4H2.4C1.7 6.8 1.3 8.3 1.3 9.5s.4 2.8 1.1 4.1l2.8-2.2z" fill="#FBBC04" stroke="none" />
      <path d="M10 4.6c1.3 0 2.4.4 3.3 1.3l2.4-2.4C14.2 2.2 12.3 1.3 10 1.3c-3.4 0-6.2 1.8-7.6 4.1l2.8 2.2c.7-2 2.6-3 4.8-3z" fill="#EA4335" stroke="none" />
    </>);
    case 'mail':return svg(<>
      <rect x="2.5" y="4" width="15" height="12" rx="2" {...p} />
      <path d="M3 6l7 5 7-5" {...p} />
    </>);
    default:return svg(<circle cx="10" cy="10" r="6" {...p} />);
  }
}

// ─── Pill / chip ────────────────────────────────────────────────────
function Pill({ children, tone = 'glass', size = 'sm', icon, style = {} }) {
  const palette = useTheme();
  const dark = palette.dark;
  const tones = {
    glass: {
      // Photo overlays often sit behind these — bump opacity so the text
      // stays legible against busy images. Stronger backdrop blur too.
      bg: dark ? 'rgba(7,12,28,0.55)' : 'rgba(255,255,255,0.72)',
      bd: dark ? 'rgba(255,255,255,0.22)' : 'rgba(15,30,80,0.16)',
      c: dark ? '#fff' : palette.text
    },
    accent: {
      // Solid blue with white text — the translucent variant was unreadable
      // on photos (blue text over a blue tint). Solid avoids ambiguity.
      bg: palette.accent,
      bd: palette.accent,
      c: '#fff'
    },
    solidAccent: {
      bg: palette.accent,
      bd: palette.accent,
      c: dark ? '#0B0A18' : '#fff'
    },
    danger: {
      bg: 'rgba(255,110,140,0.18)',
      bd: 'rgba(255,110,140,0.32)',
      c: palette.danger
    },
    success: {
      bg: 'rgba(126,231,182,0.12)',
      bd: 'rgba(126,231,182,0.22)',
      c: palette.green
    },
    ghost: { bg: 'transparent', bd: 'transparent', c: palette.textMuted }
  };
  const t = tones[tone] || tones.glass;
  const sizes = {
    xs: { padX: 7, padY: 3, fs: 11, h: 22 },
    sm: { padX: 10, padY: 4, fs: 12, h: 26 },
    md: { padX: 12, padY: 6, fs: 13, h: 30 },
    lg: { padX: 16, padY: 8, fs: 14, h: 36 }
  };
  const s = sizes[size];
  return (
    <span style={{ ...{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        padding: `${s.padY}px ${s.padX}px`, height: s.h, boxSizing: 'border-box',
        background: t.bg, border: `0.5px solid ${t.bd}`, color: t.c,
        borderRadius: 99, fontSize: s.fs, fontWeight: 500,
        fontFamily: 'Geist, -apple-system, system-ui', whiteSpace: 'nowrap',
        letterSpacing: -0.1,
        backdropFilter: tone === 'glass' ? 'blur(16px) saturate(180%)' : undefined,
        WebkitBackdropFilter: tone === 'glass' ? 'blur(16px) saturate(180%)' : undefined,
        ...style, opacity: "0.7"
      }, background: "rgb(0, 62, 124)", opacity: "0" }}>
      {icon && <Ico name={icon} size={Math.round(s.fs * 1.05)} c={t.c} />}
      {children}
    </span>);

}

// ─── Primary button ─────────────────────────────────────────────────
function Btn({ children, onClick, tone = 'accent', size = 'lg', icon, full = false, style = {} }) {
  const p = useTheme();
  const dark = p.dark;
  const tones = {
    // 'solid' = high-contrast neutral. accent = Siri gradient = signature CTA.
    solid: { bg: p.text, c: p.bg, bd: 'transparent', shadow: '0 1px 2px rgba(0,0,0,0.18)' },
    accent: {
      bg: window.SIRI_GRADIENT_LINEAR, c: '#fff', bd: 'transparent',
      shadow: '0 10px 30px rgba(95,160,255,0.35), inset 0 1px 0 rgba(255,255,255,0.20)'
    },
    glass: { bg: dark ? 'rgba(255,255,255,0.10)' : 'rgba(27,18,64,0.05)', c: p.text,
      bd: dark ? 'rgba(255,255,255,0.14)' : 'rgba(27,18,64,0.10)', shadow: 'none' },
    ghost: { bg: 'transparent', c: p.text, bd: 'transparent', shadow: 'none' }
  };
  const t = tones[tone];
  const sizes = {
    sm: { h: 36, fs: 14, padX: 14 },
    md: { h: 44, fs: 15, padX: 18 },
    lg: { h: 54, fs: 16, padX: 22 }
  };
  const s = sizes[size];
  return (
    <button onClick={onClick} style={{
      height: s.h, padding: `0 ${s.padX}px`, fontSize: s.fs,
      background: t.bg, color: t.c, border: `0.5px solid ${t.bd}`,
      borderRadius: s.h / 2, fontWeight: 600, letterSpacing: -0.2,
      fontFamily: 'Geist, -apple-system, system-ui',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      gap: 8, cursor: 'pointer', boxShadow: t.shadow,
      width: full ? '100%' : undefined,
      backdropFilter: tone === 'glass' ? 'blur(20px)' : undefined,
      WebkitBackdropFilter: tone === 'glass' ? 'blur(20px)' : undefined,
      ...style
    }}>
      {icon && <Ico name={icon} size={18} c={t.c} />}
      {children}
    </button>);

}

// ─── Animated AI shimmer text — used during planning / replanning ──
function Shimmer({ children, style = {} }) {
  const p = useTheme();
  return (
    <span style={{
      background: p.dark ?
      'linear-gradient(90deg, rgba(241,238,255,0.4) 0%, #FF77C8 25%, #6EB4FF 50%, #5FD0FF 75%, rgba(241,238,255,0.4) 100%)' :
      'linear-gradient(90deg, rgba(27,18,64,0.4) 0%, #D9498F 25%, #6B5BE0 50%, #2E8BD1 75%, rgba(27,18,64,0.4) 100%)',
      backgroundSize: '200% 100%',
      WebkitBackgroundClip: 'text', backgroundClip: 'text',
      color: 'transparent',
      animation: 'shimmer 2.4s linear infinite',
      ...style
    }}>{children}</span>);

}

// ─── Status dot — green/amber/red ──────────────────────────────────
function StatusDot({ status, size = 6 }) {
  const map = {
    booked: '#7EE7B6', upcoming: '#5FA0FF', suggestion: '#FF77C8',
    live: '#7EE7B6', past: 'rgba(255,255,255,0.3)'
  };
  return (
    <span style={{
      display: 'inline-block', width: size, height: size, borderRadius: '50%',
      background: map[status] || '#888',
      boxShadow: `0 0 ${size * 2}px ${map[status] || '#888'}`
    }} />);

}

// ─── Crowd indicator — 3 bars ──────────────────────────────────────
function Crowd({ level = 'low' }) {
  const p = useTheme();
  const heights = [4, 7, 10];
  const filled = level === 'low' ? 1 : level === 'medium' ? 2 : 3;
  const c = level === 'high' ? p.danger : level === 'medium' ? p.amber : p.green;
  return (
    <span style={{ display: 'inline-flex', gap: 2, alignItems: 'flex-end' }}>
      {heights.map((h, i) =>
      <span key={i} style={{
        width: 3, height: h, borderRadius: 1,
        background: i < filled ? c : p.dark ? 'rgba(255,255,255,0.15)' : 'rgba(27,18,64,0.14)'
      }} />
      )}
    </span>);

}

// ─── AI orb — Siri-style conic gradient that slowly spins.
//   Outer halo: soft gradient blur (the "halo" you see in iOS Siri).
//   Inner:      bright spinning ring.
//   Highlight:  small white specular spot for depth.
function AIOrb({ size = 28, pulse = true, halo = false }) {
  const ring = size;
  return (
    <span style={{
      position: 'relative', display: 'inline-flex',
      width: ring, height: ring, flexShrink: 0
    }}>
      {halo &&
      <span style={{
        position: 'absolute', inset: -ring * 0.6, borderRadius: '50%',
        background: window.SIRI_GRADIENT_LINEAR,
        filter: `blur(${ring * 0.4}px)`,
        opacity: 0.5,
        animation: pulse ? 'aiOrbPulse 3.2s ease-in-out infinite' : undefined, fontSize: "16px", color: "rgba(0, 0, 0, 0)"
      }} />
      }
      <span style={{
        position: 'absolute', inset: 0, borderRadius: '50%',
        background: window.SIRI_GRADIENT,
        animation: 'orbSpin 6s linear infinite',
        boxShadow: '0 0 16px rgba(95,160,255,0.55), inset 0 1px 2px rgba(255,255,255,0.4)'
      }} />
      {/* inner soft core — keeps it from looking like a flat conic wheel */}
      <span style={{
        position: 'absolute', inset: size * 0.18, borderRadius: '50%',
        background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.55), rgba(255,255,255,0) 60%)',
        filter: 'blur(0.5px)'
      }} />
      {/* specular highlight */}
      <span style={{
        position: 'absolute', top: '18%', left: '20%', width: '28%', height: '28%',
        borderRadius: '50%', background: 'rgba(255,255,255,0.85)', filter: 'blur(1.5px)'
      }} />
    </span>);

}

{











  /* Photo with graceful fallback for broken Unsplash URLs.
     onError → swap to a deterministic gradient placeholder. */}function Photo({ src, h = 160, r = 18, children, overlay = true, style = {} }) {const [broken, setBroken] = React.useState(false);return <div style={{ position: 'relative', width: '100%', height: h, borderRadius: r, overflow: 'hidden', // Fallback gradient: blue-tinted, matches the dark palette.
      background: broken ? 'linear-gradient(135deg, #0A84FF 0%, #1D2A52 60%, #070C1C 100%)' : '#152040', ...style }}>
      {!broken && <img src={src} alt="" onError={() => setBroken(true)} style={{
      width: '100%', height: '100%', objectFit: 'cover', display: 'block'
    }} loading="lazy" />
    }
      {broken &&
    <div style={{
      position: 'absolute', inset: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      opacity: 0.4
    }}>
          <window.Ico name="pin" size={Math.min(h / 2, 64)} c="#fff" />
        </div>
    }
      {overlay &&
    <div style={{
      position: 'absolute', inset: 0,
      background: 'linear-gradient(180deg, transparent 30%, rgba(0,0,0,0.55) 100%)',
      pointerEvents: 'none'
    }} />
    }
      {children &&
    <div style={{ position: 'absolute', inset: 0 }}>{children}</div>
    }
    </div>;

}

// ─── Section header inside a screen ─────────────────────────────────
function SectionHeader({ kicker, title, action }) {
  const p = useTheme();
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 12 }}>
      <div>
        {kicker &&
        <div style={{
          fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase',
          color: p.accent, fontWeight: 600, marginBottom: 4, fontFamily: 'Geist, system-ui'
        }}>{kicker}</div>
        }
        <div style={{
          fontFamily: 'Geist, system-ui', fontSize: 22, lineHeight: 1.1,
          color: p.text, letterSpacing: -0.5, fontWeight: 600
        }}>{title}</div>
      </div>
      {action}
    </div>);

}

// ─── Weather strip — horizontal scroll of hourly forecast.
// Used on Today screen between header and Next Up. Each tick shows time,
// weather glyph, temp. Highlights the "now" tick.
function WeatherStrip({ now = '10am', dark }) {
  const p = window.useTheme();
  // 12 hours from "now" — repeated arbitrary forecast for the demo.
  const HOURS = [
  { t: '8am', ic: 'cloud', temp: 16, kind: 'cloud' },
  { t: '9am', ic: 'sun', temp: 17, kind: 'sun' },
  { t: '10am', ic: 'sun', temp: 19, kind: 'sun', now: true },
  { t: '11am', ic: 'sun', temp: 20, kind: 'sun' },
  { t: '12pm', ic: 'sun', temp: 21, kind: 'sun' },
  { t: '1pm', ic: 'sun', temp: 21, kind: 'sun' },
  { t: '2pm', ic: 'cloud', temp: 20, kind: 'cloud' },
  { t: '3pm', ic: 'cloud', temp: 19, kind: 'cloud' },
  { t: '4pm', ic: 'rain', temp: 17, kind: 'rain' },
  { t: '5pm', ic: 'rain', temp: 16, kind: 'rain' },
  { t: '6pm', ic: 'cloud', temp: 15, kind: 'cloud' },
  { t: '7pm', ic: 'cloud', temp: 14, kind: 'cloud' }];

  const colorFor = (k) => k === 'sun' ? p.amber : k === 'rain' ? p.sky : p.textMuted;

  return (
    <div style={{
      borderRadius: 22, overflow: 'hidden',
      background: p.dark ?
      'linear-gradient(135deg, rgba(95,160,255,0.10) 0%, rgba(20,30,70,0.4) 100%)' :
      'linear-gradient(135deg, rgba(46,109,216,0.08) 0%, rgba(255,255,255,0.5) 100%)',
      border: `0.5px solid ${p.line}`
    }}>
      {/* Header summary */}
      <div style={{
        padding: '12px 14px 6px', display: 'flex', alignItems: 'center', gap: 10
      }}>
        <span style={{
          width: 36, height: 36, borderRadius: 18, flexShrink: 0,
          background: 'radial-gradient(circle at 30% 30%, #FFE9B3, #FFC476 60%, #FF9E66)',
          boxShadow: '0 0 14px rgba(255,196,118,0.5)'
        }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 600, lineHeight: 1, color: p.text, fontVariantNumeric: 'tabular-nums' }}>
            19° <span style={{ fontSize: 12, color: p.textMuted, fontWeight: 400 }}>· feels like 17°</span>
          </div>
          <div style={{ fontSize: 12, color: p.textMuted, marginTop: 3 }}>
            Sunny — light rain rolls in around 4pm
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 11, color: p.textMuted, fontVariantNumeric: 'tabular-nums' }}>H 21° · L 14°</div>
          <div style={{ fontSize: 11, color: p.accent, marginTop: 1, fontWeight: 500 }}>UV 4 · moderate</div>
        </div>
      </div>

      {/* Hourly scroll */}
      <div style={{
        display: 'flex', gap: 4, padding: '6px 10px 12px',
        overflowX: 'auto', scrollbarWidth: 'none'
      }}>
        {HOURS.map((h, i) => {
          const isNow = h.now;
          return (
            <div key={i} style={{
              flexShrink: 0, width: 46, padding: '8px 4px', borderRadius: 12,
              background: isNow ? p.accent + '22' : 'transparent',
              border: `0.5px solid ${isNow ? p.accent + '55' : 'transparent'}`,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4
            }}>
              <div style={{
                fontSize: 10, fontWeight: 600, letterSpacing: 0.3,
                color: isNow ? p.accent : p.textMuted, textTransform: 'uppercase',
                fontVariantNumeric: 'tabular-nums'
              }}>
                {isNow ? 'NOW' : h.t}
              </div>
              <window.Ico name={h.ic} size={18} c={colorFor(h.kind)} />
              <div style={{ fontSize: 12, fontWeight: 600, color: p.text, fontVariantNumeric: 'tabular-nums' }}>
                {h.temp}°
              </div>
              {h.kind === 'rain' &&
              <div style={{ fontSize: 9, color: p.sky, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>40%</div>
              }
            </div>);

        })}
      </div>
    </div>);

}

// ─── Tiny weather glyph + temp — for inline use next to a time label.
function WeatherTick({ kind, temp, size = 12 }) {
  const p = window.useTheme();
  const colorFor = (k) => k === 'sun' ? p.amber : k === 'rain' ? p.sky : k === 'cloud' ? p.textMuted : p.textMuted;
  const icMap = { sun: 'sun', rain: 'rain', cloud: 'cloud' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      fontSize: size - 1, color: p.textMuted, fontVariantNumeric: 'tabular-nums'
    }}>
      <window.Ico name={icMap[kind] || 'sun'} size={size} c={colorFor(kind)} />
      {temp != null && <span>{temp}°</span>}
    </span>);

}
//
// Clickable now — taps open the transport choice sheet. Mode + duration
// shown by default; for the "currently selected" mode add `active`.
function TransportChip({ mode, dur, detail, onClick, active = false }) {
  const p = useTheme();
  const iconMap = { walk: 'walk', train: 'train', taxi: 'taxi', bike: 'bike', uber: 'taxi' };
  return (
    <button onClick={onClick} style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '4px 9px', borderRadius: 99,
      background: active ? p.accentSoft : p.dark ? 'rgba(255,255,255,0.04)' : 'rgba(27,18,64,0.04)',
      border: `0.5px solid ${active ? p.accent : p.dark ? 'rgba(255,255,255,0.08)' : 'rgba(27,18,64,0.08)'}`,
      fontSize: 11, color: p.textMuted, fontFamily: 'Geist, system-ui',
      cursor: onClick ? 'pointer' : 'default'
    }}>
      <Ico name={iconMap[mode] || 'walk'} size={13} c={p.accent} />
      <span style={{ color: p.text }}>{dur}</span>
      {detail && <span style={{ opacity: 0.5 }}>· {detail}</span>}
      {onClick && <Ico name="arrow" size={10} c={p.textDim} />}
    </button>);

}

Object.assign(window, {
  useTheme,
  Ico, Pill, Btn, Shimmer, StatusDot, Crowd, AIOrb, Photo, SectionHeader, TransportChip,
  WeatherStrip, WeatherTick
});