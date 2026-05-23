import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import Ico from './Ico';

interface PillProps {
  children: React.ReactNode;
  tone?: 'glass' | 'accent' | 'solidAccent' | 'danger' | 'success' | 'ghost';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  icon?: string;
}

export default function Pill({ children, tone = 'glass', size = 'sm', icon }: PillProps) {
  const { palette: p } = useTheme();

  const tones = {
    glass: { bg: p.dark ? 'rgba(7,12,28,0.55)' : 'rgba(255,255,255,0.72)', bd: p.dark ? 'rgba(255,255,255,0.22)' : 'rgba(15,30,80,0.16)', c: p.dark ? '#fff' : p.text },
    accent: { bg: p.accent, bd: p.accent, c: '#fff' },
    solidAccent: { bg: p.accent, bd: p.accent, c: '#fff' },
    danger: { bg: 'rgba(255,110,140,0.18)', bd: 'rgba(255,110,140,0.32)', c: p.danger },
    success: { bg: 'rgba(126,231,182,0.12)', bd: 'rgba(126,231,182,0.22)', c: p.green },
    ghost: { bg: 'transparent', bd: 'transparent', c: p.textMuted },
  };

  const sizes = {
    xs: { padX: 7, padY: 3, fs: 11, h: 22 },
    sm: { padX: 10, padY: 4, fs: 12, h: 26 },
    md: { padX: 12, padY: 6, fs: 13, h: 30 },
    lg: { padX: 16, padY: 8, fs: 14, h: 36 },
  };

  const t = tones[tone] || tones.glass;
  const s = sizes[size] || sizes.sm;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: s.padX,
        paddingVertical: s.padY,
        backgroundColor: t.bg,
        borderRadius: 99,
        borderWidth: 0.5,
        borderColor: t.bd,
        gap: 5,
      }}
    >
      {icon && <Ico name={icon} size={Math.round(s.fs * 1.05)} c={t.c} />}
      <Text style={{ color: t.c, fontSize: s.fs, fontWeight: '500', letterSpacing: -0.1 }}>
        {children}
      </Text>
    </View>
  );
}
