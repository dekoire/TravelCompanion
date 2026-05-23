import React, { useState } from 'react';
import { View, Text, Pressable, Image, ScrollView, StyleSheet, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/ThemeContext';
import { DAY3, PHOTOS, SIRI_LINEAR_COLORS, ActivityItem } from '../theme';
import Ico from '../components/Ico';
import AIOrb from '../components/AIOrb';

interface Props {
  activity?: ActivityItem;
  onClose?: () => void;
  onPost?: (data: { rating: number; reactions: string[]; publicPost: boolean }) => void;
}

const RATING_OPTIONS = [
  { v: 1, emoji: '😕', label: 'Skip' },
  { v: 2, emoji: '😐', label: 'Meh' },
  { v: 3, emoji: '🙂', label: 'Good' },
  { v: 4, emoji: '😍', label: 'Loved' },
  { v: 5, emoji: '🤩', label: 'Magic' },
];

const ALL_REACTIONS = [
  'Loved it', 'Worth it', 'Cozy vibe', 'Crowded',
  'Great service', 'Pricey', 'Hidden gem', 'Authentic',
  'Photo-worthy', 'Quick stop', 'Romantic', 'Touristy',
];

const PHOTO_PLACEHOLDERS = [PHOTOS.matcha, PHOTOS.street, null, null];

export default function ScreenReview({ activity, onClose, onPost }: Props) {
  const { palette: p } = useTheme();
  const a = activity || DAY3[0];
  const [rating, setRating] = useState(4);
  const [photos, setPhotos] = useState<(string | null)[]>(PHOTO_PLACEHOLDERS);
  const [reactions, setReactions] = useState<string[]>(['Cozy vibe', 'Worth it']);
  const [publicPost, setPublicPost] = useState(true);

  const togglePhoto = (i: number) => {
    const next = [...photos];
    if (next[i]) {
      next[i] = null;
    } else {
      next[i] = [PHOTOS.matcha, PHOTOS.ramen, PHOTOS.gion, PHOTOS.bambooGrove][i % 4];
    }
    setPhotos(next);
  };

  const toggleReaction = (r: string) => {
    setReactions(prev => prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r]);
  };

  return (
    <View style={[styles.container, { backgroundColor: p.bg }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: p.dark ? 'rgba(11,10,24,0.95)' : 'rgba(242,238,255,0.95)' }]}>
          <Pressable onPress={onClose} style={[styles.closeBtn, { backgroundColor: p.dark ? 'rgba(255,255,255,0.06)' : 'rgba(27,18,64,0.05)', borderColor: p.line }]}>
            <Ico name="close" size={16} c={p.text} />
          </Pressable>
          <Text style={[styles.headerLabel, { color: p.textMuted }]}>Reflect on your visit</Text>
          <Pressable onPress={() => onPost?.({ rating, reactions, publicPost })}>
            <LinearGradient colors={[...SIRI_LINEAR_COLORS]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.postBtn}>
              <Text style={styles.postBtnText}>Post</Text>
            </LinearGradient>
          </Pressable>
        </View>

        {/* Hero */}
        <View style={styles.hero}>
          <Image source={{ uri: a.img }} style={styles.heroThumb} resizeMode="cover" />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[styles.heroTime, { color: p.accent }]}>{a.time} · {a.area}</Text>
            <Text style={[styles.heroTitle, { color: p.text }]} numberOfLines={1}>{a.title}</Text>
          </View>
        </View>

        {/* AI prompt */}
        <View style={styles.aiPromptWrap}>
          <View style={[styles.aiPrompt, { backgroundColor: p.accentSoft, borderColor: p.accent + '33' }]}>
            <AIOrb size={24} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.aiPromptLabel, { color: p.accent }]}>How was it?</Text>
              <Text style={[styles.aiPromptText, { color: p.text }]}>
                Your notes help me tune the rest of the trip — and skip places you didn't love.
              </Text>
            </View>
          </View>
        </View>

        {/* Rating */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: p.accent }]}>Your rating</Text>
          <View style={styles.ratingRow}>
            {RATING_OPTIONS.map(r => {
              const s = rating === r.v;
              return (
                <Pressable key={r.v} onPress={() => setRating(r.v)} style={[styles.ratingBtn, {
                  backgroundColor: s ? p.accentSoft : p.dark ? 'rgba(255,255,255,0.03)' : 'rgba(27,18,64,0.03)',
                  borderColor: s ? p.accent : 'transparent',
                  borderWidth: 1.5,
                  transform: [{ scale: s ? 1.04 : 1 }],
                }]}>
                  <Text style={[styles.ratingEmoji, { opacity: s ? 1 : 0.55 }]}>{r.emoji}</Text>
                  <Text style={[styles.ratingLabel, { color: s ? p.accent : p.textMuted }]}>{r.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Photos */}
        <View style={styles.section}>
          <View style={styles.sectionRow}>
            <Text style={[styles.sectionLabel, { color: p.accent }]}>Photos · {photos.filter(Boolean).length} / 4</Text>
            <Pressable style={styles.cameraBtn}>
              <Ico name="plus" size={13} c={p.accent} />
              <Text style={[styles.cameraBtnText, { color: p.accent }]}>Camera</Text>
            </Pressable>
          </View>
          <View style={styles.photoGrid}>
            {photos.map((src, i) => (
              <Pressable key={i} onPress={() => togglePhoto(i)} style={[styles.photoSlot, {
                backgroundColor: src ? p.surface : p.dark ? 'rgba(255,255,255,0.04)' : 'rgba(27,18,64,0.04)',
                borderColor: src ? 'transparent' : p.line,
                borderWidth: 1.5,
                borderStyle: src ? 'solid' : 'dashed',
              }]}>
                {src ? (
                  <>
                    <Image source={{ uri: src }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                    <View style={styles.photoRemove}>
                      <Ico name="close" size={10} c="#fff" sw={2.5} />
                    </View>
                  </>
                ) : (
                  <Ico name="plus" size={20} c={p.textMuted} />
                )}
              </Pressable>
            ))}
          </View>
        </View>

        {/* Reactions */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: p.accent }]}>Quick tags</Text>
          <View style={styles.reactionsWrap}>
            {ALL_REACTIONS.map(r => {
              const s = reactions.includes(r);
              return (
                <Pressable key={r} onPress={() => toggleReaction(r)} style={[styles.reactionChip, {
                  backgroundColor: s ? p.accent : p.dark ? 'rgba(255,255,255,0.04)' : 'rgba(27,18,64,0.04)',
                  borderColor: s ? p.accent : p.line,
                }]}>
                  <Text style={[styles.reactionText, { color: s ? '#fff' : p.text }]}>{s ? '✓ ' : ''}{r}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Note */}
        <View style={styles.noteSection}>
          <Text style={[styles.sectionLabel, { color: p.accent }]}>Your note</Text>
          <View style={[styles.noteBox, { backgroundColor: p.surface, borderColor: p.line }]}>
            <Text style={[styles.noteText, { color: p.text }]}>
              Slow, quiet, and the matcha was unreal.{'\n'}The owner sat with us for a few minutes.{'\n'}Going back if we have time.
            </Text>
          </View>
        </View>

        {/* Share toggle */}
        <View style={{ paddingHorizontal: 22 }}>
          <View style={[styles.shareToggle, { backgroundColor: p.surface, borderColor: p.line }]}>
            <View style={[styles.shareIcon, { backgroundColor: publicPost ? undefined : p.dark ? 'rgba(255,255,255,0.06)' : 'rgba(27,18,64,0.05)' }]}>
              {publicPost ? (
                <LinearGradient colors={[...SIRI_LINEAR_COLORS]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
              ) : null}
              <Ico name="share" size={16} c={publicPost ? '#fff' : p.textMuted} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.shareTitle, { color: p.text }]}>{publicPost ? 'Share to Feed' : 'Private note'}</Text>
              <Text style={[styles.shareSub, { color: p.textMuted }]}>
                {publicPost ? 'Visible to other travelers in Kyoto' : 'Only you can see this'}
              </Text>
            </View>
            <Pressable onPress={() => setPublicPost(!publicPost)} style={[styles.toggle, { backgroundColor: publicPost ? p.accent : p.dark ? 'rgba(255,255,255,0.12)' : 'rgba(27,18,64,0.12)' }]}>
              <View style={[styles.toggleThumb, { left: publicPost ? 20 : 2 }]} />
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 56, paddingHorizontal: 16, paddingBottom: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 0.5, alignItems: 'center', justifyContent: 'center' },
  headerLabel: { flex: 1, fontSize: 13, fontWeight: '500' },
  postBtn: { paddingHorizontal: 14, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  postBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  hero: { paddingHorizontal: 22, paddingBottom: 4, paddingTop: 8, flexDirection: 'row', gap: 14, alignItems: 'center' },
  heroThumb: { width: 60, height: 60, borderRadius: 14, flexShrink: 0 },
  heroTime: { fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', fontWeight: '600' },
  heroTitle: { fontSize: 17, fontWeight: '600', lineHeight: 20, marginTop: 2 },
  aiPromptWrap: { padding: 16, paddingTop: 18, paddingBottom: 6 },
  aiPrompt: { padding: 14, borderRadius: 18, borderWidth: 0.5, flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  aiPromptLabel: { fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', fontWeight: '600', marginBottom: 4 },
  aiPromptText: { fontSize: 13, lineHeight: 19 },
  section: { paddingHorizontal: 22, paddingTop: 20, paddingBottom: 8 },
  sectionLabel: { fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', fontWeight: '600', marginBottom: 10 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  ratingRow: { flexDirection: 'row', gap: 8, justifyContent: 'space-between' },
  ratingBtn: { flex: 1, paddingVertical: 10, paddingHorizontal: 4, borderRadius: 14, alignItems: 'center' },
  ratingEmoji: { fontSize: 26, marginBottom: 2 },
  ratingLabel: { fontSize: 10, fontWeight: '600', letterSpacing: 0.3 },
  cameraBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cameraBtnText: { fontSize: 11, fontWeight: '500' },
  photoGrid: { flexDirection: 'row', gap: 6 },
  photoSlot: { flex: 1, aspectRatio: 1, borderRadius: 12, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  photoRemove: { position: 'absolute', top: 4, right: 4, width: 18, height: 18, borderRadius: 9, backgroundColor: 'rgba(11,10,24,0.7)', alignItems: 'center', justifyContent: 'center' },
  reactionsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  reactionChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 99, borderWidth: 0.5 },
  reactionText: { fontSize: 12, fontWeight: '500' },
  noteSection: { paddingHorizontal: 22, paddingTop: 14, paddingBottom: 8 },
  noteBox: { padding: 14, paddingHorizontal: 16, borderRadius: 18, minHeight: 80, borderWidth: 0.5 },
  noteText: { fontSize: 14, lineHeight: 21 },
  shareToggle: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, borderWidth: 0.5, marginTop: 10 },
  shareIcon: { width: 36, height: 36, borderRadius: 10, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  shareTitle: { fontSize: 13, fontWeight: '600' },
  shareSub: { fontSize: 11, marginTop: 2 },
  toggle: { width: 44, height: 26, borderRadius: 13, padding: 2 },
  toggleThumb: { position: 'absolute', top: 2, width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
});
