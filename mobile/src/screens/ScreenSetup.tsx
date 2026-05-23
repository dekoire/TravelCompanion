import React, { useState, useRef } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/ThemeContext';
import { SIRI_LINEAR_COLORS } from '../theme';
import Ico from '../components/Ico';
import AIOrb from '../components/AIOrb';
import Pill from '../components/Pill';

interface Props {
  onComplete?: () => void;
  onBack?: () => void;
}

const STEPS = [
  { q: 'Where are you headed?', answer: 'Kyoto, Japan', chips: ['Kyoto, Japan', 'Lisbon', 'Mexico City', 'Reykjavik'] },
  { q: 'Beautiful. When are we going?', answer: 'Apr 4 – Apr 10', chips: ['This weekend', 'Apr 4 – Apr 10', 'Next month', 'Pick dates'] },
  { q: "Who's coming with you?", answer: 'With my partner', chips: ['Solo', 'With my partner', 'Friends', 'Family'] },
  { q: "What's the vibe? Pick a few.", answer: ['Hidden gems', 'Local food', 'Romantic', 'Slow mornings'], chips: ['Hidden gems', 'Local food', 'Romantic', 'Adventure', 'Slow mornings', 'Nightlife', 'Museums', 'Hiking'], multi: true },
  { q: 'How much energy do you want each day?', answer: 'Balanced — a few things, room to wander', chips: ['Easy', 'Balanced', 'Packed'] },
];

export default function ScreenSetup({ onComplete, onBack }: Props) {
  const { palette: p } = useTheme();
  const [step, setStep] = useState(2);
  const [selected, setSelected] = useState<string>(STEPS[2].chips[1]);
  const [multi, setMulti] = useState<string[]>([]);
  const scrollRef = useRef<ScrollView>(null);

  const next = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
      setSelected(STEPS[step + 1].chips[1]);
      setMulti([]);
    } else {
      onComplete?.();
    }
  };

  const current = STEPS[step];

  return (
    <View style={[styles.container, { backgroundColor: p.bg }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={onBack} style={[styles.backBtn, { backgroundColor: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.1)' }]}>
          <Ico name="arrowLeft" size={18} c={p.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={[styles.stepLabel, { color: p.accent }]}>Planning · Question {step + 1} of {STEPS.length}</Text>
          <Text style={[styles.stepDest, { color: 'rgba(255,255,255,0.55)' }]}>Kyoto, Japan</Text>
        </View>
        <Pressable>
          <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>Skip</Text>
        </Pressable>
      </View>

      {/* Progress dots */}
      <View style={styles.progressRow}>
        {STEPS.map((_, i) => (
          <View key={i} style={[styles.progressDot, { flex: 1, backgroundColor: i <= step ? p.accent : 'rgba(255,255,255,0.10)' }]} />
        ))}
      </View>

      {/* Conversation scroll */}
      <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={{ padding: 22, paddingTop: 20, paddingBottom: 12 }} showsVerticalScrollIndicator={false}>
        {STEPS.slice(0, step).map((s, i) => (
          <View key={i} style={{ marginBottom: 20 }}>
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
              <AIOrb size={20} pulse={false} />
              <Text style={[styles.pastQ, { color: 'rgba(244,241,236,0.55)' }]}>{s.q}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 6 }}>
              {Array.isArray(s.answer)
                ? s.answer.map((a, j) => <Pill key={j} tone="accent" size="md">{a}</Pill>)
                : <Pill tone="accent" size="md">{s.answer}</Pill>
              }
            </View>
          </View>
        ))}

        {/* Current question */}
        <View style={{ marginTop: 8, marginBottom: 20 }}>
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14, alignItems: 'flex-start' }}>
            <View style={{ paddingTop: 4 }}>
              <AIOrb size={28} />
            </View>
            <Text style={[styles.currentQ, { color: p.text }]}>{current.q}</Text>
          </View>
        </View>

        {/* Chips */}
        <View style={styles.chipsWrap}>
          {current.chips.map((chip, i) => {
            const isSel = current.multi ? multi.includes(chip) : selected === chip;
            return (
              <Pressable key={i} onPress={() => {
                if (current.multi) {
                  setMulti(m => m.includes(chip) ? m.filter(c => c !== chip) : [...m, chip]);
                } else {
                  setSelected(chip);
                }
              }} style={[styles.chip, { backgroundColor: isSel ? p.accent : 'rgba(255,255,255,0.04)', borderColor: isSel ? p.accent : 'rgba(255,255,255,0.12)' }]}>
                <Text style={[styles.chipText, { color: isSel ? '#fff' : p.text }]}>
                  {isSel && current.multi ? '✓ ' : ''}{chip}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      {/* Bottom dock */}
      <View style={[styles.dock, { borderTopColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(10,10,18,0.6)' }]}>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <View style={[styles.inputField, { borderColor: 'rgba(255,255,255,0.1)' }]}>
            <Ico name="chat" size={16} c="rgba(255,255,255,0.45)" />
            <Text style={[styles.inputPlaceholder, { color: 'rgba(255,255,255,0.45)' }]}>or type your answer…</Text>
            <Ico name="mic" size={16} c={p.accent} />
          </View>
          <Pressable onPress={next} style={[styles.nextBtn, { backgroundColor: p.accent }]}>
            <Ico name="arrow" size={20} c="#fff" sw={2} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 56, paddingHorizontal: 22, flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 0.5, alignItems: 'center', justifyContent: 'center' },
  stepLabel: { fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', fontWeight: '600' },
  stepDest: { fontSize: 13, marginTop: 2 },
  progressRow: { flexDirection: 'row', gap: 4, paddingHorizontal: 22, paddingTop: 14 },
  progressDot: { height: 2, borderRadius: 1 },
  pastQ: { flex: 1, fontSize: 15, lineHeight: 22 },
  currentQ: { flex: 1, fontSize: 30, lineHeight: 36, letterSpacing: -0.4, paddingTop: 2 },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  chip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 99, borderWidth: 0.5 },
  chipText: { fontSize: 13, fontWeight: '500', letterSpacing: -0.1 },
  dock: { padding: 12, paddingHorizontal: 16, paddingBottom: 34, borderTopWidth: 0.5 },
  inputField: { flex: 1, height: 48, borderRadius: 24, borderWidth: 0.5, backgroundColor: 'rgba(255,255,255,0.06)', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 10 },
  inputPlaceholder: { flex: 1, fontSize: 14 },
  nextBtn: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
});
