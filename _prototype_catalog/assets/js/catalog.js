(function () {
  "use strict";

  var store = window.DomianStore;
  var elements = {};

  function readElements() {
    elements.grid = document.querySelector("[data-catalog-grid]");
    elements.count = document.querySelector("[data-results-count]");
    elements.empty = document.querySelector("[data-empty-state]");
    elements.resetButtons = document.querySelectorAll("[data-reset-filters]");
    elements.inputs = {
      q: document.querySelector("#filter-search"),
      type: document.querySelector("#filter-type"),
      minPrice: document.querySelector("#filter-price-min"),
      maxPrice: document.querySelector("#filter-price-max"),
      rooms: document.querySelector("#filter-rooms"),
      areaMin: document.querySelector("#filter-area-min"),
      district: document.querySelector("#filter-district"),
      status: document.querySelector("#filter-status"),
      sort: document.querySelector("#filter-sort")
    };
  }

  function getFilters() {
    return {
      q: elements.inputs.q.value.trim().toLowerCase(),
      type: elements.inputs.type.value,
      minPrice: store.parseNumber(elements.inputs.minPrice.value),
      maxPrice: store.parseNumber(elements.inputs.maxPrice.value),
      rooms: store.parseNumber(elements.inputs.rooms.value),
      areaMin: store.parseNumber(elements.inputs.areaMin.value),
      district: elements.inputs.district.value.trim().toLowerCase(),
      status: elements.inputs.status.value,
      sort: elements.inputs.sort.value
    };
  }

  function applyUrlFilters() {
    var params = new URLSearchParams(window.location.search);
    if (params.has("q")) elements.inputs.q.value = params.get("q") || "";
    if (params.has("type")) elements.inputs.type.value = params.get("type") || "";
    if (params.has("status")) elements.inputs.status.value = params.get("status") || "";
  }

  function updateUrl(filters) {
    var params = new URLSearchParams();
    if (filters.q) params.set("q", filters.q);
    if (filters.type) params.set("type", filters.type);
    if (filters.status) params.set("status", filters.status);
    var next = params.toString() ? "catalog.html?" + params.toString() : "catalog.html";
    window.history.replaceState({}, "", next);
  }

  function matchesObject(object, filters) {
    var searchable = [
      object.title,
      object.city,
      object.district,
      object.address,
      object.description,
      object.agentName
    ].join(" ").toLowerCase();

    if (filters.q && searchable.indexOf(filters.q) === -1) return false;
    if (filters.type && object.type !== filters.type) return false;
    if (filters.status && object.status !== filters.status) return false;
    if (filters.minPrice && store.parseNumber(object.price) < filters.minPrice) return false;
    if (filters.maxPrice && store.parseNumber(object.price) > filters.maxPrice) return false;
    if (filters.rooms && Number(object.rooms || 0) !== filters.rooms) return false;
    if (filters.areaMin && store.parseNumber(object.area) < filters.areaMin) return false;

    if (filters.district) {
      var place = [object.city, object.district, object.address].join(" ").toLowerCase();
      if (place.indexOf(filters.district) === -1) return false;
    }

    return true;
  }

  function sortObjects(objects, sort) {
    var sorted = objects.slice();
    sorted.sort(function (a, b) {
      if (sort === "price-asc") {
        return (store.parseNumber(a.price) || Infinity) - (store.parseNumber(b.price) || Infinity);
      }
      if (sort === "price-desc") {
        return (store.parseNumber(b.price) || 0) - (store.parseNumber(a.price) || 0);
      }
      if (sort === "area-desc") {
        return (store.parseNumber(b.area) || 0) - (store.parseNumber(a.area) || 0);
      }
      return String(b.createdAt || "").localeCompare(String(a.createdAt || ""));
    });
    return sorted;
  }

  function render() {
    var filters = getFilters();
    var objects = sortObjects(store.getAllObjects().filter(function (object) {
      return matchesObject(object, filters);
    }), filters.sort);

    elements.count.textContent = objects.length + " " + getObjectsWord(objects.length);
    elements.grid.innerHTML = objects.map(function (object) {
      return store.buildObjectCard(object);
    }).join("");

    var hasResults = objects.length > 0;
    elements.grid.hidden = !hasResults;
    elements.empty.hidden = hasResults;
    updateUrl(filters);
  }

  function getObjectsWord(count) {
    var last = count % 10;
    var lastTwo = count % 100;
    if (last === 1 && lastTwo !== 11) return "объект";
    if (last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14)) return "объекта";
    return "объектов";
  }

  function resetFilters() {
    elements.inputs.q.value = "";
    elements.inputs.type.value = "";
    elements.inputs.minPrice.value = "";
    elements.inputs.maxPrice.value = "";
    elements.inputs.rooms.value = "";
    elements.inputs.areaMin.value = "";
    elements.inputs.district.value = "";
    elements.inputs.status.value = "";
    elements.inputs.sort.value = "new";
    render();
  }

  function bindEvents() {
    Object.keys(elements.inputs).forEach(function (key) {
      elements.inputs[key].addEventListener("input", render);
      elements.inputs[key].addEventListener("change", render);
    });

    elements.resetButtons.forEach(function (button) {
      button.addEventListener("click", resetFilters);
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    readElements();
    applyUrlFilters();
    bindEvents();
    render();
  });
})();
