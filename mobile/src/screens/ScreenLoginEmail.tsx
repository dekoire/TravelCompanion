import React, { useState } from 'react';
import { View, Text, Pressable, TextInput, Image, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/ThemeContext';
import { PHOTOS, SIRI_LINEAR_COLORS } from '../theme';
import Ico from '../components/Ico';

interface Props {
  mode?: 'signin' | 'signup';
  onBack?: () => void;
  onSubmit?: () => void;
}

export default function ScreenLoginEmail({ mode = 'signin', onBack, onSubmit }: Props) {
  const { palette: p } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <View style={styles.container}>
      <Image source={{ uri: PHOTOS.kyotoHero }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      <LinearGradient colors={['rgba(11,10,24,0.7)', 'rgba(11,10,24,0.98)']} locations={[0, 0.4]} style={StyleSheet.absoluteFill} />

      {/* Back */}
      <Pressable onPress={onBack} style={styles.backBtn}>
        <Ico name="arrowLeft" size={18} c="#fff" />
      </Pressable>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.kicker}>{mode === 'signup' ? 'Create account' : 'Sign in'}</Text>
        <Text style={[styles.title, { color: '#fff' }]}>{mode === 'signup' ? 'Set up your account' : 'Welcome back'}</Text>

        <View style={styles.form}>
          <View style={[styles.inputWrapper, { borderColor: p.line }]}>
            <Ico name="mail" size={16} c={p.textMuted} />
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Email address"
              placeholderTextColor={p.textDim}
              keyboardType="email-address"
              autoCapitalize="none"
              style={[styles.input, { color: p.text }]}
            />
          </View>
          <View style={[styles.inputWrapper, { borderColor: p.line }]}>
            <Ico name="settings" size={16} c={p.textMuted} />
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              placeholderTextColor={p.textDim}
              secureTextEntry
              style={[styles.input, { color: p.text }]}
            />
          </View>

          {mode === 'signin' && (
            <Pressable>
              <Text style={[styles.forgotText, { color: p.accent }]}>Forgot password?</Text>
            </Pressable>
          )}

          <Pressable onPress={onSubmit}>
            <LinearGradient colors={[...SIRI_LINEAR_COLORS]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.submitBtn}>
              <Text style={styles.submitBtnText}>{mode === 'signup' ? 'Create account' : 'Sign in'}</Text>
              <Ico name="arrow" size={18} c="#fff" sw={2} />
            </LinearGradient>
          </Pressable>
        </View>

        <Text style={[styles.legalText, { color: 'rgba(255,255,255,0.45)' }]}>
          By continuing you agree to our Terms & Privacy Policy.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  backBtn: { position: 'absolute', top: 60, left: 16, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(11,10,24,0.4)', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1, justifyContent: 'flex-end', padding: 24, paddingBottom: 50, gap: 16 },
  kicker: { fontSize: 11, letterSpacing: 2.4, textTransform: 'uppercase', color: '#0A84FF', fontWeight: '700' },
  title: { fontSize: 36, lineHeight: 40, letterSpacing: -1, fontWeight: '600' },
  form: { gap: 12 },
  inputWrapper: { height: 52, borderRadius: 16, borderWidth: 0.5, backgroundColor: 'rgba(255,255,255,0.06)', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 10 },
  input: { flex: 1, fontSize: 15 },
  forgotText: { fontSize: 13, fontWeight: '500', textAlign: 'right', marginTop: 4 },
  submitBtn: { height: 54, borderRadius: 27, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 8 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '600', letterSpacing: -0.2 },
  legalText: { textAlign: 'center', fontSize: 11, marginTop: 8 },
});
