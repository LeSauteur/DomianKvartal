const listings = require('../src/data/listings.json');
const published = listings.filter(item => item.published);
const active = published.filter(item => item.availability.status === 'active');
const byId = Object.fromEntries(published.map(item => [item.id,item]));
const displayPrice = price => price === null ? 'Цена по запросу' : new Intl.NumberFormat('ru-RU').format(price)+' ₽';
function chooseActive(preferred, matches) {
  const candidates = active.filter(matches);
  const item = candidates.find(record => record.id === preferred) ?? candidates[0];
  if (!item) throw new Error('No active listing for test scenario: ' + preferred);
  return item;
}
const aksaySelection = (type, preferred) => chooseActive(preferred,
  item => item.type === type && (item.location.city === 'Аксай' || (type === 'house' && item.location.city === 'Аксайский район')));
module.exports = { active, byId, displayPrice, chooseActive, aksaySelection };
