'use client';
import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'dark' | 'light';

const LIGHT_CSS = `
  [data-theme="light"] .bg-\\[\\#111111\\] { background-color: #f0f2f5 !important; }
  [data-theme="light"] .bg-\\[\\#1a1a1a\\] { background-color: #ffffff !important; }

  /* Topbar / nav with opacity modifier — target by backdrop-blur + sticky combo */
  [data-theme="light"] nav,
  [data-theme="light"] .sticky.backdrop-blur { background-color: rgba(240,242,245,0.95) !important; }
  [data-theme="light"] nav .border-white\\/20 { border-color: rgba(0,0,0,0.15) !important; }
  [data-theme="light"] nav .text-white\\/60 { color: rgba(0,0,0,0.55) !important; }
  [data-theme="light"] nav .hover\\:text-white:hover { color: #0f0f0f !important; }
  [data-theme="light"] nav .hover\\:bg-white\\/10:hover { background-color: rgba(0,0,0,0.07) !important; }
  [data-theme="light"] nav input { background-color: rgba(0,0,0,0.05) !important; color: #0f0f0f !important; border-color: rgba(0,0,0,0.12) !important; }

  [data-theme="light"] .bg-white\\/3  { background-color: rgba(0,0,0,0.03) !important; }
  [data-theme="light"] .bg-white\\/5  { background-color: rgba(0,0,0,0.05) !important; }
  [data-theme="light"] .bg-white\\/8  { background-color: rgba(0,0,0,0.06) !important; }
  [data-theme="light"] .bg-white\\/10 { background-color: rgba(0,0,0,0.08) !important; }
  [data-theme="light"] .bg-white\\/15 { background-color: rgba(0,0,0,0.10) !important; }

  [data-theme="light"] .hover\\:bg-white\\/3:hover  { background-color: rgba(0,0,0,0.04) !important; }
  [data-theme="light"] .hover\\:bg-white\\/5:hover  { background-color: rgba(0,0,0,0.06) !important; }
  [data-theme="light"] .hover\\:bg-white\\/8:hover  { background-color: rgba(0,0,0,0.07) !important; }
  [data-theme="light"] .hover\\:bg-white\\/10:hover { background-color: rgba(0,0,0,0.09) !important; }

  [data-theme="light"] .border-white\\/5  { border-color: rgba(0,0,0,0.06) !important; }
  [data-theme="light"] .border-white\\/8  { border-color: rgba(0,0,0,0.09) !important; }
  [data-theme="light"] .border-white\\/10 { border-color: rgba(0,0,0,0.11) !important; }
  [data-theme="light"] .border-white\\/12 { border-color: rgba(0,0,0,0.13) !important; }
  [data-theme="light"] .border-white\\/15 { border-color: rgba(0,0,0,0.16) !important; }
  [data-theme="light"] .border-white\\/20 { border-color: rgba(0,0,0,0.16) !important; }
  [data-theme="light"] .hover\\:border-white\\/12:hover { border-color: rgba(0,0,0,0.15) !important; }
  [data-theme="light"] .hover\\:border-white\\/15:hover { border-color: rgba(0,0,0,0.18) !important; }

  [data-theme="light"] .text-white      { color: #0f0f0f !important; }
  [data-theme="light"] .text-white\\/70  { color: rgba(0,0,0,0.70) !important; }
  [data-theme="light"] .text-white\\/60  { color: rgba(0,0,0,0.60) !important; }
  [data-theme="light"] .text-white\\/50  { color: rgba(0,0,0,0.50) !important; }
  [data-theme="light"] .text-white\\/40  { color: rgba(0,0,0,0.40) !important; }
  [data-theme="light"] .text-white\\/35  { color: rgba(0,0,0,0.35) !important; }
  [data-theme="light"] .text-white\\/30  { color: rgba(0,0,0,0.30) !important; }
  [data-theme="light"] .text-white\\/25  { color: rgba(0,0,0,0.25) !important; }
  [data-theme="light"] .text-white\\/20  { color: rgba(0,0,0,0.20) !important; }
  [data-theme="light"] .text-white\\/15  { color: rgba(0,0,0,0.15) !important; }
  [data-theme="light"] .hover\\:text-white\\/70:hover { color: rgba(0,0,0,0.80) !important; }

  [data-theme="light"] .placeholder-white\\/25::placeholder { color: rgba(0,0,0,0.30) !important; }

  [data-theme="light"] input:not([type="checkbox"]):not([type="radio"]) { color: #0f0f0f !important; }
  [data-theme="light"] select   { color: #0f0f0f !important; }
  [data-theme="light"] textarea { color: #0f0f0f !important; }
  [data-theme="light"] input::placeholder    { color: rgba(0,0,0,0.30) !important; }
  [data-theme="light"] textarea::placeholder { color: rgba(0,0,0,0.30) !important; }
  [data-theme="light"] select option { background: #ffffff; color: #0f0f0f; }
  [data-theme="light"] .bg-black\\/70 { background-color: rgba(0,0,0,0.35) !important; }
`;

const ThemeContext = createContext<{ theme: Theme; toggle: () => void }>({
  theme: 'dark',
  toggle: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    const saved = localStorage.getItem('koursa-theme') as Theme | null;
    if (saved === 'light' || saved === 'dark') setTheme(saved);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('koursa-theme', theme);

    let style = document.getElementById('koursa-theme-overrides') as HTMLStyleElement | null;
    if (!style) {
      style = document.createElement('style');
      style.id = 'koursa-theme-overrides';
      document.head.appendChild(style);
    }
    style.textContent = theme === 'light' ? LIGHT_CSS : '';
  }, [theme]);

  const toggle = () => setTheme(t => (t === 'dark' ? 'light' : 'dark'));

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
