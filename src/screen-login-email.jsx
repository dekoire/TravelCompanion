// screen-login-email.jsx — Email + password credentials with iOS keyboard.
//
// Mode 'signin' = email + password.
// Mode 'signup' = email + password + name (optional).
//
// Uses the IOSKeyboard from ios-frame for authenticity. Inputs are static
// (no real text editing) — tap any field to select it.

const { useState: useStateE } = React;

function ScreenLoginEmail({ mode = 'signin', onBack, onSubmit, onForgot }) {
  const p = window.useTheme();
  const { Ico, AIOrb } = window;
  const [focus, setFocus] = useStateE(mode === 'signin' ? 'password' : 'email');

  const fields = mode === 'signup'
    ? [
        { id: 'name',     label: 'Name',     value: 'Mara',           type: 'text' },
        { id: 'email',    label: 'Email',    value: 'mara@kindle.io', type: 'email' },
        { id: 'password', label: 'Password', value: '••••••••',       type: 'password' },
      ]
    : [
        { id: 'email',    label: 'Email',    value: 'mara@kindle.io', type: 'email' },
        { id: 'password', label: 'Password', value: '••••••••',       type: 'password' },
      ];

  return (
    <div style={{
      position: 'absolute', inset: 0, background: p.bg, color: p.text,
      fontFamily: 'Geist, system-ui', display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{ padding: '56px 16px 0', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={onBack} style={{
          width: 36, height: 36, borderRadius: 18,
          background: p.dark ? 'rgba(255,255,255,0.06)' : 'rgba(27,18,64,0.05)',
          border: `0.5px solid ${p.line}`, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Ico name="arrowLeft" size={18} c={p.text}/>
        </button>
        <div style={{ flex: 1 }}/>
        <AIOrb size={26} halo/>
      </div>

      <div style={{ padding: '32px 24px 24px' }}>
        <div style={{ fontSize: 11, letterSpacing: 1.8, textTransform: 'uppercase', color: p.accent, fontWeight: 700 }}>
          {mode === 'signup' ? 'Create your account' : 'Welcome back'}
        </div>
        <div style={{
          fontSize: 32, fontWeight: 600, lineHeight: 1.04, letterSpacing: -1, marginTop: 8, textWrap: 'pretty',
        }}>
          {mode === 'signup' ? <>One last step <br/>and we're off.</> : <>Your trip is <br/>waiting.</>}
        </div>
      </div>

      {/* Form */}
      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {fields.map(f => {
          const isFocus = focus === f.id;
          return (
            <button key={f.id} onClick={() => setFocus(f.id)} style={{
              width: '100%', padding: '12px 16px', borderRadius: 16,
              background: p.surface,
              border: `1.5px solid ${isFocus ? p.accent : p.line}`,
              cursor: 'text', textAlign: 'left',
              boxShadow: isFocus ? `0 0 0 4px ${p.accent}22` : 'none',
              transition: 'all .15s',
            }}>
              <div style={{ fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase', color: isFocus ? p.accent : p.textMuted, fontWeight: 600, marginBottom: 4 }}>
                {f.label}
              </div>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ fontSize: 16, color: p.text, fontWeight: 500, fontFamily: f.type === 'password' ? '"Geist Mono", ui-monospace' : 'Geist, system-ui' }}>
                  {f.value}
                </span>
                {isFocus && (
                  <span style={{
                    display: 'inline-block', width: 2, height: 18, marginLeft: 2,
                    background: p.accent, animation: 'caret 1s ease-in-out infinite',
                  }}/>
                )}
              </div>
            </button>
          );
        })}

        {mode === 'signin' && (
          <button onClick={onForgot} style={{
            background: 'none', border: 'none', padding: 6,
            fontSize: 12, color: p.accent, fontWeight: 500, cursor: 'pointer',
            alignSelf: 'flex-end', fontFamily: 'Geist, system-ui',
          }}>
            Forgot password?
          </button>
        )}
      </div>

      {/* Primary CTA */}
      <div style={{ padding: '20px 16px 0' }}>
        <button onClick={onSubmit} style={{
          width: '100%', height: 54, borderRadius: 27,
          background: window.SIRI_GRADIENT_LINEAR, color: '#fff',
          border: 'none', fontSize: 16, fontWeight: 600, cursor: 'pointer',
          fontFamily: 'Geist, system-ui',
          boxShadow: '0 14px 36px rgba(95,160,255,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          <Ico name="sparkle" size={17} c="#fff"/>
          {mode === 'signup' ? 'Create account' : 'Sign in'}
        </button>
        {mode === 'signup' && (
          <div style={{ textAlign: 'center', marginTop: 10, fontSize: 11, color: p.textMuted, lineHeight: 1.4 }}>
            By creating an account you agree to our<br/>
            <span style={{ color: p.accent }}>Terms</span> & <span style={{ color: p.accent }}>Privacy policy</span>.
          </div>
        )}
      </div>

      {/* Bottom: iOS keyboard */}
      <div style={{ flex: 1 }}/>
      <window.IOSKeyboard dark={p.dark}/>
    </div>
  );
}

window.ScreenLoginEmail = ScreenLoginEmail;
