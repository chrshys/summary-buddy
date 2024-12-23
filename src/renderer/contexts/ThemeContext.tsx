import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
} from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  effectiveTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'system',
  effectiveTheme: 'dark',
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const savedTheme = localStorage.getItem('theme');
    return (savedTheme as Theme) || 'system';
  });
  const [effectiveTheme, setEffectiveTheme] = useState<'light' | 'dark'>(
    'dark',
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const updateEffectiveTheme = () => {
      if (theme === 'system') {
        setEffectiveTheme(mediaQuery.matches ? 'dark' : 'light');
      } else {
        setEffectiveTheme(theme as 'light' | 'dark');
      }
    };

    const handleChange = (e: MediaQueryListEvent) => {
      if (theme === 'system') {
        setEffectiveTheme(e.matches ? 'dark' : 'light');
      }
    };

    updateEffectiveTheme();
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  const value = useMemo(
    () => ({
      theme,
      effectiveTheme,
      setTheme: handleThemeChange,
    }),
    [theme, effectiveTheme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
