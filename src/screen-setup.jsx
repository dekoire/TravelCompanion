// screen-setup.jsx — AI conversational trip setup.
//
// The user is mid-conversation with the AI companion. The screen shows:
//   - a small header with destination + back
//   - a stream of AI question + user answer chips
//   - the current question (animated in)
//   - a row of suggested chips the user can tap to answer
//   - bottom dock with text input + voice
//
// Visually this should feel like talking to a thoughtful friend, NOT a form.

const { useState: useStateS, useEffect: useEffectS, useRef: useRefS } = React;

function ScreenSetup({ onComplete, onBack }) {
  const p = window.useTheme();
  const { Ico, Pill, AIOrb, Btn } = window;

  // The full setup conversation. The user is currently at `step` (0-based);
  // earlier steps render as completed exchanges, current step renders large.
  const STEPS = [
    {
      q: "Where are you headed?",
      answer: "Kyoto, Japan",
      chips: ['Kyoto, Japan', 'Lisbon', 'Mexico City', 'Reykjavik'],
    },
    {
      q: "Beautiful. When are we going?",
      answer: "Apr 4 – Apr 10",
      chips: ['This weekend', 'Apr 4 – Apr 10', 'Next month', 'Pick dates'],
    },
    {
      q: "Who's coming with you?",
      answer: "With my partner",
      chips: ['Solo', 'With my partner', 'Friends', 'Family'],
    },
    {
      q: "What's the vibe? Pick a few.",
      answer: ['Hidden gems', 'Local food', 'Romantic', 'Slow mornings'],
      chips: ['Hidden gems', 'Local food', 'Romantic', 'Adventure', 'Slow mornings', 'Nightlife', 'Museums', 'Hiking', 'Shopping'],
      multi: true,
    },
    {
      q: "How much energy do you want each day?",
      answer: "Balanced — a few things, room to wander",
      chips: ['Easy', 'Balanced', 'Packed'],
      visual: 'slider',
    },
  ];

  const [step, setStep] = useStateS(2);
  const [selected, setSelected] = useStateS(STEPS[2].chips[1]);
  const [multi, setMulti] = useStateS([]);

  const scrollRef = useRefS(null);
  useEffectS(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [step]);

  const next = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
      setSelected(STEPS[step + 1].multi ? null : STEPS[step + 1].chips[1]);
      setMulti([]);
    } else {
      onComplete && onComplete();
    }
  };

  const renderAnswered = (s, i) => (
    <div key={i} style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
        <div style={{ flexShrink: 0, paddingTop: 1 }}><AIOrb size={20} pulse={false}/></div>
        <div style={{ flex: 1, color: 'rgba(244,241,236,0.55)', fontSize: 15, lineHeight: 1.4 }}>
          {s.q}
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 6 }}>
        {Array.isArray(s.answer)
          ? s.answer.map((a, j) => <Pill key={j} tone="accent" size="md">{a}</Pill>)
          : <Pill tone="accent" size="md">{s.answer}</Pill>
        }
      </div>
    </div>
  );

  const current = STEPS[step];

  return (
    <div style={{
      position: 'absolute', inset: 0, background: p.bg,
      color: p.text, fontFamily: 'Geist, system-ui',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        paddingTop: 56, padding: '56px 22px 0', display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <button onClick={onBack} style={{
          width: 36, height: 36, borderRadius: 18, background: 'rgba(255,255,255,0.06)',
          border: '0.5px solid rgba(255,255,255,0.1)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
        }}>
          <Ico name="arrowLeft" size={18} c={p.text}/>
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', color: p.accent, fontWeight: 600 }}>
            Planning · Question {step + 1} of {STEPS.length}
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>
            Kyoto, Japan
          </div>
        </div>
        <button style={{
          fontSize: 13, color: 'rgba(255,255,255,0.55)', background: 'none', border: 'none', cursor: 'pointer',
        }}>Skip</button>
      </div>

      {/* progress dots */}
      <div style={{ display: 'flex', gap: 4, padding: '14px 22px 0' }}>
        {STEPS.map((_, i) => (
          <div key={i} style={{
            flex: 1, height: 2, borderRadius: 1,
            background: i <= step ? p.accent : 'rgba(255,255,255,0.10)',
            transition: 'background 0.4s',
          }}/>
        ))}
      </div>

      {/* Conversation scroll */}
      <div ref={scrollRef} style={{
        flex: 1, padding: '20px 22px 12px', overflow: 'auto',
        WebkitMaskImage: 'linear-gradient(180deg, transparent 0%, #000 8%, #000 92%, transparent 100%)',
      }}>
        {STEPS.slice(0, step).map(renderAnswered)}

        {/* Current question — large serif */}
        <div style={{ marginTop: 8, marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 10, marginBottom: 14, alignItems: 'flex-start' }}>
            <div style={{ paddingTop: 4 }}><AIOrb size={28}/></div>
            <div style={{
              fontFamily: 'Geist, system-ui', fontSize: 30, lineHeight: 1.12,
              letterSpacing: -0.4, color: p.text, textWrap: 'pretty', flex: 1, paddingTop: 2,
            }}>
              {current.q}
            </div>
          </div>
          {step === 4 && (
            <div style={{
              fontSize: 13, color: 'rgba(255,255,255,0.5)', marginLeft: 38, marginBottom: 4,
              fontStyle: 'italic', fontFamily: 'Geist, system-ui', fontSize: 15,
            }}>
              "We can always change this later — the plan adapts as we go."
            </div>
          )}
        </div>

        {/* answer chips */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, justifyContent: 'flex-start' }}>
          {current.chips.map((chip, i) => {
            const isSel = current.multi ? multi.includes(chip) : selected === chip;
            return (
              <button key={i} onClick={() => {
                if (current.multi) {
                  setMulti(m => m.includes(chip) ? m.filter(c => c !== chip) : [...m, chip]);
                } else {
                  setSelected(chip);
                }
              }} style={{
                padding: '10px 14px', borderRadius: 99, fontSize: 13, fontWeight: 500,
                background: isSel ? p.accent : 'rgba(255,255,255,0.04)',
                color: isSel ? '#1A140E' : p.text,
                border: `0.5px solid ${isSel ? p.accent : 'rgba(255,255,255,0.12)'}`,
                cursor: 'pointer', fontFamily: 'Geist, system-ui',
                transition: 'all 0.18s', letterSpacing: -0.1,
              }}>
                {isSel && current.multi && '✓ '}{chip}
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom dock */}
      <div style={{
        padding: '12px 16px 34px', borderTop: '0.5px solid rgba(255,255,255,0.08)',
        background: 'rgba(10,10,18,0.6)', backdropFilter: 'blur(20px)',
      }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{
            flex: 1, height: 48, borderRadius: 24, background: 'rgba(255,255,255,0.06)',
            border: '0.5px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center',
            padding: '0 16px', gap: 10,
          }}>
            <Ico name="chat" size={16} c="rgba(255,255,255,0.45)"/>
            <span style={{ flex: 1, fontSize: 14, color: 'rgba(255,255,255,0.45)' }}>
              or type your answer…
            </span>
            <Ico name="mic" size={16} c={p.accent}/>
          </div>
          <button onClick={next} style={{
            width: 48, height: 48, borderRadius: 24, background: p.accent,
            border: 'none', cursor: 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 6px 22px rgba(95,160,255,0.4)',
          }}>
            <Ico name="arrow" size={20} c="#fff" sw={2}/>
          </button>
        </div>
      </div>
    </div>
  );
}

window.ScreenSetup = ScreenSetup;
