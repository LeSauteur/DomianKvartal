/**
 * Надёжная отправка лид-формы через Web3Forms.
 * Работает на статическом хостинге и не считает браузерное хранилище CRM.
 */

(function () {
  "use strict";

  var CONFIG = window.DOMIAN_LEAD_CONFIG || {};
  var ENDPOINT = CONFIG.endpoint || "";
  var METRIKA_ID = CONFIG.metrikaId || window.DOMIAN_METRIKA_ID || 109303205;
  var REQUEST_TIMEOUT_MS = Number(CONFIG.requestTimeoutMs) || 12000;
  var LEAD_CONTEXT_KEY = "domian_lead_context";
  var THANKS_CATEGORY_KEY = "domian_thanks_category";
  var LEAD_CONTEXT_TTL_MS = 30 * 60 * 1000;
  var UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];
  var UTM_STORAGE_PREFIX = "domian_utm_";
  var OPTIONAL_CONTEXT_FIELDS = [
    "referrer",
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_content",
    "utm_term",
    "object_id",
    "object_type",
    "object_title",
    "object_price",
    "object_url",
    "project_code",
    "project_name",
    "builder",
    "project_area",
    "project_url",
    "source_transition",
    "price_version",
    "mortgage_price",
    "mortgage_down_payment",
    "mortgage_rate",
    "mortgage_term",
    "mortgage_monthly_payment",
    "replyto"
  ];

  window.DOMIAN_METRIKA_ID = window.DOMIAN_METRIKA_ID || METRIKA_ID;

  function normalizeValue(value) {
    return value == null ? "" : String(value).replace(/\s+/g, " ").trim();
  }

  function safeReachGoal(goal, params) {
    try {
      if (typeof window.domianReachGoal === "function") {
        window.domianReachGoal(goal, params || {});
      } else if (typeof window.ym === "function") {
        window.ym(window.DOMIAN_METRIKA_ID || METRIKA_ID, "reachGoal", goal, params || {});
      }
    } catch (error) {
      // Сбой аналитики не должен влиять на форму.
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
      storage.setItem(key, value);
    } catch (error) {
      // Атрибуция полезна, но не обязательна для отправки.
    }
  }

  function safeStorageRemove(storage, key) {
    try {
      storage.removeItem(key);
    } catch (error) {
      // Нечего восстанавливать.
    }
  }

  function normalizePhone(value) {
    var raw = normalizeValue(value);
    var digits = raw.replace(/\D/g, "");

    if (digits.length === 10) {
      return "+7" + digits;
    }

    if (digits.length === 11 && digits.charAt(0) === "8") {
      return "+7" + digits.slice(1);
    }

    if (digits.length === 11 && digits.charAt(0) === "7") {
      return "+" + digits;
    }

    if (raw.charAt(0) === "+" && digits.length >= 10 && digits.length <= 15) {
      return "+" + digits;
    }

    return "";
  }

  function isValidEmail(value) {
    var email = normalizeValue(value);
    return !email || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/u.test(email);
  }

  function ensureHiddenField(form, name) {
    var field = form.querySelector('input[type="hidden"][name="' + name + '"]');

    if (!field) {
      field = document.createElement("input");
      field.type = "hidden";
      field.name = name;
      form.appendChild(field);
    }

    return field;
  }

  function removeHiddenField(form, name) {
    Array.prototype.slice.call(
      form.querySelectorAll('input[type="hidden"][name="' + name + '"]')
    ).forEach(function (field) {
      field.remove();
    });
  }

  function setPayloadField(form, name, value, required) {
    var normalized = normalizeValue(value);

    if (!normalized && !required) {
      removeHiddenField(form, name);
      return;
    }

    ensureHiddenField(form, name).value = normalized;
  }

  function readUtmFromUrl() {
    var params = new URLSearchParams(window.location.search || "");
    var result = {};

    UTM_KEYS.forEach(function (key) {
      result[key] = normalizeValue(params.get(key));
    });

    return result;
  }

  function collectUtm() {
    var fromUrl = readUtmFromUrl();
    var result = {};

    UTM_KEYS.forEach(function (key) {
      var storageKey = UTM_STORAGE_PREFIX + key;
      var stored = safeStorageGet(window.sessionStorage, storageKey);
      result[key] = fromUrl[key] || stored || "";

      if (fromUrl[key]) {
        safeStorageSet(window.sessionStorage, storageKey, fromUrl[key]);
      }
    });

    return result;
  }

  function getLeadContext() {
    var raw = safeStorageGet(window.sessionStorage, LEAD_CONTEXT_KEY);
    var context;
    var capturedAt;

    if (!raw) return {};

    try {
      context = JSON.parse(raw);
    } catch (error) {
      safeStorageRemove(window.sessionStorage, LEAD_CONTEXT_KEY);
      return {};
    }

    if (!context || typeof context !== "object") {
      safeStorageRemove(window.sessionStorage, LEAD_CONTEXT_KEY);
      return {};
    }

    capturedAt = Number(context.captured_at);
    if (capturedAt && Date.now() - capturedAt > LEAD_CONTEXT_TTL_MS) {
      safeStorageRemove(window.sessionStorage, LEAD_CONTEXT_KEY);
      return {};
    }

    return context;
  }

  function clearLeadContext() {
    safeStorageRemove(window.sessionStorage, LEAD_CONTEXT_KEY);
    window.domianMortgageInteracted = false;
  }

  function saveThanksCategory(values) {
    var aliases = {
      apartment: "apartment",
      flat: "apartment",
      house: "house",
      construction: "house",
      land: "land",
      plot: "land",
      newbuild: "newbuild"
    };
    var objectType = normalizeValue(values.object_type).toLowerCase();
    var leadType = normalizeValue(values.lead_type).toLowerCase();
    var category = aliases[objectType] || aliases[leadType] || "";

    safeStorageRemove(window.sessionStorage, THANKS_CATEGORY_KEY);
    if (category) {
      safeStorageSet(window.sessionStorage, THANKS_CATEGORY_KEY, category);
    }
  }

  function readElementValue(selector) {
    var element = document.querySelector(selector);
    return element ? normalizeValue(element.value || element.textContent) : "";
  }

  function readFormContext(form, name) {
    var field = form.elements[name];
    var attribute = "data-" + name.replace(/_/g, "-");
    return normalizeValue(form.getAttribute(attribute)) || normalizeValue(field && field.value);
  }

  function readMortgageContext() {
    return {
      mortgage_price: readElementValue("#mg-price"),
      mortgage_down_payment: readElementValue("#mg-down"),
      mortgage_rate: readElementValue("#mg-rate"),
      mortgage_term: readElementValue("#mg-term"),
      mortgage_monthly_payment: readElementValue("#mg-monthly")
    };
  }

  function inferLeadType(form, context) {
    var service = form.elements.service ? normalizeValue(form.elements.service.value) : "";
    var sourceCta = normalizeValue(context.source_cta);

    if (context.lead_type) return normalizeValue(context.lead_type);
    if (sourceCta === "mortgage_calculator" || sourceCta === "mortgage_consultation") return "mortgage";
    if (service === "consultation") return "contact";
    return service || "contact";
  }

  function isMortgageRelevant(form, context, leadType) {
    var service = form.elements.service ? normalizeValue(form.elements.service.value) : "";
    return leadType === "mortgage" ||
      service === "mortgage" ||
      context.source_cta === "mortgage_calculator" ||
      context.source_cta === "mortgage_consultation" ||
      window.domianMortgageInteracted === true;
  }

  function fillPayloadFields(form) {
    var context = getLeadContext();
    var utm = collectUtm();
    var email = form.elements.email ? normalizeValue(form.elements.email.value) : "";
    var leadType = inferLeadType(form, context);
    var sourceCta = normalizeValue(context.source_cta) || normalizeValue(form.getAttribute("data-source-cta")) || "contact_form";
    var mortgage = isMortgageRelevant(form, context, leadType) ? readMortgageContext() : {};
    var values = {
      access_key: CONFIG.accessKey || "",
      subject: "Новая заявка с domian-161.ru: " + leadType,
      from_name: "Домиан Квартал — сайт",
      source: "website",
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
      object_id: context.object_id || readFormContext(form, "project_code") || "",
      object_type: context.object_type || readFormContext(form, "object_type") || "",
      object_title: context.object_title || readFormContext(form, "project_name") || "",
      object_price: context.object_price || readFormContext(form, "object_price") || "",
      object_url: context.object_url || readFormContext(form, "project_url") || "",
      project_code: context.project_code || context.object_id || readFormContext(form, "project_code") || "",
      project_name: context.project_name || context.object_title || readFormContext(form, "project_name") || "",
      builder: context.builder || readFormContext(form, "builder") || "",
      project_area: context.project_area || readFormContext(form, "project_area") || "",
      project_url: context.project_url || context.object_url || readFormContext(form, "project_url") || "",
      source_transition: context.source_transition || readFormContext(form, "source_transition") || "",
      price_version: context.price_version || readFormContext(form, "price_version") || "",
      mortgage_price: context.mortgage_price || mortgage.mortgage_price || "",
      mortgage_down_payment: context.mortgage_down_payment || mortgage.mortgage_down_payment || "",
      mortgage_rate: context.mortgage_rate || mortgage.mortgage_rate || "",
      mortgage_term: context.mortgage_term || mortgage.mortgage_term || "",
      mortgage_monthly_payment: context.mortgage_monthly_payment || mortgage.mortgage_monthly_payment || "",
      replyto: email
    };

    OPTIONAL_CONTEXT_FIELDS.forEach(function (name) {
      removeHiddenField(form, name);
    });

    setPayloadField(form, "access_key", values.access_key, true);
    setPayloadField(form, "subject", values.subject, true);
    setPayloadField(form, "from_name", values.from_name, true);
    setPayloadField(form, "source", values.source, true);
    setPayloadField(form, "page_url", values.page_url, true);
    setPayloadField(form, "page_title", values.page_title, true);
    setPayloadField(form, "lead_type", values.lead_type, true);
    setPayloadField(form, "source_cta", values.source_cta, true);

    OPTIONAL_CONTEXT_FIELDS.forEach(function (name) {
      setPayloadField(form, name, values[name], false);
    });

    return values;
  }

  function getFieldErrorId(form, field) {
    if (!field.id) {
      field.id = form.id + "-" + field.name;
    }
    return field.id + "-error";
  }

  function getFieldGroup(field) {
    return field.closest(".form-group, .form-consent") || field.parentElement;
  }

  function clearFieldError(form, field) {
    var errorId = getFieldErrorId(form, field);
    var errorNode = document.getElementById(errorId);
    var describedBy = normalizeValue(field.getAttribute("aria-describedby"))
      .split(" ")
      .filter(function (id) { return id && id !== errorId; })
      .join(" ");

    field.classList.remove("error");
    field.removeAttribute("aria-invalid");

    if (describedBy) {
      field.setAttribute("aria-describedby", describedBy);
    } else {
      field.removeAttribute("aria-describedby");
    }

    if (errorNode) errorNode.remove();
  }

  function setFieldError(form, field, message) {
    var group = getFieldGroup(field);
    var errorId = getFieldErrorId(form, field);
    var errorNode = document.getElementById(errorId);
    var describedBy = normalizeValue(field.getAttribute("aria-describedby"));

    if (!errorNode) {
      errorNode = document.createElement("p");
      errorNode.id = errorId;
      errorNode.className = "form-field-error";
      if (group) group.appendChild(errorNode);
    }

    errorNode.textContent = message;
    field.classList.add("error");
    field.setAttribute("aria-invalid", "true");

    if (describedBy.split(" ").indexOf(errorId) === -1) {
      field.setAttribute("aria-describedby", normalizeValue(describedBy + " " + errorId));
    }
  }

  function setFormStatus(form, message, kind) {
    var status = form.querySelector("[data-form-status]");

    if (!status) return;
    status.textContent = message || "";
    status.className = "form-status" + (kind ? " form-status--" + kind : "");
    status.hidden = !message;
  }

  function validateForm(form) {
    var nameField = form.elements.name;
    var phoneField = form.elements.phone;
    var emailField = form.elements.email;
    var serviceField = form.elements.service;
    var consentField = form.elements.privacy_consent;
    var firstInvalid = null;
    var normalizedPhone;

    [nameField, phoneField, emailField, serviceField, consentField].forEach(function (field) {
      if (field) clearFieldError(form, field);
    });

    setFormStatus(form, "", "");

    if (!nameField || normalizeValue(nameField.value).length < 2) {
      if (nameField) setFieldError(form, nameField, "Укажите имя — минимум 2 символа.");
      firstInvalid = firstInvalid || nameField;
    }

    normalizedPhone = phoneField ? normalizePhone(phoneField.value) : "";
    if (!normalizedPhone) {
      if (phoneField) {
        setFieldError(form, phoneField, "Укажите российский номер из 10 или 11 цифр, например +7 999 123-45-67.");
      }
      firstInvalid = firstInvalid || phoneField;
    }

    if (emailField && !isValidEmail(emailField.value)) {
      setFieldError(form, emailField, "Проверьте email или оставьте поле пустым.");
      firstInvalid = firstInvalid || emailField;
    }

    if (!serviceField || !normalizeValue(serviceField.value)) {
      if (serviceField) setFieldError(form, serviceField, "Выберите, с чем вам помочь.");
      firstInvalid = firstInvalid || serviceField;
    }

    if (!consentField || !consentField.checked) {
      if (consentField) setFieldError(form, consentField, "Подтвердите согласие на обработку персональных данных.");
      firstInvalid = firstInvalid || consentField;
    }

    if (firstInvalid) {
      setFormStatus(form, "Проверьте отмеченные поля.", "error");
      firstInvalid.focus();
      return false;
    }

    phoneField.value = normalizedPhone;
    if (emailField) emailField.value = normalizeValue(emailField.value);
    nameField.value = normalizeValue(nameField.value);
    return true;
  }

  function LeadSubmissionError(category) {
    this.name = "LeadSubmissionError";
    this.category = category;
    this.message = category;
  }

  LeadSubmissionError.prototype = Object.create(Error.prototype);
  LeadSubmissionError.prototype.constructor = LeadSubmissionError;

  function categoryForHttpStatus(status) {
    if (status === 400) return "http_400";
    if (status === 403) return "http_403";
    if (status === 429) return "http_429";
    if (status >= 500) return "http_500";
    return "http_error";
  }

  function parseProviderResponse(response) {
    return response.text().then(function (text) {
      var data = null;

      if (text) {
        try {
          data = JSON.parse(text);
        } catch (error) {
          if (response.ok) {
            throw new LeadSubmissionError("invalid_json");
          }
        }
      }

      if (!response.ok) {
        throw new LeadSubmissionError(categoryForHttpStatus(response.status));
      }

      if (!data || data.success !== true) {
        throw new LeadSubmissionError(data ? "success_false" : "invalid_json");
      }

      return data;
    });
  }

  function submitToProvider(formData) {
    var controller;
    var timeoutId;
    var didTimeout = false;

    if (window.navigator && window.navigator.onLine === false) {
      return Promise.reject(new LeadSubmissionError("offline"));
    }

    if (!window.AbortController) {
      return Promise.reject(new LeadSubmissionError("unsupported_browser"));
    }

    controller = new AbortController();
    timeoutId = window.setTimeout(function () {
      didTimeout = true;
      controller.abort();
    }, REQUEST_TIMEOUT_MS);

    return fetch(ENDPOINT, {
      method: "POST",
      body: formData,
      signal: controller.signal,
      headers: {
        Accept: "application/json"
      }
    })
      .then(parseProviderResponse)
      .catch(function (error) {
        if (didTimeout || (error && error.name === "AbortError")) {
          throw new LeadSubmissionError("timeout");
        }
        if (error && error.category) {
          throw error;
        }
        if (window.navigator && window.navigator.onLine === false) {
          throw new LeadSubmissionError("offline");
        }
        throw new LeadSubmissionError("network");
      })
      .then(function (data) {
        window.clearTimeout(timeoutId);
        return data;
      }, function (error) {
        window.clearTimeout(timeoutId);
        throw error;
      });
  }

  function messageForError(category) {
    var messages = {
      offline: "Сейчас нет подключения к интернету. Проверьте сеть и попробуйте ещё раз.",
      timeout: "Сервис не ответил вовремя. Данные сохранены в форме — попробуйте ещё раз.",
      http_400: "Сервис отклонил данные формы. Проверьте поля или свяжитесь с нами напрямую.",
      http_403: "Форма временно недоступна из-за настройки доступа. Свяжитесь с нами напрямую.",
      http_429: "Слишком много попыток за короткое время. Подождите и повторите или выберите другой канал.",
      http_500: "Сервис заявок временно недоступен. Попробуйте ещё раз или свяжитесь с нами напрямую.",
      http_error: "Сервис заявок вернул ошибку. Попробуйте ещё раз или свяжитесь с нами напрямую.",
      invalid_json: "Получен некорректный ответ сервиса. Заявка не подтверждена.",
      success_false: "Сервис не подтвердил отправку заявки. Данные сохранены в форме.",
      unsupported_browser: "Этот браузер не поддерживает безопасную отправку формы. Свяжитесь с нами напрямую.",
      config: "Форма ещё не настроена владельцем сайта. Свяжитесь с нами напрямую.",
      network: "Не удалось связаться с сервисом заявок. Проверьте сеть и попробуйте ещё раз."
    };

    return messages[category] || messages.network;
  }

  function getFallbackInterest(form) {
    var context = getLeadContext();
    var service = form.elements.service;
    var serviceLabel = "";

    if (context.object_title) {
      return normalizeValue(context.object_title).slice(0, 100);
    }

    if (service && service.selectedIndex >= 0) {
      serviceLabel = normalizeValue(service.options[service.selectedIndex].textContent);
    }

    return serviceLabel && service.value ? serviceLabel : "консультация по недвижимости";
  }

  function updateFallbackLinks(form, fallback) {
    var whatsapp = fallback.querySelector("[data-fallback-whatsapp]");
    var telegram = fallback.querySelector("[data-fallback-telegram]");
    var max = fallback.querySelector("[data-fallback-max]");
    var phone = fallback.querySelector("[data-fallback-phone]");
    var message = "Здравствуйте! Пытался оставить заявку на сайте Домиан Квартал, но форма не отправилась. Интересует: " + getFallbackInterest(form) + ".";

    if (whatsapp) {
      whatsapp.href = CONFIG.whatsappBaseUrl + "?text=" + encodeURIComponent(message);
    }

    if (telegram) {
      telegram.href = CONFIG.telegramUrl;
    }

    if (max) {
      max.href = CONFIG.maxDirectUrl;
    }

    if (phone) {
      phone.href = CONFIG.phoneHref;
      phone.textContent = "Позвонить " + CONFIG.phoneLabel;
    }
  }

  function createFallback(form) {
    var fallback = document.createElement("div");
    var retry = document.createElement("button");
    var whatsapp = document.createElement("a");
    var telegram = document.createElement("a");
    var max = document.createElement("a");
    var phone = document.createElement("a");
    var title = document.createElement("strong");
    var text = document.createElement("p");
    var actions = document.createElement("div");
    var channels = document.createElement("div");

    fallback.className = "form-fallback";
    fallback.setAttribute("data-form-fallback", "");
    fallback.setAttribute("role", "region");
    fallback.setAttribute("aria-label", "Другие способы связи");
    fallback.hidden = true;

    title.textContent = "Не удалось отправить заявку.";
    text.textContent = "Попробуйте ещё раз или свяжитесь с нами удобным способом. Введённые данные остались в полях.";

    actions.className = "form-fallback__actions";
    channels.className = "form-fallback__channels";
    channels.setAttribute("aria-label", "Мессенджеры");

    retry.type = "button";
    retry.className = "btn";
    retry.setAttribute("data-fallback-retry", "");
    retry.textContent = "Попробовать ещё раз";

    whatsapp.target = "_blank";
    whatsapp.rel = "noopener noreferrer";
    whatsapp.setAttribute("data-fallback-whatsapp", "");
    whatsapp.setAttribute("data-channel", "whatsapp");
    whatsapp.setAttribute("aria-label", "Написать Зухре в WhatsApp");
    whatsapp.setAttribute("title", "WhatsApp");
    whatsapp.textContent = "WhatsApp";

    telegram.target = "_blank";
    telegram.rel = "noopener noreferrer";
    telegram.setAttribute("data-fallback-telegram", "");
    telegram.setAttribute("data-channel", "telegram");
    telegram.setAttribute("aria-label", "Написать Зухре в Telegram");
    telegram.setAttribute("title", "Telegram");
    telegram.textContent = "Telegram";

    max.target = "_blank";
    max.rel = "noopener noreferrer";
    max.setAttribute("data-fallback-max", "");
    max.setAttribute("data-channel", "max");
    max.setAttribute("data-max-trigger", "");
    max.setAttribute("aria-label", "Написать Зухре в MAX");
    max.setAttribute("title", "MAX");
    max.textContent = "MAX";

    phone.className = "btn secondary";
    phone.setAttribute("data-fallback-phone", "");

    actions.appendChild(retry);
    actions.appendChild(phone);
    channels.appendChild(whatsapp);
    channels.appendChild(telegram);
    channels.appendChild(max);
    actions.appendChild(channels);
    fallback.appendChild(title);
    fallback.appendChild(text);
    fallback.appendChild(actions);
    form.appendChild(fallback);

    retry.addEventListener("click", function () {
      fallback.hidden = true;
      setFormStatus(form, "", "");
      if (typeof form.requestSubmit === "function") {
        form.requestSubmit();
      }
    });

    updateFallbackLinks(form, fallback);
    if (typeof window.domianEnhanceContactChannels === "function") {
      window.domianEnhanceContactChannels(fallback);
    }
    return fallback;
  }

  function setSubmitting(form, state, submitting) {
    state.isSubmitting = submitting;
    form.setAttribute("aria-busy", submitting ? "true" : "false");

    if (state.submitButton) {
      state.submitButton.disabled = submitting;
      state.submitButton.textContent = submitting ? "Отправка..." : state.originalButtonText;
    }
  }

  function handleSubmit(form, state, submitter) {
    var formData;

    if (state.isSubmitting) return;
    if (!validateForm(form)) return;

    if (!normalizeValue(CONFIG.accessKey) || !normalizeValue(ENDPOINT)) {
      setFormStatus(form, messageForError("config"), "error");
      state.fallback.hidden = false;
      updateFallbackLinks(form, state.fallback);
      safeReachGoal("lead_form_error", { error_category: "config" });
      return;
    }

    var payloadValues = fillPayloadFields(form, submitter);
    formData = new FormData(form);
    setSubmitting(form, state, true);
    state.fallback.hidden = true;
    setFormStatus(form, "Отправляем заявку…", "pending");
    safeReachGoal("lead_form_submit_attempt");

    submitToProvider(formData)
      .then(function () {
        safeReachGoal("lead_form_success");
        if (payloadValues.lead_type === "construction") {
          safeReachGoal("construction_lead_success");
        }
        saveThanksCategory(payloadValues);
        clearLeadContext();
        setFormStatus(form, "Заявка принята сервисом. Перенаправляем…", "success");
        window.location.assign(CONFIG.redirectUrl || "/thanks.html");
      })
      .catch(function (error) {
        var category = error && error.category ? error.category : "network";
        setSubmitting(form, state, false);
        setFormStatus(form, messageForError(category), "error");
        updateFallbackLinks(form, state.fallback);
        state.fallback.hidden = false;
        safeReachGoal("lead_form_error", { error_category: category });
      });
  }

  function markFormOpen(form) {
    if (form.getAttribute("data-lead-open-fired") === "1") return;
    form.setAttribute("data-lead-open-fired", "1");
    safeReachGoal("lead_form_open");
  }

  function observeFormView(form) {
    var target = form.closest("#lead-form-section") || form;

    function fire() {
      if (form.getAttribute("data-lead-view-fired") === "1") return;
      form.setAttribute("data-lead-view-fired", "1");
      safeReachGoal("lead_form_view");
    }

    if (!window.IntersectionObserver) {
      fire();
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          fire();
          observer.disconnect();
        }
      });
    }, { threshold: 0.25 });

    observer.observe(target);
  }

  function focusFormFromAnchor(form, force) {
    var observer;
    var maxTimer;
    var target;

    if (!force && window.location.hash !== "#lead-form-section") return;

    function focusAndScroll() {
      var firstField = form.querySelector("input:not([type='hidden']):not([type='checkbox']), select, textarea");
      target.scrollIntoView({ block: "start", behavior: "auto" });
      if (firstField) firstField.focus({ preventScroll: true });
    }

    function stopWatching() {
      if (observer) observer.disconnect();
      window.clearTimeout(maxTimer);
      window.removeEventListener("wheel", stopWatching);
      window.removeEventListener("touchstart", stopWatching);
      document.removeEventListener("pointerdown", stopOnOutsidePointer);
    }

    function stopOnOutsidePointer(event) {
      if (!form.contains(event.target)) stopWatching();
    }

    function keepAnchorStable() {
      focusAndScroll();
    }

    target = form.closest("#lead-form-section") || form;
    focusAndScroll();

    if (window.ResizeObserver && document.body) {
      observer = new ResizeObserver(keepAnchorStable);
      observer.observe(document.body);
      maxTimer = window.setTimeout(stopWatching, 15000);
      window.addEventListener("wheel", stopWatching, { passive: true });
      window.addEventListener("touchstart", stopWatching, { passive: true });
      document.addEventListener("pointerdown", stopOnOutsidePointer);
    } else {
      window.setTimeout(focusAndScroll, 1200);
    }
  }

  function initForm(form) {
    var submitButton = form.querySelector('button[type="submit"], input[type="submit"]');
    var state = {
      isSubmitting: false,
      submitButton: submitButton,
      originalButtonText: submitButton ? submitButton.textContent : "",
      fallback: null
    };

    form.setAttribute("novalidate", "novalidate");
    if (ENDPOINT) form.action = ENDPOINT;
    state.fallback = form.querySelector("[data-form-fallback]") || createFallback(form);

    observeFormView(form);
    focusFormFromAnchor(form);

    window.addEventListener("hashchange", function () {
      focusFormFromAnchor(form);
    });

    document.addEventListener("click", function (event) {
      var link = event.target && event.target.closest ? event.target.closest("a[href]") : null;
      var targetUrl;

      if (!link) return;

      try {
        targetUrl = new URL(link.href, window.location.href);
      } catch (_error) {
        return;
      }

      if (
        targetUrl.origin === window.location.origin &&
        targetUrl.pathname === window.location.pathname &&
        targetUrl.hash === "#lead-form-section"
      ) {
        window.setTimeout(function () {
          if (window.location.hash !== "#lead-form-section" && window.history && window.history.pushState) {
            window.history.pushState(null, "", "#lead-form-section");
          }
          focusFormFromAnchor(form, true);
        }, 0);
      }
    });

    form.addEventListener("focusin", function () {
      markFormOpen(form);
    });

    form.addEventListener("input", function (event) {
      markFormOpen(form);
      if (event.target && event.target.name) {
        clearFieldError(form, event.target);
      }
    });

    form.addEventListener("change", function (event) {
      if (event.target && event.target.name) {
        clearFieldError(form, event.target);
      }
    });

    form.addEventListener("submit", function (event) {
      event.preventDefault();

      if (form.elements.botcheck && form.elements.botcheck.checked) {
        return;
      }

      handleSubmit(form, state, event.submitter || document.activeElement || null);
    });
  }

  function initFormHandlers() {
    var forms = document.querySelectorAll("form[data-lead-form]");

    Array.prototype.forEach.call(forms, initForm);
  }

  window.domianLeadForm = Object.freeze({
    normalizePhone: normalizePhone,
    isValidEmail: isValidEmail,
    categoryForHttpStatus: categoryForHttpStatus
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initFormHandlers);
  } else {
    initFormHandlers();
  }
})();
