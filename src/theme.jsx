// theme.jsx — design tokens for AI Travel Companion (Kyoto, dusk-cinematic)
//
// Visual DNA:
//  - Near-black indigo canvas, like dusk over a city
//  - Warm amber/gold accent (lanterns, magic hour) — the AI is always amber
//  - Vermilion red as secondary punctuation (Japanese torii / Kyoto)
//  - Cinematic photography with deep dark gradients
//  - Editorial serif (Instrument Serif) for emotion, Geist for utility
//
// Type pairing rationale: a humanist serif for titles + a neutral grotesk for
// chrome reads premium and "alive" without slipping into AI-tech tropes.

// Two palettes — dark (default) and light. Screens read the ACTIVE palette
// via window.useTheme() so flipping `window.themeMode` re-renders everything.
//
// Accent is a fixed Siri-style violet→blue. The Companion AI orb itself
// uses the full multi-stop SIRI_GRADIENT (pink → violet → blue → teal).
const SIRI_GRADIENT = 'conic-gradient(from 0deg, #FF77C8, #B777FF, #6B82FF, #5FD0FF, #B777FF, #FF77C8)';
// Linear gradient used for prominent CTAs / buttons. Apple-system-blue
// dominant — barely-there indigo at the bottom for depth.
const SIRI_GRADIENT_LINEAR = 'linear-gradient(135deg, #0066D6 0%, #0A84FF 45%, #2A95FF 100%)';

const palettes = {
  dark: {
    bg: '#070C1C',
    bgSoft: '#0E1530',
    surface: '#152040',
    surfaceHi: '#1D2A52',
    line: 'rgba(255,255,255,0.07)',
    lineHi: 'rgba(255,255,255,0.14)',
    text: '#EEF2FF',
    textMuted: 'rgba(238,242,255,0.62)',
    textDim: 'rgba(238,242,255,0.36)',
    accent: '#0A84FF',          // Apple system blue (iOS dark)
    accentDeep: '#0066D6',
    accentSoft: 'rgba(10,132,255,0.16)',
    accentGrad: 'linear-gradient(135deg, #0A84FF 0%, #2A95FF 100%)',
    siri: SIRI_GRADIENT,
    siriLinear: SIRI_GRADIENT_LINEAR,
    pink: '#FF77C8',
    sky: '#5AC8FA',
    green: '#7EE7B6',
    amber: '#FFC476',
    danger: '#FF6E8C',
    glow: 'rgba(10,132,255,0.45)',
    dark: true,
  },
  light: {
    bg: '#EAF1FF',
    bgSoft: '#DCE6FF',
    surface: '#FFFFFF',
    surfaceHi: '#F5F8FF',
    line: 'rgba(15,30,80,0.08)',
    lineHi: 'rgba(15,30,80,0.14)',
    text: '#0E1B40',
    textMuted: 'rgba(14,27,64,0.62)',
    textDim: 'rgba(14,27,64,0.36)',
    accent: '#007AFF',          // Apple system blue (iOS light)
    accentDeep: '#0055D4',
    accentSoft: 'rgba(0,122,255,0.10)',
    accentGrad: 'linear-gradient(135deg, #0055D4 0%, #2A95FF 100%)',
    siri: SIRI_GRADIENT,
    siriLinear: SIRI_GRADIENT_LINEAR,
    pink: '#D9498F',
    sky: '#0A84FF',
    green: '#34A36E',
    amber: '#D88A2B',
    danger: '#E64E70',
    glow: 'rgba(0,122,255,0.22)',
    dark: false,
  },
};
// Backwards compat: keep `dusk` as an alias to the active dark palette.
palettes.dusk = palettes.dark;
palettes.dawn = palettes.light;

// Subset of Kyoto / general-travel Unsplash photos — cinematic, warm-lit.
// All verified-working URLs (last checked 2026-05). Sized via Unsplash
// query params so the device frame doesn't choke.
const PHOTOS = {
  kyotoHero:    'https://images.unsplash.com/photo-1493780474015-ba834fd0ce2f?w=1200&q=80&auto=format&fit=crop', // pagoda dusk
  fushimi:      'https://images.unsplash.com/photo-1478436127897-769e1538f1a2?w=900&q=80&auto=format&fit=crop', // torii path
  bambooGrove:  'https://images.unsplash.com/photo-1493997181344-712f2f19d87a?w=900&q=80&auto=format&fit=crop', // bamboo path Arashiyama
  kinkakuji:    'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=900&q=80&auto=format&fit=crop', // golden pavilion
  gion:         'https://images.unsplash.com/photo-1492571350019-22de08371fd3?w=900&q=80&auto=format&fit=crop', // gion alley night
  ramen:        'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=900&q=80&auto=format&fit=crop', // ramen
  matcha:       'https://images.unsplash.com/photo-1536013455834-d2cd9a3baf08?w=900&q=80&auto=format&fit=crop', // matcha
  philosopher:  'https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=900&q=80&auto=format&fit=crop', // wooden path
  nishiki:      'https://images.unsplash.com/photo-1542931287-023b922fa89b?w=900&q=80&auto=format&fit=crop', // market
  arashiyama:   'https://images.unsplash.com/photo-1528164344705-47542687000d?w=900&q=80&auto=format&fit=crop', // mountain temple
  geisha:       'https://images.unsplash.com/photo-1554188572-71b8b2b1a5d8?w=900&q=80&auto=format&fit=crop', // geisha walk
  street:       'https://images.unsplash.com/photo-1542931287-023b922fa89b?w=900&q=80&auto=format&fit=crop', // alley
  temple:       'https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=900&q=80&auto=format&fit=crop', // temple
  sushi:        'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=900&q=80&auto=format&fit=crop', // sushi
  garden:       'https://images.unsplash.com/photo-1480796927426-f609979314bd?w=900&q=80&auto=format&fit=crop', // moss garden
  rain:         'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=900&q=80&auto=format&fit=crop', // mountains
  user1:        'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80&auto=format&fit=crop',
  user2:        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80&auto=format&fit=crop',
  user3:        'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&q=80&auto=format&fit=crop',
};

// Trip seed data — a 7-day Kyoto plan for two. Realistic, not boilerplate.
// Times in 24h "HH:MM". `place` is the searchable POI name; `area` is the
// neighborhood label that anchors the location chip in the UI.
const TRIP = {
  destination: 'Kyoto',
  country: 'Japan',
  dates: 'Apr 4 – Apr 10',
  travelers: 2,
  vibe: ['Hidden gems', 'Local food', 'Romantic'],
  budget: '$$$',
  energy: 'Balanced',
  currentDay: 3,
  totalDays: 7,
  days: [
    { date: 'Apr 4', label: 'Day 1', name: 'Arrival', weather: '☀ 18°' },
    { date: 'Apr 5', label: 'Day 2', name: 'East Kyoto', weather: '☁ 16°' },
    { date: 'Apr 6', label: 'Day 3', name: 'Bamboo & Gold', weather: '⛅ 19°' },
    { date: 'Apr 7', label: 'Day 4', name: 'Geisha District', weather: '☀ 21°' },
    { date: 'Apr 8', label: 'Day 5', name: 'Day Trip Nara', weather: '☀ 22°' },
    { date: 'Apr 9', label: 'Day 6', name: 'Hidden Kyoto', weather: '🌦 17°' },
    { date: 'Apr 10', label: 'Day 7', name: 'Slow morning', weather: '☀ 20°' },
  ],
};

// Day-3 itinerary — used by Timeline & Map. Each item has lat/lng for a
// fake map, an Unsplash image, AI-confidence tag, status, travel chip.
const DAY3 = [
  {
    id: 'a1', time: '08:30', dur: '1h 30m',
    title: 'Slow breakfast at % Arabica',
    area: 'Higashiyama', tag: 'Café · Locals favorite',
    img: PHOTOS.matcha,
    status: 'booked',
    pos: { x: 0.62, y: 0.42 },
    crowd: 'low', weather: 'sunny',
    transport: { mode: 'walk', dur: '0' },
    rating: 4.8,
  },
  {
    id: 'a2', time: '10:15', dur: '2h',
    title: 'Arashiyama Bamboo Grove',
    area: 'Arashiyama', tag: 'Iconic · Best before 11am',
    img: PHOTOS.bambooGrove,
    status: 'upcoming',
    pos: { x: 0.18, y: 0.28 },
    crowd: 'medium', weather: 'sunny',
    transport: { mode: 'train', dur: '24m', line: 'JR Sagano' },
    rating: 4.7,
  },
  {
    id: 'a3', time: '13:00', dur: '1h 15m',
    title: 'Hand-pulled udon at Yoshimura',
    area: 'Arashiyama', tag: 'AI pick · Locals only',
    img: PHOTOS.ramen,
    status: 'suggestion',
    pos: { x: 0.22, y: 0.34 },
    crowd: 'low', weather: 'sunny',
    transport: { mode: 'walk', dur: '6m' },
    rating: 4.9,
  },
  {
    id: 'a4', time: '15:00', dur: '2h',
    title: 'Kinkaku-ji · Golden Pavilion',
    area: 'Kita', tag: 'Must-see · Golden hour',
    img: PHOTOS.kinkakuji,
    status: 'at-risk',
    issue: { kind: 'weather', label: 'Heavy rain forecast 14:30–17:00', severity: 'high' },
    pos: { x: 0.36, y: 0.18 },
    crowd: 'high', weather: 'rain',
    transport: { mode: 'taxi', dur: '18m', cost: '¥1,840' },
    rating: 4.6,
  },
  {
    id: 'a5', time: '18:30', dur: '2h',
    title: 'Kaiseki dinner at Gion Karyo',
    area: 'Gion', tag: 'Reservation held',
    img: PHOTOS.sushi,
    status: 'booked',
    pos: { x: 0.68, y: 0.52 },
    crowd: 'medium', weather: 'clear',
    transport: { mode: 'taxi', dur: '22m', cost: '¥2,100' },
    rating: 4.9,
  },
];

// Active palette (mutable). Default to dark. Screens read this via
// window.useTheme() — see lib.jsx — so toggling re-renders cleanly.
const themeState = {
  mode: 'dark',
  listeners: new Set(),
};
function getTheme()  { return palettes[themeState.mode]; }
function setThemeMode(mode) {
  themeState.mode = mode;
  themeState.listeners.forEach(fn => fn());
}
function subscribeTheme(fn) { themeState.listeners.add(fn); return () => themeState.listeners.delete(fn); }

Object.assign(window, {
  palettes, PHOTOS, TRIP, DAY3,
  SIRI_GRADIENT, SIRI_GRADIENT_LINEAR,
  getTheme, setThemeMode, subscribeTheme, themeState,
});
