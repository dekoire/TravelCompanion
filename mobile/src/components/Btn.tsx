import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/ThemeContext';
import { SIRI_LINEAR_COLORS } from '../theme';
import Ico from './Ico';

interface BtnProps {
  children: React.ReactNode;
  onPress?: () => void;
  tone?: 'accent' | 'solid' | 'glass' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: string;
  full?: boolean;
}

export default function Btn({ children, onPress, tone = 'accent', size = 'lg', icon, full = false }: BtnProps) {
  const { palette: p } = useTheme();

  const sizes = {
    sm: { h: 36, fs: 14, padX: 14 },
    md: { h: 44, fs: 15, padX: 18 },
    lg: { h: 54, fs: 16, padX: 22 },
  };
  const s = sizes[size] || sizes.lg;

  if (tone === 'accent') {
    return (
      <Pressable onPress={onPress} style={{ width: full ? '100%' : undefined }}>
        <LinearGradient
          colors={[...SIRI_LINEAR_COLORS]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            height: s.h,
            paddingHorizontal: s.padX,
            borderRadius: s.h / 2,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          {icon && <Ico name={icon} size={18} c="#fff" />}
          <Text style={{ color: '#fff', fontSize: s.fs, fontWeight: '600', letterSpacing: -0.2 }}>
            {children}
          </Text>
        </LinearGradient>
      </Pressable>
    );
  }

  const toneBg = tone === 'solid' ? p.text : tone === 'glass' ? (p.dark ? 'rgba(255,255,255,0.10)' : 'rgba(27,18,64,0.05)') : 'transparent';
  const toneColor = tone === 'solid' ? p.bg : p.text;
  const toneBd = tone === 'glass' ? (p.dark ? 'rgba(255,255,255,0.14)' : 'rgba(27,18,64,0.10)') : 'transparent';

  return (
    <Pressable
      onPress={onPress}
      style={{
        height: s.h,
        paddingHorizontal: s.padX,
        borderRadius: s.h / 2,
        backgroundColor: toneBg,
        borderWidth: 0.5,
        borderColor: toneBd,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        width: full ? '100%' : undefined,
      }}
    >
      {icon && <Ico name={icon} size={18} c={toneColor} />}
      <Text style={{ color: toneColor, fontSize: s.fs, fontWeight: '600', letterSpacing: -0.2 }}>
        {children}
      </Text>
    </Pressable>
  );
}
