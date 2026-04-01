/**
 * Обработчик отправки формы через Web3Forms
 * Работает без сервера, совместим с GitHub Pages
 */

(function () {
  "use strict";

  // Конфигурация Web3Forms
  var WEB3FORMS_ENDPOINT = "https://api.web3forms.com/submit";
  var ACCESS_KEY = "ff9427fc-65c9-4fb8-b4b7-cc5c28f092f0";
  var REDIRECT_URL = "/thanks.html";

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
  function handleFormSubmit(form) {
    var submitBtn = form.querySelector('button[type="submit"]');
    var originalText = submitBtn ? submitBtn.textContent : "";
    var formData = new FormData(form);

    // Блокировка кнопки
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Отправка...";
    }

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
        // Сохранение в localStorage для журнала заявок
        if (window.domianAdmin && typeof window.domianAdmin.saveLead === "function") {
          window.domianAdmin.saveLead({
            name: formData.get("name"),
            phone: formData.get("phone"),
            email: formData.get("email") || "",
            service: formData.get("service") || "",
            source: "website"
          });
        }
        // Перенаправление на страницу спасибо
        window.location.href = REDIRECT_URL;
      } else {
        throw new Error(data.message || "Ошибка отправки");
      }
    })
    .catch(function (error) {
      console.error("Form submission error:", error);
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

      // Навешиваем обработчик submit
      form.addEventListener("submit", function (e) {
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
          showToast("Заполните обязательные поля", true);
          return;
        }

        handleFormSubmit(form);
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
