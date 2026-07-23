(function () {
  var CART_KEY = "mutants_cart";
  var LEGACY_CART_KEY = "supplement_cart";

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

  function readSharedCart() {
    var raw = localStorage.getItem(CART_KEY);
    if (!raw) {
      var legacy = localStorage.getItem(LEGACY_CART_KEY);
      if (legacy) {
        localStorage.setItem(CART_KEY, legacy);
        localStorage.removeItem(LEGACY_CART_KEY);
        raw = legacy;
      }
    }

    if (!raw) {
      return [];
    }

    try {
      var parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      localStorage.removeItem(CART_KEY);
      return [];
    }
  }

  function writeSharedCart(items) {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
    syncCartCountBadges();
    syncCardItemQty();
  }

  function syncCartCountBadges() {
    var items = readSharedCart();
    var count = items.reduce(function (sum, item) {
      return sum + Number(item.qty || 1);
    }, 0);
    var badges = document.querySelectorAll("[data-cart-count]");
    badges.forEach(function (badge) {
      badge.textContent = String(count);
    });
  }

  function getCartItemNameFromTrigger(button) {
    if (!button) {
      return "";
    }

    var card = button.closest("[data-supplement], [data-membership]");
    return (
      button.getAttribute("data-cart-name") ||
      (card && (card.getAttribute("data-title") || card.getAttribute("data-name"))) ||
      ""
    );
  }

  function syncCardItemQty() {
    var items = readSharedCart();
    var qtyMap = {};
    items.forEach(function (item) {
      if (!item || !item.name) {
        return;
      }
      qtyMap[item.name] = Number(item.qty || 1);
    });

    var qtyEls = document.querySelectorAll("[data-item-qty]");
    qtyEls.forEach(function (el) {
      var name = el.getAttribute("data-cart-name") || "";
      var qty = name ? Number(qtyMap[name] || 0) : 0;
      el.textContent = String(qty);
    });
  }

  function addItemToCart(name, price) {
    var items = readSharedCart();
    var existing = items.find(function (item) {
      return item.name === name;
    });

    if (existing) {
      existing.qty += 1;
    } else {
      items.push({ name: name, price: price, qty: 1 });
    }

    writeSharedCart(items);
  }

  function decreaseItemInCart(name) {
    var items = readSharedCart();
    var index = items.findIndex(function (item) {
      return item.name === name;
    });

    if (index === -1) {
      return false;
    }

    var qty = Number(items[index].qty || 1);
    if (qty > 1) {
      items[index].qty = qty - 1;
    } else {
      items.splice(index, 1);
    }

    writeSharedCart(items);
    return true;
  }

  function bindGlobalAddToCart() {
    document.addEventListener("click", function (event) {
      var button = event.target.closest("[data-add-cart]");
      if (button) {
        var card = button.closest("[data-supplement], [data-membership]");
        var name = getCartItemNameFromTrigger(button) || "Item";
        var price = Number(button.getAttribute("data-cart-price") || (card && card.getAttribute("data-price")) || 0);

        if (!price) {
          showToast("Unable to add item. Missing price.", "error");
          return;
        }

        addItemToCart(name, price);
        showToast(name + " added to cart.");
        return;
      }

      var decButton = event.target.closest("[data-dec-cart]");
      if (!decButton) {
        return;
      }

      var decName = getCartItemNameFromTrigger(decButton);
      if (!decName) {
        return;
      }

      if (decreaseItemInCart(decName)) {
        showToast(decName + " quantity updated.");
      }
    });
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

  function bindCartPage() {
    var cartItems = document.getElementById("cartItems");
    var cartTotal = document.getElementById("cartTotal");
    var clearCartBtn = document.getElementById("clearCart");
    var checkoutBtn = document.getElementById("checkoutCart");

    if (!cartItems || !cartTotal) {
      return;
    }

    function readCart() {
      return readSharedCart();
    }

    function writeCart(items) {
      writeSharedCart(items);
    }

    function render(items) {
      cartItems.innerHTML = "";
      if (!items.length) {
        cartItems.innerHTML = '<li class="muted">Your cart is empty.</li>';
        cartTotal.textContent = "INR 0";
        return;
      }

      var total = 0;
      items.forEach(function (item, index) {
        total += Number(item.price || 0) * Number(item.qty || 1);

        var line = document.createElement("li");
        line.className = "d-flex justify-content-between align-items-center mb-2";
        line.innerHTML =
          '<span>' +
          item.name +
          "</span>" +
          '<div class="d-flex align-items-center">' +
          '<button type="button" class="btn btn-link btn-sm p-0 mr-2" aria-label="Decrease quantity" data-cart-dec="' +
          index +
          '">-</button>' +
          '<span class="mr-2" aria-live="polite">' +
          item.qty +
          "</span>" +
          '<button type="button" class="btn btn-link btn-sm p-0 mr-3" aria-label="Increase quantity" data-cart-inc="' +
          index +
          '">+</button>' +
          '<span class="mr-2">INR ' +
          (Number(item.price || 0) * Number(item.qty || 1)).toLocaleString("en-IN") +
          '</span><button type="button" class="btn btn-link btn-sm p-0" data-cart-remove="' +
          index +
          '">Remove</button></div>';
        cartItems.appendChild(line);
      });

      cartTotal.textContent = "INR " + total.toLocaleString("en-IN");
    }

    cartItems.addEventListener("click", function (event) {
      var incButton = event.target.closest("[data-cart-inc]");
      if (incButton) {
        var incIndex = Number(incButton.getAttribute("data-cart-inc"));
        var incItems = readCart();
        if (incIndex >= 0 && incIndex < incItems.length) {
          incItems[incIndex].qty = Number(incItems[incIndex].qty || 1) + 1;
          writeCart(incItems);
          render(incItems);
        }
        return;
      }

      var decButton = event.target.closest("[data-cart-dec]");
      if (decButton) {
        var decIndex = Number(decButton.getAttribute("data-cart-dec"));
        var decItems = readCart();
        if (decIndex >= 0 && decIndex < decItems.length) {
          var currentQty = Number(decItems[decIndex].qty || 1);
          if (currentQty > 1) {
            decItems[decIndex].qty = currentQty - 1;
          } else {
            decItems.splice(decIndex, 1);
          }
          writeCart(decItems);
          render(decItems);
        }
        return;
      }

      var button = event.target.closest("[data-cart-remove]");
      if (!button) {
        return;
      }

      var index = Number(button.getAttribute("data-cart-remove"));
      var items = readCart();
      if (index < 0 || index >= items.length) {
        return;
      }

      var removedName = items[index].name;
      items.splice(index, 1);
      writeCart(items);
      render(items);
      showToast(removedName + " removed from cart.");
    });

    if (clearCartBtn) {
      clearCartBtn.addEventListener("click", function () {
        writeCart([]);
        render([]);
        showToast("Cart cleared.");
      });
    }

    if (checkoutBtn) {
      checkoutBtn.addEventListener("click", function () {
        var items = readCart();
        if (!items.length) {
          showToast("Your cart is empty.", "error");
          return;
        }

        writeCart([]);
        render([]);
        showToast("Cart request submitted. Team will contact you.");
      });
    }

    render(readCart());
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
    syncCartCountBadges();
    syncCardItemQty();
    setYear();
    bindThemeToggle();
    highlightActiveMenu();
    bindPricingEstimator();
    bindBmiCalculator();
    bindSupplementFilter();
    bindGlobalAddToCart();
    bindCartPage();
    bindFaqToggle();

    bindStorageForm("trialForm", "trial_request", "Trial request submitted. Our team will call you within 2 hours.");
    bindStorageForm("contactForm", "contact_message", "Message sent. A coach will respond shortly.");
    bindStorageForm("loginForm", "login_last_user", "Login simulated successfully.");
    bindStorageForm("signupForm", "signup_draft", "Registration submitted. Welcome to Mutants Gym.");
    bindStorageForm("forgotForm", "forgot_username", "Password reset link generated (demo). Check your inbox.");
    bindStorageForm("resetForm", "reset_password", "Password updated successfully (demo). You can log in now.");
  });
})();
