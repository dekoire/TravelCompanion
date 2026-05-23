import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import Ico from './Ico';

const HOURS = [
  { t: '8am',  ic: 'cloud', temp: 16, kind: 'cloud' },
  { t: '9am',  ic: 'sun',   temp: 17, kind: 'sun' },
  { t: '10am', ic: 'sun',   temp: 19, kind: 'sun', now: true },
  { t: '11am', ic: 'sun',   temp: 20, kind: 'sun' },
  { t: '12pm', ic: 'sun',   temp: 21, kind: 'sun' },
  { t: '1pm',  ic: 'sun',   temp: 21, kind: 'sun' },
  { t: '2pm',  ic: 'cloud', temp: 20, kind: 'cloud' },
  { t: '3pm',  ic: 'cloud', temp: 19, kind: 'cloud' },
  { t: '4pm',  ic: 'rain',  temp: 17, kind: 'rain' },
  { t: '5pm',  ic: 'rain',  temp: 16, kind: 'rain' },
  { t: '6pm',  ic: 'cloud', temp: 15, kind: 'cloud' },
  { t: '7pm',  ic: 'cloud', temp: 14, kind: 'cloud' },
];

export default function WeatherStrip() {
  const { palette: p } = useTheme();

  const colorFor = (k: string) =>
    k === 'sun' ? p.amber : k === 'rain' ? p.sky : p.textMuted;

  return (
    <View
      style={{
        borderRadius: 22,
        overflow: 'hidden',
        backgroundColor: p.dark ? 'rgba(20,30,70,0.4)' : 'rgba(255,255,255,0.5)',
        borderWidth: 0.5,
        borderColor: p.line,
      }}
    >
      {/* Header */}
      <View style={{ padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10, paddingBottom: 6 }}>
        <View
          style={{
            width: 36, height: 36, borderRadius: 18, flexShrink: 0,
            backgroundColor: '#FFC476',
          }}
        />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 18, fontWeight: '600', color: p.text }}>
            19° <Text style={{ fontSize: 12, color: p.textMuted, fontWeight: '400' }}>· feels like 17°</Text>
          </Text>
          <Text style={{ fontSize: 12, color: p.textMuted, marginTop: 3 }}>
            Sunny — light rain rolls in around 4pm
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ fontSize: 11, color: p.textMuted }}>H 21° · L 14°</Text>
          <Text style={{ fontSize: 11, color: p.accent, marginTop: 1, fontWeight: '500' }}>UV 4 · moderate</Text>
        </View>
      </View>

      {/* Hourly scroll */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingHorizontal: 10, paddingBottom: 12 }}>
        <View style={{ flexDirection: 'row', gap: 4 }}>
          {HOURS.map((h, i) => {
            const isNow = !!h.now;
            return (
              <View
                key={i}
                style={{
                  width: 46,
                  padding: 8,
                  paddingHorizontal: 4,
                  borderRadius: 12,
                  backgroundColor: isNow ? p.accent + '22' : 'transparent',
                  borderWidth: 0.5,
                  borderColor: isNow ? p.accent + '55' : 'transparent',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <Text style={{ fontSize: 10, fontWeight: '600', color: isNow ? p.accent : p.textMuted, letterSpacing: 0.3, textTransform: 'uppercase' }}>
                  {isNow ? 'NOW' : h.t}
                </Text>
                <Ico name={h.ic} size={18} c={colorFor(h.kind)} />
                <Text style={{ fontSize: 12, fontWeight: '600', color: p.text }}>{h.temp}°</Text>
                {h.kind === 'rain' && (
                  <Text style={{ fontSize: 9, color: p.sky, fontWeight: '600' }}>40%</Text>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
