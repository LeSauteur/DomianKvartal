import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { noindex, canonical, urlFor, readPage, fileForUrl, linkGraph } from "../_tools/site-pages.mjs";
test("all retained sitemap URLs have incoming links and can be reached from home",()=>{
  const graph=linkGraph();
  for(const m of fs.readFileSync("sitemap.xml","utf8").matchAll(/<loc>(.*?)<\/loc>/g)) {
    const file=fileForUrl(m[1]),html=readPage(file);
    assert.ok(graph.incoming.get(file)>0,file);
    assert.ok(graph.reachable.has(file),file);
    assert.equal(noindex(html),false,file);
    assert.equal(canonical(html),m[1],file);
  }
});
test("canonical aliases keep files and use the fuller verified selection",()=>{
  for(const [alias,main] of [["veresaeva","veresaevo"],["sokol-grad-2","sokol-grad"]]){
    const file="seo/kvartiry-zhk-"+alias+".html",target="seo/kvartiry-zhk-"+main+".html";
    assert.equal(canonical(readPage(file)),urlFor(target));
    assert.equal(noindex(readPage(file)),false);
  }
  for(const file of ["kvartiry-loc-aksay","doma-loc-aksay","doma-raion-aksayskiy-rayon","uchastki-loc-aksay","uchastki-raion-aksayskiy-rayon","doma-loc-rossiyskiy"])assert.equal(noindex(readPage("seo/"+file+".html")),false,file);
  assert.equal(canonical(readPage("seo/kvartiry-zhk-vishnevyy-sad.html")),urlFor("seo/kvartiry-zhk-vishnevyy-sad.html"));
  assert.ok(fs.readFileSync("docs/owner/seo-pages-decision.csv","utf8").includes("вопрос владельцу"));
});
test("decision CSV covers all existing SEO pages and newbuild detail folders",()=>{
  const csv=fs.readFileSync("docs/owner/seo-pages-decision.csv","utf8");
  assert.equal(csv.trim().split(/\r?\n/).length,48);
  for(const file of fs.readdirSync("seo").filter(x=>x.endsWith(".html")))assert.ok(csv.includes(urlFor("seo/"+file)),file);
  for(const folder of fs.readdirSync("newbuilds").filter(x=>fs.existsSync("newbuilds/"+x+"/index.html")))assert.ok(csv.includes(urlFor("newbuilds/"+folder+"/index.html")),folder);
});
