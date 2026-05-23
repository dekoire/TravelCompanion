// screen-transport.jsx — Modal bottom sheet: choose how to travel from
// one activity to the next. Lists ride-share (Uber/Bolt/Taxi), public
// transit, walk, bike, and an AI-recommended option flagged at top.
//
// Each option shows: icon, name, duration, price, eta, badge if AI pick.
// Tap to "select" (visual swap) then "Confirm" to apply to itinerary.

const { useState: useStateTr } = React;

function ScreenTransport({ from, to, onClose, onConfirm }) {
  const p = window.useTheme();
  const { Ico, Pill, AIOrb } = window;

  const A = from || { title: 'Bamboo Grove · Arashiyama', time: '12:15' };
  const B = to   || { title: 'Kinkaku-ji · Golden Pavilion', time: '15:00' };

  const OPTIONS = [
    { id: 'uber',  brand: 'Uber',      mode: 'car',    icon: 'taxi',  dur: '18 min', price: '¥ 1,840', eta: 'pickup in 3 min', extra: 'UberX · 4-seat', recommended: true, color: '#fff' },
    { id: 'bolt',  brand: 'Bolt',      mode: 'car',    icon: 'taxi',  dur: '20 min', price: '¥ 1,620', eta: 'pickup in 5 min', extra: 'Standard · 4-seat', color: '#34D186' },
    { id: 'taxi',  brand: 'Local taxi',mode: 'car',    icon: 'taxi',  dur: '22 min', price: '¥ 2,100', eta: 'hail at street',  extra: 'Cash only', color: '#FFC476' },
    { id: 'train', brand: 'JR Sagano', mode: 'train',  icon: 'train', dur: '28 min', price: '¥ 240',   eta: 'next train 11 min', extra: '1 transfer · Saga-Arashiyama → Enmachi', color: '#5FD0FF' },
    { id: 'bike',  brand: 'KyotoBike', mode: 'bike',   icon: 'bike',  dur: '34 min', price: '¥ 500',   eta: 'available nearby', extra: '20 stations on route', color: '#7EE7B6' },
    { id: 'walk',  brand: 'Walk',      mode: 'walk',   icon: 'walk',  dur: '58 min', price: 'Free',    eta: 'depart now',      extra: 'Mostly flat · scenic', color: '#6EB4FF' },
  ];

  const [sel, setSel] = useStateTr('uber');

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 50,
      background: 'rgba(11,10,24,0.55)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      animation: 'fade 0.18s ease-out',
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', borderRadius: '28px 28px 0 0',
        background: p.dark ? 'rgba(24,23,52,0.96)' : 'rgba(255,255,255,0.98)',
        backdropFilter: 'blur(40px)',
        border: `0.5px solid ${p.line}`,
        borderBottom: 'none',
        paddingBottom: 36, color: p.text,
        fontFamily: 'Geist, system-ui',
        animation: 'slideUp 0.32s cubic-bezier(.2,.7,.3,1)',
        maxHeight: '92%', overflow: 'auto',
      }}>
        {/* Drag handle */}
        <div style={{ width: 38, height: 4, borderRadius: 2,
          background: p.dark ? 'rgba(255,255,255,0.2)' : 'rgba(27,18,64,0.15)',
          margin: '8px auto 14px' }}/>

        {/* From → To header */}
        <div style={{ padding: '0 22px 14px' }}>
          <div style={{ fontSize: 10, letterSpacing: 1.6, textTransform: 'uppercase', color: p.accent, fontWeight: 600 }}>
            How to get there
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, paddingTop: 5 }}>
              <span style={{ width: 8, height: 8, borderRadius: 4, border: `1.5px solid ${p.accent}`, boxSizing: 'border-box' }}/>
              <span style={{ width: 1, height: 22, background: p.accent, opacity: 0.4 }}/>
              <span style={{ width: 8, height: 8, borderRadius: 4, background: p.accent }}/>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, color: p.textMuted, fontFamily: 'Geist, system-ui', fontVariantNumeric: 'tabular-nums' }}>{A.time}</div>
              <div style={{ fontSize: 14, color: p.text, fontWeight: 500, marginBottom: 8 }}>{A.title}</div>
              <div style={{ fontSize: 13, color: p.textMuted, fontFamily: 'Geist, system-ui', fontVariantNumeric: 'tabular-nums' }}>{B.time}</div>
              <div style={{ fontSize: 14, color: p.text, fontWeight: 500 }}>{B.title}</div>
            </div>
          </div>
        </div>

        {/* AI banner */}
        <div style={{ padding: '4px 16px 14px' }}>
          <div style={{
            padding: '12px 14px', borderRadius: 14,
            background: p.accentSoft, border: `0.5px solid ${p.accent}55`,
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <AIOrb size={22}/>
            <div style={{ flex: 1, fontSize: 12.5, color: p.text, lineHeight: 1.4 }}>
              Uber is the move — train requires 1 transfer and you've got a 15:00 reservation.
            </div>
          </div>
        </div>

        {/* Option list */}
        <div style={{ padding: '0 12px' }}>
          {OPTIONS.map(o => {
            const isSel = sel === o.id;
            return (
              <button key={o.id} onClick={() => setSel(o.id)} style={{
                width: '100%', padding: '12px 12px', marginBottom: 6,
                borderRadius: 14, cursor: 'pointer',
                background: isSel ? p.accentSoft : 'transparent',
                border: `1px solid ${isSel ? p.accent : 'transparent'}`,
                display: 'flex', alignItems: 'center', gap: 12,
                textAlign: 'left', fontFamily: 'Geist, system-ui',
                transition: 'all .15s',
              }}>
                {/* Brand glyph */}
                <span style={{
                  width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                  background: o.recommended ? window.SIRI_GRADIENT_LINEAR : (p.dark ? 'rgba(255,255,255,0.06)' : 'rgba(27,18,64,0.05)'),
                  border: `0.5px solid ${p.line}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Ico name={o.icon} size={20} c={o.recommended ? '#fff' : o.color}/>
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                    <span style={{ fontSize: 15, fontWeight: 600, color: p.text }}>{o.brand}</span>
                    {o.recommended && (
                      <span style={{
                        fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', fontWeight: 700,
                        padding: '2px 6px', borderRadius: 4,
                        background: window.SIRI_GRADIENT_LINEAR, color: '#fff',
                      }}>AI pick</span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: p.textMuted, display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span>{o.eta}</span>
                    <span style={{ opacity: 0.4 }}>·</span>
                    <span>{o.extra}</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: p.text }}>{o.dur}</div>
                  <div style={{ fontSize: 11, color: p.textMuted, fontFamily: 'Geist, system-ui', fontVariantNumeric: 'tabular-nums' }}>{o.price}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer actions */}
        <div style={{ padding: '14px 16px 0', display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{
            height: 50, padding: '0 22px', borderRadius: 25,
            background: p.dark ? 'rgba(255,255,255,0.06)' : 'rgba(27,18,64,0.05)',
            border: `0.5px solid ${p.line}`, color: p.text,
            fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'Geist, system-ui',
          }}>Cancel</button>
          <button onClick={() => onConfirm && onConfirm(sel)} style={{
            flex: 1, height: 50, borderRadius: 25,
            background: window.SIRI_GRADIENT_LINEAR, color: '#fff',
            border: 'none', fontSize: 15, fontWeight: 600, cursor: 'pointer',
            fontFamily: 'Geist, system-ui',
            boxShadow: '0 10px 28px rgba(95,160,255,0.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
            <Ico name="check" size={17} c="#fff" sw={2.5}/>
            Confirm · {OPTIONS.find(o => o.id === sel)?.price}
          </button>
        </div>
      </div>
    </div>
  );
}

window.ScreenTransport = ScreenTransport;
