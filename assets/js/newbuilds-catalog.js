(function () {
  "use strict";

  var DATA_URL = "output/newbuilds/catalog-v3.json";
  var state = { items: [], filtered: [] };
  var nodes = {};

  function text(value) {
    return value === null || value === undefined ? "" : String(value).trim();
  }

  function escapeHtml(value) {
    return text(value).replace(/[&<>'"]/g, function (char) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char];
    });
  }

  function formatPrice(price) {
    if (!price || !Number.isFinite(Number(price.value)) || Number(price.value) < 100000) {
      return '<span class="nb-price nb-price--request">Цена по запросу</span>';
    }
    var amount = new Intl.NumberFormat("ru-RU").format(Number(price.value));
    var prefix = price.type === "minimum_total" ? "от " : "";
    return '<span class="nb-price"><span>' + prefix + amount + '</span><span class="nb-price__currency">₽</span></span>';
  }

  function statusGroup(item) {
    var value = (text(item.status) + " " + text(item.deadline)).toLowerCase();
    if (/сдан|заверш|введ[её]н/.test(value)) return "ready";
    if (/строит|возвод|кв\.|очеред/.test(value)) return "building";
    return "unknown";
  }

  function completenessLabel(item) {
    var status = item.completeness && item.completeness.state;
    if (status === "complete") return { label: "Проверено", className: "is-complete" };
    if (status === "partial") return { label: "Частично проверено", className: "is-partial" };
    return { label: "Данные уточняются", className: "is-review" };
  }

  function meta(label, value) {
    if (!text(value)) return "";
    return '<li><span>' + escapeHtml(label) + '</span><strong>' + escapeHtml(value) + "</strong></li>";
  }

  function renderCard(item) {
    var quality = completenessLabel(item);
    var title = escapeHtml(item.title);
    var image = item.cover && item.cover.src
      ? '<img src="' + escapeHtml(item.cover.src) + '" alt="' + escapeHtml(item.cover.alt || item.title) + '" loading="lazy" width="720" height="480">'
      : '<div class="nb-card__placeholder" aria-hidden="true"><span>ДК</span><small>Изображение уточняется</small></div>';
    var titleMarkup = item.detail_url
      ? '<a href="' + escapeHtml(item.detail_url) + '">' + title + "</a>"
      : title;
    var primary = item.detail_url
      ? '<a class="nb-card__primary" href="' + escapeHtml(item.detail_url) + '">О комплексе</a>'
      : '<a class="nb-card__primary" href="index.html#contact">Уточнить данные</a>';
    var sourceLine = item.checked_at
      ? "Проверено " + new Intl.DateTimeFormat("ru-RU").format(new Date(item.checked_at + "T12:00:00"))
      : "Источник требует актуализации";
    return [
      '<article class="nb-card" data-completeness="' + escapeHtml(item.completeness.state) + '">',
      '<div class="nb-card__media">', image,
      '<span class="nb-quality ' + quality.className + '">' + quality.label + "</span>",
      "</div>",
      '<div class="nb-card__body">',
      '<div class="nb-card__top"><p>' + escapeHtml(item.city || "Ростовская область") + '</p><h3>' + titleMarkup + "</h3></div>",
      formatPrice(item.price),
      '<ul class="nb-card__meta">',
      meta("Адрес", item.address || "Уточняется"),
      meta("Статус", item.status || "Уточняется"),
      meta("Срок", item.deadline || "Уточняется"),
      meta("Застройщик", item.developer || "Уточняется"),
      "</ul>",
      '<div class="nb-card__actions">', primary, '<a href="tel:+79536091122">Позвонить</a></div>',
      '<p class="nb-card__source">' + escapeHtml(sourceLine) + "</p>",
      "</div></article>"
    ].join("");
  }

  function normalizeSearch(item) {
    return [item.title, item.city, item.address, item.developer, item.status]
      .map(text).join(" ").toLocaleLowerCase("ru-RU");
  }

  function applyFilters() {
    var query = text(nodes.search.value).toLocaleLowerCase("ru-RU");
    var city = nodes.city.value;
    var status = nodes.status.value;
    var completeness = nodes.completeness.value;
    var result = state.items.filter(function (item) {
      if (query && normalizeSearch(item).indexOf(query) === -1) return false;
      if (city && item.city !== city) return false;
      if (status && statusGroup(item) !== status) return false;
      if (completeness && item.completeness.state !== completeness) return false;
      return true;
    });

    var sort = nodes.sort.value;
    result.sort(function (a, b) {
      if (sort === "name") return a.title.localeCompare(b.title, "ru");
      if (sort === "price-asc" || sort === "price-desc") {
        var av = Number(a.price && a.price.value) || Number.POSITIVE_INFINITY;
        var bv = Number(b.price && b.price.value) || Number.POSITIVE_INFINITY;
        if (sort === "price-desc") {
          av = Number(a.price && a.price.value) || Number.NEGATIVE_INFINITY;
          bv = Number(b.price && b.price.value) || Number.NEGATIVE_INFINITY;
          return bv - av || a.title.localeCompare(b.title, "ru");
        }
        return av - bv || a.title.localeCompare(b.title, "ru");
      }
      var rank = { complete: 0, partial: 1, legacy: 2, needs_review: 3 };
      return (rank[a.completeness.state] - rank[b.completeness.state]) || a.title.localeCompare(b.title, "ru");
    });
    state.filtered = result;
    render();
  }

  function render() {
    nodes.cards.innerHTML = state.filtered.map(renderCard).join("");
    nodes.count.textContent = "Найдено: " + state.filtered.length + " из " + state.items.length;
    nodes.empty.hidden = state.filtered.length !== 0;
    nodes.cards.querySelectorAll("img").forEach(function (image) {
      image.addEventListener("error", function () {
        var placeholder = document.createElement("div");
        placeholder.className = "nb-card__placeholder";
        placeholder.innerHTML = "<span>ДК</span><small>Изображение уточняется</small>";
        image.replaceWith(placeholder);
      }, { once: true });
    });
  }

  function fillCities() {
    Array.from(new Set(state.items.map(function (item) { return item.city; }).filter(Boolean)))
      .sort(function (a, b) { return a.localeCompare(b, "ru"); })
      .forEach(function (city) {
        var option = document.createElement("option");
        option.value = city;
        option.textContent = city;
        nodes.city.appendChild(option);
      });
  }

  function bind() {
    [nodes.search, nodes.city, nodes.status, nodes.completeness, nodes.sort].forEach(function (node) {
      node.addEventListener(node === nodes.search ? "input" : "change", applyFilters);
    });
    nodes.form.addEventListener("reset", function () { window.setTimeout(applyFilters, 0); });
  }

  function init() {
    nodes = {
      form: document.getElementById("newbuildFilters"), search: document.getElementById("nbSearch"),
      city: document.getElementById("nbCity"), status: document.getElementById("nbStatus"),
      completeness: document.getElementById("nbCompleteness"), sort: document.getElementById("nbSort"),
      cards: document.getElementById("cards"), count: document.getElementById("resultsCount"),
      empty: document.getElementById("nbEmpty")
    };
    if (!nodes.cards) return;
    fetch(DATA_URL, { cache: "no-store" })
      .then(function (response) { if (!response.ok) throw new Error("HTTP " + response.status); return response.json(); })
      .then(function (data) {
        state.items = Array.isArray(data.items) ? data.items : [];
        document.getElementById("nbTotalStat").textContent = state.items.length;
        document.getElementById("nbVerifiedStat").textContent = state.items.filter(function (item) { return item.detail_url; }).length;
        fillCities(); bind(); applyFilters();
      })
      .catch(function (error) {
        nodes.count.textContent = "Каталог временно недоступен";
        nodes.cards.innerHTML = '<p class="nb-load-error">Не удалось загрузить данные. Позвоните нам — поможем подобрать новостройку.</p>';
        console.error("Newbuilds V3:", error);
      });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
