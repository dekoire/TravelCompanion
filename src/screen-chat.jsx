// screen-chat.jsx — Persistent AI travel companion.
//
// Feels like iMessage / Linear chat:
//   - inbound (AI) messages are translucent dark, with the orb avatar
//   - outbound (user) bubbles use the accent color
//   - rich messages: itinerary diff cards, location previews, replan animations
//   - bottom: input + suggestion chips ("I want food now", "Find hidden gems"…)
//
// The chat is pre-seeded with a realistic dialogue to convey the AI's
// voice: warm, concise, slightly poetic.

const { useState: useStateC, useRef: useRefC, useEffect: useEffectC } = React;

function ScreenChat({ onClose, onOpenLocation }) {
  const p = window.useTheme();
  const { Ico, AIOrb, Pill, Shimmer } = window;

  const MSGS = [
    { from: 'ai', text: "Morning. The bamboo grove is opening up — about half its usual crowd right now." },
    { from: 'user', text: "we are tired. make today calmer." },
    { from: 'ai', text: 'Okay — let me re-shape the afternoon. One sec.', thinking: true },
    {
      from: 'ai', card: {
        kind: 'replan',
        title: 'Calmer afternoon for two',
        diff: [
          { mode: 'remove', text: 'Kinkaku-ji · golden hour crowd' },
          { mode: 'add', text: 'Hosen-in · moss garden, 12 people total' },
          { mode: 'keep', text: 'Gion Karyo dinner · reservation held' },
        ],
        meta: '−1.4 km walking · +22 min downtime',
      },
    },
    { from: 'ai', text: "Replaced golden pavilion with a near-empty moss temple I think you'll love. Sound good?" },
    { from: 'user', text: "perfect. what should we eat for lunch?" },
    { from: 'ai', text: "I narrowed it to 4 spots near Arashiyama. Tap the ones that look right — I'll book the winner." },
    {
      from: 'ai', card: {
        kind: 'picker',
        options: [
          { id: 'p1', img: window.PHOTOS.ramen,  name: 'Yoshimura · udon',      meta: '★ 4.9 · ¥¥ · 4 min walk',  tags: ['Cozy', 'No English'] },
          { id: 'p2', img: window.PHOTOS.matcha, name: '% Arabica',             meta: '★ 4.8 · ¥¥ · 6 min walk',  tags: ['Café', 'River view'] },
          { id: 'p3', img: window.PHOTOS.sushi,  name: 'Sushi Mitamura',        meta: '★ 4.7 · ¥¥¥ · 9 min',      tags: ['Omakase', 'Quiet'] },
          { id: 'p4', img: window.PHOTOS.garden, name: 'Tofu kaiseki · Shoraian', meta: '★ 4.6 · ¥¥¥ · 12 min',   tags: ['Vegetarian'] },
        ],
      },
    },
  ];

  const SUGGESTIONS = [
    'I want food now',
    'Find something nearby',
    'Make today calmer',
    'Find hidden gems',
    'Optimize route',
    'Add beach time',
    'We are tired',
    'Replace this activity',
  ];

  const scrollRef = useRefC(null);
  useEffectC(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, []);

  return (
    <div style={{
      position: 'absolute', inset: 0, background: p.bg,
      color: p.text, fontFamily: 'Geist, system-ui',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        paddingTop: 56, padding: '56px 18px 12px', display: 'flex',
        alignItems: 'center', gap: 12,
        borderBottom: `0.5px solid ${p.line}`,
        background: p.dark ? 'rgba(10,10,18,0.85)' : 'rgba(234,241,255,0.85)', backdropFilter: 'blur(20px)',
      }}>
        <button onClick={onClose} style={{
          width: 36, height: 36, borderRadius: 18, background: p.dark ? 'rgba(255,255,255,0.06)' : 'rgba(15,30,80,0.05)',
          border: `0.5px solid ${p.line}`, display: 'flex',
          alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
        }}>
          <Ico name="close" size={16} c={p.text}/>
        </button>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10 }}>
          <AIOrb size={32}/>
          <div>
            <div style={{
              fontFamily: 'Geist, system-ui', fontSize: 18, lineHeight: 1,
            }}>Companion</div>
            <div style={{ fontSize: 11, color: p.accent, marginTop: 2, display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 6, height: 6, borderRadius: 3, background: '#7EE7B6', boxShadow: '0 0 8px #7EE7B6' }}/>
              Listening · Kyoto Day 3
            </div>
          </div>
        </div>
        <button style={{
          width: 36, height: 36, borderRadius: 18, background: p.dark ? 'rgba(255,255,255,0.06)' : 'rgba(15,30,80,0.05)',
          border: `0.5px solid ${p.line}`, display: 'flex',
          alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
        }}>
          <Ico name="mic" size={16} c={p.accent}/>
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} style={{
        flex: 1, overflow: 'auto', padding: '18px 16px 12px',
        display: 'flex', flexDirection: 'column', gap: 14,
      }}>
        <div style={{
          fontSize: 11, color: 'rgba(255,255,255,0.35)', textAlign: 'center',
          letterSpacing: 1.4, textTransform: 'uppercase', margin: '4px 0 6px',
        }}>Today · 09:42</div>

        {MSGS.map((m, i) => {
          if (m.from === 'user') {
            return (
              <div key={i} style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <div style={{
                  maxWidth: '78%', padding: '10px 14px', borderRadius: '18px 18px 4px 18px',
                  background: p.accent, color: '#fff', fontSize: 14, lineHeight: 1.4,
                  fontWeight: 500, boxShadow: '0 4px 14px rgba(95,160,255,0.15)',
                }}>
                  {m.text}
                </div>
              </div>
            );
          }
          // AI
          return (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-end', maxWidth: '88%' }}>
              <div style={{ width: 24, flexShrink: 0, marginBottom: 2, visibility: i > 0 && MSGS[i - 1].from === 'ai' ? 'hidden' : 'visible' }}>
                <AIOrb size={24} pulse={false}/>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {m.thinking ? (
                  <div style={{
                    padding: '10px 14px', borderRadius: '4px 18px 18px 18px',
                    background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.08)',
                    fontSize: 14, color: p.textMuted, fontStyle: 'italic',
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}>
                    <Shimmer style={{ fontStyle: 'normal' }}>{m.text}</Shimmer>
                  </div>
                ) : m.text ? (
                  <div style={{
                    padding: '10px 14px', borderRadius: '4px 18px 18px 18px',
                    background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.08)',
                    fontSize: 14, color: p.text, lineHeight: 1.42,
                  }}>{m.text}</div>
                ) : null}

                {m.card && m.card.kind === 'replan' && (
                  <div style={{
                    borderRadius: 16, overflow: 'hidden',
                    background: 'linear-gradient(135deg, rgba(95,160,255,0.10), rgba(95,160,255,0.02))',
                    border: '0.5px solid rgba(95,160,255,0.32)',
                  }}>
                    <div style={{
                      padding: '12px 14px 10px', borderBottom: '0.5px solid rgba(95,160,255,0.18)',
                      display: 'flex', alignItems: 'center', gap: 8,
                    }}>
                      <Ico name="sparkle" size={14} c={p.accent}/>
                      <span style={{ fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', color: p.accent, fontWeight: 600, flex: 1 }}>
                        Proposed change
                      </span>
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>{m.card.meta}</span>
                    </div>
                    <div style={{ padding: '8px 14px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {m.card.diff.map((d, j) => {
                        const color = d.mode === 'remove' ? p.vermilion : d.mode === 'add' ? p.green : 'rgba(255,255,255,0.4)';
                        const sym = d.mode === 'remove' ? '−' : d.mode === 'add' ? '+' : '·';
                        return (
                          <div key={j} style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            padding: '6px 0', fontSize: 13,
                            color: d.mode === 'remove' ? 'rgba(255,255,255,0.4)' : p.text,
                            textDecoration: d.mode === 'remove' ? 'line-through' : 'none',
                          }}>
                            <span style={{
                              width: 16, height: 16, borderRadius: 8, flexShrink: 0,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              background: `${color}33`, color, fontSize: 11, fontWeight: 700,
                              fontFamily: 'Geist, system-ui', fontVariantNumeric: 'tabular-nums',
                            }}>{sym}</span>
                            {d.text}
                          </div>
                        );
                      })}
                    </div>
                    <div style={{
                      display: 'flex', gap: 6, padding: '0 12px 12px',
                    }}>
                      <button style={{
                        flex: 1, height: 36, borderRadius: 18, background: p.accent,
                        border: 'none', color: '#fff', fontWeight: 600, fontSize: 13,
                        cursor: 'pointer', fontFamily: 'Geist, system-ui',
                      }}>Apply change</button>
                      <button style={{
                        height: 36, padding: '0 14px', borderRadius: 18,
                        background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.1)',
                        color: p.text, fontSize: 13, cursor: 'pointer', fontFamily: 'Geist, system-ui',
                      }}>Tweak</button>
                    </div>
                  </div>
                )}

                {m.card && m.card.kind === 'picker' && (
                  <PickerCard options={m.card.options} onOpenLocation={onOpenLocation}/>
                )}

                {m.card && m.card.kind === 'place' && (
                  <button onClick={() => onOpenLocation && onOpenLocation()} style={{
                    width: '100%', textAlign: 'left', padding: 0, cursor: 'pointer',
                    background: 'transparent', border: 'none',
                  }}>
                    <div style={{
                      borderRadius: 16, overflow: 'hidden',
                      background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.08)',
                      display: 'flex', gap: 12, alignItems: 'center', padding: 8,
                    }}>
                      <img src={m.card.img} alt="" style={{
                        width: 64, height: 64, borderRadius: 12, objectFit: 'cover', flexShrink: 0,
                      }} loading="lazy"/>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontFamily: 'Geist, system-ui', fontSize: 16, lineHeight: 1.15, color: p.text,
                        }}>{m.card.title}</div>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 4 }}>
                          {m.card.meta}
                        </div>
                      </div>
                      <Ico name="arrow" size={16} c={p.accent}/>
                    </div>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Suggestions */}
      <div style={{
        padding: '6px 16px 10px', display: 'flex', gap: 6, overflowX: 'auto',
        scrollbarWidth: 'none', borderTop: '0.5px solid rgba(255,255,255,0.04)',
      }}>
        {SUGGESTIONS.map((s, i) => (
          <button key={i} style={{
            flexShrink: 0, padding: '7px 12px', borderRadius: 99,
            background: 'rgba(95,160,255,0.08)', border: '0.5px solid rgba(95,160,255,0.20)',
            color: p.accent, fontSize: 12, cursor: 'pointer',
            fontFamily: 'Geist, system-ui', fontWeight: 500, whiteSpace: 'nowrap',
          }}>{s}</button>
        ))}
      </div>

      {/* Input dock */}
      <div style={{
        padding: '8px 14px 34px', borderTop: `0.5px solid ${p.line}`,
        background: p.dark ? 'rgba(10,10,18,0.8)' : 'rgba(234,241,255,0.85)', backdropFilter: 'blur(20px)',
      }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button style={{
            width: 40, height: 40, borderRadius: 20, background: p.dark ? 'rgba(255,255,255,0.06)' : 'rgba(15,30,80,0.05)',
            border: `0.5px solid ${p.line}`, display: 'flex',
            alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          }}>
            <Ico name="plus" size={18} c={p.text}/>
          </button>
          <div style={{
            flex: 1, height: 44, borderRadius: 22, background: p.dark ? 'rgba(255,255,255,0.06)' : 'rgba(15,30,80,0.05)',
            border: `0.5px solid ${p.line}`, display: 'flex', alignItems: 'center',
            padding: '0 14px',
          }}>
            <span style={{ flex: 1, fontSize: 14, color: p.textDim }}>
              Ask me anything…
            </span>
            <Ico name="mic" size={16} c={p.accent}/>
          </div>
        </div>
      </div>
    </div>
  );
}

window.ScreenChat = ScreenChat;

// ─── Image-based picker card — user taps 1+ options they like, AI uses
// the selection to refine. Heart-like toggle on each photo.
function PickerCard({ options, onOpenLocation }) {
  const { useState } = React;
  const p = window.useTheme();
  const { Ico } = window;
  const [liked, setLiked] = useState(new Set(['p1']));

  const toggle = id => {
    const next = new Set(liked);
    next.has(id) ? next.delete(id) : next.add(id);
    setLiked(next);
  };

  return (
    <div style={{
      borderRadius: 18, overflow: 'hidden',
      background: p.dark ? 'rgba(255,255,255,0.04)' : 'rgba(27,18,64,0.04)',
      border: `0.5px solid ${p.line}`,
    }}>
      <div style={{ padding: '10px 12px 6px', fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', color: p.accent, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
        <Ico name="heart" size={12} c={p.accent}/>
        Tap what looks right · {liked.size} liked
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, padding: '0 4px 4px' }}>
        {options.map(o => {
          const isLiked = liked.has(o.id);
          return (
            <div key={o.id} style={{ position: 'relative', borderRadius: 12, overflow: 'hidden' }}>
              <button onClick={() => toggle(o.id)} onDoubleClick={() => onOpenLocation && onOpenLocation()} style={{
                width: '100%', padding: 0, cursor: 'pointer', background: 'transparent', border: 'none', display: 'block',
              }}>
                <div style={{ position: 'relative', aspectRatio: '1 / 1' }}>
                  <img src={o.img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy"/>
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: 'linear-gradient(180deg, transparent 40%, rgba(11,10,24,0.85))',
                  }}/>
                  {/* Selection ring */}
                  {isLiked && (
                    <div style={{
                      position: 'absolute', inset: 0,
                      boxShadow: `inset 0 0 0 3px ${p.accent}`,
                      borderRadius: 12,
                    }}/>
                  )}
                  {/* Heart button */}
                  <div style={{
                    position: 'absolute', top: 6, right: 6,
                    width: 30, height: 30, borderRadius: 15,
                    background: isLiked ? window.SIRI_GRADIENT_LINEAR : 'rgba(11,10,24,0.5)',
                    backdropFilter: 'blur(12px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: '0.5px solid rgba(255,255,255,0.18)',
                    transition: 'all .15s', transform: isLiked ? 'scale(1.08)' : 'scale(1)',
                  }}>
                    <Ico name="heart" size={14} c="#fff" sw={isLiked ? 0 : 1.8}/>
                  </div>
                  {/* Info */}
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '8px 10px 10px', textAlign: 'left' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', lineHeight: 1.15, letterSpacing: -0.2,
                      textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{o.name}</div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.85)', marginTop: 2 }}>{o.meta}</div>
                  </div>
                </div>
              </button>
            </div>
          );
        })}
      </div>
      <div style={{ padding: '8px 8px 10px', display: 'flex', gap: 6 }}>
        <button style={{
          flex: 1, height: 36, borderRadius: 18,
          background: window.SIRI_GRADIENT_LINEAR, color: '#fff', border: 'none',
          fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'Geist, system-ui',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          boxShadow: '0 6px 18px rgba(95,160,255,0.32)',
        }}>
          <Ico name="sparkle" size={13} c="#fff"/>
          Book the winner ({liked.size})
        </button>
        <button style={{
          height: 36, padding: '0 12px', borderRadius: 18,
          background: 'transparent', border: `0.5px solid ${p.line}`,
          color: p.text, fontSize: 12, cursor: 'pointer', fontFamily: 'Geist, system-ui',
        }}>More options</button>
      </div>
    </div>
  );
}
