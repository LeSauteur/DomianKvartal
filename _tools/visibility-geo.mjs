export function geographyMismatch(html, registry) {
  const headings=[html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/iu)?.[1] || "",html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/iu)?.[1] || ""];
  if (!headings.some(text=>/Акса[йея]/iu.test(text)&&!/Ростов/iu.test(text))) return false;
  const byId=new Map(registry.map(r=>[r.id,r]));
  const ids=[...new Set([...html.matchAll(/(?:object|house|land)_\d+/g)].map(m=>m[0]))].filter(id=>byId.has(id));
  return ids.length>0 && ids.filter(id=>byId.get(id).city==="Ростов-на-Дону").length/ids.length>0.5;
}
