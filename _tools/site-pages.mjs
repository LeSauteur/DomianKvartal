import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { root } from "./build-registry.mjs";
export const siteOrigin = "https://domian-161.ru";
const excluded = ["_private/","_prototype_catalog/","company-rebuild/","source/","ui-blocks/","ui-rebuild/","docs/","tests/","data/","_tools/","output/"];
export function publicHtmlFiles() {
  return [...new Set(execFileSync("git",["ls-files","--cached","--others","--exclude-standard","--","*.html"],{cwd:root,encoding:"utf8"}).trim().split(/\r?\n/))]
    .filter(file=>file && fs.existsSync(path.join(root,file)) && !excluded.some(p=>file.startsWith(p)) && !["admin.html","index-preview.html","googlea9952ce6911e1672.html","yandex_9a50321c8f91e932.html"].includes(file)).sort();
}
export const readPage = file => fs.readFileSync(path.join(root,file),"utf8");
// Preserve the established /guides/index.html canonical; other directory pages use trailing slashes.
export const urlFor = file => siteOrigin + "/" + (file==="index.html"?"":file!=="guides/index.html" && file.endsWith("/index.html")?file.slice(0,-10):file);
export const noindex = html => /<meta\b[^>]*name=["']robots["'][^>]*content=["'][^"']*noindex/iu.test(html);
export const canonical = html => html.match(/<link\b[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/iu)?.[1] || null;
export function fileForUrl(value, from="index.html") {
  try {
    const url=new URL(value.replaceAll("&amp;","&"),siteOrigin+"/"+from);
    if(url.origin!==siteOrigin) return null;
    const pathname=decodeURIComponent(url.pathname).replace(/^\/+/,"");
    return !pathname?"index.html":pathname.endsWith("/")?pathname+"index.html":pathname;
  } catch {return null;}
}
export function linkGraph(files=publicHtmlFiles()) {
  const graph=new Map(), incoming=new Map(files.map(file=>[file,0]));
  for (const file of files) {
    const links=[...readPage(file).matchAll(/<a\b[^>]*href=["']([^"']+)["']/giu)].map(m=>fileForUrl(m[1],file)).filter(Boolean);
    graph.set(file,links);
    for(const target of links) if(target!==file && incoming.has(target)) incoming.set(target,incoming.get(target)+1);
  }
  const reachable=new Set(),queue=["index.html"];
  while(queue.length) {
    const file=queue.pop();if(reachable.has(file))continue;
    reachable.add(file);queue.push(...(graph.get(file)||[]));
  }
  return {graph,incoming,reachable};
}
