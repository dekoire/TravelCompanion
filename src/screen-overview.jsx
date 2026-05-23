// screen-overview.jsx — Weekly trip overview.
//
// A vertical scroll of day cards — each is a small "postcard" preview of
// the day: hero image, day name, weather, key activity headline. Above it
// sits a trip-pass card showing the active 7-day pass and AI usage.

function ScreenOverview({ onOpenDay, onOpenProfile, onBack, onShare, onEditPlan }) {
  const p = window.useTheme();
  const { Ico, Pill, AIOrb, Photo } = window;

  const dayPhotos = [
    window.PHOTOS.kyotoHero, window.PHOTOS.philosopher, window.PHOTOS.bambooGrove,
    window.PHOTOS.gion, window.PHOTOS.arashiyama, window.PHOTOS.matcha, window.PHOTOS.garden,
  ];
  const headlines = [
    'Arrive · sunset stroll · ramen',
    'Kiyomizu-dera · philosopher\'s walk',
    'Bamboo grove · golden pavilion · kaiseki',
    'Geisha tea house · Gion sunset',
    'Day trip to Nara · deer park',
    'Hidden tea masters · pottery',
    'Slow morning · departure',
  ];

  return (
    <div style={{
      position: 'absolute', inset: 0, background: p.bg, color: p.text,
      fontFamily: 'Geist, system-ui', overflow: 'auto',
      paddingBottom: 100,
    }}>
      {/* Header */}
      <div style={{ padding: '56px 16px 14px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        {onBack && (
          <button onClick={onBack} style={{
            width: 36, height: 36, borderRadius: 18, marginTop: 4,
            background: p.dark ? 'rgba(255,255,255,0.06)' : 'rgba(15,30,80,0.05)',
            border: `0.5px solid ${p.line}`, cursor: 'pointer', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Ico name="arrowLeft" size={18} c={p.text}/>
          </button>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 11, letterSpacing: 1.8, textTransform: 'uppercase',
            color: p.accent, fontWeight: 600,
          }}>
            Apr 4 – Apr 10 · 7 days
          </div>
          <div style={{
            fontFamily: 'Geist, system-ui', fontSize: 36, lineHeight: 0.98,
            letterSpacing: -1, marginTop: 6, fontWeight: 600,
          }}>
            Kyoto, <span style={{ fontStyle: 'italic' }}>for two</span>
          </div>
          <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <Pill tone="glass" size="xs">Hidden gems</Pill>
            <Pill tone="glass" size="xs">Local food</Pill>
            <Pill tone="glass" size="xs">Romantic</Pill>
          </div>
        </div>
        <button onClick={onShare} style={{
          height: 40, padding: '0 6px 0 10px', borderRadius: 20, marginTop: 4,
          background: p.dark ? 'rgba(255,255,255,0.06)' : 'rgba(15,30,80,0.05)',
          border: `0.5px solid ${p.line}`, cursor: 'pointer', flexShrink: 0,
          display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'Geist, system-ui',
        }}>
          <div style={{ display: 'flex' }}>
            {[window.PHOTOS.user1, window.PHOTOS.user2, window.PHOTOS.user3].map((src, i) => (
              <img key={i} src={src} alt="" style={{
                width: 22, height: 22, borderRadius: 11, objectFit: 'cover',
                marginLeft: i === 0 ? 0 : -8,
                border: `2px solid ${p.bg}`,
              }}/>
            ))}
          </div>
          <span style={{ fontSize: 11, color: p.text, fontWeight: 700, padding: '0 4px' }}>3</span>
        </button>
      </div>

      {/* Trip pass */}
      <div style={{ padding: '4px 16px 16px' }}>
        <div style={{
          borderRadius: 22, overflow: 'hidden', padding: 18, position: 'relative',
          background: p.dark
            ? 'linear-gradient(135deg, #1A1A26 0%, #252533 100%)'
            : 'linear-gradient(135deg, #0A4FBF 0%, #1466E5 55%, #2A95FF 100%)',
          border: p.dark ? '0.5px solid rgba(95,160,255,0.22)' : '0.5px solid rgba(255,255,255,0.18)',
          color: '#fff',
        }}>
          <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(95,160,255,0.18) 0%, transparent 60%)',
          }}/>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 10, color: p.dark ? p.accent : 'rgba(255,255,255,0.85)', letterSpacing: 1.6, textTransform: 'uppercase', fontWeight: 600 }}>
                Trip Pass · 7-day
              </div>
              <div style={{ fontFamily: 'Geist, system-ui', fontSize: 22, marginTop: 4, lineHeight: 1 }}>
                Day 3 of 7
              </div>
            </div>
            <AIOrb size={28}/>
          </div>

          <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
            {[...Array(7)].map((_, i) => (
              <div key={i} style={{
                flex: 1, height: 4, borderRadius: 2,
                background: i < 3 ? (p.dark ? p.accent : '#fff') : 'rgba(255,255,255,0.22)',
                opacity: i === 2 ? 1 : (i < 2 ? 0.6 : 1),
              }}/>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: p.dark ? p.textMuted : 'rgba(255,255,255,0.72)' }}>
            <span>4 days left · expires Apr 10</span>
            <span style={{ color: p.dark ? p.accent : '#fff', fontWeight: 500 }}>AI · 12 / 50 today</span>
          </div>
        </div>
      </div>

      {/* Day list */}
      <div style={{ padding: '6px 16px 0' }}>
        <div style={{ fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', color: p.accent, fontWeight: 600, padding: '6px 6px 12px' }}>
          Your week
        </div>

        {window.TRIP.days.map((d, i) => {
          const isCurrent = i === 2;
          const isPast = i < 2;
          return (
            <button key={i} onClick={() => onOpenDay && onOpenDay(i + 1)} style={{
              width: '100%', textAlign: 'left', padding: 0, cursor: 'pointer',
              background: 'transparent', border: 'none', marginBottom: 10,
              opacity: isPast ? 0.55 : 1, transition: 'opacity .2s',
            }}>
              <div style={{
                borderRadius: 18, overflow: 'hidden', position: 'relative',
                background: p.surface, border: `0.5px solid ${isCurrent ? 'rgba(95,160,255,0.32)' : 'rgba(255,255,255,0.08)'}`,
                boxShadow: isCurrent ? '0 12px 40px rgba(95,160,255,0.12)' : 'none',
                display: 'flex', alignItems: 'stretch',
              }}>
                <div style={{
                  width: 110, position: 'relative', flexShrink: 0,
                }}>
                  <img src={dayPhotos[i]} alt="" style={{
                    width: '100%', height: '100%', objectFit: 'cover', display: 'block',
                  }} loading="lazy"/>
                  <div style={{ position: 'absolute', inset: 0,
                    background: 'linear-gradient(90deg, transparent 60%, rgba(26,26,38,0.7))',
                  }}/>
                </div>
                <div style={{ flex: 1, padding: '14px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{
                      fontSize: 10, letterSpacing: 1.4, textTransform: 'uppercase',
                      color: isCurrent ? p.accent : p.textMuted, fontWeight: 600,
                    }}>{d.label} · {d.date}</span>
                    {isCurrent && <window.StatusDot status="live" size={6}/>}
                  </div>
                  <div style={{
                    fontFamily: 'Geist, system-ui', fontSize: 19, lineHeight: 1.1,
                    color: p.text, marginBottom: 4,
                  }}>{d.name}</div>
                  <div style={{ fontSize: 12, color: p.textMuted, lineHeight: 1.35 }}>
                    {headlines[i]}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, fontSize: 11, color: p.textMuted }}>
                    <span>{d.weather}</span>
                    <span style={{ opacity: 0.5 }}>·</span>
                    <span>5 stops</span>
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

window.ScreenOverview = ScreenOverview;
