import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/ThemeContext';
import { SIRI_LINEAR_COLORS } from '../theme';
import Ico from '../components/Ico';

interface Plan {
  id: string;
  name: string;
  price: string;
  sub: string;
  kicker: string;
  featured?: boolean;
  features: string[];
}

interface Props {
  onClose?: () => void;
  currentPlan?: string;
}

const PLANS: Plan[] = [
  {
    id: 'free', name: 'Pilot', price: 'Free', sub: 'forever', kicker: 'Try the magic',
    features: ['3 AI requests / day', '1 active trip', 'Daily timeline', 'Map view'],
  },
  {
    id: 'companion', name: 'Companion', price: '¥1,400', sub: '/ month', kicker: 'Most popular',
    featured: true,
    features: [
      'Unlimited AI · 50 / day soft cap',
      '5 active trips',
      'Live replanning & weather',
      'Restaurant & taxi bookings',
      'Offline maps for 3 cities',
    ],
  },
  {
    id: 'voyager', name: 'Voyager', price: '¥3,200', sub: '/ month', kicker: 'For frequent travelers',
    features: [
      'Everything in Companion',
      'Concierge bookings (humans + AI)',
      'Multi-traveler shared trips',
      'Unlimited offline cities',
      'Priority lounge access partners',
    ],
  },
];

const FAQS = [
  { q: 'Can I share a trip with my partner?', a: 'Yes — on Companion & Voyager.' },
  { q: 'Do bookings cost extra?', a: 'Restaurants & taxis are at-cost. Voyager waives concierge fees.' },
  { q: 'What if I leave mid-trip?', a: 'Your current trip stays active until the end date.' },
];

export default function ScreenPricing({ onClose, currentPlan = 'companion' }: Props) {
  const { palette: p } = useTheme();
  const [sel, setSel] = useState('companion');
  const selPlan = PLANS.find(pp => pp.id === sel);

  const ctaLabel = () => {
    if (sel === currentPlan) return "You're on this plan";
    if (sel === 'free') return 'Downgrade to Pilot';
    return `Upgrade to ${selPlan?.name} · ${selPlan?.price}/mo`;
  };

  return (
    <View style={[styles.container, { backgroundColor: p.bg }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
        {/* Top chrome */}
        <View style={styles.topChrome}>
          <Pressable onPress={onClose} style={[styles.closeBtn, { backgroundColor: p.dark ? 'rgba(255,255,255,0.06)' : 'rgba(27,18,64,0.05)', borderColor: p.line }]}>
            <Ico name="close" size={16} c={p.text} />
          </Pressable>
          <Text style={[styles.kicker, { color: p.accent }]}>Plans & subscriptions</Text>
        </View>

        {/* Hero text */}
        <View style={styles.hero}>
          <Text style={[styles.heroSub, { color: p.accent }]}>Choose your companion</Text>
          <Text style={[styles.heroTitle, { color: p.text }]}>
            A travel{' '}
            <Text style={{ color: p.accent }}>companion</Text>
            {' '}as{'\n'}patient as the journey.
          </Text>
        </View>

        {/* Plan cards — horizontal scroll */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cardsRow}>
          {PLANS.map(plan => {
            const isCur = plan.id === currentPlan;
            const isSel = plan.id === sel;
            const textColor = plan.featured ? '#fff' : p.text;
            const textMuted = plan.featured ? 'rgba(255,255,255,0.7)' : p.textMuted;

            return (
              <Pressable key={plan.id} onPress={() => setSel(plan.id)} style={[styles.planCard, {
                borderColor: isSel ? p.accent : plan.featured ? 'transparent' : p.line,
                borderWidth: isSel ? 1 : 0.5,
              }]}>
                {plan.featured ? (
                  <LinearGradient colors={[...SIRI_LINEAR_COLORS]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
                ) : (
                  <View style={[StyleSheet.absoluteFill, { backgroundColor: p.surface }]} />
                )}
                <View style={styles.planCardInner}>
                  <View style={styles.planHeader}>
                    <View>
                      <Text style={[styles.planKicker, { color: plan.featured ? 'rgba(255,255,255,0.85)' : p.accent }]}>{plan.kicker}</Text>
                      <Text style={[styles.planName, { color: textColor }]}>{plan.name}</Text>
                    </View>
                    {isCur && (
                      <View style={[styles.currentBadge, {
                        backgroundColor: plan.featured ? 'rgba(255,255,255,0.22)' : p.accentSoft,
                      }]}>
                        <Text style={[styles.currentText, { color: plan.featured ? '#fff' : p.accent }]}>Current</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.priceRow}>
                    <Text style={[styles.price, { color: textColor }]}>{plan.price}</Text>
                    <Text style={[styles.priceSub, { color: textMuted }]}>{plan.sub}</Text>
                  </View>

                  <View style={styles.features}>
                    {plan.features.map((f, i) => (
                      <View key={i} style={styles.featureRow}>
                        <View style={[styles.checkIcon, {
                          backgroundColor: plan.featured ? 'rgba(255,255,255,0.22)' : p.accentSoft,
                          borderColor: plan.featured ? 'rgba(255,255,255,0.3)' : p.accent + '44',
                          borderWidth: 0.5,
                        }]}>
                          <Ico name="check" size={9} c={plan.featured ? '#fff' : p.accent} sw={3} />
                        </View>
                        <Text style={[styles.featureText, { color: plan.featured ? 'rgba(255,255,255,0.95)' : p.text }]}>{f}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* CTA */}
        <View style={styles.ctaWrap}>
          <Pressable>
            <LinearGradient colors={[...SIRI_LINEAR_COLORS]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.ctaBtn}>
              <Ico name="sparkle" size={18} c="#fff" />
              <Text style={styles.ctaBtnText}>{ctaLabel()}</Text>
            </LinearGradient>
          </Pressable>
          <Text style={[styles.ctaSub, { color: p.textMuted }]}>Cancel anytime · Free trip pass on annual</Text>
        </View>

        {/* FAQ */}
        <View style={styles.faqWrap}>
          <Text style={[styles.faqLabel, { color: p.accent }]}>Frequently asked</Text>
          {FAQS.map((f, i) => (
            <View key={i} style={[styles.faqRow, { borderBottomColor: p.line, borderBottomWidth: i < FAQS.length - 1 ? 0.5 : 0 }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.faqQ, { color: p.text }]}>{f.q}</Text>
                <Text style={[styles.faqA, { color: p.textMuted }]}>{f.a}</Text>
              </View>
              <Ico name="plus" size={16} c={p.textDim} />
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topChrome: { paddingTop: 56, paddingHorizontal: 16, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 12 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 0.5, alignItems: 'center', justifyContent: 'center' },
  kicker: { fontSize: 11, letterSpacing: 1.8, textTransform: 'uppercase', fontWeight: '600', flex: 1 },
  hero: { paddingHorizontal: 22, paddingTop: 14, paddingBottom: 24 },
  heroSub: { fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', fontWeight: '600', marginBottom: 8 },
  heroTitle: { fontSize: 32, fontWeight: '600', letterSpacing: -1, lineHeight: 34 },
  cardsRow: { paddingHorizontal: 16, gap: 12, paddingBottom: 4 },
  planCard: { width: 280, borderRadius: 24, overflow: 'hidden', flexShrink: 0 },
  planCardInner: { padding: 20, paddingHorizontal: 22, minHeight: 380 },
  planHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  planKicker: { fontSize: 10, letterSpacing: 1.6, textTransform: 'uppercase', fontWeight: '700' },
  planName: { fontSize: 24, fontWeight: '600', marginTop: 6, letterSpacing: -0.6 },
  currentBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99 },
  currentText: { fontSize: 10, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 18, marginBottom: 22 },
  price: { fontSize: 44, fontWeight: '600', letterSpacing: -1.4 },
  priceSub: { fontSize: 14 },
  features: { gap: 10 },
  featureRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  checkIcon: { width: 16, height: 16, borderRadius: 8, flexShrink: 0, marginTop: 1, alignItems: 'center', justifyContent: 'center' },
  featureText: { fontSize: 13, lineHeight: 18, flex: 1 },
  ctaWrap: { padding: 22, paddingTop: 22, paddingBottom: 0 },
  ctaBtn: { height: 54, borderRadius: 27, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  ctaBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  ctaSub: { textAlign: 'center', marginTop: 10, fontSize: 11 },
  faqWrap: { paddingHorizontal: 22, paddingTop: 24 },
  faqLabel: { fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', fontWeight: '600', marginBottom: 10 },
  faqRow: { paddingVertical: 14, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  faqQ: { fontSize: 13, fontWeight: '500', marginBottom: 4 },
  faqA: { fontSize: 12, lineHeight: 18 },
});
