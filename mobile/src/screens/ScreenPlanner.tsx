import React, { useState } from 'react';
import { View, Text, Pressable, Image, ScrollView, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/ThemeContext';
import { PHOTOS, SIRI_LINEAR_COLORS, DAY3 } from '../theme';
import Ico from '../components/Ico';
import AIOrb from '../components/AIOrb';

interface PlanItem {
  id: string;
  time: string;
  dur: string;
  title: string;
  img: string;
  area: string;
  crowd: 'low' | 'medium' | 'high';
}

interface PlanDay {
  label: string;
  date: string;
  name: string;
  weather: string;
  items: PlanItem[];
}

interface Props {
  onClose?: () => void;
}

function seedPlan(): PlanDay[] {
  const P = PHOTOS;
  return [
    { label: 'D1', date: 'Apr 4', name: 'Arrival', weather: '☀ 18°', items: [
      { id: 'd1a', time: '15:00', dur: '1h', title: 'Hotel check-in · Granbell', img: P.gion, area: 'Gion', crowd: 'low' },
      { id: 'd1b', time: '17:30', dur: '1h 30m', title: 'Sunset walk · Yasaka', img: P.street, area: 'Gion', crowd: 'medium' },
      { id: 'd1c', time: '19:30', dur: '2h', title: 'Ramen at Ippudo', img: P.ramen, area: 'Gion', crowd: 'medium' },
    ]},
    { label: 'D2', date: 'Apr 5', name: 'East Kyoto', weather: '☁ 16°', items: [
      { id: 'd2a', time: '08:30', dur: '2h', title: 'Kiyomizu-dera at dawn', img: P.fushimi, area: 'Higashiyama', crowd: 'low' },
      { id: 'd2b', time: '11:00', dur: '1h 30m', title: "Philosopher's Path", img: P.philosopher, area: 'Higashiyama', crowd: 'low' },
      { id: 'd2c', time: '13:00', dur: '1h', title: 'Matcha at Ippodo', img: P.matcha, area: 'Nakagyo', crowd: 'low' },
      { id: 'd2d', time: '15:00', dur: '2h', title: 'Ginkaku-ji silver pavilion', img: P.kinkakuji, area: 'Sakyo', crowd: 'medium' },
    ]},
    { label: 'D3', date: 'Apr 6', name: 'Bamboo & Gold', weather: '⛅ 19°', items: DAY3.map(a => ({ id: a.id, time: a.time, dur: a.dur, title: a.title, img: a.img, area: a.area, crowd: a.crowd })) },
    { label: 'D4', date: 'Apr 7', name: 'Geisha District', weather: '☀ 21°', items: [
      { id: 'd4a', time: '11:00', dur: '2h', title: 'Tea ceremony · Camellia', img: P.matcha, area: 'Gion', crowd: 'low' },
      { id: 'd4b', time: '15:00', dur: '2h', title: 'Pontocho alley wander', img: P.street, area: 'Pontocho', crowd: 'low' },
      { id: 'd4c', time: '18:00', dur: '2h 30m', title: 'Geisha-watching dinner', img: P.sushi, area: 'Gion', crowd: 'medium' },
    ]},
    { label: 'D5', date: 'Apr 8', name: 'Day trip Nara', weather: '☀ 22°', items: [
      { id: 'd5a', time: '08:00', dur: '1h', title: 'Train to Nara', img: P.street, area: 'Nara', crowd: 'medium' },
      { id: 'd5b', time: '10:00', dur: '3h', title: 'Todai-ji + deer park', img: P.temple, area: 'Nara', crowd: 'high' },
      { id: 'd5c', time: '14:00', dur: '1h 30m', title: 'Lunch · Wakakusa', img: P.ramen, area: 'Nara', crowd: 'medium' },
    ]},
    { label: 'D6', date: 'Apr 9', name: 'Hidden Kyoto', weather: '🌦 17°', items: [
      { id: 'd6a', time: '10:00', dur: '2h', title: 'Pottery studio · Kawai', img: P.garden, area: 'Gojo', crowd: 'low' },
      { id: 'd6b', time: '14:00', dur: '2h', title: 'Hosen-in moss garden', img: P.garden, area: 'Ohara', crowd: 'low' },
    ]},
    { label: 'D7', date: 'Apr 10', name: 'Slow morning', weather: '☀ 20°', items: [
      { id: 'd7a', time: '09:00', dur: '2h', title: 'River walk + breakfast', img: P.matcha, area: 'Pontocho', crowd: 'low' },
      { id: 'd7b', time: '12:00', dur: '2h', title: 'Train to airport', img: P.street, area: 'Kansai', crowd: 'medium' },
    ]},
  ];
}

function PlanRow({ item, isFirst, isLast, onMoveUp, onMoveDown, onRemove }: {
  item: PlanItem; isFirst: boolean; isLast: boolean;
  onMoveUp: () => void; onMoveDown: () => void; onRemove: () => void;
}) {
  const { palette: p } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.planRowWrap}>
      <View style={styles.dragCol}>
        <Pressable onPress={onMoveUp} disabled={isFirst} style={[styles.tinyBtn, { opacity: isFirst ? 0.25 : 0.7 }]}>
          <Ico name="arrowUp" size={11} c={p.textMuted} sw={2.5} />
        </Pressable>
        <View style={styles.dragHandle}>
          {[0, 1, 2].map(r => (
            <View key={r} style={styles.dragRow}>
              <View style={[styles.dragDot, { backgroundColor: p.textDim }]} />
              <View style={[styles.dragDot, { backgroundColor: p.textDim }]} />
            </View>
          ))}
        </View>
        <Pressable onPress={onMoveDown} disabled={isLast} style={[styles.tinyBtn, { opacity: isLast ? 0.25 : 0.7 }]}>
          <Ico name="arrowUp" size={11} c={p.textMuted} sw={2.5} />
        </Pressable>
      </View>
      <View style={[styles.planCard, { backgroundColor: p.surface, borderColor: p.line }]}>
        <Pressable onPress={() => setOpen(!open)} style={styles.planCardInner}>
          <View style={styles.planTimeCol}>
            <Text style={[styles.planTime, { color: p.text }]}>{item.time}</Text>
            <Text style={[styles.planDur, { color: p.textDim }]}>{item.dur}</Text>
          </View>
          <Image source={{ uri: item.img }} style={styles.planThumb} resizeMode="cover" />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[styles.planTitle, { color: p.text }]} numberOfLines={1}>{item.title}</Text>
            <Text style={[styles.planArea, { color: p.textMuted }]}>{item.area} · {item.crowd}</Text>
          </View>
          <Ico name={open ? 'minus' : 'arrow'} size={14} c={p.textDim} />
        </Pressable>
        {open && (
          <View style={[styles.planActions, { borderTopColor: p.line }]}>
            {[
              { label: 'Move time', icon: 'clock' },
              { label: 'Prev day', icon: 'arrowLeft' },
              { label: 'Next day', icon: 'arrow' },
              { label: 'Replace with AI', icon: 'sparkle' },
            ].map((a, i) => (
              <Pressable key={i} style={[styles.planActionBtn, { backgroundColor: 'rgba(255,255,255,0.04)', borderColor: p.line }]}>
                <Ico name={a.icon as any} size={12} c={p.accent} />
                <Text style={[styles.planActionText, { color: p.text }]}>{a.label}</Text>
              </Pressable>
            ))}
            <Pressable onPress={onRemove} style={[styles.planActionBtn, { backgroundColor: 'rgba(255,110,140,0.10)', borderColor: 'rgba(255,110,140,0.27)' }]}>
              <Ico name="close" size={12} c={p.danger} />
              <Text style={[styles.planActionText, { color: p.danger }]}>Remove</Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

function DayBlock({ day, di, onMove, onRemove }: {
  day: PlanDay; di: number;
  onMove: (idx: number, delta: number) => void;
  onRemove: (idx: number) => void;
}) {
  const { palette: p } = useTheme();
  return (
    <View style={styles.dayBlock}>
      <View style={styles.dayBlockHeader}>
        <View>
          <Text style={[styles.dayBlockKicker, { color: p.accent }]}>{day.label} · {day.date}</Text>
          <Text style={[styles.dayBlockName, { color: p.text }]}>{day.name}</Text>
        </View>
        <View style={{ flex: 1 }} />
        <Text style={[styles.dayBlockMeta, { color: p.textMuted }]}>{day.weather} · {day.items.length} stops</Text>
        <Pressable style={styles.addDayBtn}>
          <LinearGradient colors={[...SIRI_LINEAR_COLORS]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.addDayBtnGrad}>
            <Ico name="plus" size={16} c="#fff" sw={2.5} />
          </LinearGradient>
        </Pressable>
      </View>
      <View style={{ gap: 6 }}>
        {day.items.map((item, idx) => (
          <PlanRow
            key={item.id}
            item={item}
            isFirst={idx === 0}
            isLast={idx === day.items.length - 1}
            onMoveUp={() => onMove(idx, -1)}
            onMoveDown={() => onMove(idx, 1)}
            onRemove={() => onRemove(idx)}
          />
        ))}
        {day.items.length === 0 && (
          <View style={[styles.emptyDay, { borderColor: p.line }]}>
            <Text style={[styles.emptyDayText, { color: p.textMuted }]}>Empty day — tap + to add something</Text>
          </View>
        )}
      </View>
    </View>
  );
}

export default function ScreenPlanner({ onClose }: Props) {
  const { palette: p } = useTheme();
  const [days, setDays] = useState<PlanDay[]>(() => seedPlan());
  const [edits, setEdits] = useState(0);

  const total = days.reduce((sum, d) => sum + d.items.length, 0);

  const move = (di: number, idx: number, delta: number) => {
    setDays(prev => {
      const next = prev.map(d => ({ ...d, items: [...d.items] }));
      const items = next[di].items;
      const j = idx + delta;
      if (j < 0 || j >= items.length) return prev;
      [items[idx], items[j]] = [items[j], items[idx]];
      return next;
    });
    setEdits(e => e + 1);
  };

  const remove = (di: number, idx: number) => {
    setDays(prev => {
      const next = prev.map(d => ({ ...d, items: [...d.items] }));
      next[di].items.splice(idx, 1);
      return next;
    });
    setEdits(e => e + 1);
  };

  return (
    <View style={[styles.container, { backgroundColor: p.bg }]}>
      {/* Sticky header */}
      <View style={[styles.stickyHeader, { backgroundColor: p.dark ? 'rgba(7,12,28,0.96)' : 'rgba(234,241,255,0.96)', borderBottomColor: p.line }]}>
        <Pressable onPress={onClose} style={[styles.closeBtn, { backgroundColor: p.dark ? 'rgba(255,255,255,0.06)' : 'rgba(15,30,80,0.05)', borderColor: p.line }]}>
          <Ico name="close" size={16} c={p.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerKicker, { color: p.accent }]}>Edit week</Text>
          <Text style={[styles.headerSub, { color: p.text }]}>{total} stops · {edits > 0 ? `${edits} unsaved changes` : 'all synced'}</Text>
        </View>
        <Pressable onPress={onClose}>
          <LinearGradient colors={[...SIRI_LINEAR_COLORS]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.doneBtn}>
            <Text style={styles.doneBtnText}>Done</Text>
          </LinearGradient>
        </Pressable>
      </View>

      {/* AI balance prompt */}
      <View style={styles.aiPromptWrap}>
        <Pressable style={[styles.aiPrompt, { backgroundColor: p.accentSoft, borderColor: p.accent + '55' }]}>
          <AIOrb size={22} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.aiPromptTitle, { color: p.accent }]}>Auto-balance the week</Text>
            <Text style={[styles.aiPromptSub, { color: p.textMuted }]}>I'll smooth out walking, weather, and crowd levels.</Text>
          </View>
          <Ico name="sparkle" size={16} c={p.accent} />
        </Pressable>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
        {days.map((day, di) => (
          <DayBlock
            key={di}
            day={day}
            di={di}
            onMove={(idx, delta) => move(di, idx, delta)}
            onRemove={(idx) => remove(di, idx)}
          />
        ))}

        <View style={styles.addDayWrap}>
          <Pressable style={[styles.addExtraDay, { borderColor: p.line }]}>
            <Ico name="plus" size={16} c={p.textMuted} />
            <Text style={[styles.addExtraDayText, { color: p.textMuted }]}>Add an extra day</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  stickyHeader: { paddingTop: 56, paddingHorizontal: 16, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 0.5 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 0.5, alignItems: 'center', justifyContent: 'center' },
  headerKicker: { fontSize: 11, letterSpacing: 1.6, textTransform: 'uppercase', fontWeight: '700' },
  headerSub: { fontSize: 16, fontWeight: '600', marginTop: 2 },
  doneBtn: { paddingHorizontal: 16, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  doneBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  aiPromptWrap: { padding: 14, paddingTop: 14, paddingBottom: 0 },
  aiPrompt: { padding: 12, paddingHorizontal: 14, borderRadius: 16, borderWidth: 0.5, borderStyle: 'dashed', flexDirection: 'row', alignItems: 'center', gap: 12 },
  aiPromptTitle: { fontSize: 12, fontWeight: '700', letterSpacing: 0.4 },
  aiPromptSub: { fontSize: 11, marginTop: 1 },
  dayBlock: { padding: 14, paddingHorizontal: 16, paddingBottom: 4 },
  dayBlockHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingBottom: 10, paddingHorizontal: 4 },
  dayBlockKicker: { fontSize: 10, letterSpacing: 1.4, textTransform: 'uppercase', fontWeight: '700' },
  dayBlockName: { fontSize: 17, fontWeight: '600', marginTop: 2, letterSpacing: -0.3 },
  dayBlockMeta: { fontSize: 11 },
  addDayBtn: { width: 30, height: 30, borderRadius: 15, overflow: 'hidden' },
  addDayBtnGrad: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  planRowWrap: { flexDirection: 'row', alignItems: 'stretch', gap: 6 },
  dragCol: { flexDirection: 'column', alignItems: 'center', gap: 2, paddingVertical: 6, paddingHorizontal: 2, flexShrink: 0 },
  tinyBtn: { width: 20, height: 20, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  dragHandle: { flexDirection: 'column', justifyContent: 'space-evenly', alignItems: 'center', width: 14, height: 18 },
  dragRow: { flexDirection: 'row', gap: 2 },
  dragDot: { width: 2.5, height: 2.5, borderRadius: 1.25 },
  planCard: { flex: 1, borderRadius: 14, overflow: 'hidden', borderWidth: 0.5 },
  planCardInner: { padding: 10, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  planTimeCol: { width: 36, alignItems: 'center', flexShrink: 0 },
  planTime: { fontSize: 11, fontWeight: '600' },
  planDur: { fontSize: 9, marginTop: 1 },
  planThumb: { width: 38, height: 38, borderRadius: 9, flexShrink: 0 },
  planTitle: { fontSize: 13, fontWeight: '600', lineHeight: 16 },
  planArea: { fontSize: 10, marginTop: 2 },
  planActions: { padding: 4, paddingHorizontal: 12, paddingBottom: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 6, borderTopWidth: 0.5 },
  planActionBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 99, borderWidth: 0.5, flexDirection: 'row', alignItems: 'center', gap: 4 },
  planActionText: { fontSize: 11, fontWeight: '600' },
  emptyDay: { padding: 14, borderRadius: 14, borderWidth: 1.5, borderStyle: 'dashed', alignItems: 'center' },
  emptyDayText: { fontSize: 12, fontStyle: 'italic' },
  addDayWrap: { padding: 8, paddingHorizontal: 16 },
  addExtraDay: { padding: 14, borderRadius: 16, borderWidth: 1.5, borderStyle: 'dashed', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  addExtraDayText: { fontSize: 13, fontWeight: '500' },
});
