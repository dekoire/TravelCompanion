// screen-planning.jsx — AI is building your trip.
//
// A cinematic loading state: animated route drawing across a stylized map,
// AI status lines appearing one at a time, photos of POIs flickering into
// place. Feels like the AI is *thinking* about your trip, not "Loading…".

const { useState: useStateP, useEffect: useEffectP } = React;

function ScreenPlanning({ onComplete }) {
  const p = window.useTheme();
  const { Ico, AIOrb, Shimmer } = window;

  // Status lines stream in over time.
  const LINES = [
    { t: 0,    s: 'Reading your travel vibe…' },
    { t: 900,  s: 'Pulling 217 places in Kyoto…' },
    { t: 1800, s: 'Matching against weather forecast…' },
    { t: 2700, s: 'Routing 7 days to minimize walking…' },
    { t: 3500, s: 'Reserving 4 restaurants…' },
    { t: 4200, s: 'Final touches…' },
  ];
  const [stageIdx, setStageIdx] = useStateP(0);

  useEffectP(() => {
    const timers = LINES.map((l, i) => setTimeout(() => setStageIdx(i + 1), l.t));
    const done = setTimeout(() => onComplete && onComplete(), 5400);
    return () => { timers.forEach(clearTimeout); clearTimeout(done); };
  }, []);

  const photos = [
    window.PHOTOS.bambooGrove, window.PHOTOS.kinkakuji,
    window.PHOTOS.gion, window.PHOTOS.sushi,
    window.PHOTOS.matcha, window.PHOTOS.fushimi,
  ];

  return (
    <div style={{
      position: 'absolute', inset: 0, background: p.bg,
      color: p.text, fontFamily: 'Geist, system-ui', overflow: 'hidden',
    }}>
      {/* Radial glow background */}
      <div style={{
        position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)',
        width: 500, height: 500, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(95,160,255,0.16) 0%, transparent 60%)',
        animation: 'glowDrift 8s ease-in-out infinite',
      }}/>

      {/* Animated route — SVG sweeping a curve across the device */}
      <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0.55 }}>
        <defs>
          <linearGradient id="planRoute" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={p.accent} stopOpacity="0"/>
            <stop offset="50%" stopColor={p.accent} stopOpacity="0.9"/>
            <stop offset="100%" stopColor={p.vermilion} stopOpacity="0.4"/>
          </linearGradient>
        </defs>
        <path
          d="M 30 220 Q 110 140, 180 280 T 360 200 Q 320 380, 200 460 T 60 580 Q 200 640, 360 600"
          fill="none" stroke="url(#planRoute)" strokeWidth="2" strokeDasharray="6 6"
          strokeLinecap="round"
          style={{ animation: 'planDash 3s linear infinite' }}
        />
        {/* Pin dots along the route */}
        {[[30,220],[180,280],[360,200],[200,460],[60,580],[360,600]].map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r="5" fill={p.accent}
            style={{ animation: `pinPulse 1.6s ease-in-out infinite ${i * 0.2}s` }}/>
        ))}
      </svg>

      {/* Photos floating in */}
      <div style={{ position: 'absolute', top: 96, left: 0, right: 0, height: 360, pointerEvents: 'none' }}>
        {photos.map((src, i) => {
          const positions = [
            { x: 18, y: 6, r: -8, s: 0.9 }, { x: 240, y: 30, r: 6, s: 0.85 },
            { x: 60, y: 130, r: 4, s: 0.95 }, { x: 250, y: 160, r: -5, s: 0.8 },
            { x: 30, y: 270, r: -3, s: 0.9 }, { x: 220, y: 260, r: 7, s: 0.85 },
          ];
          const pos = positions[i] || positions[0];
          return (
            <div key={i} style={{
              position: 'absolute', left: pos.x, top: pos.y,
              width: 110, height: 140, borderRadius: 14, overflow: 'hidden',
              transform: `rotate(${pos.r}deg) scale(${pos.s})`,
              boxShadow: '0 12px 30px rgba(0,0,0,0.4), 0 0 0 0.5px rgba(255,255,255,0.08)',
              opacity: 0, animation: `photoFloat 0.8s ease-out ${i * 0.18}s forwards`,
            }}>
              <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy"/>
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 50%, rgba(0,0,0,0.4))' }}/>
            </div>
          );
        })}
      </div>

      {/* Bottom panel */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        padding: '180px 28px 50px',
        background: 'linear-gradient(180deg, transparent 0%, rgba(10,10,18,0.95) 28%, #0A0A12 50%)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22 }}>
          <AIOrb size={36}/>
          <div>
            <div style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: p.accent, fontWeight: 600 }}>
              Composing your trip
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
              this usually takes ~6 seconds
            </div>
          </div>
        </div>

        <div style={{
          fontFamily: 'Geist, system-ui', fontSize: 32, lineHeight: 1.1,
          letterSpacing: -0.4, marginBottom: 24, textWrap: 'pretty',
        }}>
          <Shimmer>Composing a 7-day Kyoto for two — slow, romantic, full of hidden things.</Shimmer>
        </div>

        {/* Status lines stream */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
          {LINES.map((l, i) => {
            const active = i === stageIdx - 1;
            const done = i < stageIdx - 1;
            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                fontSize: 13, color: done ? 'rgba(255,255,255,0.4)' : (active ? p.text : 'rgba(255,255,255,0.2)'),
                transition: 'all 0.4s', opacity: i < stageIdx ? 1 : 0.2,
                transform: i < stageIdx ? 'translateX(0)' : 'translateX(8px)',
              }}>
                <span style={{
                  display: 'inline-block', width: 14, height: 14, borderRadius: 7,
                  border: `1px solid ${done ? p.accent : 'rgba(255,255,255,0.2)'}`,
                  background: done ? p.accent : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  {done && <Ico name="check" size={9} c="#fff" sw={3}/>}
                  {active && <span style={{
                    width: 6, height: 6, borderRadius: 3, background: p.accent,
                    animation: 'pulse 1.2s ease-in-out infinite',
                  }}/>}
                </span>
                <span>{l.s}</span>
              </div>
            );
          })}
        </div>

        {/* progress bar */}
        <div style={{
          height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden',
        }}>
          <div style={{
            width: `${(stageIdx / LINES.length) * 100}%`, height: '100%',
            background: `linear-gradient(90deg, ${p.accent}, ${p.vermilion})`,
            transition: 'width 0.6s ease', boxShadow: `0 0 12px ${p.accent}`,
          }}/>
        </div>
      </div>
    </div>
  );
}

window.ScreenPlanning = ScreenPlanning;
