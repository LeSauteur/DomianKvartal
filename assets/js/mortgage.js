(function () {
"use strict";

function qs(sel, root) {
    return (root || document).querySelector(sel);
}

function formatNumber(n) {
    return String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

function formatCurrency(n) {
    return formatNumber(n) + " ₽";
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

function parseNumber(value) {
    var clean = String(value || "").replace(/\s+/g, "").replace(",", ".");
    var num = parseFloat(clean);
    return isFinite(num) && num >= 0 ? num : 0;
}

function updateInputValue(input, value, isCurrency) {
    if (!input) return;
    input.value = isCurrency ? formatNumber(value) : String(value);
}

function updatePayment(text) {
    var el = qs("#mg-monthly");
    if (el) el.textContent = text;
}

function updateLoan(text) {
    var el = qs("#mg-loan");
    if (el) el.textContent = text;
}

function updateOverpay(text) {
    var el = qs("#mg-overpay");
    if (el) el.textContent = text;
}

function updateTotal(text) {
    var el = qs("#mg-total");
    if (el) el.textContent = text;
}

function calculate() {
    var price = parseNumber(qs("#mg-price").value);
    var down = parseNumber(qs("#mg-down").value);
    var years = parseNumber(qs("#mg-term").value);
    var rate = parseNumber(qs("#mg-rate").value);
    
    if (price <= 0 || years <= 0 || rate < 0) {
        updatePayment("—");
        updateLoan("—");
        updateOverpay("—");
        updateTotal("—");
        return;
    }
    
    if (down > price) {
        down = price;
        updateInputValue(qs("#mg-down"), down, true);
    }
    
    var monthly = calculateMonthlyPayment(price, down, years, rate);
    var loan = price - down;
    var n = Math.round(years * 12);
    var total = monthly * n;
    var overpay = total - loan;
    
    updatePayment(formatCurrency(monthly));
    updateLoan(formatCurrency(loan));
    updateOverpay(formatCurrency(overpay));
    updateTotal(formatCurrency(total));
}

function bindInput(id, isCurrency) {
    var input = qs(id);
    if (!input) return;
    
    input.addEventListener("input", function () {
        calculate();
    });
    
    input.addEventListener("blur", function () {
        var value = parseNumber(input.value);
        if (isCurrency && value > 0) {
            updateInputValue(input, value, true);
        }
    });
}

function initMortgage() {
    if (!qs("#mortgage")) return;
    
    bindInput("#mg-price", true);
    bindInput("#mg-down", true);
    bindInput("#mg-term", false);
    bindInput("#mg-rate", false);
    
    calculate();
}

window.domianMortgage = { init: initMortgage, calculate: calculate };

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initMortgage);
} else {
    initMortgage();
}

})();
