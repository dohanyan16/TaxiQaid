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
