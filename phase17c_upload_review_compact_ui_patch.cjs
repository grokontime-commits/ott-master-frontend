const fs = require("fs");
const path = require("path");

const file = path.join(process.cwd(), "live-server", "ui", "upload-manifest-review.html");
const backup = path.join(process.cwd(), "live-server", "ui", "upload-manifest-review.phase17c-ui.bak.html");

if (!fs.existsSync(file)) {
  throw new Error("Missing upload-manifest-review.html");
}

let html = fs.readFileSync(file, "utf8");

if (!fs.existsSync(backup)) {
  fs.writeFileSync(backup, html, "utf8");
}

const marker = "PHASE 17C UI COMPACT UPLOAD REVIEW";
if (html.includes(marker)) {
  console.log("Phase 17C UI compact patch already installed.");
  process.exit(0);
}

const patch = `
<!-- PHASE 17C UI COMPACT UPLOAD REVIEW -->
<style>
  /* Hide troubleshooting-only button from production UI */
  #btnForceVerifyLogin {
    display: none !important;
  }

  body[data-module-key="manifest"] main {
    max-width: 1260px !important;
    margin: 14px auto !important;
    padding: 0 12px !important;
  }

  body[data-module-key="manifest"] .workflow-note {
    margin: 8px 0 12px !important;
    padding: 8px 12px !important;
    font-size: 13px !important;
  }

  body[data-module-key="manifest"] .grid,
  body[data-module-key="manifest"] .hero,
  body[data-module-key="manifest"] .cards {
    gap: 12px !important;
    align-items: start !important;
  }

  body[data-module-key="manifest"] section,
  body[data-module-key="manifest"] .card,
  body[data-module-key="manifest"] .panel {
    padding: 12px !important;
    border-radius: 14px !important;
  }

  body[data-module-key="manifest"] h2 {
    margin: 0 0 4px !important;
    font-size: 17px !important;
  }

  body[data-module-key="manifest"] .sub,
  body[data-module-key="manifest"] .hint,
  body[data-module-key="manifest"] p {
    margin: 3px 0 8px !important;
    font-size: 13px !important;
    line-height: 1.3 !important;
  }

  body[data-module-key="manifest"] label {
    margin-bottom: 4px !important;
    font-size: 12px !important;
  }

  body[data-module-key="manifest"] input,
  body[data-module-key="manifest"] select,
  body[data-module-key="manifest"] textarea {
    min-height: 34px !important;
    padding: 7px 9px !important;
    font-size: 13px !important;
  }

  body[data-module-key="manifest"] textarea {
    min-height: 110px !important;
  }

  body[data-module-key="manifest"] button {
    min-height: 34px !important;
    padding: 7px 11px !important;
    font-size: 12px !important;
  }

  body[data-module-key="manifest"] .field {
    margin-bottom: 8px !important;
  }

  body[data-module-key="manifest"] .safe-box,
  body[data-module-key="manifest"] .warning-box,
  body[data-module-key="manifest"] .phase17b-ai-gate,
  body[data-module-key="manifest"] .phase17c-panel {
    margin: 8px 0 !important;
    padding: 9px 10px !important;
    border-radius: 12px !important;
  }

  body[data-module-key="manifest"] details {
    margin-top: 6px !important;
  }

  body[data-module-key="manifest"] details summary {
    font-size: 13px !important;
  }

  body[data-module-key="manifest"] pre {
    max-height: 220px !important;
    overflow: auto !important;
    font-size: 12px !important;
  }

  body[data-module-key="manifest"] table {
    font-size: 12px !important;
  }

  body[data-module-key="manifest"] th,
  body[data-module-key="manifest"] td {
    padding: 6px 7px !important;
  }

  /* Reduce large blank height created by first row card stretching */
  body[data-module-key="manifest"] .card,
  body[data-module-key="manifest"] section {
    align-self: start !important;
  }
</style>

<script>
(function () {
  function removeForceVerifyButton() {
    var btn = document.getElementById("btnForceVerifyLogin");
    if (btn) btn.remove();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", removeForceVerifyButton);
  } else {
    removeForceVerifyButton();
  }

  setInterval(removeForceVerifyButton, 1000);
})();
</script>
`;

html += "\\n" + patch + "\\n";
fs.writeFileSync(file, html, "utf8");

console.log("PASS: Phase 17C compact Upload Manifest Review UI patch installed.");
console.log("Backup created: " + backup);