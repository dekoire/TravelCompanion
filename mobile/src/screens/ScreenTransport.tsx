import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/ThemeContext';
import { SIRI_LINEAR_COLORS } from '../theme';
import Ico from '../components/Ico';
import AIOrb from '../components/AIOrb';

interface TransportOption {
  id: string;
  brand: string;
  icon: string;
  dur: string;
  price: string;
  eta: string;
  extra: string;
  recommended?: boolean;
  color: string;
}

interface Props {
  from?: { title: string; time: string };
  to?: { title: string; time: string };
  onClose?: () => void;
  onConfirm?: (id: string) => void;
}

const OPTIONS: TransportOption[] = [
  { id: 'uber', brand: 'Uber', icon: 'taxi', dur: '18 min', price: '¥ 1,840', eta: 'pickup in 3 min', extra: 'UberX · 4-seat', recommended: true, color: '#fff' },
  { id: 'bolt', brand: 'Bolt', icon: 'taxi', dur: '20 min', price: '¥ 1,620', eta: 'pickup in 5 min', extra: 'Standard · 4-seat', color: '#34D186' },
  { id: 'taxi', brand: 'Local taxi', icon: 'taxi', dur: '22 min', price: '¥ 2,100', eta: 'hail at street', extra: 'Cash only', color: '#FFC476' },
  { id: 'train', brand: 'JR Sagano', icon: 'train', dur: '28 min', price: '¥ 240', eta: 'next train 11 min', extra: '1 transfer · Saga-Arashiyama → Enmachi', color: '#5FD0FF' },
  { id: 'bike', brand: 'KyotoBike', icon: 'bike', dur: '34 min', price: '¥ 500', eta: 'available nearby', extra: '20 stations on route', color: '#7EE7B6' },
  { id: 'walk', brand: 'Walk', icon: 'walk', dur: '58 min', price: 'Free', eta: 'depart now', extra: 'Mostly flat · scenic', color: '#6EB4FF' },
];

export default function ScreenTransport({ from, to, onClose, onConfirm }: Props) {
  const { palette: p } = useTheme();
  const A = from || { title: 'Bamboo Grove · Arashiyama', time: '12:15' };
  const B = to || { title: 'Kinkaku-ji · Golden Pavilion', time: '15:00' };
  const [sel, setSel] = useState('uber');

  const selected = OPTIONS.find(o => o.id === sel);

  return (
    <View style={styles.overlay}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: p.dark ? 'rgba(24,23,52,0.96)' : 'rgba(255,255,255,0.98)', borderColor: p.line }]}>
        {/* Drag handle */}
        <View style={[styles.handle, { backgroundColor: p.dark ? 'rgba(255,255,255,0.2)' : 'rgba(27,18,64,0.15)' }]} />

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* From → To header */}
          <View style={styles.routeHeader}>
            <Text style={[styles.routeKicker, { color: p.accent }]}>How to get there</Text>
            <View style={styles.routeRow}>
              <View style={styles.routeLine}>
                <View style={[styles.routeDotEmpty, { borderColor: p.accent }]} />
                <View style={[styles.routeConnector, { backgroundColor: p.accent }]} />
                <View style={[styles.routeDotFilled, { backgroundColor: p.accent }]} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.routeTime, { color: p.textMuted }]}>{A.time}</Text>
                <Text style={[styles.routePlace, { color: p.text }]}>{A.title}</Text>
                <Text style={[styles.routeTime, { color: p.textMuted }]}>{B.time}</Text>
                <Text style={[styles.routePlace, { color: p.text }]}>{B.title}</Text>
              </View>
            </View>
          </View>

          {/* AI banner */}
          <View style={styles.aiBannerWrap}>
            <View style={[styles.aiBanner, { backgroundColor: p.accentSoft, borderColor: p.accent + '55' }]}>
              <AIOrb size={22} />
              <Text style={[styles.aiBannerText, { color: p.text }]}>
                Uber is the move — train requires 1 transfer and you've got a 15:00 reservation.
              </Text>
            </View>
          </View>

          {/* Option list */}
          <View style={styles.optionList}>
            {OPTIONS.map(o => {
              const isSel = sel === o.id;
              return (
                <Pressable
                  key={o.id}
                  onPress={() => setSel(o.id)}
                  style={[styles.optionRow, {
                    backgroundColor: isSel ? p.accentSoft : 'transparent',
                    borderColor: isSel ? p.accent : 'transparent',
                  }]}
                >
                  {o.recommended ? (
                    <LinearGradient colors={[...SIRI_LINEAR_COLORS]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.optionIcon}>
                      <Ico name={o.icon as any} size={20} c="#fff" />
                    </LinearGradient>
                  ) : (
                    <View style={[styles.optionIcon, { backgroundColor: p.dark ? 'rgba(255,255,255,0.06)' : 'rgba(27,18,64,0.05)', borderColor: p.line, borderWidth: 0.5 }]}>
                      <Ico name={o.icon as any} size={20} c={o.color} />
                    </View>
                  )}
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={styles.optionNameRow}>
                      <Text style={[styles.optionBrand, { color: p.text }]}>{o.brand}</Text>
                      {o.recommended && (
                        <LinearGradient colors={[...SIRI_LINEAR_COLORS]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.aiPickBadge}>
                          <Text style={styles.aiPickText}>AI PICK</Text>
                        </LinearGradient>
                      )}
                    </View>
                    <Text style={[styles.optionExtra, { color: p.textMuted }]}>{o.eta} · {o.extra}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.optionDur, { color: p.text }]}>{o.dur}</Text>
                    <Text style={[styles.optionPrice, { color: p.textMuted }]}>{o.price}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Pressable onPress={onClose} style={[styles.cancelBtn, { backgroundColor: p.dark ? 'rgba(255,255,255,0.06)' : 'rgba(27,18,64,0.05)', borderColor: p.line }]}>
              <Text style={[styles.cancelBtnText, { color: p.text }]}>Cancel</Text>
            </Pressable>
            <Pressable onPress={() => onConfirm?.(sel)} style={{ flex: 1 }}>
              <LinearGradient colors={[...SIRI_LINEAR_COLORS]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.confirmBtn}>
                <Ico name="check" size={17} c="#fff" sw={2.5} />
                <Text style={styles.confirmBtnText}>Confirm · {selected?.price}</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFill, zIndex: 50, backgroundColor: 'rgba(11,10,24,0.55)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 0.5, borderBottomWidth: 0, maxHeight: '92%', overflow: 'hidden' },
  handle: { width: 38, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 8, marginBottom: 14 },
  routeHeader: { paddingHorizontal: 22, paddingBottom: 14 },
  routeKicker: { fontSize: 10, letterSpacing: 1.6, textTransform: 'uppercase', fontWeight: '600' },
  routeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 8 },
  routeLine: { flexDirection: 'column', alignItems: 'center', gap: 2, paddingTop: 5 },
  routeDotEmpty: { width: 8, height: 8, borderRadius: 4, borderWidth: 1.5, boxSizing: 'border-box' } as any,
  routeConnector: { width: 1, height: 22, opacity: 0.4 },
  routeDotFilled: { width: 8, height: 8, borderRadius: 4 },
  routeTime: { fontSize: 13 },
  routePlace: { fontSize: 14, fontWeight: '500', marginBottom: 8 },
  aiBannerWrap: { paddingHorizontal: 16, paddingBottom: 14 },
  aiBanner: { padding: 12, paddingHorizontal: 14, borderRadius: 14, borderWidth: 0.5, flexDirection: 'row', alignItems: 'center', gap: 10 },
  aiBannerText: { flex: 1, fontSize: 12.5, lineHeight: 18 },
  optionList: { paddingHorizontal: 12 },
  optionRow: { padding: 12, marginBottom: 6, borderRadius: 14, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  optionIcon: { width: 44, height: 44, borderRadius: 12, flexShrink: 0, alignItems: 'center', justifyContent: 'center' },
  optionNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  optionBrand: { fontSize: 15, fontWeight: '600' },
  aiPickBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  aiPickText: { fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', fontWeight: '700', color: '#fff' },
  optionExtra: { fontSize: 11, flexWrap: 'wrap' },
  optionDur: { fontSize: 15, fontWeight: '600' },
  optionPrice: { fontSize: 11 },
  footer: { padding: 14, paddingHorizontal: 16, flexDirection: 'row', gap: 10 },
  cancelBtn: { height: 50, paddingHorizontal: 22, borderRadius: 25, borderWidth: 0.5, alignItems: 'center', justifyContent: 'center' },
  cancelBtnText: { fontSize: 14, fontWeight: '500' },
  confirmBtn: { height: 50, borderRadius: 25, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  confirmBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
