// app.jsx — Main shell for AI Travel Companion.
//
// Tab bar (5 tabs): Trips · Today · Feed · Companion · You
//                   Map / Profile / Detail / Chat / Review / Transport /
//                   Pricing live as full-screen overlays.
// A second view ("canvas") spreads every screen side-by-side for
// presentation. Toggled via Tweaks.

const { useState: useStateApp, useEffect: useEffectApp } = React;

// ───────────────────────────────────────────────────────────────
// Phone — iOS frame at 100%; mirrors the global theme mode.
// ───────────────────────────────────────────────────────────────
function Phone({ children, scale = 1 }) {
  // Subscribe to theme so bezel re-renders when the user toggles light/dark.
  const t = window.useTheme();
  return (
    <div style={{
      position: 'relative', width: 402 * scale, height: 874 * scale,
      transformOrigin: 'top left',
    }}>
      <div style={{
        transform: `scale(${scale})`, transformOrigin: 'top left',
        width: 402, height: 874,
      }}>
        <window.IOSDevice dark={t.dark}>
          {children}
        </window.IOSDevice>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────
// Bottom tab bar
// ───────────────────────────────────────────────────────────────
function TabBar({ tab, onTab }) {
  const p = window.useTheme();
  const { Ico, AIOrb } = window;
  const tabs = [
    { id: 'trips',    icon: 'compass', label: 'Trips' },
    { id: 'timeline', icon: 'clock',   label: 'Today' },
    { id: 'chat',     icon: 'chat',    label: 'Companion', orb: true },
    { id: 'feed',     icon: 'heart',   label: 'Feed' },
    { id: 'profile',  icon: 'user',    label: 'You' },
  ];
  return (
    <div style={{
      position: 'absolute', bottom: 16, left: 16, right: 16, height: 64,
      borderRadius: 32, zIndex: 30,
      background: p.dark ? 'rgba(20,18,52,0.82)' : 'rgba(255,255,255,0.82)',
      backdropFilter: 'blur(28px) saturate(180%)',
      WebkitBackdropFilter: 'blur(28px) saturate(180%)',
      border: `0.5px solid ${p.line}`,
      boxShadow: p.dark
        ? '0 20px 50px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)'
        : '0 12px 36px rgba(40,30,90,0.16), inset 0 1px 0 rgba(255,255,255,0.6)',
      display: 'flex', alignItems: 'center', padding: '0 4px',
    }}>
      {tabs.map(t => {
        const active = tab === t.id;
        return (
          <button key={t.id} onClick={() => onTab(t.id)} style={{
            flex: 1, height: 48, background: 'transparent', border: 'none',
            cursor: 'pointer', display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 3, padding: 0,
            color: active ? p.accent : p.textMuted,
            fontFamily: 'Geist, system-ui', fontSize: 10, fontWeight: 500,
            position: 'relative',
          }}>
            {t.orb
              ? <AIOrb size={22} pulse={active} halo={active}/>
              : <Ico name={t.icon} size={22} c={active ? p.accent : p.textMuted}/>}
            <span style={{ letterSpacing: 0.2 }}>{t.label}</span>
            {active && !t.orb && (
              <span style={{
                position: 'absolute', top: -2, width: 3, height: 3, borderRadius: 2,
                background: p.accent, boxShadow: `0 0 8px ${p.accent}`,
              }}/>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ───────────────────────────────────────────────────────────────
// Main prototype app — owns nav state + renders the correct screen
// ───────────────────────────────────────────────────────────────
function PrototypeApp({ tweaks, onSetTweak }) {
  const [tab, setTab] = useStateApp('timeline');
  const [overlay, setOverlay] = useStateApp(null);
  const [overlayData, setOverlayData] = useStateApp(null);

  const goOverlay = (name, data = null) => { setOverlay(name); setOverlayData(data); };
  const close = () => { setOverlay(null); setOverlayData(null); };

  // Map between tabs and their root screen
  let main;
  switch (tab) {
    case 'trips':
      main = <window.ScreenTrips
        onNewTrip={() => goOverlay('setup')}
        onOpenTrip={() => goOverlay('overview')}
        onEditPlan={() => goOverlay('planner')}
        onShare={() => goOverlay('share')}/>;
      break;
    case 'feed':
      main = <window.ScreenFeed
        onCompose={() => goOverlay('review', window.DAY3[0])}
        onOpenLocation={(a) => goOverlay('detail', a)}
        onOpenChat={() => setTab('chat')}/>;
      break;
    case 'chat':
      main = <window.ScreenChat
        onClose={() => setTab('timeline')}
        onOpenLocation={() => goOverlay('detail')}/>;
      break;
    case 'profile':
      main = <window.ScreenProfile
        onBack={() => setTab('timeline')}
        onOpenPricing={() => goOverlay('pricing')}
        onShowOnboarding={() => goOverlay('welcome')}
        onSignOut={() => goOverlay('welcome')}/>;
      break;
    case 'timeline':
    default:
      main = <window.ScreenTimeline
        onOpenLocation={(a) => goOverlay('detail', a)}
        onOpenChat={() => setTab('chat')}
        onOpenMap={() => goOverlay('map')}
        onOpenTransport={(a) => goOverlay('transport', a)}
        onEditPlan={() => goOverlay('planner')}
        onShare={() => goOverlay('share')}
        currentDay={tweaks.day}/>;
  }

  // Hide tab bar for immersive overlays + the chat tab (has its own close)
  const fullScreenOverlays = ['welcome', 'auth-signin', 'auth-signup', 'login-email', 'setup', 'planning', 'map'];
  const showTabBar = !fullScreenOverlays.includes(overlay) && tab !== 'chat';

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0 }}>{main}</div>

      {overlay === 'detail' && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 40, animation: 'slideUp 0.32s cubic-bezier(.2,.7,.3,1)' }}>
          <window.ScreenDetail activity={overlayData} onClose={close}
            onOpenChat={() => { close(); setTab('chat'); }}
            onReplace={() => goOverlay('replace', overlayData)}/>
        </div>
      )}
      {overlay === 'replace' && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 45, animation: 'slideUp 0.32s cubic-bezier(.2,.7,.3,1)' }}>
          <window.ScreenReplace activity={overlayData}
            onClose={() => goOverlay('detail', overlayData)}
            onConfirm={() => { close(); setTab('timeline'); }}
            onCompare={() => {}}/>
        </div>
      )}
      {overlay === 'map' && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 40 }}>
          <window.ScreenMap
            onOpenLocation={(a) => goOverlay('detail', a)}
            onOpenChat={() => { close(); setTab('chat'); }}
            onClose={close}/>
        </div>
      )}
      {overlay === 'review' && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 40, animation: 'slideUp 0.32s cubic-bezier(.2,.7,.3,1)' }}>
          <window.ScreenReview activity={overlayData} onClose={close} onPost={close}/>
        </div>
      )}
      {overlay === 'transport' && (
        <window.ScreenTransport
          from={{ title: 'Higashiyama · current', time: '09:42' }}
          to={overlayData ? { title: overlayData.title, time: overlayData.time } : null}
          onClose={close} onConfirm={close}/>
      )}
      {overlay === 'pricing' && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 40, animation: 'slideUp 0.32s cubic-bezier(.2,.7,.3,1)' }}>
          <window.ScreenPricing onClose={close}/>
        </div>
      )}
      {overlay === 'share' && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 40, animation: 'slideUp 0.32s cubic-bezier(.2,.7,.3,1)' }}>
          <window.ScreenShare onClose={close}/>
        </div>
      )}
      {overlay === 'planner' && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 40, animation: 'slideUp 0.32s cubic-bezier(.2,.7,.3,1)' }}>
          <window.ScreenPlanner onClose={close}/>
        </div>
      )}
      {overlay === 'overview' && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 40, animation: 'slideUp 0.32s cubic-bezier(.2,.7,.3,1)' }}>
          <window.ScreenOverview
            onBack={close}
            onOpenDay={() => { close(); setTab('timeline'); }}
            onOpenProfile={() => { close(); setTab('profile'); }}
            onShare={() => goOverlay('share')}
            onEditPlan={() => goOverlay('planner')}/>
        </div>
      )}
      {overlay === 'welcome' && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 40 }}>
          <window.ScreenWelcome
            onSignup={() => goOverlay('auth-signup')}
            onSignin={() => goOverlay('auth-signin')}/>
        </div>
      )}
      {overlay === 'auth-signup' && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 40 }}>
          <window.ScreenWelcome mode="signup"
            onContinueEmail={() => goOverlay('login-email')}
            onSocial={(provider) => provider === 'back' ? goOverlay('welcome') : goOverlay('setup')}
            onSignin={() => goOverlay('auth-signin')}
            onSignup={() => goOverlay('auth-signup')}/>
        </div>
      )}
      {overlay === 'auth-signin' && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 40 }}>
          <window.ScreenWelcome mode="signin"
            onContinueEmail={() => goOverlay('login-email')}
            onSocial={(provider) => provider === 'back' ? goOverlay('welcome') : close()}
            onSignin={() => goOverlay('auth-signin')}
            onSignup={() => goOverlay('auth-signup')}/>
        </div>
      )}
      {overlay === 'login-email' && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 40 }}>
          <window.ScreenLoginEmail mode="signin"
            onBack={() => goOverlay('auth-signin')}
            onSubmit={() => { close(); setTab('trips'); }}/>
        </div>
      )}
      {overlay === 'setup' && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 40 }}>
          <window.ScreenSetup onComplete={() => goOverlay('planning')} onBack={close}/>
        </div>
      )}
      {overlay === 'planning' && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 40 }}>
          <window.ScreenPlanning onComplete={() => { close(); setTab('timeline'); }}/>
        </div>
      )}

      {showTabBar && <TabBar tab={tab} onTab={setTab}/>}
    </div>
  );
}

// ───────────────────────────────────────────────────────────────
// Tweaks
// ───────────────────────────────────────────────────────────────
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "view": "prototype",
  "theme": "dark",
  "day": 3
}/*EDITMODE-END*/;

// ───────────────────────────────────────────────────────────────
// Top-level App
// ───────────────────────────────────────────────────────────────
function App() {
  const { useTweaks, TweaksPanel, TweakSection, TweakRadio, TweakSlider } = window;
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);

  // Mirror theme tweak to global theme state on each change.
  React.useEffect(() => { window.setThemeMode(tweaks.theme); }, [tweaks.theme]);

  const renderCanvas = () => (
    <window.DesignCanvas>
      <window.DCSection id="proto" title="Prototype" subtitle="Tap-through interactive demo">
        <window.DCArtboard id="prototype" label="Interactive · 5-tab navigation" width={402} height={874}>
          <Phone><PrototypeApp tweaks={tweaks} onSetTweak={setTweak}/></Phone>
        </window.DCArtboard>
      </window.DCSection>

      <window.DCSection id="entry" title="Onboarding" subtitle="Cold open → first generated trip">
        <window.DCArtboard id="welcome" label="Welcome · cold open" width={402} height={874}>
          <Phone><window.ScreenWelcome onSignup={()=>{}} onSignin={()=>{}}/></Phone>
        </window.DCArtboard>
        <window.DCArtboard id="auth-signup" label="Sign up · auth methods" width={402} height={874}>
          <Phone><window.ScreenWelcome mode="signup" onContinueEmail={()=>{}} onSocial={()=>{}} onSignin={()=>{}} onSignup={()=>{}}/></Phone>
        </window.DCArtboard>
        <window.DCArtboard id="email-signin" label="Sign in · email + password" width={402} height={874}>
          <Phone><window.ScreenLoginEmail mode="signin" onBack={()=>{}} onSubmit={()=>{}}/></Phone>
        </window.DCArtboard>
        <window.DCArtboard id="setup" label="AI conversational setup" width={402} height={874}>
          <Phone><window.ScreenSetup onComplete={()=>{}} onBack={()=>{}}/></Phone>
        </window.DCArtboard>
        <window.DCArtboard id="planning" label="Composing trip" width={402} height={874}>
          <Phone><window.ScreenPlanning onComplete={()=>{}}/></Phone>
        </window.DCArtboard>
      </window.DCSection>

      <window.DCSection id="trips-section" title="Trips" subtitle="Library + new trip + active trip overview">
        <window.DCArtboard id="trips" label="All trips · library" width={402} height={874}>
          <Phone><window.ScreenTrips onNewTrip={()=>{}} onOpenTrip={()=>{}}/></Phone>
        </window.DCArtboard>
        <window.DCArtboard id="overview" label="Weekly overview · current trip" width={402} height={874}>
          <Phone><window.ScreenOverview/></Phone>
        </window.DCArtboard>
        <window.DCArtboard id="planner" label="Plan editor · reorder, add, remove" width={402} height={874}>
          <Phone><window.ScreenPlanner onClose={()=>{}}/></Phone>
        </window.DCArtboard>
      </window.DCSection>

      <window.DCSection id="day" title="In-trip core" subtitle="Daily timeline + map + transport choice">
        <window.DCArtboard id="timeline" label="Today · prominent Next Up" width={402} height={874}>
          <Phone><window.ScreenTimeline onOpenLocation={()=>{}} onOpenChat={()=>{}} onOpenMap={()=>{}} onOpenTransport={()=>{}} currentDay={3}/></Phone>
        </window.DCArtboard>
        <window.DCArtboard id="map" label="Interactive map · Kyoto" width={402} height={874}>
          <Phone><window.ScreenMap onOpenLocation={()=>{}} onOpenChat={()=>{}} onClose={()=>{}}/></Phone>
        </window.DCArtboard>
        <window.DCArtboard id="transport" label="Transport choice sheet" width={402} height={874}>
          <Phone>
            <div style={{ position: 'absolute', inset: 0, background: window.getTheme().bg }}/>
            <window.ScreenTransport onClose={()=>{}} onConfirm={()=>{}}/>
          </Phone>
        </window.DCArtboard>
        <window.DCArtboard id="detail" label="Location detail · bamboo grove" width={402} height={874}>
          <Phone><window.ScreenDetail activity={window.DAY3[1]} onClose={()=>{}}/></Phone>
        </window.DCArtboard>
      </window.DCSection>

      <window.DCSection id="ai-social" title="Companion & social" subtitle="AI chat with picker · feed · reviews">
        <window.DCArtboard id="chat" label="Companion chat · image picker" width={402} height={874}>
          <Phone><window.ScreenChat onClose={()=>{}} onOpenLocation={()=>{}}/></Phone>
        </window.DCArtboard>
        <window.DCArtboard id="feed" label="Social feed · likes + comments" width={402} height={874}>
          <Phone><window.ScreenFeed onCompose={()=>{}} onOpenLocation={()=>{}}/></Phone>
        </window.DCArtboard>
        <window.DCArtboard id="review" label="Reflect · photos + rating" width={402} height={874}>
          <Phone><window.ScreenReview activity={window.DAY3[0]} onClose={()=>{}}/></Phone>
        </window.DCArtboard>
        <window.DCArtboard id="replace" label="Replace activity · pick alternatives" width={402} height={874}>
          <Phone><window.ScreenReplace activity={window.DAY3[3]} onClose={()=>{}}/></Phone>
        </window.DCArtboard>
      </window.DCSection>

      <window.DCSection id="account" title="Account" subtitle="Profile · plans · sharing">
        <window.DCArtboard id="profile" label="You · pass + usage + settings" width={402} height={874}>
          <Phone><window.ScreenProfile onOpenPricing={()=>{}}/></Phone>
        </window.DCArtboard>
        <window.DCArtboard id="pricing" label="Plans & subscriptions" width={402} height={874}>
          <Phone><window.ScreenPricing onClose={()=>{}}/></Phone>
        </window.DCArtboard>
        <window.DCArtboard id="share" label="Travel together · invite & sync" width={402} height={874}>
          <Phone><window.ScreenShare onClose={()=>{}}/></Phone>
        </window.DCArtboard>
      </window.DCSection>
    </window.DesignCanvas>
  );

  const palette = window.useTheme();

  return (
    <>
      {tweaks.view === 'prototype' ? (
        <div style={{
          position: 'fixed', inset: 0,
          background: palette.dark
            ? 'radial-gradient(ellipse at top, #181734, #06060C 70%)'
            : 'radial-gradient(ellipse at top, #FAF7FF, #DCD3FF 70%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'Geist, system-ui',
        }}>
          <div style={{
            position: 'absolute', top: 20, left: 24,
            fontSize: 11, color: palette.dark ? 'rgba(255,255,255,0.55)' : 'rgba(27,18,64,0.55)',
            letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: 600,
          }}>
            TravelCopanion <span style={{
              background: window.SIRI_GRADIENT_LINEAR, WebkitBackgroundClip: 'text',
              backgroundClip: 'text', color: 'transparent', fontWeight: 700,
            }}>· prototype</span>
          </div>
          <Phone><PrototypeApp tweaks={tweaks} onSetTweak={setTweak}/></Phone>
        </div>
      ) : renderCanvas()}

      <TweaksPanel title="Tweaks">
        <TweakSection label="View">
          <TweakRadio label="Mode" value={tweaks.view} options={[
            { value: 'prototype', label: 'Prototype' },
            { value: 'canvas',    label: 'Canvas' },
          ]} onChange={v => setTweak('view', v)}/>
        </TweakSection>
        <TweakSection label="Theme">
          <TweakRadio label="Color" value={tweaks.theme} options={[
            { value: 'dark',  label: 'Dark' },
            { value: 'light', label: 'Light' },
          ]} onChange={v => setTweak('theme', v)}/>
        </TweakSection>
        <TweakSection label="Itinerary">
          <TweakSlider label="Current day" value={tweaks.day} min={1} max={7} step={1}
            onChange={v => setTweak('day', v)}/>
        </TweakSection>
      </TweaksPanel>
    </>
  );
}

window.App = App;
