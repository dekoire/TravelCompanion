// screen-feed.jsx — Social feed of fellow travelers.
//
// Top: kicker + "Share your moment" composer prompt linking to Review.
// Stories rail: traveler avatars at the top (gradient ring).
// Feed: photo-led posts with author, location, caption, like / comment /
// save / map-it counts. Mix of post sizes and a saved-place card variant.

const { useState: useStateF } = React;

function ScreenFeed({ onCompose, onOpenLocation, onOpenChat }) {
  const p = window.useTheme();
  const { Ico, AIOrb, Pill } = window;
  const P = window.PHOTOS;

  // Sample social posts. Liked state is in-component so taps light the heart.
  const POSTS = [
    {
      id: 1, author: 'Sofia Andrade', handle: '@sofiaandrade', avatar: P.user1,
      where: 'Yoshimura · Arashiyama', dist: '40 m from you',
      photos: [P.ramen, P.matcha],
      caption: 'Found the udon place the algorithm kept hinting at. The broth is criminal. Bring cash, no English menu — point at the table next to yours and trust the AI.',
      time: '2h', likes: 412, comments: 23, saves: 188, kind: 'big',
      tags: ['Hidden gem', 'Lunch', 'Cash only'],
    },
    {
      id: 2, author: 'Theo Park', handle: '@theopk', avatar: P.user2,
      where: 'Philosopher\'s Path · Higashiyama', dist: '1.2 km',
      photos: [P.philosopher],
      caption: 'Went at 7am. Walked alone for an hour. Spotted three herons. 10/10 way to start a day.',
      time: '5h', likes: 1290, comments: 84, saves: 612, kind: 'big',
      tags: ['Morning', 'Walk'],
    },
    {
      id: 3, kind: 'savedPlace',
      author: 'Companion', handle: 'AI suggestion based on 3 saves',
      where: 'Hosen-in · moss garden', dist: '4.1 km',
      photos: [P.garden],
      caption: '3 people you follow have saved this in the last 24h. 12 visitors right now.',
    },
    {
      id: 4, author: 'Yui Mori', handle: '@yui.mori', avatar: P.user3,
      where: 'Pontocho Alley · Gion', dist: '3.5 km',
      photos: [P.gion, P.sushi, P.street],
      caption: 'Lantern season is the best season. Sake bar second from the left, the older couple running it will pour you something off-menu if you stay past 10.',
      time: '1d', likes: 2310, comments: 156, saves: 1024, kind: 'big',
      tags: ['Night', 'Sake', 'Romantic'],
    },
  ];

  return (
    <div style={{
      position: 'absolute', inset: 0, background: p.bg, color: p.text,
      fontFamily: 'Geist, system-ui', overflow: 'auto', paddingBottom: 110,
    }}>
      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 5,
        paddingTop: 56, paddingBottom: 8,
        background: p.dark
          ? 'linear-gradient(180deg, rgba(11,10,24,0.95) 70%, transparent)'
          : 'linear-gradient(180deg, rgba(242,238,255,0.95) 70%, transparent)',
        backdropFilter: 'blur(16px)',
      }}>
        <div style={{ padding: '0 22px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: 1.8, textTransform: 'uppercase', color: p.accent, fontWeight: 700 }}>
              From travelers in Kyoto
            </div>
            <div style={{ fontSize: 28, lineHeight: 1, letterSpacing: -0.8, marginTop: 4, fontWeight: 600 }}>
              Feed
            </div>
          </div>
          <button onClick={onOpenChat} style={{
            width: 40, height: 40, borderRadius: 20,
            background: p.dark ? 'rgba(255,255,255,0.08)' : 'rgba(27,18,64,0.05)',
            border: `0.5px solid ${p.line}`, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <AIOrb size={22}/>
          </button>
        </div>

        {/* Filter tabs */}
        <div style={{ padding: '14px 22px 0', display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none' }}>
          {[
            { l: 'For you', sel: true },
            { l: 'Following' },
            { l: 'Nearby · 320m' },
            { l: 'Food' },
            { l: 'Hidden gems' },
          ].map((t, i) => (
            <button key={i} style={{
              flexShrink: 0, padding: '6px 12px', borderRadius: 99, fontSize: 12, fontWeight: 600,
              background: t.sel ? p.accent : (p.dark ? 'rgba(255,255,255,0.04)' : 'rgba(27,18,64,0.04)'),
              color: t.sel ? '#fff' : p.text,
              border: `0.5px solid ${t.sel ? p.accent : p.line}`,
              cursor: 'pointer', fontFamily: 'Geist, system-ui',
            }}>{t.l}</button>
          ))}
        </div>
      </div>

      {/* Stories rail — friends + travelers nearby (no composer; feed is content) */}
      <div style={{ padding: '14px 0 8px' }}>
        <div style={{ display: 'flex', gap: 12, padding: '0 22px', overflowX: 'auto', scrollbarWidth: 'none' }}>
          {[
            { src: P.user1, name: 'You',  unread: false },
            { src: P.user2, name: 'Theo', unread: true },
            { src: P.user3, name: 'Yui',  unread: true },
            { src: P.fushimi, name: 'Aki', unread: true },
            { src: P.gion, name: 'Ren', unread: false },
            { src: P.bambooGrove, name: 'Lin', unread: false },
            { src: P.matcha, name: 'Sora', unread: false },
          ].map((s, i) => (
            <button key={i} style={{
              flexShrink: 0, width: 64, padding: 0, background: 'transparent', border: 'none', cursor: 'pointer',
              fontFamily: 'Geist, system-ui',
            }}>
              <div style={{
                width: 64, height: 64, borderRadius: 32, overflow: 'hidden',
                background: p.dark ? 'rgba(255,255,255,0.06)' : 'rgba(27,18,64,0.06)',
              }}>
                <img src={s.src} alt="" style={{
                  width: '100%', height: '100%', borderRadius: 32, objectFit: 'cover',
                }}/>
              </div>
              <div style={{ fontSize: 10, color: p.textMuted, fontWeight: 500, textAlign: 'center', marginTop: 6,
                textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                {s.name}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Posts */}
      <div style={{ padding: '6px 0', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {POSTS.map(post => <PostCard key={post.id} post={post} onOpenLocation={onOpenLocation}/>)}
      </div>
    </div>
  );
}

// ─── Individual post card ────────────────────────────────────────────
function PostCard({ post, onOpenLocation }) {
  const p = window.useTheme();
  const { Ico, AIOrb } = window;
  const [liked, setLiked] = useStateF(false);
  const [saved, setSaved] = useStateF(false);

  const isAI = post.kind === 'savedPlace';

  return (
    <article style={{
      margin: '0 16px', borderRadius: 22, overflow: 'hidden',
      background: isAI
        ? `linear-gradient(135deg, ${p.accentSoft} 0%, ${p.dark ? 'rgba(11,10,24,0.4)' : 'rgba(242,238,255,0.4)'} 100%)`
        : p.surface,
      border: `0.5px solid ${isAI ? p.accent + '33' : p.line}`,
    }}>
      {/* Author row */}
      <div style={{ padding: '12px 14px 8px', display: 'flex', alignItems: 'center', gap: 10 }}>
        {isAI ? (
          <AIOrb size={36} halo/>
        ) : (
          <div style={{ width: 36, height: 36, borderRadius: 18, padding: 1.5, background: window.SIRI_GRADIENT, flexShrink: 0 }}>
            <img src={post.avatar} alt="" style={{
              width: '100%', height: '100%', borderRadius: 16, objectFit: 'cover',
              border: `2px solid ${p.surface}`,
            }}/>
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: p.text }}>
            {post.author}
            {!isAI && <span style={{ fontSize: 11, color: p.textMuted, fontWeight: 400 }}>· {post.time}</span>}
          </div>
          <div style={{ fontSize: 11, color: p.textMuted, marginTop: 1, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Ico name="pin" size={11} c={p.accent}/>
            <span>{post.where} · {post.dist}</span>
          </div>
        </div>
        {!isAI && (
          <button style={{
            padding: '4px 12px', height: 28, borderRadius: 14,
            background: 'transparent', border: `0.5px solid ${p.line}`,
            color: p.text, fontSize: 11, fontWeight: 600, cursor: 'pointer',
            fontFamily: 'Geist, system-ui',
          }}>Follow</button>
        )}
      </div>

      {/* Photo strip */}
      <div style={{ position: 'relative' }}>
        {post.photos.length === 1 ? (
          <img src={post.photos[0]} alt="" style={{
            width: '100%', height: 320, objectFit: 'cover', display: 'block',
          }}/>
        ) : (
          <div style={{ display: 'flex', gap: 2, overflowX: 'auto', scrollSnapType: 'x mandatory', scrollbarWidth: 'none' }}>
            {post.photos.map((src, i) => (
              <img key={i} src={src} alt="" style={{
                width: '100%', flexShrink: 0, height: 320, objectFit: 'cover',
                scrollSnapAlign: 'center', display: 'block',
              }}/>
            ))}
          </div>
        )}
        {post.photos.length > 1 && (
          <div style={{
            position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)',
            display: 'flex', gap: 4,
          }}>
            {post.photos.map((_, i) => (
              <span key={i} style={{
                width: 5, height: 5, borderRadius: 3,
                background: i === 0 ? '#fff' : 'rgba(255,255,255,0.4)',
              }}/>
            ))}
          </div>
        )}
        {!isAI && (
          <div style={{
            position: 'absolute', top: 12, right: 12, padding: '4px 8px',
            borderRadius: 6, background: 'rgba(11,10,24,0.55)', backdropFilter: 'blur(10px)',
            fontSize: 10, color: '#fff', fontFamily: 'Geist, system-ui', fontVariantNumeric: 'tabular-nums',
          }}>1 / {post.photos.length}</div>
        )}
      </div>

      {/* Actions */}
      <div style={{ padding: '10px 14px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
        <button onClick={() => setLiked(!liked)} style={{
          padding: '6px 10px', height: 32, borderRadius: 16, cursor: 'pointer',
          background: liked ? 'rgba(255,119,200,0.16)' : (p.dark ? 'rgba(255,255,255,0.04)' : 'rgba(27,18,64,0.04)'),
          border: `0.5px solid ${liked ? p.pink + '55' : p.line}`,
          color: liked ? p.pink : p.text, fontSize: 12, fontWeight: 600,
          fontFamily: 'Geist, system-ui',
          display: 'flex', alignItems: 'center', gap: 5,
        }}>
          <Ico name="heart" size={14} c={liked ? p.pink : p.text}/>
          {(post.likes || 0) + (liked ? 1 : 0)}
        </button>
        <button style={{
          padding: '6px 10px', height: 32, borderRadius: 16, cursor: 'pointer',
          background: p.dark ? 'rgba(255,255,255,0.04)' : 'rgba(27,18,64,0.04)',
          border: `0.5px solid ${p.line}`, color: p.text,
          fontSize: 12, fontWeight: 600, fontFamily: 'Geist, system-ui',
          display: 'flex', alignItems: 'center', gap: 5,
        }}>
          <Ico name="chat" size={14} c={p.text}/>
          {post.comments || 0}
        </button>
        <div style={{ flex: 1 }}/>
        {!isAI && (
          <button onClick={() => onOpenLocation && onOpenLocation()} style={{
            padding: '6px 12px', height: 32, borderRadius: 16, cursor: 'pointer',
            background: p.dark ? 'rgba(255,255,255,0.04)' : 'rgba(27,18,64,0.04)',
            border: `0.5px solid ${p.line}`, color: p.text,
            fontSize: 11, fontWeight: 600, fontFamily: 'Geist, system-ui',
            display: 'flex', alignItems: 'center', gap: 5,
          }}>
            <Ico name="pin" size={12} c={p.accent}/>
            Map
          </button>
        )}
        <button onClick={() => setSaved(!saved)} style={{
          width: 32, height: 32, borderRadius: 16, cursor: 'pointer',
          background: saved ? p.accentSoft : (p.dark ? 'rgba(255,255,255,0.04)' : 'rgba(27,18,64,0.04)'),
          border: `0.5px solid ${saved ? p.accent : p.line}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Ico name="plus" size={14} c={saved ? p.accent : p.text}/>
        </button>
      </div>

      {/* Caption + tags */}
      <div style={{ padding: '10px 14px 0' }}>
        <div style={{ fontSize: 13.5, lineHeight: 1.5, color: p.text }}>
          <span style={{ fontWeight: 600 }}>{post.handle}</span>{' '}{post.caption}
        </div>
        {post.tags && (
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 8 }}>
            {post.tags.map((t, i) => (
              <span key={i} style={{
                fontSize: 10, padding: '3px 7px', borderRadius: 99,
                background: p.dark ? 'rgba(255,255,255,0.04)' : 'rgba(27,18,64,0.04)',
                color: p.accent, fontWeight: 500,
                border: `0.5px solid ${p.line}`,
              }}>#{t}</span>
            ))}
          </div>
        )}
      </div>

      {/* Comments preview */}
      {!isAI && post.comments > 0 && (
        <div style={{ padding: '10px 14px 0' }}>
          <button style={{
            background: 'none', border: 'none', padding: 0, cursor: 'pointer',
            fontSize: 12, color: p.textMuted, fontWeight: 500, fontFamily: 'Geist, system-ui',
          }}>
            View all {post.comments} comments
          </button>
          {post.id === 1 && (
            <div style={{ marginTop: 6, fontSize: 12.5, lineHeight: 1.5 }}>
              <span style={{ fontWeight: 600, color: p.text }}>@theopk</span>{' '}
              <span style={{ color: p.text }}>the matcha pour-over they do is unreal too</span>
            </div>
          )}
        </div>
      )}

      {/* Comment composer */}
      <div style={{
        margin: '12px 14px 14px', padding: '8px 12px',
        borderRadius: 18, background: p.dark ? 'rgba(255,255,255,0.04)' : 'rgba(27,18,64,0.04)',
        border: `0.5px solid ${p.line}`, display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <img src={window.PHOTOS.user1} alt="" style={{ width: 22, height: 22, borderRadius: 11, objectFit: 'cover', flexShrink: 0 }}/>
        <span style={{ flex: 1, fontSize: 12, color: p.textMuted }}>Add a comment…</span>
        <span style={{ fontSize: 14, opacity: 0.5 }}>😍</span>
        <span style={{ fontSize: 14, opacity: 0.5 }}>🌿</span>
        <span style={{ fontSize: 14, opacity: 0.5 }}>📍</span>
      </div>

      {isAI && (
        <div style={{ padding: '0 14px 14px' }}>
          <button onClick={() => onOpenLocation && onOpenLocation()} style={{
            width: '100%', height: 40, borderRadius: 20,
            background: window.SIRI_GRADIENT_LINEAR, color: '#fff', border: 'none',
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
            fontFamily: 'Geist, system-ui',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
            <Ico name="sparkle" size={14} c="#fff"/>
            Add to today's trip
          </button>
        </div>
      )}
    </article>
  );
}

window.ScreenFeed = ScreenFeed;
