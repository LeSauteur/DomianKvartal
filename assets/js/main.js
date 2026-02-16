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

  function buildCard(item, onOpen) {
    var card = document.createElement("article");
    card.className = "card";

    var safeCover = escapeHtml(item.cover || "assets/hero/hero.jpg");
    var safeTitle = escapeHtml(item.title || "Объект");

    card.innerHTML = [
      '<img src="' + safeCover + '" loading="lazy" alt="' + safeTitle + '">',
      '<div class="card-content">',
      '<h2>' + safeTitle + '</h2>',
      '<p>' + escapeHtml(truncate(item.description || "", 140)) + '</p>',
      '<div class="card-meta">' + escapeHtml(formatPrice(item.meta.price)) + '</div>',
      '<button class="btn card-open" type="button">Подробнее</button>',
      '</div>'
    ].join("");

    var button = qs(".card-open", card);
    if (button) {
      button.addEventListener("click", function () {
        onOpen(item);
      });
    }

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

    var cover = item.cover ? (basePath + item.cover) : (images[0] ? basePath + images[0] : "assets/hero/hero.jpg");
    var fullImages = images.map(function (img) { return basePath + img; });

    var sourceText = [item.title, title, description].join(" ");
    var area = extractAreaM2(sourceText);
    var landArea = extractLandArea(sourceText);
    var rooms = extractRooms(sourceText);
    var floor = extractFloor(sourceText);
    var price = extractPrice(sourceText);

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
    return [
      '<a class="hot-offer-card" href="' + escapeHtml(item.sectionLink) + '">',
      '<img src="' + escapeHtml(item.cover || "assets/hero/hero.jpg") + '" loading="lazy" alt="' + safeTitle + '">',
      '<div class="hot-offer-content">',
      '<span class="hot-offer-tag">' + escapeHtml(item.categoryName) + '</span>',
      '<h3>' + safeTitle + '</h3>',
      '<p>' + escapeHtml(truncate(item.description, 120)) + '</p>',
      '<div class="hot-offer-price">' + escapeHtml(formatPrice(item.meta.price)) + '</div>',
      '</div>',
      '</a>'
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
    }).catch(function (error) {
      container.innerHTML = '<p class="loading-state">Не удалось загрузить предложения.</p>';
      console.error(error);
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    initGlobalInteractions();

    var listingType = document.body && document.body.dataset ? document.body.dataset.listing : null;
    if (CATALOG_TYPES.indexOf(listingType) !== -1) {
      initCatalogPage(listingType);
    }

    initHotOffers();
  });
})();
