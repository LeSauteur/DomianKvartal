/**
 * Обработчик отправки формы через Web3Forms
 * Работает без сервера, совместим с GitHub Pages
 */

(function () {
  "use strict";

  // Конфигурация Web3Forms
  var WEB3FORMS_ENDPOINT = "https://api.web3forms.com/submit";
  var ACCESS_KEY = "111acf56-7c06-44ff-b693-b777e053bc47";
  var REDIRECT_URL = "/thanks.html";
  var METRIKA_ID = 109303205;
  var UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];
  var UTM_STORAGE_PREFIX = "domian_utm_";
  var LEAD_CONTEXT_KEY = "domian_lead_context";
  var MORTGAGE_INTERACTION_KEY = "domian_mortgage_interacted";

  window.DOMIAN_METRIKA_ID = window.DOMIAN_METRIKA_ID || METRIKA_ID;

  function qs(selector, root) {
    return (root || document).querySelector(selector);
  }

  function qsa(selector, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(selector));
  }

  function safeReachGoal(goal) {
    try {
      if (typeof window.domianReachGoal === "function") {
        window.domianReachGoal(goal);
      } else if (typeof window.ym === "function") {
        window.ym(window.DOMIAN_METRIKA_ID || METRIKA_ID, "reachGoal", goal);
      }
    } catch (error) {
      // Ignore analytics errors.
    }
  }

  function safeStorageGet(storage, key) {
    try {
      return storage.getItem(key) || "";
    } catch (error) {
      return "";
    }
  }

  function safeStorageSet(storage, key, value) {
    try {
      storage.setItem(key, String(value || ""));
    } catch (error) {
      // Ignore storage failures.
    }
  }

  function ensureHiddenField(form, name) {
    var input = form.querySelector('input[name="' + name + '"]');
    if (!input) {
      input = document.createElement("input");
      input.type = "hidden";
      input.name = name;
      form.appendChild(input);
    }
    return input;
  }

  function setHiddenField(form, name, value) {
    ensureHiddenField(form, name).value = value == null ? "" : String(value);
  }

  function readUtmFromUrl() {
    var params = new URLSearchParams(window.location.search || "");
    var utm = {};

    UTM_KEYS.forEach(function (key) {
      var value = params.get(key);
      if (value) {
        utm[key] = value;
      }
    });

    return utm;
  }

  function readStoredUtm() {
    var utm = {};

    UTM_KEYS.forEach(function (key) {
      utm[key] = safeStorageGet(window.sessionStorage, UTM_STORAGE_PREFIX + key);
    });

    return utm;
  }

  function persistUtm(utm) {
    UTM_KEYS.forEach(function (key) {
      if (utm[key]) {
        safeStorageSet(window.sessionStorage, UTM_STORAGE_PREFIX + key, utm[key]);
      }
    });
  }

  function collectUtm() {
    var current = readUtmFromUrl();
    var stored = readStoredUtm();
    var merged = {};

    UTM_KEYS.forEach(function (key) {
      merged[key] = current[key] || stored[key] || "";
    });

    if (Object.keys(current).length) {
      persistUtm(current);
    }

    return merged;
  }

  function getStoredLeadContext() {
    return window.domianLeadContext && typeof window.domianLeadContext === "object" ? window.domianLeadContext : {};
  }

  function setStoredLeadContext(context) {
    if (!context || typeof context !== "object") return;
    window.domianLeadContext = context;
  }

  function normalizeValue(value) {
    if (value == null) return "";
    return String(value).replace(/\s+/g, " ").trim();
  }

  function readDataAttribute(element, name) {
    if (!element || !element.getAttribute) return "";
    return normalizeValue(element.getAttribute("data-" + name));
  }

  function readClosestDataAttribute(element, name) {
    var current = element;
    while (current && current !== document) {
      var value = readDataAttribute(current, name);
      if (value) return value;
      current = current.parentElement;
    }
    return "";
  }

  function extractLeadContext(element) {
    var context = {
      lead_type: "",
      source_cta: "",
      object_id: "",
      object_type: "",
      object_title: "",
      object_price: "",
      object_url: "",
      mortgage_price: "",
      mortgage_down_payment: "",
      mortgage_rate: "",
      mortgage_term: "",
      mortgage_monthly_payment: ""
    };

    if (!element) return context;

    context.lead_type = readClosestDataAttribute(element, "lead-type");
    context.source_cta = readClosestDataAttribute(element, "source-cta");
    context.object_id = readClosestDataAttribute(element, "object-id");
    context.object_type = readClosestDataAttribute(element, "object-type");
    context.object_title = readClosestDataAttribute(element, "object-title");
    context.object_price = readClosestDataAttribute(element, "object-price");
    context.object_url = readClosestDataAttribute(element, "object-url");
    context.mortgage_price = readClosestDataAttribute(element, "mortgage-price");
    context.mortgage_down_payment = readClosestDataAttribute(element, "mortgage-down-payment");
    context.mortgage_rate = readClosestDataAttribute(element, "mortgage-rate");
    context.mortgage_term = readClosestDataAttribute(element, "mortgage-term");
    context.mortgage_monthly_payment = readClosestDataAttribute(element, "mortgage-monthly-payment");

    return context;
  }

  function mergeLeadContext(form, submitter) {
    var context = {};
    var formContext = extractLeadContext(form);
    var submitterContext = extractLeadContext(submitter);
    var storedContext = window.domianLeadContext || getStoredLeadContext();

    function apply(source) {
      if (!source) return;
      Object.keys(source).forEach(function (key) {
        if (source[key]) {
          context[key] = source[key];
        }
      });
    }

    apply(storedContext);
    apply(formContext);
    apply(submitterContext);

    return context;
  }

  function mapObjectTypeToLeadType(objectType) {
    var type = normalizeValue(objectType).toLowerCase();

    if (type === "apartment" || type === "house" || type === "land") {
      return "buy";
    }

    if (type === "newbuild") {
      return "newbuild";
    }

    if (type === "commercial") {
      return "commercial";
    }

    if (type === "rent") {
      return "rent";
    }

    if (type === "construction") {
      return "construction";
    }

    if (type === "sell") {
      return "sell";
    }

    return "";
  }

  function getLeadType(form, submitter, context) {
    var submitterLeadType = readClosestDataAttribute(submitter, "lead-type");
    var contextLeadType = context && context.lead_type ? normalizeValue(context.lead_type) : "";
    var formLeadType = readClosestDataAttribute(form, "lead-type");
    var objectType = readClosestDataAttribute(submitter, "object-type") || readClosestDataAttribute(form, "object-type") || (context && context.object_type) || "";
    var sourceCta = readClosestDataAttribute(submitter, "source-cta") || (context && context.source_cta) || readClosestDataAttribute(form, "source-cta") || "";
    var mappedObjectType = mapObjectTypeToLeadType(objectType);

    if (submitterLeadType) return submitterLeadType;
    if (contextLeadType) return contextLeadType;
    if (formLeadType) return formLeadType;
    if (mappedObjectType) return mappedObjectType;
    if (sourceCta === "mortgage_calculator") return "mortgage";

    return "contact";
  }

  function getSourceCta(form, submitter, context) {
    var submitterSource = readClosestDataAttribute(submitter, "source-cta");
    var contextSource = context && context.source_cta ? normalizeValue(context.source_cta) : "";
    var formSource = readClosestDataAttribute(form, "source-cta");

    return submitterSource || contextSource || formSource || "contact_form";
  }

  function readMortgageValues() {
    var price = qs("#mg-price");
    var down = qs("#mg-down");
    var rate = qs("#mg-rate");
    var term = qs("#mg-term");
    var monthly = qs("#mg-monthly");

    function readText(el) {
      return el ? normalizeValue(el.value || el.textContent || "") : "";
    }

    return {
      mortgage_price: readText(price),
      mortgage_down_payment: readText(down),
      mortgage_rate: readText(rate),
      mortgage_term: readText(term),
      mortgage_monthly_payment: readText(monthly)
    };
  }

  function fillAttributionFields(form, submitter) {
    var context = mergeLeadContext(form, submitter);
    var utm = collectUtm();
    var leadType = getLeadType(form, submitter, context);
    var sourceCta = getSourceCta(form, submitter, context);
    var mortgageRelevant = leadType === "mortgage" || sourceCta === "mortgage_calculator" || window.domianMortgageInteracted === true;
    var mortgage = mortgageRelevant ? readMortgageValues() : {
      mortgage_price: "",
      mortgage_down_payment: "",
      mortgage_rate: "",
      mortgage_term: "",
      mortgage_monthly_payment: ""
    };
    var hiddenValues = {
      page_url: window.location.href,
      page_title: document.title,
      referrer: document.referrer || "",
      utm_source: utm.utm_source,
      utm_medium: utm.utm_medium,
      utm_campaign: utm.utm_campaign,
      utm_content: utm.utm_content,
      utm_term: utm.utm_term,
      lead_type: leadType,
      source_cta: sourceCta,
      object_id: context.object_id || "",
      object_type: context.object_type || "",
      object_title: context.object_title || "",
      object_price: context.object_price || "",
      object_url: context.object_url || "",
      mortgage_price: context.mortgage_price || mortgage.mortgage_price || "",
      mortgage_down_payment: context.mortgage_down_payment || mortgage.mortgage_down_payment || "",
      mortgage_rate: context.mortgage_rate || mortgage.mortgage_rate || "",
      mortgage_term: context.mortgage_term || mortgage.mortgage_term || "",
      mortgage_monthly_payment: context.mortgage_monthly_payment || mortgage.mortgage_monthly_payment || ""
    };

    Object.keys(hiddenValues).forEach(function (key) {
      setHiddenField(form, key, hiddenValues[key]);
    });

    return hiddenValues;
  }

  function saveLeadMirror(formData, hiddenValues) {
    if (!window.domianAdmin || typeof window.domianAdmin.saveLead !== "function") {
      return;
    }

    window.domianAdmin.saveLead({
      name: formData.get("name"),
      phone: formData.get("phone"),
      email: formData.get("email") || "",
      service: formData.get("service") || "",
      source: "website",
      page_url: hiddenValues.page_url || "",
      page_title: hiddenValues.page_title || "",
      referrer: hiddenValues.referrer || "",
      utm_source: hiddenValues.utm_source || "",
      utm_medium: hiddenValues.utm_medium || "",
      utm_campaign: hiddenValues.utm_campaign || "",
      utm_content: hiddenValues.utm_content || "",
      utm_term: hiddenValues.utm_term || "",
      lead_type: hiddenValues.lead_type || "",
      source_cta: hiddenValues.source_cta || "",
      object_id: hiddenValues.object_id || "",
      object_type: hiddenValues.object_type || "",
      object_title: hiddenValues.object_title || "",
      object_price: hiddenValues.object_price || "",
      object_url: hiddenValues.object_url || "",
      mortgage_price: hiddenValues.mortgage_price || "",
      mortgage_down_payment: hiddenValues.mortgage_down_payment || "",
      mortgage_rate: hiddenValues.mortgage_rate || "",
      mortgage_term: hiddenValues.mortgage_term || "",
      mortgage_monthly_payment: hiddenValues.mortgage_monthly_payment || ""
    });
  }

  function markLeadFormOpen(form) {
    if (!form || form.getAttribute("data-lead-open-fired") === "1") {
      return;
    }

    form.setAttribute("data-lead-open-fired", "1");
    safeReachGoal("lead_form_open");
  }

  function initLeadContextTracking() {
    document.addEventListener("click", function (event) {
      var trigger = event.target && event.target.closest ? event.target.closest("[data-lead-type], [data-source-cta], [data-object-type], [data-object-id], [data-object-title], [data-object-price], [data-object-url], [data-mortgage-price], [data-mortgage-down-payment], [data-mortgage-rate], [data-mortgage-term], [data-mortgage-monthly-payment]") : null;

      if (!trigger) return;
      if (trigger.closest && trigger.closest("#lead-form")) return;

      var context = extractLeadContext(trigger);
      if (context.lead_type || context.source_cta || context.object_id || context.object_type || context.object_title || context.object_price || context.object_url || context.mortgage_price || context.mortgage_down_payment || context.mortgage_rate || context.mortgage_term || context.mortgage_monthly_payment) {
        setStoredLeadContext(context);
      }

      if (context.source_cta === "mortgage_calculator") {
        safeReachGoal("mortgage_cta_click");
      }
    });
  }

  function initMortgageTracking() {
    var mortgageSection = qs("#mortgage");
    if (!mortgageSection) return;

    var used = false;

    function markUsed() {
      if (used) return;
      used = true;
      window.domianMortgageInteracted = true;
      try {
        window.sessionStorage.setItem(MORTGAGE_INTERACTION_KEY, "1");
      } catch (error) {
        // Ignore storage errors.
      }
      safeReachGoal("mortgage_calculator_used");
    }

    try {
      window.domianMortgageInteracted = window.sessionStorage.getItem(MORTGAGE_INTERACTION_KEY) === "1";
    } catch (error) {
      window.domianMortgageInteracted = false;
    }

    mortgageSection.addEventListener("focusin", markUsed);
    mortgageSection.addEventListener("input", markUsed);
    mortgageSection.addEventListener("change", markUsed);
  }

  /**
   * Показать toast уведомление
   */
  function showToast(message, isError) {
    var toast = document.createElement("div");
    toast.style.cssText = 
      "position:fixed;bottom:20px;left:50%;transform:translateX(-50%);" +
      "background:" + (isError ? "#dc3545" : "#28a745") + ";color:#fff;" +
      "padding:12px 24px;border-radius:6px;z-index:10001;font-size:14px;" +
      "box-shadow:0 4px 12px rgba(0,0,0,0.15);";
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(function () {
      toast.remove();
    }, 3000);
  }

  /**
   * Обработка отправки формы
   */
  function handleFormSubmit(form, submitter) {
    var submitBtn = form.querySelector('button[type="submit"]');
    var originalText = submitBtn ? submitBtn.textContent : "";
    var hiddenValues;
    var formData;

    // Блокировка кнопки
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Отправка...";
    }

    safeReachGoal("lead_form_submit_attempt");
    hiddenValues = fillAttributionFields(form, submitter);
    formData = new FormData(form);

    // Отправка данных через fetch
    fetch(WEB3FORMS_ENDPOINT, {
      method: "POST",
      body: formData
    })
    .then(function (response) {
      if (response.ok) {
        return response.json();
      }
      throw new Error("Ошибка сети");
    })
    .then(function (data) {
      if (data.success) {
        safeReachGoal("lead_form_success");
        safeReachGoal("form_success");

        // Сохранение в localStorage для журнала заявок
        saveLeadMirror(formData, hiddenValues);
        // Перенаправление на страницу спасибо
        window.location.href = REDIRECT_URL;
      } else {
        throw new Error(data.message || "Ошибка отправки");
      }
    })
    .catch(function (error) {
      console.error("Form submission error:", error);
      safeReachGoal("lead_form_error");
      safeReachGoal("form_error");
      showToast("Не удалось отправить заявку. Попробуйте позже.", true);
      // Разблокировка кнопки
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      }
    });
  }

  /**
   * Инициализация обработчиков форм
   */
  function initFormHandlers() {
    // Находим все формы с Web3Forms
    var forms = document.querySelectorAll('form[action="' + WEB3FORMS_ENDPOINT + '"]');

    initLeadContextTracking();
    initMortgageTracking();

    forms.forEach(function (form) {
      // Добавляем access_key если нет
      var accessKeyInput = form.querySelector('input[name="access_key"]');
      if (!accessKeyInput) {
        var hiddenInput = document.createElement("input");
        hiddenInput.type = "hidden";
        hiddenInput.name = "access_key";
        hiddenInput.value = ACCESS_KEY;
        form.insertBefore(hiddenInput, form.firstChild);
      }

      [
        "page_url",
        "page_title",
        "referrer",
        "utm_source",
        "utm_medium",
        "utm_campaign",
        "utm_content",
        "utm_term",
        "lead_type",
        "source_cta",
        "object_id",
        "object_type",
        "object_title",
        "object_price",
        "object_url",
        "mortgage_price",
        "mortgage_down_payment",
        "mortgage_rate",
        "mortgage_term",
        "mortgage_monthly_payment"
      ].forEach(function (fieldName) {
        ensureHiddenField(form, fieldName);
      });

      // Добавляем honeypot если нет
      var honeypotInput = form.querySelector('input[name="botcheck"]');
      if (!honeypotInput) {
        var honeypot = document.createElement("input");
        honeypot.type = "checkbox";
        honeypot.name = "botcheck";
        honeypot.style.display = "none";
        honeypot.setAttribute("aria-hidden", "true");
        form.appendChild(honeypot);
      }

      // Добавляем source если нет
      var sourceInput = form.querySelector('input[name="source"]');
      if (!sourceInput) {
        var sourceHidden = document.createElement("input");
        sourceHidden.type = "hidden";
        sourceHidden.name = "source";
        sourceHidden.value = "website";
        form.appendChild(sourceHidden);
      }

      form.addEventListener("focusin", function () {
        markLeadFormOpen(form);
      });

      form.addEventListener("input", function () {
        markLeadFormOpen(form);
      });

      form.addEventListener("click", function () {
        markLeadFormOpen(form);
      });

      // Навешиваем обработчик submit
      form.addEventListener("submit", function (e) {
        var submitter = e.submitter || document.activeElement || null;
        e.preventDefault();
        
        // Проверка honeypot (если бот заполнил)
        var botcheck = form.querySelector('input[name="botcheck"]');
        if (botcheck && botcheck.checked) {
          // Бот обнаружен, игнорируем отправку
          console.warn("Bot detected, form submission blocked");
          return;
        }

        // Валидация обязательных полей
        var requiredFields = form.querySelectorAll("[required]");
        var isValid = true;
        requiredFields.forEach(function (field) {
          if (!field.value.trim()) {
            isValid = false;
            field.classList.add("error");
          } else {
            field.classList.remove("error");
          }
        });

        if (!isValid) {
          safeReachGoal("lead_form_error");
          safeReachGoal("form_error");
          showToast("Заполните обязательные поля", true);
          return;
        }

        handleFormSubmit(form, submitter);
      });
    });
  }

  // Инициализация при загрузке DOM
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initFormHandlers);
  } else {
    initFormHandlers();
  }
})();
