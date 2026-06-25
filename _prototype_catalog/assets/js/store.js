(function () {
  "use strict";

  var STORAGE_KEY = "domianPrototypeObjects";
  var FALLBACK_PHOTO = "assets/images/ui/hero.jpg";
  var DEMO_AGENT_NAMES = [
    "Павел Орлов",
    "Марина Пошивайло",
    "Валерий Андрейченко",
    "Александр Сычев",
    "Алексей Егупов"
  ];

  function getSeedObjects() {
    return Array.isArray(window.PROTOTYPE_OBJECTS)
      ? window.PROTOTYPE_OBJECTS.slice().map(sanitizeObjectAgent)
      : [];
  }

  function getCategories() {
    return Array.isArray(window.PROTOTYPE_CATEGORIES) ? window.PROTOTYPE_CATEGORIES.slice() : [];
  }

  function readUserObjects() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      var parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.map(sanitizeObjectAgent) : [];
    } catch (error) {
      console.warn("Не удалось прочитать localStorage прототипа", error);
      return [];
    }
  }

  function writeUserObjects(objects) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(objects.map(sanitizeObjectAgent)));
  }

  function getDemoAgentName(seed) {
    var text = String(seed || "");
    var sum = 0;
    for (var index = 0; index < text.length; index += 1) {
      sum += text.charCodeAt(index);
    }
    return DEMO_AGENT_NAMES[sum % DEMO_AGENT_NAMES.length];
  }

  function sanitizeObjectAgent(object) {
    if (!object) return object;
    if (DEMO_AGENT_NAMES.indexOf(object.agentName) >= 0) return object;
    return Object.assign({}, object, {
      agentName: getDemoAgentName(object.id || object.title || object.type)
    });
  }

  function getUserObjects(options) {
    var includeDrafts = Boolean(options && options.includeDrafts);
    var objects = readUserObjects();
    return includeDrafts ? objects : objects.filter(function (object) {
      return !object.isDraft;
    });
  }

  function getAllObjects(options) {
    var includeDrafts = Boolean(options && options.includeDrafts);
    var seed = getSeedObjects();
    var user = getUserObjects({ includeDrafts: includeDrafts });
    return user.concat(seed).filter(function (object) {
      return includeDrafts || !object.isDraft;
    });
  }

  function getObjectById(id) {
    if (!id) return null;
    return getAllObjects({ includeDrafts: true }).find(function (object) {
      return String(object.id) === String(id);
    }) || null;
  }

  function saveObject(object) {
    if (!object || !object.id) {
      throw new Error("Нельзя сохранить объект без id");
    }

    var objects = readUserObjects();
    var index = objects.findIndex(function (item) {
      return item.id === object.id;
    });
    var normalized = Object.assign({}, sanitizeObjectAgent(object), {
      source: "user",
      updatedAt: new Date().toISOString()
    });

    if (index >= 0) {
      objects[index] = normalized;
    } else {
      objects.unshift(normalized);
    }

    writeUserObjects(objects);
    return normalized;
  }

  function deleteUserObject(id) {
    var next = readUserObjects().filter(function (object) {
      return object.id !== id;
    });
    writeUserObjects(next);
  }

  function resetUserObjects() {
    window.localStorage.removeItem(STORAGE_KEY);
  }

  function parseNumber(value) {
    if (value === null || value === undefined || value === "") return null;
    if (typeof value === "number") return Number.isFinite(value) ? value : null;
    var normalized = String(value).replace(/\s/g, "").replace(",", ".");
    var number = Number(normalized.replace(/[^\d.]/g, ""));
    return Number.isFinite(number) ? number : null;
  }

  function formatPrice(value) {
    var price = parseNumber(value);
    if (!price) return "Цена по запросу";
    return new Intl.NumberFormat("ru-RU").format(price) + " ₽";
  }

  function formatArea(value) {
    var area = parseNumber(value);
    if (!area) return "площадь уточняется";
    return String(area).replace(".", ",") + " м²";
  }

  function formatLandArea(value) {
    var area = parseNumber(value);
    if (!area) return "";
    return String(area).replace(".", ",") + " сот.";
  }

  function getPrimaryPhoto(object) {
    if (object && Array.isArray(object.photos) && object.photos.length) {
      return object.photos[0];
    }
    return FALLBACK_PHOTO;
  }

  function escapeHtml(value) {
    return String(value === null || value === undefined ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function compactText(value, maxLength) {
    var text = String(value || "").replace(/\s+/g, " ").trim();
    if (!maxLength || text.length <= maxLength) return text;
    return text.slice(0, maxLength - 1).trim() + "…";
  }

  function getStatusClass(status) {
    if (status === "reserved") return "status-reserved";
    if (status === "sold") return "status-sold";
    return "status-published";
  }

  function normalizePhoneForWhatsApp(phone) {
    var digits = String(phone || "").replace(/\D/g, "");
    if (!digits) return "";
    if (digits[0] === "8") digits = "7" + digits.slice(1);
    return digits;
  }

  function buildObjectCard(object, options) {
    object = sanitizeObjectAgent(object);
    var compact = Boolean(options && options.compact);
    var photo = getPrimaryPhoto(object);
    var params = [
      object.area ? formatArea(object.area) : "",
      object.rooms ? object.rooms + " комн." : "",
      object.floor ? object.floor + "/" + (object.floorsTotal || "—") + " этаж" : "",
      object.landArea ? formatLandArea(object.landArea) : ""
    ].filter(Boolean);
    var phone = normalizePhoneForWhatsApp(object.agentPhone);
    var whatsapp = phone ? "https://wa.me/" + phone : "#";

    return [
      '<article class="object-card" data-object-id="' + escapeHtml(object.id) + '">',
      '  <a class="object-card__image" href="object.html?id=' + encodeURIComponent(object.id) + '">',
      '    <img src="' + escapeHtml(photo) + '" alt="' + escapeHtml(object.title) + '" loading="lazy" onerror="this.src=\'' + FALLBACK_PHOTO + '\'">',
      '    <span class="badge badge-type">' + escapeHtml(object.typeLabel || object.type) + '</span>',
      '    <span class="badge badge-status ' + getStatusClass(object.status) + '">' + escapeHtml(object.statusLabel || "Актуально") + '</span>',
      '  </a>',
      '  <div class="object-card__body">',
      '    <p class="object-card__price">' + formatPrice(object.price) + '</p>',
      '    <h3><a href="object.html?id=' + encodeURIComponent(object.id) + '">' + escapeHtml(object.title) + '</a></h3>',
      '    <p class="object-card__place">' + escapeHtml([object.city, object.district].filter(Boolean).join(", ")) + '</p>',
      params.length ? '    <div class="object-card__params">' + params.map(function (item) { return '<span>' + escapeHtml(item) + '</span>'; }).join("") + '</div>' : "",
      compact ? "" : '    <p class="object-card__text">' + escapeHtml(compactText(object.description, 145)) + '</p>',
      '    <div class="object-card__agent">',
      '      <span>' + escapeHtml(object.agentName || "Агент") + '</span>',
      '      <a href="' + escapeHtml(whatsapp) + '" target="_blank" rel="noopener">WhatsApp</a>',
      '    </div>',
      '    <div class="object-card__actions">',
      '      <a class="btn btn-primary btn-small" href="object.html?id=' + encodeURIComponent(object.id) + '">Подробнее</a>',
      '      <a class="btn btn-soft btn-small" href="tel:' + escapeHtml(String(object.agentPhone || "").replace(/\s/g, "")) + '">Позвонить</a>',
      '    </div>',
      '  </div>',
      '</article>'
    ].filter(Boolean).join("");
  }

  window.DomianStore = {
    STORAGE_KEY: STORAGE_KEY,
    FALLBACK_PHOTO: FALLBACK_PHOTO,
    getSeedObjects: getSeedObjects,
    getCategories: getCategories,
    getUserObjects: getUserObjects,
    getAllObjects: getAllObjects,
    getObjectById: getObjectById,
    saveObject: saveObject,
    deleteUserObject: deleteUserObject,
    resetUserObjects: resetUserObjects,
    parseNumber: parseNumber,
    formatPrice: formatPrice,
    formatArea: formatArea,
    formatLandArea: formatLandArea,
    getPrimaryPhoto: getPrimaryPhoto,
    escapeHtml: escapeHtml,
    compactText: compactText,
    getStatusClass: getStatusClass,
    normalizePhoneForWhatsApp: normalizePhoneForWhatsApp,
    buildObjectCard: buildObjectCard
  };
})();
