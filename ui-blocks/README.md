# UI Blocks Module

Изолированный UI-модуль блоков для сайта недвижимости. Полностью автономен, не требует зависимостей от основного проекта.

---

## 📦 Состав модуля

```
ui-blocks/
├── index.html          # Демо-страница всех блоков
├── blocks.html         # HTML-разметка блоков (для копирования)
├── css/
│   └── blocks.css      # Все стили блоков
├── js/
│   └── blocks.js       # Интерактивность (скроллеры, избранное)
├── assets/
│   └── images/         # Изображения для блоков
└── README.md           # Этот файл
```

---

## 🎯 Включённые блоки

| Блок | Описание | Класс-обёртка |
|------|----------|---------------|
| **Stories** | Горизонтальный скроллер с иконками (ипотека, страхование и т.д.) | `.ub-scroller` |
| **Special Offers** | Карточки объектов с горизонтальным скроллом | `.ub-cards--offers` |
| **Services** | Плитки сервисов и услуг | `.ub-tiles` |
| **Quick Search** | Сетка быстрого поиска | `.ub-qgrid` |

---

## 🔌 Подключение

### 1. Базовое подключение

```html
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  
  <!-- Подключить стили -->
  <link rel="stylesheet" href="ui-blocks/css/blocks.css" />
</head>
<body>
  
  <!-- Обернуть блоки в wrapper -->
  <div class="ui-blocks-wrapper">
    
    <!-- Вставить HTML блоков из blocks.html -->
    <section class="ub-section">
      ...
    </section>
    
  </div>
  
  <!-- Подключить JavaScript (для интерактивности) -->
  <script src="ui-blocks/js/blocks.js"></script>
</body>
</html>
```

### 2. Использование отдельных блоков

#### Stories (горизонтальный скроллер с иконками)

```html
<section class="ub-section" aria-label="Подборки">
  <div class="ub-container">
    <div class="ub-scroller" data-ub-scroller>
      <button class="ub-scroller__btn" type="button" data-dir="left">◀</button>
      <div class="ub-scroller__track" data-ub-track>
        
        <article class="ub-story" tabindex="0" role="link">
          <div class="ub-story__img">
            <img class="ub-storyimg" src="..." alt="" />
            <div class="ub-story__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">...</svg>
            </div>
          </div>
          <div class="ub-story__cap">Название</div>
        </article>
        
      </div>
      <button class="ub-scroller__btn" type="button" data-dir="right">▶</button>
    </div>
  </div>
</section>
```

#### Карточки объектов

```html
<section class="ub-section" aria-label="Предложения">
  <div class="ub-container">
    <div class="ub-section__head">
      <h2 class="ub-h2">Заголовок</h2>
      <p class="ub-sub">Подзаголовок</p>
    </div>
    
    <!-- Фильтры (опционально) -->
    <div class="ub-pills" role="tablist">
      <button class="ub-chip is-active">Все</button>
      <button class="ub-chip">Категория 1</button>
    </div>
    
    <!-- Скроллер карточек -->
    <div class="ub-scroller ub-scroller--offers" data-ub-scroller>
      <button class="ub-scroller__btn" type="button" data-dir="left">◀</button>
      <div class="ub-cards ub-cards--offers" data-ub-track>
        
        <article class="ub-card" tabindex="0" role="link" data-id="1" data-cat="houses">
          <div class="ub-card__media">
            <img class="ub-mediaimg" src="..." alt="" />
            <span class="ub-counter">1/10</span>
            <span class="ub-badge ub-badge--soft">Бейдж</span>
            <button class="ub-fav" type="button" aria-label="В избранное">
              <svg class="ub-ico" viewBox="0 0 24 24">...</svg>
            </button>
          </div>
          <div class="ub-card__body">
            <div class="ub-price">
              <strong>10 000 000 ₽</strong>
              <span class="ub-pm">от 80 000 ₽/мес.</span>
            </div>
            <div class="ub-meta">
              <span>2-комн.</span>
              <span>60 м²</span>
              <span>5/10 эт.</span>
            </div>
            <div class="ub-addr">Город, улица</div>
          </div>
        </article>
        
      </div>
      <button class="ub-scroller__btn" type="button" data-dir="right">▶</button>
    </div>
  </div>
</section>
```

#### Сервисы (Tiles)

```html
<section class="ub-section" aria-label="Сервисы">
  <div class="ub-container">
    <div class="ub-section__head">
      <h2 class="ub-h2">Сервисы и услуги</h2>
      <a class="ub-link" href="#">Все сервисы</a>
    </div>
    
    <div class="ub-tiles">
      <article class="ub-tile" tabindex="0" role="link">
        <span class="ub-tile__new">Новое</span>
        <h3>Название сервиса</h3>
        <p>Краткое описание.</p>
        <img class="ub-tileimg" src="..." alt="" />
        <div class="ub-tile__art" aria-hidden="true"></div>
      </article>
    </div>
  </div>
</section>
```

#### Быстрый поиск (Grid)

```html
<section class="ub-section" aria-label="Быстрый поиск">
  <div class="ub-container">
    <div class="ub-section__head">
      <h2 class="ub-h2">Быстрый поиск</h2>
    </div>
    
    <div class="ub-qgrid">
      <a class="ub-qcard" href="#">
        <div class="ub-qcard__img">
          <img class="ub-qimg" src="..." alt="" />
        </div>
        <div class="ub-qcard__cap">Название</div>
      </a>
    </div>
  </div>
</section>
```

---

## 🎨 CSS Variables

Модуль использует CSS-переменные для легкой кастомизации:

```css
.ui-blocks-wrapper {
  --ub-bg: #f3f4f6;              /* Фон страницы */
  --ub-surface: #ffffff;         /* Фон карточек */
  --ub-text: #121417;            /* Основной текст */
  --ub-muted: #6b7280;           /* Приглушенный текст */
  --ub-accent: #e30613;          /* Акцентный цвет (красный) */
  --ub-blue: #2563eb;            /* Синий для ссылок */
  --ub-r-18: 18px;               /* Радиус скругления */
  --ub-container: 1200px;        /* Макс. ширина контейнера */
}
```

---

## ⚙️ JavaScript API

Модуль предоставляет глобальный объект `UIBlocks`:

```javascript
// Инициализация (вызывается автоматически при загрузке DOM)
UIBlocks.init();

// Улучшение скроллера вручную
UIBlocks.enhanceScroller(trackElement);

// Показать toast уведомление
UIBlocks.showToast('Сообщение');
```

### Функции blocks.js

| Функция | Описание |
|---------|----------|
| `enhanceScroller(track)` | Добавляет drag + inertia + wheel к скроллеру |
| `initScrollers()` | Инициализирует все `[data-ub-scroller]` |
| `initChips()` | Обрабатывает клики по `.ub-chip` |
| `initFavorites()` | Включает сохранение избранного в localStorage |
| `showToast(msg)` | Показывает всплывающее уведомление |

---

## 📱 Адаптивность

| Breakpoint | Изменения |
|------------|-----------|
| ≤1100px | `.ub-tiles`: 1 колонка, `.ub-qgrid`: 2 колонки |
| ≤820px | `.ub-scroller__track`: меньшая ширина карточек |
| ≤520px | `.ub-qgrid`: 1 колонка, кнопки скроллера меньше |

---

## 🖼 Изображения

В модуль включены следующие изображения:

| Файл | Использование |
|------|---------------|
| `quick-1.jpg` | Stories, карточки, quick search |
| `quick-2.jpg` | Stories, карточки, quick search |
| `quick-3.jpg` | Stories, карточки, quick search |
| `quick-4-real.jpg` | Stories, карточки, quick search |
| `listing-5.jpg` | Stories, tiles, карточки |
| `listing-6.jpg` | Stories, tiles, карточки |
| `listing-7.jpg` | Stories, tiles, карточки |

---

## ✅ Проверка работы

1. Откройте `index.html` в браузере
2. Проверьте:
   - [ ] Все 4 блока отображаются
   - [ ] Горизонтальные скроллеры работают (drag + кнопки)
   - [ ] Кнопки "В избранное" сохраняют состояние
   - [ ] Изображения загружаются
   - [ ] Адаптивность работает на мобильных

---

## 🚫 Зависимости

Модуль **НЕ требует**:

- ❌ Основного `styles.css` проекта
- ❌ Основного `script.js` проекта
- ❌ Сторонних библиотек (jQuery, Swiper и т.д.)
- ❌ Google Fonts (опционально, можно использовать системные шрифты)

Модуль **требует**:

- ✅ Шрифт Manrope (или любой sans-serif)
- ✅ Современный браузер (ES6, CSS Grid, Custom Properties)

---

## 📝 Лицензия

Модуль создан на основе донорского проекта DOMИАН для использования в качестве изолированного UI-компонента.

---

## 🛠 Поддержка

Для добавления новых блоков:

1. Добавьте HTML в `blocks.html`
2. Добавьте стили в `css/blocks.css` (с префиксом `.ub-`)
3. При необходимости добавьте JS в `js/blocks.js`
4. Обновите `index.html` для демо
