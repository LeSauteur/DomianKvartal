# Финальная проверка очистки текстов — 09.10.2026

Ветка: codex/site-text-cleanup-2026-10-09. Пользователь разрешил полную публикацию после завершения проверок; публикация выполняется только через push ветки, PR, зелёные проверки, merge и проверку деплоя. Скриншоты по последнему указанию не готовятся. Фактические ссылки на PR и результат деплоя сообщаются в финальном ответе.

## Дополнительные изменения перед сдачей

- На карточках и страницах ДоманСтрой убрано повторение «Стоимость по запросу» в одном ценовом блоке. Основной текст цены сохранён, повторяющаяся подпись не создаётся; пустые small/span/p не выводятся. Исправлен генератор, обновлены все страницы строительства. Числовые цены не изменены.
- В meta description и og:description четырёх страниц застройщиков удалено «из материалов компании». Количество согласовано с существительным: 7 проектов, 15 проектов, 4 проекта, 6 построенных домов. Title и H1 сохранены.
- В таблице construction.html «Стоимость этих объектов не опубликована» заменено на «Рассчитаем стоимость похожего дома».
- В пяти страницах ЖК и генераторе «Квартиры из нашего реестра» заменено на «Квартиры в продаже в этом ЖК». Это исключение из прежнего запрета менять заголовки прямо разрешено последним сообщением владельца.
- Пункт 63: «Мы агентство недвижимости, а не застройщик. Поможем подобрать квартиру.» Фраза «согласовать условия покупки с застройщиком» удалена.
- Блок информации новостройки после удаления технического заголовка оформлен как div с role=group и aria-label=«Информация для покупателя»; содержимое и полезные ссылки сохранены. Нового SEO-заголовка нет.
- Генератор новостроек теперь воспроизводит существующие унифицированную шапку, навигацию, ссылки на форму/юридические документы, robots, структуру Schema.org и размеры планировок. Настройки представления вынесены в служебный _private/newbuild-page-presentation.json. В Schema.org новых свойств или типов относительно текущего HTML нет.

[Основной результат с N1–N8 «было → стало»](C:/KV/DomianKvartal/docs/owner/site-text-cleanup-result-2026-10-09.md) относится к предыдущему этапу. Этот отчёт фиксирует последующие уточнения и окончательные проверки.

## 1. Юридические документы

Команда git diff -- privacy.html cookies.html personal-data-consent.html offer.html details.html вернула пустой вывод. Все пять файлов также побайтно совпадают с сохранённой копией. Откат не требовался.

## 2. Полная пересборка

В отдельной локальной копии запускались полные команды генераторов:

| Генератор | Результат |
| --- | --- |
| tools/generate-construction-catalog.py | Код 0; 32 проекта, 4 застройщика, construction.html; синхронизация шапки |
| _private/generate-newbuild-pages.js | Код 0; 21 страница новостройки |
| _tools/build-zhk-pages.mjs | Код 0; 5 существующих страниц ЖК, 3 неактивных шаблона остались неактивными |

Сравнены 63 генерируемые страницы и 3 затрагиваемых хаба — всего 66. Совпадение HTML, атрибутов, текста и JSON-LD: 66/66. Совпадение текста файлов с нормализацией CRLF/LF: 66/66. Отдельно повторено после финальных уточнений. Удалённые согласованные комментарии не вернулись.

Генераторы имеют операции с sitemap, поэтому их полные запуски изолированы. Изменения sitemap из копии не переносились. Рабочие sitemap.xml и robots.txt побайтно совпадают с сохранёнными файлами.

## 3. Повторный поиск формулировок

Проверено 736 файлов HTML/JS/JSON и генераторов .mjs/.py. Запрос: «приложенн», «по материалам», «каталог 2023», «архив», «таблиц», «Проверено», «первичн», «актуальност», «уточняются», «рендер». Найдено 121 сырых совпадений. В head, meta, alt и JSON-LD совпадений нет.

[Список остатков с пояснениями](C:/KV/DomianKvartal/docs/owner/site-text-cleanup-residuals-2026-10-09.md), [полный CSV: файл, строка, столбец, цитата](C:/KV/DomianKvartal/docs/owner/site-text-cleanup-residuals-2026-10-09.csv).

Спорные остатки оставлены по указанию «не менять и внести в отчёт»: «уточняются» в характеристиках четырёх проектов Эквиты; «проверит актуальность» на главной/preview и витрине; формулировки об актуальности в newbuilds.html; «Сводим предложения к одной таблице» на странице «Атмосферы». «Первичный рынок» описывает тип недвижимости. «Архивный макет» находится в двух старых копиях макета. Юридические совпадения в offer.html сохранены. Служебные источники/статусы в JSON и отрицательные ожидания тестов не редактировались.

## 4. Суммы, площади, сроки и гарантии

Сравнены 340 HTML-страниц с сохранённой копией. Все видимые выражения сумм в ₽ и площадей, включая число повторений, совпадают. Выражения сроков и гарантий совпадают; единственное различие общего поиска чисел с «год/года» — удалённые согласованные пометки «2023 года» об источнике цены «Союза», а не сроки строительства или гарантия. Гарантия 5 лет сохранена.

Защищённые поля проектов price, priceDate, priceStatus, area, floors, bedrooms, bathrooms, constructionDays, pricePackage: изменений нет. output/newbuilds/catalog-v3.json побайтно совпадает. Цена «Флоры» 3,8–7,2 млн ₽ сохранена. Title, H1, canonical и robots в сравниваемых страницах не изменились.

## 5. Структура и White Box

Без скриншотов проверены 8 страниц при 390 и 1366 px: construction.html, проект каждого из четырёх застройщиков, «Движение 61», newbuilds.html и страница «Флоры». Итог: нет пустых видимых абзацев/карточек/секций, вновь оставшихся без заголовка секций, горизонтального переполнения, отсутствующих целей aria-labelledby или повторения цены внутри одного блока. Существующие блоки фактов без визуального заголовка остались блоками фактов.

White Box связан только с 15 проектами builderId=soyuz. На карточках других застройщиков этой подписи нет. На странице другого проекта она может встречаться в карточке похожего проекта «Союза»; такая карточка проверяется по собственному застройщику.

## 6. Тесты и изменения тестов

Проверки цен не ослаблены. Сохранено строгое сравнение цен ДоманСтрой 4 590 000, 6 032 000 и 6 760 000; все числовые цены строительных карточек сравниваются с исходными данными и проверяются в видимом тексте. Каталожный браузерный тест сравнивает все цены с исходным JSON. Три ранее существовавшие ошибки из пользовательского tests/catalog-critical.test.mjs не исключены из полного npm test и не исправлялись под результат.

- tests/construction-static.test.mjs: ожидания удалённых технических подписей заменены на проверки их отсутствия; числовые значения и служебные priceStatus/priceDate продолжают проверяться. Добавлены проверки отсутствия дубля цены, принадлежности White Box и склонения количества проектов в meta/og.
- tests/limited-stage-static.test.mjs: убраны ожидания видимых дат проверки/служебных статусов; сохранены проверки карточек, ID, ссылок и изображений. Добавлен рендер всех 21 страниц, сравнение существующей Schema.org целиком, сохранение цены, непустой резервный текст и галерея без заглушек.
- tests/limited-stage.spec.js: вместо удалённого фильтра полноты проверяется сохранение карточек при сортировке; добавлены сортировки по названию/цене, записи без цены, город/поиск/сброс, старые URL-параметры и цены с одинаковой строкой об оферте. Числовые проверки не удалялись.
- tests/zhk-pages.test.mjs: убрана проверка, запрещавшая уменьшение числа слов при согласованном удалении текста. Проверки substantive-заголовков, title, FAQ и сроков сохранены; единственное переименование заголовка явно сопоставлено с утверждённым новым текстом. Обновлены ожидания пункта 63 и отсутствия даты проверки.
- tests/safe-seo.spec.js: в тесте полной воронки удалённый #nbCompleteness заменён на существующий #nbCity. Все проверки событий аналитики, отсутствия персональных данных и сетевых запросов сохранены.

Финальный npm test: 84 теста, 81 пройден, 3 исходные ошибки. Отдельный запуск всех отслеживаемых Git тестов (состав, который получает CI): **81/81 пройдено**. Профильные проверки: 26/26. SEO-аудит: 0 ошибок, 7 существующих предупреждений. git diff --check и синхронизация публичной шапки пройдены. Побочные изменения registry/feeds/CSV, создаваемые тестами, восстановлены побайтно после каждого запуска.

Первый полный браузерный прогон: 96 пройдено, 1 пропущен (необязательная визуальная матрица), 1 устаревший тест фильтра завершился ошибкой. После корректировки селектора этот тест отдельно пройден (1/1), затем весь набор повторён: **97 пройдено, 1 пропущен, 0 ошибок**. Запросы формы и аналитики в тестах изолированы. Фактический результат GitHub QA и деплоя сообщается в финальном ответе.

### Три исходные ошибки

1. object_910 — «1-комнатная квартира, 36 м²». [Страница объекта](C:/KV/DomianKvartal/obekt/object_910.html), публичный адрес /obekt/object_910.html. Канонические [данные объекта](C:/KV/DomianKvartal/objects/object_910/data.json) содержат 5 950 000 ₽, существующий feed содержит null. Цены не менялись; конфликт существовал в сохранённой копии.
2. Проверка нормализации ожидает конкретное выражение join(" "), отличающееся от существующей записи кода.
3. Проверка CTA ожидает button, хотя исходная карточка использует ссылку с обработчиком открытия модального окна.

Файл tests/catalog-critical.test.mjs был пользовательским untracked-файлом до задачи. Он сохранён без изменений и выполняется локальным npm test; в коммит этой очистки не включается вместе с другими исходными незакоммиченными файлами пользователя.

## 7. Ошибки склонения — не исправлены

| Формулировка | Совпадения в HTML/данных/шаблонах | Первый пример |
| --- | --- | --- |
| Тип: Квартир | 54 | [output/text-cleanup-verification-2026-10-09/protected-and-grammar.json:6](C:/KV/DomianKvartal/output/text-cleanup-verification-2026-10-09/protected-and-grammar.json:6) |
| Площадь: Площадь уточняется | 16 | [output/text-cleanup-verification-2026-10-09/protected-and-grammar.json:224](C:/KV/DomianKvartal/output/text-cleanup-verification-2026-10-09/protected-and-grammar.json:224) |
| 4 актуальных объектов | 4 | [output/text-cleanup-verification-2026-10-09/protected-and-grammar.json:290](C:/KV/DomianKvartal/output/text-cleanup-verification-2026-10-09/protected-and-grammar.json:290) |
| 32 вариантов | 1 | [output/text-cleanup-verification-2026-10-09/protected-and-grammar.json:308](C:/KV/DomianKvartal/output/text-cleanup-verification-2026-10-09/protected-and-grammar.json:308) |

Эти четыре формулировки сохранены по прямому указанию владельца. Ошибки количества в meta/og страниц застройщиков исправлены отдельно в разрешённом объёме.

## 8. Файлы коммита

Всего 111 файлов. Имеющиеся до задачи изменения SEO_REANIMATION_PROGRESS.md, HANDOFF-2026-09-01.md, SEO_FORENSIC_AUDIT.md, Kvartal new img/ и tests/catalog-critical.* не включаются.

- [_private/construction-projects.json](C:/KV/DomianKvartal/_private/construction-projects.json)
- [_private/generate-newbuild-pages.js](C:/KV/DomianKvartal/_private/generate-newbuild-pages.js)
- [_private/newbuild-page-presentation.json](C:/KV/DomianKvartal/_private/newbuild-page-presentation.json)
- [_tools/build-zhk-pages.mjs](C:/KV/DomianKvartal/_tools/build-zhk-pages.mjs)
- [_tools/sync-public-header.mjs](C:/KV/DomianKvartal/_tools/sync-public-header.mjs)
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
- [docs/owner/site-text-cleanup-approval-2026-10-09.md](C:/KV/DomianKvartal/docs/owner/site-text-cleanup-approval-2026-10-09.md)
- [docs/owner/site-text-cleanup-new-findings-2026-10-09.md](C:/KV/DomianKvartal/docs/owner/site-text-cleanup-new-findings-2026-10-09.md)
- [docs/owner/site-text-cleanup-residuals-2026-10-09.csv](C:/KV/DomianKvartal/docs/owner/site-text-cleanup-residuals-2026-10-09.csv)
- [docs/owner/site-text-cleanup-residuals-2026-10-09.md](C:/KV/DomianKvartal/docs/owner/site-text-cleanup-residuals-2026-10-09.md)
- [docs/owner/site-text-cleanup-result-2026-10-09.md](C:/KV/DomianKvartal/docs/owner/site-text-cleanup-result-2026-10-09.md)
- [docs/owner/site-text-cleanup-verification-2026-10-09.md](C:/KV/DomianKvartal/docs/owner/site-text-cleanup-verification-2026-10-09.md)
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
- [tests/safe-seo.spec.js](C:/KV/DomianKvartal/tests/safe-seo.spec.js)
- [tests/zhk-pages.test.mjs](C:/KV/DomianKvartal/tests/zhk-pages.test.mjs)
- [tools/generate-construction-catalog.py](C:/KV/DomianKvartal/tools/generate-construction-catalog.py)
