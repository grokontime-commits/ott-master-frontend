const fs = require("fs");
const path = require("path");

const file = path.join(process.cwd(), "live-server", "ui", "upload-manifest-review.html");
const backup = path.join(process.cwd(), "live-server", "ui", "upload-manifest-review.phase17c-ui2.bak.html");

if (!fs.existsSync(file)) {
  throw new Error("Missing upload-manifest-review.html");
}

let html = fs.readFileSync(file, "utf8");

if (!fs.existsSync(backup)) {
  fs.writeFileSync(backup, html, "utf8");
}

const marker = "PHASE 17C UI2 STRONG COMPACT MODE";
if (html.includes(marker)) {
  console.log("Phase 17C UI2 compact patch already installed.");
  process.exit(0);
}

const patch = `
<!-- PHASE 17C UI2 STRONG COMPACT MODE -->
<style>
  /* Chrome/Edge production compact mode */
  body[data-module-key="manifest"] {
    zoom: 0.82;
    background: #f3f6fb !important;
  }

  body[data-module-key="manifest"] header {
    padding: 14px 16px !important;
  }

  body[data-module-key="manifest"] header h1 {
    font-size: 22px !important;
    margin: 0 0 4px !important;
  }

  body[data-module-key="manifest"] header .sub,
  body[data-module-key="manifest"] header p {
    font-size: 13px !important;
    margin: 0 0 8px !important;
  }

  body[data-module-key="manifest"] main {
    max-width: 1420px !important;
    margin-top: 12px !important;
  }

  body[data-module-key="manifest"] section,
  body[data-module-key="manifest"] .card,
  body[data-module-key="manifest"] .panel {
    min-height: 0 !important;
  }

  body[data-module-key="manifest"] .grid,
  body[data-module-key="manifest"] .hero,
  body[data-module-key="manifest"] .cards,
  body[data-module-key="manifest"] .two-col,
  body[data-module-key="manifest"] .layout {
    align-items: start !important;
  }

  body[data-module-key="manifest"] .field {
    margin-bottom: 6px !important;
  }

  body[data-module-key="manifest"] input,
  body[data-module-key="manifest"] select {
    height: 32px !important;
    min-height: 32px !important;
  }

  body[data-module-key="manifest"] textarea {
    min-height: 90px !important;
    max-height: 130px !important;
  }

  body[data-module-key="manifest"] pre {
    max-height: 160px !important;
  }

  body[data-module-key="manifest"] .workflow-note {
    max-width: 720px !important;
  }

  body[data-module-key="manifest"] .safe-box,
  body[data-module-key="manifest"] .warning-box {
    font-size: 13px !important;
  }

  body[data-module-key="manifest"] #claudeExtractionOutput,
  body[data-module-key="manifest"] #claudeExtractionRaw {
    max-height: 150px !important;
    overflow: auto !important;
  }

  body[data-module-key="manifest"] #phase17cPanel,
  body[data-module-key="manifest"] #phase17bClaudeGate,
  body[data-module-key="manifest"] #phase17bApprovalGate {
    font-size: 12px !important;
  }

  body[data-module-key="manifest"] .phase17c-table th,
  body[data-module-key="manifest"] .phase17c-table td {
    padding: 4px 6px !important;
  }

  @media (min-width: 1200px) {
    body[data-module-key="manifest"] main {
      max-width: 1500px !important;
    }
  }
</style>

<script>
(function () {
  function applyCompact() {
    document.body.classList.add("phase17c-strong-compact");
    var force = document.getElementById("btnForceVerifyLogin");
    if (force) force.remove();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", applyCompact);
  } else {
    applyCompact();
  }

  setInterval(applyCompact, 1000);
})();
</script>
`;

html += "\\n" + patch + "\\n";
fs.writeFileSync(file, html, "utf8");

console.log("PASS: Phase 17C UI2 strong compact mode installed.");
console.log("Backup created: " + backup);