// screen-profile.jsx — You / subscriptions / AI preferences.
//
// Top: avatar + name + trip pass status.
// Then: usage / subscription card, AI preferences list, saved trips strip,
// settings rows.

function ScreenProfile({ onBack, onOpenPricing, onShowOnboarding, onSignOut }) {
  const p = window.useTheme();
  const { Ico, AIOrb, Pill } = window;

  return (
    <div style={{
      position: 'absolute', inset: 0, background: p.bg, color: p.text,
      fontFamily: 'Geist, system-ui', overflow: 'auto', paddingBottom: 100,
    }}>
      {/* Header */}
      <div style={{ padding: '64px 22px 14px' }}>
        <div style={{ fontSize: 11, letterSpacing: 1.8, textTransform: 'uppercase', color: p.accent, fontWeight: 600 }}>
          Account
        </div>
        <div style={{
          fontFamily: 'Geist, system-ui', fontSize: 40, lineHeight: 0.98,
          letterSpacing: -1, marginTop: 6,
        }}>
          Hi, <span style={{ fontStyle: 'italic' }}>Mara</span>.
        </div>
      </div>

      {/* Avatar + identity */}
      <div style={{
        margin: '6px 16px 18px', padding: 16, borderRadius: 22,
        background: p.surface, border: '0.5px solid rgba(255,255,255,0.06)',
        display: 'flex', gap: 14, alignItems: 'center',
      }}>
        <div style={{ position: 'relative' }}>
          <img src={window.PHOTOS.user1} alt="" style={{
            width: 56, height: 56, borderRadius: 28, objectFit: 'cover',
            border: '2px solid rgba(95,160,255,0.35)',
          }}/>
          <span style={{
            position: 'absolute', bottom: -2, right: -2, width: 18, height: 18,
            borderRadius: 9, background: p.accent,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: `2px solid ${p.surface}`,
          }}>
            <Ico name="sparkle" size={10} c="#fff" sw={2.5}/>
          </span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 600 }}>Mara Cavalcanti</div>
          <div style={{ fontSize: 12, color: p.textMuted, marginTop: 2 }}>mara@kindle.studio</div>
          <div style={{ marginTop: 6, display: 'flex', gap: 5 }}>
            <Pill tone="accent" size="xs" icon="flame">8 trips</Pill>
            <Pill tone="glass" size="xs">Companion since '24</Pill>
          </div>
        </div>
      </div>

      {/* Trip pass / usage */}
      <div style={{ padding: '0 16px 18px' }}>
        <div style={{
          borderRadius: 22, padding: 18, position: 'relative', overflow: 'hidden',
          background: 'linear-gradient(135deg, #2B1F1A 0%, #1A1A26 70%)',
          border: '0.5px solid rgba(95,160,255,0.22)',
        }}>
          <div style={{ position: 'absolute', top: -30, right: -30, width: 140, height: 140, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(95,160,255,0.2) 0%, transparent 60%)',
          }}/>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 10, color: p.accent, letterSpacing: 1.6, textTransform: 'uppercase', fontWeight: 600 }}>
                Trip Pass · 7-day · active
              </div>
              <div style={{ fontFamily: 'Geist, system-ui', fontSize: 26, lineHeight: 1, marginTop: 6 }}>
                4 days remaining
              </div>
              <div style={{ fontSize: 12, color: p.textMuted, marginTop: 4 }}>Apr 7 – Apr 10 · Kyoto</div>
            </div>
            <AIOrb size={28}/>
          </div>

          {/* Usage rows */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
            {[
              { l: 'AI requests today', v: 12, max: 50 },
              { l: 'Reservations made', v: 4, max: 10 },
              { l: 'Routes optimized', v: 7, max: 25 },
            ].map((u, i) => (
              <div key={i}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: p.textMuted, marginBottom: 4 }}>
                  <span>{u.l}</span>
                  <span style={{ color: p.text, fontFamily: 'Geist, system-ui', fontVariantNumeric: 'tabular-nums' }}>
                    {u.v} <span style={{ color: p.textDim }}>/ {u.max}</span>
                  </span>
                </div>
                <div style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                  <div style={{
                    width: `${(u.v/u.max) * 100}%`, height: '100%',
                    background: `linear-gradient(90deg, ${p.accent}, ${p.vermilion})`,
                  }}/>
                </div>
              </div>
            ))}
          </div>

          <button onClick={onOpenPricing} style={{
            marginTop: 14, height: 40, width: '100%', borderRadius: 20,
            background: window.SIRI_GRADIENT_LINEAR, border: 'none', color: '#fff',
            fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'Geist, system-ui',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            boxShadow: '0 8px 22px rgba(95,160,255,0.35)',
          }}>
            <Ico name="sparkle" size={14} c="#fff"/>
            See all plans
          </button>
        </div>
      </div>

      {/* Saved trips strip */}
      <div style={{ padding: '0 0 18px' }}>
        <div style={{ padding: '0 22px 10px', display: 'flex', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', color: p.accent, fontWeight: 600 }}>
            Saved trips
          </div>
          <span style={{ fontSize: 12, color: p.textMuted }}>See all 8</span>
        </div>
        <div style={{ display: 'flex', gap: 10, padding: '0 22px', overflowX: 'auto', scrollbarWidth: 'none' }}>
          {[
            { src: window.PHOTOS.fushimi, t: 'Kyoto', s: 'Active · Day 3' },
            { src: window.PHOTOS.philosopher, t: 'Lisbon', s: 'Last May' },
            { src: window.PHOTOS.gion, t: 'Oaxaca', s: '2023 · 5 days' },
            { src: window.PHOTOS.garden, t: 'Reykjavik', s: '2022 · 6 days' },
          ].map((t, i) => (
            <div key={i} style={{
              flexShrink: 0, width: 130, borderRadius: 14, overflow: 'hidden',
              background: p.surface, border: '0.5px solid rgba(255,255,255,0.06)',
            }}>
              <img src={t.src} alt="" style={{ width: '100%', height: 80, objectFit: 'cover' }} loading="lazy"/>
              <div style={{ padding: '8px 10px 10px' }}>
                <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.1, fontFamily: 'Geist, system-ui' }}>{t.t}</div>
                <div style={{ fontSize: 10, color: p.textMuted, marginTop: 2 }}>{t.s}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Settings list */}
      {[
        { hdr: 'Companion', rows: [
          { i: 'sparkle', l: 'AI preferences', v: 'Balanced · curious' },
          { i: 'compass', l: 'Travel style', v: 'Slow · romantic' },
          { i: 'walk', l: 'Mobility', v: 'Comfortable walker' },
        ]},
        { hdr: 'Account', rows: [
          { i: 'user', l: 'Personal info' },
          { i: 'mail', l: 'Notifications', v: 'On · quiet hours 10p–7a' },
          { i: 'settings', l: 'Privacy & data' },
          { i: 'sparkle', l: 'Replay onboarding', v: 'Demo', onClick: onShowOnboarding },
        ]},
      ].map((s, si) => (
        <div key={si} style={{ padding: '0 0 18px' }}>
          <div style={{ fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', color: p.accent, fontWeight: 600, padding: '0 22px 8px' }}>
            {s.hdr}
          </div>
          <div style={{ margin: '0 16px', borderRadius: 18, background: p.surface, overflow: 'hidden', border: '0.5px solid rgba(255,255,255,0.06)' }}>
            {s.rows.map((r, ri) => (
              <button key={ri} onClick={r.onClick} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
                borderBottom: ri < s.rows.length - 1 ? '0.5px solid rgba(255,255,255,0.05)' : 'none',
                background: 'transparent', border: 'none', width: '100%', textAlign: 'left',
                cursor: r.onClick ? 'pointer' : 'default', fontFamily: 'Geist, system-ui',
              }}>
                <span style={{
                  width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                  background: 'rgba(95,160,255,0.12)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Ico name={r.i} size={14} c={p.accent}/>
                </span>
                <div style={{ flex: 1, fontSize: 14, color: p.text }}>{r.l}</div>
                {r.v && <span style={{ fontSize: 12, color: p.textMuted }}>{r.v}</span>}
                <Ico name="arrow" size={13} c={p.textDim}/>
              </button>
            ))}
          </div>
        </div>
      ))}

      {/* Sign out + version */}
      <div style={{ padding: '4px 16px 0' }}>
        <button onClick={onSignOut} style={{
          width: '100%', padding: '14px 16px', borderRadius: 16,
          background: 'transparent', border: `0.5px solid ${p.danger}44`,
          color: p.danger, fontSize: 14, fontWeight: 600, cursor: 'pointer',
          fontFamily: 'Geist, system-ui',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          <Ico name="arrowLeft" size={15} c={p.danger}/>
          Sign out
        </button>
        <div style={{
          textAlign: 'center', marginTop: 22, fontSize: 11, color: p.textDim, letterSpacing: 0.5,
        }}>
          TravelCopanion v1.4.2 · build 261
          <br/>
          Made with care · privacy first
        </div>
      </div>
    </div>
  );
}

window.ScreenProfile = ScreenProfile;
