const fs = require("fs");
const path = require("path");

const file = path.join(process.cwd(), "live-server", "ui", "upload-manifest-review.html");
const backup = path.join(process.cwd(), "live-server", "ui", "upload-manifest-review.phase17c-ui3.bak.html");

if (!fs.existsSync(file)) {
  throw new Error("Missing upload-manifest-review.html");
}

let html = fs.readFileSync(file, "utf8");

if (!fs.existsSync(backup)) {
  fs.writeFileSync(backup, html, "utf8");
}

const marker = "PHASE 17C UI3 WIDE COMPACT LAYOUT";
if (html.includes(marker)) {
  console.log("Phase 17C UI3 wide layout patch already installed.");
  process.exit(0);
}

const patch = `
<!-- PHASE 17C UI3 WIDE COMPACT LAYOUT -->
<style>
  body[data-module-key="manifest"] {
    zoom: 0.78 !important;
    overflow-x: hidden !important;
  }

  body[data-module-key="manifest"] header {
    padding: 10px 14px !important;
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
    max-width: 1760px !important;
    width: calc(100vw - 32px) !important;
    margin: 10px auto !important;
    padding: 0 !important;
  }

  body[data-module-key="manifest"] .workflow-note {
    max-width: none !important;
    width: 100% !important;
    margin: 6px 0 10px !important;
    padding: 7px 10px !important;
    font-size: 13px !important;
  }

  body[data-module-key="manifest"] main > .grid,
  body[data-module-key="manifest"] main > section.grid,
  body[data-module-key="manifest"] main > div.grid {
    display: grid !important;
    grid-template-columns: 0.95fr 1.05fr !important;
    gap: 10px !important;
    align-items: start !important;
    width: 100% !important;
  }

  body[data-module-key="manifest"] section,
  body[data-module-key="manifest"] .card,
  body[data-module-key="manifest"] .panel {
    padding: 10px !important;
    border-radius: 12px !important;
    min-height: 0 !important;
    align-self: start !important;
  }

  body[data-module-key="manifest"] h2 {
    font-size: 16px !important;
    margin: 0 0 3px !important;
  }

  body[data-module-key="manifest"] .sub,
  body[data-module-key="manifest"] .hint,
  body[data-module-key="manifest"] p {
    font-size: 12px !important;
    line-height: 1.25 !important;
    margin: 2px 0 6px !important;
  }

  body[data-module-key="manifest"] label {
    font-size: 11px !important;
    margin-bottom: 3px !important;
  }

  body[data-module-key="manifest"] input,
  body[data-module-key="manifest"] select {
    height: 29px !important;
    min-height: 29px !important;
    padding: 5px 8px !important;
    font-size: 12px !important;
  }

  body[data-module-key="manifest"] textarea {
    min-height: 76px !important;
    max-height: 96px !important;
    padding: 6px 8px !important;
    font-size: 12px !important;
  }

  body[data-module-key="manifest"] button {
    min-height: 29px !important;
    padding: 5px 9px !important;
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
    max-height: 120px !important;
    min-height: 58px !important;
    overflow: auto !important;
    font-size: 11px !important;
    padding: 8px !important;
  }

  body[data-module-key="manifest"] .safe-box,
  body[data-module-key="manifest"] .warning-box,
  body[data-module-key="manifest"] .phase17b-ai-gate,
  body[data-module-key="manifest"] .phase17c-panel {
    margin: 6px 0 !important;
    padding: 7px 8px !important;
    border-radius: 10px !important;
    font-size: 11px !important;
  }

  body[data-module-key="manifest"] .phase17b-ai-gate h3,
  body[data-module-key="manifest"] .phase17c-panel h3 {
    font-size: 13px !important;
    margin: 0 0 4px !important;
  }

  body[data-module-key="manifest"] .phase17c-summary {
    gap: 5px !important;
    margin: 4px 0 !important;
  }

  body[data-module-key="manifest"] .phase17c-chip {
    padding: 3px 7px !important;
    font-size: 10px !important;
  }

  body[data-module-key="manifest"] .phase17c-table th,
  body[data-module-key="manifest"] .phase17c-table td {
    padding: 3px 5px !important;
    font-size: 10px !important;
  }

  body[data-module-key="manifest"] table {
    font-size: 11px !important;
  }

  body[data-module-key="manifest"] th,
  body[data-module-key="manifest"] td {
    padding: 4px 5px !important;
  }

  body[data-module-key="manifest"] details {
    margin-top: 4px !important;
  }

  body[data-module-key="manifest"] details summary {
    font-size: 11px !important;
  }

  body[data-module-key="manifest"] #btnForceVerifyLogin {
    display: none !important;
  }

  @media (min-width: 1300px) {
    body[data-module-key="manifest"] main {
      max-width: 1840px !important;
    }
  }
</style>

<script>
(function () {
  function compactManifestPage() {
    var force = document.getElementById("btnForceVerifyLogin");
    if (force) force.remove();

    document.body.classList.add("phase17c-ui3-wide-compact");

    var main = document.querySelector('body[data-module-key="manifest"] main');
    if (!main || main.dataset.phase17cUi3Applied === "1") return;

    main.dataset.phase17cUi3Applied = "1";

    var cards = Array.from(main.querySelectorAll("section, .card, .panel")).filter(function (card) {
      return card.querySelector("h2");
    });

    cards.forEach(function (card) {
      var h = card.querySelector("h2");
      var title = h ? String(h.textContent || "").toLowerCase() : "";

      if (title.includes("login")) card.dataset.phase17cArea = "login";
      if (title.includes("file intake")) card.dataset.phase17cArea = "file";
      if (title.includes("claude")) card.dataset.phase17cArea = "claude";
      if (title.includes("review queue")) card.dataset.phase17cArea = "review";
      if (title.includes("office approval")) card.dataset.phase17cArea = "approval";
      if (title.includes("cargo confirmation")) card.dataset.phase17cArea = "cargo";
      if (title.includes("output")) card.dataset.phase17cArea = "output";
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", compactManifestPage);
  } else {
    compactManifestPage();
  }

  setInterval(compactManifestPage, 1000);
})();
</script>
`;

html += "\\n" + patch + "\\n";
fs.writeFileSync(file, html, "utf8");

console.log("PASS: Phase 17C UI3 wide compact layout installed.");
console.log("Backup created: " + backup);