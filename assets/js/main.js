(function () {
  "use strict";

  var CATALOG_TYPES = ["apartments", "houses", "lands", "newbuilds"];
  var METRIKA_ID = 109303205;
  var THEME_STORAGE_KEY = "domian-color-theme";
  var LEAD_CONTEXT_KEY = "domian_lead_context";
  var UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];
  var UTM_STORAGE_PREFIX = "domian_utm_";
  var MAIN_SCRIPT_URL = document.currentScript && document.currentScript.src ? document.currentScript.src : "";
  var leadConfigLoading = false;
  var leadConfigCallbacks = [];

  window.DOMIAN_METRIKA_ID = window.DOMIAN_METRIKA_ID || METRIKA_ID;

  function ensureMetrika() {
    var script;

    if (typeof window.ym === "function") return;

    window.ym = function () {
      (window.ym.a = window.ym.a || []).push(arguments);
    };
    window.ym.l = Date.now();

    script = document.createElement("script");
    script.async = true;
    script.src = "https://mc.yandex.ru/metrika/tag.js?id=" + METRIKA_ID;
    document.head.appendChild(script);

    window.ym(METRIKA_ID, "init", {
      ssr: true,
      webvisor: true,
      clickmap: true,
      ecommerce: "dataLayer",
      referrer: document.referrer,
      url: window.location.href,
      accurateTrackBounce: true,
      trackLinks: true
    });
  }

  ensureMetrika();

  function persistUtmAttribution() {
    var params = new URLSearchParams(window.location.search || "");

    UTM_KEYS.forEach(function (key) {
      var value = params.get(key);
      if (!value) return;

      try {
        window.sessionStorage.setItem(UTM_STORAGE_PREFIX + key, value);
      } catch (error) {
        // UTM attribution must not block the page.
      }
    });
  }

  persistUtmAttribution();

  function getStoredTheme() {
    try {
      return window.localStorage.getItem(THEME_STORAGE_KEY) === "dark" ? "dark" : "light";
    } catch (_error) {
      return "light";
    }
  }

  function applyTheme(theme) {
    var isDark = theme === "dark";
    if (isDark) {
      document.documentElement.setAttribute("data-theme", "dark");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }

    qsa(".theme-toggle").forEach(function (button) {
      button.setAttribute("aria-pressed", isDark ? "true" : "false");
      button.setAttribute("aria-label", isDark ? "Включить светлую тему" : "Включить тёмную тему");
      button.setAttribute("title", isDark ? "Светлая тема" : "Тёмная тема");

      var label = qs(".theme-toggle__label", button);
      if (label) label.textContent = isDark ? "Светлая тема" : "Тёмная тема";
    });
  }

  applyTheme(getStoredTheme());

  function safeReachGoal(goal, params) {
    try {
      if (typeof window.ym === "function") {
        window.ym(window.DOMIAN_METRIKA_ID || METRIKA_ID, "reachGoal", goal, params || {});
      }
    } catch (error) {
      // Ignore analytics errors.
    }
  }

  window.domianReachGoal = window.domianReachGoal || safeReachGoal;

  function qs(selector, root) {
    return (root || document).querySelector(selector);
  }

  function qsa(selector, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(selector));
  }

  function flushLeadConfigCallbacks(config) {
    var callbacks = leadConfigCallbacks.slice();
    leadConfigCallbacks = [];
    callbacks.forEach(function (callback) {
      callback(config || {});
    });
  }

  function withLeadConfig(callback) {
    var config = window.DOMIAN_LEAD_CONFIG;
    var script;
    var configUrl;

    if (config) {
      callback(config);
      return;
    }

    leadConfigCallbacks.push(callback);
    if (leadConfigLoading) return;
    leadConfigLoading = true;

    try {
      configUrl = new URL("lead-config.js", MAIN_SCRIPT_URL || window.location.href).href;
    } catch (_error) {
      flushLeadConfigCallbacks({});
      return;
    }

    script = document.createElement("script");
    script.src = configUrl;
    script.async = true;
    script.setAttribute("data-domian-lead-config-loader", "");
    script.addEventListener("load", function () {
      flushLeadConfigCallbacks(window.DOMIAN_LEAD_CONFIG || {});
    });
    script.addEventListener("error", function () {
      flushLeadConfigCallbacks({});
    });
    document.head.appendChild(script);
  }

  function channelForLink(link) {
    var explicit = (link.getAttribute("data-channel") || "").toLowerCase();
    var href = (link.getAttribute("href") || "").toLowerCase();

    if (explicit === "whatsapp" || explicit === "telegram" || explicit === "max") return explicit;
    if (href.indexOf("wa.me") !== -1 || href.indexOf("whatsapp") !== -1) return "whatsapp";
    if (href.indexOf("t.me") !== -1) return "telegram";
    if (href.indexOf("max.ru/") !== -1) return "max";
    return "";
  }

  function channelLabel(channel) {
    return {
      whatsapp: "Написать Зухре в WhatsApp",
      telegram: "Написать Зухре в Telegram",
      max: "Написать Зухре в MAX"
    }[channel] || "Открыть мессенджер";
  }

  function appendChannelGraphic(link, channel, config) {
    var hiddenLabel = document.createElement("span");
    var graphic;

    link.textContent = "";
    hiddenLabel.className = "visually-hidden";
    hiddenLabel.textContent = channel === "max" ? "MAX" :
      channel === "telegram" ? "Telegram" : "WhatsApp";

    if (channel === "max") {
      graphic = document.createElement("img");
      graphic.src = config.maxLogoPath || "/assets/images/max-logo.png";
      graphic.alt = "";
      graphic.width = 26;
      graphic.height = 26;
      graphic.setAttribute("aria-hidden", "true");
      graphic.className = "channel-icon__image";
    } else {
      graphic = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      graphic.setAttribute("viewBox", "0 0 24 24");
      graphic.setAttribute("aria-hidden", "true");
      graphic.setAttribute("focusable", "false");
      graphic.classList.add("channel-icon__svg");

      if (channel === "telegram") {
        graphic.innerHTML = '<path fill="currentColor" d="M21.5 3.4 18.4 20c-.2 1.2-.9 1.5-1.9.9l-4.7-3.5-2.3 2.2c-.3.3-.5.5-1 .5l.3-4.8 8.8-8c.4-.3-.1-.5-.6-.2L6.1 14l-4.7-1.5c-1-.3-1-1 .2-1.5L20 3.9c.9-.3 1.7.2 1.5-.5Z"/>';
      } else {
        graphic.innerHTML = '<path fill="currentColor" d="M12 2a9.8 9.8 0 0 0-8.4 14.9L2 22l5.2-1.6A9.9 9.9 0 1 0 12 2Zm0 17.9a8 8 0 0 1-4.1-1.1l-.3-.2-3 .9 1-2.9-.2-.3A8 8 0 1 1 12 19.9Zm4.4-6c-.2-.1-1.4-.7-1.7-.8-.2-.1-.4-.1-.6.1-.2.3-.6.8-.8 1-.1.1-.3.1-.5 0a6.5 6.5 0 0 1-3.2-2.8c-.2-.3 0-.4.1-.5l.4-.5.2-.5c.1-.2 0-.4 0-.5l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.2.3-.9.9-.9 2.1 0 1.3.9 2.5 1.1 2.7.1.2 1.8 2.8 4.4 3.9.6.2 1.1.4 1.5.5.6.2 1.2.1 1.6.1.5-.1 1.4-.6 1.7-1.2.2-.6.2-1.1.1-1.2 0-.1-.2-.2-.5-.3Z"/>';
      }
    }

    link.appendChild(graphic);
    link.appendChild(hiddenLabel);
  }

  function enhanceChannelLink(link, channel, config) {
    var label = channelLabel(channel);

    if (!channel) return;

    link.setAttribute("data-channel", channel);
    link.setAttribute("aria-label", label);
    link.setAttribute("title", label);
    link.classList.add("channel-icon", "channel-icon--" + channel);

    if (channel === "whatsapp" && config.whatsappBaseUrl) {
      link.href = config.whatsappBaseUrl;
    } else if (channel === "telegram" && config.telegramUrl) {
      link.href = config.telegramUrl;
    } else if (channel === "max" && config.maxDirectUrl) {
      link.href = config.maxDirectUrl;
      link.setAttribute("data-max-trigger", "");
    }

    link.target = "_blank";
    link.rel = "noopener noreferrer";

    if (link.getAttribute("data-channel-enhanced") !== "1") {
      appendChannelGraphic(link, channel, config);
      link.setAttribute("data-channel-enhanced", "1");
    }
  }

  function ensureMaxLink(group, config) {
    var existingChannels = qsa("a[href], a[data-channel]", group);
    var hasMessenger = existingChannels.some(function (link) {
      var channel = channelForLink(link);
      return channel === "whatsapp" || channel === "telegram";
    });
    var hasMax = existingChannels.some(function (link) {
      return channelForLink(link) === "max";
    });
    var link;
    var vkLink;

    if (!hasMessenger || hasMax || !config.maxDirectUrl) return;

    link = document.createElement("a");
    link.href = config.maxDirectUrl;
    link.setAttribute("data-channel", "max");
    link.setAttribute("data-max-trigger", "");
    link.textContent = "MAX";

    vkLink = qsa("a[href]", group).find(function (candidate) {
      return (candidate.getAttribute("href") || "").indexOf("vk.com") !== -1;
    });
    group.insertBefore(link, vkLink || null);
  }

  function enhanceContactChannels(root, config) {
    var groups = qsa(
      ".header-contacts, .mobile-drawer__actions, .contact-actions, " +
      ".agent-contact-channels, .footer-social, .thanks-channels, .form-fallback__channels",
      root || document
    );

    groups.forEach(function (group) {
      group.classList.add("contact-channel-group");
      ensureMaxLink(group, config);
      qsa("a[href], a[data-channel]", group).forEach(function (link) {
        enhanceChannelLink(link, channelForLink(link), config);
      });
    });
  }

  function isMaxDirectMode() {
    return window.matchMedia &&
      window.matchMedia("(max-width: 767px), (pointer: coarse)").matches;
  }

  function createMaxDialog(config) {
    var dialog = document.createElement("dialog");
    var panel = document.createElement("div");
    var close = document.createElement("button");
    var logo = document.createElement("img");
    var title = document.createElement("h2");
    var name = document.createElement("p");
    var qr = document.createElement("img");
    var instruction = document.createElement("p");
    var direct = document.createElement("a");

    dialog.className = "max-dialog";
    dialog.setAttribute("aria-labelledby", "max-dialog-title");
    dialog.setAttribute("aria-describedby", "max-dialog-instruction");
    dialog.setAttribute("data-max-dialog", "");

    panel.className = "max-dialog__panel";

    close.type = "button";
    close.className = "max-dialog__close";
    close.setAttribute("aria-label", "Закрыть окно MAX");
    close.setAttribute("data-max-dialog-close", "");
    close.textContent = "×";

    logo.className = "max-dialog__logo";
    logo.src = config.maxLogoPath || "/assets/images/max-logo.png";
    logo.alt = "MAX";
    logo.width = 52;
    logo.height = 52;

    title.id = "max-dialog-title";
    title.textContent = "Написать Зухре в MAX";

    name.className = "max-dialog__name";
    name.textContent = "Зухра Алиева";

    qr.className = "max-dialog__qr";
    qr.src = config.maxQrPath || "/assets/images/max-zukhra-qr.png";
    qr.alt = "QR-код профиля Зухры Алиевой в MAX";
    qr.width = 320;
    qr.height = 320;

    instruction.id = "max-dialog-instruction";
    instruction.className = "max-dialog__instruction";
    instruction.textContent = "Отсканируйте QR-код камерой телефона";

    direct.className = "btn max-dialog__direct";
    direct.href = config.maxDirectUrl;
    direct.target = "_blank";
    direct.rel = "noopener noreferrer";
    direct.setAttribute("data-max-direct", "");
    direct.textContent = "Открыть MAX";

    panel.appendChild(close);
    panel.appendChild(logo);
    panel.appendChild(title);
    panel.appendChild(name);
    panel.appendChild(qr);
    panel.appendChild(instruction);
    panel.appendChild(direct);
    dialog.appendChild(panel);
    document.body.appendChild(dialog);
    return dialog;
  }

  function initContactChannels(config) {
    var dialog;
    var lastMaxTrigger = null;

    if (!config.maxDirectUrl || !config.telegramUrl || !config.whatsappBaseUrl) return;

    enhanceContactChannels(document, config);
    window.domianEnhanceContactChannels = function (root) {
      enhanceContactChannels(root || document, config);
    };

    function restorePageAfterDialog() {
      document.body.classList.remove("max-dialog-open");
      if (lastMaxTrigger && document.contains(lastMaxTrigger)) {
        lastMaxTrigger.focus();
      }
    }

    function closeDialog() {
      if (!dialog) return;
      if (typeof dialog.close === "function" && dialog.open) {
        dialog.close();
      } else {
        dialog.removeAttribute("open");
        dialog.classList.remove("max-dialog--fallback-open");
        restorePageAfterDialog();
      }
    }

    function openDialog(trigger) {
      var closeButton;

      dialog = dialog || createMaxDialog(config);
      lastMaxTrigger = trigger;
      document.body.classList.add("max-dialog-open");

      if (typeof dialog.showModal === "function") {
        if (!dialog.open) dialog.showModal();
      } else {
        dialog.setAttribute("open", "");
        dialog.classList.add("max-dialog--fallback-open");
      }

      closeButton = qs("[data-max-dialog-close]", dialog);
      window.setTimeout(function () {
        if (closeButton) closeButton.focus();
      }, 0);
    }

    document.addEventListener("click", function (event) {
      var direct = event.target && event.target.closest ? event.target.closest("[data-max-direct]") : null;
      var trigger = event.target && event.target.closest ? event.target.closest("[data-max-trigger]") : null;

      if (direct) {
        safeReachGoal("max_direct_open");
        return;
      }

      if (!trigger) return;

      safeReachGoal("max_click");
      if (isMaxDirectMode()) {
        safeReachGoal("max_direct_open");
        return;
      }

      event.preventDefault();
      safeReachGoal("max_qr_open");
      openDialog(trigger);
    });

    document.addEventListener("click", function (event) {
      if (event.target && event.target.closest && event.target.closest("[data-max-dialog-close]")) {
        closeDialog();
        return;
      }

      if (dialog && event.target === dialog) {
        closeDialog();
      }
    });

    document.addEventListener("keydown", function (event) {
      var focusable;
      var first;
      var last;

      if (!dialog || !dialog.open) return;

      if (event.key === "Escape" && typeof dialog.close !== "function") {
        event.preventDefault();
        closeDialog();
        return;
      }

      if (event.key !== "Tab") return;
      focusable = qsa('button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])', dialog)
        .filter(function (element) {
          return !element.hidden;
        });
      if (!focusable.length) return;

      first = focusable[0];
      last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });

    document.addEventListener("cancel", function (event) {
      if (dialog && event.target === dialog) {
        event.preventDefault();
        closeDialog();
      }
    }, true);

    document.addEventListener("close", function (event) {
      if (dialog && event.target === dialog) {
        restorePageAfterDialog();
      }
    }, true);

    window.domianMaxDialog = Object.freeze({
      close: closeDialog,
      isDirectMode: isMaxDirectMode
    });
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
    var unitRegex = /(\d+[\d\s]*(?:[.,]\d+)?)\s*(млн|миллион|тыс|т\.?р|тр|руб|р\.|₽|\u0420\u0458\u0420\u00bb\u0420\u0405|\u0421\u201a\u0421\u2039\u0421\u0455|\u0421\u0402\u0421\u0453\u0420\u00b1)/gi;
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

  function formatPrice(price, priceType) {
    var numeric = Number(price);
    if (!Number.isFinite(numeric) || numeric < 100000) return "Цена по запросу";
    var formatted = new Intl.NumberFormat("ru-RU").format(Math.round(numeric));
    if (priceType === "price_per_m2") return formatted + "\u00a0₽/м²";
    if (priceType === "minimum_total" || priceType === "advertising_from") return "от " + formatted + "\u00a0₽";
    return formatted + "\u00a0₽";
  }
  function parsePriceValue(value) {
    if (value === null || value === undefined) return null;
    var text = String(value).trim();
    if (!text) return null;
    var normalized = text.replace(/\s+/g, "").replace(",", ".");
    var match = normalized.match(/\d+(?:\.\d+)?/);
    if (!match) return null;
    var num = Number(match[0]);
    if (!isFinite(num) || num < 100000) return null;
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
    if (/^(ЖК|\u0420\u2013\u0420\u0459)/i.test(currentTitle)) {
      return currentTitle;
    }

    var text = normalizeText([item.title, data.title, data.description].join(" "));
    var match = text.match(/(?:ЖК|\u0420\u2013\u0420\u0459)\s*[«\"“]?([^»\"”\n,.!]{2,50})/i);
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

  function initMetrikaClickGoals() {
    document.addEventListener("click", function (event) {
      var link = event.target && event.target.closest ? event.target.closest("a[href]") : null;
      if (!link) return;

      var href = (link.getAttribute("href") || "").toLowerCase();
      if (!href) return;

      if (link.closest(".property-card") && link.matches(".property-card__cta, .property-card__phone")) {
        safeReachGoal("card_cta_click");
      }

      if (href.indexOf("tel:") === 0) {
        safeReachGoal("phone_click");
      } else if (href.indexOf("mailto:") === 0) {
        safeReachGoal("email_click");
      } else if (href.indexOf("wa.me") !== -1 || href.indexOf("whatsapp") !== -1) {
        safeReachGoal("whatsapp_click");
      } else if (href.indexOf("t.me") !== -1) {
        safeReachGoal("telegram_click");
      }
    });
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
    if (value === undefined || value === null) return false;
    var normalized = String(value).trim().toLowerCase();
    return normalized !== "" && normalized !== "null" && normalized !== "undefined" && normalized !== "nan";
  }

  function isSafeHttpUrl(value) {
    if (!hasCardValue(value)) return false;
    try {
      var parsed = new URL(String(value), window.location.href);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch (_error) {
      return false;
    }
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

  function buildObjectWhatsAppText(item, priceText) {
    var parts = [];
    var title = item && item.title ? String(item.title).trim() : "";
    var price = priceText || "";

    if (title) parts.push(title);
    if (item && item.city) parts.push(String(item.city).trim());
    if (item && item.district) parts.push(String(item.district).trim());
    if (price) parts.push(price);

    if (parts.length) {
      return encodeURIComponent("Здравствуйте. Интересует объект: " + parts.join(", ") + ". Хочу уточнить детали.");
    }

    return encodeURIComponent("Здравствуйте. Интересует объект на сайте Домиан Квартал. Хочу уточнить детали.");
  }

  function buildCard(item, onOpen) {
    var card = document.createElement("article");
    card.className = "card property-card";

    var safeTitle = escapeHtml(item.title || "Объект");
    var galleryImages = getCardImages(item);
    var meta = item.meta || {};
    var priceText = formatPrice(meta.price, meta.priceType) || "Цена по запросу";
    var sectionLink = isSafeHttpUrl(item.sectionLink) ? item.sectionLink : "index.html#contact";
    var isExternalLink = /^https?:\/\//i.test(sectionLink);
    var linkAttrs = isExternalLink ? ' target="_blank" rel="noopener noreferrer"' : "";

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
    var detailsHtml = renderCardChars(item.cardDetails || []);

    card.innerHTML = [
      renderPropertyGallery(galleryImages, safeTitle),
      '<div class="card-content property-card__body">',
      '<h2 class="property-card__title">' + safeTitle + '</h2>',
      '<div class="card-meta property-card__price"><span class="property-card__price-value">' + escapeHtml(priceText) + '</span>' + mortgageHtml + '</div>',
      charsHtml,
      detailsHtml,
      '<div class="property-card__actions">',
      '<a class="btn property-card__cta" href="' + escapeHtml(sectionLink) + '"' + linkAttrs + '>' + escapeHtml(item.ctaLabel || "Подробнее") + '</a>',
      '<a class="btn property-card__phone" href="tel:+79536091122">Позвонить</a>',
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
        '<label>Поиск<input type="search" data-filter="query" placeholder="Название, город, застройщик"></label>',
        '<label>Цена от<input type="number" data-filter="priceMin" placeholder="₽"></label>',
        '<label>Цена до<input type="number" data-filter="priceMax" placeholder="₽"></label>',
        '<label>Сортировка<select data-filter="sort"><option value="">По умолчанию</option><option value="priceAsc">Сначала дешевле</option><option value="priceDesc">Сначала дороже</option><option value="titleAsc">По названию</option></select></label>'
      ]
    };

    return templates[type] || [];
  }

  function parseFilters(container) {
    var values = {};
    qsa("[data-filter]", container).forEach(function (input) {
      var key = input.getAttribute("data-filter");
      values[key] = key === "query" || key === "sort" ? normalizeText(input.value) : toNumber(input.value);
    });
    return values;
  }

  function applyFilters(items, filters, type) {
    var filtered = items.filter(function (item) {
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
        var query = normalizeText(filters.query).toLowerCase();
        if (query && normalizeText(item.searchText || item.title).toLowerCase().indexOf(query) === -1) return false;
      }

      return true;
    });

    if (filters.sort === "priceAsc") {
      filtered.sort(function (a, b) {
        return (a.meta.price === null ? Number.POSITIVE_INFINITY : a.meta.price) - (b.meta.price === null ? Number.POSITIVE_INFINITY : b.meta.price);
      });
    } else if (filters.sort === "priceDesc") {
      filtered.sort(function (a, b) { return (b.meta.price || 0) - (a.meta.price || 0); });
    } else if (filters.sort === "titleAsc") {
      filtered.sort(function (a, b) { return String(a.title).localeCompare(String(b.title), "ru"); });
    }

    return filtered;
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

  function normalizeMergedNewbuild(item, idx) {
    var title = normalizeText(item.title) || "ЖК " + String(idx + 1);
    var description = normalizeText(item.description);
    var image = resolveAssetPath("", item.image);
    var priceType = normalizeText(item.price_type);
    var price = priceType === "on_request" || priceType === "requires_verification" ? null : parsePriceValue(item.price);
    var areaMin = toNumber(item.area_min);
    var areaMax = toNumber(item.area_max);
    var areaText = "";
    if (areaMin !== null && areaMax !== null) {
      areaText = "Площадь: " + String(areaMin).replace(".", ",") + "–" + String(areaMax).replace(".", ",") + " м²";
    } else if (areaMin !== null) {
      areaText = "Площадь: от " + String(areaMin).replace(".", ",") + " м²";
    }
    var officialUrl = isSafeHttpUrl(item.official_url) ? String(item.official_url) : "";

    return {
      id: "newbuild-v2-" + String(idx + 1),
      title: title,
      description: description,
      cover: image || "assets/hero/hero.jpg",
      images: image ? [image] : [],
      sectionLink: officialUrl || "newbuilds.html",
      ctaLabel: officialUrl ? "Официальный сайт" : "Подробнее",
      searchText: [title, item.city, item.address, item.developer, item.status].filter(hasCardValue).join(" "),
      cardDetails: [
        normalizeText(item.city),
        normalizeText(item.address),
        normalizeText(item.status) ? "Статус: " + normalizeText(item.status) : "",
        normalizeText(item.deadline) ? "Срок: " + normalizeText(item.deadline) : "",
        areaText,
        normalizeText(item.developer) ? "Застройщик: " + normalizeText(item.developer) : "",
        normalizeText(item.class) ? "Класс: " + normalizeText(item.class) : ""
      ],
      meta: {
        price: price,
        priceType: priceType,
        rooms: null,
        area: null,
        houseArea: null,
        landArea: null,
        floor: null
      }
    };
  }

  function loadLegacyNewbuildsData() {
    return fetchJson("newbuilds/index.json").then(function (items) {
      return Promise.all(items.map(function (item, idx) {
        return fetchJson(item.path + "/data.json").then(function (data) {
          return normalizeItem("newbuilds", item, data, idx);
        });
      }));
    });
  }

  function normalizeLeadText(value) {
    return value == null ? "" : String(value).replace(/\s+/g, " ").trim();
  }

  function readLeadData(element, name) {
    return element && element.getAttribute ? normalizeLeadText(element.getAttribute("data-" + name)) : "";
  }

  function inferLeadType(link) {
    var explicit = readLeadData(link, "lead-type");
    var text = normalizeLeadText(link.textContent).toLowerCase();
    var path = (window.location.pathname || "").toLowerCase();

    if (explicit) return explicit;
    if (text.indexOf("ипотек") !== -1) return "mortgage";
    if (text.indexOf("продаж") !== -1 || text.indexOf("оценить") !== -1) return "sell";
    if (path.indexOf("construction") !== -1) return "construction";
    if (path.indexOf("commercial") !== -1) return "commercial";
    if (path.indexOf("rent") !== -1) return "rent";
    if (path.indexOf("newbuild") !== -1 || path.indexOf("/zhk-") !== -1) return "newbuild";
    if (/apartments|houses|lands|kvartiry|doma|uchastki/.test(path)) return "buy";
    return "contact";
  }

  function inferSourceCta(link, objectId) {
    var explicit = readLeadData(link, "source-cta");
    var text = normalizeLeadText(link.textContent).toLowerCase();

    if (explicit) return explicit;
    if (objectId) return "object_card";
    if (text.indexOf("ипотек") !== -1) return "mortgage_consultation";
    if (text.indexOf("оценить") !== -1) return "property_valuation";
    if (text.indexOf("продаж") !== -1) return "sell_consultation";
    if (text.indexOf("налич") !== -1) return "availability_request";
    if (text.indexOf("подбор") !== -1) return "selection_request";
    if (text.indexOf("заяв") !== -1) return "leave_application";
    return "consultation";
  }

  function findObjectContext(link) {
    var ariaLabel = normalizeLeadText(link.getAttribute("aria-label"));
    var idMatch = ariaLabel.match(/\b((?:object|house|land|nb)_\d+)\b/i);
    var newbuildPathMatch = (window.location.pathname || "").match(/\/newbuilds\/([^/]+)\/(?:index\.html)?$/i);
    var title = readLeadData(link, "object-title");
    var price = readLeadData(link, "object-price");
    var objectId = readLeadData(link, "object-id") || (idMatch ? idMatch[1] : "");
    var objectType = readLeadData(link, "object-type");
    var objectContainer = link.closest(".property-card, [data-object-id], [data-object-title]");
    var container;
    var titleNode;
    var priceNode;

    // Generic consultation cards must not inherit a nearby heading or price.
    // Expand the search area only when the CTA carries an object signal.
    if (!objectId && !objectType && !title && !price && !objectContainer && !newbuildPathMatch) {
      return {
        object_id: "",
        object_type: "",
        object_title: "",
        object_price: "",
        object_url: "",
        project_code: "",
        project_name: "",
        builder: "",
        project_area: "",
        project_url: "",
        source_transition: "",
        price_version: ""
      };
    }

    container = objectContainer || (idMatch ? link.closest("article, .card") : null) || link;

    if (!objectId && newbuildPathMatch) {
      objectId = "newbuild_" + newbuildPathMatch[1];
      objectType = objectType || "newbuild";
    }

    if (!title && container.querySelector) {
      titleNode = container.querySelector("h1, h2, h3, .property-card__title, .card-title");
      title = titleNode ? normalizeLeadText(titleNode.textContent) : "";
    }

    if (newbuildPathMatch) {
      titleNode = document.querySelector(".nbd-hero h1");
      title = titleNode ? normalizeLeadText(titleNode.textContent) : title;
    }

    if (!price && container.querySelector) {
      priceNode = container.querySelector(".nbd-price, .property-card__price, .card-price, [class*='price']");
      price = priceNode ? normalizeLeadText(priceNode.textContent) : "";
    }

    if (!price && newbuildPathMatch) {
      priceNode = document.querySelector(".nbd-price");
      price = priceNode ? normalizeLeadText(priceNode.textContent) : "";
    }

    if (!objectType && objectId) {
      objectType = objectId.indexOf("house_") === 0 ? "house" :
        objectId.indexOf("land_") === 0 ? "land" :
        objectId.indexOf("nb_") === 0 ? "newbuild" :
        "apartment";
    }

    return {
      object_id: objectId,
      object_type: objectType,
      object_title: title,
      object_price: price,
      object_url: readLeadData(link, "object-url"),
      project_code: readLeadData(link, "project-code") || objectId,
      project_name: readLeadData(link, "project-name") || title,
      builder: readLeadData(link, "builder"),
      project_area: readLeadData(link, "project-area"),
      project_url: readLeadData(link, "project-url") || readLeadData(link, "object-url"),
      source_transition: readLeadData(link, "source-transition"),
      price_version: readLeadData(link, "price-version")
    };
  }

  function initLeadCtaTracking() {
    document.addEventListener("click", function (event) {
      var link = event.target && event.target.closest ? event.target.closest("a[href]") : null;
      var href;
      var object;
      var context;

      if (!link) return;

      href = link.getAttribute("href") || "";
      if (href.indexOf("#lead-form-section") === -1) return;

      object = findObjectContext(link);
      context = {
        lead_type: inferLeadType(link),
        source_cta: inferSourceCta(link, object.object_id),
        object_id: object.object_id,
        object_type: object.object_type,
        object_title: object.object_title,
        object_price: object.object_price,
        object_url: object.object_url || (object.object_id || object.object_title ? window.location.href : ""),
        project_code: object.project_code,
        project_name: object.project_name,
        builder: object.builder,
        project_area: object.project_area,
        project_url: object.project_url || (object.project_code ? window.location.href : ""),
        source_transition: object.source_transition,
        price_version: object.price_version,
        captured_at: Date.now()
      };

      try {
        window.sessionStorage.setItem(LEAD_CONTEXT_KEY, JSON.stringify(context));
      } catch (error) {
        // Attribution is helpful but must not block navigation.
      }
    });
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

    return fetchJson("output/newbuilds/newbuilds-v2-merged.json")
      .then(function (items) {
        if (!Array.isArray(items) || !items.length) {
          return loadLegacyNewbuildsData();
        }
        return items.map(normalizeMergedNewbuild);
      })
      .catch(function () {
        return loadLegacyNewbuildsData();
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
          qsa("[data-filter]", filtersContainer).forEach(function (input) {
            input.addEventListener("input", runFilter);
            if (input.tagName === "SELECT") input.addEventListener("change", runFilter);
          });

          var resetButton = qs("#resetFilters", filtersContainer);
          if (resetButton) {
            resetButton.addEventListener("click", function () {
              qsa("[data-filter]", filtersContainer).forEach(function (input) {
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
    var categoryHref = {
      apartments: "apartments.html",
      houses: "houses.html",
      lands: "lands.html",
      newbuilds: "newbuilds.html"
    }[item && item.categoryName ? String(item.categoryName).toLowerCase() : ""] || "index.html#contact";
    var priceText = formatPrice(item && item.meta ? item.meta.price : null, item && item.meta ? item.meta.priceType : "") || "Цена по запросу";
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
      '<div class="hot-offer-price property-card__price">' + escapeHtml(formatPrice(item.meta.price, item.meta.priceType)) + '</div>',
      charsHtml,
      '<div class="property-card__actions">',
      '<a class="btn property-card__cta" href="' + categoryHref + '">Подробнее</a>',
      '<a class="btn property-card__phone" href="tel:+79536091122">Позвонить</a>',
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
    var priceText = item.price || "Цена по запросу";
    var price = escapeHtml(priceText);
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
    var detailsHref = {
      apartment: "apartments.html",
      house: "houses.html",
      land: "lands.html",
      newbuild: "newbuilds.html"
    }[String(item && item.type || "").toLowerCase()] || "index.html#contact";

    return [
      '<article class="new-object-card property-card">',
      renderPropertyGallery(galleryImages, title),
      '<div class="new-object-card__content property-card__body">',
      '<span class="new-object-card__type property-card__meta">' + typeLabel + '</span>',
      '<h3 class="property-card__title">' + title + '</h3>',
      '<div class="new-object-card__price property-card__price">' + price + '</div>',
      charsHtml,
      '<div class="property-card__actions">',
      '<a class="btn property-card__cta" href="' + detailsHref + '">Подробнее</a>',
      '<a class="btn property-card__phone" href="tel:+79536091122">Позвонить</a>',
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

  function createThemeButton(modifier) {
    var button = document.createElement("button");
    button.type = "button";
    button.className = "theme-toggle theme-toggle--" + modifier;
    button.innerHTML = '<span class="theme-toggle__icon" aria-hidden="true"></span><span class="theme-toggle__label">Тёмная тема</span>';
    button.addEventListener("click", function () {
      var nextTheme = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
      try {
        window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
      } catch (_error) {
        // The theme still works for the current page if storage is unavailable.
      }
      applyTheme(nextTheme);
    });
    return button;
  }

  function initThemeToggle() {
    var hasThemeStyles = qsa('link[rel="stylesheet"]').some(function (link) {
      return /(?:^|\/)visual-premium\.css(?:\?|$)/.test(link.href);
    });
    if (!hasThemeStyles) return;

    var headerInner = qs(".header-inner");
    if (headerInner && !qs(".theme-toggle--header", headerInner)) {
      var menuToggle = qs(".mobile-menu-toggle", headerInner);
      headerInner.insertBefore(createThemeButton("header"), menuToggle || null);
    }

    var drawerActions = qs(".mobile-drawer__actions");
    if (drawerActions && !qs(".theme-toggle--drawer", drawerActions)) {
      drawerActions.insertBefore(createThemeButton("drawer"), drawerActions.firstChild);
    }

    applyTheme(getStoredTheme());
  }

  document.addEventListener("DOMContentLoaded", function () {
    withLeadConfig(initContactChannels);
    initThemeToggle();
    initGlobalInteractions();
    initLeadCtaTracking();
    initMetrikaClickGoals();
    initActiveNav();
    initMobileDrawer();
    bindPropertyGalleryControls();
    initNewObjects();

    var listingType = document.body && document.body.dataset ? document.body.dataset.listing : null;
    if (CATALOG_TYPES.indexOf(listingType) !== -1) {
      if (document.body.dataset.catalogVersion !== "3") {
        initListingNewObjects(listingType);
        initCatalogPage(listingType);
      }
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


