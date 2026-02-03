'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type Theme = 'light' | 'dark' | 'system';
export type ColorScheme = 'indigo' | 'blue' | 'purple' | 'green' | 'orange' | 'red';

interface ThemeColors {
  primary: string;
  primaryHover: string;
  primaryLight: string;
  primaryDark: string;
  accent: string;
}

const colorSchemes: Record<ColorScheme, ThemeColors> = {
  indigo: {
    primary: '#6366f1',
    primaryHover: '#4f46e5',
    primaryLight: '#e0e7ff',
    primaryDark: '#3730a3',
    accent: '#818cf8',
  },
  blue: {
    primary: '#3b82f6',
    primaryHover: '#2563eb',
    primaryLight: '#dbeafe',
    primaryDark: '#1e40af',
    accent: '#60a5fa',
  },
  purple: {
    primary: '#8b5cf6',
    primaryHover: '#7c3aed',
    primaryLight: '#ede9fe',
    primaryDark: '#5b21b6',
    accent: '#a78bfa',
  },
  green: {
    primary: '#10b981',
    primaryHover: '#059669',
    primaryLight: '#d1fae5',
    primaryDark: '#047857',
    accent: '#34d399',
  },
  orange: {
    primary: '#f97316',
    primaryHover: '#ea580c',
    primaryLight: '#ffedd5',
    primaryDark: '#c2410c',
    accent: '#fb923c',
  },
  red: {
    primary: '#ef4444',
    primaryHover: '#dc2626',
    primaryLight: '#fee2e2',
    primaryDark: '#b91c1c',
    accent: '#f87171',
  },
};

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  colorScheme: ColorScheme;
  colors: ThemeColors;
  setTheme: (theme: Theme) => void;
  setColorScheme: (scheme: ColorScheme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  defaultColorScheme?: ColorScheme;
  storageKey?: string;
}

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  defaultColorScheme = 'indigo',
  storageKey = 'timelock-theme',
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(defaultTheme);
  const [colorScheme, setColorSchemeState] = useState<ColorScheme>(defaultColorScheme);
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');
  const [mounted, setMounted] = useState(false);

  // Load saved preferences
  useEffect(() => {
    setMounted(true);
    
    const savedTheme = localStorage.getItem(`${storageKey}-mode`) as Theme | null;
    const savedScheme = localStorage.getItem(`${storageKey}-scheme`) as ColorScheme | null;
    
    if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
      setThemeState(savedTheme);
    }
    
    if (savedScheme && Object.keys(colorSchemes).includes(savedScheme)) {
      setColorSchemeState(savedScheme);
    }
  }, [storageKey]);

  // Resolve system theme
  useEffect(() => {
    const resolveTheme = () => {
      if (theme === 'system') {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        setResolvedTheme(mediaQuery.matches ? 'dark' : 'light');
      } else {
        setResolvedTheme(theme);
      }
    };

    resolveTheme();

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (theme === 'system') {
        setResolvedTheme(mediaQuery.matches ? 'dark' : 'light');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  // Apply theme to document
  useEffect(() => {
    if (!mounted) return;

    const root = document.documentElement;
    
    // Remove previous theme classes
    root.classList.remove('light', 'dark');
    root.classList.add(resolvedTheme);
    
    // Set color scheme CSS variables
    const colors = colorSchemes[colorScheme];
    root.style.setProperty('--color-primary', colors.primary);
    root.style.setProperty('--color-primary-hover', colors.primaryHover);
    root.style.setProperty('--color-primary-light', colors.primaryLight);
    root.style.setProperty('--color-primary-dark', colors.primaryDark);
    root.style.setProperty('--color-accent', colors.accent);

    // Save preferences
    localStorage.setItem(`${storageKey}-mode`, theme);
    localStorage.setItem(`${storageKey}-scheme`, colorScheme);
  }, [mounted, resolvedTheme, colorScheme, theme, storageKey]);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
  }, []);

  const setColorScheme = useCallback((newScheme: ColorScheme) => {
    setColorSchemeState(newScheme);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState(prev => {
      if (prev === 'light') return 'dark';
      if (prev === 'dark') return 'light';
      return 'light';
    });
  }, []);

  const value: ThemeContextValue = {
    theme,
    resolvedTheme,
    colorScheme,
    colors: colorSchemes[colorScheme],
    setTheme,
    setColorScheme,
    toggleTheme,
  };

  // Prevent flash of unstyled content
  if (!mounted) {
    return <div style={{ visibility: 'hidden' }}>{children}</div>;
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// Theme toggle component
export function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, setTheme, resolvedTheme } = useTheme();

  const themes: { value: Theme; label: string; icon: string }[] = [
    { value: 'light', label: 'Light', icon: '☀️' },
    { value: 'dark', label: 'Dark', icon: '🌙' },
    { value: 'system', label: 'System', icon: '💻' },
  ];

  return (
    <div className={`flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg ${className}`}>
      {themes.map(({ value, label, icon }) => (
        <button
          key={value}
          onClick={() => setTheme(value)}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
            theme === value
              ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
          aria-label={`Switch to ${label} theme`}
          aria-pressed={theme === value}
        >
          <span>{icon}</span>
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  );
}

// Color scheme picker component
export function ColorSchemePicker({ className = '' }: { className?: string }) {
  const { colorScheme, setColorScheme, colors } = useTheme();

  const schemes: { value: ColorScheme; label: string }[] = [
    { value: 'indigo', label: 'Indigo' },
    { value: 'blue', label: 'Blue' },
    { value: 'purple', label: 'Purple' },
    { value: 'green', label: 'Green' },
    { value: 'orange', label: 'Orange' },
    { value: 'red', label: 'Red' },
  ];

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {schemes.map(({ value, label }) => (
        <button
          key={value}
          onClick={() => setColorScheme(value)}
          className={`w-8 h-8 rounded-full border-2 transition-all ${
            colorScheme === value
              ? 'border-gray-900 dark:border-white scale-110'
              : 'border-transparent hover:scale-105'
          }`}
          style={{ backgroundColor: colorSchemes[value].primary }}
          aria-label={`Switch to ${label} color scheme`}
          aria-pressed={colorScheme === value}
          title={label}
        />
      ))}
    </div>
  );
}

// Quick theme toggle button (just light/dark)
export function ThemeToggleButton({ className = '' }: { className?: string }) {
  const { resolvedTheme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={`p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${className}`}
      aria-label={`Switch to ${resolvedTheme === 'light' ? 'dark' : 'light'} mode`}
    >
      {resolvedTheme === 'light' ? (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      ) : (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      )}
    </button>
  );
}

export default ThemeProvider;
