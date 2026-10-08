import fs from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";
import { geographyMismatch } from "../_tools/visibility-geo.mjs";
test("geography audit flags misleading titles only above the 50% threshold",()=>{
  const r=[{id:"object_1",city:"Ростов-на-Дону"},{id:"object_2",city:"Ростов-на-Дону"},{id:"object_3",city:null}];
  assert.equal(geographyMismatch("<title>Купить квартиру в Аксае</title>object_1 object_2 object_3",r),true);
  assert.equal(geographyMismatch("<title>Квартиры в Аксае и Ростове</title>object_1 object_2 object_3",r),false);
  assert.equal(geographyMismatch("<h1>Дома в Аксае</h1>object_1 object_3",r),false);
  assert.equal(geographyMismatch("<h1>Дома в Аксае</h1>",r),false);
});
test("apartment metadata is honest and showcase is excluded without removing its file",()=>{
  const html=fs.readFileSync("apartments.html","utf8");
  assert.match(html,/<h1>Квартиры в Аксае и Ростове-на-Дону<\/h1>/);
  assert.match(html,/<title>Квартиры в Аксае и Ростове-на-Дону — вторичное жильё \| Домиан Квартал<\/title>/);
  assert.match(html,/В Аксае сейчас 6 квартир/);
  assert.match(fs.readFileSync("showcase-aksay-secondary.html","utf8"),/content="noindex,follow"/);
});
