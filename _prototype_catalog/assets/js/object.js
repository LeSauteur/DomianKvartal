(function () {
  "use strict";

  var store = window.DomianStore;

  function getCurrentId() {
    return new URLSearchParams(window.location.search).get("id");
  }

  function renderNotFound() {
    var root = document.querySelector("[data-object-page]");
    root.innerHTML = [
      '<section class="empty-state empty-state--page">',
      '  <p class="section-label">Карточка объекта</p>',
      '  <h1>Объект не найден</h1>',
      '  <p>Возможно, он был удален из localStorage или ссылка скопирована с ошибкой.</p>',
      '  <a class="btn btn-primary" href="catalog.html">Вернуться в каталог</a>',
      '</section>'
    ].join("");
  }

  function renderGallery(object) {
    var photos = object.photos && object.photos.length ? object.photos : [store.FALLBACK_PHOTO];
    return [
      '<div class="object-gallery">',
      '  <img class="object-gallery__main" data-gallery-main src="' + store.escapeHtml(photos[0]) + '" alt="' + store.escapeHtml(object.title) + '" onerror="this.src=\'' + store.FALLBACK_PHOTO + '\'">',
      '  <div class="object-gallery__thumbs">',
      photos.map(function (photo, index) {
        return '<button class="' + (index === 0 ? "is-active" : "") + '" type="button" data-gallery-photo="' + store.escapeHtml(photo) + '"><img src="' + store.escapeHtml(photo) + '" alt="" onerror="this.src=\'' + store.FALLBACK_PHOTO + '\'"></button>';
      }).join(""),
      '  </div>',
      '</div>'
    ].join("");
  }

  function characteristic(label, value) {
    if (value === null || value === undefined || value === "") return "";
    return [
      '<div class="feature-row">',
      '  <span>' + store.escapeHtml(label) + '</span>',
      '  <strong>' + store.escapeHtml(value) + '</strong>',
      '</div>'
    ].join("");
  }

  function renderObject(object) {
    var root = document.querySelector("[data-object-page]");
    var phone = String(object.agentPhone || "").replace(/\s/g, "");
    var whatsapp = store.normalizePhoneForWhatsApp(object.agentPhone);
    var similar = store.getAllObjects().filter(function (item) {
      return item.id !== object.id && (item.type === object.type || item.district === object.district);
    }).slice(0, 4);

    root.innerHTML = [
      '<section class="object-hero">',
      renderGallery(object),
      '  <aside class="object-summary">',
      '    <div class="object-summary__badges">',
      '      <span class="badge badge-type">' + store.escapeHtml(object.typeLabel) + '</span>',
      '      <span class="badge badge-status ' + store.getStatusClass(object.status) + '">' + store.escapeHtml(object.statusLabel) + '</span>',
      '    </div>',
      '    <p class="object-summary__price">' + store.formatPrice(object.price) + '</p>',
      '    <h1>' + store.escapeHtml(object.title) + '</h1>',
      '    <p class="object-summary__address">' + store.escapeHtml([object.city, object.district, object.address].filter(Boolean).join(", ")) + '</p>',
      '    <div class="object-summary__actions">',
      '      <a class="btn btn-primary" href="tel:' + store.escapeHtml(phone) + '">Позвонить</a>',
      '      <a class="btn btn-whatsapp" href="' + (whatsapp ? "https://wa.me/" + whatsapp : "#") + '" target="_blank" rel="noopener">Написать в WhatsApp</a>',
      '      <button class="btn btn-soft" type="button" data-request-button>Оставить заявку</button>',
      '    </div>',
      '    <p class="request-note" data-request-note hidden>Заявка в прототипе не отправляется, но в production здесь можно подключить форму или CRM.</p>',
      '  </aside>',
      '</section>',
      '<section class="object-section object-layout">',
      '  <div>',
      '    <p class="section-label">Описание</p>',
      '    <h2>Что важно знать</h2>',
      '    <p class="object-description">' + store.escapeHtml(object.description) + '</p>',
      '  </div>',
      '  <div class="feature-panel">',
      '    <p class="section-label">Характеристики</p>',
      characteristic("Тип", object.typeLabel),
      characteristic("Цена", store.formatPrice(object.price)),
      characteristic("Площадь", object.area ? store.formatArea(object.area) : ""),
      characteristic("Комнаты", object.rooms ? object.rooms : ""),
      characteristic("Этаж", object.floor ? object.floor + " из " + (object.floorsTotal || "—") : ""),
      characteristic("Этажность", object.floorsTotal),
      characteristic("Участок", object.landArea ? store.formatLandArea(object.landArea) : ""),
      characteristic("Город", object.city),
      characteristic("Район", object.district),
      characteristic("Адрес", object.address),
      characteristic("Состояние", object.condition),
      '  </div>',
      '</section>',
      '<section class="agent-strip">',
      '  <div>',
      '    <p class="section-label">Агент</p>',
      '    <h2>' + store.escapeHtml(object.agentName || "Агент") + '</h2>',
      '    <p>' + store.escapeHtml(object.agentPhone || "") + '</p>',
      '  </div>',
      '  <a class="btn btn-primary" href="tel:' + store.escapeHtml(phone) + '">Связаться</a>',
      '</section>',
      '<section class="object-section">',
      '  <div class="section-heading">',
      '    <p class="section-label">Еще варианты</p>',
      '    <h2>Похожие объекты</h2>',
      '  </div>',
      '  <div class="objects-grid objects-grid--compact">' + similar.map(function (item) { return store.buildObjectCard(item, { compact: true }); }).join("") + '</div>',
      '</section>'
    ].join("");

    bindGallery();
    bindRequest();
  }

  function bindGallery() {
    var main = document.querySelector("[data-gallery-main]");
    document.querySelectorAll("[data-gallery-photo]").forEach(function (button) {
      button.addEventListener("click", function () {
        main.src = button.getAttribute("data-gallery-photo");
        document.querySelectorAll("[data-gallery-photo]").forEach(function (item) {
          item.classList.toggle("is-active", item === button);
        });
      });
    });
  }

  function bindRequest() {
    var button = document.querySelector("[data-request-button]");
    var note = document.querySelector("[data-request-note]");
    if (!button || !note) return;
    button.addEventListener("click", function () {
      note.hidden = false;
      note.textContent = "Заявка показана как демо-сценарий: клиент нажал кнопку, дальше можно подключить Web3Forms, CRM или звонок менеджера.";
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    var object = store.getObjectById(getCurrentId());
    if (!object || object.isDraft) {
      renderNotFound();
      return;
    }
    renderObject(object);
  });
})();
