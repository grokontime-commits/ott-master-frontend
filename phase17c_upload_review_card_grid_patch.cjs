const fs = require("fs");
const path = require("path");

const file = path.join(process.cwd(), "live-server", "ui", "upload-manifest-review.html");
const backup = path.join(process.cwd(), "live-server", "ui", "upload-manifest-review.phase17c-ui4.bak.html");

if (!fs.existsSync(file)) throw new Error("Missing upload-manifest-review.html");

let html = fs.readFileSync(file, "utf8");

if (!fs.existsSync(backup)) {
  fs.writeFileSync(backup, html, "utf8");
}

const marker = "PHASE 17C UI4 TRUE CARD GRID";
if (html.includes(marker)) {
  console.log("Phase 17C UI4 grid patch already installed.");
  process.exit(0);
}

const patch = `
<!-- PHASE 17C UI4 TRUE CARD GRID -->
<style>
  body[data-module-key="manifest"] {
    zoom: 1 !important;
    overflow-x: hidden !important;
  }

  body[data-module-key="manifest"] header {
    padding: 12px 16px !important;
  }

  body[data-module-key="manifest"] header h1 {
    font-size: 22px !important;
    margin: 0 0 4px !important;
  }

  body[data-module-key="manifest"] main {
    max-width: 1720px !important;
    width: calc(100vw - 36px) !important;
    margin: 12px auto !important;
    padding: 0 !important;
  }

  #phase17cUi4Grid {
    display: grid !important;
    grid-template-columns: 0.85fr 1fr 0.9fr 0.9fr !important;
    grid-template-areas:
      "login file cargo approval"
      "claude claude review output";
    gap: 10px !important;
    align-items: start !important;
    width: 100% !important;
  }

  #phase17cUi4Grid [data-phase17c-area="login"] { grid-area: login; }
  #phase17cUi4Grid [data-phase17c-area="file"] { grid-area: file; }
  #phase17cUi4Grid [data-phase17c-area="cargo"] { grid-area: cargo; }
  #phase17cUi4Grid [data-phase17c-area="approval"] { grid-area: approval; }
  #phase17cUi4Grid [data-phase17c-area="claude"] { grid-area: claude; }
  #phase17cUi4Grid [data-phase17c-area="review"] { grid-area: review; }
  #phase17cUi4Grid [data-phase17c-area="output"] { grid-area: output; }

  body[data-module-key="manifest"] section,
  body[data-module-key="manifest"] .card,
  body[data-module-key="manifest"] .panel {
    padding: 10px !important;
    border-radius: 12px !important;
    min-height: 0 !important;
    align-self: start !important;
  }

  body[data-module-key="manifest"] h2 {
    font-size: 15px !important;
    margin: 0 0 3px !important;
  }

  body[data-module-key="manifest"] .sub,
  body[data-module-key="manifest"] .hint,
  body[data-module-key="manifest"] p {
    font-size: 12px !important;
    line-height: 1.25 !important;
    margin: 2px 0 5px !important;
  }

  body[data-module-key="manifest"] label {
    font-size: 11px !important;
    margin-bottom: 2px !important;
  }

  body[data-module-key="manifest"] input,
  body[data-module-key="manifest"] select {
    height: 28px !important;
    min-height: 28px !important;
    padding: 4px 7px !important;
    font-size: 12px !important;
  }

  body[data-module-key="manifest"] textarea {
    min-height: 72px !important;
    max-height: 90px !important;
    padding: 5px 7px !important;
    font-size: 12px !important;
  }

  body[data-module-key="manifest"] button {
    min-height: 28px !important;
    padding: 5px 8px !important;
    font-size: 11px !important;
    border-radius: 8px !important;
  }

  body[data-module-key="manifest"] .field {
    margin-bottom: 5px !important;
  }

  body[data-module-key="manifest"] pre,
  body[data-module-key="manifest"] #claudeExtractionOutput,
  body[data-module-key="manifest"] #claudeExtractionRaw,
  body[data-module-key="manifest"] #output {
    max-height: 110px !important;
    min-height: 54px !important;
    overflow: auto !important;
    font-size: 11px !important;
    padding: 7px !important;
  }

  body[data-module-key="manifest"] .safe-box,
  body[data-module-key="manifest"] .warning-box,
  body[data-module-key="manifest"] .phase17b-ai-gate,
  body[data-module-key="manifest"] .phase17c-panel {
    margin: 5px 0 !important;
    padding: 6px 7px !important;
    border-radius: 9px !important;
    font-size: 11px !important;
  }

  body[data-module-key="manifest"] .phase17b-ai-gate h3,
  body[data-module-key="manifest"] .phase17c-panel h3 {
    font-size: 13px !important;
    margin: 0 0 3px !important;
  }

  body[data-module-key="manifest"] .workflow-note {
    width: 100% !important;
    max-width: none !important;
    margin: 5px 0 9px !important;
    padding: 6px 9px !important;
    font-size: 12px !important;
  }

  body[data-module-key="manifest"] table {
    font-size: 10px !important;
  }

  body[data-module-key="manifest"] th,
  body[data-module-key="manifest"] td {
    padding: 3px 4px !important;
  }

  body[data-module-key="manifest"] details summary {
    font-size: 11px !important;
  }

  #btnForceVerifyLogin {
    display: none !important;
  }

  .phase17c-ui4-empty {
    display: none !important;
  }

  @media (max-width: 1200px) {
    #phase17cUi4Grid {
      grid-template-columns: 1fr 1fr !important;
      grid-template-areas:
        "login file"
        "claude claude"
        "review approval"
        "cargo output";
    }
  }

  @media (max-width: 760px) {
    #phase17cUi4Grid {
      grid-template-columns: 1fr !important;
      grid-template-areas:
        "login"
        "file"
        "claude"
        "review"
        "approval"
        "cargo"
        "output";
    }
  }
</style>

<script>
(function () {
  function textOf(el) {
    return String(el && el.textContent ? el.textContent : "").replace(/\\s+/g, " ").trim().toLowerCase();
  }

  function findCard(titlePart) {
    const headings = Array.from(document.querySelectorAll("h2"));
    const h = headings.find(x => textOf(x).includes(titlePart));
    return h ? h.closest("section, .card, .panel") : null;
  }

  function moveCard(grid, titlePart, area) {
    const card = findCard(titlePart);
    if (!card) return;

    card.dataset.phase17cArea = area;

    if (card.parentElement !== grid) {
      grid.appendChild(card);
    }
  }

  function hideEmptyContainers(main) {
    Array.from(main.children).forEach(child => {
      if (child.id === "phase17cUi4Grid") return;
      if (child.classList && child.classList.contains("workflow-note")) return;
      if (!child.textContent.trim()) {
        child.classList.add("phase17c-ui4-empty");
      }
    });
  }

  function applyGrid() {
    const force = document.getElementById("btnForceVerifyLogin");
    if (force) force.remove();

    const main = document.querySelector('body[data-module-key="manifest"] main');
    if (!main) return;

    let grid = document.getElementById("phase17cUi4Grid");
    if (!grid) {
      grid = document.createElement("div");
      grid.id = "phase17cUi4Grid";

      const note = main.querySelector(".workflow-note");
      if (note && note.nextSibling) {
        note.parentNode.insertBefore(grid, note.nextSibling);
      } else {
        main.insertBefore(grid, main.firstChild);
      }
    }

    moveCard(grid, "login", "login");
    moveCard(grid, "file intake", "file");
    moveCard(grid, "claude", "claude");
    moveCard(grid, "review queue", "review");
    moveCard(grid, "office approval", "approval");
    moveCard(grid, "cargo confirmation", "cargo");
    moveCard(grid, "output", "output");

    hideEmptyContainers(main);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", applyGrid);
  } else {
    applyGrid();
  }

  setInterval(applyGrid, 1000);
})();
</script>
`;

html += "\\n" + patch + "\\n";
fs.writeFileSync(file, html, "utf8");

console.log("PASS: Phase 17C UI4 true card grid installed.");
console.log("Backup created: " + backup);