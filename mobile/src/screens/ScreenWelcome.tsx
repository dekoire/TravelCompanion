import React from 'react';
import { View, Text, Pressable, Image, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/ThemeContext';
import { PHOTOS, SIRI_LINEAR_COLORS } from '../theme';
import Ico from '../components/Ico';
import AIOrb from '../components/AIOrb';

interface Props {
  onContinueEmail?: () => void;
  onSocial?: (provider: string) => void;
  onSignin?: () => void;
  onSignup?: () => void;
  mode?: 'hero' | 'signup' | 'signin';
}

function Logo() {
  return (
    <View style={styles.logoContainer}>
      <AIOrb size={22} pulse={false} />
      <Text style={styles.logoText}>Companion</Text>
    </View>
  );
}

export default function ScreenWelcome({ onContinueEmail, onSocial, onSignin, onSignup, mode = 'hero' }: Props) {
  const { palette: p } = useTheme();

  const heroCopy = mode === 'signin' ? {
    kicker: 'Welcome back',
    title: 'Pick up where you left off.',
    body: 'Sign in to continue your Kyoto trip — Day 3 of 7.',
  } : mode === 'signup' ? {
    kicker: 'Create your account',
    title: 'Make this yours in 30s.',
    body: 'One companion, every trip you ever take.',
  } : {
    kicker: 'AI travel companion',
    title: 'Travel with someone who already knows the way.',
    body: 'A living travel companion that learns your trip, senses the city, and quietly rewrites the plan when life gets in the way.',
  };

  return (
    <View style={styles.container}>
      <Image source={{ uri: PHOTOS.kyotoHero }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      <LinearGradient
        colors={p.dark ? ['rgba(11,10,24,0.82)', 'rgba(11,10,24,0.2)', 'rgba(11,10,24,0.4)', 'rgba(11,10,24,0.97)'] : ['rgba(242,238,255,0.6)', 'rgba(242,238,255,0.1)', 'rgba(242,238,255,0.5)', 'rgba(242,238,255,0.97)']}
        locations={[0, 0.3, 0.55, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Top chrome */}
      <View style={styles.topChrome}>
        {mode !== 'hero' && (
          <Pressable onPress={() => onSocial?.('back')} style={styles.backBtn}>
            <Ico name="arrowLeft" size={18} c="#fff" />
          </Pressable>
        )}
        <Logo />
      </View>

      {/* Bottom content */}
      <View style={styles.bottomContent}>
        <Text style={styles.kicker}>{heroCopy.kicker}</Text>
        <Text style={[styles.title, { color: p.dark ? '#fff' : p.text }]}>{heroCopy.title}</Text>
        <Text style={[styles.body, { color: p.dark ? 'rgba(255,255,255,0.7)' : p.textMuted }]}>{heroCopy.body}</Text>

        <View style={styles.btnStack}>
          {mode === 'hero' ? (
            <>
              <Pressable onPress={onSignup}>
                <LinearGradient colors={[...SIRI_LINEAR_COLORS]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.mainBtn}>
                  <Ico name="sparkle" size={18} c="#fff" />
                  <Text style={styles.mainBtnText}>Get started — it's free</Text>
                </LinearGradient>
              </Pressable>
              <Pressable onPress={onSignin} style={styles.secondBtn}>
                <Text style={styles.secondBtnText}>I already have an account</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Pressable onPress={() => onSocial?.('apple')} style={styles.authBtnSolid}>
                <Ico name="apple" size={18} c="#000" />
                <Text style={styles.authBtnSolidText}>Continue with Apple</Text>
              </Pressable>
              <Pressable onPress={() => onSocial?.('google')} style={styles.authBtnGlass}>
                <Text style={styles.authBtnGlassText}>Continue with Google</Text>
              </Pressable>
              <Pressable onPress={onContinueEmail} style={styles.authBtnGlass}>
                <Ico name="mail" size={18} c="#fff" />
                <Text style={styles.authBtnGlassText}>Continue with email</Text>
              </Pressable>
              <Text style={styles.switchText}>
                {mode === 'signup' ? (
                  <>Already have an account? <Text onPress={onSignin} style={[styles.switchLink, { color: p.accent }]}>Sign in</Text></>
                ) : (
                  <>New here? <Text onPress={onSignup} style={[styles.switchLink, { color: p.accent }]}>Create account</Text></>
                )}
              </Text>
            </>
          )}
        </View>

        {mode === 'hero' && (
          <Text style={styles.legal}>By continuing you agree to our Terms & Privacy.</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden' },
  topChrome: { position: 'absolute', top: 60, left: 16, right: 16, flexDirection: 'row', alignItems: 'center', gap: 10 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(11,10,24,0.4)', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  logoContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, paddingVertical: 4, paddingLeft: 4, height: 32, borderRadius: 99, backgroundColor: 'rgba(11,10,24,0.45)', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.18)' },
  logoText: { fontSize: 13, fontWeight: '600', color: '#fff', letterSpacing: -0.2 },
  bottomContent: { position: 'absolute', left: 0, right: 0, bottom: 36, padding: 24, gap: 16 },
  kicker: { fontSize: 11, letterSpacing: 2.4, textTransform: 'uppercase', color: '#0A84FF', fontWeight: '700' },
  title: { fontSize: 50, lineHeight: 52, letterSpacing: -1.6, fontWeight: '600' },
  body: { fontSize: 14, lineHeight: 22, maxWidth: 300, marginTop: 2 },
  btnStack: { flexDirection: 'column', gap: 10, marginTop: 14 },
  mainBtn: { height: 54, borderRadius: 27, paddingHorizontal: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  mainBtnText: { color: '#fff', fontSize: 16, fontWeight: '600', letterSpacing: -0.2 },
  secondBtn: { height: 54, borderRadius: 27, paddingHorizontal: 22, backgroundColor: 'rgba(255,255,255,0.10)', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  secondBtnText: { color: '#fff', fontSize: 15, fontWeight: '500' },
  authBtnSolid: { height: 50, borderRadius: 25, paddingHorizontal: 18, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  authBtnSolidText: { color: '#000', fontSize: 15, fontWeight: '600' },
  authBtnGlass: { height: 50, borderRadius: 25, paddingHorizontal: 18, backgroundColor: 'rgba(255,255,255,0.10)', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.18)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  authBtnGlassText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  switchText: { textAlign: 'center', marginTop: 6, fontSize: 12, color: 'rgba(255,255,255,0.55)' },
  switchLink: { fontWeight: '600' },
  legal: { textAlign: 'center', marginTop: 4, fontSize: 11, color: 'rgba(255,255,255,0.45)' },
});
