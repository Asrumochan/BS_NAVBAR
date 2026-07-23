(function () {
  function setYear() {
    var yearEl = document.getElementById("currentYear");
    if (yearEl) {
      yearEl.textContent = String(new Date().getFullYear());
    }
  }

  function showToast(message, tone) {
    var toast = document.getElementById("toast");
    if (!toast) {
      return;
    }

    toast.textContent = message;
    toast.style.borderLeftColor = tone === "error" ? "#d64545" : "#0c7c59";
    toast.classList.add("show");

    window.setTimeout(function () {
      toast.classList.remove("show");
    }, 2600);
  }

  function applyTheme(theme) {
    document.body.classList.toggle("theme-dark", theme === "dark");
    var btn = document.getElementById("themeToggle");
    if (btn) {
      btn.textContent = theme === "dark" ? "Light" : "Dark";
    }
  }

  function bindThemeToggle() {
    var key = "mutants_theme";
    var savedTheme = localStorage.getItem(key) || "light";
    applyTheme(savedTheme);

    var themeBtn = document.getElementById("themeToggle");
    if (!themeBtn) {
      return;
    }

    themeBtn.addEventListener("click", function () {
      var dark = !document.body.classList.contains("theme-dark");
      var next = dark ? "dark" : "light";
      localStorage.setItem(key, next);
      applyTheme(next);
      showToast("Theme switched to " + next + " mode.");
    });
  }

  function highlightActiveMenu() {
    var path = location.pathname.split("/").pop() || "index.html";
    var links = document.querySelectorAll("[data-nav]");
    links.forEach(function (link) {
      var target = link.getAttribute("href");
      link.classList.toggle("active", target === path);
    });
  }

  function serializeForm(form) {
    var data = {};
    var formData = new FormData(form);
    formData.forEach(function (value, key) {
      data[key] = value;
    });
    return data;
  }

  function populateForm(form, values) {
    if (!values) {
      return;
    }
    Object.keys(values).forEach(function (key) {
      var field = form.elements.namedItem(key);
      if (!field) {
        return;
      }

      if (field.type === "radio") {
        var group = form.querySelectorAll('input[name="' + key + '"]');
        group.forEach(function (item) {
          item.checked = item.value === values[key];
        });
      } else if (field.type === "checkbox") {
        field.checked = values[key] === "on" || values[key] === true;
      } else {
        field.value = values[key];
      }
    });
  }

  function bindStorageForm(formId, storageKey, submitMessage) {
    var form = document.getElementById(formId);
    if (!form) {
      return;
    }

    var raw = localStorage.getItem(storageKey);
    if (raw) {
      try {
        populateForm(form, JSON.parse(raw));
      } catch (error) {
        localStorage.removeItem(storageKey);
      }
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();

      if (formId === "resetForm") {
        var pass = form.querySelector('input[name="newPassword"]');
        var confirm = form.querySelector('input[name="confirmPassword"]');
        if (pass && confirm && pass.value !== confirm.value) {
          showToast("Passwords do not match.", "error");
          confirm.focus();
          return;
        }
      }

      if (!form.checkValidity()) {
        form.classList.add("was-validated");
        showToast("Please complete required fields correctly.", "error");
        return;
      }

      localStorage.setItem(storageKey, JSON.stringify(serializeForm(form)));
      showToast(submitMessage || "Saved successfully.");
      form.classList.remove("was-validated");
      form.reset();
    });
  }

  function bindPricingEstimator() {
    var plan = document.getElementById("planLength");
    var trainer = document.getElementById("trainerAddOn");
    var nutrition = document.getElementById("nutritionAddOn");
    var output = document.getElementById("estimatedPrice");

    if (!plan || !output) {
      return;
    }

    function calc() {
      var base = Number(plan.value || 0);
      var total = base;
      if (trainer && trainer.checked) {
        total += 2200;
      }
      if (nutrition && nutrition.checked) {
        total += 900;
      }
      output.textContent = "INR " + total.toLocaleString("en-IN");
    }

    [plan, trainer, nutrition].forEach(function (control) {
      if (control) {
        control.addEventListener("change", calc);
      }
    });

    calc();
  }

  function bindBmiCalculator() {
    var weight = document.getElementById("weightKg");
    var height = document.getElementById("heightCm");
    var output = document.getElementById("bmiOutput");

    if (!weight || !height || !output) {
      return;
    }

    function compute() {
      var w = Number(weight.value);
      var h = Number(height.value) / 100;
      if (!w || !h) {
        output.textContent = "-";
        return;
      }

      var bmi = w / (h * h);
      output.textContent = bmi.toFixed(1);
    }

    weight.addEventListener("input", compute);
    height.addEventListener("input", compute);
    compute();
  }

  function bindSupplementFilter() {
    var search = document.getElementById("supplementSearch");
    var sort = document.getElementById("supplementSort");
    var cardsWrap = document.getElementById("supplementCards");

    if (!search || !sort || !cardsWrap) {
      return;
    }

    function refresh() {
      var text = search.value.trim().toLowerCase();
      var cards = Array.prototype.slice.call(cardsWrap.querySelectorAll("[data-supplement]"));

      cards.forEach(function (card) {
        var name = card.getAttribute("data-name") || "";
        var tags = card.getAttribute("data-tags") || "";
        var visible = name.indexOf(text) > -1 || tags.indexOf(text) > -1;
        card.style.display = visible ? "block" : "none";
      });

      cards.sort(function (a, b) {
        if (sort.value === "price") {
          return Number(a.getAttribute("data-price")) - Number(b.getAttribute("data-price"));
        }
        return (a.getAttribute("data-name") || "").localeCompare(b.getAttribute("data-name") || "");
      });

      cards.forEach(function (card) {
        cardsWrap.appendChild(card);
      });
    }

    search.addEventListener("input", refresh);
    sort.addEventListener("change", refresh);
    refresh();
  }

  function bindFaqToggle() {
    var triggers = document.querySelectorAll("[data-faq-target]");
    triggers.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = btn.getAttribute("data-faq-target");
        var panel = document.getElementById(id);
        if (!panel) {
          return;
        }
        panel.classList.toggle("d-none");
      });
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    setYear();
    bindThemeToggle();
    highlightActiveMenu();
    bindPricingEstimator();
    bindBmiCalculator();
    bindSupplementFilter();
    bindFaqToggle();

    bindStorageForm("trialForm", "trial_request", "Trial request submitted. Our team will call you within 2 hours.");
    bindStorageForm("contactForm", "contact_message", "Message sent. A coach will respond shortly.");
    bindStorageForm("loginForm", "login_last_user", "Login simulated successfully.");
    bindStorageForm("signupForm", "signup_draft", "Registration submitted. Welcome to Mutants Gym.");
    bindStorageForm("forgotForm", "forgot_username", "Password reset link generated (demo). Check your inbox.");
    bindStorageForm("resetForm", "reset_password", "Password updated successfully (demo). You can log in now.");
  });
})();
