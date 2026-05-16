(function () {
  "use strict";

  var CATALOG_TYPES = ["apartments", "houses", "lands", "newbuilds"];

  function qs(selector, root) {
    return (root || document).querySelector(selector);
  }

  function qsa(selector, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(selector));
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function normalizeText(value) {
    return String(value || "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
  }

  function truncate(text, maxLength) {
    var normalized = normalizeText(text);
    if (normalized.length <= maxLength) {
      return normalized;
    }
    return normalized.slice(0, maxLength).trim() + "...";
  }

  function toNumber(value) {
    if (value === null || value === undefined || value === "") {
      return null;
    }
    var normalized = String(value).replace(/\s+/g, "").replace(",", ".");
    var parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function extractPrice(text) {
    var source = normalizeText(text).toLowerCase();
    if (!source) return null;

    var best = null;
    var unitRegex = /(\d+[\d\s]*(?:[.,]\d+)?)\s*(млн|миллион|тыс|т\.?р|тр|руб|р\.|₽|РјР»РЅ|С‚С‹СЃ|СЂСѓР±)/gi;
    var unitMatch;
    while ((unitMatch = unitRegex.exec(source)) !== null) {
      var base = toNumber(unitMatch[1]);
      if (base === null) continue;
      var unit = unitMatch[2];
      var candidate = base;
      if (/млн|миллион|рјр»рн/.test(unit)) {
        candidate = base * 1000000;
      } else if (/тыс|т\.?р|тр|с‚с‹с/.test(unit)) {
        candidate = base * 1000;
      }
      if (!best || candidate > best) best = candidate;
    }

    if (best) return Math.round(best);

    var plain = source.match(/цена[^\d]{0,20}(\d[\d\s]{4,}(?:[.,]\d+)?)/i);
    if (plain) {
      var direct = toNumber(plain[1]);
      if (direct && direct > 100000) return Math.round(direct);
    }

    return null;
  }

  function extractAreaM2(text) {
    var source = normalizeText(text).toLowerCase();
    if (!source) return null;
    var regex = /(\d+(?:[.,]\d+)?)\s*(?:м2|м²|мв|кв\.?\s*м|квадрат)/gi;
    var match = regex.exec(source);
    return match ? toNumber(match[1]) : null;
  }

  function extractLandArea(text) {
    var source = normalizeText(text).toLowerCase();
    if (!source) return null;
    var regex = /(\d+(?:[.,]\d+)?)\s*(?:сот|соток|сотки)/gi;
    var match = regex.exec(source);
    return match ? toNumber(match[1]) : null;
  }

  function extractRooms(text) {
    var source = normalizeText(text).toLowerCase();
    if (!source) return null;

    var match = source.match(/(\d+)\s*[-–]?\s*(?:комн|комнат|к\b)/i);
    if (match) return parseInt(match[1], 10);

    match = source.match(/(?:евро\s*[-–]?\s*)?(\d+)\s*[-–]?\s*к/i);
    if (match) return parseInt(match[1], 10);

    return null;
  }

  function extractFloor(text) {
    var source = normalizeText(text).toLowerCase();
    if (!source) return null;

    var match = source.match(/этаж\s*[:№]?\s*(\d+)\s*\/\s*(\d+)/i);
    if (match) return parseInt(match[1], 10);

    match = source.match(/(\d+)\s*\/\s*\d+\s*(?:этаж|эт)/i);
    if (match) return parseInt(match[1], 10);

    return null;
  }

  function formatPrice(price) {
    if (!price) return "Цена по запросу";
    return new Intl.NumberFormat("ru-RU").format(price) + " ₽";
  }
  function parsePriceValue(value) {
    if (value === null || value === undefined) return null;
    var text = String(value).trim();
    if (!text) return null;
    var normalized = text.replace(/\s+/g, "").replace(",", ".");
    var match = normalized.match(/\d+(?:\.\d+)?/);
    if (!match) return null;
    var num = Number(match[0]);
    if (!isFinite(num) || num <= 0) return null;
    return Math.round(num);
  }

  function estimateCatalogPrice(type, area, landArea, rooms) {
    var ppsmByType = {
      apartments: 165000,
      houses: 70000,
      newbuilds: 175000
    };
    var roomMedian = {
      apartments: { 1: 4600000, 2: 6200000, 3: 7900000, 4: 9800000 },
      newbuilds: { 1: 5200000, 2: 7000000, 3: 8900000, 4: 10800000 },
      houses: { 2: 6800000, 3: 8200000, 4: 9800000, 5: 11800000 }
    };

    if (type === "lands") {
      var byLand = landArea && landArea > 0 ? landArea * 260000 : 1700000;
      return Math.round(byLand);
    }

    if (area && area > 10) {
      var ppsm = ppsmByType[type] || 120000;
      return Math.round(area * ppsm);
    }

    if (rooms && roomMedian[type] && roomMedian[type][rooms]) {
      return roomMedian[type][rooms];
    }

    if (type === "houses") return 7800000;
    if (type === "newbuilds") return 6800000;
    return 5600000;
  }

  function buildNewbuildTitle(item, data, index) {
    var currentTitle = normalizeText(item.title || "");
    if (/^(ЖК|Р–Рљ)/i.test(currentTitle)) {
      return currentTitle;
    }

    var text = normalizeText([item.title, data.title, data.description].join(" "));
    var match = text.match(/(?:ЖК|Р–Рљ)\s*[«\"“]?([^»\"”\n,.!]{2,50})/i);
    if (match) {
      return "ЖК " + normalizeText(match[1]);
    }

    match = text.match(/(?:ул\.?|улица)\s*([А-ЯA-ZЁ0-9][А-ЯA-ZЁа-яa-z0-9\-\s]{2,35})/i);
    if (match) {
      return "ЖК на ул. " + normalizeText(match[1]);
    }

    var fallback = [
      "ЖК Центральный квартал",
      "ЖК Солнечный",
      "ЖК Южный берег",
      "ЖК Город у реки",
      "ЖК Семейный парк",
      "ЖК Городской двор"
    ];

    return fallback[index % fallback.length];
  }

  function shuffle(array) {
    var copy = array.slice();
    for (var i = copy.length - 1; i > 0; i -= 1) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = copy[i];
      copy[i] = copy[j];
      copy[j] = tmp;
    }
    return copy;
  }

  function pickRandom(array, min, max) {
    if (!array.length) return [];
    var shuffled = shuffle(array);
    var count = Math.min(shuffled.length, min + Math.floor(Math.random() * (max - min + 1)));
    return shuffled.slice(0, count);
  }

  function fetchJson(path) {
    return fetch(path).then(function (res) {
      if (!res.ok) {
        throw new Error("Failed to load " + path + " (" + res.status + ")");
      }
      return res.json();
    });
  }

  function initGlobalInteractions() {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: "0px 0px -50px 0px"
    });

    qsa(".fade-in").forEach(function (el) {
      observer.observe(el);
    });

    qsa('a[href^="#"]').forEach(function (anchor) {
      anchor.addEventListener("click", function (event) {
        var targetId = anchor.getAttribute("href");
        if (!targetId || targetId === "#") return;
        var targetElement = qs(targetId);
        if (!targetElement) return;
        event.preventDefault();
        window.scrollTo({
          top: targetElement.offsetTop - 80,
          behavior: "smooth"
        });
      });
    });

    var goTop = qs(".go-top");
    if (goTop) {
      goTop.addEventListener("click", function () {
        window.scrollTo({ top: 0, behavior: "smooth" });
      });

      window.addEventListener("scroll", function () {
        if (window.scrollY > 600) {
          goTop.classList.add("show");
        } else {
          goTop.classList.remove("show");
        }
      });
    }
  }

  function initActiveNav() {
    var currentPath = (window.location.pathname || "").split("/").pop() || "index.html";
    qsa("header nav a").forEach(function (link) {
      var href = link.getAttribute("href");
      if (!href || href.charAt(0) === "#") return;
      var linkPath = href.split("?")[0].split("#")[0].split("/").pop();
      if (linkPath === currentPath) {
        link.classList.add("is-active");
        link.setAttribute("aria-current", "page");
      }
    });
  }

  function bindModal() {
    var modal = qs("#modal");
    if (!modal) return null;

    var title = qs("#modalTitle");
    var description = qs("#modalDesc");
    var images = qs("#modalImages");

    function closeModal() {
      modal.style.display = "none";
    }

    qsa(".close-modal", modal).forEach(function (btn) {
      btn.addEventListener("click", closeModal);
    });

    modal.addEventListener("click", function (event) {
      if (event.target === modal) {
        closeModal();
      }
    });

    return function openModal(item) {
      if (!title || !description || !images) return;
      title.textContent = item.title || "Объект";
      description.textContent = item.description || "";
      images.innerHTML = (item.images || []).map(function (img) {
        return '<img src="' + escapeHtml(img) + '" loading="lazy" alt="' + escapeHtml(item.title || "Фото") + '">';
      }).join("");
      modal.style.display = "flex";
    };
  }

  function hasCardValue(value) {
    return value !== undefined && value !== null && String(value).trim() !== "";
  }

  function uniqueImages(list) {
    var seen = Object.create(null);
    return (list || []).filter(function (value) {
      var key = hasCardValue(value) ? String(value).trim() : "";
      if (!key || seen[key]) return false;
      seen[key] = true;
      return true;
    });
  }

  function initMobileDrawer() {
    var toggle = qs(".mobile-menu-toggle");
    var drawer = qs("#mobile-drawer");
    if (!toggle || !drawer) return;

    var panel = qs(".mobile-drawer__panel", drawer);
    var closeBtn = qs(".mobile-drawer__close", drawer);

    function openDrawer() {
      drawer.classList.add("is-open");
      drawer.setAttribute("aria-hidden", "false");
      toggle.setAttribute("aria-expanded", "true");
      document.body.classList.add("drawer-open");
    }

    function closeDrawer() {
      drawer.classList.remove("is-open");
      drawer.setAttribute("aria-hidden", "true");
      toggle.setAttribute("aria-expanded", "false");
      document.body.classList.remove("drawer-open");
    }

    toggle.addEventListener("click", function () {
      if (drawer.classList.contains("is-open")) closeDrawer();
      else openDrawer();
    });

    if (closeBtn) {
      closeBtn.addEventListener("click", closeDrawer);
    }

    drawer.addEventListener("click", function (event) {
      if (panel && panel.contains(event.target)) return;
      closeDrawer();
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && drawer.classList.contains("is-open")) {
        closeDrawer();
      }
    });

    qsa("a", drawer).forEach(function (link) {
      link.addEventListener("click", closeDrawer);
    });
  }

  function getCardImages(item) {
    var images = [];
    if (item && Array.isArray(item.images)) images = images.concat(item.images);
    if (item && hasCardValue(item.cover)) images.push(item.cover);
    if (item && hasCardValue(item.image)) images.push(item.image);
    images = uniqueImages(images);
    return images.length ? images : ["assets/hero/hero.jpg"];
  }

  function renderPropertyGallery(images, title) {
    var safeImages = images && images.length ? images : ["assets/hero/hero.jpg"];
    var encoded = safeImages.map(function (img) { return encodeURIComponent(String(img)); }).join("|");
    var first = escapeHtml(safeImages[0]);
    var many = safeImages.length > 1;
    return [
      '<div class="property-card__gallery" data-images="' + encoded + '" data-index="0">',
      '<div class="property-card__photo" data-src="' + first + '" style="background-image: url(\'' + first + '\');" aria-label="' + escapeHtml(title || "Фото объекта") + '"></div>',
      many ? '<button class="property-card__gallery-btn property-card__gallery-btn--prev" type="button" aria-label="Предыдущее фото">‹</button>' : "",
      many ? '<button class="property-card__gallery-btn property-card__gallery-btn--next" type="button" aria-label="Следующее фото">›</button>' : "",
      many ? '<div class="property-card__counter">1/' + safeImages.length + '</div>' : "",
      "</div>"
    ].join("");
  }

  function renderCardChars(values) {
    var chars = (values || []).filter(hasCardValue).slice(0, 6);
    if (!chars.length) return "";
    return '<div class="property-card__chars">' + chars.map(function (value) {
      return '<span class="property-card__char">' + escapeHtml(String(value)) + "</span>";
    }).join("") + "</div>";
  }

  function bindPropertyGalleryFallback(scope) {
    qsa(".property-card__photo", scope || document).forEach(function (photo) {
      var src = photo.getAttribute("data-src");
      if (!hasCardValue(src)) return;
      var probe = new Image();
      probe.onload = function () { photo.classList.remove("is-fallback"); };
      probe.onerror = function () {
        photo.style.backgroundImage = "url('assets/hero/hero.jpg')";
        photo.classList.add("is-fallback");
      };
      probe.src = src;
    });
  }

  function bindPropertyGalleryControls() {
    if (document.body && document.body.dataset && document.body.dataset.galleryBound === "1") return;
    if (document.body && document.body.dataset) document.body.dataset.galleryBound = "1";
    document.addEventListener("click", function (event) {
      var button = event.target && event.target.closest ? event.target.closest(".property-card__gallery-btn") : null;
      if (!button) return;
      event.preventDefault();
      event.stopPropagation();
      var gallery = button.closest(".property-card__gallery");
      if (!gallery) return;
      var images = String(gallery.getAttribute("data-images") || "").split("|").map(function (part) {
        try { return decodeURIComponent(part); } catch (_e) { return ""; }
      }).filter(hasCardValue);
      if (!images.length) images = ["assets/hero/hero.jpg"];
      var current = parseInt(gallery.getAttribute("data-index") || "0", 10);
      var next = button.classList.contains("property-card__gallery-btn--next") ? current + 1 : current - 1;
      if (next < 0) next = images.length - 1;
      if (next >= images.length) next = 0;
      gallery.setAttribute("data-index", String(next));
      var photo = qs(".property-card__photo", gallery);
      if (photo) {
        var src = images[next].replace(/'/g, "%27");
        photo.style.backgroundImage = "url('" + src + "')";
        photo.setAttribute("data-src", images[next]);
      }
      var counter = qs(".property-card__counter", gallery);
      if (counter) counter.textContent = String(next + 1) + "/" + String(images.length);
    });
  }

  function buildCard(item, onOpen) {
    var card = document.createElement("article");
    card.className = "card property-card";

    var safeTitle = escapeHtml(item.title || "Объект");
    var galleryImages = getCardImages(item);
    var meta = item.meta || {};

    var mortgageHtml = "";
    if (window.domianCatalogMortgage) {
      var mortgageText = window.domianCatalogMortgage.format(meta.price);
      if (mortgageText) {
        mortgageHtml = ' <span class="card-mortgage">' + escapeHtml(mortgageText) + '</span>';
      }
    }

    var charsHtml = renderCardChars([
      hasCardValue(meta.rooms) ? String(meta.rooms) + " комн." : "",
      hasCardValue(meta.area) ? String(meta.area) + " м²" : "",
      hasCardValue(meta.houseArea) ? "дом " + String(meta.houseArea) + " м²" : "",
      hasCardValue(meta.landArea) ? "участок " + String(meta.landArea) + " сот." : "",
      hasCardValue(meta.floor) ? String(meta.floor) + " эт." : ""
    ]);

    card.innerHTML = [
      renderPropertyGallery(galleryImages, safeTitle),
      '<div class="card-content property-card__body">',
      '<h2 class="property-card__title">' + safeTitle + '</h2>',
      '<div class="card-meta property-card__price">' + escapeHtml(formatPrice(meta.price)) + mortgageHtml + '</div>',
      charsHtml,
      '<div class="property-card__actions">',
      '<a class="btn property-card__cta" href="tel:+79536091122">Записаться на просмотр</a>',
      '<a class="btn property-card__phone" href="tel:+79536091122">+7 953 609-11-22</a>',
      "</div>",
      '</div>'
    ].join("");

    bindPropertyGalleryFallback(card);
    return card;
  }

  function buildFilterTemplate(type) {
    var templates = {
      apartments: [
        '<label>Цена от<input type="number" data-filter="priceMin" placeholder="₽"></label>',
        '<label>Цена до<input type="number" data-filter="priceMax" placeholder="₽"></label>',
        '<label>Комнат<input type="number" data-filter="rooms" placeholder="1"></label>',
        '<label>Площадь от<input type="number" step="0.1" data-filter="areaMin" placeholder="м²"></label>',
        '<label>Площадь до<input type="number" step="0.1" data-filter="areaMax" placeholder="м²"></label>'
      ],
      houses: [
        '<label>Цена от<input type="number" data-filter="priceMin" placeholder="₽"></label>',
        '<label>Цена до<input type="number" data-filter="priceMax" placeholder="₽"></label>',
        '<label>Дом от<input type="number" step="0.1" data-filter="houseAreaMin" placeholder="м²"></label>',
        '<label>Дом до<input type="number" step="0.1" data-filter="houseAreaMax" placeholder="м²"></label>',
        '<label>Участок от<input type="number" step="0.1" data-filter="landAreaMin" placeholder="сот."></label>',
        '<label>Участок до<input type="number" step="0.1" data-filter="landAreaMax" placeholder="сот."></label>'
      ],
      lands: [
        '<label>Цена от<input type="number" data-filter="priceMin" placeholder="₽"></label>',
        '<label>Цена до<input type="number" data-filter="priceMax" placeholder="₽"></label>',
        '<label>Площадь от<input type="number" step="0.1" data-filter="landAreaMin" placeholder="сот."></label>',
        '<label>Площадь до<input type="number" step="0.1" data-filter="landAreaMax" placeholder="сот."></label>'
      ],
      newbuilds: [
        '<label>Цена от<input type="number" data-filter="priceMin" placeholder="₽"></label>',
        '<label>Цена до<input type="number" data-filter="priceMax" placeholder="₽"></label>',
        '<label>Комнат<input type="number" data-filter="rooms" placeholder="1"></label>',
        '<label>Этаж<input type="number" data-filter="floor" placeholder="7"></label>'
      ]
    };

    return templates[type] || [];
  }

  function parseFilters(container) {
    var values = {};
    qsa("[data-filter]", container).forEach(function (input) {
      var key = input.getAttribute("data-filter");
      values[key] = toNumber(input.value);
    });
    return values;
  }

  function applyFilters(items, filters, type) {
    return items.filter(function (item) {
      var meta = item.meta;

      if (filters.priceMin !== null && (meta.price === null || meta.price < filters.priceMin)) return false;
      if (filters.priceMax !== null && (meta.price === null || meta.price > filters.priceMax)) return false;

      if (type === "apartments") {
        if (filters.rooms !== null && (meta.rooms === null || meta.rooms !== filters.rooms)) return false;
        if (filters.areaMin !== null && (meta.area === null || meta.area < filters.areaMin)) return false;
        if (filters.areaMax !== null && (meta.area === null || meta.area > filters.areaMax)) return false;
      }

      if (type === "houses") {
        if (filters.houseAreaMin !== null && (meta.houseArea === null || meta.houseArea < filters.houseAreaMin)) return false;
        if (filters.houseAreaMax !== null && (meta.houseArea === null || meta.houseArea > filters.houseAreaMax)) return false;
        if (filters.landAreaMin !== null && (meta.landArea === null || meta.landArea < filters.landAreaMin)) return false;
        if (filters.landAreaMax !== null && (meta.landArea === null || meta.landArea > filters.landAreaMax)) return false;
      }

      if (type === "lands") {
        if (filters.landAreaMin !== null && (meta.landArea === null || meta.landArea < filters.landAreaMin)) return false;
        if (filters.landAreaMax !== null && (meta.landArea === null || meta.landArea > filters.landAreaMax)) return false;
      }

      if (type === "newbuilds") {
        if (filters.rooms !== null && (meta.rooms === null || meta.rooms !== filters.rooms)) return false;
        if (filters.floor !== null && (meta.floor === null || meta.floor !== filters.floor)) return false;
      }

      return true;
    });
  }

  function resolveAssetPath(basePath, rawPath) {
    if (!rawPath) return "";
    var value = String(rawPath).trim();
    // Keep absolute, root-relative and data URLs untouched.
    if (/^(?:https?:)?\/\//i.test(value) || value.indexOf("/") === 0 || value.indexOf("data:") === 0) {
      return value;
    }
    return basePath + value;
  }

  function normalizeItem(type, item, data, idx) {
    var title = data.title || item.title || "Объект";
    var description = data.description || "";
    var images = Array.isArray(data.images) ? data.images : [];
    var basePath = "";

    if (type === "apartments") {
      basePath = "objects/" + item.id + "/";
    } else if (type === "houses") {
      basePath = "output/" + item.path + "/";
    } else {
      basePath = item.path + "/";
    }

    if (type === "newbuilds") {
      title = buildNewbuildTitle(item, data, idx);
    }

    var cover = item.cover ? resolveAssetPath(basePath, item.cover) : (images[0] ? resolveAssetPath(basePath, images[0]) : "assets/hero/hero.jpg");
    var fullImages = images.map(function (img) { return resolveAssetPath(basePath, img); });

    var sourceText = [item.title, title, description].join(" ");
    var area = extractAreaM2(sourceText);
    var landArea = extractLandArea(sourceText);
    var rooms = extractRooms(sourceText);
    var floor = extractFloor(sourceText);
    var price = parsePriceValue(data.price);
    if (price === null) {
      price = extractPrice(sourceText);
    }
    if (price === null) {
      price = estimateCatalogPrice(type, area, landArea, rooms);
    }

    return {
      id: item.id,
      title: title,
      description: description,
      cover: cover,
      images: fullImages,
      sectionLink: type + ".html",
      meta: {
        price: price,
        rooms: rooms,
        area: area,
        houseArea: type === "houses" ? area : null,
        landArea: landArea,
        floor: floor
      }
    };
  }

  function loadCategoryData(type) {
    if (type === "apartments") {
      return fetchJson("objects/index.json").then(function (ids) {
        var list = ids.map(function (id) {
          return { id: id, path: "objects/" + id, title: id, cover: null };
        });
        return Promise.all(list.map(function (item, idx) {
          return fetchJson(item.path + "/data.json").then(function (data) {
            return normalizeItem(type, item, data, idx);
          });
        }));
      });
    }

    if (type === "houses") {
      return fetchJson("output/houses/index.json").then(function (items) {
        return Promise.all(items.map(function (item, idx) {
          return fetchJson("output/" + item.path + "/data.json").then(function (data) {
            return normalizeItem(type, item, data, idx);
          });
        }));
      });
    }

    if (type === "lands") {
      return fetchJson("lands/index.json").then(function (items) {
        return Promise.all(items.map(function (item, idx) {
          return fetchJson(item.path + "/data.json").then(function (data) {
            return normalizeItem(type, item, data, idx);
          });
        }));
      });
    }

    return fetchJson("newbuilds/index.json").then(function (items) {
      return Promise.all(items.map(function (item, idx) {
        return fetchJson(item.path + "/data.json").then(function (data) {
          return normalizeItem(type, item, data, idx);
        });
      }));
    });
  }

  function initCatalogPage(type) {
    var cardsContainer = qs("#cards");
    var filtersContainer = qs("#filters");
    var resultsCount = qs("#resultsCount");
    var openModal = bindModal();

    if (!cardsContainer) return;

    cardsContainer.innerHTML = '<p class="loading-state">Загрузка объектов...</p>';

    loadCategoryData(type)
      .then(function (items) {
        if (!items.length) {
          cardsContainer.innerHTML = '<p class="loading-state">Объекты не найдены.</p>';
          return;
        }

        if (filtersContainer) {
          var controls = buildFilterTemplate(type);
          filtersContainer.innerHTML = controls.join("") + '<button type="button" class="btn filter-reset" id="resetFilters">Сбросить</button>';
        }

        function render(filteredItems) {
          cardsContainer.innerHTML = "";
          if (!filteredItems.length) {
            cardsContainer.innerHTML = '<p class="loading-state">По фильтру ничего не найдено.</p>';
          } else {
            filteredItems.forEach(function (item) {
              cardsContainer.appendChild(buildCard(item, openModal || function () {}));
            });
          }

          if (resultsCount) {
            resultsCount.textContent = "Найдено: " + filteredItems.length;
          }
        }

        function runFilter() {
          var values = filtersContainer ? parseFilters(filtersContainer) : {};
          var filtered = applyFilters(items, values, type);
          render(filtered);
        }

        render(items);

        if (filtersContainer) {
          qsa("input[data-filter]", filtersContainer).forEach(function (input) {
            input.addEventListener("input", runFilter);
          });

          var resetButton = qs("#resetFilters", filtersContainer);
          if (resetButton) {
            resetButton.addEventListener("click", function () {
              qsa("input[data-filter]", filtersContainer).forEach(function (input) {
                input.value = "";
              });
              runFilter();
            });
          }
        }
      })
      .catch(function (error) {
        cardsContainer.innerHTML = '<p class="loading-state">Ошибка загрузки. Обновите страницу.</p>';
        console.error(error);
      });
  }

  function renderHotCard(item) {
    var safeTitle = escapeHtml(item.title || "Объект");
    var galleryImages = getCardImages(item);
    var charsHtml = renderCardChars([
      item && item.meta && hasCardValue(item.meta.rooms) ? String(item.meta.rooms) + " комн." : "",
      item && item.meta && hasCardValue(item.meta.area) ? String(item.meta.area) + " м²" : "",
      item && item.meta && hasCardValue(item.meta.floor) ? String(item.meta.floor) + " эт." : ""
    ]);
    return [
      '<article class="hot-offer-card property-card">',
      renderPropertyGallery(galleryImages, safeTitle),
      '<div class="hot-offer-content property-card__body">',
      '<span class="hot-offer-tag property-card__meta">' + escapeHtml(item.categoryName) + '</span>',
      '<h3 class="property-card__title">' + safeTitle + '</h3>',
      '<div class="hot-offer-price property-card__price">' + escapeHtml(formatPrice(item.meta.price)) + '</div>',
      charsHtml,
      '<div class="property-card__actions">',
      '<a class="btn property-card__cta" href="tel:+79536091122">Записаться на просмотр</a>',
      '<a class="btn property-card__phone" href="tel:+79536091122">+7 953 609-11-22</a>',
      '</div>',
      '</div>',
      '</article>'
    ].join("");
  }

  function getFeaturedSlice(type, count) {
    return loadCategoryData(type).then(function (items) {
      return pickRandom(items, Math.min(1, count), count).map(function (item) {
        item.categoryName = {
          apartments: "Квартиры",
          houses: "Дома",
          lands: "Участки",
          newbuilds: "Новостройки"
        }[type];
        return item;
      });
    }).catch(function () {
      return [];
    });
  }

  function initHotOffers() {
    var container = qs("#hot-offers-cards");
    if (!container) return;

    container.innerHTML = '<p class="loading-state">Подбираем лучшие варианты...</p>';

    Promise.all([
      getFeaturedSlice("apartments", 2),
      getFeaturedSlice("houses", 2),
      getFeaturedSlice("lands", 2),
      getFeaturedSlice("newbuilds", 2)
    ]).then(function (groups) {
      var allItems = [].concat.apply([], groups);
      var selected = pickRandom(allItems, 4, 6);

      if (!selected.length) {
        container.innerHTML = '<p class="loading-state">Пока нет доступных предложений.</p>';
        return;
      }

      container.innerHTML = selected.map(renderHotCard).join("");
      bindPropertyGalleryFallback(container);
    }).catch(function (error) {
      container.innerHTML = '<p class="loading-state">Не удалось загрузить предложения.</p>';
      console.error(error);
    });
  }

  function fetchJsonWithFallback(primaryPath, fallbackPath) {
    return fetchJson(primaryPath).catch(function () {
      if (!fallbackPath || fallbackPath === primaryPath) {
        throw new Error("Failed to load " + primaryPath);
      }
      return fetchJson(fallbackPath);
    });
  }

  function getTypeLabel(type) {
    return {
      apartment: "Квартира",
      house: "Дом",
      land: "Участок",
      newbuild: "Новостройка"
    }[type] || "Объект";
  }

  function renderNewObjectCard(item) {
    var title = escapeHtml(item.title || "Объект");
    var galleryImages = getCardImages(item);
    var price = escapeHtml(item.price || "Цена по запросу");
    var typeLabel = escapeHtml(getTypeLabel(item.type));
    var features = item && item.features && typeof item.features === "object" ? item.features : {};
    var sourceText = [item && item.title, item && item.shortDescription, item && item.description].filter(Boolean).join(" ");
    var areaMatch = sourceText.match(/(\d+(?:[.,]\d+)?)\s*(?:кв\.?\s*м|м²|м2)\b/iu);
    var landMatch = sourceText.match(/(\d+(?:[.,]\d+)?)\s*сот(?:к[аи])?/iu);
    var charsHtml = renderCardChars([
      hasCardValue(features.rooms) ? String(features.rooms) + " комн." : "",
      hasCardValue(features.floor) && hasCardValue(features.totalFloors) ? String(features.floor) + "/" + String(features.totalFloors) + " эт." : "",
      areaMatch && areaMatch[1] ? areaMatch[1].replace(",", ".") + " м²" : "",
      landMatch && landMatch[1] ? landMatch[1].replace(",", ".") + " сот." : "",
      hasCardValue(item && item.city) ? String(item.city) : "",
      hasCardValue(item && item.district) ? String(item.district) : ""
    ]);

    return [
      '<article class="new-object-card property-card">',
      renderPropertyGallery(galleryImages, title),
      '<div class="new-object-card__content property-card__body">',
      '<span class="new-object-card__type property-card__meta">' + typeLabel + '</span>',
      '<h3 class="property-card__title">' + title + '</h3>',
      '<div class="new-object-card__price property-card__price">' + price + '</div>',
      charsHtml,
      '<div class="property-card__actions">',
      '<a class="btn property-card__cta" href="tel:+79536091122">Записаться на просмотр</a>',
      '<a class="btn property-card__phone" href="tel:+79536091122">+7 953 609-11-22</a>',
      '</div>',
      '</div>',
      '</article>'
    ].join("");
  }

  function initNewObjects() {
    var container = qs("#new-objects-cards");
    if (!container) return;

    container.innerHTML = '<p class="loading-state">Загрузка новых объектов...</p>';

    fetchJsonWithFallback("/output/home/new-objects.json", "output/home/new-objects.json")
      .then(function (items) {
        if (!Array.isArray(items) || !items.length) {
          container.innerHTML = '<p class="loading-state">Новые объекты пока не добавлены.</p>';
          return;
        }
        container.innerHTML = items.slice(0, 8).map(renderNewObjectCard).join("");
        bindPropertyGalleryFallback(container);
      })
      .catch(function (error) {
        container.innerHTML = '<p class="loading-state">Не удалось загрузить новые объекты.</p>';
        console.error(error);
      });
  }

  function getListingNewObjectsPath(listingType) {
    return {
      apartments: "apartments",
      houses: "houses",
      lands: "lands",
      newbuilds: "newbuilds"
    }[listingType] || null;
  }

  function initListingNewObjects(listingType) {
    var container = qs("#listing-new-objects-cards");
    var outputDir = getListingNewObjectsPath(listingType);
    if (!container || !outputDir) return;

    container.innerHTML = '<p class="loading-state">Загрузка новых объектов...</p>';

    var primaryPath = "/output/" + outputDir + "/new-objects.json";
    var fallbackPath = "output/" + outputDir + "/new-objects.json";

    fetchJsonWithFallback(primaryPath, fallbackPath)
      .then(function (items) {
        if (!Array.isArray(items) || !items.length) {
          container.innerHTML = '<p class="loading-state">Новые объекты пока не добавлены.</p>';
          return;
        }
        container.innerHTML = items.slice(0, 10).map(renderNewObjectCard).join("");
        bindPropertyGalleryFallback(container);
      })
      .catch(function (error) {
        container.innerHTML = '<p class="loading-state">Не удалось загрузить новые объекты.</p>';
        console.error(error);
      });
  }

  document.addEventListener("DOMContentLoaded", function () {
    initGlobalInteractions();
    initActiveNav();
    initMobileDrawer();
    bindPropertyGalleryControls();
    initNewObjects();

    var listingType = document.body && document.body.dataset ? document.body.dataset.listing : null;
    if (CATALOG_TYPES.indexOf(listingType) !== -1) {
      initListingNewObjects(listingType);
      initCatalogPage(listingType);
    }

    initHotOffers();

    // Footer accordions for mobile
    initFooterAccordions();
  });

  function initFooterAccordions() {
    var footerColumns = qsa(".footer-column");
    if (!footerColumns.length) return;

    // Check if mobile
    var isMobile = window.innerWidth <= 768;

    footerColumns.forEach(function (column, index) {
      var header = qs("h3", column);
      if (!header) return;

      // Make header clickable
      header.setAttribute("role", "button");
      header.setAttribute("tabindex", "0");
      header.setAttribute("aria-expanded", index === 0 ? "true" : "false");

      // Click handler
      function toggleAccordion() {
        if (!isMobile && window.innerWidth > 768) {
          // Desktop - keep all open
          footerColumns.forEach(function (col) {
            col.classList.add("active");
            var h = qs("h3", col);
            if (h) h.setAttribute("aria-expanded", "true");
          });
          return;
        }

        var isActive = column.classList.contains("active");

        // Close all
        footerColumns.forEach(function (col) {
          col.classList.remove("active");
          var h = qs("h3", col);
          if (h) h.setAttribute("aria-expanded", "false");
        });

        // Open clicked if it was closed
        if (!isActive) {
          column.classList.add("active");
          header.setAttribute("aria-expanded", "true");
        }
      }

      header.addEventListener("click", toggleAccordion);

      // Keyboard support
      header.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          toggleAccordion();
        }
      });

      // Open first column by default on mobile
      if (isMobile && index === 0) {
        column.classList.add("active");
        header.setAttribute("aria-expanded", "true");
      }
    });

    // Handle resize
    var resizeTimer;
    window.addEventListener("resize", function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        isMobile = window.innerWidth <= 768;
        if (!isMobile) {
          // Desktop - open all
          footerColumns.forEach(function (col) {
            col.classList.add("active");
            var h = qs("h3", col);
            if (h) h.setAttribute("aria-expanded", "true");
          });
        } else {
          // Mobile - close all except first
          footerColumns.forEach(function (col, idx) {
            if (idx === 0) {
              col.classList.add("active");
              var h = qs("h3", col);
              if (h) h.setAttribute("aria-expanded", "true");
            } else {
              col.classList.remove("active");
              var h2 = qs("h3", col);
              if (h2) h2.setAttribute("aria-expanded", "false");
            }
          });
        }
      }, 250);
    });
  }
})();


