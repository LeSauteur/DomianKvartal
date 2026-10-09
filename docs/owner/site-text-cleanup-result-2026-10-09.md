# Промежуточный результат очистки текстов сайта — 09.10.2026

Этот документ фиксирует предыдущий этап. Последующие уточнения владельца, окончательные проверки и разрешение публикации отражены в [финальном отчёте](C:/KV/DomianKvartal/docs/owner/site-text-cleanup-verification-2026-10-09.md).

Изменения внесены локально. Публикация, push и создание PR не выполнялись. Основание — утверждение основного списка 1–106 и новых находок N1–N8 с условиями владельца.

Опубликованные цены, площади, сроки, характеристики и гарантии сохранены. Цена ЖК «Флора» осталась 3,8–7,2 млн ₽. Даты строительства и сроки сдачи сохранены как факты; удалены согласованные даты проверки и комментарии об источниках.

## Согласованный объём

- Полностью удалены текстовые блоки 1–10, 20, 28–32, 35, 38–47, 50–51, 94–96, 99, 106. В пунктах с полезными ссылками сами ссылки сохранены.
- Переписаны клиентским языком 11–19, 21–27, 36–37, 48, 54–58, 60–63, 97–98, 100–105. Нет упоминаний архивов, каталогов, таблиц, проверки или даты проверки.
- В пункте 11 сохранено различие между визуализацией и фотографией построенного дома. В пункте 12 оставлено «Точные размеры — в проектной документации». Для предложений без цены используются «Стоимость по запросу» / «Рассчитаем стоимость похожего дома».
- В пунктах 52–53 оставлено «Цена и наличие не являются публичной офертой». Та же строка добавлена на статические и динамические карточки с числовой ценой.
- В пунктах 33–34 удалены фильтр «Полнота» и сортировка «Сначала проверенные». Сортировка по умолчанию — по названию; доступны цена по возрастанию/убыванию и название.
- В пунктах 44, 49, 57 сохранены адреса ссылок на застройщиков и проектные документы; подписи сделаны клиентскими.
- В пункте 56 сохранено указание, что сроки относятся к конкретным корпусам и очередям.
- В пунктах 75–80 «Рендер» заменён на «Визуализация», в том числе «Визуализация фасада, вариант 1».
- В пункте 59 удалена архивная пометка, цена не изменена.
- Исключённые из правок пункты 64–74 и 81–93 сохранены.

[Исходный список 1–106](C:/KV/DomianKvartal/docs/owner/site-text-cleanup-approval-2026-10-09.md) и [новые находки](C:/KV/DomianKvartal/docs/owner/site-text-cleanup-new-findings-2026-10-09.md) оставлены как документы исходного согласования. Ниже зафиксирован фактический результат N1–N8.

## N1–N8: было → стало

### N1 — гарантия и сроки Эквиты

**Было:** «Сроки и гарантии в презентации не детализированы и должны быть закреплены в договоре.»

**Стало:** «Сроки строительства и гарантии фиксируются в договоре.»

Обновлены данные, генератор и текущие страницы Эквиты.

### N2 — описание дома Эквиты

**Было:** «Современный двухэтажный дом со встроенным гаражом на два автомобиля. В презентации указаны жилая площадь 107,8 м², общая площадь с террасой и крыльцом 337 м² и площадь застройки 237,1 м².»

**Стало:** «Современный двухэтажный дом со встроенным гаражом на два автомобиля. Жилая площадь — 107,8 м², общая площадь с террасой и крыльцом — 337 м², площадь застройки — 237,1 м².»

Все площади сохранены. Видимый текст и существующее описание Schema.org согласованы.

### N3 — служебная заметка price.note

**Было:** «Актуальная минимальная цена не подтверждена на первичном источнике.»

**Стало в JSON:** без изменения, согласно условию о сохранении служебных полей. Это поле карточки посетителю не выводят; на сайте такой заметки нет. Числовые цены, статусы и служебные данные JSON не изменены. Первоначально предложенная замена поля на «Стоимость по запросу» не применялась.

### N4 — «Ленина, 46»

**Было в исходном описании:** «Сданный жилой комплекс рядом с площадью Ленина. Актуальная цена и наличие квартир на официальной странице не подтверждены.»

**Стало при выводе описания:** «Сданный жилой комплекс рядом с площадью Ленина.»

Текущий каталог это описание не показывает. Исходные JSON сохранены, а генератор очищает описание при выводе в текст, meta description, og:description и существующее поле Schema.org description. Такое преобразование проверено тестом.

### N5 — «Екатерининский»

**Было в исходном описании:** «Многокорпусный жилой комплекс в западной части Ростова-на-Дону. Актуальная цена первичного предложения не подтверждена.»

**Стало при выводе описания:** «Многокорпусный жилой комплекс в западной части Ростова-на-Дону.»

Как и для N4, исходные JSON сохранены, клиентский вывод генератора очищен и согласован с метаданными и Schema.org. Служебные статусы не затронуты.

### N6 — галерея «Левобережья»

**Было:** «Что уточнить: третье изображение галереи.»

**Стало:** заметка удалена со страницы и из шаблона генератора. Галерея содержит два изображения и две рамки; пустых рамок и заглушек нет.

### N7 — планировки

**Было:** «Изображения получены с официального сайта проекта. Наличие конкретной квартиры и параметры нужно подтвердить перед сделкой.»

**Стало:** «Выберите подходящую планировку — поможем подобрать квартиру.»

Обновлены страницы Academia, Gray, «Октябрь Парк» и генератор.

### N8 — резервное описание генератора

**Было:** «Информация о проекте уточняется.»

**Стало:** «Подробности — по запросу».

Резервный текст сохранён. Проверено создание страницы с пустым исходным описанием: в видимом тексте и существующем Schema.org description появляется эта фраза; нет undefined или пустого абзаца.

## Исходники и защита от возврата текстов

Исправлены генераторы строительства и новостроек, генератор страниц ЖК, данные текстовых блоков, скрипты карточек и формы. Проверены результаты рендера 37 страниц строительства и 21 страницы новостроек без записи sitemap.

Служебные поля источников, дат, статусов цены и полноты данных сохранены. Они больше не используются для вывода удалённых клиентских подписей. Для N4–N5 клиентское преобразование выполняет генератор; исходные JSON не изменены.

Проверены title, meta description, og:*, alt, JSON-LD и текстовые данные каталога. Title, SEO-заголовки, URL, canonical, sitemap и robots сохранены. В Schema.org не добавлены свойства или типы; изменены только согласованные описания. FAQ-разметка страниц ЖК соответствует видимым ответам.

Сравнение с копией до правок не выявило изменений защищённых числовых значений, статусов, ссылок, canonical, title или robots. Юридические страницы и исключённые материалы сохранены.

## Результаты проверок

| Проверка | Результат |
| --- | --- |
| Браузерные проверки строительства, формы и новостроек | 53/53 пройдено: 32 теста строительства/формы и 21 тест новостроек |
| Финальные профильные статические тесты | 24/24 пройдено |
| Полный npm test | 79/82 пройдено; три ошибки исходных тестов воспроизводятся также на копии до правок |
| SEO-аудит | 324 HTML-документа, 292 URL sitemap; 0 ошибок, 7 существующих предупреждений |
| Синхронизация публичной шапки | Пройдена |
| git diff --check | Пройден |

Вёрстка проверена на мобильных, планшетных и настольных размерах. Дополнительный осмотр пяти типов страниц при ширинах 390, 768 и 1366 px: нет горизонтального переполнения и отсутствующих целей aria. Таблица строительства сохраняет пять столбцов. После удаления счётчиков проверки шапка новостроек не содержит пустой колонки. Галерея «Левобережья» проверена на всех трёх ширинах.

Каталог: 78 записей в режиме JavaScript, статический вариант без JavaScript — 20 исходных карточек. Проверены поиск, город, сброс фильтров, сортировка по названию и цене, положение записей без цены, сохранение карточек при переключении сортировки. Старые URL-параметры sort=priority и completeness=complete не ломают каталог; параметры qa/utm и адрес страницы сохраняются. Цены сопоставлены с исходными значениями, строка о публичной оферте проверена у карточек с ценой.

Форма: проверены валидация, успешная отправка, обработка ошибок и атрибуция. Запросы Web3Forms в тестах заменялись тестовыми ответами; реальные заявки не отправлялись.

Три ошибки полного набора в существующем tests/catalog-critical.test.mjs:

1. object_910: тест ожидает 5 950 000, а исходный feed содержит null; этот конфликт существовал до правок.
2. Проверка нормализации ищет конкретную форму записи join(" "), отличающуюся от существующего кода.
3. Проверка CTA ожидает button, хотя исходная карточка использует ссылку с обработчиком открытия модального окна.

Эти тесты и исходные цены не изменялись. Полный набор QA нельзя считать полностью зелёным.

Существующие предупреждения SEO-аудита: у admin.html отсутствуют description/canonical; у thanks.html отсутствует canonical; пары страниц sokol-grad/sokol-grad-2 и veresaeva/veresaevo имеют общие canonical, а страницы-алиасы отсутствуют в sitemap. Защищённые canonical и sitemap не редактировались.

[Каталог — настольный вид](C:/KV/DomianKvartal/output/playwright/copy-cleanup/-newbuilds-html-1366.png), [карточки — мобильный вид](C:/KV/DomianKvartal/output/playwright/copy-cleanup/catalog-cards-390.png), [галерея — мобильный вид](C:/KV/DomianKvartal/output/playwright/copy-cleanup/levoberezhe-gallery-390.png).

## Спорные случаи и сохранённые исключения

- N3 оставлен в служебном JSON, поскольку посетитель его не видит и владелец запретил менять служебные поля.
- N4–N5 в исходных JSON сохранены, очищается только вывод генератора; новые страницы этих ЖК не создавались.
- Заголовок «Квартиры из нашего реестра» на страницах ЖК сохранён согласно запрету менять SEO-заголовки.
- Подпись генератора «Цена в публикации застройщика» в текущих страницах не выводится: соответствующие значения отсутствуют. Она не включалась в согласованный список новых видимых находок.
- Цена «Флоры» сохранена для отдельного решения владельца.
- Три исходные ошибки полного набора тестов и семь существующих предупреждений SEO перечислены выше.

## Изменённые файлы

Всего 102 изменённых файлов сайта, исходников и тестов, плюс три документа этой задачи. Имеющиеся до начала задачи изменения пользователя и его новые файлы не входят в список.

- [_private/construction-projects.json](C:/KV/DomianKvartal/_private/construction-projects.json)
- [_private/generate-newbuild-pages.js](C:/KV/DomianKvartal/_private/generate-newbuild-pages.js)
- [_tools/build-zhk-pages.mjs](C:/KV/DomianKvartal/_tools/build-zhk-pages.mjs)
- [assets/css/header-unified.css](C:/KV/DomianKvartal/assets/css/header-unified.css)
- [assets/css/main.css](C:/KV/DomianKvartal/assets/css/main.css)
- [assets/css/newbuilds-catalog.css](C:/KV/DomianKvartal/assets/css/newbuilds-catalog.css)
- [assets/js/form-handler.js](C:/KV/DomianKvartal/assets/js/form-handler.js)
- [assets/js/main.js](C:/KV/DomianKvartal/assets/js/main.js)
- [assets/js/newbuilds-catalog.js](C:/KV/DomianKvartal/assets/js/newbuilds-catalog.js)
- [assets/js/showcase-cards.js](C:/KV/DomianKvartal/assets/js/showcase-cards.js)
- [construction.html](C:/KV/DomianKvartal/construction.html)
- [construction/builders/domanstroy.html](C:/KV/DomianKvartal/construction/builders/domanstroy.html)
- [construction/builders/eqvita.html](C:/KV/DomianKvartal/construction/builders/eqvita.html)
- [construction/builders/postroim-dom.html](C:/KV/DomianKvartal/construction/builders/postroim-dom.html)
- [construction/builders/soyuz.html](C:/KV/DomianKvartal/construction/builders/soyuz.html)
- [construction/projects/domanstroy-ds-115.html](C:/KV/DomianKvartal/construction/projects/domanstroy-ds-115.html)
- [construction/projects/domanstroy-ds-116.html](C:/KV/DomianKvartal/construction/projects/domanstroy-ds-116.html)
- [construction/projects/domanstroy-ds-128.html](C:/KV/DomianKvartal/construction/projects/domanstroy-ds-128.html)
- [construction/projects/domanstroy-ds-130.html](C:/KV/DomianKvartal/construction/projects/domanstroy-ds-130.html)
- [construction/projects/domanstroy-ds-80.html](C:/KV/DomianKvartal/construction/projects/domanstroy-ds-80.html)
- [construction/projects/domanstroy-ds-85-5.html](C:/KV/DomianKvartal/construction/projects/domanstroy-ds-85-5.html)
- [construction/projects/domanstroy-ds-85.html](C:/KV/DomianKvartal/construction/projects/domanstroy-ds-85.html)
- [construction/projects/eqvita-01.html](C:/KV/DomianKvartal/construction/projects/eqvita-01.html)
- [construction/projects/eqvita-02.html](C:/KV/DomianKvartal/construction/projects/eqvita-02.html)
- [construction/projects/eqvita-03.html](C:/KV/DomianKvartal/construction/projects/eqvita-03.html)
- [construction/projects/eqvita-04.html](C:/KV/DomianKvartal/construction/projects/eqvita-04.html)
- [construction/projects/postroim-dom-konstantinovsk-110.html](C:/KV/DomianKvartal/construction/projects/postroim-dom-konstantinovsk-110.html)
- [construction/projects/postroim-dom-rostov-brick-100-180.html](C:/KV/DomianKvartal/construction/projects/postroim-dom-rostov-brick-100-180.html)
- [construction/projects/postroim-dom-rostov-brick-100-90.html](C:/KV/DomianKvartal/construction/projects/postroim-dom-rostov-brick-100-90.html)
- [construction/projects/postroim-dom-rostov-brick-110.html](C:/KV/DomianKvartal/construction/projects/postroim-dom-rostov-brick-110.html)
- [construction/projects/postroim-dom-rostov-stone-100-120.html](C:/KV/DomianKvartal/construction/projects/postroim-dom-rostov-stone-100-120.html)
- [construction/projects/postroim-dom-rostov-stone-120.html](C:/KV/DomianKvartal/construction/projects/postroim-dom-rostov-stone-120.html)
- [construction/projects/soyuz-105.html](C:/KV/DomianKvartal/construction/projects/soyuz-105.html)
- [construction/projects/soyuz-107.html](C:/KV/DomianKvartal/construction/projects/soyuz-107.html)
- [construction/projects/soyuz-109.html](C:/KV/DomianKvartal/construction/projects/soyuz-109.html)
- [construction/projects/soyuz-111-1.html](C:/KV/DomianKvartal/construction/projects/soyuz-111-1.html)
- [construction/projects/soyuz-114-2.html](C:/KV/DomianKvartal/construction/projects/soyuz-114-2.html)
- [construction/projects/soyuz-124.html](C:/KV/DomianKvartal/construction/projects/soyuz-124.html)
- [construction/projects/soyuz-137.html](C:/KV/DomianKvartal/construction/projects/soyuz-137.html)
- [construction/projects/soyuz-142-2.html](C:/KV/DomianKvartal/construction/projects/soyuz-142-2.html)
- [construction/projects/soyuz-69-9.html](C:/KV/DomianKvartal/construction/projects/soyuz-69-9.html)
- [construction/projects/soyuz-75.html](C:/KV/DomianKvartal/construction/projects/soyuz-75.html)
- [construction/projects/soyuz-83-8.html](C:/KV/DomianKvartal/construction/projects/soyuz-83-8.html)
- [construction/projects/soyuz-84.html](C:/KV/DomianKvartal/construction/projects/soyuz-84.html)
- [construction/projects/soyuz-85.html](C:/KV/DomianKvartal/construction/projects/soyuz-85.html)
- [construction/projects/soyuz-90.html](C:/KV/DomianKvartal/construction/projects/soyuz-90.html)
- [construction/projects/soyuz-99.html](C:/KV/DomianKvartal/construction/projects/soyuz-99.html)
- [data/zhk/main-content.json](C:/KV/DomianKvartal/data/zhk/main-content.json)
- [index.html](C:/KV/DomianKvartal/index.html)
- [newbuilds.html](C:/KV/DomianKvartal/newbuilds.html)
- [newbuilds/5-element-aske/index.html](C:/KV/DomianKvartal/newbuilds/5-element-aske/index.html)
- [newbuilds/academia/index.html](C:/KV/DomianKvartal/newbuilds/academia/index.html)
- [newbuilds/akvatoriya/index.html](C:/KV/DomianKvartal/newbuilds/akvatoriya/index.html)
- [newbuilds/donskoy-arbat-2/index.html](C:/KV/DomianKvartal/newbuilds/donskoy-arbat-2/index.html)
- [newbuilds/donskoy-arbat/index.html](C:/KV/DomianKvartal/newbuilds/donskoy-arbat/index.html)
- [newbuilds/dvizhenie-61/index.html](C:/KV/DomianKvartal/newbuilds/dvizhenie-61/index.html)
- [newbuilds/four-premiers/index.html](C:/KV/DomianKvartal/newbuilds/four-premiers/index.html)
- [newbuilds/gorod-u-reki/index.html](C:/KV/DomianKvartal/newbuilds/gorod-u-reki/index.html)
- [newbuilds/gray/index.html](C:/KV/DomianKvartal/newbuilds/gray/index.html)
- [newbuilds/green-park/index.html](C:/KV/DomianKvartal/newbuilds/green-park/index.html)
- [newbuilds/grinside/index.html](C:/KV/DomianKvartal/newbuilds/grinside/index.html)
- [newbuilds/kristall-2/index.html](C:/KV/DomianKvartal/newbuilds/kristall-2/index.html)
- [newbuilds/legenda-rostova/index.html](C:/KV/DomianKvartal/newbuilds/legenda-rostova/index.html)
- [newbuilds/leventsovka-park/index.html](C:/KV/DomianKvartal/newbuilds/leventsovka-park/index.html)
- [newbuilds/levoberezhe/index.html](C:/KV/DomianKvartal/newbuilds/levoberezhe/index.html)
- [newbuilds/oktyabr-park/index.html](C:/KV/DomianKvartal/newbuilds/oktyabr-park/index.html)
- [newbuilds/royal-towers/index.html](C:/KV/DomianKvartal/newbuilds/royal-towers/index.html)
- [newbuilds/siyanie/index.html](C:/KV/DomianKvartal/newbuilds/siyanie/index.html)
- [newbuilds/smartpolet/index.html](C:/KV/DomianKvartal/newbuilds/smartpolet/index.html)
- [newbuilds/suvorovskiy/index.html](C:/KV/DomianKvartal/newbuilds/suvorovskiy/index.html)
- [newbuilds/zapadnye-allei/index.html](C:/KV/DomianKvartal/newbuilds/zapadnye-allei/index.html)
- [seo/doma-loc-aksay.html](C:/KV/DomianKvartal/seo/doma-loc-aksay.html)
- [seo/doma-loc-rossiyskiy.html](C:/KV/DomianKvartal/seo/doma-loc-rossiyskiy.html)
- [seo/doma-raion-aksayskiy-rayon.html](C:/KV/DomianKvartal/seo/doma-raion-aksayskiy-rayon.html)
- [seo/kvartiry-loc-aksay.html](C:/KV/DomianKvartal/seo/kvartiry-loc-aksay.html)
- [seo/kvartiry-loc-rostov-na-donu.html](C:/KV/DomianKvartal/seo/kvartiry-loc-rostov-na-donu.html)
- [seo/kvartiry-raion-roletarskiy-rayon.html](C:/KV/DomianKvartal/seo/kvartiry-raion-roletarskiy-rayon.html)
- [seo/kvartiry-ul-40-let-pobedy.html](C:/KV/DomianKvartal/seo/kvartiry-ul-40-let-pobedy.html)
- [seo/kvartiry-zhk-aleksandrovskiy.html](C:/KV/DomianKvartal/seo/kvartiry-zhk-aleksandrovskiy.html)
- [seo/kvartiry-zhk-ersona.html](C:/KV/DomianKvartal/seo/kvartiry-zhk-ersona.html)
- [seo/kvartiry-zhk-levoberezhnyy.html](C:/KV/DomianKvartal/seo/kvartiry-zhk-levoberezhnyy.html)
- [seo/kvartiry-zhk-mechty.html](C:/KV/DomianKvartal/seo/kvartiry-zhk-mechty.html)
- [seo/kvartiry-zhk-olet.html](C:/KV/DomianKvartal/seo/kvartiry-zhk-olet.html)
- [seo/kvartiry-zhk-orod-u-reki.html](C:/KV/DomianKvartal/seo/kvartiry-zhk-orod-u-reki.html)
- [seo/kvartiry-zhk-sokol-grad-2.html](C:/KV/DomianKvartal/seo/kvartiry-zhk-sokol-grad-2.html)
- [seo/kvartiry-zhk-sokol-grad.html](C:/KV/DomianKvartal/seo/kvartiry-zhk-sokol-grad.html)
- [seo/kvartiry-zhk-veresaeva.html](C:/KV/DomianKvartal/seo/kvartiry-zhk-veresaeva.html)
- [seo/kvartiry-zhk-veresaevo.html](C:/KV/DomianKvartal/seo/kvartiry-zhk-veresaevo.html)
- [seo/kvartiry-zhk-vishnevyy-sad.html](C:/KV/DomianKvartal/seo/kvartiry-zhk-vishnevyy-sad.html)
- [seo/kvartiry-zhk-zapadnye-allei.html](C:/KV/DomianKvartal/seo/kvartiry-zhk-zapadnye-allei.html)
- [seo/uchastki-loc-aksay.html](C:/KV/DomianKvartal/seo/uchastki-loc-aksay.html)
- [seo/uchastki-raion-aksayskiy-rayon.html](C:/KV/DomianKvartal/seo/uchastki-raion-aksayskiy-rayon.html)
- [seo/zhk-atmosfera-aksay.html](C:/KV/DomianKvartal/seo/zhk-atmosfera-aksay.html)
- [seo/zhk-flora-aksay.html](C:/KV/DomianKvartal/seo/zhk-flora-aksay.html)
- [seo/zhk-novyy-aksay.html](C:/KV/DomianKvartal/seo/zhk-novyy-aksay.html)
- [seo/zhk-samotsvety-aksay.html](C:/KV/DomianKvartal/seo/zhk-samotsvety-aksay.html)
- [seo/zhk-vishnevyy-sad-aksay.html](C:/KV/DomianKvartal/seo/zhk-vishnevyy-sad-aksay.html)
- [tests/construction-static.test.mjs](C:/KV/DomianKvartal/tests/construction-static.test.mjs)
- [tests/limited-stage-static.test.mjs](C:/KV/DomianKvartal/tests/limited-stage-static.test.mjs)
- [tests/limited-stage.spec.js](C:/KV/DomianKvartal/tests/limited-stage.spec.js)
- [tests/zhk-pages.test.mjs](C:/KV/DomianKvartal/tests/zhk-pages.test.mjs)
- [tools/generate-construction-catalog.py](C:/KV/DomianKvartal/tools/generate-construction-catalog.py)

Документы задачи:

- [Основной список согласования](C:/KV/DomianKvartal/docs/owner/site-text-cleanup-approval-2026-10-09.md)
- [Дополнительный список согласования N1–N8](C:/KV/DomianKvartal/docs/owner/site-text-cleanup-new-findings-2026-10-09.md)
- [Этот итоговый отчёт](C:/KV/DomianKvartal/docs/owner/site-text-cleanup-result-2026-10-09.md)
