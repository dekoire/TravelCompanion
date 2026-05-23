import React, { useState } from 'react';
import { View, Text, Pressable, Image, ScrollView, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/ThemeContext';
import { DAY3, PHOTOS, SIRI_LINEAR_COLORS, ActivityItem } from '../theme';
import Ico from '../components/Ico';
import AIOrb from '../components/AIOrb';

interface AltItem {
  id: string;
  img: string;
  name: string;
  area: string;
  dist: string;
  crowd: 'low' | 'medium' | 'high';
  price: string;
  rating: number;
  aiPick?: boolean;
  diffs: { kind: 'better' | 'worse' | 'neutral'; text: string }[];
  pitch: string;
}

interface Props {
  activity?: ActivityItem;
  onClose?: () => void;
  onConfirm?: (id: string) => void;
  onCompare?: (ids: string[]) => void;
}

const ALTS: AltItem[] = [
  {
    id: 'a', img: PHOTOS.garden, name: 'Hosen-in · moss temple',
    area: 'Ohara', dist: '12 min taxi', crowd: 'low', price: '¥ 800', rating: 4.8,
    aiPick: true,
    diffs: [
      { kind: 'better', text: 'Far fewer crowds — 12 visitors right now' },
      { kind: 'neutral', text: 'Same kind of golden-hour shadows' },
    ],
    pitch: 'A near-empty alternative the algorithm keeps re-surfacing for couples.',
  },
  {
    id: 'b', img: PHOTOS.philosopher, name: "Philosopher's Path",
    area: 'Higashiyama', dist: '6 min walk', crowd: 'low', price: 'Free', rating: 4.7,
    diffs: [
      { kind: 'better', text: 'Closer · no taxi needed' },
      { kind: 'neutral', text: 'A walk, not a temple' },
    ],
    pitch: 'Stretches your afternoon into something contemplative and slow.',
  },
  {
    id: 'c', img: PHOTOS.fushimi, name: 'Fushimi Inari · upper shrine',
    area: 'Fushimi', dist: '22 min train', crowd: 'medium', price: 'Free', rating: 4.9,
    diffs: [
      { kind: 'worse', text: 'Longer travel · 22 min train' },
      { kind: 'better', text: 'More iconic photo opportunities' },
    ],
    pitch: 'Trade calm for the postcard shot you came for.',
  },
  {
    id: 'd', img: PHOTOS.kinkakuji, name: 'Ginkaku-ji · Silver Pavilion',
    area: 'Kita', dist: '14 min taxi', crowd: 'medium', price: '¥ 500', rating: 4.6,
    diffs: [
      { kind: 'neutral', text: 'Similar Kita-area temple' },
      { kind: 'better', text: 'Smaller grounds, less walking' },
    ],
    pitch: 'A quieter sibling — same Kita neighborhood, a fraction of the visitors.',
  },
];

const PREFS_ALL = ['Quieter', 'Cheaper', 'Closer', 'Different vibe', 'More iconic', 'Indoor'];

export default function ScreenReplace({ activity, onClose, onConfirm, onCompare }: Props) {
  const { palette: p } = useTheme();
  const cur = activity || DAY3[3];
  const [selected, setSelected] = useState<string[]>(['a']);
  const [prefs, setPrefs] = useState<string[]>(['Quieter']);

  const togglePref = (chip: string) => setPrefs(prev =>
    prev.includes(chip) ? prev.filter(c => c !== chip) : [...prev, chip]);

  const toggleSel = (id: string) => setSelected(prev =>
    prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const diffColor = (kind: string) => {
    if (kind === 'better') return p.green;
    if (kind === 'worse') return p.danger;
    return p.textMuted;
  };

  const diffSym = (kind: string) => {
    if (kind === 'better') return '↑';
    if (kind === 'worse') return '↓';
    return '·';
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
            <Text style={[styles.kicker, { color: p.accent }]}>Replace activity</Text>
            <Text style={[styles.curTitle, { color: p.text }]} numberOfLines={1}>{cur.title}</Text>
          </View>
          <View style={[styles.removingBadge, { backgroundColor: 'rgba(255,110,140,0.14)', borderColor: p.danger + '55' }]}>
            <Text style={[styles.removingText, { color: p.danger }]}>Removing</Text>
          </View>
        </View>

        {/* Current item */}
        <View style={{ padding: 16, paddingTop: 0, paddingBottom: 14 }}>
          <View style={[styles.curItem, { backgroundColor: p.surface, borderColor: p.line }]}>
            <Image source={{ uri: cur.img }} style={styles.curThumb} resizeMode="cover" />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.curTime, { color: p.textMuted }]}>{cur.time} · {cur.dur}</Text>
              <Text style={[styles.curName, { color: p.textMuted }]} numberOfLines={1}>{cur.title}</Text>
            </View>
          </View>
        </View>

        {/* AI brief */}
        <View style={{ paddingHorizontal: 16, paddingBottom: 14 }}>
          <View style={[styles.aiBrief, { backgroundColor: p.accentSoft, borderColor: p.accent + '33' }]}>
            <View style={styles.aiBriefRow}>
              <AIOrb size={24} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.aiBriefLabel, { color: p.accent }]}>What I'm optimizing for</Text>
                <Text style={[styles.aiBriefText, { color: p.text }]}>
                  Replacing crowded Kinkaku-ji with something{' '}
                  <Text style={{ color: p.accent, fontWeight: '600' }}>quieter</Text>{' '}
                  in the same time window. Adjust if you want.
                </Text>
              </View>
            </View>
            <View style={styles.prefsRow}>
              {PREFS_ALL.map(chip => {
                const s = prefs.includes(chip);
                return (
                  <Pressable key={chip} onPress={() => togglePref(chip)} style={[styles.prefChip, {
                    backgroundColor: s ? p.accent : p.dark ? 'rgba(255,255,255,0.04)' : 'rgba(15,30,80,0.04)',
                    borderColor: s ? p.accent : p.line,
                  }]}>
                    <Text style={[styles.prefChipText, { color: s ? '#fff' : p.text }]}>{s ? '✓ ' : ''}{chip}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>

        {/* Section header */}
        <View style={styles.sectionRow}>
          <Text style={[styles.sectionLabel, { color: p.accent }]}>{ALTS.length} alternatives · {selected.length} selected</Text>
          <Pressable style={styles.sortBtn}>
            <Ico name="settings" size={11} c={p.accent} />
            <Text style={[styles.sortText, { color: p.accent }]}>Sort</Text>
          </Pressable>
        </View>

        {/* Alt cards */}
        <View style={styles.altList}>
          {ALTS.map(alt => {
            const s = selected.includes(alt.id);
            return (
              <Pressable key={alt.id} onPress={() => toggleSel(alt.id)} style={[styles.altCard, {
                backgroundColor: p.surface,
                borderColor: s ? p.accent : p.line,
                borderWidth: s ? 1.5 : 0.5,
              }]}>
                {/* Image */}
                <View style={styles.altImgWrap}>
                  <Image source={{ uri: alt.img }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                  <View style={styles.altImgGrad} />
                  {alt.aiPick && (
                    <LinearGradient colors={[...SIRI_LINEAR_COLORS]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.aiPickBadge}>
                      <Ico name="sparkle" size={11} c="#fff" />
                      <Text style={styles.aiPickText}>AI pick</Text>
                    </LinearGradient>
                  )}
                  <View style={[styles.selCheck, { backgroundColor: s ? p.accent : 'rgba(7,12,28,0.55)', borderColor: s ? p.accent : 'rgba(255,255,255,0.4)' }]}>
                    {s && <Ico name="check" size={14} c="#fff" sw={3} />}
                  </View>
                  <View style={styles.altTitleOverlay}>
                    <Text style={styles.altArea}>{alt.area} · {alt.dist}</Text>
                    <Text style={styles.altName}>{alt.name}</Text>
                  </View>
                </View>

                {/* Stats */}
                <View style={[styles.statsStrip, { borderBottomColor: p.line }]}>
                  <View style={styles.statCell}>
                    <Text style={[styles.statLabel, { color: p.textDim }]}>Rating</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Ico name="star" size={12} c={p.amber} />
                      <Text style={[styles.statVal, { color: p.text }]}>{alt.rating}</Text>
                    </View>
                  </View>
                  <View style={styles.statCell}>
                    <Text style={[styles.statLabel, { color: p.textDim }]}>Crowd</Text>
                    <Text style={[styles.statVal, { color: p.text }]}>{alt.crowd}</Text>
                  </View>
                  <View style={styles.statCell}>
                    <Text style={[styles.statLabel, { color: p.textDim }]}>Cost</Text>
                    <Text style={[styles.statVal, { color: p.text }]}>{alt.price}</Text>
                  </View>
                </View>

                {/* Diffs */}
                <View style={styles.diffsWrap}>
                  {alt.diffs.map((d, i) => {
                    const c = diffColor(d.kind);
                    return (
                      <View key={i} style={styles.diffRow}>
                        <View style={[styles.diffIcon, { backgroundColor: c + '22' }]}>
                          <Text style={[styles.diffSym, { color: c }]}>{diffSym(d.kind)}</Text>
                        </View>
                        <Text style={[styles.diffText, { color: p.text }]}>{d.text}</Text>
                      </View>
                    );
                  })}
                </View>

                {/* Pitch */}
                <Text style={[styles.pitch, { color: p.textMuted }]}>"{alt.pitch}"</Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      {/* Sticky footer */}
      <View style={[styles.footer, { backgroundColor: p.dark ? 'rgba(7,12,28,0.96)' : 'rgba(234,241,255,0.96)' }]}>
        {selected.length >= 2 ? (
          <Pressable onPress={() => onCompare?.(selected)} style={{ flex: 1 }}>
            <LinearGradient colors={[...SIRI_LINEAR_COLORS]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.footerBtn}>
              <Ico name="layers" size={17} c="#fff" />
              <Text style={styles.footerBtnText}>Compare {selected.length} side-by-side</Text>
            </LinearGradient>
          </Pressable>
        ) : selected.length === 1 ? (
          <Pressable onPress={() => onConfirm?.(selected[0])} style={{ flex: 1 }}>
            <LinearGradient colors={[...SIRI_LINEAR_COLORS]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.footerBtn}>
              <Ico name="check" size={17} c="#fff" sw={2.5} />
              <Text style={styles.footerBtnText}>Replace with {ALTS.find(a => a.id === selected[0])?.name.split('·')[0].trim()}</Text>
            </LinearGradient>
          </Pressable>
        ) : (
          <View style={[styles.footerBtn, { backgroundColor: p.dark ? 'rgba(255,255,255,0.05)' : 'rgba(15,30,80,0.05)', borderWidth: 0.5, borderColor: p.line }]}>
            <Text style={[styles.footerBtnText, { color: p.textMuted }]}>Tap one or more alternatives</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topChrome: { paddingTop: 56, paddingHorizontal: 16, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 0.5, alignItems: 'center', justifyContent: 'center' },
  kicker: { fontSize: 11, letterSpacing: 1.6, textTransform: 'uppercase', fontWeight: '700' },
  curTitle: { fontSize: 16, fontWeight: '600', marginTop: 2 },
  removingBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99, borderWidth: 0.5 },
  removingText: { fontSize: 10, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' },
  curItem: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, paddingHorizontal: 12, borderRadius: 16, borderWidth: 0.5, opacity: 0.62 },
  curThumb: { width: 44, height: 44, borderRadius: 10 },
  curTime: { fontSize: 11, letterSpacing: 0.4 },
  curName: { fontSize: 13, fontWeight: '600', textDecorationLine: 'line-through', lineHeight: 16 },
  aiBrief: { padding: 14, borderRadius: 18, borderWidth: 0.5 },
  aiBriefRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  aiBriefLabel: { fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', fontWeight: '600', marginBottom: 4 },
  aiBriefText: { fontSize: 13, lineHeight: 19 },
  prefsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  prefChip: { paddingHorizontal: 11, paddingVertical: 6, borderRadius: 99, borderWidth: 0.5 },
  prefChipText: { fontSize: 11.5, fontWeight: '500' },
  sectionRow: { paddingHorizontal: 22, paddingBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionLabel: { fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', fontWeight: '600' },
  sortBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sortText: { fontSize: 11, fontWeight: '500' },
  altList: { paddingHorizontal: 16, gap: 10 },
  altCard: { borderRadius: 20, overflow: 'hidden' },
  altImgWrap: { height: 140, position: 'relative' },
  altImgGrad: { ...StyleSheet.absoluteFillObject, backgroundColor: 'transparent' },
  aiPickBadge: { position: 'absolute', top: 12, left: 12, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 99 },
  aiPickText: { fontSize: 10, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', color: '#fff' },
  selCheck: { position: 'absolute', top: 12, right: 12, width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  altTitleOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 14, paddingTop: 0 },
  altArea: { fontSize: 10, color: 'rgba(255,255,255,0.78)', letterSpacing: 1, textTransform: 'uppercase', fontWeight: '600' },
  altName: { fontSize: 18, color: '#fff', fontWeight: '600', lineHeight: 22, letterSpacing: -0.3, marginTop: 2 },
  statsStrip: { flexDirection: 'row', padding: 10, paddingHorizontal: 14, borderBottomWidth: 0.5, gap: 8 },
  statCell: { flex: 1, gap: 2 },
  statLabel: { fontSize: 9, letterSpacing: 1.1, textTransform: 'uppercase', fontWeight: '600' },
  statVal: { fontSize: 12, fontWeight: '500' },
  diffsWrap: { padding: 10, paddingHorizontal: 14, paddingBottom: 8 },
  diffRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 3 },
  diffIcon: { width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  diffSym: { fontSize: 11, fontWeight: '800' },
  diffText: { fontSize: 12 },
  pitch: { padding: 8, paddingHorizontal: 14, paddingBottom: 14, fontSize: 12, lineHeight: 18, fontStyle: 'italic' },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 14, paddingHorizontal: 16, paddingBottom: 34 },
  footerBtn: { height: 52, borderRadius: 26, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  footerBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
