// Submit the oracle form via JSON so we can show the reply in-place,
// then reload to refresh dashboard data.
(function () {
  const form = document.getElementById("oracle-form");
  const input = document.getElementById("oracle-input");
  const output = document.getElementById("oracle-output");
  if (!form || !input || !output) return;

  const button = form.querySelector("button");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const message = input.value.trim();
    if (!message) return;

    button.disabled = true;
    const originalLabel = button.textContent;
    button.textContent = "Consulting…";
    output.innerHTML = '<em class="muted">The Oracle is thinking…</em>';

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const data = await res.json();

      let html = escapeHtml(data.reply || "The Oracle had nothing to say.");
      if (Array.isArray(data.actions) && data.actions.length > 0) {
        const summary = data.actions
          .map((a) => describeAction(a))
          .filter(Boolean)
          .join(" · ");
        if (summary) {
          html += `<span class="oracle-actions">${escapeHtml(summary)}</span>`;
        }
      }
      output.innerHTML = html;
      input.value = "";

      // Refresh dashboard after a beat so the user can read the reply.
      setTimeout(() => window.location.reload(), 1800);
    } catch (err) {
      output.innerHTML =
        '<em class="warn">The Oracle could not be reached. Check the server.</em>';
    } finally {
      button.disabled = false;
      button.textContent = originalLabel;
    }
  });

  function describeAction(a) {
    if (!a || !a.tool) return "";
    if (a.tool === "record_transaction") {
      const i = a.input || {};
      return `recorded ${i.kind} ${i.amount} · ${i.category}`;
    }
    if (a.tool === "set_budget") {
      const i = a.input || {};
      return `set ${i.category} budget to ${i.amount}`;
    }
    if (a.tool === "list_transactions") return "checked the ledger";
    if (a.tool === "get_summary") return "checked the month summary";
    return a.tool;
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
})();
