// screen-timeline.jsx — HERO screen 1 of 2.
//
// Layout (top→bottom):
//   1. Top bar — destination, day name, day switcher chips, map button
//   2. NEXT UP — huge hero card for items[livePos]. Countdown, transport,
//      crowd, weather, reservation status, big CTA pair (Directions/Chat).
//   3. Rest of today — compact rail showing remaining items, transport
//      chips clickable to open transport sheet.
//   4. Earlier today — collapsed dim list of past items.
//   5. AI update banner (replan suggestion) pinned bottom.

const { useState: useStateT, useRef: useRefT } = React;

function ScreenTimeline({ onOpenLocation, onOpenChat, onOpenMap, onOpenTransport, onEditPlan, onShare, currentDay = 3 }) {
  const p = window.useTheme();
  const { Ico, Pill, AIOrb, Photo, Crowd, TransportChip, StatusDot } = window;

  const day = window.TRIP.days[currentDay - 1];
  const items = window.DAY3;

  // Index 1 is the "next up" — item before is past, items after are upcoming.
  const livePos = 1;
  const next = items[livePos];
  const past = items.slice(0, livePos);
  const upcoming = items.slice(livePos + 1);
  const [showBanner, setShowBanner] = useStateT(true);

  return (
    <div style={{
      position: 'absolute', inset: 0, background: p.bg, color: p.text,
      fontFamily: 'Geist, system-ui', display: 'flex', flexDirection: 'column',
    }}>
      {/* Top bar — fixed, glass */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
        paddingTop: 56, paddingBottom: 8,
        background: p.dark ? 'rgba(7,12,28,0.96)' : 'rgba(234,241,255,0.96)',
        backdropFilter: 'blur(20px)',
        borderBottom: `0.5px solid ${p.line}`,
      }}>
        <div style={{ padding: '0 22px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: 1.8, textTransform: 'uppercase', color: p.accent, fontWeight: 600 }}>
              Kyoto · {day.date}
            </div>
            <div style={{
              fontSize: 28, lineHeight: 1, letterSpacing: -0.8, marginTop: 4, fontWeight: 600,
            }}>
              {day.name}
            </div>
          </div>
          <button onClick={onOpenMap} style={{
            width: 40, height: 40, borderRadius: 20,
            background: p.dark ? 'rgba(255,255,255,0.08)' : 'rgba(27,18,64,0.05)',
            border: `0.5px solid ${p.line}`, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Ico name="map" size={18} c={p.text}/>
          </button>
        </div>

        {/* Day switcher */}
        <div style={{
          display: 'flex', gap: 6, padding: '14px 22px 8px', overflowX: 'auto',
          scrollbarWidth: 'none',
        }}>
          {window.TRIP.days.map((d, i) => {
            const sel = i === currentDay - 1;
            const isPast = i < currentDay - 1;
            return (
              <button key={i} style={{
                flexShrink: 0, padding: '6px 12px', borderRadius: 14,
                background: sel ? p.accent : (p.dark ? 'rgba(255,255,255,0.04)' : 'rgba(27,18,64,0.04)'),
                color: sel ? '#fff' : (isPast ? p.textDim : p.text),
                border: `0.5px solid ${sel ? p.accent : p.line}`,
                cursor: 'pointer', fontFamily: 'Geist, system-ui',
                minWidth: 54, textAlign: 'center',
              }}>
                <div style={{ fontSize: 10, fontWeight: 500, opacity: sel ? 0.85 : 0.6, letterSpacing: 0.8, textTransform: 'uppercase' }}>
                  {d.label.replace('Day ', 'D')}
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, marginTop: 1 }}>
                  {d.date.split(' ')[1]}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Scrollable content */}
      <div style={{
        flex: 1, overflow: 'auto', paddingTop: 200, paddingBottom: 120,
        scrollbarWidth: 'none',
      }}>
        {/* Weather strip */}
        <div style={{ padding: '4px 16px 14px' }}>
          <window.WeatherStrip/>
        </div>

        {/* NEXT UP — hero */}
        <div style={{ padding: '4px 16px 18px' }}>
          {/* Kicker */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '0 6px 10px',
          }}>
            <span style={{
              width: 8, height: 8, borderRadius: 4, background: p.green,
              boxShadow: `0 0 12px ${p.green}`, animation: 'pulse 1.6s ease-in-out infinite',
            }}/>
            <span style={{
              fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: p.accent, fontWeight: 700,
              background: window.SIRI_GRADIENT_LINEAR,
              WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
            }}>
              NEXT UP · in 42 min
            </span>
          </div>

          <button onClick={() => onOpenLocation && onOpenLocation(next)} style={{
            width: '100%', padding: 0, cursor: 'pointer', textAlign: 'left',
            background: 'transparent', border: 'none', fontFamily: 'Geist, system-ui',
            display: 'block',
          }}>
            <div style={{
              borderRadius: 28, overflow: 'hidden', position: 'relative',
              background: p.surface, border: `1px solid ${p.accent}30`,
              boxShadow: `0 24px 60px ${p.glow}, 0 0 0 1px ${p.accent}15`,
            }}>
              {/* Hero photo */}
              <div style={{ position: 'relative', height: 240, background: `linear-gradient(135deg, ${p.surface}, ${p.surfaceHi})` }}>
                <img src={next.img} alt="" style={{
                  width: '100%', height: '100%', objectFit: 'cover', display: 'block',
                }} onError={(e) => { e.currentTarget.src = window.PHOTOS.kyotoHero; }}/>
                {/* Gradient overlays */}
                <div style={{ position: 'absolute', inset: 0,
                  background: 'linear-gradient(180deg, rgba(11,10,24,0.45) 0%, transparent 35%, rgba(11,10,24,0.85) 100%)' }}/>
                {/* Top badges */}
                <div style={{ position: 'absolute', top: 14, left: 14, right: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Pill tone="glass" size="sm" icon="clock">
                    <span style={{ fontFamily: 'Geist, system-ui', fontVariantNumeric: 'tabular-nums', letterSpacing: 0.5 }}>{next.time}</span>
                    <span style={{ opacity: 0.5, margin: '0 4px' }}>·</span>
                    {next.dur}
                  </Pill>
                  <div style={{
                    padding: '6px 11px', borderRadius: 99,
                    background: window.SIRI_GRADIENT_LINEAR, color: '#fff',
                    fontSize: 11, fontWeight: 700, letterSpacing: 1.4, textTransform: 'uppercase',
                    display: 'flex', alignItems: 'center', gap: 4,
                    boxShadow: '0 8px 22px rgba(95,160,255,0.4)',
                  }}>
                    <Ico name="sparkle" size={11} c="#fff" sw={2.5}/>
                    NEXT
                  </div>
                </div>
                {/* Title overlay */}
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0 18px 18px' }}>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', letterSpacing: 0.5, marginBottom: 4 }}>
                    {next.area} · {next.tag}
                  </div>
                  <div style={{
                    fontSize: 24, lineHeight: 1.1, letterSpacing: -0.6, color: '#fff', fontWeight: 600,
                    textWrap: 'pretty',
                  }}>
                    {next.title}
                  </div>
                </div>
              </div>

              {/* Lower info strip */}
              <div style={{
                padding: '14px 16px', display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)', gap: 10,
                borderBottom: `0.5px solid ${p.line}`,
              }}>
                <div>
                  <div style={{ fontSize: 9, color: p.textDim, letterSpacing: 1.2, textTransform: 'uppercase', fontWeight: 600, marginBottom: 3 }}>Crowd</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Crowd level={next.crowd}/>
                    <span style={{ fontSize: 12, color: p.text, fontWeight: 500 }}>{next.crowd}</span>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 9, color: p.textDim, letterSpacing: 1.2, textTransform: 'uppercase', fontWeight: 600, marginBottom: 3 }}>Weather</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Ico name="sun" size={13} c={p.amber}/>
                    <span style={{ fontSize: 12, color: p.text, fontWeight: 500 }}>19° sunny</span>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 9, color: p.textDim, letterSpacing: 1.2, textTransform: 'uppercase', fontWeight: 600, marginBottom: 3 }}>Rating</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Ico name="star" size={13} c={p.amber}/>
                    <span style={{ fontSize: 12, color: p.text, fontWeight: 500 }}>{next.rating}</span>
                  </div>
                </div>
              </div>

              {/* CTA row */}
              <div style={{ padding: '12px 14px', display: 'flex', gap: 8 }}>
                <div style={{
                  flex: 1, height: 44, borderRadius: 22,
                  background: window.SIRI_GRADIENT_LINEAR, color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  fontSize: 14, fontWeight: 600, letterSpacing: -0.2,
                  boxShadow: '0 8px 22px rgba(95,160,255,0.32)',
                }}>
                  <Ico name="route" size={16} c="#fff" sw={2.2}/>
                  Get directions
                </div>
                <div onClick={(e) => { e.stopPropagation(); onOpenTransport && onOpenTransport(next); }} style={{
                  height: 44, padding: '0 14px', borderRadius: 22,
                  background: p.dark ? 'rgba(255,255,255,0.06)' : 'rgba(27,18,64,0.04)',
                  border: `0.5px solid ${p.line}`,
                  display: 'flex', alignItems: 'center', gap: 6,
                  fontSize: 13, color: p.text, fontWeight: 500,
                }}>
                  <Ico name="taxi" size={14} c={p.accent}/>
                  {next.transport.dur}
                </div>
              </div>
            </div>
          </button>
        </div>

        {/* Rest of today */}
        <div style={{ padding: '0 22px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', color: p.accent, fontWeight: 600 }}>
            Rest of today · {upcoming.length} stops
          </div>
          <button onClick={onEditPlan} style={{
            fontSize: 11, color: p.accent, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Geist, system-ui',
            fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <Ico name="plus" size={11} c={p.accent} sw={2.5}/>
            Edit plan
          </button>
        </div>

        <div style={{ position: 'relative', paddingLeft: 78, paddingRight: 16, paddingTop: 6 }}>
          <div style={{
            position: 'absolute', left: 58, top: 14, bottom: 22, width: 1,
            background: `linear-gradient(180deg, ${p.accent}66 0%, ${p.dark ? 'rgba(255,255,255,0.08)' : 'rgba(27,18,64,0.08)'} 70%)`,
          }}/>

          {upcoming.map((it, i) => {
            // Weather per time slot — fake but coherent with WeatherStrip
            const wxByTime = { '13:00': { k: 'sun', t: 21 }, '15:00': { k: 'sun', t: 20 }, '18:30': { k: 'cloud', t: 16 } };
            const wx = wxByTime[it.time];
            return (
            <div key={it.id} style={{ marginBottom: 16, position: 'relative' }}>
              <div style={{ position: 'absolute', left: -78, top: 14, width: 48, textAlign: 'right' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: p.text, fontFamily: 'Geist, system-ui', fontVariantNumeric: 'tabular-nums', letterSpacing: 0.2 }}>
                  {it.time}
                </div>
                <div style={{ fontSize: 9, color: p.textDim, fontFamily: 'Geist, system-ui', fontVariantNumeric: 'tabular-nums', marginTop: 3 }}>
                  {it.dur}
                </div>
                {wx && (
                  <div style={{ marginTop: 6, display: 'flex', justifyContent: 'flex-end' }}>
                    <window.WeatherTick kind={wx.k} temp={wx.t} size={11}/>
                  </div>
                )}
              </div>
              <span style={{
                position: 'absolute', left: -22, top: 19,
                width: 8, height: 8, borderRadius: '50%',
                background: it.status === 'at-risk' ? p.danger
                          : it.status === 'suggestion' ? p.pink
                          : p.accent,
                border: `2px solid ${p.bg}`, boxSizing: 'border-box',
                boxShadow: it.status === 'at-risk'
                  ? `0 0 0 3px ${p.danger}33, 0 0 12px ${p.danger}`
                  : `0 0 0 3px ${p.accentSoft}`,
                animation: it.status === 'at-risk' ? 'pulseRing 2s ease-in-out infinite' : undefined,
              }}/>

              <button onClick={() => onOpenLocation && onOpenLocation(it)} style={{
                width: '100%', padding: '10px 12px', borderRadius: 16,
                background: it.status === 'at-risk'
                  ? (p.dark ? 'rgba(255,110,140,0.10)' : 'rgba(230,78,112,0.06)')
                  : p.surface,
                border: `0.5px solid ${it.status === 'at-risk' ? p.danger + '55' : p.line}`,
                display: 'flex', gap: 12, alignItems: 'center', cursor: 'pointer',
                textAlign: 'left', fontFamily: 'Geist, system-ui',
                position: 'relative',
              }}>
                <img src={it.img} alt="" style={{
                  width: 52, height: 52, borderRadius: 12, objectFit: 'cover', flexShrink: 0,
                  filter: it.status === 'at-risk' ? 'grayscale(0.3) brightness(0.85)' : 'none',
                }} loading="lazy"/>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                    {it.status === 'booked' && (
                      <span style={{ fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', fontWeight: 700,
                        padding: '2px 5px', borderRadius: 3, background: 'rgba(126,231,182,0.14)', color: p.green }}>
                        Booked
                      </span>
                    )}
                    {it.status === 'suggestion' && (
                      <span style={{ fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', fontWeight: 700,
                        padding: '2px 5px', borderRadius: 3, background: window.SIRI_GRADIENT_LINEAR, color: '#fff' }}>
                        AI pick
                      </span>
                    )}
                    {it.status === 'at-risk' && (
                      <span style={{ fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', fontWeight: 700,
                        padding: '2px 6px', borderRadius: 3,
                        background: p.danger, color: '#fff',
                        display: 'inline-flex', alignItems: 'center', gap: 3,
                      }}>
                        <span style={{
                          width: 4, height: 4, borderRadius: 2, background: '#fff',
                          animation: 'pulse 1.2s ease-in-out infinite',
                        }}/>
                        At risk
                      </span>
                    )}
                  </div>
                  <div style={{
                    fontSize: 14, fontWeight: 600,
                    color: it.status === 'at-risk' ? p.textMuted : p.text, lineHeight: 1.2,
                    textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap',
                  }}>{it.title}</div>
                  <div style={{ fontSize: 11, color: p.textMuted, marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>{it.area}</span><span style={{ opacity: 0.4 }}>·</span>
                    <Crowd level={it.crowd}/>
                    <span style={{ opacity: 0.4 }}>·</span>
                    <Ico name="star" size={10} c={p.amber}/>
                    <span>{it.rating}</span>
                  </div>
                </div>
                <Ico name="arrow" size={14} c={p.textDim}/>
              </button>

              {/* At-risk inline AI suggestion */}
              {it.issue && (
                <div style={{
                  marginTop: 10, padding: '14px 14px 12px', borderRadius: 16,
                  background: p.dark ? 'rgba(11,17,38,0.85)' : 'rgba(255,255,255,0.9)',
                  border: `0.5px solid ${p.danger}44`,
                  boxShadow: `0 8px 24px ${p.dark ? 'rgba(0,0,0,0.4)' : 'rgba(15,30,80,0.08)'}`,
                }}>
                  {/* Reason row */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
                    <span style={{
                      width: 22, height: 22, borderRadius: 11, flexShrink: 0,
                      background: p.danger,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: `0 0 0 4px ${p.danger}22`,
                    }}>
                      <span style={{ fontSize: 14, fontWeight: 800, color: '#fff', lineHeight: 1 }}>!</span>
                    </span>
                    <div style={{ flex: 1, paddingTop: 1 }}>
                      <div style={{
                        fontSize: 11, color: p.danger, letterSpacing: 1.3, textTransform: 'uppercase', fontWeight: 700,
                        marginBottom: 3,
                      }}>
                        Probably won't work
                      </div>
                      <div style={{ fontSize: 13, color: p.text, lineHeight: 1.4 }}>
                        {it.issue.label}
                      </div>
                    </div>
                  </div>

                  {/* AI suggestion preview — small place card */}
                  <button onClick={(e) => { e.stopPropagation(); onOpenLocation && onOpenLocation({
                    ...it, id: 'hosen', title: 'Hosen-in · moss garden', area: 'Ohara',
                    tag: 'Indoor · 12 visitors right now', img: window.PHOTOS.garden, rating: 4.8, crowd: 'low',
                  }); }} style={{
                    width: '100%', padding: 10, borderRadius: 13, cursor: 'pointer',
                    background: p.dark ? 'rgba(10,132,255,0.10)' : 'rgba(0,122,255,0.06)',
                    border: `0.5px solid ${p.accent}44`,
                    display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left',
                    fontFamily: 'Geist, system-ui',
                  }}>
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      <img src={window.PHOTOS.garden} alt="" style={{
                        width: 46, height: 46, borderRadius: 10, objectFit: 'cover',
                      }} loading="lazy"/>
                      <span style={{
                        position: 'absolute', top: -4, right: -4,
                        width: 18, height: 18, borderRadius: 9, padding: 0,
                        background: window.SIRI_GRADIENT_LINEAR,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: `2px solid ${p.dark ? '#0B1126' : '#fff'}`,
                      }}>
                        <window.Ico name="sparkle" size={10} c="#fff"/>
                      </span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 10, color: p.accent, letterSpacing: 1, textTransform: 'uppercase', fontWeight: 700, marginBottom: 2 }}>
                        AI suggests instead
                      </div>
                      <div style={{
                        fontSize: 13, fontWeight: 600, color: p.text, lineHeight: 1.2,
                        textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap',
                      }}>
                        Hosen-in · moss garden
                      </div>
                      <div style={{ fontSize: 10, color: p.textMuted, marginTop: 2, display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span>Indoor · 12 min taxi</span>
                        <span style={{ opacity: 0.4 }}>·</span>
                        <window.Ico name="star" size={10} c={p.amber}/>
                        <span>4.8</span>
                        <span style={{ opacity: 0.4 }}>·</span>
                        <window.Crowd level="low"/>
                      </div>
                    </div>
                    <window.Ico name="arrow" size={14} c={p.accent}/>
                  </button>

                  {/* Action row */}
                  <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                    <button style={{
                      flex: 1, height: 36, borderRadius: 18,
                      background: window.SIRI_GRADIENT_LINEAR, color: '#fff',
                      border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                      fontFamily: 'Geist, system-ui', boxShadow: `0 6px 16px ${p.glow}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                    }}>
                      <window.Ico name="check" size={13} c="#fff" sw={2.5}/>
                      Swap automatically
                    </button>
                    <button style={{
                      height: 36, padding: '0 14px', borderRadius: 18,
                      background: 'transparent', border: `0.5px solid ${p.line}`,
                      color: p.textMuted, fontSize: 12, fontWeight: 500, cursor: 'pointer',
                      fontFamily: 'Geist, system-ui',
                    }}>
                      Keep
                    </button>
                  </div>
                </div>
              )}

              {i < upcoming.length - 1 && (
                <div style={{ marginTop: 8, marginLeft: 4 }}>
                  <TransportChip
                    mode={upcoming[i + 1].transport.mode}
                    dur={upcoming[i + 1].transport.dur}
                    detail={upcoming[i + 1].transport.line || upcoming[i + 1].transport.cost}
                    onClick={() => onOpenTransport && onOpenTransport(upcoming[i + 1])}
                  />
                </div>
              )}
            </div>
          );})}
        </div>

        {/* Earlier today */}
        {past.length > 0 && (
          <details style={{ padding: '8px 22px 0' }}>
            <summary style={{
              cursor: 'pointer', listStyle: 'none', display: 'flex',
              alignItems: 'center', justifyContent: 'space-between', padding: '8px 0',
              fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', color: p.textMuted, fontWeight: 600,
            }}>
              <span>Earlier today · {past.length}</span>
              <Ico name="arrow" size={12} c={p.textDim} style={{ transform: 'rotate(90deg)' }}/>
            </summary>
            {past.map(it => (
              <div key={it.id} style={{
                display: 'flex', gap: 10, padding: '8px 0', alignItems: 'center', opacity: 0.55,
              }}>
                <img src={it.img} alt="" style={{
                  width: 36, height: 36, borderRadius: 10, objectFit: 'cover', filter: 'grayscale(0.3)',
                }} loading="lazy"/>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, color: p.text, fontWeight: 500, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{it.title}</div>
                  <div style={{ fontSize: 10, color: p.textMuted, fontFamily: 'Geist, system-ui', fontVariantNumeric: 'tabular-nums' }}>{it.time}</div>
                </div>
                <Ico name="check" size={12} c={p.green} sw={2.2}/>
              </div>
            ))}
          </details>
        )}

        {/* Tomorrow preview */}
        <div style={{ padding: '14px 16px 0' }}>
          <div style={{
            padding: '14px 14px 14px', borderRadius: 18,
            border: `0.5px dashed ${p.accent}55`,
            background: p.accentSoft,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <AIOrb size={18}/>
              <span style={{ fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', color: p.accent, fontWeight: 600 }}>
                Tomorrow's preview
              </span>
            </div>
            <div style={{ fontSize: 13, color: p.text, lineHeight: 1.5 }}>
              Light rain rolls in around 11 — I've moved the rooftop tea ceremony to morning and queued an indoor pottery studio for the afternoon.
            </div>
          </div>
        </div>
      </div>

      {/* Bottom AI banner (replanning suggestion) */}
      {showBanner && (
      <div style={{
        position: 'absolute', bottom: 96, left: 16, right: 16,
        padding: '12px 14px', borderRadius: 18,
        background: p.dark ? 'rgba(24,23,52,0.9)' : 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(20px)',
        border: `0.5px solid ${p.accent}55`,
        boxShadow: `0 12px 36px ${p.glow}, 0 0 0 1px ${p.accent}15`,
        display: 'flex', alignItems: 'center', gap: 12, color: p.text,
        fontFamily: 'Geist, system-ui',
      }}>
        <button onClick={onOpenChat} style={{
          flex: 1, display: 'flex', alignItems: 'center', gap: 12,
          background: 'transparent', border: 'none', padding: 0, cursor: 'pointer',
          color: p.text, textAlign: 'left', fontFamily: 'inherit',
        }}>
          <AIOrb size={24}/>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: p.accent, letterSpacing: 1.2, textTransform: 'uppercase', fontWeight: 600 }}>
              Companion · 1 update
            </div>
            <div style={{ fontSize: 13, marginTop: 1 }}>
              Crowds dropping at Kinkaku-ji — swap order?
            </div>
          </div>
          <Ico name="arrow" size={18} c={p.accent}/>
        </button>
        <button onClick={() => setShowBanner(false)} aria-label="Dismiss" style={{
          width: 26, height: 26, borderRadius: 13, padding: 0, flexShrink: 0,
          background: p.dark ? 'rgba(255,255,255,0.06)' : 'rgba(15,30,80,0.05)',
          border: `0.5px solid ${p.line}`, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Ico name="close" size={12} c={p.textMuted} sw={2.5}/>
        </button>
      </div>
      )}
    </div>
  );
}

window.ScreenTimeline = ScreenTimeline;
