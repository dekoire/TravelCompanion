import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, Image, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/ThemeContext';
import { PHOTOS, SIRI_LINEAR_COLORS } from '../theme';
import Ico from '../components/Ico';
import AIOrb from '../components/AIOrb';

interface Props {
  onCompose?: () => void;
  onOpenLocation?: () => void;
  onOpenChat?: () => void;
}

const STORIES = [
  { src: PHOTOS.user1, name: 'You' },
  { src: PHOTOS.user2, name: 'Theo' },
  { src: PHOTOS.user3, name: 'Yui' },
  { src: PHOTOS.fushimi, name: 'Aki' },
  { src: PHOTOS.gion, name: 'Ren' },
  { src: PHOTOS.bambooGrove, name: 'Lin' },
];

const POSTS = [
  { id: 1, author: 'Sofia Andrade', handle: '@sofiaandrade', avatar: PHOTOS.user1, where: 'Yoshimura · Arashiyama', dist: '40 m from you', photos: [PHOTOS.ramen, PHOTOS.matcha], caption: 'Found the udon place the algorithm kept hinting at. The broth is criminal. Bring cash, no English menu — point at the table next to yours and trust the AI.', time: '2h', likes: 412, comments: 23, saves: 188, tags: ['Hidden gem', 'Lunch', 'Cash only'] },
  { id: 2, author: 'Theo Park', handle: '@theopk', avatar: PHOTOS.user2, where: "Philosopher's Path · Higashiyama", dist: '1.2 km', photos: [PHOTOS.philosopher], caption: 'Went at 7am. Walked alone for an hour. Spotted three herons. 10/10 way to start a day.', time: '5h', likes: 1290, comments: 84, saves: 612, tags: ['Morning', 'Walk'] },
  { id: 3, kind: 'savedPlace', author: 'Companion', handle: 'AI suggestion based on 3 saves', where: 'Hosen-in · moss garden', dist: '4.1 km', photos: [PHOTOS.garden], caption: '3 people you follow have saved this in the last 24h. 12 visitors right now.' },
  { id: 4, author: 'Yui Mori', handle: '@yui.mori', avatar: PHOTOS.user3, where: 'Pontocho Alley · Gion', dist: '3.5 km', photos: [PHOTOS.gion, PHOTOS.sushi, PHOTOS.street], caption: 'Lantern season is the best season. Sake bar second from the left, the older couple running it will pour you something off-menu if you stay past 10.', time: '1d', likes: 2310, comments: 156, saves: 1024, tags: ['Night', 'Sake', 'Romantic'] },
];

const FILTERS = ['For you', 'Following', 'Nearby · 320m', 'Food', 'Hidden gems'];

function PostCard({ post, onOpenLocation }: { post: typeof POSTS[0]; onOpenLocation?: () => void }) {
  const { palette: p } = useTheme();
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const isAI = (post as any).kind === 'savedPlace';

  return (
    <View style={[styles.postCard, { backgroundColor: p.surface, borderColor: isAI ? p.accent + '33' : p.line }]}>
      {/* Author row */}
      <View style={{ padding: 12, paddingHorizontal: 14, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        {isAI ? <AIOrb size={36} halo /> : (
          <Image source={{ uri: (post as any).avatar }} style={styles.avatar} />
        )}
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={[styles.authorName, { color: p.text }]}>{post.author}</Text>
            {!isAI && <Text style={[styles.authorTime, { color: p.textMuted }]}>· {(post as any).time}</Text>}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1 }}>
            <Ico name="pin" size={11} c={p.accent} />
            <Text style={[styles.authorWhere, { color: p.textMuted }]}>{post.where} · {post.dist}</Text>
          </View>
        </View>
        {!isAI && (
          <Pressable style={[styles.followBtn, { borderColor: p.line }]}>
            <Text style={[styles.followBtnText, { color: p.text }]}>Follow</Text>
          </Pressable>
        )}
      </View>

      {/* Photos */}
      <View>
        {post.photos.length === 1 ? (
          <Image source={{ uri: post.photos[0] }} style={{ width: '100%', height: 320 }} resizeMode="cover" />
        ) : (
          <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
            {post.photos.map((src, i) => (
              <Image key={i} source={{ uri: src }} style={{ width: 375, height: 320 }} resizeMode="cover" />
            ))}
          </ScrollView>
        )}
        {!isAI && (
          <View style={styles.photoCount}>
            <Text style={{ fontSize: 10, color: '#fff' }}>1 / {post.photos.length}</Text>
          </View>
        )}
      </View>

      {/* Actions */}
      <View style={{ padding: 10, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Pressable onPress={() => setLiked(!liked)} style={[styles.actionBtn, { backgroundColor: liked ? 'rgba(255,119,200,0.16)' : p.dark ? 'rgba(255,255,255,0.04)' : 'rgba(27,18,64,0.04)', borderColor: liked ? p.pink + '55' : p.line }]}>
          <Ico name="heart" size={14} c={liked ? p.pink : p.text} />
          <Text style={[styles.actionBtnText, { color: liked ? p.pink : p.text }]}>{((post as any).likes || 0) + (liked ? 1 : 0)}</Text>
        </Pressable>
        <Pressable style={[styles.actionBtn, { backgroundColor: p.dark ? 'rgba(255,255,255,0.04)' : 'rgba(27,18,64,0.04)', borderColor: p.line }]}>
          <Ico name="chat" size={14} c={p.text} />
          <Text style={[styles.actionBtnText, { color: p.text }]}>{(post as any).comments || 0}</Text>
        </Pressable>
        <View style={{ flex: 1 }} />
        {!isAI && (
          <Pressable onPress={onOpenLocation} style={[styles.actionBtn, { backgroundColor: p.dark ? 'rgba(255,255,255,0.04)' : 'rgba(27,18,64,0.04)', borderColor: p.line }]}>
            <Ico name="pin" size={12} c={p.accent} />
            <Text style={[styles.actionBtnText, { color: p.text }]}>Map</Text>
          </Pressable>
        )}
        <Pressable onPress={() => setSaved(!saved)} style={[styles.iconBtn, { backgroundColor: saved ? p.accentSoft : p.dark ? 'rgba(255,255,255,0.04)' : 'rgba(27,18,64,0.04)', borderColor: saved ? p.accent : p.line }]}>
          <Ico name="plus" size={14} c={saved ? p.accent : p.text} />
        </Pressable>
      </View>

      {/* Caption + tags */}
      <View style={{ paddingHorizontal: 14, paddingTop: 10 }}>
        <Text style={[styles.caption, { color: p.text }]}>
          <Text style={{ fontWeight: '600' }}>{post.handle}</Text> {post.caption}
        </Text>
        {(post as any).tags && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 8 }}>
            {(post as any).tags.map((t: string, i: number) => (
              <View key={i} style={[styles.tagChip, { backgroundColor: p.dark ? 'rgba(255,255,255,0.04)' : 'rgba(27,18,64,0.04)', borderColor: p.line }]}>
                <Text style={[styles.tagText, { color: p.accent }]}>#{t}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Comment preview */}
      {!isAI && (post as any).comments > 0 && (
        <View style={{ paddingHorizontal: 14, paddingTop: 10 }}>
          <Pressable>
            <Text style={[styles.commentLink, { color: p.textMuted }]}>View all {(post as any).comments} comments</Text>
          </Pressable>
        </View>
      )}

      {/* Comment composer */}
      <View style={[styles.commentComposer, { margin: 12, marginTop: 12, backgroundColor: p.dark ? 'rgba(255,255,255,0.04)' : 'rgba(27,18,64,0.04)', borderColor: p.line }]}>
        <Image source={{ uri: PHOTOS.user1 }} style={styles.commentAvatar} />
        <Text style={[styles.commentPlaceholder, { color: p.textMuted }]}>Add a comment…</Text>
        <Text style={{ fontSize: 14, opacity: 0.5 }}>😍</Text>
        <Text style={{ fontSize: 14, opacity: 0.5 }}>📍</Text>
      </View>

      {isAI && (
        <View style={{ paddingHorizontal: 14, paddingBottom: 14 }}>
          <Pressable onPress={onOpenLocation}>
            <LinearGradient colors={[...SIRI_LINEAR_COLORS]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.addTripBtn}>
              <Ico name="sparkle" size={14} c="#fff" />
              <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>Add to today's trip</Text>
            </LinearGradient>
          </Pressable>
        </View>
      )}
    </View>
  );
}

export default function ScreenFeed({ onCompose, onOpenLocation, onOpenChat }: Props) {
  const { palette: p } = useTheme();
  const [selectedFilter, setSelectedFilter] = useState(0);

  return (
    <View style={[styles.container, { backgroundColor: p.bg }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 }}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: p.dark ? 'rgba(11,10,24,0.95)' : 'rgba(242,238,255,0.95)' }]}>
          <SafeAreaView edges={['top']}>
            <View style={{ paddingHorizontal: 22, paddingBottom: 8, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
              <View>
                <Text style={[styles.kicker, { color: p.accent }]}>From travelers in Kyoto</Text>
                <Text style={[styles.bigTitle, { color: p.text }]}>Feed</Text>
              </View>
              <Pressable onPress={onOpenChat} style={[styles.headerBtn, { backgroundColor: p.dark ? 'rgba(255,255,255,0.08)' : 'rgba(27,18,64,0.05)', borderColor: p.line }]}>
                <AIOrb size={22} />
              </Pressable>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingTop: 14 }} contentContainerStyle={{ paddingHorizontal: 22, gap: 6 }}>
              {FILTERS.map((f, i) => (
                <Pressable key={i} onPress={() => setSelectedFilter(i)} style={[styles.filterChip, { backgroundColor: i === selectedFilter ? p.accent : p.dark ? 'rgba(255,255,255,0.04)' : 'rgba(27,18,64,0.04)', borderColor: i === selectedFilter ? p.accent : p.line }]}>
                  <Text style={[styles.filterText, { color: i === selectedFilter ? '#fff' : p.text }]}>{f}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </SafeAreaView>
        </View>

        {/* Stories */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingVertical: 14 }} contentContainerStyle={{ paddingHorizontal: 22, gap: 12 }}>
          {STORIES.map((s, i) => (
            <Pressable key={i} style={{ alignItems: 'center', width: 64 }}>
              <View style={[styles.storyAvatar, { backgroundColor: p.dark ? 'rgba(255,255,255,0.06)' : 'rgba(27,18,64,0.06)' }]}>
                <Image source={{ uri: s.src }} style={{ width: 64, height: 64, borderRadius: 32 }} resizeMode="cover" />
              </View>
              <Text style={[styles.storyName, { color: p.textMuted }]} numberOfLines={1}>{s.name}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Posts */}
        <View style={{ gap: 14, paddingTop: 6 }}>
          {POSTS.map(post => (
            <PostCard key={post.id} post={post} onOpenLocation={onOpenLocation} />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingBottom: 8 },
  kicker: { fontSize: 11, letterSpacing: 1.8, textTransform: 'uppercase', fontWeight: '700' },
  bigTitle: { fontSize: 28, lineHeight: 32, letterSpacing: -0.8, marginTop: 4, fontWeight: '600' },
  headerBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 0.5, alignItems: 'center', justifyContent: 'center' },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99, borderWidth: 0.5 },
  filterText: { fontSize: 12, fontWeight: '600' },
  storyAvatar: { width: 64, height: 64, borderRadius: 32, overflow: 'hidden' },
  storyName: { fontSize: 10, fontWeight: '500', textAlign: 'center', marginTop: 6 },
  postCard: { marginHorizontal: 16, borderRadius: 22, overflow: 'hidden', borderWidth: 0.5 },
  avatar: { width: 36, height: 36, borderRadius: 18 },
  authorName: { fontSize: 13, fontWeight: '600' },
  authorTime: { fontSize: 11 },
  authorWhere: { fontSize: 11 },
  followBtn: { paddingHorizontal: 12, height: 28, borderRadius: 14, borderWidth: 0.5, alignItems: 'center', justifyContent: 'center' },
  followBtnText: { fontSize: 11, fontWeight: '600' },
  photoCount: { position: 'absolute', top: 12, right: 12, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: 'rgba(11,10,24,0.55)' },
  actionBtn: { paddingHorizontal: 10, height: 32, borderRadius: 16, borderWidth: 0.5, flexDirection: 'row', alignItems: 'center', gap: 5 },
  actionBtnText: { fontSize: 12, fontWeight: '600' },
  iconBtn: { width: 32, height: 32, borderRadius: 16, borderWidth: 0.5, alignItems: 'center', justifyContent: 'center' },
  caption: { fontSize: 13.5, lineHeight: 20 },
  tagChip: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 99, borderWidth: 0.5 },
  tagText: { fontSize: 10, fontWeight: '500' },
  commentLink: { fontSize: 12, fontWeight: '500' },
  commentComposer: { marginHorizontal: 0, padding: 8, paddingHorizontal: 12, borderRadius: 18, borderWidth: 0.5, flexDirection: 'row', alignItems: 'center', gap: 8 },
  commentAvatar: { width: 22, height: 22, borderRadius: 11 },
  commentPlaceholder: { flex: 1, fontSize: 12 },
  addTripBtn: { height: 40, borderRadius: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
});
