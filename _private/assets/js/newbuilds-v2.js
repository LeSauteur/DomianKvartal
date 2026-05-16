(function () {
  "use strict";

  function qs(selector, root) {
    return (root || document).querySelector(selector);
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function toPriceNumber(value) {
    var digits = String(value || "").replace(/[^\d]/g, "");
    if (!digits) return null;
    var parsed = Number(digits);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function formatPrice(value) {
    var parsed = toPriceNumber(value);
    if (!parsed) return value || "Цена по запросу";
    return new Intl.NumberFormat("ru-RU").format(parsed) + " ₽";
  }

  function resolveImagePath(path) {
    if (!path) return "assets/hero/hero.jpg";
    if (/^https?:\/\//i.test(path)) return path;
    if (path.indexOf("./") === 0) {
      return "Donor/" + path.slice(2);
    }
    return path;
  }

  function normalizeText(value) {
    if (value === null || value === undefined) return "";
    var text = String(value).trim();
    if (!text) return "";
    if (text.toLowerCase() === "null") return "";
    return text;
  }

  function truncateText(value, maxLen) {
    var text = normalizeText(value);
    if (!text) return "";
    if (text.length <= maxLen) return text;
    return text.slice(0, maxLen).trimEnd() + "...";
  }

  function renderOptionalLine(label, value) {
    var text = normalizeText(value);
    if (!text) return "";
    return '<p><strong>' + escapeHtml(label) + ":</strong> " + escapeHtml(text) + "</p>";
  }

  function fetchJson(path) {
    return fetch(path).then(function (res) {
      if (!res.ok) {
        throw new Error("Failed to load " + path + " (" + res.status + ")");
      }
      return res.json();
    });
  }

  function renderCard(item) {
    var card = document.createElement("article");
    card.className = "card";

    var title = item.title || "Объект";
    var image = resolveImagePath(item.image);
    var description = truncateText(item.description, 140);
    var details = [
      renderOptionalLine("Город", item.city),
      renderOptionalLine("Адрес", item.address),
      renderOptionalLine("Срок сдачи", item.deadline),
      renderOptionalLine("Застройщик", item.developer),
      renderOptionalLine("Класс", item.class),
      renderOptionalLine("Описание", description)
    ]
      .filter(Boolean)
      .join("");

    card.innerHTML = [
      '<img src="' + escapeHtml(image) + '" loading="lazy" alt="' + escapeHtml(title) + '">',
      '<div class="card-content">',
      '<h2>' + escapeHtml(title) + '</h2>',
      details,
      '<div class="card-meta">' + escapeHtml(formatPrice(item.price)) + '</div>',
      '<a class="btn card-open" href="#">Подробнее</a>',
      '</div>'
    ].join("");

    var openButton = qs(".card-open", card);
    if (openButton) {
      openButton.addEventListener("click", function (event) {
        event.preventDefault();
        window.alert("Детальная страница ЖК пока не подключена");
      });
    }

    return card;
  }

  function init() {
    var listingType = document.body && document.body.dataset ? document.body.dataset.listing : "";
    if (listingType !== "newbuilds-v2") return;

    var cardsContainer = qs("#cards");
    var resultsCount = qs("#resultsCount");
    var filtersContainer = qs("#filters");
    if (!cardsContainer) return;

    if (filtersContainer) {
      filtersContainer.innerHTML = '<span class="loading-state">Показаны все новостройки из объединённого V2-источника</span>';
    }

    cardsContainer.innerHTML = '<p class="loading-state">Загрузка новостроек...</p>';

    fetchJson("output/newbuilds/newbuilds-v2-merged.json")
      .then(function (items) {
        cardsContainer.innerHTML = "";
        if (!Array.isArray(items) || !items.length) {
          cardsContainer.innerHTML = '<p class="loading-state">Объекты не найдены.</p>';
          if (resultsCount) resultsCount.textContent = "Найдено: 0";
          return;
        }

        items.forEach(function (item) {
          cardsContainer.appendChild(renderCard(item));
        });

        if (resultsCount) {
          resultsCount.textContent = "Найдено: " + items.length;
        }
      })
      .catch(function (error) {
        cardsContainer.innerHTML = '<p class="loading-state">Ошибка загрузки данных.</p>';
        console.error(error);
      });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
