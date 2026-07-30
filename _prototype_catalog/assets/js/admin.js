(function () {
  "use strict";

  var store = window.DomianStore;
  var currentObjectId = "";
  var photos = [];
  var form;
  var notice;

  var typeLabels = {
    apartment: "Квартира",
    house: "Дом",
    land: "Участок",
    commercial: "Коммерция",
    newbuilding: "Новостройка"
  };

  var statusLabels = {
    published: "Актуально",
    reserved: "Бронь",
    sold: "Продано"
  };

  function field(name) {
    return form.elements[name];
  }

  function createId() {
    return "user-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7);
  }

  function readForm(isDraft) {
    if (!currentObjectId) currentObjectId = createId();
    var type = field("type").value;
    var status = field("status").value || "published";
    var title = field("title").value.trim();
    var city = field("city").value.trim();
    var district = field("district").value.trim();
    var address = field("address").value.trim();
    var price = store.parseNumber(field("price").value);
    var area = store.parseNumber(field("area").value);
    var rooms = store.parseNumber(field("rooms").value);
    var floor = store.parseNumber(field("floor").value);
    var floorsTotal = store.parseNumber(field("floorsTotal").value);
    var landArea = store.parseNumber(field("landArea").value);
    var description = field("description").value.trim();
    var agentName = field("agentName").value.trim();
    var agentPhone = field("agentPhone").value.trim();

    return {
      id: currentObjectId,
      type: type,
      typeLabel: typeLabels[type] || "Объект",
      status: status,
      statusLabel: statusLabels[status] || "Актуально",
      title: title,
      price: price,
      city: city,
      district: district,
      address: address,
      rooms: rooms,
      area: area,
      floor: floor,
      floorsTotal: floorsTotal,
      landArea: landArea,
      condition: field("condition").value.trim(),
      description: description || "Описание можно добавить позже. Для демо карточка уже готова к публикации.",
      photos: photos.length ? photos.slice(0, 5) : ["assets/images/objects/apt-001-1.jpg"],
      agentName: agentName || "Павел Орлов",
      agentPhone: agentPhone || "+7 999 000-00-00",
      createdAt: new Date().toISOString().slice(0, 10),
      isDraft: Boolean(isDraft)
    };
  }

  function validate(object, isDraft) {
    var errors = [];
    if (!object.type) errors.push("Выберите тип объекта.");
    if (!object.title) errors.push("Добавьте заголовок.");
    if (!object.price && !isDraft) errors.push("Укажите цену. Цена без пробелов тоже подойдет.");
    if (!object.city && !isDraft) errors.push("Укажите город.");
    return errors;
  }

  function renderPreview() {
    var preview = document.querySelector("[data-admin-preview]");
    if (!preview) return;
    var object = readForm(false);
    object.title = object.title || "Название объекта появится здесь";
    object.city = object.city || "Город";
    object.district = object.district || "район";
    object.description = object.description || "Описание можно написать простыми словами: ремонт, инфраструктура, документы и кому подойдет объект.";
    preview.innerHTML = store.buildObjectCard(object);
    renderPhotoPreview();
    toggleFields();
  }

  function renderPhotoPreview() {
    var root = document.querySelector("[data-photo-preview]");
    if (!root) return;
    if (!photos.length) {
      root.innerHTML = '<p class="photo-empty">Фото можно добавить позже. Для публикации будет использована демо-фотография.</p>';
      return;
    }
    root.innerHTML = photos.map(function (photo, index) {
      return '<button class="photo-chip" type="button" data-remove-photo="' + index + '"><img src="' + store.escapeHtml(photo) + '" alt=""><span>Убрать</span></button>';
    }).join("");
    root.querySelectorAll("[data-remove-photo]").forEach(function (button) {
      button.addEventListener("click", function () {
        photos.splice(Number(button.getAttribute("data-remove-photo")), 1);
        renderPreview();
      });
    });
  }

  function toggleFields() {
    var type = field("type").value;
    var roomGroup = document.querySelector("[data-room-fields]");
    var landGroup = document.querySelector("[data-land-fields]");
    if (roomGroup) roomGroup.hidden = type === "land" || type === "commercial";
    if (landGroup) landGroup.hidden = !(type === "house" || type === "land");
  }

  function showNotice(message, object, isPublished) {
    notice.hidden = false;
    notice.innerHTML = [
      '<strong>' + store.escapeHtml(message) + '</strong>',
      isPublished ? '<a class="btn btn-primary btn-small" href="object.html?id=' + encodeURIComponent(object.id) + '">Открыть объект</a>' : "",
      isPublished ? '<a class="btn btn-soft btn-small" href="catalog.html?q=' + encodeURIComponent(object.title) + '">Найти в каталоге</a>' : ""
    ].filter(Boolean).join("");
  }

  function save(isDraft) {
    var object = readForm(isDraft);
    var errors = validate(object, isDraft);
    if (errors.length) {
      showNotice(errors.join(" "), object, false);
      return;
    }

    store.saveObject(object);
    showNotice(isDraft ? "Черновик сохранен. Он не виден в каталоге." : "Объект опубликован и уже доступен в каталоге.", object, !isDraft);
  }

  function clearForm() {
    form.reset();
    photos = [];
    currentObjectId = "";
    notice.hidden = true;
    renderPreview();
  }

  function readFiles(fileList) {
    var files = Array.prototype.slice.call(fileList).slice(0, 4);
    if (!files.length) return;

    Promise.all(files.map(function (file) {
      return new Promise(function (resolve, reject) {
        var reader = new FileReader();
        reader.onload = function () { resolve(reader.result); };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    })).then(function (items) {
      photos = photos.concat(items).slice(0, 5);
      renderPreview();
    }).catch(function () {
      showNotice("Не получилось прочитать фото. Можно вставить URL или выбрать демо-фото.", readForm(true), false);
    });
  }

  function addPhotoUrl() {
    var input = field("photoUrl");
    var value = input.value.trim();
    if (!value) return;
    photos.push(value);
    input.value = "";
    renderPreview();
  }

  function bindEvents() {
    form.addEventListener("input", renderPreview);
    form.addEventListener("change", renderPreview);

    field("photos").addEventListener("change", function (event) {
      readFiles(event.target.files);
    });

    document.querySelector("[data-add-photo-url]").addEventListener("click", addPhotoUrl);
    document.querySelector("[data-save-draft]").addEventListener("click", function () { save(true); });
    document.querySelector("[data-publish]").addEventListener("click", function () { save(false); });
    document.querySelector("[data-clear-form]").addEventListener("click", clearForm);

    document.querySelectorAll("[data-demo-photo]").forEach(function (button) {
      button.addEventListener("click", function () {
        photos.push(button.getAttribute("data-demo-photo"));
        photos = photos.slice(0, 5);
        renderPreview();
      });
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    form = document.querySelector("[data-admin-form]");
    notice = document.querySelector("[data-admin-notice]");
    bindEvents();
    renderPreview();
  });
})();
