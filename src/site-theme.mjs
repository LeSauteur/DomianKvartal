export const objectGalleryAssets='<link rel="stylesheet" href="/assets/css/object-gallery.css"><script src="/assets/js/photo-thumbnails.js" defer></script><script src="/assets/js/object-gallery.js" defer></script>';
export const siteThemeLink = '<link rel="stylesheet" href="/assets/css/wine-theme.css">';
const mainStyles = /<link\b[^>]*\bhref\s*=\s*["'](?:[^"']*\/)?assets\/css\/main\.css(?:[?#][^"']*)?["']/i;

export function usesSiteStyles(html) {
  return mainStyles.test(html);
}

export function applySiteTheme(html) {
  if (!usesSiteStyles(html)) return html;
  if (!/<\/head\s*>/i.test(html)) throw new Error('Missing stylesheet insertion point');
  return html.replace(/<\/head\s*>/i, closingTag => siteThemeLink + closingTag);
}
