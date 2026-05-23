// screen-detail.jsx — Immersive location page.
//
// Top: full-bleed hero photo with floating back / save / share.
// Middle: serif title + location chip + key stats strip (rating, crowd, walk).
// Below: AI insight box, photo strip, hours panel, "Add to trip" footer.

function ScreenDetail({ activity, onClose, onOpenChat, onAddTrip, onReplace }) {
  const p = window.useTheme();
  const { Ico, Pill, Photo, AIOrb, Crowd } = window;
  const a = activity || window.DAY3[3];

  return (
    <div style={{
      position: 'absolute', inset: 0, background: p.bg, color: p.text,
      fontFamily: 'Geist, system-ui', overflow: 'auto',
    }}>
      {/* Hero photo */}
      <div style={{ position: 'relative', height: 440 }}>
        <img src={a.img} alt="" style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
        }}/>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(180deg, rgba(10,10,18,0.6) 0%, transparent 25%, transparent 50%, rgba(10,10,18,0.92) 100%)',
        }}/>

        {/* Top chrome */}
        <div style={{
          position: 'absolute', top: 56, left: 16, right: 16,
          display: 'flex', justifyContent: 'space-between',
        }}>
          <button onClick={onClose} style={{
            width: 40, height: 40, borderRadius: 20,
            background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(20px)',
            border: '0.5px solid rgba(255,255,255,0.18)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Ico name="arrowLeft" size={18} c="#fff"/>
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            {['heart', 'share'].map(n => (
              <button key={n} style={{
                width: 40, height: 40, borderRadius: 20,
                background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(20px)',
                border: '0.5px solid rgba(255,255,255,0.18)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Ico name={n} size={17} c="#fff"/>
              </button>
            ))}
          </div>
        </div>

        {/* Photo count indicator */}
        <div style={{
          position: 'absolute', bottom: 16, right: 16,
          padding: '4px 10px', borderRadius: 99,
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)',
          fontSize: 11, color: '#fff', fontFamily: 'Geist, system-ui', fontVariantNumeric: 'tabular-nums',
        }}>1 / 28</div>

        {/* Title overlay */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0 22px 24px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <Pill tone="glass" size="xs" icon="pin">
              {a.area} · 14 min walk
            </Pill>
            <Pill tone="accent" size="xs" icon="sparkle">
              In your trip · {a.time}
            </Pill>
          </div>
          <div style={{
            fontFamily: 'Geist, system-ui', fontSize: 38, lineHeight: 1,
            letterSpacing: -0.8, color: '#fff', textWrap: 'pretty',
          }}>{a.title}</div>
          <div style={{ marginTop: 8, fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>
            {a.tag}
          </div>
        </div>
      </div>

      {/* Stats strip */}
      <div style={{
        display: 'flex', padding: '18px 22px',
        borderBottom: '0.5px solid rgba(255,255,255,0.06)',
      }}>
        {[
          { label: 'Rating', value: `★ ${a.rating}`, sub: '4,210 reviews' },
          { label: 'Crowd', value: <Crowd level={a.crowd}/>, sub: a.crowd },
          { label: 'Best at', value: '4–6 pm', sub: 'golden hour' },
        ].map((s, i) => (
          <div key={i} style={{
            flex: 1, paddingLeft: i === 0 ? 0 : 14, paddingRight: 14,
            borderLeft: i > 0 ? '0.5px solid rgba(255,255,255,0.08)' : 'none',
          }}>
            <div style={{ fontSize: 10, color: p.textDim, letterSpacing: 1.2, textTransform: 'uppercase', fontWeight: 500 }}>{s.label}</div>
            <div style={{ fontSize: 16, color: p.text, marginTop: 4, fontWeight: 500 }}>{s.value}</div>
            <div style={{ fontSize: 11, color: p.textMuted, marginTop: 2 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* AI insight */}
      <div style={{ padding: '18px 22px' }}>
        <div style={{
          padding: '14px 14px 14px', borderRadius: 16,
          background: 'linear-gradient(135deg, rgba(95,160,255,0.10), rgba(95,160,255,0.02))',
          border: '0.5px solid rgba(95,160,255,0.22)',
          display: 'flex', gap: 12, alignItems: 'flex-start',
        }}>
          <AIOrb size={28}/>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: p.accent, letterSpacing: 1.2, textTransform: 'uppercase', fontWeight: 600, marginBottom: 5 }}>
              Your AI's read
            </div>
            <div style={{ fontSize: 13.5, color: p.text, lineHeight: 1.5 }}>
              Skip the south gate — it's 80% of the crowd. The north path
              opens onto an empty bamboo corridor and a small shrine most
              tourists miss. Allow 1h 45m for the loop.
            </div>
            <button onClick={onOpenChat} style={{
              marginTop: 10, padding: '6px 11px', borderRadius: 12,
              background: 'rgba(95,160,255,0.18)', border: '0.5px solid rgba(95,160,255,0.32)',
              color: p.accent, fontSize: 12, fontWeight: 500, cursor: 'pointer',
              fontFamily: 'Geist, system-ui',
              display: 'inline-flex', alignItems: 'center', gap: 5,
            }}>
              <window.Ico name="chat" size={13} c={p.accent}/>
              Ask about this place
            </button>
          </div>
        </div>
      </div>

      {/* Reviews — external sources */}
      <div style={{ padding: '0 22px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', color: p.accent, fontWeight: 600 }}>
            Reviews
          </div>
          <span style={{ fontSize: 11, color: p.textMuted, display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 5, height: 5, borderRadius: 3, background: p.green, boxShadow: `0 0 6px ${p.green}` }}/>
            Synced 4 min ago
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <ReviewCard
            provider="google" name="Google" score="4.7"
            count="3,210" highlight="Hidden gem" tone={p}
          />
          <ReviewCard
            provider="tripadvisor" name="Tripadvisor" score="4.6"
            count="1,890" badge="Travelers' Choice" tone={p}
          />
        </div>
        {/* AI summary line under the cards */}
        <div style={{
          marginTop: 10, padding: '10px 12px', borderRadius: 12,
          background: p.dark ? 'rgba(255,255,255,0.03)' : 'rgba(15,30,80,0.03)',
          border: `0.5px solid ${p.line}`,
          fontSize: 12, color: p.textMuted, lineHeight: 1.5,
          display: 'flex', gap: 8, alignItems: 'flex-start',
        }}>
          <window.AIOrb size={14} pulse={false}/>
          <div>
            <span style={{ color: p.text, fontWeight: 500 }}>What reviewers love:</span>{' '}
            soaring stalks, early-morning quiet, the north path. <span style={{ color: p.textDim }}>·</span>{' '}
            <span style={{ color: p.text, fontWeight: 500 }}>Watch for:</span>{' '}
            tour-bus crowds 11am–1pm.
          </div>
        </div>
      </div>

      {/* About */}
      <div style={{ padding: '0 22px 18px' }}>
        <div style={{ fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', color: p.accent, fontWeight: 600, marginBottom: 8 }}>
          About
        </div>
        <div style={{ fontSize: 14, lineHeight: 1.55, color: 'rgba(244,241,236,0.75)' }}>
          A several-kilometer corridor of soaring bamboo on the western
          edge of Kyoto. Light filters down in green ribbons; on a still
          morning the only sound is the creak of stalks against each other.
        </div>
      </div>

      {/* Photo strip */}
      <div style={{ padding: '0 0 18px' }}>
        <div style={{ padding: '0 22px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', color: p.accent, fontWeight: 600 }}>
            Photos · from this week
          </div>
          <span style={{ fontSize: 12, color: p.textMuted }}>See 28</span>
        </div>
        <div style={{ display: 'flex', gap: 8, padding: '0 22px', overflowX: 'auto', scrollbarWidth: 'none' }}>
          {[window.PHOTOS.bambooGrove, window.PHOTOS.garden, window.PHOTOS.fushimi, window.PHOTOS.philosopher].map((src, i) => (
            <img key={i} src={src} alt="" style={{
              width: 110, height: 140, borderRadius: 14, objectFit: 'cover', flexShrink: 0,
              border: '0.5px solid rgba(255,255,255,0.08)',
            }} loading="lazy"/>
          ))}
        </div>
      </div>

      {/* Hours / weather panel */}
      <div style={{ padding: '0 22px 18px' }}>
        <div style={{ fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', color: p.accent, fontWeight: 600, marginBottom: 10 }}>
          Today · Apr 6
        </div>
        <div style={{
          padding: '12px 16px', borderRadius: 16,
          background: p.surface, border: '0.5px solid rgba(255,255,255,0.06)',
        }}>
          {[
            { l: 'Status', v: 'Open now · until 18:00', accent: true },
            { l: 'Weather', v: 'Sunny 19° · clearing' },
            { l: 'Tickets', v: 'Free entry' },
            { l: 'Crowd forecast', v: 'Medium → low after 2pm' },
          ].map((r, i, arr) => (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '8px 0', borderBottom: i < arr.length - 1 ? '0.5px solid rgba(255,255,255,0.06)' : 'none',
              fontSize: 13,
            }}>
              <span style={{ color: p.textMuted }}>{r.l}</span>
              <span style={{ color: r.accent ? p.green : p.text, fontWeight: r.accent ? 600 : 400 }}>{r.v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Opening hours — expandable */}
      <OpeningHours/>

      {/* Reviews — feed-style cards from Google & Tripadvisor */}
      <Reviews/>

      {/* CTA footer — sticky-feeling at bottom */}
      <div style={{
        position: 'sticky', bottom: 0, padding: '14px 16px 34px',
        background: 'linear-gradient(180deg, transparent, rgba(10,10,18,0.9) 30%)',
        display: 'flex', gap: 10,
      }}>
        <button style={{
          flex: 1, height: 50, borderRadius: 25, background: p.accent,
          border: 'none', color: '#fff', fontWeight: 600, fontSize: 15,
          cursor: 'pointer', fontFamily: 'Geist, system-ui', letterSpacing: -0.2,
          boxShadow: '0 8px 28px rgba(95,160,255,0.32)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }} onClick={onAddTrip}>
          <Ico name="route" size={17} c="#fff" sw={2}/>
          Navigate now
        </button>
        <button style={{
          height: 50, padding: '0 18px', borderRadius: 25,
          background: 'rgba(255,255,255,0.08)', border: '0.5px solid rgba(255,255,255,0.12)',
          color: p.text, fontWeight: 500, fontSize: 14,
          cursor: 'pointer', fontFamily: 'Geist, system-ui',
          display: 'inline-flex', alignItems: 'center', gap: 6,
        }}>
          <Ico name="plus" size={16} c={p.text}/>
          Replace
        </button>
      </div>
    </div>
  );
}

window.ScreenDetail = ScreenDetail;

// ─── ReviewCard — provider rating chip ─────────────────────────────────
// Compact card showing a third-party review source (Google / Tripadvisor),
// the score, review count, and an optional badge / highlight tag.
function ReviewCard({ provider, name, score, count, highlight, badge, tone: p }) {
  const Logo = provider === 'google' ? GoogleMark : TripadvisorMark;
  return (
    <div style={{
      padding: '12px 12px', borderRadius: 14,
      background: p.surface, border: `0.5px solid ${p.line}`,
      display: 'flex', flexDirection: 'column', gap: 6,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Logo size={20}/>
        <span style={{ fontSize: 12, color: p.textMuted, fontWeight: 500 }}>{name}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span style={{ fontSize: 22, fontWeight: 600, color: p.text, fontVariantNumeric: 'tabular-nums', letterSpacing: -0.5 }}>{score}</span>
        <Stars5 value={parseFloat(score)} c={p.amber} dim={p.line}/>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: p.textMuted, fontVariantNumeric: 'tabular-nums' }}>
        {count} reviews
      </div>
      {highlight && (
        <div style={{
          marginTop: 2, padding: '3px 7px', borderRadius: 99, alignSelf: 'flex-start',
          background: p.accentSoft, color: p.accent, fontSize: 10, fontWeight: 600,
          letterSpacing: 0.4,
        }}>
          “{highlight}”
        </div>
      )}
      {badge && (
        <div style={{
          marginTop: 2, padding: '3px 7px', borderRadius: 99, alignSelf: 'flex-start',
          background: 'rgba(126,231,182,0.14)', color: p.green, fontSize: 10, fontWeight: 700,
          letterSpacing: 0.6, textTransform: 'uppercase',
          display: 'inline-flex', alignItems: 'center', gap: 4,
        }}>
          <svg width="9" height="9" viewBox="0 0 12 12" fill="none"><path d="M6 1l1.4 3.2L11 4.6 8.3 7l.7 3.5L6 8.7 3 10.5 3.7 7 1 4.6l3.6-.4L6 1z" fill="currentColor"/></svg>
          {badge}
        </div>
      )}
    </div>
  );
}

// Google "G" mark — official 4-color logo
function GoogleMark({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.99.66-2.25 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" fill="#34A853"/>
      <path d="M5.84 14.11A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.11V7.05H2.18A11 11 0 0 0 1 12c0 1.78.43 3.46 1.18 4.95l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.05l3.66 2.84C6.71 7.29 9.14 5.38 12 5.38z" fill="#EA4335"/>
    </svg>
  );
}

// Tripadvisor mark — green owl-head circle (simplified iconic version)
function TripadvisorMark({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
      <circle cx="12" cy="12" r="11" fill="#00AA6C"/>
      {/* left eye - dark with green pupil */}
      <circle cx="8.4" cy="12" r="3.1" fill="#0a1f1a"/>
      <circle cx="8.4" cy="12" r="1.2" fill="#00AA6C"/>
      {/* right eye - inverted */}
      <circle cx="15.6" cy="12" r="3.1" fill="#0a1f1a"/>
      <circle cx="15.6" cy="12" r="1.2" fill="#fff"/>
      {/* beak */}
      <path d="M12 14.4 L10.8 16.2 L13.2 16.2 Z" fill="#0a1f1a"/>
    </svg>
  );
}

// 5-star compact bar
function Stars5({ value = 5, c = '#FFC476', dim = 'rgba(255,255,255,0.15)' }) {
  const full = Math.floor(value);
  const half = value - full >= 0.5;
  return (
    <span style={{ display: 'inline-flex', gap: 1.5 }}>
      {[0,1,2,3,4].map(i => {
        const filled = i < full;
        const halfStar = !filled && i === full && half;
        return (
          <svg key={i} width="11" height="11" viewBox="0 0 12 12">
            <defs>
              <linearGradient id={`half${i}-${Math.random().toString(36).slice(2,6)}`} x1="0" x2="1" y1="0" y2="0">
                <stop offset="50%" stopColor={c}/>
                <stop offset="50%" stopColor={dim}/>
              </linearGradient>
            </defs>
            <path d="M6 1l1.4 3.2L11 4.6 8.3 7l.7 3.5L6 8.7 3 10.5 3.7 7 1 4.6l3.6-.4L6 1z"
              fill={filled ? c : (halfStar ? c : dim)}
              opacity={filled || halfStar ? 1 : 0.6}/>
            {halfStar && (
              <path d="M6 1l1.4 3.2L11 4.6 8.3 7l.7 3.5L6 8.7 3 10.5 3.7 7 1 4.6l3.6-.4L6 1z"
                fill={dim} clipPath={`inset(0 0 0 50%)`}/>
            )}
          </svg>
        );
      })}
    </span>
  );
}

// ─── Reviews — feed-style cards from Google + Tripadvisor ────────────
function Reviews() {
  const p = window.useTheme();
  const { Ico } = window;
  const P = window.PHOTOS;

  const REVIEWS = [
    {
      provider: 'google',
      avatar: P.user1, name: 'Mika T.', meta: 'Local Guide · 412 reviews',
      when: '2 weeks ago', stars: 5,
      photo: P.fushimi,
      body: 'Hidden away on a narrow lane — went at 11am and only 4 people inside. The kake udon was the silkiest I\'ve ever had. Cash only, bring small bills.',
      tags: ['Hand-pulled', 'Cash only', 'Quiet at 11am'],
      helpful: 47,
    },
    {
      provider: 'tripadvisor',
      avatar: P.user2, name: 'Aurélie B.', meta: 'Lyon, France · 38 contributions',
      when: 'Apr 2026', stars: 5,
      photo: P.ramen,
      body: 'Worth the 15-min walk from the station. We sat at the counter and watched the chef pull noodles to order. The dashi has real depth — not just MSG.',
      tags: ['Counter seating', 'Watch the chef'],
      helpful: 23,
    },
    {
      provider: 'google',
      avatar: P.user3, name: 'James K.', meta: '· 67 reviews',
      when: 'Mar 2026', stars: 4,
      photo: P.matcha,
      body: 'Great food, but the queue at 13:00 was 25+ minutes. Come before noon or after 14:30 for walk-in seating.',
      tags: ['Long queue at lunch'],
      helpful: 12,
    },
  ];

  return (
    <div style={{ padding: '0 22px 18px' }}>
      <div style={{
        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12,
      }}>
        <div style={{
          fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase',
          color: p.accent, fontWeight: 600,
        }}>
          What travelers say
        </div>
        <button style={{
          fontSize: 11, color: p.accent, fontWeight: 600, fontFamily: 'Geist, system-ui',
          background: 'none', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 4,
        }}>
          See all 1,284
          <Ico name="arrow" size={11} c={p.accent} sw={2.2}/>
        </button>
      </div>

      {/* Provider summary strip */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14,
      }}>
        <ProviderSummary provider="google" score="4.7" count="892" tone={p}/>
        <ProviderSummary provider="tripadvisor" score="4.8" count="392" badge="Travelers' Choice" tone={p}/>
      </div>

      {/* Feed-style review cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {REVIEWS.map((r, i) => (
          <ReviewFeedCard key={i} r={r} tone={p}/>
        ))}
      </div>
    </div>
  );
}

function ProviderSummary({ provider, score, count, badge, tone: p }) {
  const Logo = provider === 'google' ? GoogleMark : TripadvisorMark;
  return (
    <div style={{
      padding: '12px 12px', borderRadius: 14,
      background: p.surface, border: `0.5px solid ${p.line}`,
      display: 'flex', flexDirection: 'column', gap: 6,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Logo size={18}/>
        <span style={{ fontSize: 11, color: p.textMuted, fontWeight: 500 }}>
          {provider === 'google' ? 'Google' : 'Tripadvisor'}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span style={{
          fontSize: 22, fontWeight: 600, color: p.text,
          fontVariantNumeric: 'tabular-nums', letterSpacing: -0.5,
        }}>{score}</span>
        <Stars5 value={parseFloat(score)} c={p.amber} dim={p.line}/>
      </div>
      <div style={{ fontSize: 11, color: p.textMuted, fontVariantNumeric: 'tabular-nums' }}>
        {count} reviews
      </div>
      {badge && (
        <div style={{
          marginTop: 2, padding: '3px 7px', borderRadius: 99, alignSelf: 'flex-start',
          background: 'rgba(126,231,182,0.14)', color: p.green, fontSize: 10, fontWeight: 700,
          letterSpacing: 0.6, textTransform: 'uppercase',
          display: 'inline-flex', alignItems: 'center', gap: 4,
        }}>
          <svg width="9" height="9" viewBox="0 0 12 12" fill="none"><path d="M6 1l1.4 3.2L11 4.6 8.3 7l.7 3.5L6 8.7 3 10.5 3.7 7 1 4.6l3.6-.4L6 1z" fill="currentColor"/></svg>
          {badge}
        </div>
      )}
    </div>
  );
}

function ReviewFeedCard({ r, tone: p }) {
  const { Ico } = window;
  const Logo = r.provider === 'google' ? GoogleMark : TripadvisorMark;
  return (
    <div style={{
      borderRadius: 18, overflow: 'hidden',
      background: p.surface, border: `0.5px solid ${p.line}`,
    }}>
      {/* Author row */}
      <div style={{ padding: '12px 14px 10px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <img src={r.avatar} alt="" style={{
          width: 36, height: 36, borderRadius: 18, objectFit: 'cover', flexShrink: 0,
        }} loading="lazy"/>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 13, fontWeight: 600, color: p.text, lineHeight: 1.2,
            textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap',
          }}>{r.name}</div>
          <div style={{
            fontSize: 10, color: p.textMuted, marginTop: 2,
            textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap',
          }}>{r.meta}</div>
        </div>
        <div style={{
          flexShrink: 0, padding: '4px 8px', borderRadius: 99,
          background: p.dark ? 'rgba(255,255,255,0.04)' : 'rgba(15,30,80,0.04)',
          border: `0.5px solid ${p.line}`,
          display: 'inline-flex', alignItems: 'center', gap: 5,
        }}>
          <Logo size={12}/>
          <span style={{ fontSize: 10, color: p.textMuted, fontWeight: 500 }}>
            {r.provider === 'google' ? 'Google' : 'Tripadvisor'}
          </span>
        </div>
      </div>

      {/* Photo */}
      <div style={{ position: 'relative', background: '#000' }}>
        <img src={r.photo} alt="" style={{
          width: '100%', height: 220, objectFit: 'cover', display: 'block',
        }} loading="lazy"/>
        <div style={{
          position: 'absolute', top: 10, left: 10,
          padding: '4px 8px', borderRadius: 99,
          background: 'rgba(11,10,24,0.5)', backdropFilter: 'blur(10px)',
          display: 'inline-flex', alignItems: 'center', gap: 5,
        }}>
          <Stars5 value={r.stars} c="#FFC476" dim="rgba(255,255,255,0.25)"/>
          <span style={{ fontSize: 10, color: '#fff', fontWeight: 600 }}>{r.stars}.0</span>
        </div>
        <div style={{
          position: 'absolute', top: 10, right: 10,
          padding: '4px 8px', borderRadius: 99,
          background: 'rgba(11,10,24,0.5)', backdropFilter: 'blur(10px)',
          fontSize: 10, color: 'rgba(255,255,255,0.85)', fontWeight: 500,
        }}>
          {r.when}
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '12px 14px 14px' }}>
        <div style={{ fontSize: 13.5, lineHeight: 1.45, color: p.text, textWrap: 'pretty' }}>
          {r.body}
        </div>

        {/* Tags */}
        {r.tags && r.tags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 10 }}>
            {r.tags.map((t, i) => (
              <span key={i} style={{
                padding: '3px 8px', borderRadius: 99,
                background: p.accentSoft, color: p.accent,
                fontSize: 10, fontWeight: 600,
              }}>{t}</span>
            ))}
          </div>
        )}

        {/* Footer actions */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 14, marginTop: 12,
          paddingTop: 10, borderTop: `0.5px solid ${p.line}`,
        }}>
          <button style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: 0, background: 'none', border: 'none', cursor: 'pointer',
            color: p.textMuted, fontSize: 11, fontWeight: 500, fontFamily: 'Geist, system-ui',
          }}>
            <Ico name="heart" size={13} c={p.textMuted}/>
            Helpful · {r.helpful}
          </button>
          <button style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: 0, background: 'none', border: 'none', cursor: 'pointer',
            color: p.textMuted, fontSize: 11, fontWeight: 500, fontFamily: 'Geist, system-ui',
          }}>
            <Ico name="share" size={13} c={p.textMuted}/>
            Share
          </button>
          <button style={{
            marginLeft: 'auto',
            padding: 0, background: 'none', border: 'none', cursor: 'pointer',
            color: p.accent, fontSize: 11, fontWeight: 600, fontFamily: 'Geist, system-ui',
          }}>
            Read more
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── OpeningHours — expandable accordion ──────────────────────────────
function OpeningHours() {
  const { useState } = React;
  const [open, setOpen] = useState(false);
  const p = window.useTheme();
  const { Ico } = window;

  const HOURS = [
    { day: 'Mon', open: '06:00', close: '18:00', today: false },
    { day: 'Tue', open: '06:00', close: '18:00', today: false },
    { day: 'Wed', open: '06:00', close: '18:00', today: false },
    { day: 'Thu', open: '06:00', close: '18:00', today: true }, // today
    { day: 'Fri', open: '06:00', close: '18:00', today: false },
    { day: 'Sat', open: '05:30', close: '19:00', today: false, special: 'Extended weekend' },
    { day: 'Sun', open: '05:30', close: '19:00', today: false, special: 'Extended weekend' },
  ];

  // Crowd by hour (06–19, 14 bins). Lower bar = quieter.
  const CROWD = [1, 1, 2, 2, 3, 4, 5, 5, 4, 3, 2, 2, 1, 1];
  const HOURS_RANGE = ['6','7','8','9','10','11','12','13','14','15','16','17','18','19'];
  const NOW_HOUR = 10; // index — 10am

  return (
    <div style={{ padding: '0 22px 18px' }}>
      <div style={{
        fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase',
        color: p.accent, fontWeight: 600, marginBottom: 10,
      }}>
        Opening hours
      </div>

      <div style={{
        borderRadius: 16, background: p.surface,
        border: `0.5px solid ${p.line}`, overflow: 'hidden',
      }}>
        {/* Header row — always visible. Tap toggles. */}
        <button onClick={() => setOpen(!open)} style={{
          width: '100%', padding: '14px 16px', background: 'transparent',
          border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center',
          gap: 12, fontFamily: 'Geist, system-ui', textAlign: 'left',
        }}>
          <span style={{
            width: 8, height: 8, borderRadius: 4, background: p.green,
            boxShadow: `0 0 10px ${p.green}`, flexShrink: 0,
            animation: 'pulse 1.8s ease-in-out infinite',
          }}/>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: p.text }}>
              Open now <span style={{ color: p.textMuted, fontWeight: 400 }}>· closes 18:00</span>
            </div>
            <div style={{ fontSize: 11, color: p.textMuted, marginTop: 2 }}>
              Best time to visit · 8–10am or after 2pm
            </div>
          </div>
          <Ico name="arrow" size={14} c={p.textDim}
            style={{ transform: open ? 'rotate(-90deg)' : 'rotate(90deg)', transition: 'transform .18s' }}/>
        </button>

        {open && (
          <div style={{ borderTop: `0.5px solid ${p.line}`, padding: '12px 16px 16px' }}>
            {/* Day-by-day */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {HOURS.map((h, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '7px 8px', borderRadius: 8,
                  background: h.today ? p.accentSoft : 'transparent',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                    <span style={{
                      fontSize: 12, fontWeight: h.today ? 700 : 500,
                      color: h.today ? p.accent : p.text, width: 28,
                    }}>{h.day}</span>
                    {h.today && (
                      <span style={{
                        fontSize: 9, padding: '2px 6px', borderRadius: 99,
                        background: p.accent, color: '#fff', letterSpacing: 1, textTransform: 'uppercase', fontWeight: 700,
                      }}>Today</span>
                    )}
                    {h.special && (
                      <span style={{ fontSize: 10, color: p.textMuted, fontStyle: 'italic' }}>
                        {h.special}
                      </span>
                    )}
                  </div>
                  <span style={{
                    fontSize: 12, fontWeight: h.today ? 600 : 400, color: h.today ? p.text : p.textMuted,
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    {h.open} – {h.close}
                  </span>
                </div>
              ))}
            </div>

            {/* Crowd-by-hour chart */}
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase', color: p.textMuted, fontWeight: 600, marginBottom: 8 }}>
                Typical crowd · today
              </div>
              <div style={{
                display: 'flex', alignItems: 'flex-end', gap: 3, height: 56,
                padding: '0 2px',
              }}>
                {CROWD.map((v, i) => {
                  const pct = v / 5;
                  const isNow = i === NOW_HOUR;
                  return (
                    <div key={i} style={{
                      flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                    }}>
                      <div style={{
                        width: '100%', height: `${pct * 44}px`, borderRadius: 4,
                        background: isNow
                          ? window.SIRI_GRADIENT_LINEAR
                          : (v >= 4 ? p.danger + '88' : v >= 3 ? p.amber + '88' : p.green + '88'),
                        boxShadow: isNow ? `0 0 12px ${p.glow}` : 'none',
                        transition: 'all .2s',
                      }}/>
                      <div style={{
                        fontSize: 8, color: isNow ? p.accent : p.textDim, fontWeight: isNow ? 700 : 500,
                        fontVariantNumeric: 'tabular-nums',
                      }}>
                        {HOURS_RANGE[i]}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 10, color: p.textMuted }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 4, background: p.green + '88' }}/>
                  Quiet
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 4, background: p.amber + '88' }}/>
                  Busy
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 4, background: p.danger + '88' }}/>
                  Packed
                </span>
              </div>
            </div>

            {/* Special notes */}
            <div style={{
              marginTop: 14, padding: '10px 12px', borderRadius: 12,
              background: p.dark ? 'rgba(255,196,118,0.08)' : 'rgba(216,138,43,0.08)',
              border: `0.5px solid ${p.amber}44`,
              display: 'flex', gap: 8, alignItems: 'flex-start',
            }}>
              <Ico name="sparkle" size={13} c={p.amber}/>
              <div style={{ flex: 1, fontSize: 11.5, color: p.text, lineHeight: 1.45 }}>
                <span style={{ fontWeight: 600 }}>Heads up: </span>
                Closed Apr 30 for the spring cleaning. Last entry 30 min before closing.
              </div>
            </div>

            {/* Quick links */}
            <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
              <button style={{
                flex: 1, height: 36, borderRadius: 18,
                background: 'transparent', border: `0.5px solid ${p.line}`,
                color: p.text, fontSize: 12, fontWeight: 500, cursor: 'pointer',
                fontFamily: 'Geist, system-ui',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              }}>
                <Ico name="mail" size={13} c={p.accent}/>
                Contact
              </button>
              <button style={{
                flex: 1, height: 36, borderRadius: 18,
                background: 'transparent', border: `0.5px solid ${p.line}`,
                color: p.text, fontSize: 12, fontWeight: 500, cursor: 'pointer',
                fontFamily: 'Geist, system-ui',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              }}>
                <Ico name="globe" size={13} c={p.accent}/>
                Website
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
