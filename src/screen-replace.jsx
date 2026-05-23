// screen-replace.jsx — Modal: replace an itinerary item.
//
// Layout:
//   1. Header — "Replace …" + close
//   2. The current item card (dimmed, "REMOVING" badge)
//   3. AI brief: 1-line explanation of what it's optimizing for, with
//      adjustable preference chips (Quieter, Cheaper, Closer, Different vibe)
//   4. Alternative cards (image-led). Tap to TOGGLE selection (multi-select
//      so user can compare). Each card shows ★rating, distance, crowd,
//      price, AI-pick badge, key differences vs current.
//   5. Footer with two states:
//      0 selected → "Pick one or more to compare"
//      1 selected → "Replace with X"
//      2+ selected → "Compare N alternatives"

const { useState: useStateRp } = React;

function ScreenReplace({ activity, onClose, onConfirm, onCompare }) {
  const p = window.useTheme();
  const { Ico, AIOrb, Pill, Crowd } = window;
  const cur = activity || window.DAY3[3];
  const P = window.PHOTOS;

  // Sample alternatives — the kinds of swaps the AI would actually offer.
  const ALTS = [
    {
      id: 'a', img: P.garden, name: 'Hosen-in · moss temple',
      area: 'Ohara', dist: '12 min taxi', crowd: 'low', price: '¥ 800', rating: 4.8,
      aiPick: true,
      diffs: [
        { kind: 'better', text: 'Far fewer crowds — 12 visitors right now' },
        { kind: 'neutral', text: 'Same kind of golden-hour shadows' },
      ],
      pitch: 'A near-empty alternative the algorithm keeps re-surfacing for couples.',
    },
    {
      id: 'b', img: P.philosopher, name: 'Philosopher\'s Path',
      area: 'Higashiyama', dist: '6 min walk', crowd: 'low', price: 'Free', rating: 4.7,
      diffs: [
        { kind: 'better', text: 'Closer · no taxi needed' },
        { kind: 'neutral', text: 'A walk, not a temple' },
      ],
      pitch: 'Stretches your afternoon into something contemplative and slow.',
    },
    {
      id: 'c', img: P.fushimi, name: 'Fushimi Inari · upper shrine',
      area: 'Fushimi', dist: '22 min train', crowd: 'medium', price: 'Free', rating: 4.9,
      diffs: [
        { kind: 'worse', text: 'Longer travel · 22 min train' },
        { kind: 'better', text: 'More iconic photo opportunities' },
      ],
      pitch: 'Trade calm for the postcard shot you came for.',
    },
    {
      id: 'd', img: P.kinkakuji, name: 'Ginkaku-ji · Silver Pavilion',
      area: 'Kita', dist: '14 min taxi', crowd: 'medium', price: '¥ 500', rating: 4.6,
      diffs: [
        { kind: 'neutral', text: 'Similar Kita-area temple' },
        { kind: 'better', text: 'Smaller grounds, less walking' },
      ],
      pitch: 'A quieter sibling — same Kita neighborhood, a fraction of the visitors.',
    },
  ];

  const [selected, setSelected] = useStateRp(['a']);
  const [prefs, setPrefs] = useStateRp(['Quieter']);

  const togglePref = (chip) => setPrefs(prev =>
    prev.includes(chip) ? prev.filter(p => p !== chip) : [...prev, chip]);

  const toggleSel = (id) => setSelected(prev =>
    prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  return (
    <div style={{
      position: 'absolute', inset: 0, background: p.bg, color: p.text,
      fontFamily: 'Geist, system-ui', overflow: 'auto', paddingBottom: 130,
    }}>
      {/* Top chrome */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 5,
        padding: '56px 16px 12px', display: 'flex', alignItems: 'center', gap: 12,
        background: p.dark
          ? 'linear-gradient(180deg, rgba(7,12,28,0.95) 60%, transparent)'
          : 'linear-gradient(180deg, rgba(234,241,255,0.95) 60%, transparent)',
        backdropFilter: 'blur(16px)',
      }}>
        <button onClick={onClose} style={{
          width: 36, height: 36, borderRadius: 18,
          background: p.dark ? 'rgba(255,255,255,0.06)' : 'rgba(15,30,80,0.05)',
          border: `0.5px solid ${p.line}`, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Ico name="close" size={16} c={p.text}/>
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, letterSpacing: 1.6, textTransform: 'uppercase', color: p.accent, fontWeight: 700 }}>
            Replace activity
          </div>
          <div style={{ fontSize: 16, fontWeight: 600, color: p.text, marginTop: 2,
            textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
            {cur.title}
          </div>
        </div>
        <span style={{
          padding: '4px 10px', borderRadius: 99,
          background: 'rgba(255,110,140,0.14)', border: `0.5px solid ${p.danger}55`,
          color: p.danger, fontSize: 10, fontWeight: 700,
          letterSpacing: 1.2, textTransform: 'uppercase',
        }}>Removing</span>
      </div>

      {/* Current item small */}
      <div style={{ padding: '0 16px 14px' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '10px 12px', borderRadius: 16,
          background: p.surface, border: `0.5px solid ${p.line}`,
          opacity: 0.62, filter: 'grayscale(0.25)',
        }}>
          <img src={cur.img} alt="" style={{ width: 44, height: 44, borderRadius: 10, objectFit: 'cover' }}/>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, color: p.textMuted, fontVariantNumeric: 'tabular-nums', letterSpacing: 0.4 }}>
              {cur.time} · {cur.dur}
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, textDecoration: 'line-through', color: p.textMuted, lineHeight: 1.2,
              textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
              {cur.title}
            </div>
          </div>
        </div>
      </div>

      {/* AI brief + preference chips */}
      <div style={{ padding: '0 16px 14px' }}>
        <div style={{
          padding: '14px 14px', borderRadius: 18,
          background: p.accentSoft, border: `0.5px solid ${p.accent}33`,
        }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <AIOrb size={24}/>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: p.accent, letterSpacing: 1.2, textTransform: 'uppercase', fontWeight: 600, marginBottom: 4 }}>
                What I'm optimizing for
              </div>
              <div style={{ fontSize: 13, color: p.text, lineHeight: 1.45 }}>
                Replacing crowded Kinkaku-ji with something <span style={{ color: p.accent, fontWeight: 600 }}>quieter</span> in the same time window. Adjust if you want.
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
            {['Quieter', 'Cheaper', 'Closer', 'Different vibe', 'More iconic', 'Indoor'].map(chip => {
              const sel = prefs.includes(chip);
              return (
                <button key={chip} onClick={() => togglePref(chip)} style={{
                  padding: '6px 11px', borderRadius: 99, fontSize: 11.5, fontWeight: 500,
                  background: sel ? p.accent : (p.dark ? 'rgba(255,255,255,0.04)' : 'rgba(15,30,80,0.04)'),
                  color: sel ? '#fff' : p.text,
                  border: `0.5px solid ${sel ? p.accent : p.line}`,
                  cursor: 'pointer', fontFamily: 'Geist, system-ui',
                  transition: 'all .15s',
                }}>
                  {sel && '✓ '}{chip}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Section header */}
      <div style={{ padding: '4px 22px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', color: p.accent, fontWeight: 600 }}>
          {ALTS.length} alternatives · {selected.length} selected
        </div>
        <button style={{
          background: 'none', border: 'none', fontSize: 11, color: p.accent,
          cursor: 'pointer', fontFamily: 'Geist, system-ui', fontWeight: 500,
          display: 'flex', alignItems: 'center', gap: 4,
        }}>
          <Ico name="settings" size={11} c={p.accent}/>
          Sort
        </button>
      </div>

      {/* Alternative cards */}
      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {ALTS.map(alt => {
          const sel = selected.includes(alt.id);
          return (
            <button key={alt.id} onClick={() => toggleSel(alt.id)} style={{
              width: '100%', padding: 0, cursor: 'pointer', textAlign: 'left',
              background: p.surface,
              border: `1.5px solid ${sel ? p.accent : p.line}`,
              borderRadius: 20, overflow: 'hidden', fontFamily: 'Geist, system-ui',
              boxShadow: sel ? `0 12px 28px ${p.glow}, 0 0 0 1px ${p.accent}30` : 'none',
              transition: 'all .18s',
            }}>
              {/* Image header */}
              <div style={{ position: 'relative', height: 140 }}>
                <img src={alt.img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} loading="lazy"/>
                <div style={{ position: 'absolute', inset: 0,
                  background: 'linear-gradient(180deg, rgba(7,12,28,0.35) 0%, transparent 30%, rgba(7,12,28,0.7) 100%)' }}/>
                {alt.aiPick && (
                  <div style={{
                    position: 'absolute', top: 12, left: 12, display: 'flex', alignItems: 'center', gap: 5,
                    padding: '4px 9px', borderRadius: 99,
                    background: window.SIRI_GRADIENT_LINEAR, color: '#fff',
                    fontSize: 10, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase',
                  }}>
                    <Ico name="sparkle" size={11} c="#fff"/>
                    AI pick
                  </div>
                )}
                {/* Selection checkbox */}
                <div style={{
                  position: 'absolute', top: 12, right: 12,
                  width: 28, height: 28, borderRadius: 14,
                  background: sel ? p.accent : 'rgba(7,12,28,0.55)',
                  backdropFilter: 'blur(10px)',
                  border: `1.5px solid ${sel ? p.accent : 'rgba(255,255,255,0.4)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all .15s',
                }}>
                  {sel && <Ico name="check" size={14} c="#fff" sw={3}/>}
                </div>
                {/* Title overlay */}
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0 14px 12px' }}>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.78)', letterSpacing: 1, textTransform: 'uppercase', fontWeight: 600 }}>
                    {alt.area} · {alt.dist}
                  </div>
                  <div style={{ fontSize: 18, color: '#fff', fontWeight: 600, lineHeight: 1.15, letterSpacing: -0.3, marginTop: 2 }}>
                    {alt.name}
                  </div>
                </div>
              </div>

              {/* Stats strip */}
              <div style={{
                padding: '10px 14px', display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)', gap: 8,
                borderBottom: `0.5px solid ${p.line}`,
              }}>
                <div>
                  <div style={{ fontSize: 9, color: p.textDim, letterSpacing: 1.1, textTransform: 'uppercase', fontWeight: 600, marginBottom: 2 }}>Rating</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 500, color: p.text }}>
                    <Ico name="star" size={12} c={p.amber}/>{alt.rating}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 9, color: p.textDim, letterSpacing: 1.1, textTransform: 'uppercase', fontWeight: 600, marginBottom: 2 }}>Crowd</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Crowd level={alt.crowd}/>
                    <span style={{ fontSize: 12, color: p.text, fontWeight: 500 }}>{alt.crowd}</span>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 9, color: p.textDim, letterSpacing: 1.1, textTransform: 'uppercase', fontWeight: 600, marginBottom: 2 }}>Cost</div>
                  <div style={{ fontSize: 12, fontWeight: 500, color: p.text, fontVariantNumeric: 'tabular-nums' }}>{alt.price}</div>
                </div>
              </div>

              {/* Diff vs current */}
              <div style={{ padding: '10px 14px 8px' }}>
                {alt.diffs.map((d, i) => {
                  const color = d.kind === 'better' ? p.green : d.kind === 'worse' ? p.danger : p.textMuted;
                  const sym = d.kind === 'better' ? '↑' : d.kind === 'worse' ? '↓' : '·';
                  return (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '3px 0', fontSize: 12, color: p.text,
                    }}>
                      <span style={{
                        width: 16, height: 16, borderRadius: 8, flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: color + '22', color, fontSize: 11, fontWeight: 800,
                      }}>{sym}</span>
                      {d.text}
                    </div>
                  );
                })}
              </div>

              {/* Pitch */}
              <div style={{
                padding: '8px 14px 14px', fontSize: 12, color: p.textMuted, lineHeight: 1.45,
                fontStyle: 'italic',
              }}>
                "{alt.pitch}"
              </div>
            </button>
          );
        })}
      </div>

      {/* Sticky footer */}
      <div style={{
        position: 'sticky', bottom: 0, left: 0, right: 0,
        padding: '14px 16px 34px',
        background: p.dark
          ? 'linear-gradient(180deg, transparent, rgba(7,12,28,0.96) 30%)'
          : 'linear-gradient(180deg, transparent, rgba(234,241,255,0.96) 30%)',
      }}>
        {selected.length >= 2 ? (
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => onCompare && onCompare(selected)} style={{
              flex: 1, height: 52, borderRadius: 26, color: '#fff', border: 'none',
              background: window.SIRI_GRADIENT_LINEAR, cursor: 'pointer',
              fontSize: 15, fontWeight: 600, fontFamily: 'Geist, system-ui',
              boxShadow: `0 12px 28px ${p.glow}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              <Ico name="layers" size={17} c="#fff"/>
              Compare {selected.length} side-by-side
            </button>
          </div>
        ) : selected.length === 1 ? (
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => onConfirm && onConfirm(selected[0])} style={{
              flex: 1, height: 52, borderRadius: 26, color: '#fff', border: 'none',
              background: window.SIRI_GRADIENT_LINEAR, cursor: 'pointer',
              fontSize: 15, fontWeight: 600, fontFamily: 'Geist, system-ui',
              boxShadow: `0 12px 28px ${p.glow}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              <Ico name="check" size={17} c="#fff" sw={2.5}/>
              Replace with {ALTS.find(a => a.id === selected[0]).name.split('·')[0].trim()}
            </button>
          </div>
        ) : (
          <button disabled style={{
            width: '100%', height: 52, borderRadius: 26,
            background: p.dark ? 'rgba(255,255,255,0.05)' : 'rgba(15,30,80,0.05)',
            color: p.textMuted, border: `0.5px solid ${p.line}`,
            fontSize: 14, fontWeight: 500, fontFamily: 'Geist, system-ui',
          }}>
            Tap one or more alternatives
          </button>
        )}
      </div>
    </div>
  );
}

window.ScreenReplace = ScreenReplace;
