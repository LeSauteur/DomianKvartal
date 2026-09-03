(function () {
  "use strict";
  var toggle = document.querySelector("[data-unified-header] .mobile-menu-toggle");
  var drawer = document.querySelector("[data-unified-drawer]");
  var panel = drawer && drawer.querySelector(".mobile-drawer__panel");
  var close = drawer && drawer.querySelector(".mobile-drawer__close");
  var previousFocus = null;
  var focusable = "a[href], button:not([disabled]), [tabindex]:not([tabindex='-1'])";
  var themeStorageKey = "domian-color-theme";

  function updateThemeButtons(dark) {
    document.querySelectorAll("[data-unified-theme-toggle]").forEach(function (item) {
      item.setAttribute("aria-pressed", String(dark));
      item.setAttribute("aria-label", dark ? "Включить светлую тему" : "Включить тёмную тему");
      item.setAttribute("title", dark ? "Светлая тема" : "Тёмная тема");
    });
  }

  function applyTheme(dark, persist) {
    if (dark) document.documentElement.setAttribute("data-theme", "dark");
    else document.documentElement.removeAttribute("data-theme");
    if (persist) {
      try { window.localStorage.setItem(themeStorageKey, dark ? "dark" : "light"); } catch (_error) {}
    }
    updateThemeButtons(dark);
  }

  var initialDark = document.documentElement.getAttribute("data-theme") === "dark";
  try { initialDark = window.localStorage.getItem(themeStorageKey) === "dark"; } catch (_error) {}
  applyTheme(initialDark, false);

  function closeDrawer() {
    if (!drawer || !drawer.classList.contains("is-open")) return;
    drawer.classList.remove("is-open");
    drawer.setAttribute("aria-hidden", "true");
    drawer.inert = true;
    document.body.classList.remove("drawer-open");
    if (toggle) toggle.setAttribute("aria-expanded", "false");
    if (previousFocus && previousFocus.focus) previousFocus.focus();
  }

  function openDrawer() {
    if (!drawer || !toggle) return;
    previousFocus = document.activeElement;
    drawer.inert = false;
    drawer.classList.add("is-open");
    drawer.setAttribute("aria-hidden", "false");
    toggle.setAttribute("aria-expanded", "true");
    document.body.classList.add("drawer-open");
    window.setTimeout(function () { (close || panel).focus(); }, 0);
  }

  if (toggle && drawer) {
    toggle.addEventListener("click", function () { drawer.classList.contains("is-open") ? closeDrawer() : openDrawer(); });
    if (close) close.addEventListener("click", closeDrawer);
    drawer.addEventListener("click", function (event) { if (event.target === drawer) closeDrawer(); });
    drawer.querySelectorAll("a").forEach(function (link) { link.addEventListener("click", closeDrawer); });
    document.addEventListener("keydown", function (event) {
      if (!drawer.classList.contains("is-open")) return;
      if (event.key === "Escape") { event.preventDefault(); closeDrawer(); return; }
      if (event.key !== "Tab") return;
      var items = Array.prototype.slice.call(panel.querySelectorAll(focusable)).filter(function (item) { return !item.disabled; });
      if (!items.length) return;
      var first = items[0], last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    });
  }

  document.querySelectorAll("[data-unified-dropdown]").forEach(function (dropdown) {
    var button = dropdown.querySelector("button");
    var submenu = dropdown.querySelector(".unified-header__submenu");
    function setOpen(open) { dropdown.classList.toggle("is-open", open); button.setAttribute("aria-expanded", String(open)); if (submenu) submenu.hidden = !open; }
    button.addEventListener("click", function () { setOpen(!dropdown.classList.contains("is-open")); });
    dropdown.addEventListener("focusout", function () { window.setTimeout(function () { if (!dropdown.contains(document.activeElement)) setOpen(false); }, 0); });
    document.addEventListener("keydown", function (event) { if (event.key === "Escape" && dropdown.classList.contains("is-open")) { setOpen(false); button.focus(); } });
    document.addEventListener("click", function (event) { if (!dropdown.contains(event.target)) setOpen(false); });
  });

  document.querySelectorAll("[data-unified-theme-toggle]").forEach(function (button) {
    button.addEventListener("click", function () {
      var dark = document.documentElement.getAttribute("data-theme") !== "dark";
      applyTheme(dark, true);
    });
  });
}());
