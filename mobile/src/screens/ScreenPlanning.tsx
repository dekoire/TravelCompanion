import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Image, StyleSheet, Animated } from 'react-native';
import Svg, { Path, Circle, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { useTheme } from '../theme/ThemeContext';
import { PHOTOS } from '../theme';
import Ico from '../components/Ico';
import AIOrb from '../components/AIOrb';

interface Props {
  onComplete?: () => void;
}

const LINES = [
  { t: 0, s: 'Reading your travel vibe…' },
  { t: 900, s: 'Pulling 217 places in Kyoto…' },
  { t: 1800, s: 'Matching against weather forecast…' },
  { t: 2700, s: 'Routing 7 days to minimize walking…' },
  { t: 3500, s: 'Reserving 4 restaurants…' },
  { t: 4200, s: 'Final touches…' },
];

const PHOTOS_LIST = [
  PHOTOS.bambooGrove, PHOTOS.kinkakuji,
  PHOTOS.gion, PHOTOS.sushi,
  PHOTOS.matcha, PHOTOS.fushimi,
];

const POSITIONS = [
  { x: 18, y: 6, rotate: '-8deg', scale: 0.9 },
  { x: 240, y: 30, rotate: '6deg', scale: 0.85 },
  { x: 60, y: 130, rotate: '4deg', scale: 0.95 },
  { x: 250, y: 160, rotate: '-5deg', scale: 0.8 },
  { x: 30, y: 270, rotate: '-3deg', scale: 0.9 },
  { x: 220, y: 260, rotate: '7deg', scale: 0.85 },
];

export default function ScreenPlanning({ onComplete }: Props) {
  const { palette: p } = useTheme();
  const [stageIdx, setStageIdx] = useState(0);
  const photoAnims = useRef(PHOTOS_LIST.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    const timers = LINES.map((l, i) => setTimeout(() => setStageIdx(i + 1), l.t));
    const done = setTimeout(() => onComplete?.(), 5400);

    PHOTOS_LIST.forEach((_, i) => {
      setTimeout(() => {
        Animated.timing(photoAnims[i], { toValue: 1, duration: 800, useNativeDriver: true }).start();
      }, i * 180);
    });

    return () => { timers.forEach(clearTimeout); clearTimeout(done); };
  }, []);

  const progress = (stageIdx / LINES.length) * 100;

  return (
    <View style={[styles.container, { backgroundColor: p.bg }]}>
      {/* Glow bg */}
      <View style={styles.glowBg} />

      {/* SVG route */}
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" opacity={0.55}>
        <Defs>
          <SvgLinearGradient id="planRoute" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor={p.accent} stopOpacity="0" />
            <Stop offset="50%" stopColor={p.accent} stopOpacity="0.9" />
            <Stop offset="100%" stopColor="#FF6E8C" stopOpacity="0.4" />
          </SvgLinearGradient>
        </Defs>
        <Path
          d="M 30 220 Q 110 140, 180 280 T 360 200 Q 320 380, 200 460 T 60 580 Q 200 640, 360 600"
          fill="none"
          stroke="url(#planRoute)"
          strokeWidth="2"
          strokeDasharray="6,6"
          strokeLinecap="round"
        />
        {[[30, 220], [180, 280], [360, 200], [200, 460], [60, 580], [360, 600]].map(([cx, cy], i) => (
          <Circle key={i} cx={cx} cy={cy} r="5" fill={p.accent} />
        ))}
      </Svg>

      {/* Floating photos */}
      <View style={styles.photosWrap}>
        {PHOTOS_LIST.map((src, i) => {
          const pos = POSITIONS[i];
          return (
            <Animated.View key={i} style={[styles.photoItem, {
              left: pos.x,
              top: pos.y,
              transform: [
                { rotate: pos.rotate },
                { scale: pos.scale },
              ],
              opacity: photoAnims[i],
            }]}>
              <Image source={{ uri: src }} style={StyleSheet.absoluteFill} resizeMode="cover" />
              <View style={styles.photoGrad} />
            </Animated.View>
          );
        })}
      </View>

      {/* Bottom panel */}
      <View style={styles.bottomPanel}>
        <View style={styles.orbRow}>
          <AIOrb size={36} />
          <View>
            <Text style={[styles.composingLabel, { color: p.accent }]}>Composing your trip</Text>
            <Text style={styles.composingSub}>this usually takes ~6 seconds</Text>
          </View>
        </View>

        <Text style={styles.bigText}>
          Composing a 7-day Kyoto for two — slow, romantic, full of hidden things.
        </Text>

        {/* Status lines */}
        <View style={styles.statusLines}>
          {LINES.map((l, i) => {
            const active = i === stageIdx - 1;
            const done = i < stageIdx - 1;
            const textColor = done ? 'rgba(255,255,255,0.4)' : active ? '#EEF2FF' : 'rgba(255,255,255,0.2)';
            return (
              <View key={i} style={[styles.statusLine, { opacity: i < stageIdx ? 1 : 0.2 }]}>
                <View style={[styles.statusDot, {
                  borderColor: done ? p.accent : 'rgba(255,255,255,0.2)',
                  backgroundColor: done ? p.accent : 'transparent',
                }]}>
                  {done && <Ico name="check" size={9} c="#fff" sw={3} />}
                  {active && <View style={[styles.statusPulse, { backgroundColor: p.accent }]} />}
                </View>
                <Text style={[styles.statusText, { color: textColor }]}>{l.s}</Text>
              </View>
            );
          })}
        </View>

        {/* Progress bar */}
        <View style={styles.progressBg}>
          <View style={[styles.progressFill, { width: `${progress}%` as any, backgroundColor: p.accent }]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden' },
  glowBg: { position: 'absolute', top: '20%', left: '10%', width: 300, height: 300, borderRadius: 150, backgroundColor: 'rgba(95,160,255,0.16)' },
  photosWrap: { position: 'absolute', top: 96, left: 0, right: 0, height: 360 },
  photoItem: { position: 'absolute', width: 110, height: 140, borderRadius: 14, overflow: 'hidden' },
  photoGrad: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.18)' },
  bottomPanel: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 28, paddingBottom: 50, paddingTop: 180, backgroundColor: 'transparent' },
  orbRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 22 },
  composingLabel: { fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', fontWeight: '600' },
  composingSub: { fontSize: 12, color: 'rgba(255,255,255,0.5)' },
  bigText: { fontFamily: undefined, fontSize: 32, lineHeight: 36, letterSpacing: -0.4, marginBottom: 24, color: '#EEF2FF' },
  statusLines: { gap: 8, marginBottom: 18 },
  statusLine: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusDot: { width: 14, height: 14, borderRadius: 7, borderWidth: 1, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  statusPulse: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 13 },
  progressBg: { height: 3, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
});
