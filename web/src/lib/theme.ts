const KEY = 'bsq.theme';
export type Theme = 'light' | 'dark' | 'system';

export function applyTheme(theme: Theme) {
  const dark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', dark);
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', dark ? '#0E1A17' : '#F2F4F3');
  localStorage.setItem(KEY, theme);
}

export function currentTheme(): Theme {
  return (localStorage.getItem(KEY) as Theme) ?? 'system';
}

applyTheme(currentTheme());
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if (currentTheme() === 'system') applyTheme('system');
});
