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

  /* Orange / amber tones — soften on light background */
  [data-theme="light"] .text-\\[\\#FF8C00\\]   { color: #c46800 !important; }
  [data-theme="light"] .text-amber-400         { color: #92580a !important; }
  [data-theme="light"] .text-amber-300         { color: #7a4a08 !important; }
  [data-theme="light"] .bg-\\[\\#FF8C00\\]\\/3  { background-color: rgba(196,104,0,0.06) !important; }
  [data-theme="light"] .bg-\\[\\#FF8C00\\]\\/5  { background-color: rgba(196,104,0,0.08) !important; }
  [data-theme="light"] .bg-\\[\\#FF8C00\\]\\/8  { background-color: rgba(196,104,0,0.10) !important; }
  [data-theme="light"] .bg-\\[\\#FF8C00\\]\\/10 { background-color: rgba(196,104,0,0.10) !important; }
  [data-theme="light"] .bg-\\[\\#FF8C00\\]\\/15 { background-color: rgba(196,104,0,0.12) !important; }
  [data-theme="light"] .bg-amber-500\\/5       { background-color: rgba(146,88,10,0.06) !important; }
  [data-theme="light"] .bg-amber-500\\/10      { background-color: rgba(146,88,10,0.08) !important; }
  [data-theme="light"] .border-\\[\\#FF8C00\\]\\/20 { border-color: rgba(196,104,0,0.20) !important; }
  [data-theme="light"] .border-\\[\\#FF8C00\\]\\/40 { border-color: rgba(196,104,0,0.30) !important; }
  [data-theme="light"] .border-amber-500\\/20  { border-color: rgba(146,88,10,0.20) !important; }
  [data-theme="light"] .text-amber-400\\/60    { color: rgba(122,74,8,0.70) !important; }
  [data-theme="light"] .shadow-\\[\\#FF8C00\\]\\/20 { box-shadow: none !important; }

  /* Green tones */
  [data-theme="light"] .text-green-400         { color: #166534 !important; }
  [data-theme="light"] .text-green-400\\/70     { color: rgba(22,101,52,0.70) !important; }
  [data-theme="light"] .bg-green-500\\/10       { background-color: rgba(22,163,74,0.08) !important; }
  [data-theme="light"] .border-green-500\\/20   { border-color: rgba(22,163,74,0.25) !important; }
  [data-theme="light"] .bg-green-500\\/15       { background-color: rgba(22,163,74,0.12) !important; }

  /* Red tones */
  [data-theme="light"] .text-red-400           { color: #991b1b !important; }
  [data-theme="light"] .bg-red-500\\/5          { background-color: rgba(153,27,27,0.05) !important; }
  [data-theme="light"] .bg-red-500\\/10         { background-color: rgba(153,27,27,0.07) !important; }
  [data-theme="light"] .border-red-500\\/20     { border-color: rgba(153,27,27,0.20) !important; }
  [data-theme="light"] .hover\\:bg-red-500\\:15:hover { background-color: rgba(153,27,27,0.12) !important; }

  /* Blue tones */
  [data-theme="light"] .text-blue-400          { color: #1e40af !important; }
  [data-theme="light"] .bg-blue-400\\/10        { background-color: rgba(30,64,175,0.07) !important; }
  [data-theme="light"] .border-blue-400\\/20    { border-color: rgba(30,64,175,0.20) !important; }

  /* Cyan tones */
  [data-theme="light"] .text-cyan-400          { color: #0e7490 !important; }
  [data-theme="light"] .bg-cyan-400\\/10        { background-color: rgba(14,116,144,0.07) !important; }
  [data-theme="light"] .border-cyan-400\\/20    { border-color: rgba(14,116,144,0.20) !important; }

  /* Purple tones */
  [data-theme="light"] .text-purple-400        { color: #6b21a8 !important; }
  [data-theme="light"] .bg-purple-500\\/10      { background-color: rgba(107,33,168,0.07) !important; }
  [data-theme="light"] .border-purple-500\\/20  { border-color: rgba(107,33,168,0.20) !important; }

  /* Inputs and cards */
  [data-theme="light"] input,
  [data-theme="light"] textarea { background-color: rgba(0,0,0,0.04) !important; border-color: rgba(0,0,0,0.12) !important; }
  [data-theme="light"] .rounded-2xl.border { border-color: rgba(0,0,0,0.10) !important; }
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
