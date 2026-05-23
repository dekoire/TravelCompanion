import React, { createContext, useContext, useState } from 'react';
import { ThemePalette, darkPalette, lightPalette } from './index';

interface ThemeContextValue {
  palette: ThemePalette;
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  palette: darkPalette,
  isDark: true,
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(true);
  const palette = isDark ? darkPalette : lightPalette;
  const toggleTheme = () => setIsDark(d => !d);

  return (
    <ThemeContext.Provider value={{ palette, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
