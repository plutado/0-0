import '../src/element';
import { transcriptCuesToVtt, type Theme } from '../src/index';

const player = document.querySelector('zero-zero-player')!;
const params = new URLSearchParams(location.search);

// ?t=14 starts at 14 seconds; ?theme=dark forces a theme. Useful for links and screenshots.
const t = params.get('t');
if (t) player.setAttribute('start', t);
const themeParam = params.get('theme');
const themeSelect = document.querySelector<HTMLSelectElement>('#theme')!;

function applyTheme(theme: Theme) {
  player.setAttribute('theme', theme);
  if (theme === 'auto') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.dataset.theme = theme;
  themeSelect.value = theme;
}
if (themeParam === 'light' || themeParam === 'dark') applyTheme(themeParam);
themeSelect.addEventListener('change', () => applyTheme(themeSelect.value as Theme));

player.addEventListener('zz-ready', () => {
  const link = document.querySelector<HTMLAnchorElement>('#export')!;
  const cues = player.player?.cues.cues ?? [];
  link.href = URL.createObjectURL(new Blob([transcriptCuesToVtt(cues)], { type: 'text/vtt' }));
});
player.addEventListener('zz-error', (event) => console.error((event as CustomEvent).detail));
