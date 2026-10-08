# Действия владельца после публикации

PR этой задачи не мерджится автоматически. Следующий чек-лист выполняется владельцем после согласованного merge и успешного GitHub Pages deploy; действия в кабинетах не выполнялись агентом.

## Яндекс Вебмастер

- Отправить на переобход главную, apartments.html, houses.html, lands.html, newbuilds.html и пять существующих страниц ЖК ниже.
- Отправить первые 50 индексируемых страниц объектов из списка ниже. Всего 60 URL, в пределах указанного в задании лимита 150 в день; проверить текущий лимит в кабинете.
- Отправить https://domian-161.ru/sitemap.xml.
- Через 7 и 14 дней после публикации проверить «Страницы в поиске», исключённые URL и изменения показов/кликов по категориям и ЖК.

## Google Search Console

- Отправить sitemap.xml.
- Через проверку URL запросить индексацию этих десяти ключевых адресов:

- https://domian-161.ru/
- https://domian-161.ru/apartments.html
- https://domian-161.ru/houses.html
- https://domian-161.ru/lands.html
- https://domian-161.ru/newbuilds.html
- https://domian-161.ru/seo/zhk-flora-aksay.html
- https://domian-161.ru/seo/zhk-vishnevyy-sad-aksay.html
- https://domian-161.ru/seo/zhk-samotsvety-aksay.html
- https://domian-161.ru/seo/zhk-atmosfera-aksay.html
- https://domian-161.ru/seo/zhk-novyy-aksay.html

## Первые 50 объектов для переобхода

- https://domian-161.ru/obekt/house_01.html
- https://domian-161.ru/obekt/house_02.html
- https://domian-161.ru/obekt/house_03.html
- https://domian-161.ru/obekt/house_04.html
- https://domian-161.ru/obekt/house_05.html
- https://domian-161.ru/obekt/house_06.html
- https://domian-161.ru/obekt/house_07.html
- https://domian-161.ru/obekt/house_08.html
- https://domian-161.ru/obekt/house_09.html
- https://domian-161.ru/obekt/house_10.html
- https://domian-161.ru/obekt/house_11.html
- https://domian-161.ru/obekt/house_12.html
- https://domian-161.ru/obekt/house_13.html
- https://domian-161.ru/obekt/house_14.html
- https://domian-161.ru/obekt/house_15.html
- https://domian-161.ru/obekt/house_16.html
- https://domian-161.ru/obekt/house_17.html
- https://domian-161.ru/obekt/house_18.html
- https://domian-161.ru/obekt/house_19.html
- https://domian-161.ru/obekt/house_20.html
- https://domian-161.ru/obekt/house_21.html
- https://domian-161.ru/obekt/house_22.html
- https://domian-161.ru/obekt/house_23.html
- https://domian-161.ru/obekt/house_24.html
- https://domian-161.ru/obekt/house_25.html
- https://domian-161.ru/obekt/house_26.html
- https://domian-161.ru/obekt/house_27.html
- https://domian-161.ru/obekt/house_28.html
- https://domian-161.ru/obekt/house_29.html
- https://domian-161.ru/obekt/house_30.html
- https://domian-161.ru/obekt/house_31.html
- https://domian-161.ru/obekt/house_32.html
- https://domian-161.ru/obekt/house_33.html
- https://domian-161.ru/obekt/house_34.html
- https://domian-161.ru/obekt/house_35.html
- https://domian-161.ru/obekt/house_36.html
- https://domian-161.ru/obekt/house_37.html
- https://domian-161.ru/obekt/house_38.html
- https://domian-161.ru/obekt/house_39.html
- https://domian-161.ru/obekt/house_40.html
- https://domian-161.ru/obekt/house_41.html
- https://domian-161.ru/obekt/house_42.html
- https://domian-161.ru/obekt/house_43.html
- https://domian-161.ru/obekt/house_44.html
- https://domian-161.ru/obekt/house_45.html
- https://domian-161.ru/obekt/house_46.html
- https://domian-161.ru/obekt/house_47.html
- https://domian-161.ru/obekt/house_48.html
- https://domian-161.ru/obekt/house_49.html
- https://domian-161.ru/obekt/house_50.html

## Перед включением режима согласия

В assets/js/main.js флаг window.DOMIAN_CONSENT_MODE по умолчанию равен off. В режиме on Метрика ждёт «Принять»; «Только необходимые» сохраняет отказ. Изменять значение по умолчанию или задавать флаг до main.js на всех страницах только после решения владельца отдельным PR с повторной проверкой обоих режимов. Наличие подготовленного режима не означает подтверждения юридического соответствия сайта.

Провайдер форм Web3Forms сохранён. Выбор провайдера и вопросы размещения персональных данных решает владелец; реальная доставка заявки менеджеру требует отдельной согласованной проверки.

## Обновление генерируемых страниц

После подтверждения данных: build-registry.mjs → build-object-pages.mjs → build-zhk-pages.mjs → review-seo-pages.mjs → sync-public-header.mjs. Новые ЖК запускаются только после подтверждения владельцем. Затем закоммитить HTML и выполнить node _tools/build-sitemap.mjs: lastmod использует уже существующую историю файлов. Закоммитить sitemap, проверить --check и npm run qa. Старые URL не удалять.
