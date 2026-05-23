import React, { useState } from 'react';
import { View, Text, Pressable, Image, ScrollView, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/ThemeContext';
import { PHOTOS, SIRI_LINEAR_COLORS } from '../theme';
import Ico from '../components/Ico';
import AIOrb from '../components/AIOrb';

interface Member {
  id: string;
  name: string;
  sub: string;
  avatar: string;
  role: 'Owner' | 'Editor' | 'Suggest' | 'Viewer';
  online: boolean;
  where: string;
  away: boolean;
}

interface Pending {
  id: string;
  name: string;
  email: string;
  avatar: string;
  sent: string;
}

interface Props {
  onClose?: () => void;
}

const MEMBERS: Member[] = [
  { id: 'me', name: 'You (Mara)', sub: 'Trip owner', avatar: PHOTOS.user1, role: 'Owner', online: true, where: 'Bamboo Grove · Arashiyama', away: false },
  { id: 'leo', name: 'Leo Castell', sub: 'leo@castell.io', avatar: PHOTOS.user2, role: 'Editor', online: true, where: '% Arabica · ordering matcha', away: false },
  { id: 'mei', name: 'Mei Tanaka', sub: 'mei.tanaka@…', avatar: PHOTOS.user3, role: 'Viewer', online: false, where: 'Last seen 18m ago at Gion', away: true },
];

const PENDING: Pending[] = [
  { id: 'pa', name: 'Aria Vogel', email: 'aria@vogel.dev', avatar: PHOTOS.user1, sent: 'Sent 2h ago' },
  { id: 'pb', name: 'Jasper Lin', email: 'jasper.lin@…', avatar: PHOTOS.user2, sent: 'Sent yesterday' },
];

const WHAT_SYNCS = [
  { icon: 'clock', label: 'Daily timeline & schedule', on: true },
  { icon: 'pin', label: 'Locations & saved places', on: true },
  { icon: 'sparkle', label: 'AI suggestions & replans', on: true },
  { icon: 'check', label: 'Reservations & bookings', on: true },
  { icon: 'heart', label: 'Reviews & memories', on: false, sub: 'Off · only yours' },
  { icon: 'taxi', label: 'Live location (this trip only)', on: true },
];

function MemberRow({ m }: { m: Member }) {
  const { palette: p } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <View style={[styles.memberCard, { backgroundColor: p.surface, borderColor: p.line }]}>
      <Pressable onPress={() => setOpen(!open)} style={styles.memberRow}>
        <View style={[styles.memberAvatarWrap, { padding: m.online ? 2 : 0, backgroundColor: 'transparent' }]}>
          <Image
            source={{ uri: m.avatar }}
            style={[styles.memberAvatar, { opacity: m.away ? 0.7 : 1, borderColor: m.online ? p.surface : 'transparent' }]}
            resizeMode="cover"
          />
          {m.online && (
            <View style={[styles.onlineDot, { backgroundColor: p.green, borderColor: p.surface }]} />
          )}
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={styles.memberNameRow}>
            <Text style={[styles.memberName, { color: p.text }]}>{m.name}</Text>
            <View style={[styles.roleBadge, {
              backgroundColor: m.role === 'Owner' ? p.accentSoft : p.dark ? 'rgba(255,255,255,0.06)' : 'rgba(15,30,80,0.06)',
            }]}>
              <Text style={[styles.roleText, { color: m.role === 'Owner' ? p.accent : p.textMuted }]}>{m.role}</Text>
            </View>
          </View>
          <View style={styles.memberWhereRow}>
            <Ico name="pin" size={10} c={m.online ? p.accent : p.textDim} />
            <Text style={[styles.memberWhere, { color: p.textMuted }]} numberOfLines={1}>{m.where}</Text>
          </View>
        </View>
        <Ico name="arrow" size={13} c={p.textDim} />
      </Pressable>

      {open && (
        <View style={[styles.memberDetail, { borderTopColor: p.line }]}>
          <View style={styles.roleChips}>
            {(['Owner', 'Editor', 'Suggest', 'Viewer'] as const).map(role => {
              const s = m.role === role;
              return (
                <Pressable key={role} style={[styles.roleChip, { backgroundColor: s ? p.accent : 'transparent', borderColor: s ? p.accent : p.line }]}>
                  <Text style={[styles.roleChipText, { color: s ? '#fff' : p.text }]}>{role}</Text>
                </Pressable>
              );
            })}
          </View>
          <View style={styles.memberActions}>
            <Pressable style={[styles.memberActionBtn, { borderColor: p.line }]}>
              <Ico name="chat" size={12} c={p.accent} />
              <Text style={[styles.memberActionText, { color: p.text }]}>Message</Text>
            </Pressable>
            <Pressable style={[styles.memberActionBtn, { borderColor: p.line }]}>
              <Ico name="pin" size={12} c={p.accent} />
              <Text style={[styles.memberActionText, { color: p.text }]}>See on map</Text>
            </Pressable>
            {m.role !== 'Owner' && (
              <Pressable style={[styles.memberActionBtn, { borderColor: p.danger + '55' }]}>
                <Ico name="close" size={12} c={p.danger} />
                <Text style={[styles.memberActionText, { color: p.danger }]}>Remove</Text>
              </Pressable>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

export default function ScreenShare({ onClose }: Props) {
  const { palette: p } = useTheme();
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <View style={[styles.container, { backgroundColor: p.bg }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 130 }} showsVerticalScrollIndicator={false}>
        {/* Top chrome */}
        <View style={[styles.topChrome, { backgroundColor: p.dark ? 'rgba(7,12,28,0.95)' : 'rgba(234,241,255,0.95)' }]}>
          <Pressable onPress={onClose} style={[styles.closeBtn, { backgroundColor: p.dark ? 'rgba(255,255,255,0.06)' : 'rgba(15,30,80,0.05)', borderColor: p.line }]}>
            <Ico name="close" size={16} c={p.text} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={[styles.kicker, { color: p.accent }]}>Travel together</Text>
            <Text style={[styles.headerTitle, { color: p.text }]}>Kyoto · 7 days</Text>
          </View>
          <Pressable>
            <LinearGradient colors={[...SIRI_LINEAR_COLORS]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.inviteBtn}>
              <Ico name="plus" size={14} c="#fff" sw={2.5} />
              <Text style={styles.inviteBtnText}>Invite</Text>
            </LinearGradient>
          </Pressable>
        </View>

        {/* Presence */}
        <View style={styles.presenceWrap}>
          <View style={styles.presenceRow}>
            <View style={styles.avatarStack}>
              {MEMBERS.map((m, i) => (
                <View key={m.id} style={[styles.presenceAvatarWrap, { marginLeft: i === 0 ? 0 : -14 }]}>
                  <Image source={{ uri: m.avatar }} style={[styles.presenceAvatar, { borderColor: p.bg, opacity: m.away ? 0.7 : 1 }]} resizeMode="cover" />
                  {m.online && <View style={[styles.presenceDot, { backgroundColor: p.green, borderColor: p.bg }]} />}
                </View>
              ))}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.travelerCount, { color: p.text }]}>3 travelers</Text>
              <Text style={[styles.travelerSub, { color: p.textMuted }]}>2 active now · everyone sees the same plan, live</Text>
            </View>
          </View>

          <View style={[styles.syncTicker, { backgroundColor: p.dark ? 'rgba(95,160,255,0.10)' : 'rgba(46,109,216,0.06)', borderColor: p.sky + '55' }]}>
            <View style={[styles.syncDot, { backgroundColor: p.green }]} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.syncTitle, { color: p.text }]}>Leo added "% Arabica" to today</Text>
              <Text style={[styles.syncSub, { color: p.textMuted }]}>4 seconds ago · synced to all</Text>
            </View>
          </View>
        </View>

        {/* Share link */}
        <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
          <View style={[styles.shareLinkCard, { backgroundColor: p.accentSoft, borderColor: p.accent + '33' }]}>
            <Text style={[styles.shareLinkLabel, { color: p.accent }]}>Share link</Text>
            <View style={[styles.linkRow, { backgroundColor: p.dark ? 'rgba(7,12,28,0.6)' : 'rgba(255,255,255,0.6)', borderColor: p.line }]}>
              <Ico name="globe" size={14} c={p.accent} />
              <Text style={[styles.linkUrl, { color: p.text }]} numberOfLines={1}>cmp.link/trip/kyoto-mara-7d</Text>
              <Pressable onPress={handleCopy} style={[styles.copyBtn, { backgroundColor: copied ? p.green : p.accent }]}>
                <Text style={styles.copyBtnText}>{copied ? '✓ Copied' : 'Copy'}</Text>
              </Pressable>
            </View>
            <View style={styles.shareActions}>
              {[{ icon: 'mail', label: 'Email' }, { icon: 'chat', label: 'Message' }, { icon: 'share', label: 'Share' }, { icon: 'plus', label: 'Contacts' }].map((s, i) => (
                <Pressable key={i} style={[styles.shareActionBtn, { backgroundColor: p.dark ? 'rgba(255,255,255,0.04)' : 'rgba(15,30,80,0.04)', borderColor: p.line }]}>
                  <Ico name={s.icon as any} size={16} c={p.accent} />
                  <Text style={[styles.shareActionText, { color: p.text }]}>{s.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        {/* Members */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionLabel, { color: p.accent }]}>Travelers · {MEMBERS.length}</Text>
          <Text style={[styles.sectionSub, { color: p.textMuted }]}>2 active now</Text>
        </View>
        <View style={{ paddingHorizontal: 16, paddingBottom: 18, gap: 6 }}>
          {MEMBERS.map(m => <MemberRow key={m.id} m={m} />)}
        </View>

        {/* Pending */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionLabel, { color: p.accent }]}>Pending invites · {PENDING.length}</Text>
        </View>
        <View style={{ paddingHorizontal: 16, paddingBottom: 18, gap: 6 }}>
          {PENDING.map(pe => (
            <View key={pe.id} style={[styles.pendingRow, { backgroundColor: p.surface, borderColor: p.line }]}>
              <Image source={{ uri: pe.avatar }} style={styles.pendingAvatar} resizeMode="cover" />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[styles.pendingName, { color: p.text }]}>{pe.name}</Text>
                <Text style={[styles.pendingEmail, { color: p.textMuted }]}>{pe.email} · {pe.sent}</Text>
              </View>
              <Pressable style={[styles.resendBtn, { borderColor: p.line }]}>
                <Text style={[styles.resendText, { color: p.text }]}>Resend</Text>
              </Pressable>
            </View>
          ))}
        </View>

        {/* What syncs */}
        <View style={{ paddingHorizontal: 22, paddingBottom: 18 }}>
          <Text style={[styles.sectionLabel, { color: p.accent, marginBottom: 8, paddingHorizontal: 6 }]}>What's shared</Text>
          <View style={[styles.syncList, { backgroundColor: p.surface, borderColor: p.line }]}>
            {WHAT_SYNCS.map((r, i) => (
              <View key={i} style={[styles.syncRow, { borderBottomColor: p.line, borderBottomWidth: i < WHAT_SYNCS.length - 1 ? 0.5 : 0 }]}>
                <View style={[styles.syncIcon, { backgroundColor: r.on ? p.accentSoft : p.dark ? 'rgba(255,255,255,0.04)' : 'rgba(15,30,80,0.04)' }]}>
                  <Ico name={r.icon as any} size={14} c={r.on ? p.accent : p.textMuted} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.syncItemLabel, { color: p.text }]}>{r.label}</Text>
                  {r.sub && <Text style={[styles.syncItemSub, { color: p.textMuted }]}>{r.sub}</Text>}
                </View>
                <View style={[styles.toggleSmall, { backgroundColor: r.on ? p.accent : p.dark ? 'rgba(255,255,255,0.12)' : 'rgba(15,30,80,0.12)' }]}>
                  <View style={[styles.toggleSmallThumb, { left: r.on ? 18 : 2 }]} />
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* AI note */}
        <View style={{ paddingHorizontal: 16 }}>
          <View style={[styles.aiNote, { backgroundColor: p.accentSoft, borderColor: p.accent + '33' }]}>
            <AIOrb size={22} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.aiNoteLabel, { color: p.accent }]}>Group mind</Text>
              <Text style={[styles.aiNoteText, { color: p.text }]}>
                I'll merge everyone's vibes when planning — Leo's love of jazz bars + Mei's slow mornings are already in the next replan.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topChrome: { paddingTop: 56, paddingHorizontal: 16, paddingBottom: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 0.5, alignItems: 'center', justifyContent: 'center' },
  kicker: { fontSize: 11, letterSpacing: 1.6, textTransform: 'uppercase', fontWeight: '700' },
  headerTitle: { fontSize: 16, fontWeight: '600', marginTop: 2 },
  inviteBtn: { paddingHorizontal: 14, height: 36, borderRadius: 18, flexDirection: 'row', alignItems: 'center', gap: 5 },
  inviteBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  presenceWrap: { paddingHorizontal: 22, paddingBottom: 14 },
  presenceRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 8 },
  avatarStack: { flexDirection: 'row' },
  presenceAvatarWrap: { width: 48, height: 48, borderRadius: 24, position: 'relative' },
  presenceAvatar: { width: 48, height: 48, borderRadius: 24, borderWidth: 2 },
  presenceDot: { position: 'absolute', bottom: 0, right: 0, width: 12, height: 12, borderRadius: 6, borderWidth: 2 },
  travelerCount: { fontSize: 22, fontWeight: '600', lineHeight: 24, letterSpacing: -0.5 },
  travelerSub: { fontSize: 12, marginTop: 4 },
  syncTicker: { padding: 10, paddingHorizontal: 14, borderRadius: 14, marginTop: 10, borderWidth: 0.5, flexDirection: 'row', alignItems: 'center', gap: 10 },
  syncDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  syncTitle: { fontSize: 12, fontWeight: '600' },
  syncSub: { fontSize: 10, marginTop: 1 },
  shareLinkCard: { padding: 14, borderRadius: 18, borderWidth: 0.5 },
  shareLinkLabel: { fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', fontWeight: '600', marginBottom: 8 },
  linkRow: { padding: 10, paddingHorizontal: 12, borderRadius: 12, borderWidth: 0.5, flexDirection: 'row', alignItems: 'center', gap: 8 },
  linkUrl: { flex: 1, fontSize: 12 },
  copyBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  copyBtnText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  shareActions: { flexDirection: 'row', gap: 6, marginTop: 10 },
  shareActionBtn: { flex: 1, padding: 10, paddingHorizontal: 8, borderRadius: 12, borderWidth: 0.5, flexDirection: 'column', alignItems: 'center', gap: 5 },
  shareActionText: { fontSize: 11, fontWeight: '500' },
  sectionHeader: { paddingHorizontal: 22, paddingBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionLabel: { fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', fontWeight: '600' },
  sectionSub: { fontSize: 11 },
  memberCard: { borderRadius: 14, overflow: 'hidden', borderWidth: 0.5 },
  memberRow: { padding: 10, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  memberAvatarWrap: { width: 44, height: 44, borderRadius: 22, position: 'relative', flexShrink: 0 },
  memberAvatar: { width: 44, height: 44, borderRadius: 22, borderWidth: 2 },
  onlineDot: { position: 'absolute', bottom: 0, right: 0, width: 11, height: 11, borderRadius: 6, borderWidth: 2 },
  memberNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  memberName: { fontSize: 14, fontWeight: '600', lineHeight: 17 },
  roleBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  roleText: { fontSize: 9, letterSpacing: 1.2, textTransform: 'uppercase', fontWeight: '700' },
  memberWhereRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  memberWhere: { fontSize: 11, flex: 1 },
  memberDetail: { padding: 12, borderTopWidth: 0.5 },
  roleChips: { flexDirection: 'row', gap: 4, flexWrap: 'wrap', marginTop: 8 },
  roleChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 99, borderWidth: 0.5 },
  roleChipText: { fontSize: 11, fontWeight: '600' },
  memberActions: { flexDirection: 'row', gap: 6, marginTop: 10 },
  memberActionBtn: { flex: 1, height: 32, borderRadius: 16, borderWidth: 0.5, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  memberActionText: { fontSize: 11, fontWeight: '500' },
  pendingRow: { padding: 10, paddingHorizontal: 12, borderRadius: 14, borderStyle: 'dashed', borderWidth: 0.5, flexDirection: 'row', alignItems: 'center', gap: 12 },
  pendingAvatar: { width: 40, height: 40, borderRadius: 20, opacity: 0.7, flexShrink: 0 },
  pendingName: { fontSize: 14, fontWeight: '500', lineHeight: 17 },
  pendingEmail: { fontSize: 11, marginTop: 2 },
  resendBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 99, borderWidth: 0.5 },
  resendText: { fontSize: 11, fontWeight: '600' },
  syncList: { padding: 12, paddingHorizontal: 16, borderRadius: 16, borderWidth: 0.5 },
  syncRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  syncIcon: { width: 28, height: 28, borderRadius: 8, flexShrink: 0, alignItems: 'center', justifyContent: 'center' },
  syncItemLabel: { fontSize: 13, fontWeight: '500' },
  syncItemSub: { fontSize: 11, marginTop: 1 },
  toggleSmall: { width: 38, height: 22, borderRadius: 11, padding: 2 },
  toggleSmallThumb: { position: 'absolute', top: 2, width: 18, height: 18, borderRadius: 9, backgroundColor: '#fff' },
  aiNote: { padding: 12, paddingHorizontal: 14, borderRadius: 14, borderWidth: 0.5, flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  aiNoteLabel: { fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', fontWeight: '700', marginBottom: 3 },
  aiNoteText: { fontSize: 12, lineHeight: 18 },
});
