// screen-planner.jsx — Full week-view editor.
//
// A scrollable list of all 7 days. Each day has:
//   - sticky day header (date + weather + count) with "+ Add" button
//   - draggable activity rows (visual drag affordance — actual drag is mocked
//     with up/down chevrons that re-order the list in state)
//   - swipe-to-reveal "delete" action (shown statically in edit mode)
//   - a footer slot "+ Add activity" tap target
//
// Bottom bar: total stops · save changes / discard.
//
// Add-flow: tapping "+ Add" opens a bottom sheet listing AI suggestions,
// favorites, and a search field. The user picks where (which day + time)
// before confirming.

const { useState: useStateP } = React;

function ScreenPlanner({ onClose, onAddTo }) {
  const p = window.useTheme();
  const { Ico, AIOrb, Pill, Crowd } = window;
  const P = window.PHOTOS;

  // The whole 7-day plan lives in state for the demo so reorder/delete is live.
  const [days, setDays] = useStateP(() => seedPlan());
  const [edits, setEdits] = useStateP(0); // counter for dirty state
  const [showAdd, setShowAdd] = useStateP(null); // dayIndex when add sheet open

  const total = days.reduce((sum, d) => sum + d.items.length, 0);

  const move = (di, idx, delta) => {
    setDays(prev => {
      const next = prev.map(d => ({ ...d, items: [...d.items] }));
      const items = next[di].items;
      const j = idx + delta;
      if (j < 0 || j >= items.length) return prev;
      [items[idx], items[j]] = [items[j], items[idx]];
      return next;
    });
    setEdits(e => e + 1);
  };
  const remove = (di, idx) => {
    setDays(prev => {
      const next = prev.map(d => ({ ...d, items: [...d.items] }));
      next[di].items.splice(idx, 1);
      return next;
    });
    setEdits(e => e + 1);
  };
  const moveDay = (di, idx, deltaDay) => {
    setDays(prev => {
      const next = prev.map(d => ({ ...d, items: [...d.items] }));
      const j = di + deltaDay;
      if (j < 0 || j >= next.length) return prev;
      const [item] = next[di].items.splice(idx, 1);
      next[j].items.push(item);
      return next;
    });
    setEdits(e => e + 1);
  };

  return (
    <div style={{
      position: 'absolute', inset: 0, background: p.bg, color: p.text,
      fontFamily: 'Geist, system-ui', display: 'flex', flexDirection: 'column',
    }}>
      {/* Sticky header */}
      <div style={{
        padding: '56px 16px 12px', display: 'flex', alignItems: 'center', gap: 12,
        background: p.dark ? 'rgba(7,12,28,0.96)' : 'rgba(234,241,255,0.96)',
        backdropFilter: 'blur(20px)',
        borderBottom: `0.5px solid ${p.line}`, zIndex: 5,
      }}>
        <button onClick={onClose} style={ghostButton(p)}>
          <Ico name="close" size={16} c={p.text}/>
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, letterSpacing: 1.6, textTransform: 'uppercase', color: p.accent, fontWeight: 700 }}>
            Edit week
          </div>
          <div style={{ fontSize: 16, fontWeight: 600, color: p.text, marginTop: 2 }}>
            {total} stops · {edits > 0 ? `${edits} unsaved changes` : 'all synced'}
          </div>
        </div>
        <button onClick={onClose} style={{
          padding: '0 16px', height: 36, borderRadius: 18,
          background: window.SIRI_GRADIENT_LINEAR, color: '#fff', border: 'none',
          fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'Geist, system-ui',
          boxShadow: edits > 0 ? `0 8px 22px ${p.glow}` : 'none',
        }}>
          Done
        </button>
      </div>

      {/* AI prompt — option to let AI re-balance */}
      <div style={{ padding: '14px 16px 0' }}>
        <button style={{
          width: '100%', padding: '12px 14px', borderRadius: 16, cursor: 'pointer',
          background: p.accentSoft, border: `0.5px dashed ${p.accent}55`,
          display: 'flex', alignItems: 'center', gap: 12, color: p.text,
          textAlign: 'left', fontFamily: 'Geist, system-ui',
        }}>
          <AIOrb size={22}/>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, color: p.accent, fontWeight: 700, letterSpacing: 0.4 }}>
              Auto-balance the week
            </div>
            <div style={{ fontSize: 11, color: p.textMuted, marginTop: 1 }}>
              I'll smooth out walking, weather, and crowd levels.
            </div>
          </div>
          <Ico name="sparkle" size={16} c={p.accent}/>
        </button>
      </div>

      {/* Scrollable day list */}
      <div style={{ flex: 1, overflow: 'auto', padding: '14px 0 110px', scrollbarWidth: 'none' }}>
        {days.map((d, di) => (
          <DayBlock key={di} day={d} di={di}
            onMove={move} onRemove={remove} onMoveDay={moveDay}
            onAdd={() => setShowAdd(di)}/>
        ))}

        {/* New day button */}
        <div style={{ padding: '8px 16px 0' }}>
          <button style={{
            width: '100%', padding: '14px', borderRadius: 16, cursor: 'pointer',
            background: 'transparent', border: `1.5px dashed ${p.line}`,
            color: p.textMuted, fontSize: 13, fontWeight: 500, fontFamily: 'Geist, system-ui',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
            <Ico name="plus" size={16} c={p.textMuted}/>
            Add an extra day
          </button>
        </div>
      </div>

      {/* Add-to-day sheet */}
      {showAdd != null && (
        <AddActivitySheet
          day={days[showAdd]}
          onClose={() => setShowAdd(null)}
          onAdd={(item) => {
            setDays(prev => {
              const next = prev.map(d => ({ ...d, items: [...d.items] }));
              next[showAdd].items.push(item);
              return next;
            });
            setEdits(e => e + 1);
            setShowAdd(null);
          }}/>
      )}
    </div>
  );
}

// ─── DayBlock ─────────────────────────────────────────────────────────
function DayBlock({ day, di, onMove, onRemove, onMoveDay, onAdd }) {
  const p = window.useTheme();
  const { Ico, Crowd } = window;

  return (
    <div style={{ padding: '14px 16px 4px' }}>
      {/* Day header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '6px 4px 10px',
      }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: 1.4, textTransform: 'uppercase', color: p.accent, fontWeight: 700 }}>
            {day.label} · {day.date}
          </div>
          <div style={{ fontSize: 17, fontWeight: 600, color: p.text, marginTop: 2, letterSpacing: -0.3 }}>
            {day.name}
          </div>
        </div>
        <div style={{ flex: 1 }}/>
        <span style={{ fontSize: 11, color: p.textMuted, fontVariantNumeric: 'tabular-nums' }}>
          {day.weather} · {day.items.length} stops
        </span>
        <button onClick={onAdd} style={{
          width: 30, height: 30, borderRadius: 15, padding: 0,
          background: window.SIRI_GRADIENT_LINEAR, color: '#fff',
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(95,160,255,0.32)',
        }}>
          <Ico name="plus" size={16} c="#fff" sw={2.5}/>
        </button>
      </div>

      {/* Items */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {day.items.map((it, idx) => (
          <PlanRow key={it.id} item={it} idx={idx}
            isFirst={idx === 0} isLast={idx === day.items.length - 1}
            onMove={(d) => onMove(di, idx, d)}
            onRemove={() => onRemove(di, idx)}
            onMoveDay={(d) => onMoveDay(di, idx, d)}/>
        ))}

        {day.items.length === 0 && (
          <div style={{
            padding: '14px', borderRadius: 14, textAlign: 'center',
            background: 'transparent', border: `1.5px dashed ${p.line}`,
            fontSize: 12, color: p.textMuted, fontStyle: 'italic',
          }}>
            Empty day — tap + to add something
          </div>
        )}
      </div>
    </div>
  );
}

// ─── PlanRow ──────────────────────────────────────────────────────────
function PlanRow({ item, idx, isFirst, isLast, onMove, onRemove, onMoveDay }) {
  const p = window.useTheme();
  const { Ico, Crowd } = window;
  const [open, setOpen] = useStateP(false);

  return (
    <div style={{
      display: 'flex', alignItems: 'stretch', gap: 6,
    }}>
      {/* Drag handle column */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
        padding: '6px 2px', flexShrink: 0,
      }}>
        <button onClick={() => onMove(-1)} disabled={isFirst} style={tinyBtn(p, isFirst)}>
          <Ico name="arrowUp" size={11} c={p.textMuted} sw={2.5}/>
        </button>
        <span style={{
          width: 14, height: 18, display: 'flex', flexDirection: 'column', justifyContent: 'space-evenly', alignItems: 'center',
        }}>
          {[0, 1, 2].map(i => (
            <span key={i} style={{ display: 'flex', gap: 2 }}>
              <span style={{ width: 2.5, height: 2.5, borderRadius: 1.25, background: p.textDim }}/>
              <span style={{ width: 2.5, height: 2.5, borderRadius: 1.25, background: p.textDim }}/>
            </span>
          ))}
        </span>
        <button onClick={() => onMove(1)} disabled={isLast} style={tinyBtn(p, isLast)}>
          <Ico name="arrowUp" size={11} c={p.textMuted} sw={2.5} style={{ transform: 'rotate(180deg)' }}/>
        </button>
      </div>

      {/* Card */}
      <div style={{
        flex: 1, borderRadius: 14, overflow: 'hidden',
        background: p.surface, border: `0.5px solid ${p.line}`,
      }}>
        <button onClick={() => setOpen(!open)} style={{
          width: '100%', padding: '10px 12px', cursor: 'pointer',
          background: 'transparent', border: 'none', textAlign: 'left',
          display: 'flex', alignItems: 'center', gap: 10, fontFamily: 'Geist, system-ui',
        }}>
          <div style={{ width: 36, textAlign: 'center', flexShrink: 0 }}>
            <div style={{ fontSize: 11, color: p.text, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
              {item.time}
            </div>
            <div style={{ fontSize: 9, color: p.textDim, fontVariantNumeric: 'tabular-nums', marginTop: 1 }}>
              {item.dur}
            </div>
          </div>
          <img src={item.img} alt="" style={{
            width: 38, height: 38, borderRadius: 9, objectFit: 'cover', flexShrink: 0,
          }} loading="lazy"/>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 13, fontWeight: 600, color: p.text, lineHeight: 1.2,
              textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap',
            }}>{item.title}</div>
            <div style={{ fontSize: 10, color: p.textMuted, marginTop: 2, display: 'flex', gap: 4, alignItems: 'center' }}>
              <span>{item.area}</span><span style={{ opacity: 0.4 }}>·</span>
              <Crowd level={item.crowd}/>
            </div>
          </div>
          <Ico name={open ? 'minus' : 'arrow'} size={14} c={p.textDim}
            style={{ transform: open ? 'none' : 'rotate(90deg)', transition: 'transform .15s' }}/>
        </button>

        {open && (
          <div style={{
            padding: '4px 12px 12px', display: 'flex', gap: 6, flexWrap: 'wrap',
            borderTop: `0.5px solid ${p.line}`,
          }}>
            <button style={planAction(p)}>
              <Ico name="clock" size={12} c={p.accent}/>
              Move time
            </button>
            <button style={planAction(p)} onClick={() => onMoveDay(-1)}>
              <Ico name="arrowLeft" size={12} c={p.accent}/>
              Prev day
            </button>
            <button style={planAction(p)} onClick={() => onMoveDay(1)}>
              <Ico name="arrow" size={12} c={p.accent}/>
              Next day
            </button>
            <button style={planAction(p)}>
              <Ico name="sparkle" size={12} c={p.accent}/>
              Replace with AI
            </button>
            <button onClick={onRemove} style={{
              ...planAction(p),
              color: p.danger, borderColor: p.danger + '44',
              background: 'rgba(255,110,140,0.10)',
              marginLeft: 'auto',
            }}>
              <Ico name="close" size={12} c={p.danger}/>
              Remove
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Add Activity bottom sheet ───────────────────────────────────────
function AddActivitySheet({ day, onClose, onAdd }) {
  const p = window.useTheme();
  const { Ico, AIOrb, Crowd } = window;
  const P = window.PHOTOS;

  const [tab, setTab] = useStateP('suggested');
  const [time, setTime] = useStateP('14:00');

  const SUGGESTIONS = [
    { id: 's1', img: P.matcha, title: '% Arabica · river view café', area: 'Higashiyama', meta: '★ 4.8 · 4 min walk', crowd: 'low', tag: 'AI pick · matches your vibes' },
    { id: 's2', img: P.philosopher, title: "Philosopher's Path", area: 'Higashiyama', meta: '★ 4.7 · free · 30-60m', crowd: 'low', tag: 'Light rain at 4pm — go before' },
    { id: 's3', img: P.garden, title: 'Hosen-in moss garden', area: 'Ohara', meta: '★ 4.8 · ¥800 · 12 min taxi', crowd: 'low', tag: 'Quiet, perfect after lunch' },
    { id: 's4', img: P.ramen, title: 'Yoshimura udon', area: 'Arashiyama', meta: '★ 4.9 · ¥¥ · 6 min walk', crowd: 'low', tag: 'Booked nearby restaurants' },
    { id: 's5', img: P.street, title: 'Pontocho lantern alley', area: 'Gion', meta: '★ 4.6 · evening', crowd: 'medium', tag: 'For sundown' },
  ];

  const SAVED = [
    { id: 'sv1', img: P.fushimi, title: 'Fushimi Inari', area: 'Fushimi', meta: 'Saved 2 days ago', crowd: 'high' },
    { id: 'sv2', img: P.bambooGrove, title: 'Bamboo grove · north entrance', area: 'Arashiyama', meta: 'Saved last week', crowd: 'low' },
  ];

  const items = tab === 'suggested' ? SUGGESTIONS : tab === 'saved' ? SAVED : [];

  return (
    <div onClick={onClose} style={{
      position: 'absolute', inset: 0, zIndex: 50,
      background: 'rgba(7,12,28,0.6)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'flex-end',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', maxHeight: '88%', overflow: 'auto',
        borderRadius: '28px 28px 0 0',
        background: p.dark ? 'rgba(21,32,64,0.98)' : 'rgba(255,255,255,0.98)',
        backdropFilter: 'blur(40px)',
        border: `0.5px solid ${p.line}`, borderBottom: 'none',
        paddingBottom: 28, color: p.text, fontFamily: 'Geist, system-ui',
        animation: 'slideUp 0.32s cubic-bezier(.2,.7,.3,1)',
      }}>
        <div style={{ width: 38, height: 4, borderRadius: 2,
          background: p.dark ? 'rgba(255,255,255,0.2)' : 'rgba(15,30,80,0.15)',
          margin: '8px auto 14px' }}/>

        {/* Header */}
        <div style={{ padding: '0 22px 8px' }}>
          <div style={{ fontSize: 10, letterSpacing: 1.6, textTransform: 'uppercase', color: p.accent, fontWeight: 700 }}>
            Add to {day.label} · {day.date}
          </div>
          <div style={{ fontSize: 22, fontWeight: 600, color: p.text, marginTop: 4, letterSpacing: -0.5 }}>
            What to add?
          </div>
        </div>

        {/* Time slot */}
        <div style={{ padding: '8px 16px 12px' }}>
          <div style={{
            padding: '10px 14px', borderRadius: 14,
            background: p.dark ? 'rgba(255,255,255,0.04)' : 'rgba(15,30,80,0.04)',
            border: `0.5px solid ${p.line}`,
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <Ico name="clock" size={16} c={p.accent}/>
            <span style={{ fontSize: 12, color: p.textMuted }}>Time slot</span>
            <div style={{ flex: 1 }}/>
            <div style={{ display: 'flex', gap: 4 }}>
              {['09:00', '11:00', '14:00', '16:30', '18:00'].map(t => (
                <button key={t} onClick={() => setTime(t)} style={{
                  padding: '4px 9px', borderRadius: 99, fontSize: 11, fontWeight: 600,
                  background: time === t ? p.accent : 'transparent',
                  color: time === t ? '#fff' : p.text,
                  border: `0.5px solid ${time === t ? p.accent : p.line}`,
                  cursor: 'pointer', fontFamily: 'Geist, system-ui',
                  fontVariantNumeric: 'tabular-nums',
                }}>{t}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Tab bar */}
        <div style={{ padding: '0 16px 12px', display: 'flex', gap: 6 }}>
          {[
            { id: 'suggested', l: 'AI suggested', ico: 'sparkle' },
            { id: 'saved', l: 'Saved · 12', ico: 'heart' },
            { id: 'search', l: 'Search', ico: 'compass' },
          ].map(t => {
            const sel = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                flex: 1, padding: '8px 6px', borderRadius: 12,
                background: sel ? p.accentSoft : 'transparent',
                border: `0.5px solid ${sel ? p.accent + '55' : p.line}`,
                color: sel ? p.accent : p.text,
                fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'Geist, system-ui',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              }}>
                <Ico name={t.ico} size={13} c={sel ? p.accent : p.text}/>
                {t.l}
              </button>
            );
          })}
        </div>

        {/* Search field for 'search' tab */}
        {tab === 'search' && (
          <div style={{ padding: '0 16px 12px' }}>
            <div style={{
              padding: '10px 14px', borderRadius: 14,
              background: p.dark ? 'rgba(255,255,255,0.04)' : 'rgba(15,30,80,0.04)',
              border: `0.5px solid ${p.line}`,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <Ico name="compass" size={16} c={p.textMuted}/>
              <span style={{ fontSize: 13, color: p.textMuted }}>Search places, dishes, neighborhoods…</span>
            </div>
          </div>
        )}

        {/* Result list */}
        <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {items.map(it => (
            <button key={it.id} onClick={() => onAdd({
              ...it, time, dur: '1h', status: 'suggestion',
            })} style={{
              width: '100%', padding: '10px 10px', borderRadius: 14, cursor: 'pointer',
              background: p.surface, border: `0.5px solid ${p.line}`,
              display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left',
              fontFamily: 'Geist, system-ui',
            }}>
              <img src={it.img} alt="" style={{
                width: 52, height: 52, borderRadius: 12, objectFit: 'cover', flexShrink: 0,
              }} loading="lazy"/>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: p.text, lineHeight: 1.2,
                  textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                  {it.title}
                </div>
                <div style={{ fontSize: 11, color: p.textMuted, marginTop: 3 }}>
                  {it.area} · {it.meta}
                </div>
                {it.tag && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 5, fontSize: 10, color: p.accent, fontWeight: 600 }}>
                    <window.AIOrb size={10} pulse={false}/>
                    {it.tag}
                  </div>
                )}
              </div>
              <span style={{
                width: 30, height: 30, borderRadius: 15, flexShrink: 0,
                background: window.SIRI_GRADIENT_LINEAR,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: `0 4px 12px ${p.glow}`,
              }}>
                <Ico name="plus" size={14} c="#fff" sw={2.5}/>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── helpers / seed data ─────────────────────────────────────────────
function ghostButton(p) {
  return {
    width: 36, height: 36, borderRadius: 18,
    background: p.dark ? 'rgba(255,255,255,0.06)' : 'rgba(15,30,80,0.05)',
    border: `0.5px solid ${p.line}`, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  };
}
function tinyBtn(p, disabled) {
  return {
    width: 20, height: 20, borderRadius: 6, padding: 0,
    background: 'transparent', border: 'none',
    cursor: disabled ? 'default' : 'pointer',
    opacity: disabled ? 0.25 : 0.7,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  };
}
function planAction(p) {
  return {
    padding: '6px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600,
    background: p.dark ? 'rgba(255,255,255,0.04)' : 'rgba(15,30,80,0.04)',
    border: `0.5px solid ${p.line}`, color: p.text,
    cursor: 'pointer', fontFamily: 'Geist, system-ui',
    display: 'inline-flex', alignItems: 'center', gap: 4,
  };
}

function seedPlan() {
  const P = window.PHOTOS;
  return [
    { label: 'D1', date: 'Apr 4', name: 'Arrival', weather: '☀ 18°', items: [
      { id: 'd1a', time: '15:00', dur: '1h', title: 'Hotel check-in · Granbell',  img: P.gion,       area: 'Gion',         crowd: 'low' },
      { id: 'd1b', time: '17:30', dur: '1h 30m', title: 'Sunset walk · Yasaka',    img: P.street,     area: 'Gion',         crowd: 'medium' },
      { id: 'd1c', time: '19:30', dur: '2h', title: 'Ramen at Ippudo',             img: P.ramen,      area: 'Gion',         crowd: 'medium' },
    ]},
    { label: 'D2', date: 'Apr 5', name: 'East Kyoto', weather: '☁ 16°', items: [
      { id: 'd2a', time: '08:30', dur: '2h', title: 'Kiyomizu-dera at dawn',       img: P.fushimi,    area: 'Higashiyama',  crowd: 'low' },
      { id: 'd2b', time: '11:00', dur: '1h 30m', title: "Philosopher's Path",      img: P.philosopher,area: 'Higashiyama',  crowd: 'low' },
      { id: 'd2c', time: '13:00', dur: '1h', title: 'Matcha at Ippodo',            img: P.matcha,     area: 'Nakagyo',      crowd: 'low' },
      { id: 'd2d', time: '15:00', dur: '2h', title: 'Ginkaku-ji silver pavilion',  img: P.kinkakuji,  area: 'Sakyo',        crowd: 'medium' },
    ]},
    { label: 'D3', date: 'Apr 6', name: 'Bamboo & Gold', weather: '⛅ 19°', items: window.DAY3 },
    { label: 'D4', date: 'Apr 7', name: 'Geisha District', weather: '☀ 21°', items: [
      { id: 'd4a', time: '11:00', dur: '2h', title: 'Tea ceremony · Camellia',     img: P.matcha,     area: 'Gion',         crowd: 'low' },
      { id: 'd4b', time: '15:00', dur: '2h', title: 'Pontocho alley wander',       img: P.street,     area: 'Pontocho',     crowd: 'low' },
      { id: 'd4c', time: '18:00', dur: '2h 30m', title: 'Geisha-watching dinner', img: P.sushi,      area: 'Gion',         crowd: 'medium' },
    ]},
    { label: 'D5', date: 'Apr 8', name: 'Day trip Nara', weather: '☀ 22°', items: [
      { id: 'd5a', time: '08:00', dur: '1h', title: 'Train to Nara',               img: P.street,     area: 'Nara',         crowd: 'medium' },
      { id: 'd5b', time: '10:00', dur: '3h', title: 'Todai-ji + deer park',        img: P.temple,     area: 'Nara',         crowd: 'high' },
      { id: 'd5c', time: '14:00', dur: '1h 30m', title: 'Lunch · Wakakusa',        img: P.ramen,      area: 'Nara',         crowd: 'medium' },
    ]},
    { label: 'D6', date: 'Apr 9', name: 'Hidden Kyoto', weather: '🌦 17°', items: [
      { id: 'd6a', time: '10:00', dur: '2h', title: 'Pottery studio · Kawai',      img: P.garden,     area: 'Gojo',         crowd: 'low' },
      { id: 'd6b', time: '14:00', dur: '2h', title: 'Hosen-in moss garden',        img: P.garden,     area: 'Ohara',        crowd: 'low' },
    ]},
    { label: 'D7', date: 'Apr 10', name: 'Slow morning', weather: '☀ 20°', items: [
      { id: 'd7a', time: '09:00', dur: '2h', title: 'River walk + breakfast',      img: P.matcha,     area: 'Pontocho',     crowd: 'low' },
      { id: 'd7b', time: '12:00', dur: '2h', title: 'Train to airport',            img: P.street,     area: 'Kansai',       crowd: 'medium' },
    ]},
  ];
}

window.ScreenPlanner = ScreenPlanner;
