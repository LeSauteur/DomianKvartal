(function () {
  "use strict";

  var MORTGAGE_RATE = 16;
  var MORTGAGE_YEARS = 20;
  var DOWN_PAYMENT_PERCENT = 0.2;

  function formatNumber(n) {
    return String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  }

  function calculateMonthlyPayment(price, down, years, rate) {
    var loan = Math.max(0, Number(price) - Number(down));
    var n = Math.max(0, Math.round(Number(years) * 12));
    var r = Math.max(0, Number(rate)) / 100 / 12;
    if (loan <= 0 || n <= 0) return 0;
    if (r < 0) return loan / n;
    var pow = Math.pow(1 + r, n);
    return loan * (r * pow) / (pow - 1);
  }

  function calculateMonthlyForCard(price) {
    if (!price || price <= 0) return null;
    var down = price * DOWN_PAYMENT_PERCENT;
    var monthly = calculateMonthlyPayment(price, down, MORTGAGE_YEARS, MORTGAGE_RATE);
    return Math.round(monthly);
  }

  function formatMonthlyPayment(price) {
    var monthly = calculateMonthlyForCard(price);
    if (!monthly || monthly <= 0) return null;
    return "≈ " + formatNumber(monthly) + " ₽ / месяц";
  }

  window.domianCatalogMortgage = {
    calculate: calculateMonthlyForCard,
    format: formatMonthlyPayment
  };
})();
