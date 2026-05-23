import React, { useState } from 'react';
import { View, Text, Pressable, Image, ScrollView, StyleSheet, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Rect, Line, Path, Circle, Text as SvgText, Polyline, Defs, LinearGradient as SvgLinear, Stop, Filter, FeGaussianBlur } from 'react-native-svg';
import { useTheme } from '../theme/ThemeContext';
import { DAY3, PHOTOS, ActivityItem } from '../theme';
import Ico from '../components/Ico';
import AIOrb from '../components/AIOrb';

interface Props {
  onOpenLocation?: (a: ActivityItem) => void;
  onOpenChat?: () => void;
  onClose?: () => void;
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

export default function ScreenMap({ onOpenLocation, onOpenChat, onClose }: Props) {
  const { palette: p } = useTheme();
  const [selected, setSelected] = useState<string | null>(null);
  const items = DAY3;
  const cur = items.find(it => it.id === selected) || null;

  const { width: W, height: H } = Dimensions.get('window');
  const isDark = p.dark;

  const route = items.map(it => `${it.pos.x * W},${it.pos.y * H}`).join(' ');

  const chromeBg = isDark ? 'rgba(26,26,38,0.7)' : 'rgba(255,255,255,0.82)';
  const sheetBg = isDark ? 'rgba(20,20,32,0.88)' : 'rgba(255,255,255,0.92)';
  const dim = isDark ? 'rgba(255,255,255,0.5)' : p.textMuted;

  return (
    <View style={[styles.container, { backgroundColor: p.bg }]}>
      {/* SVG Map */}
      <Svg width={W} height={H} style={StyleSheet.absoluteFill} viewBox={`0 0 ${W} ${H}`}>
        <Defs>
          <SvgLinear id="mapBg" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={isDark ? '#13131F' : '#DCE6FF'} />
            <Stop offset="100%" stopColor={isDark ? '#06060C' : '#B6CDF7'} />
          </SvgLinear>
          <SvgLinear id="routeGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor={p.accent} stopOpacity="0.9" />
            <Stop offset="100%" stopColor={p.sky} stopOpacity="0.8" />
          </SvgLinear>
        </Defs>
        <Rect width={W} height={H} fill="url(#mapBg)" />
        {[...Array(20)].map((_, i) => (
          <Line key={`v${i}`} x1={i * (W / 20)} y1="0" x2={i * (W / 20)} y2={H} stroke={isDark ? 'rgba(255,255,255,0.025)' : 'rgba(15,30,80,0.05)'} strokeWidth="1" />
        ))}
        {[...Array(40)].map((_, i) => (
          <Line key={`h${i}`} x1="0" y1={i * (H / 40)} x2={W} y2={i * (H / 40)} stroke={isDark ? 'rgba(255,255,255,0.025)' : 'rgba(15,30,80,0.05)'} strokeWidth="1" />
        ))}
        {/* River */}
        <Path d={`M ${W * 0.62} 0 C ${W * 0.60} ${H * 0.23}, ${W * 0.70} ${H * 0.40}, ${W * 0.65} ${H * 0.57} S ${W * 0.60} ${H * 0.86}, ${W * 0.62} ${H}`} stroke={isDark ? 'rgba(95,208,255,0.18)' : 'rgba(10,132,255,0.35)'} strokeWidth="14" fill="none" strokeLinecap="round" />
        {/* Roads */}
        <Path d={`M 0 ${H * 0.34} L ${W} ${H * 0.34}`} stroke={isDark ? 'rgba(255,255,255,0.05)' : 'rgba(15,30,80,0.10)'} strokeWidth="1.5" fill="none" />
        <Path d={`M 0 ${H * 0.57} L ${W} ${H * 0.57}`} stroke={isDark ? 'rgba(255,255,255,0.05)' : 'rgba(15,30,80,0.10)'} strokeWidth="1.5" fill="none" />
        <Path d={`M ${W * 0.37} 0 L ${W * 0.37} ${H}`} stroke={isDark ? 'rgba(255,255,255,0.05)' : 'rgba(15,30,80,0.10)'} strokeWidth="1.5" fill="none" />
        {/* District labels */}
        <SvgText x={W * 0.18} y={H * 0.28} fill={isDark ? 'rgba(255,255,255,0.18)' : 'rgba(15,30,80,0.32)'} fontSize="9" fontWeight="500" letterSpacing="2" textAnchor="middle">ARASHIYAMA</SvgText>
        <SvgText x={W * 0.75} y={H * 0.43} fill={isDark ? 'rgba(255,255,255,0.18)' : 'rgba(15,30,80,0.32)'} fontSize="9" fontWeight="500" letterSpacing="2" textAnchor="middle">HIGASHIYAMA</SvgText>
        <SvgText x={W * 0.50} y={H * 0.20} fill={isDark ? 'rgba(255,255,255,0.18)' : 'rgba(15,30,80,0.32)'} fontSize="9" fontWeight="500" letterSpacing="2" textAnchor="middle">KITA</SvgText>
        {/* Route */}
        <Polyline points={route} stroke="url(#routeGrad)" strokeWidth="8" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.35" />
        <Polyline points={route} stroke="url(#routeGrad)" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        {/* You are here */}
        <Circle cx={W * 0.45} cy={H * 0.46} r="9" fill="#5FD0FF" opacity="0.4" />
        <Circle cx={W * 0.45} cy={H * 0.46} r="5" fill="#5FD0FF" />
        <Circle cx={W * 0.45} cy={H * 0.46} r="2" fill="#fff" />
      </Svg>

      {/* Pins */}
      {items.map((it) => {
        const x = it.pos.x * W;
        const y = it.pos.y * H;
        const sel = it.id === selected;
        const pinSize = sel ? 52 : 38;
        return (
          <Pressable
            key={it.id}
            onPress={() => setSelected(it.id)}
            style={[styles.pin, { left: x - pinSize / 2, top: y - pinSize, zIndex: sel ? 6 : 5 }]}
          >
            <View style={[styles.pinImg, { width: pinSize, height: pinSize, borderRadius: pinSize / 2, borderColor: sel ? p.accent : '#fff', borderWidth: sel ? 2 : 2 }]}>
              <Image source={{ uri: it.img }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            </View>
            <View style={[styles.pinTip, { backgroundColor: sel ? p.accent : '#fff' }]} />
            <Text style={[styles.pinTime, { color: sel ? p.accent : dim }]}>{it.time}</Text>
          </Pressable>
        );
      })}

      {/* Top controls */}
      <SafeAreaView edges={['top']} style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 8 }}>
        <View style={[styles.topControls]}>
          <View style={[styles.searchBar, { backgroundColor: chromeBg, borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(15,30,80,0.10)' }]}>
            <Ico name="compass" size={16} c={dim} />
            <Text style={[styles.searchPlaceholder, { color: dim }]}>Search Kyoto or ask AI…</Text>
          </View>
          <Pressable onPress={onClose} style={[styles.controlBtn, { backgroundColor: chromeBg, borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(15,30,80,0.10)' }]}>
            <Ico name="layers" size={18} c={p.text} />
          </Pressable>
        </View>
      </SafeAreaView>

      {/* Bottom sheet */}
      <View style={[styles.sheet, { backgroundColor: sheetBg, borderTopColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(15,30,80,0.08)' }]}>
        <View style={[styles.sheetHandle, { backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(15,30,80,0.18)' }]} />
        {!cur ? (
          <>
            <View style={{ paddingHorizontal: 18, paddingBottom: 10, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <View>
                <Text style={[styles.sheetKicker, { color: p.accent }]}>Day 3 · route</Text>
                <Text style={[styles.sheetTitle, { color: p.text }]}>{items.length} stops</Text>
              </View>
              <Text style={[styles.sheetMeta, { color: dim }]}>{items[0].time}–{items[items.length - 1].time}</Text>
            </View>
            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 6, gap: 6 }}>
              {items.map((it, i) => (
                <Pressable key={it.id} onPress={() => setSelected(it.id)} style={[styles.routeRow, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(15,30,80,0.03)', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(15,30,80,0.08)' }]}>
                  <View style={[styles.routeNum, { backgroundColor: i === 1 ? p.accent : isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,30,80,0.08)' }]}>
                    <Text style={[styles.routeNumText, { color: i === 1 ? '#fff' : p.text }]}>{i + 1}</Text>
                  </View>
                  <Image source={{ uri: it.img }} style={styles.routeImg} resizeMode="cover" />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.routeMeta, { color: dim }]}>{it.time} · {it.area}</Text>
                    <Text style={[styles.routeTitle, { color: p.text }]} numberOfLines={1}>{it.title}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 }}>
                      <Ico name="star" size={9} c={p.amber} />
                      <Text style={[styles.routeRating, { color: dim }]}>{it.rating}</Text>
                      <Text style={{ color: dim, opacity: 0.4 }}>·</Text>
                      <CrowdBars level={it.crowd} />
                    </View>
                  </View>
                  <Ico name="arrow" size={13} c={dim} />
                </Pressable>
              ))}
            </ScrollView>
          </>
        ) : (
          <>
            <View style={{ paddingHorizontal: 18, paddingBottom: 12, flexDirection: 'row', gap: 12, alignItems: 'center' }}>
              <Pressable onPress={() => setSelected(null)} style={[styles.backBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,30,80,0.05)', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(15,30,80,0.08)' }]}>
                <Ico name="arrowLeft" size={14} c={p.text} />
              </Pressable>
              <Image source={{ uri: cur.img }} style={styles.detailImg} resizeMode="cover" />
              <View style={{ flex: 1 }}>
                <Text style={[styles.detailKicker, { color: p.accent }]}>{cur.time} · {cur.area}</Text>
                <Text style={[styles.detailTitle, { color: p.text }]} numberOfLines={1}>{cur.title}</Text>
                <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', marginTop: 4 }}>
                  <Ico name="star" size={11} c={p.accent} />
                  <Text style={[styles.detailRating, { color: dim }]}>{cur.rating}</Text>
                  <Text style={{ color: dim, opacity: 0.5 }}>·</Text>
                  <CrowdBars level={cur.crowd} />
                </View>
              </View>
              <Pressable onPress={() => onOpenLocation?.(cur)} style={[styles.openBtn, { backgroundColor: p.accent }]}>
                <Ico name="arrow" size={18} c="#fff" sw={2} />
              </Pressable>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 18, gap: 10, paddingBottom: 50 }}>
              {[
                { src: PHOTOS.matcha, t: 'Quiet matcha bar', d: '4 min', crowd: 'low' },
                { src: PHOTOS.garden, t: 'Moss garden', d: '8 min', crowd: 'low' },
                { src: PHOTOS.street, t: 'Pontocho alley', d: '14 min', crowd: 'medium' },
              ].map((n, i) => (
                <View key={i} style={[styles.nearbyCard, { backgroundColor: isDark ? '#1a1a26' : '#fff', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(15,30,80,0.08)' }]}>
                  <Image source={{ uri: n.src }} style={{ width: '100%', height: 76 }} resizeMode="cover" />
                  <View style={{ padding: 8, paddingHorizontal: 10 }}>
                    <Text style={[styles.nearbyTitle, { color: p.text }]}>{n.t}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 }}>
                      <Ico name="walk" size={10} c={dim} />
                      <Text style={[styles.nearbyMeta, { color: dim }]}>{n.d}</Text>
                      <View style={{ marginLeft: 'auto' as any }}>
                        <CrowdBars level={n.crowd} />
                      </View>
                    </View>
                  </View>
                </View>
              ))}
            </ScrollView>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  pin: { position: 'absolute', alignItems: 'center' },
  pinImg: { overflow: 'hidden' },
  pinTip: { width: 10, height: 10, marginTop: -2, transform: [{ rotate: '45deg' }] },
  pinTime: { fontSize: 10, marginTop: 8, fontWeight: '500' },
  topControls: { padding: 16, flexDirection: 'row', gap: 8, alignItems: 'center' },
  searchBar: { flex: 1, height: 44, borderRadius: 22, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 8, borderWidth: 0.5 },
  searchPlaceholder: { flex: 1, fontSize: 13 },
  controlBtn: { width: 44, height: 44, borderRadius: 22, borderWidth: 0.5, alignItems: 'center', justifyContent: 'center' },
  sheet: { position: 'absolute', bottom: 0, left: 0, right: 0, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTopWidth: 0.5, paddingTop: 8, paddingBottom: 50, maxHeight: '58%' },
  sheetHandle: { width: 38, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 12 },
  sheetKicker: { fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', fontWeight: '600' },
  sheetTitle: { fontSize: 19, fontWeight: '600', marginTop: 2, letterSpacing: -0.3 },
  sheetMeta: { fontSize: 11 },
  routeRow: { padding: 8, paddingHorizontal: 10, borderRadius: 12, borderWidth: 0.5, flexDirection: 'row', gap: 12, alignItems: 'center' },
  routeNum: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  routeNumText: { fontSize: 10, fontWeight: '700' },
  routeImg: { width: 44, height: 44, borderRadius: 10 },
  routeMeta: { fontSize: 10, letterSpacing: 0.4, marginBottom: 1 },
  routeTitle: { fontSize: 13, fontWeight: '600', lineHeight: 18 },
  routeRating: { fontSize: 10 },
  backBtn: { width: 32, height: 32, borderRadius: 16, borderWidth: 0.5, alignItems: 'center', justifyContent: 'center' },
  detailImg: { width: 56, height: 56, borderRadius: 14 },
  detailKicker: { fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', fontWeight: '600' },
  detailTitle: { fontSize: 19, lineHeight: 22, marginTop: 2 },
  detailRating: { fontSize: 11 },
  openBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  nearbyCard: { width: 130, borderRadius: 14, overflow: 'hidden', borderWidth: 0.5 },
  nearbyTitle: { fontSize: 12, fontWeight: '500', lineHeight: 16 },
  nearbyMeta: { fontSize: 10 },
});
