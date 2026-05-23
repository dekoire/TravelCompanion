import React from 'react';
import { View } from 'react-native';

interface StatusDotProps {
  status: string;
  size?: number;
}

export default function StatusDot({ status, size = 6 }: StatusDotProps) {
  const map: Record<string, string> = {
    booked: '#7EE7B6',
    upcoming: '#5FA0FF',
    suggestion: '#FF77C8',
    live: '#7EE7B6',
    past: 'rgba(255,255,255,0.3)',
  };
  const color = map[status] || '#888';

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
      }}
    />
  );
}
