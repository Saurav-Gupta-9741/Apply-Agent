// The practice form's own behaviour: it checks the required fields the way a real career site does, names each
// missing one, and on success shows the thank-you message (nothing is sent anywhere).
(function () {
  "use strict";
  var form = document.getElementById("application-form");
  var box = document.getElementById("form-errors");
  if (!form || !box) return;

  function labelOf(el) {
    var field = el.closest(".field");
    var label = field && field.querySelector("label");
    var text = (label ? label.textContent : el.name || "This field") || "";
    return text.replace(/\*/g, "").replace(/\s+/g, " ").trim();
  }

  function clearErrors() {
    form.querySelectorAll(".field-error").forEach(function (n) { n.remove(); });
    form.querySelectorAll("[aria-invalid]").forEach(function (n) { n.removeAttribute("aria-invalid"); });
    box.replaceChildren();
    box.style.display = "none";
  }

  function missing() {
    var out = [];
    var seenRadio = {};
    form.querySelectorAll("[required]").forEach(function (el) {
      if (el.type === "radio") {
        if (seenRadio[el.name]) return;
        seenRadio[el.name] = true;
        if (!form.querySelector("input[name='" + el.name + "']:checked")) out.push(el);
        return;
      }
      if (el.type === "checkbox") { if (!el.checked) out.push(el); return; }
      if (el.type === "file") { if (!el.files || !el.files.length) out.push(el); return; }
      if (!String(el.value || "").trim()) out.push(el);
    });
    return out;
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    clearErrors();
    var bad = missing();
    if (bad.length) {
      var title = document.createElement("strong");
      title.textContent = "Please complete " + bad.length + " required field" + (bad.length === 1 ? "" : "s") + ":";
      var list = document.createElement("ul");
      bad.forEach(function (el) {
        var name = el.type === "checkbox" ? "Consent" : labelOf(el);
        var li = document.createElement("li");
        li.textContent = name + " is required";
        list.append(li);
        el.setAttribute("aria-invalid", "true");
        var msg = document.createElement("div");
        msg.className = "field-error";
        msg.textContent = name + " is required";
        (el.closest(".field") || el.parentElement).append(msg);
      });
      box.append(title, list);
      box.style.display = "block";
      return;
    }
    form.style.display = "none";
    document.getElementById("success-message").style.display = "block";
  });
})();
