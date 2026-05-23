import React from 'react';
import { Pressable, View, Text } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import Ico from './Ico';

interface TransportChipProps {
  mode: string;
  dur: string;
  detail?: string;
  onPress?: () => void;
  active?: boolean;
}

const iconMap: Record<string, string> = {
  walk: 'walk',
  train: 'train',
  taxi: 'taxi',
  bike: 'bike',
  uber: 'taxi',
};

export default function TransportChip({ mode, dur, detail, onPress, active = false }: TransportChipProps) {
  const { palette: p } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 9,
        paddingVertical: 4,
        borderRadius: 99,
        backgroundColor: active ? p.accentSoft : p.dark ? 'rgba(255,255,255,0.04)' : 'rgba(27,18,64,0.04)',
        borderWidth: 0.5,
        borderColor: active ? p.accent : p.dark ? 'rgba(255,255,255,0.08)' : 'rgba(27,18,64,0.08)',
      }}
    >
      <Ico name={iconMap[mode] || 'walk'} size={13} c={p.accent} />
      <Text style={{ color: p.text, fontSize: 11 }}>{dur}</Text>
      {detail && <Text style={{ color: p.textMuted, fontSize: 11 }}>· {detail}</Text>}
      {onPress && <Ico name="arrow" size={10} c={p.textDim} />}
    </Pressable>
  );
}
