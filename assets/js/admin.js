/**
 * Административный модуль для журнала заявок
 * Работает без сервера через localStorage
 */

(function () {
  "use strict";

  // Конфигурация
  var ADMIN_PASSWORD = "Alieva8807";
  var STORAGE_KEY = "domian_leads";
  var AUTH_KEY = "domian_admin_auth";

  // Экспорт функций
  window.domianAdmin = {
    saveLead: saveLead,
    getLeads: getLeads,
    clearLeads: clearLeads,
    checkAuth: checkAuth,
    login: login,
    logout: logout
  };

  /**
   * Сохранение заявки в localStorage
   * @param {Object} lead - Данные заявки
   */
  function saveLead(lead) {
    var leads = getLeads();
    
    var newLead = {
      id: Date.now().toString(),
      date: getCurrentDateTime(),
      name: lead.name || "",
      phone: lead.phone || "",
      email: lead.email || "",
      service: lead.service || "",
      source: lead.source || "website"
    };
    
    leads.unshift(newLead); // Добавляем в начало (новые сверху)
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(leads));
      return true;
    } catch (e) {
      console.error("Ошибка сохранения заявки:", e);
      return false;
    }
  }

  /**
   * Получение всех заявок
   * @returns {Array} Массив заявок
   */
  function getLeads() {
    try {
      var data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error("Ошибка чтения заявок:", e);
      return [];
    }
  }

  /**
   * Очистка всех заявок
   * @returns {boolean} Успешность операции
   */
  function clearLeads() {
    try {
      localStorage.removeItem(STORAGE_KEY);
      return true;
    } catch (e) {
      console.error("Ошибка очистки заявок:", e);
      return false;
    }
  }

  /**
   * Получение текущей даты и времени
   * @returns {string} Форматированная дата
   */
  function getCurrentDateTime() {
    var now = new Date();
    var year = now.getFullYear();
    var month = String(now.getMonth() + 1).padStart(2, "0");
    var day = String(now.getDate()).padStart(2, "0");
    var hours = String(now.getHours()).padStart(2, "0");
    var minutes = String(now.getMinutes()).padStart(2, "0");
    
    return year + "-" + month + "-" + day + " " + hours + ":" + minutes;
  }

  /**
   * Проверка авторизации
   * @returns {boolean} Статус авторизации
   */
  function checkAuth() {
    try {
      var auth = sessionStorage.getItem(AUTH_KEY);
      return auth === "true";
    } catch (e) {
      return false;
    }
  }

  /**
   * Вход в админку
   * @param {string} password - Введенный пароль
   * @returns {boolean} Успешность входа
   */
  function login(password) {
    if (password === ADMIN_PASSWORD) {
      try {
        sessionStorage.setItem(AUTH_KEY, "true");
        return true;
      } catch (e) {
        return false;
      }
    }
    return false;
  }

  /**
   * Выход из админки
   */
  function logout() {
    try {
      sessionStorage.removeItem(AUTH_KEY);
    } catch (e) {
      console.error("Ошибка выхода:", e);
    }
  }

  /**
   * Инициализация модального окна входа
   */
  function initAdminModal() {
    var btn = document.getElementById("admin-access-btn");
    if (!btn) return;

    btn.addEventListener("click", function (e) {
      e.preventDefault();
      showLoginModal();
    });

    // Проверяем, есть ли уже модальное окно в DOM
    if (document.getElementById("admin-login-modal")) {
      return;
    }

    // Создаем модальное окно
    var modalHtml = 
      '<div id="admin-login-modal" class="admin-modal-overlay" style="display:none;">' +
        '<div class="admin-modal">' +
          '<div class="admin-modal-header">' +
            '<h3>Вход для администраторов</h3>' +
            '<button type="button" class="admin-modal-close" aria-label="Закрыть">&times;</button>' +
          '</div>' +
          '<div class="admin-modal-body">' +
            '<div class="admin-form-group">' +
              '<label for="admin-password">Пароль:</label>' +
              '<input type="password" id="admin-password" class="admin-input" placeholder="Введите пароль" autocomplete="off">' +
            '</div>' +
            '<div id="admin-error-msg" class="admin-error" style="display:none;">Неверный пароль</div>' +
          '</div>' +
          '<div class="admin-modal-footer">' +
            '<button type="button" id="admin-cancel-btn" class="admin-btn admin-btn-secondary">Отмена</button>' +
            '<button type="button" id="admin-login-btn" class="admin-btn admin-btn-primary">Войти</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    // Добавляем стили
    var styleHtml = 
      '<style>' +
        '.admin-modal-overlay {' +
          'position: fixed;' +
          'top: 0;' +
          'left: 0;' +
          'width: 100%;' +
          'height: 100%;' +
          'background: rgba(0, 0, 0, 0.6);' +
          'z-index: 10000;' +
          'display: flex;' +
          'align-items: center;' +
          'justify-content: center;' +
        '}' +
        '.admin-modal {' +
          'background: #fff;' +
          'border-radius: 8px;' +
          'width: 90%;' +
          'max-width: 400px;' +
          'box-shadow: 0 10px 40px rgba(0,0,0,0.3);' +
          'overflow: hidden;' +
        '}' +
        '.admin-modal-header {' +
          'display: flex;' +
          'justify-content: space-between;' +
          'align-items: center;' +
          'padding: 20px;' +
          'border-bottom: 1px solid #eee;' +
        '}' +
        '.admin-modal-header h3 {' +
          'margin: 0;' +
          'font-size: 18px;' +
          'color: #333;' +
        '}' +
        '.admin-modal-close {' +
          'background: none;' +
          'border: none;' +
          'font-size: 24px;' +
          'cursor: pointer;' +
          'color: #999;' +
          'padding: 0;' +
          'line-height: 1;' +
        '}' +
        '.admin-modal-close:hover {' +
          'color: #333;' +
        '}' +
        '.admin-modal-body {' +
          'padding: 20px;' +
        '}' +
        '.admin-form-group {' +
          'margin-bottom: 15px;' +
        '}' +
        '.admin-form-group label {' +
          'display: block;' +
          'margin-bottom: 8px;' +
          'font-weight: 500;' +
          'color: #333;' +
        '}' +
        '.admin-input {' +
          'width: 100%;' +
          'padding: 12px;' +
          'border: 1px solid #ddd;' +
          'border-radius: 4px;' +
          'font-size: 16px;' +
          'box-sizing: border-box;' +
        '}' +
        '.admin-input:focus {' +
          'outline: none;' +
          'border-color: #007bff;' +
        '}' +
        '.admin-error {' +
          'color: #dc3545;' +
          'font-size: 14px;' +
          'padding: 10px;' +
          'background: #f8d7da;' +
          'border-radius: 4px;' +
          'text-align: center;' +
        '}' +
        '.admin-modal-footer {' +
          'display: flex;' +
          'justify-content: flex-end;' +
          'gap: 10px;' +
          'padding: 20px;' +
          'border-top: 1px solid #eee;' +
        '}' +
        '.admin-btn {' +
          'padding: 10px 20px;' +
          'border: none;' +
          'border-radius: 4px;' +
          'font-size: 14px;' +
          'cursor: pointer;' +
          'transition: background 0.2s;' +
        '}' +
        '.admin-btn-primary {' +
          'background: #007bff;' +
          'color: #fff;' +
        '}' +
        '.admin-btn-primary:hover {' +
          'background: #0056b3;' +
        '}' +
        '.admin-btn-secondary {' +
          'background: #6c757d;' +
          'color: #fff;' +
        '}' +
        '.admin-btn-secondary:hover {' +
          'background: #545b62;' +
        '}' +
      '</style>';

    document.head.insertAdjacentHTML("beforeend", styleHtml);
    document.body.insertAdjacentHTML("beforeend", modalHtml);

    // Навешиваем обработчики
    var modal = document.getElementById("admin-login-modal");
    var closeBtn = modal.querySelector(".admin-modal-close");
    var cancelBtn = document.getElementById("admin-cancel-btn");
    var loginBtn = document.getElementById("admin-login-btn");
    var passwordInput = document.getElementById("admin-password");
    var errorMsg = document.getElementById("admin-error-msg");

    function hideModal() {
      modal.style.display = "none";
      passwordInput.value = "";
      errorMsg.style.display = "none";
    }

    function showModal() {
      modal.style.display = "flex";
      passwordInput.focus();
    }

    closeBtn.addEventListener("click", hideModal);
    cancelBtn.addEventListener("click", hideModal);

    loginBtn.addEventListener("click", function () {
      var password = passwordInput.value;
      
      if (window.domianAdmin.login(password)) {
        hideModal();
        window.location.href = "admin.html";
      } else {
        errorMsg.style.display = "block";
        passwordInput.value = "";
        passwordInput.focus();
      }
    });

    passwordInput.addEventListener("keypress", function (e) {
      if (e.key === "Enter") {
        loginBtn.click();
      }
    });

    // Закрытие по клику вне модального окна
    modal.addEventListener("click", function (e) {
      if (e.target === modal) {
        hideModal();
      }
    });
  }

  // Инициализация при загрузке DOM
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAdminModal);
  } else {
    initAdminModal();
  }
})();
