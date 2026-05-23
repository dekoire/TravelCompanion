import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, Image, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/ThemeContext';
import { DAY3, PHOTOS, ActivityItem } from '../theme';
import Ico from '../components/Ico';
import AIOrb from '../components/AIOrb';
import Pill from '../components/Pill';

interface Props {
  activity?: ActivityItem;
  onClose?: () => void;
  onOpenChat?: () => void;
  onAddTrip?: () => void;
  onReplace?: () => void;
}

function CrowdBars({ level }: { level: string }) {
  const { palette: p } = useTheme();
  const heights = [4, 7, 10];
  const filled = level === 'low' ? 1 : level === 'medium' ? 2 : 3;
  const c = level === 'high' ? p.danger : level === 'medium' ? p.amber : p.green;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2 }}>
      {heights.map((h, i) => (
        <View key={i} style={{ width: 3, height: h, borderRadius: 1, backgroundColor: i < filled ? c : 'rgba(255,255,255,0.15)' }} />
      ))}
    </View>
  );
}

export default function ScreenDetail({ activity, onClose, onOpenChat, onAddTrip, onReplace }: Props) {
  const { palette: p } = useTheme();
  const a = activity || DAY3[3];
  const [showHours, setShowHours] = useState(false);

  return (
    <View style={[styles.container, { backgroundColor: p.bg }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Hero photo */}
        <View style={{ height: 440, position: 'relative' }}>
          <Image source={{ uri: a.img }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          <LinearGradient colors={['rgba(10,10,18,0.6)', 'transparent', 'transparent', 'rgba(10,10,18,0.92)']} locations={[0, 0.25, 0.5, 1]} style={StyleSheet.absoluteFill} />

          {/* Top chrome */}
          <View style={[styles.topChrome]}>
            <Pressable onPress={onClose} style={styles.glassBtn}>
              <Ico name="arrowLeft" size={18} c="#fff" />
            </Pressable>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {['heart', 'share'].map(n => (
                <Pressable key={n} style={styles.glassBtn}>
                  <Ico name={n} size={17} c="#fff" />
                </Pressable>
              ))}
            </View>
          </View>

          {/* Photo count */}
          <View style={styles.photoCount}>
            <Text style={{ fontSize: 11, color: '#fff' }}>1 / 28</Text>
          </View>

          {/* Title overlay */}
          <View style={styles.heroTitle}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
              <Pill tone="glass" size="xs" icon="pin">{a.area} · 14 min walk</Pill>
              <Pill tone="accent" size="xs" icon="sparkle">In your trip · {a.time}</Pill>
            </View>
            <Text style={styles.titleText}>{a.title}</Text>
            <Text style={styles.tagText}>{a.tag}</Text>
          </View>
        </View>

        {/* Stats strip */}
        <View style={[styles.statsStrip, { borderBottomColor: 'rgba(255,255,255,0.06)' }]}>
          {[
            { label: 'Rating', value: `★ ${a.rating}`, sub: '4,210 reviews' },
            { label: 'Crowd', isComponent: true, sub: a.crowd },
            { label: 'Best at', value: '4–6 pm', sub: 'golden hour' },
          ].map((s, i) => (
            <View key={i} style={[styles.statCell, i > 0 && styles.statCellBorder, { borderLeftColor: 'rgba(255,255,255,0.08)' }]}>
              <Text style={[styles.statLabel, { color: p.textDim }]}>{s.label}</Text>
              {s.isComponent ? <CrowdBars level={a.crowd} /> : <Text style={[styles.statValue, { color: p.text }]}>{s.value}</Text>}
              <Text style={[styles.statSub, { color: p.textMuted }]}>{s.sub}</Text>
            </View>
          ))}
        </View>

        {/* AI insight */}
        <View style={{ padding: 18, paddingHorizontal: 22 }}>
          <View style={[styles.aiInsight, { borderColor: 'rgba(95,160,255,0.22)' }]}>
            <AIOrb size={28} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.aiLabel, { color: p.accent }]}>Your AI's read</Text>
              <Text style={[styles.aiText, { color: p.text }]}>
                Skip the south gate — it's 80% of the crowd. The north path opens onto an empty bamboo corridor and a small shrine most tourists miss. Allow 1h 45m for the loop.
              </Text>
              <Pressable onPress={onOpenChat} style={[styles.askBtn, { backgroundColor: 'rgba(95,160,255,0.18)', borderColor: 'rgba(95,160,255,0.32)' }]}>
                <Ico name="chat" size={13} c={p.accent} />
                <Text style={[styles.askBtnText, { color: p.accent }]}>Ask about this place</Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* Reviews summary */}
        <View style={{ paddingHorizontal: 22, paddingBottom: 18 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <Text style={[styles.sectionLabel, { color: p.accent }]}>Reviews</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <View style={[styles.syncDot, { backgroundColor: p.green }]} />
              <Text style={[styles.syncText, { color: p.textMuted }]}>Synced 4 min ago</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {[{ name: 'Google', score: '4.7', count: '3,210', highlight: 'Hidden gem' }, { name: 'Tripadvisor', score: '4.6', count: '1,890', badge: "Travelers' Choice" }].map((r, i) => (
              <View key={i} style={[styles.reviewCard, { backgroundColor: p.surface, borderColor: p.line }]}>
                <Text style={[styles.reviewProvider, { color: p.textMuted }]}>{r.name}</Text>
                <Text style={[styles.reviewScore, { color: p.text }]}>{r.score}</Text>
                <Text style={[styles.reviewCount, { color: p.textMuted }]}>{r.count} reviews</Text>
              </View>
            ))}
          </View>
          <View style={[styles.reviewSummary, { backgroundColor: p.dark ? 'rgba(255,255,255,0.03)' : 'rgba(15,30,80,0.03)', borderColor: p.line }]}>
            <AIOrb size={14} pulse={false} />
            <Text style={[styles.reviewSummaryText, { color: p.text }]}>
              <Text style={{ fontWeight: '500' }}>What reviewers love:</Text> soaring stalks, early-morning quiet, the north path.{' '}
              <Text style={{ fontWeight: '500' }}>Watch for:</Text> tour-bus crowds 11am–1pm.
            </Text>
          </View>
        </View>

        {/* About */}
        <View style={{ paddingHorizontal: 22, paddingBottom: 18 }}>
          <Text style={[styles.sectionLabel, { color: p.accent, marginBottom: 8 }]}>About</Text>
          <Text style={[styles.aboutText, { color: 'rgba(244,241,236,0.75)' }]}>
            A several-kilometer corridor of soaring bamboo on the western edge of Kyoto. Light filters down in green ribbons; on a still morning the only sound is the creak of stalks against each other.
          </Text>
        </View>

        {/* Photo strip */}
        <View style={{ paddingBottom: 18 }}>
          <View style={{ paddingHorizontal: 22, paddingBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={[styles.sectionLabel, { color: p.accent }]}>Photos · from this week</Text>
            <Text style={[styles.seeAll, { color: p.textMuted }]}>See 28</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 22, gap: 8 }}>
            {[PHOTOS.bambooGrove, PHOTOS.garden, PHOTOS.fushimi, PHOTOS.philosopher].map((src, i) => (
              <Image key={i} source={{ uri: src }} style={[styles.photoStrip, { borderColor: 'rgba(255,255,255,0.08)' }]} resizeMode="cover" />
            ))}
          </ScrollView>
        </View>

        {/* Hours/weather panel */}
        <View style={{ paddingHorizontal: 22, paddingBottom: 18 }}>
          <Text style={[styles.sectionLabel, { color: p.accent, marginBottom: 10 }]}>Today · Apr 6</Text>
          <View style={[styles.hoursPanel, { backgroundColor: p.surface, borderColor: 'rgba(255,255,255,0.06)' }]}>
            {[
              { l: 'Status', v: 'Open now · until 18:00', accent: true },
              { l: 'Weather', v: 'Sunny 19° · clearing' },
              { l: 'Tickets', v: 'Free entry' },
              { l: 'Crowd forecast', v: 'Medium → low after 2pm' },
            ].map((r, i, arr) => (
              <View key={i} style={[styles.hoursRow, { borderBottomWidth: i < arr.length - 1 ? 0.5 : 0, borderBottomColor: 'rgba(255,255,255,0.06)' }]}>
                <Text style={[styles.hoursLabel, { color: p.textMuted }]}>{r.l}</Text>
                <Text style={[styles.hoursValue, { color: r.accent ? p.green : p.text, fontWeight: r.accent ? '600' : '400' }]}>{r.v}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* CTA footer */}
      <View style={[styles.footer, { backgroundColor: 'rgba(10,10,18,0.9)' }]}>
        <Pressable onPress={onAddTrip} style={[styles.navigateBtn, { backgroundColor: p.accent }]}>
          <Ico name="route" size={17} c="#fff" sw={2} />
          <Text style={styles.navigateBtnText}>Navigate now</Text>
        </Pressable>
        <Pressable onPress={onReplace} style={[styles.replaceBtn, { backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.12)' }]}>
          <Ico name="plus" size={16} c={p.text} />
          <Text style={[styles.replaceBtnText, { color: p.text }]}>Replace</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topChrome: { position: 'absolute', top: 56, left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between' },
  glassBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.4)', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  photoCount: { position: 'absolute', bottom: 16, right: 16, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99, backgroundColor: 'rgba(0,0,0,0.5)' },
  heroTitle: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 22, paddingTop: 0 },
  titleText: { fontSize: 38, lineHeight: 40, letterSpacing: -0.8, color: '#fff', fontWeight: '600' },
  tagText: { marginTop: 8, fontSize: 13, color: 'rgba(255,255,255,0.7)' },
  statsStrip: { flexDirection: 'row', paddingHorizontal: 22, paddingVertical: 18, borderBottomWidth: 0.5 },
  statCell: { flex: 1 },
  statCellBorder: { paddingLeft: 14, borderLeftWidth: 0.5 },
  statLabel: { fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase', fontWeight: '500' },
  statValue: { fontSize: 16, marginTop: 4, fontWeight: '500' },
  statSub: { fontSize: 11, marginTop: 2 },
  aiInsight: { padding: 14, borderRadius: 16, borderWidth: 0.5, backgroundColor: 'rgba(95,160,255,0.06)', flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  aiLabel: { fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', fontWeight: '600', marginBottom: 5 },
  aiText: { fontSize: 13.5, lineHeight: 20 },
  askBtn: { marginTop: 10, paddingHorizontal: 11, paddingVertical: 6, borderRadius: 12, borderWidth: 0.5, flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start' },
  askBtnText: { fontSize: 12, fontWeight: '500' },
  sectionLabel: { fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', fontWeight: '600' },
  syncDot: { width: 5, height: 5, borderRadius: 3 },
  syncText: { fontSize: 11 },
  reviewCard: { flex: 1, padding: 12, borderRadius: 14, borderWidth: 0.5, gap: 6 },
  reviewProvider: { fontSize: 12, fontWeight: '500' },
  reviewScore: { fontSize: 22, fontWeight: '600', letterSpacing: -0.5 },
  reviewCount: { fontSize: 11 },
  reviewSummary: { marginTop: 10, padding: 10, paddingHorizontal: 12, borderRadius: 12, borderWidth: 0.5, flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  reviewSummaryText: { fontSize: 12, lineHeight: 18, flex: 1 },
  aboutText: { fontSize: 14, lineHeight: 22 },
  seeAll: { fontSize: 12 },
  photoStrip: { width: 110, height: 140, borderRadius: 14, borderWidth: 0.5 },
  hoursPanel: { padding: 12, paddingHorizontal: 16, borderRadius: 16, borderWidth: 0.5 },
  hoursRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  hoursLabel: { fontSize: 13 },
  hoursValue: { fontSize: 13 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 14, paddingHorizontal: 16, paddingBottom: 34, flexDirection: 'row', gap: 10 },
  navigateBtn: { flex: 1, height: 50, borderRadius: 25, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  navigateBtnText: { color: '#fff', fontWeight: '600', fontSize: 15, letterSpacing: -0.2 },
  replaceBtn: { height: 50, paddingHorizontal: 18, borderRadius: 25, borderWidth: 0.5, flexDirection: 'row', alignItems: 'center', gap: 6 },
  replaceBtnText: { fontWeight: '500', fontSize: 14 },
});
