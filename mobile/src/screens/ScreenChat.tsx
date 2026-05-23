import React, { useState, useRef } from 'react';
import { View, Text, ScrollView, Pressable, Image, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/ThemeContext';
import { PHOTOS, SIRI_LINEAR_COLORS } from '../theme';
import Ico from '../components/Ico';
import AIOrb from '../components/AIOrb';

interface Props {
  onClose?: () => void;
  onOpenLocation?: () => void;
}

const MSGS = [
  { from: 'ai', text: 'Morning. The bamboo grove is opening up — about half its usual crowd right now.' },
  { from: 'user', text: 'we are tired. make today calmer.' },
  { from: 'ai', text: 'Okay — let me re-shape the afternoon. One sec.', thinking: true },
  { from: 'ai', card: { kind: 'replan', title: 'Calmer afternoon for two', diff: [{ mode: 'remove', text: 'Kinkaku-ji · golden hour crowd' }, { mode: 'add', text: 'Hosen-in · moss garden, 12 people total' }, { mode: 'keep', text: 'Gion Karyo dinner · reservation held' }], meta: '−1.4 km walking · +22 min downtime' } },
  { from: 'ai', text: "Replaced golden pavilion with a near-empty moss temple I think you'll love. Sound good?" },
  { from: 'user', text: 'perfect. what should we eat for lunch?' },
  { from: 'ai', text: "I narrowed it to 4 spots near Arashiyama. Tap the ones that look right — I'll book the winner." },
  { from: 'ai', card: { kind: 'picker', options: [
    { id: 'p1', img: PHOTOS.ramen,    name: 'Yoshimura · udon',         meta: '★ 4.9 · ¥¥ · 4 min walk',  tags: ['Cozy', 'No English'] },
    { id: 'p2', img: PHOTOS.matcha,   name: '% Arabica',                meta: '★ 4.8 · ¥¥ · 6 min walk',  tags: ['Café', 'River view'] },
    { id: 'p3', img: PHOTOS.sushi,    name: 'Sushi Mitamura',           meta: '★ 4.7 · ¥¥¥ · 9 min',       tags: ['Omakase', 'Quiet'] },
    { id: 'p4', img: PHOTOS.garden,   name: 'Tofu kaiseki · Shoraian',  meta: '★ 4.6 · ¥¥¥ · 12 min',      tags: ['Vegetarian'] },
  ] } },
];

const SUGGESTIONS = ['I want food now', 'Find something nearby', 'Make today calmer', 'Find hidden gems', 'Optimize route', 'We are tired'];

interface PickerOption {
  id: string;
  img: string;
  name: string;
  meta: string;
  tags: string[];
}

function PickerCard({ options }: { options: PickerOption[] }) {
  const { palette: p } = useTheme();
  const [liked, setLiked] = useState(new Set(['p1']));

  const toggle = (id: string) => {
    const next = new Set(liked);
    next.has(id) ? next.delete(id) : next.add(id);
    setLiked(next);
  };

  return (
    <View style={[styles.pickerCard, { backgroundColor: p.dark ? 'rgba(255,255,255,0.04)' : 'rgba(27,18,64,0.04)', borderColor: p.line }]}>
      <View style={{ padding: 10, paddingBottom: 6, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Ico name="heart" size={12} c={p.accent} />
        <Text style={{ fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', color: p.accent, fontWeight: '600' }}>
          Tap what looks right · {liked.size} liked
        </Text>
      </View>
      <View style={styles.pickerGrid}>
        {options.map(o => {
          const isLiked = liked.has(o.id);
          return (
            <Pressable key={o.id} onPress={() => toggle(o.id)} style={styles.pickerItem}>
              <Image source={{ uri: o.img }} style={StyleSheet.absoluteFill} resizeMode="cover" />
              <LinearGradient colors={['transparent', 'rgba(11,10,24,0.85)']} locations={[0.4, 1]} style={StyleSheet.absoluteFill} />
              {isLiked && <View style={[styles.selectedRing, { borderColor: p.accent }]} />}
              <Pressable onPress={() => toggle(o.id)} style={[styles.heartBtn, { backgroundColor: isLiked ? undefined : 'rgba(11,10,24,0.5)' }]}>
                {isLiked
                  ? <LinearGradient colors={[...SIRI_LINEAR_COLORS]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.heartGrad}><Ico name="heart" size={14} c="#fff" /></LinearGradient>
                  : <Ico name="heart" size={14} c="#fff" sw={1.8} />
                }
              </Pressable>
              <View style={styles.pickerInfo}>
                <Text style={styles.pickerName} numberOfLines={1}>{o.name}</Text>
                <Text style={styles.pickerMeta}>{o.meta}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
      <View style={{ padding: 8, paddingTop: 8, flexDirection: 'row', gap: 6 }}>
        <LinearGradient colors={[...SIRI_LINEAR_COLORS]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.bookBtn}>
          <Ico name="sparkle" size={13} c="#fff" />
          <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>Book the winner ({liked.size})</Text>
        </LinearGradient>
        <Pressable style={[styles.moreBtn, { borderColor: p.line }]}>
          <Text style={[styles.moreBtnText, { color: p.text }]}>More options</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function ScreenChat({ onClose, onOpenLocation }: Props) {
  const { palette: p } = useTheme();
  const scrollRef = useRef<ScrollView>(null);

  return (
    <View style={[styles.container, { backgroundColor: p.bg }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: p.dark ? 'rgba(10,10,18,0.85)' : 'rgba(234,241,255,0.85)', borderBottomColor: p.line }]}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerInner}>
            <Pressable onPress={onClose} style={[styles.headerBtn, { backgroundColor: p.dark ? 'rgba(255,255,255,0.06)' : 'rgba(15,30,80,0.05)', borderColor: p.line }]}>
              <Ico name="close" size={16} c={p.text} />
            </Pressable>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <AIOrb size={32} />
              <View>
                <Text style={[styles.headerTitle, { color: p.text }]}>Companion</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 }}>
                  <View style={[styles.activeDot, { backgroundColor: '#7EE7B6' }]} />
                  <Text style={{ fontSize: 11, color: p.accent }}>Listening · Kyoto Day 3</Text>
                </View>
              </View>
            </View>
            <Pressable style={[styles.headerBtn, { backgroundColor: p.dark ? 'rgba(255,255,255,0.06)' : 'rgba(15,30,80,0.05)', borderColor: p.line }]}>
              <Ico name="mic" size={16} c={p.accent} />
            </Pressable>
          </View>
        </SafeAreaView>
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, gap: 14, paddingTop: 18, paddingBottom: 12 }}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
      >
        <Text style={[styles.dateLine, { color: 'rgba(255,255,255,0.35)' }]}>Today · 09:42</Text>
        {MSGS.map((m, i) => {
          if (m.from === 'user') {
            return (
              <View key={i} style={{ alignItems: 'flex-end' }}>
                <View style={[styles.userBubble, { backgroundColor: p.accent }]}>
                  <Text style={styles.userBubbleText}>{m.text}</Text>
                </View>
              </View>
            );
          }
          return (
            <View key={i} style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end', maxWidth: '88%' }}>
              <View style={{ width: 24, flexShrink: 0, marginBottom: 2, opacity: i > 0 && MSGS[i - 1]?.from === 'ai' ? 0 : 1 }}>
                <AIOrb size={24} pulse={false} />
              </View>
              <View style={{ flex: 1, gap: 8 }}>
                {m.thinking && m.text ? (
                  <View style={[styles.aiBubble, { backgroundColor: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)' }]}>
                    <Text style={[styles.aiBubbleText, { color: p.textMuted, fontStyle: 'italic' }]}>{m.text}</Text>
                  </View>
                ) : m.text ? (
                  <View style={[styles.aiBubble, { backgroundColor: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.08)' }]}>
                    <Text style={[styles.aiBubbleText, { color: p.text }]}>{m.text}</Text>
                  </View>
                ) : null}
                {m.card && (m.card as any).kind === 'replan' && (
                  <View style={[styles.replanCard, { borderColor: 'rgba(95,160,255,0.32)' }]}>
                    <View style={[styles.replanHeader, { borderBottomColor: 'rgba(95,160,255,0.18)' }]}>
                      <Ico name="sparkle" size={14} c={p.accent} />
                      <Text style={[styles.replanTitle, { color: p.accent }]}>Proposed change</Text>
                      <Text style={[styles.replanMeta, { color: 'rgba(255,255,255,0.55)' }]}>{(m.card as any).meta}</Text>
                    </View>
                    <View style={{ padding: 8, paddingHorizontal: 14, paddingBottom: 12, gap: 6 }}>
                      {(m.card as any).diff.map((d: any, j: number) => {
                        const color = d.mode === 'remove' ? 'rgba(255,255,255,0.4)' : d.mode === 'add' ? p.green : 'rgba(255,255,255,0.4)';
                        const sym = d.mode === 'remove' ? '−' : d.mode === 'add' ? '+' : '·';
                        return (
                          <View key={j} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 6 }}>
                            <View style={[styles.diffSym, { backgroundColor: color + '33' }]}>
                              <Text style={[styles.diffSymText, { color }]}>{sym}</Text>
                            </View>
                            <Text style={[styles.diffText, { color: d.mode === 'remove' ? 'rgba(255,255,255,0.4)' : p.text, textDecorationLine: d.mode === 'remove' ? 'line-through' : 'none' }]}>{d.text}</Text>
                          </View>
                        );
                      })}
                    </View>
                    <View style={{ flexDirection: 'row', gap: 6, padding: 12, paddingTop: 0 }}>
                      <Pressable style={[styles.applyBtn, { backgroundColor: p.accent }]}>
                        <Text style={styles.applyBtnText}>Apply change</Text>
                      </Pressable>
                      <Pressable style={[styles.tweakBtn, { backgroundColor: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.1)' }]}>
                        <Text style={[styles.tweakBtnText, { color: p.text }]}>Tweak</Text>
                      </Pressable>
                    </View>
                  </View>
                )}
                {m.card && (m.card as any).kind === 'picker' && (
                  <PickerCard options={(m.card as any).options} />
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Suggestions */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.suggestions, { borderTopColor: 'rgba(255,255,255,0.04)' }]} contentContainerStyle={{ gap: 6, padding: 6, paddingHorizontal: 16 }}>
        {SUGGESTIONS.map((s, i) => (
          <Pressable key={i} style={styles.suggestionChip}>
            <Text style={[styles.suggestionText, { color: p.accent }]}>{s}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Input dock */}
      <View style={[styles.inputDock, { backgroundColor: p.dark ? 'rgba(10,10,18,0.8)' : 'rgba(234,241,255,0.85)', borderTopColor: p.line }]}>
        <SafeAreaView edges={['bottom']}>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <Pressable style={[styles.inputSideBtn, { backgroundColor: p.dark ? 'rgba(255,255,255,0.06)' : 'rgba(15,30,80,0.05)', borderColor: p.line }]}>
              <Ico name="plus" size={18} c={p.text} />
            </Pressable>
            <View style={[styles.inputField, { backgroundColor: p.dark ? 'rgba(255,255,255,0.06)' : 'rgba(15,30,80,0.05)', borderColor: p.line }]}>
              <Text style={[styles.inputPlaceholder, { color: p.textDim }]}>Ask me anything…</Text>
              <Ico name="mic" size={16} c={p.accent} />
            </View>
          </View>
        </SafeAreaView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { borderBottomWidth: 0.5 },
  headerInner: { paddingHorizontal: 18, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 0.5, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '600' },
  activeDot: { width: 6, height: 6, borderRadius: 3 },
  dateLine: { fontSize: 11, textAlign: 'center', letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 6 },
  userBubble: { maxWidth: '78%', padding: 10, paddingHorizontal: 14, borderRadius: 18, borderBottomRightRadius: 4 },
  userBubbleText: { color: '#fff', fontSize: 14, fontWeight: '500', lineHeight: 20 },
  aiBubble: { padding: 10, paddingHorizontal: 14, borderRadius: 18, borderTopLeftRadius: 4, borderWidth: 0.5 },
  aiBubbleText: { fontSize: 14, lineHeight: 20 },
  replanCard: { borderRadius: 16, overflow: 'hidden', backgroundColor: 'rgba(95,160,255,0.06)', borderWidth: 0.5 },
  replanHeader: { padding: 12, paddingHorizontal: 14, borderBottomWidth: 0.5, flexDirection: 'row', alignItems: 'center', gap: 8 },
  replanTitle: { fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', fontWeight: '600', flex: 1 },
  replanMeta: { fontSize: 11 },
  diffSym: { width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  diffSymText: { fontSize: 11, fontWeight: '700' },
  diffText: { fontSize: 13, flex: 1 },
  applyBtn: { flex: 1, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  applyBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  tweakBtn: { height: 36, paddingHorizontal: 14, borderRadius: 18, borderWidth: 0.5, alignItems: 'center', justifyContent: 'center' },
  tweakBtnText: { fontSize: 13 },
  pickerCard: { borderRadius: 18, overflow: 'hidden', borderWidth: 0.5 },
  pickerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, padding: 4, paddingTop: 0 },
  pickerItem: { width: '48%', aspectRatio: 1, borderRadius: 12, overflow: 'hidden', position: 'relative' },
  selectedRing: { ...StyleSheet.absoluteFill, borderRadius: 12, borderWidth: 3 },
  heartBtn: { position: 'absolute', top: 6, right: 6, width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.18)' },
  heartGrad: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  pickerInfo: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 8, paddingHorizontal: 10 },
  pickerName: { fontSize: 12, fontWeight: '700', color: '#fff', letterSpacing: -0.2 },
  pickerMeta: { fontSize: 10, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  bookBtn: { flex: 1, height: 36, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  moreBtn: { height: 36, paddingHorizontal: 12, borderRadius: 18, borderWidth: 0.5, alignItems: 'center', justifyContent: 'center' },
  moreBtnText: { fontSize: 12 },
  suggestions: { borderTopWidth: 0.5, maxHeight: 54 },
  suggestionChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 99, backgroundColor: 'rgba(95,160,255,0.08)', borderWidth: 0.5, borderColor: 'rgba(95,160,255,0.20)' },
  suggestionText: { fontSize: 12, fontWeight: '500' },
  inputDock: { borderTopWidth: 0.5, paddingTop: 8, paddingHorizontal: 14, paddingBottom: 8 },
  inputSideBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 0.5, alignItems: 'center', justifyContent: 'center' },
  inputField: { flex: 1, height: 44, borderRadius: 22, borderWidth: 0.5, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14 },
  inputPlaceholder: { flex: 1, fontSize: 14 },
});
