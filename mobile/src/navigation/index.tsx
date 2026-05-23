import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../theme/ThemeContext';
import Ico from '../components/Ico';
import AIOrb from '../components/AIOrb';

import ScreenTimeline from '../screens/ScreenTimeline';
import ScreenTrips from '../screens/ScreenTrips';
import ScreenChat from '../screens/ScreenChat';
import ScreenFeed from '../screens/ScreenFeed';
import ScreenProfile from '../screens/ScreenProfile';
import ScreenMap from '../screens/ScreenMap';
import ScreenDetail from '../screens/ScreenDetail';
import ScreenOverview from '../screens/ScreenOverview';
import ScreenPlanner from '../screens/ScreenPlanner';
import ScreenTransport from '../screens/ScreenTransport';
import ScreenReplace from '../screens/ScreenReplace';
import ScreenReview from '../screens/ScreenReview';
import ScreenShare from '../screens/ScreenShare';
import ScreenPlanning from '../screens/ScreenPlanning';
import ScreenSetup from '../screens/ScreenSetup';
import ScreenWelcome from '../screens/ScreenWelcome';
import ScreenLoginEmail from '../screens/ScreenLoginEmail';
import ScreenPricing from '../screens/ScreenPricing';

// ─── Tab Icon map ─────────────────────────────────────────────────────

type TabName = 'Trips' | 'Today' | 'Companion' | 'Feed' | 'You';

const TAB_ICONS: Record<TabName, string> = {
  Trips: 'globe',
  Today: 'compass',
  Companion: 'sparkle',
  Feed: 'flame',
  You: 'user',
};

// ─── Custom Tab Bar ───────────────────────────────────────────────────

function CustomTabBar({ state, descriptors, navigation }: any) {
  const { palette: p } = useTheme();
  const insets = useSafeAreaInsets();
  const tabs: TabName[] = ['Trips', 'Today', 'Companion', 'Feed', 'You'];

  return (
    <View style={[styles.tabBar, {
      backgroundColor: p.dark ? 'rgba(7,12,28,0.92)' : 'rgba(242,242,248,0.92)',
      borderTopColor: p.line,
      paddingBottom: insets.bottom,
    }]}>
      {state.routes.map((route: any, index: number) => {
        const tabName = tabs[index];
        const isFocused = state.index === index;
        const isCenter = index === 2;

        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        if (isCenter) {
          return (
            <Pressable key={route.key} onPress={onPress} style={styles.centerTab}>
              <View style={[styles.centerOrb, isFocused && styles.centerOrbFocused]}>
                <AIOrb size={28} pulse={isFocused} />
              </View>
              <Text style={[styles.tabLabel, { color: isFocused ? p.accent : p.textDim, marginTop: 2 }]}>Companion</Text>
            </Pressable>
          );
        }

        return (
          <Pressable key={route.key} onPress={onPress} style={styles.tab}>
            <Ico name={TAB_ICONS[tabName] as any} size={22} c={isFocused ? p.accent : p.textDim} />
            <Text style={[styles.tabLabel, { color: isFocused ? p.accent : p.textDim }]}>{tabName}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ─── Tab Navigator ────────────────────────────────────────────────────

const Tab = createBottomTabNavigator();

function TabNavigator() {
  return (
    <Tab.Navigator
      tabBar={props => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Trips" component={ScreenTrips} />
      <Tab.Screen name="Today" component={ScreenTimeline} />
      <Tab.Screen name="Companion" component={ScreenChat} />
      <Tab.Screen name="Feed" component={ScreenFeed} />
      <Tab.Screen name="You" component={ScreenProfile} />
    </Tab.Navigator>
  );
}

// ─── Root Stack ───────────────────────────────────────────────────────

const Stack = createNativeStackNavigator();

// ─── Auth Flow wrapper ────────────────────────────────────────────────

function AuthFlow({ onComplete }: { onComplete: () => void }) {
  const [authStep, setAuthStep] = useState<'welcome' | 'signup' | 'signin' | 'email-signup' | 'email-signin' | 'setup' | 'planning'>('welcome');

  switch (authStep) {
    case 'welcome':
      return (
        <ScreenWelcome
          mode="hero"
          onSignup={() => setAuthStep('signup')}
          onSignin={() => setAuthStep('signin')}
        />
      );
    case 'signup':
      return (
        <ScreenWelcome
          mode="signup"
          onSocial={(p) => {
            if (p === 'back') setAuthStep('welcome');
            else setAuthStep('setup');
          }}
          onContinueEmail={() => setAuthStep('email-signup')}
          onSignin={() => setAuthStep('signin')}
          onSignup={() => setAuthStep('signup')}
        />
      );
    case 'signin':
      return (
        <ScreenWelcome
          mode="signin"
          onSocial={(p) => {
            if (p === 'back') setAuthStep('welcome');
            else onComplete();
          }}
          onContinueEmail={() => setAuthStep('email-signin')}
          onSignin={() => setAuthStep('signin')}
          onSignup={() => setAuthStep('signup')}
        />
      );
    case 'email-signup':
      return (
        <ScreenLoginEmail
          mode="signup"
          onBack={() => setAuthStep('signup')}
          onSubmit={() => setAuthStep('setup')}
        />
      );
    case 'email-signin':
      return (
        <ScreenLoginEmail
          mode="signin"
          onBack={() => setAuthStep('signin')}
          onSubmit={onComplete}
        />
      );
    case 'setup':
      return (
        <ScreenSetup
          onComplete={() => setAuthStep('planning')}
          onBack={() => setAuthStep('signup')}
        />
      );
    case 'planning':
      return (
        <ScreenPlanning onComplete={onComplete} />
      );
    default:
      return null;
  }
}

// ─── Main app with modal overlays ─────────────────────────────────────

function MainApp() {
  const { palette: p } = useTheme();
  const [overlay, setOverlay] = useState<string | null>(null);

  // Pass callbacks down via navigation params or context in real app.
  // For now, overlays are state-based from this root.
  return (
    <View style={[styles.mainContainer, { backgroundColor: p.bg }]}>
      <TabNavigator />
      {overlay === 'map' && <ScreenMap onClose={() => setOverlay(null)} />}
      {overlay === 'detail' && <ScreenDetail onClose={() => setOverlay(null)} onOpenChat={() => setOverlay(null)} />}
      {overlay === 'overview' && <ScreenOverview onBack={() => setOverlay(null)} />}
      {overlay === 'planner' && <ScreenPlanner onClose={() => setOverlay(null)} />}
      {overlay === 'transport' && <ScreenTransport onClose={() => setOverlay(null)} onConfirm={() => setOverlay(null)} />}
      {overlay === 'replace' && <ScreenReplace onClose={() => setOverlay(null)} onConfirm={() => setOverlay(null)} />}
      {overlay === 'review' && <ScreenReview onClose={() => setOverlay(null)} />}
      {overlay === 'share' && <ScreenShare onClose={() => setOverlay(null)} />}
      {overlay === 'pricing' && <ScreenPricing onClose={() => setOverlay(null)} />}
    </View>
  );
}

// ─── Root Navigator ───────────────────────────────────────────────────

export default function RootNavigator() {
  const [authed, setAuthed] = useState(false);

  return (
    <NavigationContainer>
      {authed ? (
        <MainApp />
      ) : (
        <AuthFlow onComplete={() => setAuthed(true)} />
      )}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1 },
  tabBar: { flexDirection: 'row', borderTopWidth: 0.5, paddingTop: 8 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 6, gap: 3 },
  tabLabel: { fontSize: 10, fontWeight: '500', letterSpacing: 0.3 },
  centerTab: { flex: 1, alignItems: 'center', paddingVertical: 4, gap: 3 },
  centerOrb: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20 },
  centerOrbFocused: {},
});
