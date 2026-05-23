// screen-pricing.jsx — Plans & subscription.
//
// Three tiers as scrollable cards (horizontal snap):
//   Free (Pilot)  · ¥0 forever  · 3 AI requests / day, 1 active trip
//   Companion     · ¥1,400 / mo · unlimited AI, replanning, transit bookings
//   Voyager       · ¥3,200 / mo · concierge bookings, multi-traveler, offline
//
// Featured card uses the Siri gradient. Below: feature comparison checklist.

const { useState: useStatePr } = React;

function ScreenPricing({ onClose, currentPlan = 'companion' }) {
  const p = window.useTheme();
  const { Ico, AIOrb, Pill } = window;

  const PLANS = [
    {
      id: 'free', name: 'Pilot', price: 'Free', sub: 'forever', kicker: 'Try the magic',
      features: ['3 AI requests / day', '1 active trip', 'Daily timeline', 'Map view'],
    },
    {
      id: 'companion', name: 'Companion', price: '¥1,400', sub: '/ month', kicker: 'Most popular',
      featured: true,
      features: [
        'Unlimited AI · 50 / day soft cap',
        '5 active trips',
        'Live replanning & weather',
        'Restaurant & taxi bookings',
        'Offline maps for 3 cities',
      ],
    },
    {
      id: 'voyager', name: 'Voyager', price: '¥3,200', sub: '/ month', kicker: 'For frequent travelers',
      features: [
        'Everything in Companion',
        'Concierge bookings (humans + AI)',
        'Multi-traveler shared trips',
        'Unlimited offline cities',
        'Priority lounge access partners',
      ],
    },
  ];

  const [sel, setSel] = useStatePr('companion');

  return (
    <div style={{
      position: 'absolute', inset: 0, background: p.bg, color: p.text,
      fontFamily: 'Geist, system-ui', overflow: 'auto', paddingBottom: 110,
    }}>
      {/* Top chrome */}
      <div style={{ padding: '56px 16px 8px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={onClose} style={{
          width: 36, height: 36, borderRadius: 18,
          background: p.dark ? 'rgba(255,255,255,0.06)' : 'rgba(27,18,64,0.05)',
          border: `0.5px solid ${p.line}`, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Ico name="close" size={16} c={p.text}/>
        </button>
        <div style={{ fontSize: 11, letterSpacing: 1.8, textTransform: 'uppercase', color: p.accent, fontWeight: 600, flex: 1 }}>
          Plans & subscriptions
        </div>
      </div>

      <div style={{ padding: '14px 22px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <div style={{ fontSize: 11, color: p.accent, letterSpacing: 1.4, textTransform: 'uppercase', fontWeight: 600 }}>
            Choose your companion
          </div>
        </div>
        <div style={{
          fontSize: 32, fontWeight: 600, letterSpacing: -1, lineHeight: 1.04, textWrap: 'pretty',
        }}>
          A travel <span style={{
            background: window.SIRI_GRADIENT_LINEAR, WebkitBackgroundClip: 'text',
            backgroundClip: 'text', color: 'transparent',
          }}>companion</span> as
          patient as the journey.
        </div>
      </div>

      {/* Plan cards — horizontal snap */}
      <div style={{
        display: 'flex', gap: 12, padding: '0 16px',
        overflowX: 'auto', scrollbarWidth: 'none',
        scrollSnapType: 'x mandatory',
      }}>
        {PLANS.map(plan => {
          const isCur = plan.id === currentPlan;
          const isSel = plan.id === sel;
          return (
            <button key={plan.id} onClick={() => setSel(plan.id)} style={{
              flexShrink: 0, width: 280, padding: 0, cursor: 'pointer',
              scrollSnapAlign: 'center', borderRadius: 24,
              background: plan.featured ? window.SIRI_GRADIENT_LINEAR : p.surface,
              border: `1px solid ${isSel ? p.accent : (plan.featured ? 'transparent' : p.line)}`,
              boxShadow: plan.featured
                ? '0 20px 50px rgba(95,160,255,0.35)'
                : (isSel ? `0 16px 36px ${p.accent}33` : 'none'),
              textAlign: 'left', fontFamily: 'Geist, system-ui',
              overflow: 'hidden', position: 'relative',
              transition: 'all .2s',
            }}>
              <div style={{ padding: '20px 22px 22px', minHeight: 380 }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{
                      fontSize: 10, letterSpacing: 1.6, textTransform: 'uppercase',
                      color: plan.featured ? 'rgba(255,255,255,0.85)' : p.accent,
                      fontWeight: 700,
                    }}>{plan.kicker}</div>
                    <div style={{
                      fontSize: 24, fontWeight: 600, marginTop: 6, letterSpacing: -0.6,
                      color: plan.featured ? '#fff' : p.text,
                    }}>{plan.name}</div>
                  </div>
                  {isCur && (
                    <span style={{
                      padding: '3px 8px', borderRadius: 99, fontSize: 10, fontWeight: 700,
                      letterSpacing: 1, textTransform: 'uppercase',
                      background: plan.featured ? 'rgba(255,255,255,0.22)' : p.accentSoft,
                      color: plan.featured ? '#fff' : p.accent,
                    }}>Current</span>
                  )}
                </div>

                {/* Price */}
                <div style={{ marginTop: 18, marginBottom: 22, display: 'flex', alignItems: 'baseline', gap: 4 }}>
                  <span style={{
                    fontSize: 44, fontWeight: 600, letterSpacing: -1.4,
                    color: plan.featured ? '#fff' : p.text,
                  }}>{plan.price}</span>
                  <span style={{ fontSize: 14, color: plan.featured ? 'rgba(255,255,255,0.7)' : p.textMuted }}>
                    {plan.sub}
                  </span>
                </div>

                {/* Features */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {plan.features.map((f, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                      <span style={{
                        width: 16, height: 16, borderRadius: 8, flexShrink: 0, marginTop: 1,
                        background: plan.featured ? 'rgba(255,255,255,0.22)' : p.accentSoft,
                        border: `0.5px solid ${plan.featured ? 'rgba(255,255,255,0.3)' : p.accent + '44'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Ico name="check" size={9} c={plan.featured ? '#fff' : p.accent} sw={3}/>
                      </span>
                      <span style={{
                        fontSize: 13, lineHeight: 1.4,
                        color: plan.featured ? 'rgba(255,255,255,0.95)' : p.text,
                      }}>{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* CTA */}
      <div style={{ padding: '22px 16px 0' }}>
        <button style={{
          width: '100%', height: 54, borderRadius: 27,
          background: window.SIRI_GRADIENT_LINEAR, color: '#fff',
          border: 'none', fontSize: 16, fontWeight: 600, cursor: 'pointer',
          fontFamily: 'Geist, system-ui',
          boxShadow: '0 14px 36px rgba(95,160,255,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          <Ico name="sparkle" size={18} c="#fff"/>
          {sel === currentPlan ? 'You\'re on this plan' :
            sel === 'free' ? 'Downgrade to Pilot' :
            `Upgrade to ${PLANS.find(pp => pp.id === sel).name} · ${PLANS.find(pp => pp.id === sel).price}/mo`}
        </button>
        <div style={{ textAlign: 'center', marginTop: 10, fontSize: 11, color: p.textMuted }}>
          Cancel anytime · Free trip pass on annual
        </div>
      </div>

      {/* FAQ-ish band */}
      <div style={{ padding: '24px 22px 0' }}>
        <div style={{ fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', color: p.accent, fontWeight: 600, marginBottom: 10 }}>
          Frequently asked
        </div>
        {[
          { q: 'Can I share a trip with my partner?', a: 'Yes — on Companion & Voyager.' },
          { q: 'Do bookings cost extra?', a: 'Restaurants & taxis are at-cost. Voyager waives concierge fees.' },
          { q: 'What if I leave mid-trip?', a: 'Your current trip stays active until the end date.' },
        ].map((f, i, arr) => (
          <div key={i} style={{
            padding: '14px 0', borderBottom: i < arr.length - 1 ? `0.5px solid ${p.line}` : 'none',
            display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12,
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: p.text, marginBottom: 4 }}>{f.q}</div>
              <div style={{ fontSize: 12, color: p.textMuted, lineHeight: 1.45 }}>{f.a}</div>
            </div>
            <Ico name="plus" size={16} c={p.textDim}/>
          </div>
        ))}
      </div>
    </div>
  );
}

window.ScreenPricing = ScreenPricing;
