// Conservative extraction: only labelled facts, never digits in IDs or addresses.
const number = value => Number(String(value).replace(",", "."));
const square = "(?:м²|м2|кв\\.?\\s*м\\.?)";
export function parsePrice(value) {
  if (typeof value === "number") return Number.isFinite(value) && value > 0 ? value : null;
  const text = String(value ?? "").replace(/\u00a0|\u202f/g, " ").trim();
  if (!text || /(?:^-|\/|за\s*(?:м|сот)|уточн|запрос)/iu.test(text)) return null;
  const m = text.match(/^(\d[\d ]*(?:[.,]\d+)?)\s*(млн|миллион\p{L}*|тыс\p{L}*)?\s*(?:₽|руб\p{L}*)?\s*$/iu);
  if (!m) return null;
  const amount = number(m[1].replace(/ /g, "")) * (/мл|мил/iu.test(m[2] || "") ? 1e6 : /тыс/iu.test(m[2] || "") ? 1e3 : 1);
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}
export function parseNumbers(title, description, type) {
  const text = [title, description].join(" ").replace(/[‑–—]/g, "-");
  const unique = (re, min, max, integer = false) => {
    const values = [...text.matchAll(re)].map(m => number(m[1])).filter(n => n >= min && n <= max && (!integer || Number.isInteger(n)));
    const all = [...new Set(values)];
    return all.length === 1 ? all[0] : null;
  };
  const rooms = type === "land" ? null : unique(/(?:^|[^\p{L}\d_])(\d{1,2})(?:х)?\s*(?:-?\s*комнат(?:ная|ный|ное|ную|ных|ы|а)?|комн\.|-\s*к(?=[.\s-]))/giu, 1, 30, true);
  const labelledArea = [...text.matchAll(new RegExp("(?:общая\\s+площадь(?:\\s+дома)?|площадь\\s+дома)\\s*[:=-]?\\s*(\\d+(?:[.,]\\d+)?)\\s*" + square, "giu"))].map(m=>number(m[1]));
  const titleArea = String(title).match(new RegExp("(\\d+(?:[.,]\\d+)?)\\s*" + square, "iu"));
  const firstArea = text.match(new RegExp("(?:дом|квартира|студия|коттедж)\\s*(?:площадью\\s*)?(\\d+(?:[.,]\\d+)?)\\s*" + square, "iu"));
  const areas = [...new Set(labelledArea.length ? labelledArea : titleArea ? [number(titleArea[1])] : firstArea ? [number(firstArea[1])] : [])];
  const area_total = type !== "land" && areas.length === 1 && areas[0] > 0 ? areas[0] : null;
  const lot_area_sotok = unique(/(?:^|[^\d])(\d+(?:[.,]\d+)?)\s*сот(?:ок|ки|ка|ку|\.)?(?=[^\p{L}]|$)/giu, 0.1, 100000);
  const pair = text.match(/(?:этаж\s*[:=-]?\s*|на\s+)(\d{1,3})(?:-?м)?\s*(?:этаже\s*)?(?:из|\/)\s*(\d{1,3})/iu);
  const floorOnly = text.match(/этаж\s*[:=-]?\s*(\d{1,3})(?!\d)|на\s+(\d{1,3})-?м\s+этаже/iu);
  const floorsOnly = text.match(/(?:^|[^\d])(\d{1,3})\s*-?\s*этажн/iu);
  let floor = pair ? number(pair[1]) : floorOnly ? number(floorOnly[1] || floorOnly[2]) : null;
  const floors = pair ? number(pair[2]) : floorsOnly ? number(floorsOnly[1]) : null;
  if (floor !== null && (floor < 1 || floor > 150 || (floors !== null && floor > floors))) floor = null;
  return { area_total, rooms, floor, floors: floors > 0 && floors <= 150 ? floors : null, lot_area_sotok };
}
export function parseLocation(title, description, explicit = {}) {
  // Agent coverage and travel times are not an object's location.
  const text = [title, description].join(" ").replace(/(?:Работаю по|Ваш участковый риэлтор|Продажа домов в)[\s\S]*$/iu, "");
  const patterns = [
    ["Аксай", /(?:г\.\s*|город\s*[:=-]?\s*|в\s+|центр(?:е|а)?\s+)(Аксай|Аксае|Аксая)(?![\p{L}])|(?:^|[,;\n ])(Аксай),\s*(?:ул\.|Платова|Луговой|Ростовская)/iu],
    ["Аксайский район", /(Аксайск(?:ий|ого|ом)\s+(?:район(?:а|е)?|р-н))/iu],
    ["Ростов-на-Дону", /(?:Ростов(?:е|а)?[-\s]на[-\s]Дону)/iu],
    ["другое", /(?:г\.\s*|город\s*[:=-]?\s*|в\s+)(Шахты|Шахтах|Батайск|Батайске|Таганрог|Таганроге)|(?:Азовск(?:ий|ого|ом)|Мясниковск(?:ий|ого|ом))\s+(?:район(?:е|а)?|р-н)/iu]
  ];
  const hits = patterns.flatMap(([city, re]) => { const m = text.match(re); return m ? [{ city, evidence: m[0] }] : []; });
  let city = hits.length ? hits[0].city : null;
  const given = String(explicit.city || "");
  if (/^Аксай$/iu.test(given)) city = "Аксай";
  else if (/^Ростов-на-Дону$/iu.test(given)) city = "Ростов-на-Дону";
  else if (/^Аксайский район$/iu.test(given)) city = "Аксайский район";
  else if (given && !/уточн|UNK/iu.test(given)) city = "другое";
  const settlement = text.match(/(?:пос(?:ёлок|елок|\.)?|п\.|хут(?:ор|\.)?|х\.|станиц(?:а|е))\s+([А-ЯЁ][а-яё-]+(?:\s+[А-ЯЁ][а-яё-]+)?)/u);
  const street = text.match(/(?:ул\.|улица|пер\.|переулок)\s+[А-ЯЁ][а-яё\d .-]{2,65}/u);
  const district = text.match(/(?:Азовский|Мясниковский|Аксайский)\s*(?:район|р-н)/iu);
  return {
    city, settlement: explicit.settlement || settlement?.[1] || null,
    district: explicit.district || district?.[0] || null,
    address: explicit.address || null,
    city_suggested: city === null ? settlement?.[1] || street?.[0]?.trim() || null : null,
    city_evidence: hits[0]?.evidence || (city === null ? settlement?.[0] || street?.[0]?.trim() || null : given || null)
  };
}
