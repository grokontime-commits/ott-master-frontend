const fs = require("fs");
const path = require("path");

const file = path.join(process.cwd(), "live-server", "ui", "upload-manifest-review.html");
const backup = path.join(process.cwd(), "live-server", "ui", "upload-manifest-review.phase17c-ui5-square-cards.bak.html");

if (!fs.existsSync(file)) {
  throw new Error("Missing upload-manifest-review.html");
}

let html = fs.readFileSync(file, "utf8");

if (!fs.existsSync(backup)) {
  fs.writeFileSync(backup, html, "utf8");
}

const marker = "PHASE 17C UI5 SQUARE COMPACT CARD LAYOUT";

if (html.includes(marker)) {
  console.log("Phase 17C UI5 square card patch already installed.");
  process.exit(0);
}

const patch = `
<!-- PHASE 17C UI5 SQUARE COMPACT CARD LAYOUT -->
<style>
  body[data-module-key="manifest"] {
    zoom: 1 !important;
    background: #f3f6fb !important;
    overflow-x: hidden !important;
  }

  body[data-module-key="manifest"] header {
    padding: 12px 16px !important;
  }

  body[data-module-key="manifest"] header h1 {
    font-size: 22px !important;
    margin: 0 0 3px !important;
  }

  body[data-module-key="manifest"] header .sub,
  body[data-module-key="manifest"] header p {
    font-size: 13px !important;
    margin: 0 0 6px !important;
  }

  body[data-module-key="manifest"] main {
    max-width: 1680px !important;
    width: calc(100vw - 34px) !important;
    margin: 10px auto !important;
    padding: 0 !important;
  }

  body[data-module-key="manifest"] .workflow-note {
    width: 100% !important;
    max-width: none !important;
    margin: 6px 0 10px !important;
    padding: 7px 10px !important;
    font-size: 12px !important;
  }

  #phase17cUi5Dashboard {
    display: grid !important;
    grid-template-columns: repeat(4, minmax(245px, 1fr)) !important;
    grid-template-areas:
      "login file cargo approval"
      "claude claude review output";
    gap: 10px !important;
    align-items: start !important;
    width: 100% !important;
  }

  #phase17cUi5Dashboard [data-phase17c-area="login"] { grid-area: login !important; }
  #phase17cUi5Dashboard [data-phase17c-area="file"] { grid-area: file !important; }
  #phase17cUi5Dashboard [data-phase17c-area="cargo"] { grid-area: cargo !important; }
  #phase17cUi5Dashboard [data-phase17c-area="approval"] { grid-area: approval !important; }
  #phase17cUi5Dashboard [data-phase17c-area="claude"] { grid-area: claude !important; }
  #phase17cUi5Dashboard [data-phase17c-area="review"] { grid-area: review !important; }
  #phase17cUi5Dashboard [data-phase17c-area="output"] { grid-area: output !important; }

  body[data-module-key="manifest"] section,
  body[data-module-key="manifest"] .card,
  body[data-module-key="manifest"] .panel {
    padding: 10px !important;
    border-radius: 12px !important;
    min-height: 0 !important;
    align-self: start !important;
  }

  #phase17cUi5Dashboard > section,
  #phase17cUi5Dashboard > .card,
  #phase17cUi5Dashboard > .panel {
    width: 100% !important;
    max-width: none !important;
    margin: 0 !important;
  }

  body[data-module-key="manifest"] h2 {
    font-size: 15px !important;
    margin: 0 0 3px !important;
    line-height: 1.15 !important;
  }

  body[data-module-key="manifest"] .sub,
  body[data-module-key="manifest"] .hint,
  body[data-module-key="manifest"] p {
    font-size: 11px !important;
    line-height: 1.22 !important;
    margin: 2px 0 5px !important;
  }

  body[data-module-key="manifest"] label {
    display: block !important;
    font-size: 11px !important;
    margin: 0 0 2px !important;
    line-height: 1.15 !important;
  }

  body[data-module-key="manifest"] input,
  body[data-module-key="manifest"] select {
    height: 28px !important;
    min-height: 28px !important;
    width: 100% !important;
    padding: 4px 7px !important;
    font-size: 11px !important;
    border-radius: 8px !important;
  }

  body[data-module-key="manifest"] textarea {
    min-height: 72px !important;
    max-height: 90px !important;
    width: 100% !important;
    padding: 5px 7px !important;
    font-size: 11px !important;
    border-radius: 8px !important;
  }

  body[data-module-key="manifest"] button {
    min-height: 28px !important;
    padding: 5px 8px !important;
    font-size: 11px !important;
    border-radius: 8px !important;
    line-height: 1.1 !important;
  }

  body[data-module-key="manifest"] .field {
    margin: 0 0 5px !important;
  }

  body[data-module-key="manifest"] .row,
  body[data-module-key="manifest"] .grid,
  body[data-module-key="manifest"] .form-grid,
  body[data-module-key="manifest"] .login-grid {
    gap: 6px !important;
  }

  /* Make small top cards square/compact by stacking their fields */
  #phase17cUi5Dashboard [data-phase17c-area="login"] .row,
  #phase17cUi5Dashboard [data-phase17c-area="login"] .grid,
  #phase17cUi5Dashboard [data-phase17c-area="login"] .form-grid,
  #phase17cUi5Dashboard [data-phase17c-area="login"] .login-grid,
  #phase17cUi5Dashboard [data-phase17c-area="file"] .row,
  #phase17cUi5Dashboard [data-phase17c-area="file"] .grid,
  #phase17cUi5Dashboard [data-phase17c-area="file"] .form-grid,
  #phase17cUi5Dashboard [data-phase17c-area="cargo"] .row,
  #phase17cUi5Dashboard [data-phase17c-area="cargo"] .grid,
  #phase17cUi5Dashboard [data-phase17c-area="cargo"] .form-grid,
  #phase17cUi5Dashboard [data-phase17c-area="approval"] .row,
  #phase17cUi5Dashboard [data-phase17c-area="approval"] .grid,
  #phase17cUi5Dashboard [data-phase17c-area="approval"] .form-grid {
    display: grid !important;
    grid-template-columns: 1fr !important;
    gap: 5px !important;
  }

  #phase17cUi5Dashboard [data-phase17c-area="login"] {
    max-height: 230px !important;
    overflow: auto !important;
  }

  #phase17cUi5Dashboard [data-phase17c-area="file"],
  #phase17cUi5Dashboard [data-phase17c-area="cargo"],
  #phase17cUi5Dashboard [data-phase17c-area="approval"] {
    max-height: 300px !important;
    overflow: auto !important;
  }

  #phase17cUi5Dashboard [data-phase17c-area="claude"] {
    max-height: 520px !important;
    overflow: auto !important;
  }

  #phase17cUi5Dashboard [data-phase17c-area="review"],
  #phase17cUi5Dashboard [data-phase17c-area="output"] {
    max-height: 380px !important;
    overflow: auto !important;
  }

  body[data-module-key="manifest"] pre,
  body[data-module-key="manifest"] #claudeExtractionOutput,
  body[data-module-key="manifest"] #claudeExtractionRaw,
  body[data-module-key="manifest"] #output {
    max-height: 105px !important;
    min-height: 50px !important;
    overflow: auto !important;
    font-size: 10px !important;
    padding: 7px !important;
    border-radius: 8px !important;
  }

  body[data-module-key="manifest"] .safe-box,
  body[data-module-key="manifest"] .warning-box,
  body[data-module-key="manifest"] .phase17b-ai-gate,
  body[data-module-key="manifest"] .phase17c-panel {
    margin: 5px 0 !important;
    padding: 6px 7px !important;
    border-radius: 9px !important;
    font-size: 10px !important;
  }

  body[data-module-key="manifest"] .phase17b-ai-gate h3,
  body[data-module-key="manifest"] .phase17c-panel h3 {
    font-size: 12px !important;
    margin: 0 0 3px !important;
  }

  body[data-module-key="manifest"] .phase17c-summary {
    gap: 4px !important;
    margin: 3px 0 !important;
  }

  body[data-module-key="manifest"] .phase17c-chip {
    padding: 3px 6px !important;
    font-size: 10px !important;
  }

  body[data-module-key="manifest"] table {
    font-size: 10px !important;
  }

  body[data-module-key="manifest"] th,
  body[data-module-key="manifest"] td {
    padding: 3px 4px !important;
  }

  body[data-module-key="manifest"] details {
    margin-top: 3px !important;
  }

  body[data-module-key="manifest"] details summary {
    font-size: 11px !important;
    line-height: 1.1 !important;
  }

  #btnForceVerifyLogin {
    display: none !important;
  }

  .phase17c-ui5-empty-wrapper {
    display: none !important;
  }

  @media (max-width: 1250px) {
    #phase17cUi5Dashboard {
      grid-template-columns: repeat(2, minmax(260px, 1fr)) !important;
      grid-template-areas:
        "login file"
        "cargo approval"
        "claude claude"
        "review output";
    }
  }

  @media (max-width: 760px) {
    #phase17cUi5Dashboard {
      grid-template-columns: 1fr !important;
      grid-template-areas:
        "login"
        "file"
        "cargo"
        "approval"
        "claude"
        "review"
        "output";
    }
  }
</style>

<script>
(function () {
  function normalizeText(node) {
    return String(node && node.textContent ? node.textContent : "")
      .replace(/\\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function findCardByHeading(titlePart) {
    var headings = Array.from(document.querySelectorAll("h2"));
    var h2 = headings.find(function (h) {
      return normalizeText(h).includes(titlePart);
    });
    return h2 ? h2.closest("section, .card, .panel") : null;
  }

  function placeCard(grid, titlePart, area) {
    var card = findCardByHeading(titlePart);
    if (!card) return;

    card.dataset.phase17cArea = area;

    if (card.parentElement !== grid) {
      grid.appendChild(card);
    }
  }

  function removeForceVerify() {
    var force = document.getElementById("btnForceVerifyLogin");
    if (force) force.remove();
  }

  function hideEmptyWrappers(main, grid) {
    Array.from(main.children).forEach(function (child) {
      if (child === grid) return;
      if (child.classList && child.classList.contains("workflow-note")) return;
      if (child.tagName === "SCRIPT" || child.tagName === "STYLE") return;

      var hasCard = child.querySelector && child.querySelector("section, .card, .panel");
      var text = String(child.textContent || "").replace(/\\s+/g, "").trim();

      if (!hasCard && !text) {
        child.classList.add("phase17c-ui5-empty-wrapper");
      }
    });
  }

  function applySquareCards() {
    removeForceVerify();

    var main = document.querySelector('body[data-module-key="manifest"] main');
    if (!main) return;

    var grid = document.getElementById("phase17cUi5Dashboard");
    if (!grid) {
      grid = document.createElement("div");
      grid.id = "phase17cUi5Dashboard";

      var note = main.querySelector(".workflow-note");
      if (note && note.parentNode === main) {
        note.insertAdjacentElement("afterend", grid);
      } else {
        main.insertBefore(grid, main.firstChild);
      }
    }

    placeCard(grid, "login", "login");
    placeCard(grid, "file intake", "file");
    placeCard(grid, "cargo confirmation", "cargo");
    placeCard(grid, "office approval", "approval");
    placeCard(grid, "claude", "claude");
    placeCard(grid, "review queue", "review");
    placeCard(grid, "output", "output");

    hideEmptyWrappers(main, grid);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", applySquareCards);
  } else {
    applySquareCards();
  }

  setInterval(applySquareCards, 800);
})();
</script>
`;

html += "\\n" + patch + "\\n";

fs.writeFileSync(file, html, "utf8");

console.log("PASS: Phase 17C UI5 square compact card layout installed.");
console.log("Backup created: " + backup);