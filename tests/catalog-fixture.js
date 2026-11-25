const listings = require('../src/data/listings.json');
const published = listings.filter(item => item.published);
const active = published.filter(item => item.availability.status === 'active');
const byId = Object.fromEntries(published.map(item => [item.id,item]));
const displayPrice = price => price === null ? 'Цена по запросу' : new Intl.NumberFormat('ru-RU').format(price)+' ₽';
module.exports = { active, byId, displayPrice };
