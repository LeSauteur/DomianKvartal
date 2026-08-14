(function () {
  "use strict";

  var METRIKA_ID = window.DOMIAN_METRIKA_ID || 109303205;

  function goal(name, params) {
    try {
      if (typeof window.domianReachGoal === "function") {
        window.domianReachGoal(name, params || {});
      } else if (!window.DOMIAN_ANALYTICS_DISABLED && typeof window.ym === "function") {
        window.ym(METRIKA_ID, "reachGoal", name, params || {});
      }
    } catch (error) {
      // Analytics must never interrupt catalogue interactions.
    }
  }

  function parseRange(value) {
    if (!value) return null;
    var parts = value.split("-").map(Number);
    return parts.length === 2 && parts.every(Number.isFinite) ? parts : null;
  }

  function numberFrom(card, name) {
    var value = card.getAttribute("data-" + name);
    return value === null || value === "" ? null : Number(value);
  }

  function matchesRange(value, range) {
    return value !== null && value >= range[0] && value <= range[1];
  }

  function initFilters() {
    var form = document.querySelector("[data-project-filters]");
    var grid = document.querySelector("[data-project-grid]");
    if (!form || !grid) return;

    var cards = Array.prototype.slice.call(grid.querySelectorAll("[data-project-card]"));
    var count = document.querySelector("[data-project-count]");
    var empty = document.querySelector("[data-project-empty]");

    function applyFilters(event) {
      var values = new FormData(form);
      var builder = String(values.get("builder") || "");
      var areaRange = parseRange(String(values.get("area") || ""));
      var floors = String(values.get("floors") || "");
      var bedrooms = String(values.get("bedrooms") || "");
      var material = String(values.get("material") || "");
      var priceRange = parseRange(String(values.get("price") || ""));
      var projectType = String(values.get("projectType") || "");
      var visible = 0;

      cards.forEach(function (card) {
        var show = true;
        var area = numberFrom(card, "area");
        var price = numberFrom(card, "price");
        var cardFloors = card.getAttribute("data-floors") || "";
        var cardBedrooms = card.getAttribute("data-bedrooms") || "";
        var materials = (card.getAttribute("data-materials") || "").split(/\s+/);

        if (builder && card.getAttribute("data-builder") !== builder) show = false;
        if (areaRange && !matchesRange(area, areaRange)) show = false;
        if (floors && cardFloors !== floors) show = false;
        if (bedrooms && cardBedrooms !== bedrooms) show = false;
        if (material && materials.indexOf(material) === -1) show = false;
        if (priceRange && !matchesRange(price, priceRange)) show = false;
        if (projectType && card.getAttribute("data-project-type") !== projectType) show = false;

        card.hidden = !show;
        if (show) visible += 1;
      });

      if (count) count.textContent = String(visible);
      if (empty) empty.hidden = visible !== 0;

      if (event && event.target && event.target.name === "builder") {
        goal("construction_builder_filter", { builder: builder || "all" });
      }
    }

    form.addEventListener("change", applyFilters);
    form.addEventListener("reset", function () {
      window.setTimeout(applyFilters, 0);
    });
    applyFilters();
  }

  function updateSelectedProject(link) {
    var form = document.querySelector("form[data-lead-form]");
    if (!form) return;

    var mapping = {
      project_code: "projectCode",
      project_name: "projectName",
      builder: "builder",
      project_area: "projectArea",
      project_url: "projectUrl",
      source_transition: "sourceTransition",
      price_version: "priceVersion"
    };

    Object.keys(mapping).forEach(function (fieldName) {
      var dataValue = link.dataset[mapping[fieldName]] || "";
      var field = form.elements[fieldName];
      if (dataValue) {
        form.setAttribute("data-" + fieldName.replace(/_/g, "-"), dataValue);
        if (field) field.value = dataValue;
      }
    });

    var desiredArea = form.elements.desired_area;
    if (desiredArea && link.dataset.projectArea) desiredArea.value = link.dataset.projectArea;

    var selected = form.querySelector("[data-selected-project]");
    if (selected && link.dataset.projectName) {
      selected.textContent = "Выбран проект: " + link.dataset.projectName;
      selected.hidden = false;
    }
  }

  function initProjectActions() {
    document.addEventListener("click", function (event) {
      var quote = event.target.closest("[data-project-quote]");
      var open = event.target.closest("[data-project-open]");
      var generalQuote = event.target.closest('a[href*="#lead-form-section"]');

      if (quote) {
        updateSelectedProject(quote);
        goal("construction_quote_click", {
          project_code: quote.dataset.projectCode || "",
          builder: quote.dataset.builder || "",
          source_transition: quote.dataset.sourceTransition || ""
        });
      } else if (generalQuote) {
        goal("construction_quote_click", {
          builder: generalQuote.dataset.builder || "",
          source_transition: generalQuote.dataset.sourceTransition || "general"
        });
      }

      if (open) {
        var card = open.closest("[data-project-card]");
        goal("construction_project_open", {
          builder: card ? card.getAttribute("data-builder") || "" : "",
          project_url: open.getAttribute("href") || ""
        });
      }
    });
  }

  function initCardViews() {
    var cards = Array.prototype.slice.call(document.querySelectorAll("[data-project-card]"));
    if (!cards.length || !("IntersectionObserver" in window)) return;

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting || entry.target.hidden) return;
        var card = entry.target;
        var title = card.querySelector("h3");
        goal("construction_project_card_view", {
          project_name: title ? title.textContent.trim() : "",
          builder: card.getAttribute("data-builder") || ""
        });
        observer.unobserve(card);
      });
    }, { threshold: 0.55 });

    cards.forEach(function (card) {
      observer.observe(card);
    });
  }

  function initDetailTracking() {
    var page = document.querySelector("[data-project-detail]");
    if (!page) return;
    goal("construction_project_page_open", {
      project_id: page.getAttribute("data-project-id") || "",
      builder: page.getAttribute("data-builder") || ""
    });
  }

  initFilters();
  initProjectActions();
  initCardViews();
  initDetailTracking();
})();
