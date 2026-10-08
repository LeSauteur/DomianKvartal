import fs from 'node:fs';
import { root } from './build-registry.mjs';
import { publicPage } from './public-page.mjs';

fs.writeFileSync(root + '/404.html', publicPage({
  file: '404.html', title: 'Страница не найдена | Домиан Квартал',
  description: 'Найдите нужный раздел сайта агентства недвижимости Домиан Квартал.',
  h1: 'Страница не найдена', noindex: true,
  body: `<p>Проверьте адрес или найдите нужный раздел ниже.</p>
<nav aria-label="Поиск по разделам"><ul>
<li><a href="/apartments.html">Квартиры</a></li>
<li><a href="/houses.html">Дома</a></li>
<li><a href="/lands.html">Участки</a></li>
<li><a href="/newbuilds.html">Новостройки</a></li>
<li><a href="/">Главная</a></li>
</ul></nav><p>Мы поможем найти нужную информацию: <a href="tel:+79536091122">+7 953 609-11-22</a>.</p>`
}));
