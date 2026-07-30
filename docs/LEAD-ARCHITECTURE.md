# Надёжная архитектура получения лидов

Дата сравнения: 30 июля 2026 года. Тарифы и лимиты меняются — перед развёртыванием их нужно проверить повторно.

## Цель

Нужен единый подтверждаемый маршрут:

```text
GitHub Pages
→ serverless endpoint
→ постоянное хранилище
→ email
→ Telegram-группа
```

Frontend должен получать собственный ID заявки, а оператор — видеть одну и ту же запись с любого устройства. Секреты должны храниться только на серверной стороне.

## Сравнение вариантов

| Вариант | Стоимость и сложность | Секреты и хранение заявок | Email и Telegram | Антиспам и журнал ошибок | Пригодность |
|---|---|---|---|---|---|
| Только Web3Forms | Самый простой. Бесплатно до 250 отправок в месяц на дату аудита; платные функции зависят от тарифа. | Access key публичен по модели сервиса. История есть в кабинете провайдера, но это не собственная CRM. | Email встроен. Telegram доступен как интеграция на подходящем тарифе. | Серверная фильтрация и hCaptcha; доменное ограничение и расширенные интеграции зависят от тарифа. Ошибки смотрятся в кабинете провайдера. | Подходит как быстрый текущий канал, но остаётся зависимость от одного сервиса и нет собственной базы. |
| Web3Forms + webhook | Низкая/средняя сложность, но webhook — платная функция Web3Forms. | Секрет webhook хранится на стороне получателя. Заявки можно писать в CRM/БД. | Web3Forms продолжает email; webhook может добавить Telegram. | Web3Forms повторяет неуспешные webhook-вызовы; нужен журнал и дедупликация на своём endpoint. | Хороший переходный вариант, если уже оплачен Web3Forms Pro. |
| Cloudflare Worker + D1 | Средняя сложность. Workers Free на дату аудита: до 100 000 запросов/день и 10 мс CPU на вызов; платный Workers начинается с минимального платежа 5 USD/мес. D1 имеет отдельные бесплатные лимиты. | Почтовый ключ, Telegram token и подпись хранятся в Worker Secrets. D1 даёт постоянную SQL-базу. | Worker вызывает почтового провайдера и Telegram Bot API после записи лида. | Turnstile, rate limit, проверка Origin, idempotency key, D1-журнал статусов и ошибок. | Лучший баланс для небольшого агентства и GitHub Pages: дёшево, прозрачно, без отдельного сервера. |
| Supabase Edge Function + Postgres | Средняя/выше средней сложность. Free: 500 МБ БД, 500 000 вызовов Edge Functions; бесплатные проекты приостанавливаются после недели неактивности. Pro — от 25 USD/мес. | Secrets — в проекте Supabase; заявки — в Postgres с RLS и аудитом. | Function вызывает внешний email API и Telegram. Исходящие SMTP-порты 25/587 недоступны, поэтому нужен HTTPS email API. | CAPTCHA/rate limit реализуются отдельно; логи Edge Functions и таблица статусов дают хорошую диагностику. | Сильный вариант, если нужна полноценная база, кабинет и дальнейшая CRM-логика. Для одной формы тяжелее Cloudflare. |
| Vercel/Netlify Function + внешняя БД | Средняя сложность; бесплатные лимиты и стоимость зависят от выбранной платформы и БД. | Secrets хранятся в настройках проекта; постоянное хранение требует отдельной БД. | Email и Telegram вызываются через HTTPS API. | Нужно самостоятельно собрать CAPTCHA, rate limit, дедупликацию, логи и алерты. | Адекватно, если команда уже использует эту платформу. Для текущего GitHub Pages добавляет ещё одного провайдера без явного преимущества. |

Официальные источники:

- [Web3Forms Pricing](https://web3forms.com/pricing)
- [Web3Forms Webhooks](https://docs.web3forms.com/getting-started/pro-features/webhooks)
- [Cloudflare Workers Pricing](https://developers.cloudflare.com/workers/platform/pricing/)
- [Cloudflare Workers Limits](https://developers.cloudflare.com/workers/platform/limits/)
- [Cloudflare D1 Pricing](https://developers.cloudflare.com/d1/platform/pricing/)
- [Supabase Pricing](https://supabase.com/pricing)
- [Supabase Edge Function Limits](https://supabase.com/docs/guides/functions/limits)
- [Supabase Edge Function Invocations](https://supabase.com/docs/guides/platform/manage-your-usage/edge-function-invocations)

## Предпочтительный вариант

Для небольшого агентства предпочтителен Cloudflare Worker + D1:

1. `POST /leads` принимает только JSON с разрешённого origin.
2. Worker повторно валидирует поля, проверяет Turnstile и rate limit.
3. Worker создаёт случайный `lead_id` и идемпотентно пишет заявку в D1.
4. После успешной записи он вызывает email API и Telegram Bot API.
5. Для каждого канала сохраняются `pending/sent/failed`, число попыток и безопасная категория ошибки.
6. Frontend получает `success: true` только после записи в D1. Сбой email или Telegram не должен уничтожать лид: повторную доставку выполняет очередь/планировщик.
7. Админ-интерфейс читает D1 только через защищённый endpoint с серверной аутентификацией.

Минимальные таблицы:

```text
leads
  id, created_at, name, phone, email, service, consent_at,
  source, page_url, referrer, utm_*, lead_type, source_cta,
  object_*, mortgage_*, request_fingerprint

lead_deliveries
  id, lead_id, channel, status, attempts, last_error_category,
  created_at, updated_at
```

В логах нельзя сохранять имя, телефон, email, access key, Bot Token и полное тело запроса. Для диагностики достаточно `lead_id`, статуса, времени, длительности и категории ошибки.

## Что нужно согласовать перед внедрением

- владелец Cloudflare-аккаунта и домена;
- регион и правовые требования к хранению персональных данных;
- срок хранения и порядок удаления заявок;
- почтовый провайдер и подтверждённый домен отправителя;
- Telegram-группа, bot user и права бота;
- роли администраторов и способ входа;
- CAPTCHA/Turnstile;
- уведомления о недоставке;
- резервное копирование и экспорт;
- бюджет и ответственный за эксплуатацию.

Production Worker, D1, email API и Telegram-бот в рамках этого ремонта не разворачивались.
