import React from 'react';
import { View, Text, ScrollView, Pressable, Image, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/ThemeContext';
import { PHOTOS, SIRI_LINEAR_COLORS } from '../theme';
import Ico from '../components/Ico';
import AIOrb from '../components/AIOrb';
import Pill from '../components/Pill';

interface Props {
  onBack?: () => void;
  onOpenPricing?: () => void;
  onShowOnboarding?: () => void;
  onSignOut?: () => void;
}

const SAVED_TRIPS = [
  { src: PHOTOS.fushimi, t: 'Kyoto', s: 'Active · Day 3' },
  { src: PHOTOS.philosopher, t: 'Lisbon', s: 'Last May' },
  { src: PHOTOS.gion, t: 'Oaxaca', s: '2023 · 5 days' },
  { src: PHOTOS.garden, t: 'Reykjavik', s: '2022 · 6 days' },
];

const SETTINGS_SECTIONS = [
  { hdr: 'Companion', rows: [
    { i: 'sparkle', l: 'AI preferences', v: 'Balanced · curious' },
    { i: 'compass', l: 'Travel style', v: 'Slow · romantic' },
    { i: 'walk', l: 'Mobility', v: 'Comfortable walker' },
  ]},
  { hdr: 'Account', rows: [
    { i: 'user', l: 'Personal info' },
    { i: 'mail', l: 'Notifications', v: 'On · quiet hours 10p–7a' },
    { i: 'settings', l: 'Privacy & data' },
    { i: 'sparkle', l: 'Replay onboarding', v: 'Demo', isOnboarding: true },
  ]},
];

const USAGE = [
  { l: 'AI requests today', v: 12, max: 50 },
  { l: 'Reservations made', v: 4, max: 10 },
  { l: 'Routes optimized', v: 7, max: 25 },
];

export default function ScreenProfile({ onOpenPricing, onShowOnboarding, onSignOut }: Props) {
  const { palette: p } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: p.bg }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        <SafeAreaView edges={['top']}>
          {/* Header */}
          <View style={{ paddingHorizontal: 22, paddingTop: 8, paddingBottom: 14 }}>
            <Text style={[styles.kicker, { color: p.accent }]}>Account</Text>
            <Text style={[styles.greeting, { color: p.text }]}>Hi, <Text style={{ fontStyle: 'italic' }}>Mara</Text>.</Text>
          </View>
        </SafeAreaView>

        {/* Avatar + identity */}
        <View style={[styles.identityCard, { backgroundColor: p.surface, borderColor: 'rgba(255,255,255,0.06)', marginHorizontal: 16 }]}>
          <View style={{ position: 'relative' }}>
            <Image source={{ uri: PHOTOS.user1 }} style={styles.avatarImg} />
            <View style={[styles.sparkleBadge, { backgroundColor: p.accent, borderColor: p.surface }]}>
              <Ico name="sparkle" size={10} c="#fff" sw={2.5} />
            </View>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.userName, { color: p.text }]}>Mara Cavalcanti</Text>
            <Text style={[styles.userEmail, { color: p.textMuted }]}>mara@kindle.studio</Text>
            <View style={{ flexDirection: 'row', gap: 5, marginTop: 6 }}>
              <Pill tone="accent" size="xs" icon="flame">8 trips</Pill>
              <Pill tone="glass" size="xs">Companion since '24</Pill>
            </View>
          </View>
        </View>

        {/* Trip pass / usage */}
        <View style={{ paddingHorizontal: 16, paddingTop: 18, paddingBottom: 18 }}>
          <View style={[styles.passCard, { borderColor: 'rgba(95,160,255,0.22)' }]}>
            <LinearGradient colors={['#2B1F1A', '#1A1A26']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
            <View style={styles.passGlow} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <View>
                <Text style={[styles.passLabel, { color: p.accent }]}>Trip Pass · 7-day · active</Text>
                <Text style={[styles.passDays, { color: '#fff' }]}>4 days remaining</Text>
                <Text style={[styles.passDates, { color: p.textMuted }]}>Apr 7 – Apr 10 · Kyoto</Text>
              </View>
              <AIOrb size={28} />
            </View>

            {USAGE.map((u, i) => (
              <View key={i} style={{ marginTop: 8 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={[styles.usageLabel, { color: p.textMuted }]}>{u.l}</Text>
                  <Text style={[styles.usageValue, { color: p.text }]}>{u.v} <Text style={{ color: p.textDim }}>/ {u.max}</Text></Text>
                </View>
                <View style={styles.usageBar}>
                  <LinearGradient colors={[p.accent, p.sky]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.usageFill, { width: `${(u.v / u.max) * 100}%` as any }]} />
                </View>
              </View>
            ))}

            <Pressable onPress={onOpenPricing}>
              <LinearGradient colors={[...SIRI_LINEAR_COLORS]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.seeAllPlansBtn}>
                <Ico name="sparkle" size={14} c="#fff" />
                <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>See all plans</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </View>

        {/* Saved trips */}
        <View style={{ paddingBottom: 18 }}>
          <View style={{ paddingHorizontal: 22, paddingBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={[styles.sectionLabel, { color: p.accent }]}>Saved trips</Text>
            <Text style={[styles.seeAll, { color: p.textMuted }]}>See all 8</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 22, gap: 10 }}>
            {SAVED_TRIPS.map((t, i) => (
              <View key={i} style={[styles.savedCard, { backgroundColor: p.surface, borderColor: 'rgba(255,255,255,0.06)' }]}>
                <Image source={{ uri: t.src }} style={{ width: '100%', height: 80 }} resizeMode="cover" />
                <View style={{ padding: 8, paddingHorizontal: 10 }}>
                  <Text style={[styles.savedName, { color: p.text }]}>{t.t}</Text>
                  <Text style={[styles.savedMeta, { color: p.textMuted }]}>{t.s}</Text>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Settings */}
        {SETTINGS_SECTIONS.map((s, si) => (
          <View key={si} style={{ paddingBottom: 18 }}>
            <Text style={[styles.sectionLabel, { color: p.accent, paddingHorizontal: 22, paddingBottom: 8 }]}>{s.hdr}</Text>
            <View style={[styles.settingsGroup, { backgroundColor: p.surface, borderColor: 'rgba(255,255,255,0.06)', marginHorizontal: 16 }]}>
              {s.rows.map((r, ri) => (
                <Pressable key={ri} onPress={r.isOnboarding ? onShowOnboarding : undefined} style={[styles.settingsRow, { borderBottomWidth: ri < s.rows.length - 1 ? 0.5 : 0, borderBottomColor: 'rgba(255,255,255,0.05)' }]}>
                  <View style={[styles.settingsIcon, { backgroundColor: 'rgba(95,160,255,0.12)' }]}>
                    <Ico name={r.i} size={14} c={p.accent} />
                  </View>
                  <Text style={[styles.settingsLabel, { color: p.text }]}>{r.l}</Text>
                  {r.v && <Text style={[styles.settingsValue, { color: p.textMuted }]}>{r.v}</Text>}
                  <Ico name="arrow" size={13} c={p.textDim} />
                </Pressable>
              ))}
            </View>
          </View>
        ))}

        {/* Sign out */}
        <View style={{ paddingHorizontal: 16 }}>
          <Pressable onPress={onSignOut} style={[styles.signOutBtn, { borderColor: p.danger + '44' }]}>
            <Ico name="arrowLeft" size={15} c={p.danger} />
            <Text style={[styles.signOutText, { color: p.danger }]}>Sign out</Text>
          </Pressable>
          <Text style={[styles.versionText, { color: p.textDim }]}>
            TravelCopanion v1.4.2 · build 261{'\n'}Made with care · privacy first
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  kicker: { fontSize: 11, letterSpacing: 1.8, textTransform: 'uppercase', fontWeight: '600' },
  greeting: { fontSize: 40, lineHeight: 44, letterSpacing: -1, marginTop: 6 },
  identityCard: { borderRadius: 22, padding: 16, borderWidth: 0.5, flexDirection: 'row', gap: 14, alignItems: 'center' },
  avatarImg: { width: 56, height: 56, borderRadius: 28, borderWidth: 2, borderColor: 'rgba(95,160,255,0.35)' },
  sparkleBadge: { position: 'absolute', bottom: -2, right: -2, width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  userName: { fontSize: 16, fontWeight: '600' },
  userEmail: { fontSize: 12, marginTop: 2 },
  passCard: { borderRadius: 22, padding: 18, borderWidth: 0.5, overflow: 'hidden', position: 'relative' },
  passGlow: { position: 'absolute', top: -30, right: -30, width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(95,160,255,0.2)' },
  passLabel: { fontSize: 10, letterSpacing: 1.6, textTransform: 'uppercase', fontWeight: '600' },
  passDays: { fontSize: 26, lineHeight: 30, marginTop: 6 },
  passDates: { fontSize: 12, marginTop: 4 },
  usageLabel: { fontSize: 11 },
  usageValue: { fontSize: 11 },
  usageBar: { height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.06)', overflow: 'hidden' },
  usageFill: { height: '100%' },
  seeAllPlansBtn: { marginTop: 14, height: 40, borderRadius: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  sectionLabel: { fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', fontWeight: '600' },
  seeAll: { fontSize: 12 },
  savedCard: { width: 130, borderRadius: 14, overflow: 'hidden', borderWidth: 0.5 },
  savedName: { fontSize: 13, fontWeight: '600', lineHeight: 16 },
  savedMeta: { fontSize: 10, marginTop: 2 },
  settingsGroup: { borderRadius: 18, borderWidth: 0.5, overflow: 'hidden' },
  settingsRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, paddingHorizontal: 16 },
  settingsIcon: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  settingsLabel: { flex: 1, fontSize: 14 },
  settingsValue: { fontSize: 12 },
  signOutBtn: { padding: 14, borderRadius: 16, borderWidth: 0.5, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  signOutText: { fontSize: 14, fontWeight: '600' },
  versionText: { textAlign: 'center', marginTop: 22, fontSize: 11, letterSpacing: 0.5, lineHeight: 18 },
});
