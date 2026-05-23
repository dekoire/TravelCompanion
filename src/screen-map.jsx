// screen-map.jsx — HERO screen 2 of 2.
//
// A dark stylized map of Kyoto, with:
//   - subtle topographic / grid lines as background
//   - the day-3 route drawn as a glowing curve through pins
//   - a pulsing "you are here" indicator
//   - selectable activity pins; selected pin lifts and a swipeable card
//     for nearby alternatives appears in a bottom sheet
//   - top controls (search, layers, AI)
//
// The map is hand-drawn SVG (no tiles) so it stays cinematic + offline.

const { useState: useStateM } = React;

function ScreenMap({ onOpenLocation, onOpenChat, onClose }) {
  const p = window.useTheme();
  const { Ico, Pill, AIOrb, Crowd, Photo } = window;

  // Start with NO pin selected — the sheet shows the full route list.
  // Tapping a pin (or list row) opens the focused detail card.
  const [selected, setSelected] = useStateM(null);

  const items = window.DAY3;
  const cur = items.find(i => i.id === selected);

  // Map canvas dimensions
  const W = 402, H = 874;

  // Theme-aware chrome tokens — used by every floating control (search, FAB,
  // filter chips, bottom sheet) so the map stays cinematic but doesn't ship
  // a black slab into the light theme.
  const isDark = p.dark;
  const chromeBg     = isDark ? 'rgba(26,26,38,0.7)'  : 'rgba(255,255,255,0.82)';
  const chromeBgHi   = isDark ? 'rgba(26,26,38,0.85)' : 'rgba(255,255,255,0.92)';
  const chromeBrd    = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(15,30,80,0.10)';
  const sheetBg      = isDark ? 'rgba(20,20,32,0.88)' : 'rgba(255,255,255,0.92)';
  const sheetBrd     = isDark ? 'rgba(255,255,255,0.1)'  : 'rgba(15,30,80,0.08)';
  const dim          = isDark ? 'rgba(255,255,255,0.5)' : p.textMuted;
  const dimmer       = isDark ? 'rgba(255,255,255,0.4)' : p.textDim;
  const cardBg       = isDark ? '#1a1a26' : '#fff';
  const chipKbdBg    = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,30,80,0.06)';

  // Convert relative pos (0..1) → pixel coords
  const px = (it) => ({ x: it.pos.x * W, y: it.pos.y * H });

  // Build the polyline string through all items in order
  const route = items.map(it => {
    const { x, y } = px(it);
    return `${x},${y}`;
  }).join(' ');

  return (
    <div style={{
      position: 'absolute', inset: 0, background: p.bg,
      color: p.text, fontFamily: 'Geist, system-ui', overflow: 'hidden',
    }}>
      {/* Map base — stylized dark layer with hand-drawn district shapes */}
      <svg viewBox={`0 0 ${W} ${H}`} style={{
        position: 'absolute', inset: 0, width: '100%', height: '100%',
      }}>
        <defs>
          <radialGradient id="mapBgGrad" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor={isDark ? '#13131F' : '#DCE6FF'}/>
            <stop offset="100%" stopColor={isDark ? '#06060C' : '#B6CDF7'}/>
          </radialGradient>
          <linearGradient id="routeGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={p.accent} stopOpacity="0.9"/>
            <stop offset="100%" stopColor={p.vermilion} stopOpacity="0.8"/>
          </linearGradient>
          <filter id="routeGlow">
            <feGaussianBlur stdDeviation="3"/>
          </filter>
        </defs>

        <rect width={W} height={H} fill="url(#mapBgGrad)"/>

        {/* Subtle grid */}
        {[...Array(20)].map((_, i) => (
          <line key={`v${i}`} x1={i * (W/20)} y1="0" x2={i * (W/20)} y2={H}
            stroke={isDark ? 'rgba(255,255,255,0.025)' : 'rgba(15,30,80,0.05)'} strokeWidth="1"/>
        ))}
        {[...Array(40)].map((_, i) => (
          <line key={`h${i}`} x1="0" y1={i * (H/40)} x2={W} y2={i * (H/40)}
            stroke={isDark ? 'rgba(255,255,255,0.025)' : 'rgba(15,30,80,0.05)'} strokeWidth="1"/>
        ))}

        {/* River — Kamogawa, runs N-S */}
        <path d="M 250 0 C 240 200, 280 350, 260 500 S 240 750, 250 874"
          stroke={isDark ? 'rgba(95,208,255,0.18)' : 'rgba(10,132,255,0.35)'} strokeWidth="14" fill="none" strokeLinecap="round"/>
        <path d="M 250 0 C 240 200, 280 350, 260 500 S 240 750, 250 874"
          stroke={isDark ? 'rgba(95,208,255,0.06)' : 'rgba(10,132,255,0.14)'} strokeWidth="28" fill="none" strokeLinecap="round"/>

        {/* District blobs */}
        {[
          { cx: 110, cy: 200, r: 80, label: 'Arashiyama', fill: isDark ? 'rgba(126,231,182,0.06)' : 'rgba(52,163,110,0.10)' },
          { cx: 320, cy: 380, r: 90, label: 'Higashiyama', fill: isDark ? 'rgba(95,160,255,0.05)' : 'rgba(10,132,255,0.08)' },
          { cx: 200, cy: 130, r: 75, label: 'Kita', fill: isDark ? 'rgba(201,167,255,0.04)' : 'rgba(140,90,220,0.07)' },
          { cx: 290, cy: 580, r: 70, label: 'Gion', fill: isDark ? 'rgba(255,119,200,0.06)' : 'rgba(217,73,143,0.09)' },
        ].map((d, i) => (
          <g key={i}>
            <circle cx={d.cx} cy={d.cy} r={d.r} fill={d.fill}/>
          </g>
        ))}

        {/* Road network — abstract */}
        <g stroke={isDark ? 'rgba(255,255,255,0.05)' : 'rgba(15,30,80,0.10)'} strokeWidth="1.5" fill="none">
          <path d="M 0 300 L 402 300"/>
          <path d="M 0 500 L 402 500"/>
          <path d="M 0 680 L 402 680"/>
          <path d="M 150 0 L 150 874"/>
          <path d="M 350 0 L 350 874"/>
          <path d="M 0 100 Q 200 150, 402 100"/>
        </g>

        {/* District labels */}
        {[
          { cx: 110, cy: 200, label: 'ARASHIYAMA' },
          { cx: 320, cy: 380, label: 'HIGASHIYAMA' },
          { cx: 200, cy: 130, label: 'KITA' },
          { cx: 290, cy: 580, label: 'GION' },
          { cx: 100, cy: 730, label: 'NISHIKI' },
        ].map((d, i) => (
          <text key={i} x={d.cx} y={d.cy} fill={isDark ? 'rgba(255,255,255,0.18)' : 'rgba(15,30,80,0.32)'} fontSize="9"
            fontFamily="Geist, system-ui" fontWeight="500" letterSpacing="2"
            textAnchor="middle">{d.label}</text>
        ))}

        {/* Route — glow underlay + crisp top */}
        <polyline points={route} stroke="url(#routeGrad)" strokeWidth="8"
          fill="none" strokeLinecap="round" strokeLinejoin="round"
          opacity="0.35" filter="url(#routeGlow)"/>
        <polyline points={route} stroke="url(#routeGrad)" strokeWidth="2.5"
          fill="none" strokeLinecap="round" strokeLinejoin="round"
          strokeDasharray="0 0"/>

        {/* You are here pulse */}
        <g transform={`translate(${0.45 * W} ${0.46 * H})`}>
          <circle r="22" fill="rgba(95,208,255,0.10)">
            <animate attributeName="r" values="14;30;14" dur="2.4s" repeatCount="indefinite"/>
            <animate attributeName="opacity" values="0.5;0;0.5" dur="2.4s" repeatCount="indefinite"/>
          </circle>
          <circle r="9" fill="#5FD0FF" opacity="0.4"/>
          <circle r="5" fill="#5FD0FF"/>
          <circle r="2" fill="#fff"/>
        </g>
      </svg>

      {/* Pins — HTML so they can show photos + animate */}
      {items.map((it, i) => {
        const { x, y } = px(it);
        const sel = it.id === selected;
        return (
          <button key={it.id} onClick={() => setSelected(it.id)} style={{
            position: 'absolute', left: x, top: y, transform: 'translate(-50%, -100%)',
            background: 'transparent', border: 'none', padding: 0, cursor: 'pointer',
            transition: 'transform .2s', zIndex: sel ? 6 : 5,
          }}>
            <div style={{
              width: sel ? 56 : 40, height: sel ? 56 : 40, borderRadius: '50%',
              border: `2px solid ${sel ? p.accent : '#fff'}`,
              overflow: 'hidden',
              boxShadow: sel ? '0 8px 32px rgba(95,160,255,0.5), 0 0 0 4px rgba(95,160,255,0.18)' : '0 4px 12px rgba(0,0,0,0.4)',
              transition: 'all .25s cubic-bezier(.2,.7,.3,1)',
              background: '#000',
            }}>
              <img src={it.img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy"/>
            </div>
            <div style={{
              position: 'absolute', left: '50%', bottom: -6, transform: 'translateX(-50%) rotate(45deg)',
              width: 10, height: 10, background: sel ? p.accent : '#fff',
            }}/>
            {/* time label below pin */}
            <div style={{
              position: 'absolute', left: '50%', top: 'calc(100% + 8px)',
              transform: 'translateX(-50%)', whiteSpace: 'nowrap',
              fontSize: 10, color: sel ? p.accent : (isDark ? 'rgba(255,255,255,0.6)' : p.textMuted),
              fontFamily: 'Geist, system-ui', fontVariantNumeric: 'tabular-nums', letterSpacing: 0.5,
              fontWeight: sel ? 600 : 500,
            }}>
              {it.time}
            </div>
          </button>
        );
      })}

      {/* Status bar — top safe-area is in iOS frame, we sit below it */}
      {/* Top controls */}
      <div style={{
        position: 'absolute', top: 56, left: 16, right: 16, zIndex: 8,
        display: 'flex', gap: 8, alignItems: 'center',
      }}>
        <div style={{
          flex: 1, height: 44, borderRadius: 22,
          background: chromeBg, backdropFilter: 'blur(20px)',
          border: `0.5px solid ${chromeBrd}`,
          display: 'flex', alignItems: 'center', padding: '0 14px', gap: 8,
        }}>
          <Ico name="compass" size={16} c={dim}/>
          <span style={{ fontSize: 13, color: dim, flex: 1 }}>
            Search Kyoto or ask AI…
          </span>
          <span style={{
            padding: '2px 6px', borderRadius: 4, background: chipKbdBg,
            fontSize: 9, color: dimmer, fontFamily: 'Geist, system-ui', fontVariantNumeric: 'tabular-nums',
          }}>⌘K</span>
        </div>
        <button onClick={onClose} style={{
          width: 44, height: 44, borderRadius: 22,
          background: chromeBg, backdropFilter: 'blur(20px)',
          border: `0.5px solid ${chromeBrd}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
        }}>
          <Ico name="layers" size={18} c={p.text}/>
        </button>
      </div>

      {/* Right rail buttons */}
      <div style={{
        position: 'absolute', top: 116, right: 12, zIndex: 8,
        display: 'flex', flexDirection: 'column', gap: 8,
      }}>
        {[
          { icon: 'plus', label: 'in' },
          { icon: 'minus', label: 'out' },
          { icon: 'compass', label: 'cmp' },
        ].map((b, i) => (
          <button key={i} style={{
            width: 36, height: 36, borderRadius: 18,
            background: chromeBg, backdropFilter: 'blur(20px)',
            border: `0.5px solid ${chromeBrd}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          }}>
            <Ico name={b.icon} size={16} c={p.text}/>
          </button>
        ))}
      </div>

      {/* Filter pills */}
      <div style={{
        position: 'absolute', top: 116, left: 16, zIndex: 8,
        display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none',
        maxWidth: 270,
      }}>
        {[
          { l: 'Today', sel: true },
          { l: 'Food' },
          { l: 'Hidden gems' },
          { l: 'Photo spots' },
        ].map((f, i) => (
          <button key={i} style={{
            padding: '6px 11px', borderRadius: 99, fontSize: 12, whiteSpace: 'nowrap',
            background: f.sel ? p.accent : chromeBg,
            backdropFilter: 'blur(20px)',
            color: f.sel ? '#fff' : p.text,
            border: `0.5px solid ${f.sel ? p.accent : chromeBrd}`,
            cursor: 'pointer', fontFamily: 'Geist, system-ui', fontWeight: 500,
          }}>{f.l}</button>
        ))}
      </div>

      {/* AI is available from the search bar above ("Search Kyoto or ask AI…") —
          the floating orb was overlapping the route sheet, removed. */}

      {/* Bottom sheet — route overview OR selected pin + nearby */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 7,
        borderRadius: '24px 24px 0 0', overflow: 'hidden',
        background: sheetBg, backdropFilter: 'blur(24px)',
        borderTop: `0.5px solid ${sheetBrd}`,
        paddingTop: 8, paddingBottom: 50,
        maxHeight: cur ? undefined : '58%',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* drag handle */}
        <div style={{
          width: 38, height: 4, borderRadius: 2, background: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(15,30,80,0.18)',
          margin: '0 auto 12px', flexShrink: 0,
        }}/>

        {!cur ? (
          // ─── Route overview — all stops on Day 3 ───
          <React.Fragment>
            <div style={{ padding: '0 18px 10px', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexShrink: 0 }}>
              <div>
                <div style={{ fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', color: p.accent, fontWeight: 600 }}>
                  Day 3 · route
                </div>
                <div style={{ fontSize: 19, fontWeight: 600, color: p.text, marginTop: 2, letterSpacing: -0.3 }}>
                  {items.length} stops
                </div>
              </div>
              <span style={{ fontSize: 11, color: dimmer, fontVariantNumeric: 'tabular-nums' }}>
                {items[0].time}–{items[items.length - 1].time}
              </span>
            </div>
            <div style={{
              flex: 1, overflowY: 'auto', padding: '0 14px 6px',
              scrollbarWidth: 'none', display: 'flex', flexDirection: 'column', gap: 6,
            }}>
              {items.map((it, i) => (
                <button key={it.id} onClick={() => setSelected(it.id)} style={{
                  width: '100%', padding: '8px 10px', borderRadius: 12,
                  background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(15,30,80,0.03)',
                  border: `0.5px solid ${sheetBrd}`,
                  display: 'flex', gap: 12, alignItems: 'center', cursor: 'pointer',
                  textAlign: 'left', fontFamily: 'Geist, system-ui',
                }}>
                  <div style={{
                    width: 22, flexShrink: 0, textAlign: 'center',
                    fontSize: 10, color: dimmer, fontVariantNumeric: 'tabular-nums', letterSpacing: 0.4,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                  }}>
                    <span style={{
                      width: 18, height: 18, borderRadius: 9,
                      background: i === 1 ? p.accent : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,30,80,0.08)'),
                      color: i === 1 ? '#fff' : p.text,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 10, fontWeight: 700,
                    }}>{i + 1}</span>
                  </div>
                  <img src={it.img} alt="" style={{
                    width: 44, height: 44, borderRadius: 10, objectFit: 'cover', flexShrink: 0,
                  }} loading="lazy"/>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 10, color: dim, fontVariantNumeric: 'tabular-nums', letterSpacing: 0.4, marginBottom: 1 }}>
                      {it.time} · {it.area}
                    </div>
                    <div style={{
                      fontSize: 13, fontWeight: 600, color: p.text, lineHeight: 1.2,
                      textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap',
                    }}>{it.title}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3, fontSize: 10, color: dim }}>
                      <Ico name="star" size={9} c={p.amber}/>
                      <span style={{ fontVariantNumeric: 'tabular-nums' }}>{it.rating}</span>
                      <span style={{ opacity: 0.4 }}>·</span>
                      <Crowd level={it.crowd}/>
                      <span>{it.crowd}</span>
                    </div>
                  </div>
                  <Ico name="arrow" size={13} c={dimmer}/>
                </button>
              ))}
            </div>
          </React.Fragment>
        ) : (
        <React.Fragment>
        {/* selected item header */}
        <div style={{ padding: '0 18px 12px', display: 'flex', gap: 12, alignItems: 'center' }}>
          <button onClick={(e) => { e.stopPropagation(); setSelected(null); }} aria-label="Back to route" style={{
            width: 32, height: 32, borderRadius: 16, flexShrink: 0,
            background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,30,80,0.05)',
            border: `0.5px solid ${sheetBrd}`, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Ico name="arrowLeft" size={14} c={p.text}/>
          </button>
          <img src={cur.img} alt="" style={{
            width: 56, height: 56, borderRadius: 14, objectFit: 'cover', flexShrink: 0,
          }} loading="lazy"/>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, color: p.accent, letterSpacing: 1.2, textTransform: 'uppercase', fontWeight: 600 }}>
              {cur.time} · {cur.area}
            </div>
            <div style={{
              fontFamily: 'Geist, system-ui', fontSize: 19, lineHeight: 1.1,
              marginTop: 2, color: p.text, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap',
            }}>{cur.title}</div>
            <div style={{ display: 'flex', gap: 6, marginTop: 4, fontSize: 11, color: dim, alignItems: 'center' }}>
              <Ico name="star" size={11} c={p.accent}/>
              <span>{cur.rating}</span>
              <span style={{ opacity: 0.5 }}>·</span>
              <Crowd level={cur.crowd}/>
              <span style={{ marginLeft: 2 }}>{cur.crowd}</span>
            </div>
          </div>
          <button onClick={() => onOpenLocation && onOpenLocation(cur)} style={{
            width: 40, height: 40, borderRadius: 20, background: p.accent,
            border: 'none', cursor: 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 6px 18px rgba(95,160,255,0.35)',
          }}>
            <Ico name="arrow" size={18} c="#fff" sw={2}/>
          </button>
        </div>

        {/* Quick actions row */}
        <div style={{ padding: '0 14px', display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none' }}>
          {[
            { i: 'route', l: 'Directions' },
            { i: 'walk', l: '6 min walk' },
            { i: 'heart', l: 'Save' },
            { i: 'share', l: 'Share' },
          ].map((a, i) => (
            <button key={i} style={{
              flexShrink: 0, padding: '8px 12px', borderRadius: 12,
              background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(15,30,80,0.04)',
              border: `0.5px solid ${sheetBrd}`,
              display: 'flex', alignItems: 'center', gap: 6,
              color: p.text, fontSize: 12, cursor: 'pointer', fontFamily: 'Geist, system-ui',
            }}>
              <Ico name={a.i} size={14} c={p.accent}/>
              {a.l}
            </button>
          ))}
        </div>

        {/* Nearby strip */}
        <div style={{ padding: '14px 18px 6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <AIOrb size={14} pulse={false}/>
              <span style={{ fontSize: 10, letterSpacing: 1.4, textTransform: 'uppercase', color: p.accent, fontWeight: 600 }}>
                Nearby right now
              </span>
            </div>
            <span style={{ fontSize: 11, color: dimmer }}>3 alternates</span>
          </div>
        </div>
        <div style={{
          display: 'flex', gap: 10, padding: '0 18px', overflowX: 'auto', scrollbarWidth: 'none',
        }}>
          {[
            { src: window.PHOTOS.matcha, t: 'Quiet matcha bar', d: '4 min', crowd: 'low' },
            { src: window.PHOTOS.garden, t: 'Moss garden', d: '8 min', crowd: 'low' },
            { src: window.PHOTOS.street, t: 'Pontocho alley', d: '14 min', crowd: 'medium' },
          ].map((n, i) => (
            <div key={i} style={{
              flexShrink: 0, width: 130, borderRadius: 14, overflow: 'hidden',
              background: cardBg, border: `0.5px solid ${sheetBrd}`,
            }}>
              <img src={n.src} alt="" style={{ width: '100%', height: 76, objectFit: 'cover' }} loading="lazy"/>
              <div style={{ padding: '8px 10px 10px' }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: p.text, lineHeight: 1.2 }}>{n.t}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4 }}>
                  <Ico name="walk" size={10} c={dim}/>
                  <span style={{ fontSize: 10, color: dim }}>{n.d}</span>
                  <span style={{ marginLeft: 'auto' }}><Crowd level={n.crowd}/></span>
                </div>
              </div>
            </div>
          ))}
        </div>
        </React.Fragment>
        )}
      </div>
    </div>
  );
}

window.ScreenMap = ScreenMap;
