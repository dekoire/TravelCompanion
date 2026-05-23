import React, { useEffect, useRef } from 'react';
import { Animated, View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SIRI_COLORS, SIRI_LINEAR_COLORS } from '../theme';

interface AIOrbProps {
  size?: number;
  pulse?: boolean;
  halo?: boolean;
}

export default function AIOrb({ size = 28, pulse = true, halo = false }: AIOrbProps) {
  const spinAnim = useRef(new Animated.Value(0)).current;
  const haloAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 6000,
        useNativeDriver: true,
      })
    ).start();
  }, [spinAnim]);

  useEffect(() => {
    if (pulse && halo) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(haloAnim, { toValue: 0.5, duration: 1600, useNativeDriver: true }),
          Animated.timing(haloAnim, { toValue: 1, duration: 1600, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [pulse, halo, haloAnim]);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const haloSize = size * 2.2;

  return (
    <View style={{ width: size, height: size, position: 'relative' }}>
      {halo && (
        <Animated.View
          style={{
            position: 'absolute',
            width: haloSize,
            height: haloSize,
            borderRadius: haloSize / 2,
            top: -(haloSize - size) / 2,
            left: -(haloSize - size) / 2,
            opacity: haloAnim,
          }}
        >
          <LinearGradient
            colors={[...SIRI_LINEAR_COLORS]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              width: haloSize,
              height: haloSize,
              borderRadius: haloSize / 2,
              opacity: 0.5,
            }}
          />
        </Animated.View>
      )}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            borderRadius: size / 2,
            overflow: 'hidden',
            transform: [{ rotate: spin }],
          },
        ]}
      >
        <LinearGradient
          colors={[...SIRI_COLORS]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ flex: 1 }}
        />
      </Animated.View>
      {/* Inner soft core */}
      <View
        style={{
          position: 'absolute',
          top: size * 0.18,
          left: size * 0.18,
          right: size * 0.18,
          bottom: size * 0.18,
          borderRadius: size,
          backgroundColor: 'rgba(255,255,255,0.25)',
        }}
      />
      {/* Specular highlight */}
      <View
        style={{
          position: 'absolute',
          top: '18%',
          left: '20%',
          width: '28%',
          height: '28%',
          borderRadius: size,
          backgroundColor: 'rgba(255,255,255,0.85)',
        }}
      />
    </View>
  );
}
