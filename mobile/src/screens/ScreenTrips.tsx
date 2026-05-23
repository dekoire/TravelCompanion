import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, Image, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/ThemeContext';
import { PHOTOS, SIRI_LINEAR_COLORS } from '../theme';
import Ico from '../components/Ico';
import AIOrb from '../components/AIOrb';

interface Props {
  onNewTrip?: () => void;
  onOpenTrip?: (id: string) => void;
  onShare?: () => void;
  onEditPlan?: () => void;
}

const TRIPS = [
  { id: 'kyoto',   name: 'Kyoto, for two',  country: 'Japan',     dates: 'Apr 4 – Apr 10', img: PHOTOS.kyotoHero,   status: 'active',   progress: 3, total: 7, travelers: [PHOTOS.user1, PHOTOS.user2, PHOTOS.user3] },
  { id: 'lisbon',  name: 'Lisbon weekend',  country: 'Portugal',  dates: 'Jun 12 – Jun 15', img: 'https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=900&q=80&auto=format&fit=crop', status: 'upcoming', travelers: [PHOTOS.user1] },
  { id: 'oaxaca',  name: 'Oaxaca food',     country: 'Mexico',    dates: 'Sep 2023',         img: 'https://images.unsplash.com/photo-1518105779142-d975f22f1b0a?w=900&q=80&auto=format&fit=crop', status: 'past',     travelers: [PHOTOS.user1, PHOTOS.user2] },
  { id: 'iceland', name: 'Reykjavik loop',  country: 'Iceland',   dates: 'Jul 2022',         img: 'https://images.unsplash.com/photo-1539634936668-b8c44e0e1fbe?w=900&q=80&auto=format&fit=crop', status: 'past',     travelers: [PHOTOS.user1, PHOTOS.user2, PHOTOS.user3] },
  { id: 'patag',   name: 'Patagonia trek',  country: 'Argentina', dates: 'Draft',            img: 'https://images.unsplash.com/photo-1531793272258-0cc8c0a6b0e6?w=900&q=80&auto=format&fit=crop', status: 'draft',    travelers: [PHOTOS.user1, PHOTOS.user2] },
];

const FILTERS = [
  { l: 'All', c: 8, sel: true },
  { l: 'Active', c: 1 },
  { l: 'Upcoming', c: 1 },
  { l: 'Past', c: 5 },
  { l: 'Drafts', c: 1 },
];

export default function ScreenTrips({ onNewTrip, onOpenTrip, onShare }: Props) {
  const { palette: p } = useTheme();
  const [selectedFilter, setSelectedFilter] = useState(0);
  const featured = TRIPS.find(t => t.status === 'active');
  const others = TRIPS.filter(t => t.status !== 'active');

  return (
    <View style={[styles.container, { backgroundColor: p.bg }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 }}>
        <SafeAreaView edges={['top']}>
          {/* Header */}
          <View style={{ paddingHorizontal: 22, paddingTop: 8, paddingBottom: 8 }}>
            <Text style={[styles.kicker, { color: p.accent }]}>Your trips</Text>
            <Text style={[styles.bigTitle, { color: p.text }]}>8 journeys</Text>
          </View>
        </SafeAreaView>

        {/* New Trip CTA */}
        <View style={{ paddingHorizontal: 16, paddingVertical: 14 }}>
          <Pressable onPress={onNewTrip}>
            <LinearGradient colors={[...SIRI_LINEAR_COLORS]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.newTripBtn}>
              <View style={styles.newTripIcon}>
                <Ico name="plus" size={24} c="#fff" sw={2.5} />
              </View>
              <View style={{ flex: 1, alignItems: 'flex-start' }}>
                <Text style={styles.newTripTitle}>Plan a new trip</Text>
                <Text style={styles.newTripSub}>Tell me where & I'll build the rest in 6 seconds</Text>
              </View>
              <Ico name="arrow" size={22} c="#fff" sw={2.5} />
            </LinearGradient>
          </Pressable>
        </View>

        {/* Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }} contentContainerStyle={{ paddingHorizontal: 22, gap: 6 }}>
          {FILTERS.map((f, i) => (
            <Pressable key={i} onPress={() => setSelectedFilter(i)} style={[styles.filterChip, { backgroundColor: i === selectedFilter ? p.accent : p.dark ? 'rgba(255,255,255,0.04)' : 'rgba(27,18,64,0.04)', borderColor: i === selectedFilter ? p.accent : p.line }]}>
              <Text style={[styles.filterLabel, { color: i === selectedFilter ? '#fff' : p.text }]}>{f.l} </Text>
              <Text style={[styles.filterCount, { color: i === selectedFilter ? 'rgba(255,255,255,0.7)' : p.textMuted }]}>{f.c}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Featured active card */}
        {featured && (
          <View style={{ paddingHorizontal: 16, paddingBottom: 14 }}>
            <Pressable onPress={() => onOpenTrip?.(featured.id)} style={[styles.featuredCard, { borderColor: p.accent + '55' }]}>
              <View style={{ height: 200 }}>
                <Image source={{ uri: featured.img }} style={styles.featuredImg} resizeMode="cover" />
                <LinearGradient colors={['rgba(11,10,24,0.4)', 'transparent', 'rgba(11,10,24,0.85)']} locations={[0, 0.3, 1]} style={StyleSheet.absoluteFill} />

                {/* Live badge */}
                <View style={styles.liveBadge}>
                  <View style={[styles.liveDot, { backgroundColor: '#7EE7B6' }]} />
                  <Text style={styles.liveText}>Traveling now</Text>
                </View>

                {/* Travelers */}
                <Pressable onPress={onShare} style={styles.travelersBtn}>
                  <View style={{ flexDirection: 'row' }}>
                    {[PHOTOS.user1, PHOTOS.user2, PHOTOS.user3].map((src, i) => (
                      <Image key={i} source={{ uri: src }} style={[styles.travelerAvatar, { marginLeft: i === 0 ? 0 : -8 }]} />
                    ))}
                  </View>
                  <Text style={styles.travelersCount}>3</Text>
                </Pressable>

                {/* Title */}
                <View style={styles.featuredTitleBlock}>
                  <Text style={styles.featuredCountry}>{featured.country} · {featured.dates}</Text>
                  <Text style={styles.featuredName}>{featured.name}</Text>
                  {/* Progress */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 }}>
                    <View style={styles.progressBg}>
                      <LinearGradient colors={[...SIRI_LINEAR_COLORS]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ width: `${(featured.progress / featured.total) * 100}%`, height: '100%' }} />
                    </View>
                    <Text style={styles.progressText}>{featured.progress} / {featured.total}</Text>
                  </View>
                </View>
              </View>
            </Pressable>
          </View>
        )}

        {/* Grid */}
        <View style={styles.grid}>
          {others.map(t => (
            <Pressable key={t.id} onPress={() => onOpenTrip?.(t.id)} style={[styles.gridCard, { backgroundColor: p.surface, borderColor: p.line }]}>
              <View style={{ height: 110, position: 'relative' }}>
                <Image source={{ uri: t.img }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                {t.status === 'past' && <View style={styles.pastOverlay} />}
                {t.status === 'draft' && (
                  <View style={styles.gridBadge}>
                    <Text style={styles.gridBadgeText}>Draft</Text>
                  </View>
                )}
                {t.status === 'upcoming' && (
                  <View style={[styles.gridBadge, { backgroundColor: p.accent }]}>
                    <Text style={styles.gridBadgeText}>Soon</Text>
                  </View>
                )}
              </View>
              <View style={{ padding: 10, paddingBottom: 12 }}>
                <Text style={[styles.gridCardName, { color: p.text }]}>{t.name}</Text>
                <Text style={[styles.gridCardMeta, { color: p.textMuted }]}>{t.country} · {t.dates}</Text>
                {t.travelers && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                    <View style={{ flexDirection: 'row' }}>
                      {t.travelers.slice(0, 3).map((src, i) => (
                        <Image key={i} source={{ uri: src }} style={[styles.gridAvatar, { marginLeft: i === 0 ? 0 : -6, borderColor: p.surface }]} />
                      ))}
                    </View>
                    <Text style={[styles.gridAvatarMeta, { color: p.textMuted }]}>{t.travelers.length === 1 ? 'Solo' : `${t.travelers.length} traveling`}</Text>
                  </View>
                )}
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  kicker: { fontSize: 11, letterSpacing: 1.8, textTransform: 'uppercase', fontWeight: '600' },
  bigTitle: { fontSize: 36, lineHeight: 40, letterSpacing: -1.2, marginTop: 6, fontWeight: '600' },
  newTripBtn: { borderRadius: 20, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 14 },
  newTripIcon: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.3)' },
  newTripTitle: { color: '#fff', fontSize: 17, fontWeight: '600', letterSpacing: -0.3 },
  newTripSub: { color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 2 },
  filterChip: { paddingHorizontal: 13, paddingVertical: 7, borderRadius: 14, borderWidth: 0.5, flexDirection: 'row', alignItems: 'center' },
  filterLabel: { fontSize: 12, fontWeight: '600' },
  filterCount: { fontSize: 10, fontWeight: '500' },
  featuredCard: { borderRadius: 22, overflow: 'hidden', borderWidth: 0.5 },
  featuredImg: { ...StyleSheet.absoluteFillObject },
  liveBadge: { position: 'absolute', top: 14, left: 14, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 99, backgroundColor: 'rgba(11,10,24,0.4)', borderWidth: 0.5, borderColor: 'rgba(126,231,182,0.3)' },
  liveDot: { width: 6, height: 6, borderRadius: 3 },
  liveText: { fontSize: 10, color: '#7EE7B6', letterSpacing: 1.4, textTransform: 'uppercase', fontWeight: '600' },
  travelersBtn: { position: 'absolute', top: 12, right: 12, height: 32, paddingHorizontal: 4, borderRadius: 16, backgroundColor: 'rgba(11,10,24,0.55)', flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.22)' },
  travelerAvatar: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: 'rgba(11,10,24,0.85)' },
  travelersCount: { fontSize: 10, color: '#fff', fontWeight: '700', paddingHorizontal: 4 },
  featuredTitleBlock: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 18, paddingTop: 0 },
  featuredCountry: { fontSize: 11, color: 'rgba(255,255,255,0.75)', letterSpacing: 1.2, textTransform: 'uppercase', fontWeight: '600' },
  featuredName: { fontSize: 28, color: '#fff', fontWeight: '600', letterSpacing: -0.6, marginTop: 4, lineHeight: 32 },
  progressBg: { flex: 1, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.18)', overflow: 'hidden' },
  progressText: { fontSize: 11, color: 'rgba(255,255,255,0.85)', fontWeight: '500' },
  grid: { paddingHorizontal: 16, flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  gridCard: { width: '47.5%', borderRadius: 16, overflow: 'hidden', borderWidth: 0.5 },
  pastOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(11,10,24,0.35)' },
  gridBadge: { position: 'absolute', top: 8, left: 8, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 4, backgroundColor: 'rgba(11,10,24,0.6)' },
  gridBadgeText: { fontSize: 9, color: '#fff', letterSpacing: 1.2, textTransform: 'uppercase', fontWeight: '600' },
  gridCardName: { fontSize: 14, fontWeight: '600', letterSpacing: -0.2, lineHeight: 18 },
  gridCardMeta: { fontSize: 11, marginTop: 3 },
  gridAvatar: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5 },
  gridAvatarMeta: { fontSize: 10, marginLeft: 6, fontWeight: '500' },
});
