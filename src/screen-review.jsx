// screen-review.jsx — "How was it?" reflection modal that appears after
// a visit (or can be opened from any past activity card).
//
// Includes: emoji-style rating, photo upload grid (placeholders with +),
// quick reaction chips, freeform text, public/private toggle.
//
// Photos here are static placeholders styled as <image-slot> drop targets —
// users can drag images in for real (or just visualize the flow).

const { useState: useStateRv } = React;

function ScreenReview({ activity, onClose, onPost }) {
  const p = window.useTheme();
  const { Ico, AIOrb, Pill } = window;
  const a = activity || window.DAY3[0];

  const [rating, setRating] = useStateRv(4);
  const [photos, setPhotos] = useStateRv([
    window.PHOTOS.matcha, window.PHOTOS.street, null, null,
  ]);
  const [reactions, setReactions] = useStateRv(['Cozy vibe', 'Worth it']);
  const [publicPost, setPublicPost] = useStateRv(true);

  const REACTIONS = [
    'Loved it', 'Worth it', 'Cozy vibe', 'Crowded',
    'Great service', 'Pricey', 'Hidden gem', 'Authentic',
    'Photo-worthy', 'Quick stop', 'Romantic', 'Touristy',
  ];

  return (
    <div style={{
      position: 'absolute', inset: 0, background: p.bg, color: p.text,
      fontFamily: 'Geist, system-ui', overflow: 'auto', paddingBottom: 120,
    }}>
      {/* Header */}
      <div style={{
        padding: '56px 16px 14px', display: 'flex', alignItems: 'center', gap: 12,
        background: p.dark
          ? 'linear-gradient(180deg, rgba(11,10,24,0.95), transparent)'
          : 'linear-gradient(180deg, rgba(242,238,255,0.95), transparent)',
      }}>
        <button onClick={onClose} style={{
          width: 36, height: 36, borderRadius: 18,
          background: p.dark ? 'rgba(255,255,255,0.06)' : 'rgba(27,18,64,0.05)',
          border: `0.5px solid ${p.line}`, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Ico name="close" size={16} c={p.text}/>
        </button>
        <div style={{ flex: 1, fontSize: 13, fontWeight: 500, color: p.textMuted }}>
          Reflect on your visit
        </div>
        <button onClick={() => onPost && onPost({ rating, photos, reactions, publicPost })} style={{
          padding: '6px 14px', height: 34, borderRadius: 17,
          background: window.SIRI_GRADIENT_LINEAR, color: '#fff',
          border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          fontFamily: 'Geist, system-ui',
        }}>
          Post
        </button>
      </div>

      {/* Hero — small photo + title */}
      <div style={{ padding: '8px 22px 4px', display: 'flex', gap: 14, alignItems: 'center' }}>
        <img src={a.img} alt="" style={{ width: 60, height: 60, borderRadius: 14, objectFit: 'cover', flexShrink: 0 }}/>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, color: p.accent, letterSpacing: 1.2, textTransform: 'uppercase', fontWeight: 600 }}>
            {a.time} · {a.area}
          </div>
          <div style={{ fontSize: 17, fontWeight: 600, color: p.text, lineHeight: 1.15, marginTop: 2,
            textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
            {a.title}
          </div>
        </div>
      </div>

      {/* AI prompt */}
      <div style={{ padding: '18px 16px 6px' }}>
        <div style={{
          padding: '14px 14px', borderRadius: 18,
          background: p.accentSoft, border: `0.5px solid ${p.accent}33`,
          display: 'flex', gap: 10, alignItems: 'flex-start',
        }}>
          <AIOrb size={24}/>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: p.accent, letterSpacing: 1.2, textTransform: 'uppercase', fontWeight: 600, marginBottom: 4 }}>
              How was it?
            </div>
            <div style={{ fontSize: 13, color: p.text, lineHeight: 1.45 }}>
              Your notes help me tune the rest of the trip — and skip places you didn't love.
            </div>
          </div>
        </div>
      </div>

      {/* Rating */}
      <div style={{ padding: '20px 22px 8px' }}>
        <div style={{ fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', color: p.accent, fontWeight: 600, marginBottom: 10 }}>
          Your rating
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
          {[
            { v: 1, emoji: '😕', l: 'Skip' },
            { v: 2, emoji: '😐', l: 'Meh' },
            { v: 3, emoji: '🙂', l: 'Good' },
            { v: 4, emoji: '😍', l: 'Loved' },
            { v: 5, emoji: '🤩', l: 'Magic' },
          ].map(r => {
            const sel = rating === r.v;
            return (
              <button key={r.v} onClick={() => setRating(r.v)} style={{
                flex: 1, padding: '10px 4px', borderRadius: 14, cursor: 'pointer',
                background: sel ? p.accentSoft : (p.dark ? 'rgba(255,255,255,0.03)' : 'rgba(27,18,64,0.03)'),
                border: `1.5px solid ${sel ? p.accent : 'transparent'}`,
                fontFamily: 'Geist, system-ui',
                transition: 'all .15s', transform: sel ? 'scale(1.04)' : 'scale(1)',
              }}>
                <div style={{ fontSize: 26, marginBottom: 2, filter: sel ? 'none' : 'grayscale(0.4) opacity(0.55)' }}>{r.emoji}</div>
                <div style={{ fontSize: 10, color: sel ? p.accent : p.textMuted, fontWeight: 600, letterSpacing: 0.3 }}>{r.l}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Photo upload grid */}
      <div style={{ padding: '20px 22px 8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', color: p.accent, fontWeight: 600 }}>
            Photos · {photos.filter(Boolean).length} / 4
          </div>
          <button style={{
            fontSize: 11, color: p.accent, background: 'none', border: 'none', cursor: 'pointer',
            fontFamily: 'Geist, system-ui', fontWeight: 500,
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <Ico name="plus" size={13} c={p.accent}/>
            Camera
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
          {photos.map((src, i) => (
            <button key={i} onClick={() => {
              // toggle: if has photo, remove; if empty, add a random photo
              const next = [...photos];
              if (src) next[i] = null;
              else next[i] = [window.PHOTOS.matcha, window.PHOTOS.ramen, window.PHOTOS.gion, window.PHOTOS.bambooGrove][i % 4];
              setPhotos(next);
            }} style={{
              aspectRatio: '1 / 1', borderRadius: 12, padding: 0, cursor: 'pointer',
              background: src ? p.surface : (p.dark ? 'rgba(255,255,255,0.04)' : 'rgba(27,18,64,0.04)'),
              border: `1.5px dashed ${src ? 'transparent' : p.line}`,
              position: 'relative', overflow: 'hidden',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {src ? (
                <>
                  <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
                  <span style={{
                    position: 'absolute', top: 4, right: 4, width: 18, height: 18, borderRadius: 9,
                    background: 'rgba(11,10,24,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Ico name="close" size={10} c="#fff" sw={2.5}/>
                  </span>
                </>
              ) : (
                <Ico name="plus" size={20} c={p.textMuted}/>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Reaction chips */}
      <div style={{ padding: '14px 22px 8px' }}>
        <div style={{ fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', color: p.accent, fontWeight: 600, marginBottom: 10 }}>
          Quick tags
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {REACTIONS.map(r => {
            const sel = reactions.includes(r);
            return (
              <button key={r} onClick={() => {
                setReactions(sel ? reactions.filter(x => x !== r) : [...reactions, r]);
              }} style={{
                padding: '7px 12px', borderRadius: 99, fontSize: 12, fontWeight: 500,
                background: sel ? p.accent : (p.dark ? 'rgba(255,255,255,0.04)' : 'rgba(27,18,64,0.04)'),
                color: sel ? '#fff' : p.text,
                border: `0.5px solid ${sel ? p.accent : p.line}`,
                cursor: 'pointer', fontFamily: 'Geist, system-ui',
                transition: 'all .15s',
              }}>
                {sel && '✓ '}{r}
              </button>
            );
          })}
        </div>
      </div>

      {/* Note */}
      <div style={{ padding: '14px 16px 8px' }}>
        <div style={{ fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', color: p.accent, fontWeight: 600, marginBottom: 10, padding: '0 6px' }}>
          Your note
        </div>
        <div style={{
          padding: '14px 16px', borderRadius: 18, minHeight: 80,
          background: p.surface, border: `0.5px solid ${p.line}`,
          fontSize: 14, lineHeight: 1.45, color: p.text,
        }}>
          Slow, quiet, and the matcha was unreal.
          The owner sat with us for a few minutes.
          Going back if we have time.
        </div>
      </div>

      {/* Share toggle */}
      <div style={{ padding: '10px 22px 0' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '14px 14px', borderRadius: 16,
          background: p.surface, border: `0.5px solid ${p.line}`,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
            background: publicPost ? window.SIRI_GRADIENT_LINEAR : (p.dark ? 'rgba(255,255,255,0.06)' : 'rgba(27,18,64,0.05)'),
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Ico name="share" size={16} c={publicPost ? '#fff' : p.textMuted}/>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: p.text }}>
              {publicPost ? 'Share to Feed' : 'Private note'}
            </div>
            <div style={{ fontSize: 11, color: p.textMuted, marginTop: 2 }}>
              {publicPost ? 'Visible to other travelers in Kyoto' : 'Only you can see this'}
            </div>
          </div>
          <button onClick={() => setPublicPost(!publicPost)} style={{
            width: 44, height: 26, borderRadius: 13, padding: 2,
            background: publicPost ? p.accent : (p.dark ? 'rgba(255,255,255,0.12)' : 'rgba(27,18,64,0.12)'),
            border: 'none', cursor: 'pointer', position: 'relative',
            transition: 'all .15s',
          }}>
            <span style={{
              position: 'absolute', top: 2, left: publicPost ? 20 : 2,
              width: 22, height: 22, borderRadius: 11, background: '#fff',
              transition: 'left .15s',
              boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
            }}/>
          </button>
        </div>
      </div>
    </div>
  );
}

window.ScreenReview = ScreenReview;
