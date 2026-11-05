/** Shared filter and dropdown primitives used by multiple modules. */

    function getField(o, k) { return o[k] || o[k.toLowerCase()] || ""; }
    function matchText(o, keys, q) { return keys.some(k => String(getField(o, k)).toLowerCase().includes(q)); }

    function setupSearchDropdown({ input, btn, dd, getData, keys, label, apply }) {
      const inp = document.getElementById(input);
      const b = document.getElementById(btn);
      const d = document.getElementById(dd);
      function show() {
        const q = inp.value.trim().toLowerCase();
        const items = getData().filter(o => !q || matchText(o, keys, q));
        d.innerHTML = "";
        if (items.length === 0) { d.style.display = "none"; return; }
        items.slice(0, 100).forEach(o => {
          const div = document.createElement("div");
          div.className = "custom-dropdown-item";
          div.textContent = label(o);
          div.addEventListener("click", () => {
            inp.value = getField(o, keys[0]);
            d.style.display = "none";
            apply();
          });
          d.appendChild(div);
        });
        d.style.display = "block";
      }
      inp.addEventListener("input", () => { apply(); show(); });
      b.addEventListener("click", (e) => {
        e.stopPropagation();
        if (d.style.display === "block") d.style.display = "none"; else show();
      });
    }

    // Close dropdowns when the user clicks outside their search container.
    document.addEventListener("click", (e) => {
      if (!e.target.closest(".search-wrapper")) {
        document.querySelectorAll(".custom-dropdown").forEach(d => d.style.display = "none");
      }
    });


/**
 * Shared keyboard behavior for Fleet-style search dropdowns on every module.
 * Arrow keys navigate the open list; Enter selects; Escape dismisses it.
 * Native select elements retain their normal accessible keyboard behavior.
 */
document.addEventListener("keydown", event => {
  const input = event.target.closest(".search-wrapper .input-with-btn input");
  if (!input) return;
  const wrapper = input.closest(".search-wrapper");
  const dropdown = wrapper?.querySelector(".custom-dropdown");
  if (!dropdown || dropdown.style.display !== "block") return;
  const items = Array.from(dropdown.querySelectorAll(".custom-dropdown-item"));
  if (event.key === "Escape") {
    dropdown.style.display = "none";
    event.preventDefault();
    return;
  }
  const current = items.findIndex(item => item.classList.contains("keyboard-active"));
  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    event.preventDefault();
    const next = event.key === "ArrowDown"
      ? (current + 1) % (items.length || 1)
      : (current <= 0 ? items.length - 1 : current - 1);
    items.forEach(item => item.classList.remove("keyboard-active"));
    if (items[next]) {
      items[next].classList.add("keyboard-active");
      items[next].scrollIntoView({block: "nearest"});
    }
  } else if (event.key === "Enter" && items.length) {
    event.preventDefault();
    (items[current >= 0 ? current : 0]).click();
  }
});
