import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source = fs.readFileSync(new URL('../assets/js/main.js', import.meta.url), 'utf8');
const pure = source.slice(source.indexOf('  function normalizeText('), source.indexOf('  function buildNewbuildTitle('));
const normalize = source.slice(source.indexOf('  function resolveAssetPath('), source.indexOf('  function normalizeMergedNewbuild('));
const context = vm.createContext({});
vm.runInContext(pure + normalize, context);
test('IDs and square metres do not become rooms; valid rooms remain', () => {
  for (const value of ['object_905 Квартира', 'object_901 Квартира', 'Дом 100 кв.м', 'Объект 905', '', '100-комнатная']) assert.equal(context.extractRooms(value), null, value);
  for (const [value, count] of [['1-комнатная',1], ['2-к квартира',2], ['3 комнаты',3], ['4-комнатная квартира',4], ['5 комнат',5], ['евро-2 квартира',null]]) assert.equal(context.extractRooms(value), count, value);
});
test('real incomplete records never receive inferred rooms or invented prices', () => {
  const data = JSON.parse(fs.readFileSync(new URL('../objects/object_905/data.json', import.meta.url)));
  const item = context.normalizeItem('apartments', {id:'object_905',title:'object_905'}, data, 0);
  assert.equal(item.meta.rooms, null);
  assert.equal(item.meta.price, 4900000);
  const empty = context.normalizeItem('houses', {id:'house_100',path:'houses/house_100'}, {title:'Дом 100 кв.м',description:'',images:[]}, 0);
  assert.equal(empty.meta.rooms, null);
  assert.equal(empty.meta.price, null);
  assert.equal(empty.meta.area, 100);
});
test('numeric facts must be valid and explicitly supported', () => {
  assert.equal(context.parsePriceValue('-5000000'), null);
  assert.equal(context.parsePriceValue('200000 руб/м²'), null);
  assert.equal(context.parsePriceValue('6,2 млн'), 6200000);
  assert.equal(context.extractFloor('Этаж 20/10'), null);
  assert.equal(context.extractFloor('Этаж 3/9'), 3);
  assert.equal(context.extractFloors('Адрес: Берберовская 4/5'), null);
  const item = context.normalizeItem('apartments', {id:'object_1'}, {title:'Квартира',rooms:3,area:-4,floor:5,floors:3,price:'по запросу',description:'',images:[]}, 0);
  assert.equal(item.meta.rooms,3);
  assert.equal(item.meta.area,null);
  assert.equal(item.meta.floor,null);
  assert.equal(item.meta.price,null);
});
