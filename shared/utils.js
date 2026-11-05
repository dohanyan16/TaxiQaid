/**
 * TAXI QAID ERP | utils.js
 * Purpose: Date, time, and formatting utilities.
 *
 * Loaded as a classic script to preserve original cross-file references.
 * Edit only the features owned by this file. See docs/PROJECT_GUIDE.md.
 */

    function getKSACurrentDateTime() {
      const now = new Date();
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Riyadh', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
      });
      const parts = formatter.formatToParts(now);
      const obj = {};
      parts.forEach(p => { if (p.type !== 'literal') obj[p.type] = p.value; });
      return { date: `${obj.year}-${obj.month}-${obj.day}`, time: `${obj.hour}:${obj.minute}` };
    }

    function formatDateForDisplay(d) {
      if (!d) return "-";
      let s = String(d).trim();
      if (s === "" || s === "Not Yet") return "-";
      if (s.includes("T")) s = s.split("T")[0];
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
        const p = s.split("-");
        return `${p[2]}/${p[1]}/${p[0]}`;
      }
      return s;
    }

    function formatTimeForDisplay(t) {
      if (!t || String(t).trim() === "") return "-";
      let s = String(t);
      if (s.includes("T")) s = s.split("T")[1];
      if (s.length >= 5) return s.substring(0, 5);
      return s;
    }

    // Convert spreadsheet dates and times to values accepted by HTML date/time inputs.
    function toDateInput(d) {
      if (!d) return "";
      let s = String(d).trim();
      if (s.includes("T")) s = s.split("T")[0];
      return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : "";
    }
    function toTimeInput(t) {
      if (!t) return "";
      let s = String(t);
      if (s.includes("T")) s = s.split("T")[1];
      return s.length >= 5 ? s.substring(0, 5) : "";
    }
