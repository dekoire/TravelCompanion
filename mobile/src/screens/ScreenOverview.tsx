import React from 'react';
import { View, Text, Pressable, Image, ScrollView, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { PHOTOS, TRIP } from '../theme';
import Ico from '../components/Ico';
import AIOrb from '../components/AIOrb';
import Pill from '../components/Pill';

interface Props {
  onOpenDay?: (day: number) => void;
  onBack?: () => void;
  onShare?: () => void;
}

const DAY_PHOTOS = [
  PHOTOS.kyotoHero, PHOTOS.philosopher, PHOTOS.bambooGrove,
  PHOTOS.gion, PHOTOS.arashiyama, PHOTOS.matcha, PHOTOS.garden,
];

const HEADLINES = [
  'Arrive · sunset stroll · ramen',
  "Kiyomizu-dera · philosopher's walk",
  'Bamboo grove · golden pavilion · kaiseki',
  'Geisha tea house · Gion sunset',
  'Day trip to Nara · deer park',
  'Hidden tea masters · pottery',
  'Slow morning · departure',
];

export default function ScreenOverview({ onOpenDay, onBack, onShare }: Props) {
  const { palette: p } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: p.bg }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Header */}
        <View style={styles.header}>
          {onBack && (
            <Pressable onPress={onBack} style={[styles.backBtn, { backgroundColor: p.dark ? 'rgba(255,255,255,0.06)' : 'rgba(15,30,80,0.05)', borderColor: p.line }]}>
              <Ico name="arrowLeft" size={18} c={p.text} />
            </Pressable>
          )}
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[styles.kicker, { color: p.accent }]}>Apr 4 – Apr 10 · 7 days</Text>
            <Text style={[styles.title, { color: p.text }]}>Kyoto, <Text style={{ fontStyle: 'italic' }}>for two</Text></Text>
            <View style={styles.pillRow}>
              <Pill tone="glass" size="xs">Hidden gems</Pill>
              <Pill tone="glass" size="xs">Local food</Pill>
              <Pill tone="glass" size="xs">Romantic</Pill>
            </View>
          </View>
          <Pressable onPress={onShare} style={[styles.shareBtn, { backgroundColor: p.dark ? 'rgba(255,255,255,0.06)' : 'rgba(15,30,80,0.05)', borderColor: p.line }]}>
            <View style={styles.avatarStack}>
              {[PHOTOS.user1, PHOTOS.user2, PHOTOS.user3].map((src, i) => (
                <Image key={i} source={{ uri: src }} style={[styles.avatar, i > 0 && styles.avatarOverlap, { borderColor: p.bg }]} />
              ))}
            </View>
            <Text style={[styles.shareBtnCount, { color: p.text }]}>3</Text>
          </Pressable>
        </View>

        {/* Trip pass */}
        <View style={styles.passWrap}>
          <View style={[styles.passCard, {
            backgroundColor: p.dark ? '#1A1A26' : '#0A4FBF',
            borderColor: p.dark ? 'rgba(95,160,255,0.22)' : 'rgba(255,255,255,0.18)',
          }]}>
            <View style={styles.passGlow} />
            <View style={styles.passRow}>
              <View>
                <Text style={[styles.passLabel, { color: p.dark ? p.accent : 'rgba(255,255,255,0.85)' }]}>Trip Pass · 7-day</Text>
                <Text style={styles.passDay}>Day 3 of 7</Text>
              </View>
              <AIOrb size={28} />
            </View>
            <View style={styles.passDots}>
              {[...Array(7)].map((_, i) => (
                <View key={i} style={[styles.passDot, {
                  backgroundColor: i < 3 ? (p.dark ? p.accent : '#fff') : 'rgba(255,255,255,0.22)',
                  opacity: i === 2 ? 1 : i < 2 ? 0.6 : 1,
                }]} />
              ))}
            </View>
            <View style={styles.passFooter}>
              <Text style={[styles.passFooterText, { color: p.dark ? p.textMuted : 'rgba(255,255,255,0.72)' }]}>4 days left · expires Apr 10</Text>
              <Text style={[styles.passFooterText, { color: p.dark ? p.accent : '#fff', fontWeight: '500' }]}>AI · 12 / 50 today</Text>
            </View>
          </View>
        </View>

        {/* Day list */}
        <View style={styles.dayList}>
          <Text style={[styles.weekLabel, { color: p.accent }]}>Your week</Text>
          {TRIP.days.map((d, i) => {
            const isCurrent = i === 2;
            const isPast = i < 2;
            return (
              <Pressable key={i} onPress={() => onOpenDay?.(i + 1)} style={[styles.dayCard, {
                opacity: isPast ? 0.55 : 1,
                backgroundColor: p.surface,
                borderColor: isCurrent ? 'rgba(95,160,255,0.32)' : 'rgba(255,255,255,0.08)',
              }]}>
                <View style={styles.dayPhoto}>
                  <Image source={{ uri: DAY_PHOTOS[i] }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                  <View style={styles.dayPhotoFade} />
                </View>
                <View style={styles.dayInfo}>
                  <View style={styles.dayLabelRow}>
                    <Text style={[styles.dayLabelText, { color: isCurrent ? p.accent : p.textMuted }]}>{d.label} · {d.date}</Text>
                    {isCurrent && (
                      <View style={[styles.liveDot, { backgroundColor: p.green }]} />
                    )}
                  </View>
                  <Text style={[styles.dayName, { color: p.text }]}>{d.name}</Text>
                  <Text style={[styles.dayHeadline, { color: p.textMuted }]}>{HEADLINES[i]}</Text>
                  <Text style={[styles.dayMeta, { color: p.textMuted }]}>{d.weather} · 5 stops</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 56, paddingHorizontal: 16, paddingBottom: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 18, marginTop: 4, borderWidth: 0.5, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  kicker: { fontSize: 11, letterSpacing: 1.8, textTransform: 'uppercase', fontWeight: '600' },
  title: { fontSize: 36, lineHeight: 36, letterSpacing: -1, marginTop: 6, fontWeight: '600' },
  pillRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 8 },
  shareBtn: { height: 40, paddingHorizontal: 6, paddingLeft: 10, borderRadius: 20, marginTop: 4, borderWidth: 0.5, flexShrink: 0, flexDirection: 'row', alignItems: 'center', gap: 6 },
  avatarStack: { flexDirection: 'row' },
  avatar: { width: 22, height: 22, borderRadius: 11, borderWidth: 2 },
  avatarOverlap: { marginLeft: -8 },
  shareBtnCount: { fontSize: 11, fontWeight: '700', paddingHorizontal: 4 },
  passWrap: { paddingHorizontal: 16, paddingBottom: 16 },
  passCard: { borderRadius: 22, padding: 18, borderWidth: 0.5, overflow: 'hidden' },
  passGlow: { position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(95,160,255,0.18)' },
  passRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  passLabel: { fontSize: 10, letterSpacing: 1.6, textTransform: 'uppercase', fontWeight: '600' },
  passDay: { fontSize: 22, marginTop: 4, lineHeight: 22, color: '#fff', fontWeight: '500' },
  passDots: { flexDirection: 'row', gap: 4, marginBottom: 10 },
  passDot: { flex: 1, height: 4, borderRadius: 2 },
  passFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  passFooterText: { fontSize: 11 },
  dayList: { paddingHorizontal: 16 },
  weekLabel: { fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', fontWeight: '600', paddingHorizontal: 6, paddingBottom: 12, paddingTop: 6 },
  dayCard: { borderRadius: 18, overflow: 'hidden', borderWidth: 0.5, flexDirection: 'row', alignItems: 'stretch', marginBottom: 10 },
  dayPhoto: { width: 110, position: 'relative' },
  dayPhotoFade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'transparent' },
  dayInfo: { flex: 1, padding: 14, paddingHorizontal: 16, justifyContent: 'center' },
  dayLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  dayLabelText: { fontSize: 10, letterSpacing: 1.4, textTransform: 'uppercase', fontWeight: '600' },
  liveDot: { width: 6, height: 6, borderRadius: 3 },
  dayName: { fontSize: 19, lineHeight: 21, fontWeight: '500', marginBottom: 4 },
  dayHeadline: { fontSize: 12, lineHeight: 16 },
  dayMeta: { fontSize: 11, marginTop: 8 },
});
