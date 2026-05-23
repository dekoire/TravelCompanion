// screen-share.jsx — "Travel companions" / trip-sharing screen.
//
// Lets the trip owner invite people, see who's joined, what they're seeing
// right now (real-time presence on the synced itinerary), and tune what each
// person can do (view/suggest/edit).
//
// Sections:
//   1. Hero — trip name + presence stack (avatars overlapping)
//   2. Invite — share link card + send to contacts shortcuts
//   3. Members — list with role, last-seen, "Currently on" pin label
//   4. Pending invites — people who haven't accepted yet
//   5. Permissions — who can edit / suggest / just view
//   6. Sync banner — what stays in sync ("Today timeline · Reservations …")

const { useState: useStateSh } = React;

function ScreenShare({ onClose }) {
  const p = window.useTheme();
  const { Ico, AIOrb, Pill } = window;
  const P = window.PHOTOS;

  // Active members of the trip.
  const MEMBERS = [
    {
      id: 'me', name: 'You (Mara)', sub: 'Trip owner',
      avatar: P.user1, role: 'Owner', online: true,
      where: 'Bamboo Grove · Arashiyama', away: false,
    },
    {
      id: 'leo', name: 'Leo Castell', sub: 'leo@castell.io',
      avatar: P.user2, role: 'Editor', online: true,
      where: '% Arabica · ordering matcha', away: false,
    },
    {
      id: 'mei', name: 'Mei Tanaka', sub: 'mei.tanaka@…',
      avatar: P.user3, role: 'Viewer', online: false,
      where: 'Last seen 18m ago at Gion', away: true,
    },
  ];

  const PENDING = [
    { id: 'pa', name: 'Aria Vogel', email: 'aria@vogel.dev', avatar: P.user1, sent: 'Sent 2h ago' },
    { id: 'pb', name: 'Jasper Lin', email: 'jasper.lin@…', avatar: P.user2, sent: 'Sent yesterday' },
  ];

  const [copied, setCopied] = useStateSh(false);

  return (
    <div style={{
      position: 'absolute', inset: 0, background: p.bg, color: p.text,
      fontFamily: 'Geist, system-ui', overflow: 'auto', paddingBottom: 130,
    }}>
      {/* Top chrome */}
      <div style={{
        padding: '56px 16px 14px', display: 'flex', alignItems: 'center', gap: 12,
        background: p.dark
          ? 'linear-gradient(180deg, rgba(7,12,28,0.95), transparent)'
          : 'linear-gradient(180deg, rgba(234,241,255,0.95), transparent)',
      }}>
        <button onClick={onClose} style={{
          width: 36, height: 36, borderRadius: 18,
          background: p.dark ? 'rgba(255,255,255,0.06)' : 'rgba(15,30,80,0.05)',
          border: `0.5px solid ${p.line}`, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Ico name="close" size={16} c={p.text}/>
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, letterSpacing: 1.6, textTransform: 'uppercase', color: p.accent, fontWeight: 700 }}>
            Travel together
          </div>
          <div style={{ fontSize: 16, fontWeight: 600, color: p.text, marginTop: 2 }}>
            Kyoto · 7 days
          </div>
        </div>
        <button style={{
          padding: '0 14px', height: 36, borderRadius: 18,
          background: window.SIRI_GRADIENT_LINEAR, color: '#fff', border: 'none',
          fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'Geist, system-ui',
          display: 'flex', alignItems: 'center', gap: 5,
        }}>
          <Ico name="plus" size={14} c="#fff" sw={2.5}/>
          Invite
        </button>
      </div>

      {/* Hero presence — overlapping avatars + count */}
      <div style={{ padding: '4px 22px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8 }}>
          <div style={{ display: 'flex' }}>
            {MEMBERS.map((m, i) => (
              <div key={m.id} style={{
                width: 48, height: 48, borderRadius: 24,
                marginLeft: i === 0 ? 0 : -14,
                padding: 2, background: m.online ? window.SIRI_GRADIENT : p.surface,
                position: 'relative',
              }}>
                <img src={m.avatar} alt="" style={{
                  width: '100%', height: '100%', borderRadius: 22, objectFit: 'cover',
                  border: `2px solid ${p.bg}`,
                  filter: m.away ? 'grayscale(0.4)' : 'none',
                }}/>
                {m.online && (
                  <span style={{
                    position: 'absolute', bottom: 0, right: 0,
                    width: 12, height: 12, borderRadius: 6,
                    background: p.green, border: `2px solid ${p.bg}`,
                    boxShadow: `0 0 8px ${p.green}`,
                  }}/>
                )}
              </div>
            ))}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 22, fontWeight: 600, color: p.text, lineHeight: 1, letterSpacing: -0.5 }}>
              3 travelers
            </div>
            <div style={{ fontSize: 12, color: p.textMuted, marginTop: 4 }}>
              2 active now · everyone sees the same plan, live
            </div>
          </div>
        </div>

        {/* Live sync ticker */}
        <div style={{
          padding: '10px 14px', borderRadius: 14, marginTop: 10,
          background: p.dark ? 'rgba(95,160,255,0.10)' : 'rgba(46,109,216,0.06)',
          border: `0.5px solid ${p.sky}55`,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{
            width: 8, height: 8, borderRadius: 4, background: p.green,
            boxShadow: `0 0 10px ${p.green}`, flexShrink: 0,
            animation: 'pulse 1.6s ease-in-out infinite',
          }}/>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: p.text }}>
              Leo added "% Arabica" to today
            </div>
            <div style={{ fontSize: 10, color: p.textMuted, marginTop: 1 }}>
              4 seconds ago · synced to all
            </div>
          </div>
        </div>
      </div>

      {/* Share-link card */}
      <div style={{ padding: '6px 16px 16px' }}>
        <div style={{
          padding: '14px 14px', borderRadius: 18,
          background: `linear-gradient(135deg, ${p.accentSoft}, transparent)`,
          border: `0.5px solid ${p.accent}33`,
        }}>
          <div style={{ fontSize: 11, color: p.accent, letterSpacing: 1.2, textTransform: 'uppercase', fontWeight: 600, marginBottom: 8 }}>
            Share link
          </div>
          <div style={{
            padding: '10px 12px', borderRadius: 12,
            background: p.dark ? 'rgba(7,12,28,0.6)' : 'rgba(255,255,255,0.6)',
            border: `0.5px solid ${p.line}`,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <Ico name="globe" size={14} c={p.accent}/>
            <span style={{
              flex: 1, fontSize: 12, color: p.text, fontVariantNumeric: 'tabular-nums',
              textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap',
            }}>
              cmp.link/trip/kyoto-mara-7d
            </span>
            <button onClick={() => { setCopied(true); setTimeout(() => setCopied(false), 1600); }} style={{
              padding: '4px 10px', borderRadius: 8, cursor: 'pointer',
              background: copied ? p.green : p.accent,
              color: '#fff', border: 'none', fontSize: 11, fontWeight: 600,
              fontFamily: 'Geist, system-ui',
            }}>
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          </div>

          <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
            {[
              { i: 'mail', l: 'Email' },
              { i: 'chat', l: 'Message' },
              { i: 'share', l: 'Share' },
              { i: 'plus', l: 'Contacts' },
            ].map((s, i) => (
              <button key={i} style={{
                flex: 1, padding: '10px 8px', borderRadius: 12, cursor: 'pointer',
                background: p.dark ? 'rgba(255,255,255,0.04)' : 'rgba(15,30,80,0.04)',
                border: `0.5px solid ${p.line}`,
                color: p.text, fontSize: 11, fontWeight: 500,
                fontFamily: 'Geist, system-ui',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
              }}>
                <Ico name={s.i} size={16} c={p.accent}/>
                {s.l}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Members list */}
      <div style={{ padding: '0 22px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', color: p.accent, fontWeight: 600 }}>
          Travelers · {MEMBERS.length}
        </div>
        <span style={{ fontSize: 11, color: p.textMuted }}>2 active now</span>
      </div>
      <div style={{ padding: '0 16px 18px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {MEMBERS.map(m => (
          <MemberRow key={m.id} m={m}/>
        ))}
      </div>

      {/* Pending invites */}
      {PENDING.length > 0 && (
        <>
          <div style={{ padding: '0 22px 8px' }}>
            <div style={{ fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', color: p.accent, fontWeight: 600 }}>
              Pending invites · {PENDING.length}
            </div>
          </div>
          <div style={{ padding: '0 16px 18px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {PENDING.map(pe => (
              <div key={pe.id} style={{
                padding: '10px 12px', borderRadius: 14,
                background: p.surface, border: `0.5px dashed ${p.line}`,
                display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <img src={pe.avatar} alt="" style={{
                  width: 40, height: 40, borderRadius: 20, objectFit: 'cover',
                  filter: 'grayscale(0.5) opacity(0.7)', flexShrink: 0,
                }}/>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: p.text, lineHeight: 1.2 }}>
                    {pe.name}
                  </div>
                  <div style={{ fontSize: 11, color: p.textMuted, marginTop: 2 }}>
                    {pe.email} · {pe.sent}
                  </div>
                </div>
                <button style={{
                  padding: '5px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600,
                  background: 'transparent', border: `0.5px solid ${p.line}`,
                  color: p.text, cursor: 'pointer', fontFamily: 'Geist, system-ui',
                }}>Resend</button>
              </div>
            ))}
          </div>
        </>
      )}

      {/* What syncs */}
      <div style={{ padding: '0 16px 18px' }}>
        <div style={{ fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', color: p.accent, fontWeight: 600, padding: '0 6px 8px' }}>
          What's shared
        </div>
        <div style={{
          padding: '12px 14px', borderRadius: 16,
          background: p.surface, border: `0.5px solid ${p.line}`,
        }}>
          {[
            { i: 'clock',   l: 'Daily timeline & schedule', on: true },
            { i: 'pin',     l: 'Locations & saved places', on: true },
            { i: 'sparkle', l: 'AI suggestions & replans', on: true },
            { i: 'check',   l: 'Reservations & bookings', on: true },
            { i: 'heart',   l: 'Reviews & memories', on: false, sub: 'Off · only yours' },
            { i: 'taxi',    l: 'Live location (this trip only)', on: true },
          ].map((r, i, arr) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0',
              borderBottom: i < arr.length - 1 ? `0.5px solid ${p.line}` : 'none',
            }}>
              <span style={{
                width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                background: r.on ? p.accentSoft : (p.dark ? 'rgba(255,255,255,0.04)' : 'rgba(15,30,80,0.04)'),
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Ico name={r.i} size={14} c={r.on ? p.accent : p.textMuted}/>
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: p.text }}>{r.l}</div>
                {r.sub && (
                  <div style={{ fontSize: 11, color: p.textMuted, marginTop: 1 }}>{r.sub}</div>
                )}
              </div>
              {/* Toggle */}
              <span style={{
                width: 38, height: 22, borderRadius: 11, padding: 2,
                background: r.on ? p.accent : (p.dark ? 'rgba(255,255,255,0.12)' : 'rgba(15,30,80,0.12)'),
                position: 'relative', transition: 'all .15s',
              }}>
                <span style={{
                  position: 'absolute', top: 2, left: r.on ? 18 : 2,
                  width: 18, height: 18, borderRadius: 9, background: '#fff',
                  transition: 'left .15s',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                }}/>
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* AI note */}
      <div style={{ padding: '0 16px' }}>
        <div style={{
          padding: '12px 14px', borderRadius: 14,
          background: p.accentSoft, border: `0.5px solid ${p.accent}33`,
          display: 'flex', gap: 10, alignItems: 'flex-start',
        }}>
          <AIOrb size={22}/>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: p.accent, letterSpacing: 1, textTransform: 'uppercase', fontWeight: 700, marginBottom: 3 }}>
              Group mind
            </div>
            <div style={{ fontSize: 12, color: p.text, lineHeight: 1.45 }}>
              I'll merge everyone's vibes when planning — Leo's love of jazz bars + Mei's slow mornings are already in the next replan.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── A single member row ──────────────────────────────────────────────
function MemberRow({ m }) {
  const p = window.useTheme();
  const { Ico } = window;
  const [open, setOpen] = useStateSh(false);

  return (
    <div style={{
      borderRadius: 14, overflow: 'hidden',
      background: p.surface, border: `0.5px solid ${p.line}`,
    }}>
      <button onClick={() => setOpen(!open)} style={{
        width: '100%', padding: '10px 12px', cursor: 'pointer',
        background: 'transparent', border: 'none', textAlign: 'left',
        display: 'flex', alignItems: 'center', gap: 12, fontFamily: 'Geist, system-ui',
      }}>
        <div style={{
          position: 'relative', flexShrink: 0, width: 44, height: 44,
          padding: m.online ? 2 : 0, borderRadius: 22,
          background: m.online ? window.SIRI_GRADIENT : 'transparent',
        }}>
          <img src={m.avatar} alt="" style={{
            width: '100%', height: '100%', borderRadius: 20, objectFit: 'cover',
            border: m.online ? `2px solid ${p.surface}` : 'none',
            filter: m.away ? 'grayscale(0.4)' : 'none',
          }}/>
          {m.online && (
            <span style={{
              position: 'absolute', bottom: 0, right: 0,
              width: 11, height: 11, borderRadius: 6,
              background: p.green, border: `2px solid ${p.surface}`,
              boxShadow: `0 0 8px ${p.green}`,
            }}/>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: p.text, lineHeight: 1.2 }}>{m.name}</span>
            <span style={{
              fontSize: 9, padding: '2px 6px', borderRadius: 4,
              background: m.role === 'Owner' ? p.accentSoft : (p.dark ? 'rgba(255,255,255,0.06)' : 'rgba(15,30,80,0.06)'),
              color: m.role === 'Owner' ? p.accent : p.textMuted,
              letterSpacing: 1.2, textTransform: 'uppercase', fontWeight: 700,
            }}>{m.role}</span>
          </div>
          <div style={{ fontSize: 11, color: p.textMuted, marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Ico name="pin" size={10} c={m.online ? p.accent : p.textDim}/>
            <span style={{
              textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap',
            }}>{m.where}</span>
          </div>
        </div>
        <Ico name="arrow" size={13} c={p.textDim}
          style={{ transform: open ? 'rotate(-90deg)' : 'rotate(90deg)', transition: 'transform .15s' }}/>
      </button>

      {open && (
        <div style={{ padding: '0 12px 12px', borderTop: `0.5px solid ${p.line}` }}>
          <div style={{ display: 'flex', gap: 4, marginTop: 8, flexWrap: 'wrap' }}>
            {['Owner', 'Editor', 'Suggest', 'Viewer'].map(role => {
              const sel = m.role === role;
              return (
                <button key={role} style={{
                  padding: '6px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600,
                  background: sel ? p.accent : 'transparent',
                  color: sel ? '#fff' : p.text,
                  border: `0.5px solid ${sel ? p.accent : p.line}`,
                  cursor: 'pointer', fontFamily: 'Geist, system-ui',
                }}>{role}</button>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
            <button style={{
              flex: 1, height: 32, borderRadius: 16,
              background: 'transparent', border: `0.5px solid ${p.line}`,
              color: p.text, fontSize: 11, fontWeight: 500, cursor: 'pointer',
              fontFamily: 'Geist, system-ui',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
            }}>
              <Ico name="chat" size={12} c={p.accent}/>
              Message
            </button>
            <button style={{
              flex: 1, height: 32, borderRadius: 16,
              background: 'transparent', border: `0.5px solid ${p.line}`,
              color: p.text, fontSize: 11, fontWeight: 500, cursor: 'pointer',
              fontFamily: 'Geist, system-ui',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
            }}>
              <Ico name="pin" size={12} c={p.accent}/>
              See on map
            </button>
            {m.role !== 'Owner' && (
              <button style={{
                height: 32, padding: '0 12px', borderRadius: 16,
                background: 'transparent', border: `0.5px solid ${p.danger}55`,
                color: p.danger, fontSize: 11, fontWeight: 500, cursor: 'pointer',
                fontFamily: 'Geist, system-ui',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              }}>
                <Ico name="close" size={12} c={p.danger}/>
                Remove
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

window.ScreenShare = ScreenShare;
