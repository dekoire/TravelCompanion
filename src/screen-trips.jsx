// screen-trips.jsx — "All Trips" library + New Trip entry.
//
// Top: header with prominent "New trip" CTA (gradient).
// Then: tabs (All / Active / Past / Drafts) with counts.
// Then: a featured "currently traveling" card.
// Then: grid of trip cards with hero photo, country, dates, vibe.
//
// `onNewTrip` opens the conversational setup. `onOpenTrip` jumps into a
// specific trip's overview (here we route everything to Kyoto for demo).

function ScreenTrips({ onNewTrip, onOpenTrip, onBack, onEditPlan, onShare }) {
  const p = window.useTheme();
  const { Ico, Pill, AIOrb } = window;
  const P = window.PHOTOS;

  const TRIPS = [
    { id: 'kyoto',  name: 'Kyoto, for two',  country: 'Japan',     dates: 'Apr 4 – Apr 10', vibe: ['Hidden gems', 'Local food'], img: P.kyotoHero,   status: 'active',   progress: 3, total: 7,
      travelers: [P.user1, P.user2, P.user3] },
    { id: 'lisbon', name: 'Lisbon weekend',  country: 'Portugal',  dates: 'Jun 12 – Jun 15', vibe: ['City', 'Solo'],               img: 'https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=900&q=80&auto=format&fit=crop', status: 'upcoming',
      travelers: [P.user1] },
    { id: 'oaxaca', name: 'Oaxaca food',     country: 'Mexico',    dates: 'Sep 2023',        vibe: ['Foodie'],                     img: 'https://images.unsplash.com/photo-1518105779142-d975f22f1b0a?w=900&q=80&auto=format&fit=crop', status: 'past',
      travelers: [P.user1, P.user2] },
    { id: 'iceland',name: 'Reykjavik loop',  country: 'Iceland',   dates: 'Jul 2022',        vibe: ['Adventure'],                  img: 'https://images.unsplash.com/photo-1539634936668-b8c44e0e1fbe?w=900&q=80&auto=format&fit=crop', status: 'past',
      travelers: [P.user1, P.user2, P.user3] },
    { id: 'patag',  name: 'Patagonia trek',  country: 'Argentina', dates: 'Draft',           vibe: ['Adventure'],                  img: 'https://images.unsplash.com/photo-1531793272258-0cc8c0a6b0e6?w=900&q=80&auto=format&fit=crop', status: 'draft',
      travelers: [P.user1, P.user2] },
  ];

  const featured = TRIPS.find(t => t.status === 'active');

  return (
    <div style={{
      position: 'absolute', inset: 0, background: p.bg, color: p.text,
      fontFamily: 'Geist, system-ui', overflow: 'auto', paddingBottom: 110,
    }}>
      {/* Header */}
      <div style={{ padding: '60px 22px 8px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: 1.8, textTransform: 'uppercase', color: p.accent, fontWeight: 600 }}>
            Your trips
          </div>
          <div style={{
            fontFamily: 'Geist, system-ui', fontSize: 36, lineHeight: 1,
            letterSpacing: -1.2, marginTop: 6, fontWeight: 600,
          }}>
            8 journeys
          </div>
        </div>
      </div>

      {/* New trip CTA */}
      <div style={{ padding: '14px 16px 18px' }}>
        <button onClick={onNewTrip} style={{
          width: '100%', padding: 0, borderRadius: 20,
          background: window.SIRI_GRADIENT_LINEAR, border: 'none',
          cursor: 'pointer', position: 'relative', overflow: 'hidden',
          boxShadow: '0 16px 40px rgba(95,160,255,0.35)',
          fontFamily: 'Geist, system-ui',
        }}>
          <div style={{
            padding: '18px 18px', display: 'flex', alignItems: 'center', gap: 14,
            position: 'relative',
          }}>
            <div style={{
              width: 50, height: 50, borderRadius: 25, flexShrink: 0,
              background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(20px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '0.5px solid rgba(255,255,255,0.3)',
            }}>
              <Ico name="plus" size={24} c="#fff" sw={2.5}/>
            </div>
            <div style={{ flex: 1, textAlign: 'left' }}>
              <div style={{ fontSize: 17, color: '#fff', fontWeight: 600, letterSpacing: -0.3 }}>
                Plan a new trip
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 2 }}>
                Tell me where & I'll build the rest in 6 seconds
              </div>
            </div>
            <Ico name="arrow" size={22} c="#fff" sw={2.5}/>
          </div>
        </button>
      </div>

      {/* Filter tabs */}
      <div style={{ padding: '0 22px 14px', display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none' }}>
        {[
          { l: 'All', c: 8, sel: true },
          { l: 'Active', c: 1 },
          { l: 'Upcoming', c: 1 },
          { l: 'Past', c: 5 },
          { l: 'Drafts', c: 1 },
        ].map((t, i) => (
          <button key={i} style={{
            flexShrink: 0, padding: '7px 13px', borderRadius: 14,
            background: t.sel ? p.accent : (p.dark ? 'rgba(255,255,255,0.04)' : 'rgba(27,18,64,0.04)'),
            color: t.sel ? '#fff' : p.text,
            border: `0.5px solid ${t.sel ? p.accent : p.line}`,
            cursor: 'pointer', fontFamily: 'Geist, system-ui',
            fontSize: 12, fontWeight: 600, letterSpacing: -0.1,
            display: 'flex', alignItems: 'center', gap: 5,
          }}>
            {t.l}
            <span style={{
              fontSize: 10, fontWeight: 500, opacity: 0.7,
            }}>{t.c}</span>
          </button>
        ))}
      </div>

      {/* Featured active card */}
      {featured && (
        <div style={{ padding: '0 16px 14px' }}>
          <button onClick={() => onOpenTrip && onOpenTrip(featured.id)} style={{
            width: '100%', borderRadius: 22, overflow: 'hidden', cursor: 'pointer',
            border: `0.5px solid ${p.accent}55`,
            padding: 0, background: 'transparent', textAlign: 'left',
            fontFamily: 'Geist, system-ui', position: 'relative',
          }}>
            <div style={{ position: 'relative', height: 200 }}>
              <img src={featured.img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}/>
              <div style={{ position: 'absolute', inset: 0,
                background: 'linear-gradient(180deg, rgba(11,10,24,0.4) 0%, transparent 30%, rgba(11,10,24,0.85) 100%)' }}/>
              {/* Live badge */}
              <div style={{ position: 'absolute', top: 14, left: 14, display: 'flex', alignItems: 'center', gap: 6,
                padding: '4px 9px', borderRadius: 99,
                background: 'rgba(11,10,24,0.4)', backdropFilter: 'blur(12px)',
                border: '0.5px solid rgba(126,231,182,0.3)',
              }}>
                <span style={{ width: 6, height: 6, borderRadius: 3, background: '#7EE7B6',
                  boxShadow: '0 0 8px #7EE7B6', animation: 'pulse 1.4s ease-in-out infinite' }}/>
                <span style={{ fontSize: 10, color: '#7EE7B6', letterSpacing: 1.4, textTransform: 'uppercase', fontWeight: 600 }}>
                  Traveling now
                </span>
              </div>
              {/* Travelers — small avatar stack top-right, taps open share */}
              <button onClick={(e) => { e.stopPropagation(); onShare && onShare(); }} style={{
                position: 'absolute', top: 12, right: 12,
                height: 32, padding: '0 4px 0 4px', borderRadius: 16,
                background: 'rgba(11,10,24,0.55)', backdropFilter: 'blur(14px)',
                border: '0.5px solid rgba(255,255,255,0.22)',
                display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer',
                fontFamily: 'Geist, system-ui',
              }}>
                <div style={{ display: 'flex' }}>
                  {[P.user1, P.user2, P.user3].map((src, i) => (
                    <img key={i} src={src} alt="" style={{
                      width: 22, height: 22, borderRadius: 11, objectFit: 'cover',
                      marginLeft: i === 0 ? 0 : -8,
                      border: '1.5px solid rgba(11,10,24,0.85)',
                    }}/>
                  ))}
                </div>
                <span style={{ fontSize: 10, color: '#fff', fontWeight: 700, padding: '0 4px' }}>3</span>
              </button>
              {/* Title block */}
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0 18px 16px' }}>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', letterSpacing: 1.2, textTransform: 'uppercase', fontWeight: 600 }}>
                  {featured.country} · {featured.dates}
                </div>
                <div style={{ fontSize: 28, color: '#fff', fontWeight: 600, letterSpacing: -0.6, marginTop: 4, lineHeight: 1 }}>
                  {featured.name}
                </div>
                {/* progress */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
                  <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.18)', overflow: 'hidden' }}>
                    <div style={{ width: `${(featured.progress/featured.total)*100}%`, height: '100%',
                      background: window.SIRI_GRADIENT_LINEAR }}/>
                  </div>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.85)', fontFamily: 'Geist, system-ui', fontVariantNumeric: 'tabular-nums' }}>
                    {featured.progress} / {featured.total}
                  </span>
                </div>
              </div>
            </div>
          </button>
        </div>
      )}

      {/* Grid of other trips (2-up) */}
      <div style={{ padding: '0 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {TRIPS.filter(t => t.status !== 'active').map(t => (
          <button key={t.id} onClick={() => onOpenTrip && onOpenTrip(t.id)} style={{
            padding: 0, cursor: 'pointer', borderRadius: 16, overflow: 'hidden',
            background: p.surface, border: `0.5px solid ${p.line}`,
            textAlign: 'left', fontFamily: 'Geist, system-ui',
          }}>
            <div style={{ position: 'relative', height: 110 }}>
              <img src={t.img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy"/>
              {t.status === 'past' && (
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(11,10,24,0.35)' }}/>
              )}
              {t.status === 'draft' && (
                <div style={{ position: 'absolute', top: 8, left: 8, padding: '2px 7px', borderRadius: 4,
                  background: 'rgba(11,10,24,0.6)', backdropFilter: 'blur(8px)',
                  fontSize: 9, color: '#fff', letterSpacing: 1.2, textTransform: 'uppercase', fontWeight: 600,
                }}>Draft</div>
              )}
              {t.status === 'upcoming' && (
                <div style={{ position: 'absolute', top: 8, left: 8, padding: '2px 7px', borderRadius: 4,
                  background: p.accent, fontSize: 9, color: '#fff', letterSpacing: 1.2, textTransform: 'uppercase', fontWeight: 600,
                }}>Soon</div>
              )}
            </div>
            <div style={{ padding: '10px 12px 12px' }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: p.text, lineHeight: 1.15, letterSpacing: -0.2 }}>
                {t.name}
              </div>
              <div style={{ fontSize: 11, color: p.textMuted, marginTop: 3 }}>
                {t.country} · {t.dates}
              </div>
              {/* Traveler stack */}
              {t.travelers && t.travelers.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', marginTop: 8 }}>
                  <div style={{ display: 'flex' }}>
                    {t.travelers.slice(0, 3).map((src, i) => (
                      <img key={i} src={src} alt="" style={{
                        width: 18, height: 18, borderRadius: 9, objectFit: 'cover',
                        marginLeft: i === 0 ? 0 : -6,
                        border: `1.5px solid ${p.surface}`,
                      }}/>
                    ))}
                  </div>
                  <span style={{ fontSize: 10, color: p.textMuted, marginLeft: 6, fontWeight: 500 }}>
                    {t.travelers.length === 1 ? 'Solo' : `${t.travelers.length} traveling`}
                  </span>
                </div>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

window.ScreenTrips = ScreenTrips;
