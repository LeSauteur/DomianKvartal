(function () {
  "use strict";

  var store = window.DomianStore;

  var categoryMeta = {
    apartment: {
      count: "1 248 объектов",
      image: "assets/images/objects/apt-001-1.jpg",
      icon: "building"
    },
    house: {
      count: "856 объектов",
      image: "assets/images/ui/reference-premium-house.png",
      icon: "home"
    },
    land: {
      count: "612 объектов",
      image: "assets/images/objects/land-002-1.jpg",
      icon: "tree"
    },
    commercial: {
      count: "341 объект",
      image: "assets/images/objects/commercial-001-1.jpg",
      icon: "shop"
    },
    newbuilding: {
      count: "972 объекта",
      image: "assets/images/objects/newbuilding-001-1.jpg",
      icon: "crane"
    }
  };

  function renderCategories() {
    var root = document.querySelector("[data-category-grid]");
    if (!root) return;

    root.innerHTML = store.getCategories().map(function (category) {
      var meta = categoryMeta[category.type] || {};
      return [
        '<a class="reference-category reference-category--' + store.escapeHtml(category.accent) + '" href="catalog.html?type=' + encodeURIComponent(category.type) + '">',
        '  <span class="ref-icon ref-icon--' + store.escapeHtml(meta.icon || "home") + '" aria-hidden="true"></span>',
        '  <strong>' + store.escapeHtml(category.label) + '</strong>',
        '  <em>' + store.escapeHtml(meta.count || "16 объектов") + '</em>',
        '  <img src="' + store.escapeHtml(meta.image || store.FALLBACK_PHOTO) + '" alt="" loading="lazy" onerror="this.src=\'' + store.FALLBACK_PHOTO + '\'">',
        '</a>'
      ].join("");
    }).join("");
  }

  function getUnitPrice(object) {
    var price = store.parseNumber(object.price);
    var area = store.parseNumber(object.landArea || object.area);
    if (!price || !area) return "";
    var unit = object.type === "land" ? "сот." : "м²";
    return new Intl.NumberFormat("ru-RU").format(Math.round(price / area)) + " ₽/" + unit;
  }

  function renderMiniCatalog() {
    var root = document.querySelector("[data-mini-catalog]");
    if (!root) return;

    var preferred = ["apt-001", "house-003", "land-002", "commercial-002"];
    var objects = preferred.map(function (id) {
      return store.getObjectById(id);
    }).filter(Boolean);

    root.innerHTML = objects.map(function (object) {
      return [
        '<article class="mini-object">',
        '  <a class="mini-object__image" href="object.html?id=' + encodeURIComponent(object.id) + '">',
        '    <img src="' + store.escapeHtml(store.getPrimaryPhoto(object)) + '" alt="' + store.escapeHtml(object.title) + '" loading="lazy" onerror="this.src=\'' + store.FALLBACK_PHOTO + '\'">',
        '    <span class="mini-heart" aria-hidden="true"></span>',
        '  </a>',
        '  <div class="mini-object__body">',
        '    <h3><a href="object.html?id=' + encodeURIComponent(object.id) + '">' + store.escapeHtml(store.compactText(object.title, 40)) + '</a></h3>',
        '    <p>' + store.escapeHtml([object.city, object.district].filter(Boolean).join(", ")) + '</p>',
        '    <strong>' + store.formatPrice(object.price) + '</strong>',
        '    <span>' + store.escapeHtml(getUnitPrice(object)) + '</span>',
        '  </div>',
        '</article>'
      ].join("");
    }).join("");
  }

  function setupSearch() {
    var form = document.querySelector("[data-hero-search]");
    if (!form) return;

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var query = form.querySelector("input").value.trim();
      var target = query ? "catalog.html?q=" + encodeURIComponent(query) : "catalog.html";
      window.location.href = target;
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    setupSearch();
    renderCategories();
    renderMiniCatalog();
  });
})();
