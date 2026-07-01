const fs = require("fs");
const path = require("path");

const file = path.join(process.cwd(), "live-server", "ui", "customer-portal.html");
const backup = path.join(process.cwd(), "live-server", "ui", "customer-portal.phase12b.mode-polish.bak.html");

if (!fs.existsSync(file)) {
  throw new Error("customer-portal.html not found: " + file);
}

let html = fs.readFileSync(file, "utf8");

if (!fs.existsSync(backup)) {
  fs.writeFileSync(backup, html, "utf8");
}

const marker = "PHASE 12B CUSTOMER PORTAL FINAL MODE POLISH";
if (html.includes(marker)) {
  console.log("Phase 12B patch already installed. No changes made.");
  process.exit(0);
}

const patch = `
<!-- PHASE 12B CUSTOMER PORTAL FINAL MODE POLISH -->
<style>
  .phase12b-mode-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
    max-width: 1180px;
    margin: 8px auto 10px;
    padding: 8px 10px;
    border: 1px solid #d7e3f4;
    border-radius: 12px;
    background: #f7fbff;
    font-size: 12px;
  }

  .phase12b-mode-bar-left,
  .phase12b-mode-bar-right {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .phase12b-mode-pill {
    padding: 4px 10px;
    border-radius: 999px;
    background: #fff;
    border: 1px solid #b9cde6;
    font-weight: 800;
  }

  .phase12b-mode-note {
    color: #516173;
    font-weight: 600;
  }

  .phase12b-mode-bar button {
    min-height: 28px !important;
    padding: 5px 10px !important;
    font-size: 12px !important;
  }

  body.phase12b-customer-mode .phase12b-admin-card,
  body.phase12b-customer-mode .customer-mode-hide,
  body.phase12b-customer-mode .phase12a-hidden-admin {
    display: none !important;
  }

  body.phase12b-customer-mode #phase12aShowAdminSetup {
    display: none !important;
  }

  body.phase12b-admin-mode .phase12b-admin-card,
  body.phase12b-admin-mode .customer-mode-hide,
  body.phase12b-admin-mode .phase12a-hidden-admin {
    display: block !important;
  }

  body.phase12b-admin-mode #phase12aShowAdminSetup {
    display: inline-flex !important;
  }
</style>

<script>
(() => {
  const ADMIN_TITLES = [
    "2. Customer Portal Dashboard",
    "3. Create / Select Customer Portal Account",
    "4. Link User + Assign Customer-Visible Cargo",
    "5. Cargo source selector"
  ];

  const ADMIN_BUTTONS = [
    "btnStats",
    "btnPayors",
    "btnAccounts",
    "btnCargoMawbs",
    "btnAudit",
    "btnCreateAccount",
    "btnReloadAccounts",
    "btnLinkUser",
    "btnLoadUsers",
    "btnAssignMawb",
    "btnLoadMawbDetail",
    "btnAssignHawb",
    "btnAssignFile",
    "btnCargoSearch",
    "phase12aShowAdminSetup"
  ];

  function clean(v) {
    return String(v || "").replace(/\\s+/g, " ").trim();
  }

  function getCardByTitle(title) {
    const h2s = Array.from(document.querySelectorAll("h2"));
    const h2 = h2s.find(h => clean(h.textContent).toLowerCase() === title.toLowerCase());
    return h2 ? h2.closest("section, .card, .panel") : null;
  }

  function markAdminCards() {
    ADMIN_TITLES.forEach(title => {
      const card = getCardByTitle(title);
      if (card) card.classList.add("phase12b-admin-card");
    });
  }

  function output(msg) {
    const box = document.getElementById("output");
    if (box) box.textContent = msg;
  }

  function isAdminPayload(payload) {
    const found = [];
    function scan(v) {
      if (!v) return;
      if (typeof v === "string") found.push(v.toUpperCase());
      else if (Array.isArray(v)) v.forEach(scan);
      else if (typeof v === "object") Object.values(v).forEach(scan);
    }
    scan(payload);

    return found.some(v =>
      v.includes("ADMIN") ||
      v.includes("OFFICE") ||
      v.includes("INTERNAL") ||
      v.includes("SUPER")
    );
  }

  function setVerifiedAdmin(value) {
    if (value) {
      localStorage.setItem("ottCustomerPortalAdminVerified", "true");
    } else {
      localStorage.removeItem("ottCustomerPortalAdminVerified");
    }
  }

  function isVerifiedAdmin() {
    return localStorage.getItem("ottCustomerPortalAdminVerified") === "true";
  }

  function setMode(mode, note) {
    const admin = mode === "admin" && isVerifiedAdmin();

    document.body.classList.toggle("phase12b-admin-mode", admin);
    document.body.classList.toggle("phase12b-customer-mode", !admin);

    const pill = document.getElementById("phase12bModePill");
    const msg = document.getElementById("phase12bModeNote");

    if (pill) pill.textContent = admin ? "ADMIN MODE" : "CUSTOMER MODE";
    if (msg) msg.textContent = note || (admin ? "Admin setup unlocked." : "Customer-safe read-only portal is active.");

    if (admin) {
      ADMIN_TITLES.forEach(title => {
        const card = getCardByTitle(title);
        if (card) {
          card.classList.remove("customer-mode-hide");
          card.classList.remove("phase12a-hidden-admin");
        }
      });
    }
  }

  function addModeBar() {
    if (document.getElementById("phase12bModeBar")) return;

    const bar = document.createElement("div");
    bar.id = "phase12bModeBar";
    bar.className = "phase12b-mode-bar";
    bar.innerHTML = \`
      <div class="phase12b-mode-bar-left">
        <span id="phase12bModePill" class="phase12b-mode-pill">CUSTOMER MODE</span>
        <span id="phase12bModeNote" class="phase12b-mode-note">Customer-safe read-only portal is active.</span>
      </div>
      <div class="phase12b-mode-bar-right">
        <button type="button" class="secondary" id="phase12bCustomerModeBtn">Customer Mode</button>
        <button type="button" class="secondary" id="phase12bAdminModeBtn">Admin Setup</button>
      </div>
    \`;

    const header = document.querySelector("header");
    if (header && header.parentNode) {
      header.parentNode.insertBefore(bar, header.nextSibling);
    } else {
      document.body.insertBefore(bar, document.body.firstChild);
    }

    document.getElementById("phase12bCustomerModeBtn").onclick = () => {
      localStorage.setItem("ottCustomerPortalMode", "customer");
      setMode("customer", "Customer-safe read-only portal is active.");
    };

    document.getElementById("phase12bAdminModeBtn").onclick = () => {
      if (!isVerifiedAdmin()) {
        setMode("customer", "Admin setup locked. Login as ADMIN/OFFICE and click Test /auth/me first.");
        output("Admin setup locked. Login as ADMIN/OFFICE and click Test /auth/me first.");
        return;
      }

      localStorage.setItem("ottCustomerPortalMode", "admin");
      setMode("admin", "Admin setup unlocked for verified internal user.");
    };
  }

  function installClickGuard() {
    document.addEventListener("click", ev => {
      const btn = ev.target && ev.target.closest ? ev.target.closest("button") : null;
      if (!btn) return;

      if (btn.id === "btnLogin" || btn.id === "btnLogout") {
        setVerifiedAdmin(false);
        localStorage.setItem("ottCustomerPortalMode", "customer");
        setTimeout(() => setMode("customer"), 100);
        return;
      }

      if (ADMIN_BUTTONS.includes(btn.id) && !isVerifiedAdmin()) {
        ev.preventDefault();
        ev.stopImmediatePropagation();
        setMode("customer", "Blocked admin action in customer mode.");
        output("Blocked customer-mode admin action: " + clean(btn.textContent || btn.id));
      }
    }, true);
  }

  function installFetchGuard() {
    if (window.__phase12bFetchGuardInstalled) return;
    if (typeof window.fetch !== "function") return;

    window.__phase12bFetchGuardInstalled = true;
    const originalFetch = window.fetch;

    window.fetch = async function(...args) {
      const res = await originalFetch.apply(this, args);

      try {
        const url = String(args[0]?.url || args[0] || "");
        if (/\\/auth\\/me/i.test(url)) {
          res.clone().json().then(payload => {
            if (isAdminPayload(payload)) {
              setVerifiedAdmin(true);
              localStorage.setItem("ottCustomerPortalMode", "admin");
              setMode("admin", "Admin setup unlocked for verified internal user.");
            } else {
              setVerifiedAdmin(false);
              localStorage.setItem("ottCustomerPortalMode", "customer");
              setMode("customer", "Customer user verified. Admin setup remains hidden.");
            }
          }).catch(() => {});
        }
      } catch (_) {}

      return res;
    };
  }

  function init() {
    markAdminCards();
    addModeBar();
    installClickGuard();
    installFetchGuard();

    const storedMode = localStorage.getItem("ottCustomerPortalMode");
    if (storedMode === "admin" && isVerifiedAdmin()) {
      setMode("admin", "Admin setup unlocked for verified internal user.");
    } else {
      setMode("customer", "Customer-safe read-only portal is active.");
    }

    setTimeout(() => {
      markAdminCards();
      const mode = localStorage.getItem("ottCustomerPortalMode");
      setMode(mode === "admin" && isVerifiedAdmin() ? "admin" : "customer");
    }, 300);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
</script>
`;

html += "\n" + patch + "\n";
fs.writeFileSync(file, html, "utf8");

console.log("PASS: Phase 12B customer/admin mode polish patch installed.");
console.log("Backup created: " + backup);