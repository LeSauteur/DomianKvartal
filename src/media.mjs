import { origin } from './paths.mjs';

export const archivedMediaOrigin = 'https://raw.githubusercontent.com/LeSauteur/DomianKvartal-images/main/';
export const localMirrorPrefix = '/assets/images/legacy/';

export function localMediaPath(source) {
  const url = new URL(source, origin);
  if (url.origin === origin) return url.pathname;
  if (url.href.startsWith(archivedMediaOrigin)) return localMirrorPrefix + url.href.slice(archivedMediaOrigin.length);
  return null;
}
