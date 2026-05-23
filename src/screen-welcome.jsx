// screen-welcome.jsx — Cold-open welcome screen.
//
// 'hero' mode — sign-up entry point (Get started / Sign in)
// 'signup' / 'signin' mode — pick auth method (Apple / Google / Email)
// Email-only credential entry lives in screen-login-email.jsx.

function ScreenWelcome({ onContinueEmail, onSocial, onSignin, onSignup, mode = 'hero' }) {
  const p = window.useTheme();
  const { Ico, Btn } = window;

  const heroCopy = mode === 'signin' ? {
    kicker: 'Welcome back',
    title: ['Pick up where', <span key="i" style={{ fontStyle: 'italic', color: p.accent }}>you</span>, <br key="b"/>, 'left off.'],
    body: 'Sign in to continue your Kyoto trip — Day 3 of 7.',
  } : mode === 'signup' ? {
    kicker: 'Create your account',
    title: ['Make this', <br key="b"/>, <span key="i" style={{ fontStyle: 'italic', color: p.accent }}>yours</span>, ' in 30s.'],
    body: 'One companion, every trip you ever take.',
  } : {
    kicker: 'AI travel companion',
    title: ['Travel with', <br key="b1"/>,
            <span key="i" style={{
              background: window.SIRI_GRADIENT_LINEAR,
              WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
            }}>someone</span>, ' who', <br key="b2"/>, 'already knows', <br key="b3"/>, 'the way.'],
    body: 'A living travel companion that learns your trip, senses the city, and quietly rewrites the plan when life gets in the way.',
  };

  return (
    <div style={{
      position: 'absolute', inset: 0, overflow: 'hidden',
      background: p.bg, color: p.text, fontFamily: 'Geist, system-ui',
    }}>
      {/* Full-bleed hero photo */}
      <img src={window.PHOTOS.kyotoHero} alt="" style={{
        position: 'absolute', inset: 0, width: '100%', height: '100%',
        objectFit: 'cover', filter: p.dark ? 'brightness(0.78) saturate(1.1)' : 'brightness(0.92) saturate(1.05)',
      }}/>
      {/* Cinematic gradient */}
      <div style={{
        position: 'absolute', inset: 0,
        background: p.dark
          ? 'linear-gradient(180deg, rgba(11,10,24,0.82) 0%, rgba(11,10,24,0.2) 30%, rgba(11,10,24,0.4) 55%, rgba(11,10,24,0.97) 100%)'
          : 'linear-gradient(180deg, rgba(242,238,255,0.6) 0%, rgba(242,238,255,0.1) 30%, rgba(242,238,255,0.5) 55%, rgba(242,238,255,0.97) 100%)',
      }}/>

      {/* Top chrome: logo left, optional back button (in non-hero modes) */}
      <div style={{ position: 'absolute', top: 60, left: 16, right: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
        {mode !== 'hero' && (
          <button onClick={onSignup === undefined ? undefined : () => onSocial && onSocial('back')} style={{
            width: 36, height: 36, borderRadius: 18,
            background: 'rgba(11,10,24,0.4)', backdropFilter: 'blur(16px)',
            border: '0.5px solid rgba(255,255,255,0.18)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          }}>
            <Ico name="arrowLeft" size={18} c="#fff"/>
          </button>
        )}
        <Logo/>
        <div style={{ flex: 1 }}/>
      </div>

      {/* Bottom content */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 36,
        padding: '0 24px', display: 'flex', flexDirection: 'column', gap: 16,
      }}>
        <div style={{
          fontSize: 11, letterSpacing: 2.4, textTransform: 'uppercase',
          color: p.accent, fontWeight: 700,
        }}>
          {heroCopy.kicker}
        </div>
        <div style={{
          fontSize: 50, lineHeight: 0.98, letterSpacing: -1.6, fontWeight: 600,
          color: p.dark ? '#fff' : p.text, textWrap: 'pretty',
        }}>
          {heroCopy.title}
        </div>
        <div style={{
          fontSize: 14, lineHeight: 1.5, maxWidth: 300, marginTop: 2,
          color: p.dark ? 'rgba(255,255,255,0.7)' : p.textMuted,
        }}>
          {heroCopy.body}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
          {mode === 'hero' ? (
            <>
              <button onClick={onSignup} style={{
                height: 54, borderRadius: 27, padding: '0 22px',
                background: window.SIRI_GRADIENT_LINEAR, color: '#fff',
                border: 'none', cursor: 'pointer', fontFamily: 'Geist, system-ui',
                fontSize: 16, fontWeight: 600, letterSpacing: -0.2,
                boxShadow: '0 14px 36px rgba(95,160,255,0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}>
                <Ico name="sparkle" size={18} c="#fff"/>
                Get started — it's free
              </button>
              <button onClick={onSignin} style={{
                height: 54, borderRadius: 27, padding: '0 22px',
                background: 'rgba(255,255,255,0.10)', backdropFilter: 'blur(20px)',
                color: '#fff', border: '0.5px solid rgba(255,255,255,0.18)',
                cursor: 'pointer', fontFamily: 'Geist, system-ui',
                fontSize: 15, fontWeight: 500,
              }}>
                I already have an account
              </button>
            </>
          ) : (
            <>
              <button onClick={() => onSocial && onSocial('apple')} style={authBtn('#fff', '#000')}>
                <Ico name="apple" size={18} c="#000"/>
                Continue with Apple
              </button>
              <button onClick={() => onSocial && onSocial('google')} style={authBtn('rgba(255,255,255,0.10)', '#fff', true)}>
                <Ico name="google" size={18}/>
                Continue with Google
              </button>
              <button onClick={onContinueEmail} style={authBtn('rgba(255,255,255,0.10)', '#fff', true)}>
                <Ico name="mail" size={18} c="#fff"/>
                Continue with email
              </button>
              <div style={{ textAlign: 'center', marginTop: 6, fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>
                {mode === 'signup'
                  ? <>Already have an account? <span onClick={onSignin} style={{ color: p.accent, fontWeight: 600, cursor: 'pointer' }}>Sign in</span></>
                  : <>New here? <span onClick={onSignup} style={{ color: p.accent, fontWeight: 600, cursor: 'pointer' }}>Create account</span></>}
              </div>
            </>
          )}
        </div>

        {mode === 'hero' && (
          <div style={{
            textAlign: 'center', marginTop: 4, fontSize: 11, color: 'rgba(255,255,255,0.45)',
          }}>
            By continuing you agree to our Terms & Privacy.
          </div>
        )}
      </div>
    </div>
  );
}

function authBtn(bg, color, glass = false) {
  return {
    height: 50, borderRadius: 25, padding: '0 18px',
    background: bg, color, border: glass ? '0.5px solid rgba(255,255,255,0.18)' : 'none',
    backdropFilter: glass ? 'blur(20px)' : undefined,
    cursor: 'pointer', fontFamily: 'Geist, system-ui',
    fontSize: 15, fontWeight: 600, letterSpacing: -0.2,
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
  };
}

// ─── Small inline wordmark — orb glyph + "Companion" type — used in
// place of the floating AI orb on welcome/auth screens.
function Logo() {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 8,
      padding: '4px 10px 4px 4px', height: 32, borderRadius: 99,
      background: 'rgba(11,10,24,0.45)', backdropFilter: 'blur(16px)',
      border: '0.5px solid rgba(255,255,255,0.18)',
      fontFamily: 'Geist, system-ui',
    }}>
      <window.AIOrb size={22} pulse={false}/>
      <span style={{
        fontSize: 13, fontWeight: 600, color: '#fff', letterSpacing: -0.2,
      }}>
        Companion
      </span>
    </div>
  );
}

window.ScreenWelcome = ScreenWelcome;
