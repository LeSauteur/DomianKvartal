(function () {
  "use strict";

  var toastEl = null;
  var toastTimer = null;

  function toast(message) {
    if (!message) return;

    // Создаём элемент при первом вызове
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.className = "toast";
      toastEl.setAttribute("role", "alert");
      toastEl.setAttribute("aria-live", "polite");
      document.body.appendChild(toastEl);
    }

    // Сбрасываем предыдущий таймер если есть
    if (toastTimer) {
      clearTimeout(toastTimer);
    }

    // Устанавливаем сообщение и показываем
    toastEl.textContent = String(message);
    toastEl.classList.add("is-on");

    // Скрываем через 1.7 секунды
    toastTimer = setTimeout(function () {
      toastEl.classList.remove("is-on");
    }, 1700);
  }

  // Экспорт в глобальную область
  window.domianToast = toast;
})();
