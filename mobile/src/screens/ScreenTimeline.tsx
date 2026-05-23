import React, { useState } from 'react';
import {
  View, Text, ScrollView, Pressable, Image, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/ThemeContext';
import { TRIP, DAY3, PHOTOS, SIRI_LINEAR_COLORS, ActivityItem } from '../theme';
import Ico from '../components/Ico';
import AIOrb from '../components/AIOrb';
import WeatherStrip from '../components/WeatherStrip';
import TransportChip from '../components/TransportChip';

interface Props {
  onOpenLocation?: (a: ActivityItem) => void;
  onOpenChat?: () => void;
  onOpenMap?: () => void;
  onOpenTransport?: (a: ActivityItem) => void;
  onEditPlan?: () => void;
  onShare?: () => void;
  currentDay?: number;
}

function CrowdBars({ level }: { level: string }) {
  const { palette: p } = useTheme();
  const heights = [4, 7, 10];
  const filled = level === 'low' ? 1 : level === 'medium' ? 2 : 3;
  const c = level === 'high' ? p.danger : level === 'medium' ? p.amber : p.green;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2 }}>
      {heights.map((h, i) => (
        <View key={i} style={{ width: 3, height: h, borderRadius: 1, backgroundColor: i < filled ? c : p.dark ? 'rgba(255,255,255,0.15)' : 'rgba(27,18,64,0.14)' }} />
      ))}
    </View>
  );
}

export default function ScreenTimeline({ onOpenLocation, onOpenChat, onOpenMap, onOpenTransport, onEditPlan, currentDay = 3 }: Props) {
  const { palette: p } = useTheme();
  const [showBanner, setShowBanner] = useState(true);

  const day = TRIP.days[currentDay - 1];
  const items = DAY3;
  const livePos = 1;
  const next = items[livePos];
  const past = items.slice(0, livePos);
  const upcoming = items.slice(livePos + 1);

  return (
    <View style={[styles.container, { backgroundColor: p.bg }]}>
      {/* Top bar */}
      <View style={[styles.topBar, { backgroundColor: p.dark ? 'rgba(7,12,28,0.96)' : 'rgba(234,241,255,0.96)', borderBottomColor: p.line }]}>
        <SafeAreaView edges={['top']}>
          <View style={styles.topBarInner}>
            <View>
              <Text style={[styles.kicker, { color: p.accent }]}>Kyoto · {day.date}</Text>
              <Text style={[styles.dayTitle, { color: p.text }]}>{day.name}</Text>
            </View>
            <Pressable onPress={onOpenMap} style={[styles.iconBtn, { backgroundColor: p.dark ? 'rgba(255,255,255,0.08)' : 'rgba(27,18,64,0.05)', borderColor: p.line }]}>
              <Ico name="map" size={18} c={p.text} />
            </Pressable>
          </View>
          {/* Day switcher */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.daySwitcher} contentContainerStyle={{ gap: 6, paddingHorizontal: 22 }}>
            {TRIP.days.map((d, i) => {
              const sel = i === currentDay - 1;
              const isPast = i < currentDay - 1;
              return (
                <View key={i} style={[styles.dayChip, { backgroundColor: sel ? p.accent : p.dark ? 'rgba(255,255,255,0.04)' : 'rgba(27,18,64,0.04)', borderColor: sel ? p.accent : p.line }]}>
                  <Text style={[styles.dayChipLabel, { color: sel ? '#fff' : isPast ? p.textDim : p.text, opacity: sel ? 0.85 : 0.6 }]}>{d.label.replace('Day ', 'D')}</Text>
                  <Text style={[styles.dayChipDate, { color: sel ? '#fff' : isPast ? p.textDim : p.text }]}>{d.date.split(' ')[1]}</Text>
                </View>
              );
            })}
          </ScrollView>
        </SafeAreaView>
      </View>

      {/* Content */}
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Weather strip */}
        <View style={{ paddingHorizontal: 16, paddingBottom: 14 }}>
          <WeatherStrip />
        </View>

        {/* NEXT UP hero */}
        <View style={{ paddingHorizontal: 16, paddingBottom: 18 }}>
          <View style={[styles.nextUpKicker]}>
            <View style={[styles.greenDot, { backgroundColor: p.green }]} />
            <Text style={[styles.nextUpLabel, { color: p.accent }]}>NEXT UP · in 42 min</Text>
          </View>

          <Pressable onPress={() => onOpenLocation?.(next)} style={[styles.heroCard, { backgroundColor: p.surface, borderColor: p.accent + '30' }]}>
            {/* Hero photo */}
            <View style={{ height: 240, position: 'relative' }}>
              <Image source={{ uri: next.img }} style={StyleSheet.absoluteFill} resizeMode="cover" />
              <LinearGradient
                colors={['rgba(11,10,24,0.45)', 'transparent', 'rgba(11,10,24,0.85)']}
                locations={[0, 0.35, 1]}
                style={StyleSheet.absoluteFill}
              />
              {/* Top badges */}
              <View style={styles.heroBadges}>
                <View style={[styles.glassPill, { borderColor: 'rgba(255,255,255,0.22)' }]}>
                  <Ico name="clock" size={12} c="#fff" />
                  <Text style={{ color: '#fff', fontSize: 11, fontWeight: '500' }}> {next.time} · {next.dur}</Text>
                </View>
                <LinearGradient colors={[...SIRI_LINEAR_COLORS]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.nextBadge}>
                  <Ico name="sparkle" size={11} c="#fff" sw={2.5} />
                  <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700', letterSpacing: 1.4 }}> NEXT</Text>
                </LinearGradient>
              </View>
              {/* Title overlay */}
              <View style={styles.heroTitleBlock}>
                <Text style={styles.heroArea}>{next.area} · {next.tag}</Text>
                <Text style={styles.heroTitle}>{next.title}</Text>
              </View>
            </View>

            {/* Info strip */}
            <View style={[styles.infoStrip, { borderBottomColor: p.line }]}>
              <View style={styles.infoCell}>
                <Text style={[styles.infoCellLabel, { color: p.textDim }]}>Crowd</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <CrowdBars level={next.crowd} />
                  <Text style={[styles.infoCellValue, { color: p.text }]}>{next.crowd}</Text>
                </View>
              </View>
              <View style={[styles.infoCell, styles.infoCellBorder, { borderLeftColor: p.line }]}>
                <Text style={[styles.infoCellLabel, { color: p.textDim }]}>Weather</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <Ico name="sun" size={13} c={p.amber} />
                  <Text style={[styles.infoCellValue, { color: p.text }]}>19° sunny</Text>
                </View>
              </View>
              <View style={[styles.infoCell, styles.infoCellBorder, { borderLeftColor: p.line }]}>
                <Text style={[styles.infoCellLabel, { color: p.textDim }]}>Rating</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <Ico name="star" size={13} c={p.amber} />
                  <Text style={[styles.infoCellValue, { color: p.text }]}>{next.rating}</Text>
                </View>
              </View>
            </View>

            {/* CTA row */}
            <View style={styles.ctaRow}>
              <LinearGradient colors={[...SIRI_LINEAR_COLORS]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.ctaMain}>
                <Ico name="route" size={16} c="#fff" sw={2.2} />
                <Text style={styles.ctaMainText}>Get directions</Text>
              </LinearGradient>
              <Pressable onPress={() => onOpenTransport?.(next)} style={[styles.ctaSecondary, { backgroundColor: p.dark ? 'rgba(255,255,255,0.06)' : 'rgba(27,18,64,0.04)', borderColor: p.line }]}>
                <Ico name="taxi" size={14} c={p.accent} />
                <Text style={[styles.ctaSecondaryText, { color: p.text }]}>{next.transport.dur}</Text>
              </Pressable>
            </View>
          </Pressable>
        </View>

        {/* Rest of today */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: p.accent }]}>Rest of today · {upcoming.length} stops</Text>
          <Pressable onPress={onEditPlan} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ico name="plus" size={11} c={p.accent} sw={2.5} />
            <Text style={{ fontSize: 11, color: p.accent, fontWeight: '600' }}>Edit plan</Text>
          </Pressable>
        </View>

        <View style={{ paddingLeft: 78, paddingRight: 16, paddingTop: 6 }}>
          <View style={[styles.timelineRail, { backgroundColor: p.accent + '66' }]} />
          {upcoming.map((it, i) => (
            <View key={it.id} style={{ marginBottom: 16 }}>
              {/* Time column */}
              <View style={styles.timeColumn}>
                <Text style={[styles.timeText, { color: p.text }]}>{it.time}</Text>
                <Text style={[styles.durText, { color: p.textDim }]}>{it.dur}</Text>
              </View>
              {/* Rail dot */}
              <View style={[styles.railDot, { backgroundColor: it.status === 'at-risk' ? p.danger : it.status === 'suggestion' ? p.pink : p.accent, borderColor: p.bg }]} />
              {/* Card */}
              <Pressable
                onPress={() => onOpenLocation?.(it)}
                style={[styles.upcomingCard, {
                  backgroundColor: it.status === 'at-risk' ? p.dark ? 'rgba(255,110,140,0.10)' : 'rgba(230,78,112,0.06)' : p.surface,
                  borderColor: it.status === 'at-risk' ? p.danger + '55' : p.line,
                }]}
              >
                <Image source={{ uri: it.img }} style={styles.upcomingImg} resizeMode="cover" />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                    {it.status === 'booked' && (
                      <View style={[styles.statusBadge, { backgroundColor: 'rgba(126,231,182,0.14)' }]}>
                        <Text style={{ fontSize: 9, color: p.green, fontWeight: '700', letterSpacing: 1 }}>BOOKED</Text>
                      </View>
                    )}
                    {it.status === 'suggestion' && (
                      <LinearGradient colors={[...SIRI_LINEAR_COLORS]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.statusBadge}>
                        <Text style={{ fontSize: 9, color: '#fff', fontWeight: '700', letterSpacing: 1 }}>AI PICK</Text>
                      </LinearGradient>
                    )}
                    {it.status === 'at-risk' && (
                      <View style={[styles.statusBadge, { backgroundColor: p.danger }]}>
                        <Text style={{ fontSize: 9, color: '#fff', fontWeight: '700', letterSpacing: 1 }}>AT RISK</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.upcomingTitle, { color: it.status === 'at-risk' ? p.textMuted : p.text }]} numberOfLines={1}>{it.title}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                    <Text style={[styles.upcomingMeta, { color: p.textMuted }]}>{it.area}</Text>
                    <Text style={{ color: p.textMuted, opacity: 0.4 }}>·</Text>
                    <CrowdBars level={it.crowd} />
                    <Text style={{ color: p.textMuted, opacity: 0.4 }}>·</Text>
                    <Ico name="star" size={10} c={p.amber} />
                    <Text style={[styles.upcomingMeta, { color: p.textMuted }]}>{it.rating}</Text>
                  </View>
                </View>
                <Ico name="arrow" size={14} c={p.textDim} />
              </Pressable>

              {/* At-risk AI suggestion */}
              {it.issue && (
                <View style={[styles.atRiskBox, { backgroundColor: p.dark ? 'rgba(11,17,38,0.85)' : 'rgba(255,255,255,0.9)', borderColor: p.danger + '44' }]}>
                  <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
                    <View style={[styles.warningDot, { backgroundColor: p.danger }]}>
                      <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14, lineHeight: 14 }}>!</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.warningTitle, { color: p.danger }]}>Probably won't work</Text>
                      <Text style={[styles.warningBody, { color: p.text }]}>{it.issue.label}</Text>
                    </View>
                  </View>
                  {/* AI suggestion preview */}
                  <Pressable style={[styles.suggestionCard, { backgroundColor: p.dark ? 'rgba(10,132,255,0.10)' : 'rgba(0,122,255,0.06)', borderColor: p.accent + '44' }]}>
                    <Image source={{ uri: PHOTOS.garden }} style={styles.suggestionImg} resizeMode="cover" />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={[styles.suggestionLabel, { color: p.accent }]}>AI suggests instead</Text>
                      <Text style={[styles.suggestionTitle, { color: p.text }]} numberOfLines={1}>Hosen-in · moss garden</Text>
                      <Text style={[styles.suggestionMeta, { color: p.textMuted }]}>Indoor · 12 min taxi · ★ 4.8</Text>
                    </View>
                    <Ico name="arrow" size={14} c={p.accent} />
                  </Pressable>
                  {/* Action row */}
                  <View style={{ flexDirection: 'row', gap: 6, marginTop: 10 }}>
                    <LinearGradient colors={[...SIRI_LINEAR_COLORS]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.swapBtn}>
                      <Ico name="check" size={13} c="#fff" sw={2.5} />
                      <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>Swap automatically</Text>
                    </LinearGradient>
                    <Pressable style={[styles.keepBtn, { borderColor: p.line }]}>
                      <Text style={[styles.keepBtnText, { color: p.textMuted }]}>Keep</Text>
                    </Pressable>
                  </View>
                </View>
              )}

              {/* Transport chip between items */}
              {i < upcoming.length - 1 && (
                <View style={{ marginTop: 8, marginLeft: 4 }}>
                  <TransportChip
                    mode={upcoming[i + 1].transport.mode}
                    dur={upcoming[i + 1].transport.dur}
                    detail={upcoming[i + 1].transport.line || upcoming[i + 1].transport.cost}
                    onPress={() => onOpenTransport?.(upcoming[i + 1])}
                  />
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Earlier today */}
        {past.length > 0 && (
          <View style={{ paddingHorizontal: 22, paddingTop: 8 }}>
            <Text style={[styles.sectionTitle, { color: p.textMuted, marginBottom: 8 }]}>Earlier today · {past.length}</Text>
            {past.map(it => (
              <View key={it.id} style={[styles.pastRow, { opacity: 0.55 }]}>
                <Image source={{ uri: it.img }} style={styles.pastImg} resizeMode="cover" />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.pastTitle, { color: p.text }]} numberOfLines={1}>{it.title}</Text>
                  <Text style={[styles.pastTime, { color: p.textMuted }]}>{it.time}</Text>
                </View>
                <Ico name="check" size={12} c={p.green} sw={2.2} />
              </View>
            ))}
          </View>
        )}

        {/* Tomorrow preview */}
        <View style={{ padding: 16, paddingTop: 14 }}>
          <View style={[styles.tomorrowBox, { borderColor: p.accent + '55', backgroundColor: p.accentSoft }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <AIOrb size={18} />
              <Text style={[styles.tomorrowLabel, { color: p.accent }]}>Tomorrow's preview</Text>
            </View>
            <Text style={[styles.tomorrowText, { color: p.text }]}>
              Light rain rolls in around 11 — I've moved the rooftop tea ceremony to morning and queued an indoor pottery studio for the afternoon.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Bottom AI banner */}
      {showBanner && (
        <View style={[styles.banner, { backgroundColor: p.dark ? 'rgba(24,23,52,0.9)' : 'rgba(255,255,255,0.92)', borderColor: p.accent + '55' }]}>
          <Pressable onPress={onOpenChat} style={styles.bannerContent}>
            <AIOrb size={24} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.bannerLabel, { color: p.accent }]}>Companion · 1 update</Text>
              <Text style={[styles.bannerText, { color: p.text }]}>Crowds dropping at Kinkaku-ji — swap order?</Text>
            </View>
            <Ico name="arrow" size={18} c={p.accent} />
          </Pressable>
          <Pressable onPress={() => setShowBanner(false)} style={[styles.bannerClose, { backgroundColor: p.dark ? 'rgba(255,255,255,0.06)' : 'rgba(15,30,80,0.05)', borderColor: p.line }]}>
            <Ico name="close" size={12} c={p.textMuted} sw={2.5} />
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, borderBottomWidth: 0.5 },
  topBarInner: { paddingHorizontal: 22, paddingBottom: 8, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  kicker: { fontSize: 11, letterSpacing: 1.8, textTransform: 'uppercase', fontWeight: '600' },
  dayTitle: { fontSize: 28, lineHeight: 32, letterSpacing: -0.8, marginTop: 4, fontWeight: '600' },
  iconBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 0.5, alignItems: 'center', justifyContent: 'center' },
  daySwitcher: { paddingVertical: 14, paddingBottom: 8 },
  dayChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, borderWidth: 0.5, minWidth: 54, alignItems: 'center' },
  dayChipLabel: { fontSize: 10, fontWeight: '500', letterSpacing: 0.8, textTransform: 'uppercase' },
  dayChipDate: { fontSize: 13, fontWeight: '600', marginTop: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingTop: 200, paddingBottom: 120 },
  nextUpKicker: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 6, paddingBottom: 10 },
  greenDot: { width: 8, height: 8, borderRadius: 4 },
  nextUpLabel: { fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', fontWeight: '700' },
  heroCard: { borderRadius: 28, overflow: 'hidden', borderWidth: 1 },
  heroBadges: { position: 'absolute', top: 14, left: 14, right: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  glassPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(7,12,28,0.55)', borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 0.5 },
  nextBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 11, paddingVertical: 6, borderRadius: 99 },
  heroTitleBlock: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 18, paddingTop: 0 },
  heroArea: { fontSize: 11, color: 'rgba(255,255,255,0.7)', letterSpacing: 0.5, marginBottom: 4 },
  heroTitle: { fontSize: 24, lineHeight: 28, letterSpacing: -0.6, color: '#fff', fontWeight: '600' },
  infoStrip: { padding: 14, flexDirection: 'row', gap: 10, borderBottomWidth: 0.5 },
  infoCell: { flex: 1 },
  infoCellBorder: { paddingLeft: 14, borderLeftWidth: 0.5 },
  infoCellLabel: { fontSize: 9, letterSpacing: 1.2, textTransform: 'uppercase', fontWeight: '600', marginBottom: 3 },
  infoCellValue: { fontSize: 12, fontWeight: '500' },
  ctaRow: { padding: 12, paddingHorizontal: 14, flexDirection: 'row', gap: 8 },
  ctaMain: { flex: 1, height: 44, borderRadius: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  ctaMainText: { color: '#fff', fontSize: 14, fontWeight: '600', letterSpacing: -0.2 },
  ctaSecondary: { height: 44, paddingHorizontal: 14, borderRadius: 22, borderWidth: 0.5, flexDirection: 'row', alignItems: 'center', gap: 6 },
  ctaSecondaryText: { fontSize: 13, fontWeight: '500' },
  sectionHeader: { paddingHorizontal: 22, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', fontWeight: '600' },
  timelineRail: { position: 'absolute', left: -22, top: 14, bottom: 22, width: 1 },
  timeColumn: { position: 'absolute', left: -78, top: 14, width: 48, alignItems: 'flex-end' },
  timeText: { fontSize: 12, fontWeight: '600', letterSpacing: 0.2 },
  durText: { fontSize: 9, marginTop: 3 },
  railDot: { position: 'absolute', left: -22, top: 19, width: 8, height: 8, borderRadius: 4, borderWidth: 2 },
  upcomingCard: { borderRadius: 16, borderWidth: 0.5, flexDirection: 'row', gap: 12, alignItems: 'center', padding: 10, paddingHorizontal: 12 },
  upcomingImg: { width: 52, height: 52, borderRadius: 12 },
  upcomingTitle: { fontSize: 14, fontWeight: '600', lineHeight: 18 },
  upcomingMeta: { fontSize: 11 },
  statusBadge: { paddingHorizontal: 5, paddingVertical: 2, borderRadius: 3 },
  atRiskBox: { marginTop: 10, padding: 14, borderRadius: 16, borderWidth: 0.5 },
  warningDot: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  warningTitle: { fontSize: 11, letterSpacing: 1.3, textTransform: 'uppercase', fontWeight: '700', marginBottom: 3 },
  warningBody: { fontSize: 13, lineHeight: 18 },
  suggestionCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 13, borderWidth: 0.5 },
  suggestionImg: { width: 46, height: 46, borderRadius: 10 },
  suggestionLabel: { fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', fontWeight: '700', marginBottom: 2 },
  suggestionTitle: { fontSize: 13, fontWeight: '600', lineHeight: 18 },
  suggestionMeta: { fontSize: 10, marginTop: 2 },
  swapBtn: { flex: 1, height: 36, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  keepBtn: { height: 36, paddingHorizontal: 14, borderRadius: 18, borderWidth: 0.5, alignItems: 'center', justifyContent: 'center' },
  keepBtnText: { fontSize: 12, fontWeight: '500' },
  pastRow: { flexDirection: 'row', gap: 10, paddingVertical: 8, alignItems: 'center' },
  pastImg: { width: 36, height: 36, borderRadius: 10 },
  pastTitle: { fontSize: 12, fontWeight: '500' },
  pastTime: { fontSize: 10 },
  tomorrowBox: { padding: 14, borderRadius: 18, borderWidth: 0.5, borderStyle: 'dashed' },
  tomorrowLabel: { fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', fontWeight: '600' },
  tomorrowText: { fontSize: 13, lineHeight: 20 },
  banner: { position: 'absolute', bottom: 96, left: 16, right: 16, padding: 12, paddingHorizontal: 14, borderRadius: 18, borderWidth: 0.5, flexDirection: 'row', alignItems: 'center', gap: 12 },
  bannerContent: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  bannerLabel: { fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', fontWeight: '600' },
  bannerText: { fontSize: 13, marginTop: 1 },
  bannerClose: { width: 26, height: 26, borderRadius: 13, borderWidth: 0.5, alignItems: 'center', justifyContent: 'center' },
});
