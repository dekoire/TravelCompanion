import React, { useState } from 'react';
import { Image, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ico from './Ico';

interface PhotoProps {
  src: string;
  h?: number;
  r?: number;
  overlay?: boolean;
  children?: React.ReactNode;
  style?: object;
}

export default function Photo({ src, h = 160, r = 18, overlay = true, children, style }: PhotoProps) {
  const [broken, setBroken] = useState(false);

  return (
    <View style={[{ width: '100%', height: h, borderRadius: r, overflow: 'hidden', backgroundColor: '#152040' }, style]}>
      {!broken ? (
        <Image
          source={{ uri: src }}
          style={{ width: '100%', height: '100%' }}
          resizeMode="cover"
          onError={() => setBroken(true)}
        />
      ) : (
        <LinearGradient
          colors={['#0A84FF', '#1D2A52', '#070C1C']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
        >
          <Ico name="pin" size={Math.min(h / 2, 64)} c="rgba(255,255,255,0.4)" />
        </LinearGradient>
      )}
      {overlay && !broken && (
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.55)']}
          start={{ x: 0, y: 0.3 }}
          end={{ x: 0, y: 1 }}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          pointerEvents="none"
        />
      )}
      {children && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
          {children}
        </View>
      )}
    </View>
  );
}
