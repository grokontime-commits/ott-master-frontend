const fs = require("fs");
const path = require("path");

const rootIndex = path.join(process.cwd(), "live-server", "index.html");
const backup = path.join(process.cwd(), "live-server", "index.phase13.bak.html");

if (fs.existsSync(rootIndex) && !fs.existsSync(backup)) {
  fs.copyFileSync(rootIndex, backup);
}

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>On Time Truckers — OTT Master</title>
  <style>
    :root {
      --blue:#173f73;
      --gold:#f4b000;
      --bg:#f5f7fb;
      --card:#ffffff;
      --line:#d9e2ef;
      --text:#172033;
      --muted:#65758b;
    }

    * { box-sizing:border-box; }

    body {
      margin:0;
      font-family: Arial, Helvetica, sans-serif;
      background:var(--bg);
      color:var(--text);
    }

    .top {
      background:linear-gradient(135deg,#123763,#1f5a99);
      color:#fff;
      padding:22px 18px;
      border-bottom:5px solid var(--gold);
    }

    .top-inner {
      max-width:1100px;
      margin:auto;
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:16px;
      flex-wrap:wrap;
    }

    h1 {
      margin:0;
      font-size:26px;
      letter-spacing:.2px;
    }

    .sub {
      margin:5px 0 0;
      color:#dbe8f8;
      font-size:14px;
    }

    .badge {
      background:rgba(255,255,255,.12);
      border:1px solid rgba(255,255,255,.25);
      padding:7px 10px;
      border-radius:999px;
      font-size:12px;
      font-weight:700;
      white-space:nowrap;
    }

    main {
      max-width:1100px;
      margin:22px auto;
      padding:0 16px;
    }

    .grid {
      display:grid;
      grid-template-columns:1.1fr .9fr;
      gap:16px;
    }

    .card {
      background:var(--card);
      border:1px solid var(--line);
      border-radius:16px;
      padding:16px;
      box-shadow:0 8px 24px rgba(16,35,70,.06);
    }

    h2 {
      margin:0 0 8px;
      color:var(--blue);
      font-size:18px;
    }

    p {
      margin:7px 0;
      color:var(--muted);
      font-size:14px;
      line-height:1.45;
    }

    .actions {
      display:grid;
      grid-template-columns:repeat(2,minmax(0,1fr));
      gap:10px;
      margin-top:14px;
    }

    button, a.btn {
      display:inline-flex;
      align-items:center;
      justify-content:center;
      min-height:42px;
      padding:10px 12px;
      border-radius:12px;
      border:1px solid #c8d5e6;
      background:#fff;
      color:#173f73;
      font-weight:800;
      cursor:pointer;
      text-decoration:none;
      font-size:14px;
    }

    button.primary, a.primary {
      background:var(--blue);
      color:#fff;
      border-color:var(--blue);
    }

    button.gold, a.gold {
      background:var(--gold);
      color:#1f2a3a;
      border-color:#dc9e00;
    }

    button:hover, a.btn:hover {
      filter:brightness(.97);
    }

    .status {
      margin-top:12px;
      padding:10px;
      border-radius:12px;
      background:#f8fafc;
      border:1px solid var(--line);
      color:#334155;
      font-size:13px;
      min-height:38px;
      white-space:pre-wrap;
    }

    .small-list {
      margin:10px 0 0;
      padding:0;
      list-style:none;
      display:grid;
      gap:8px;
    }

    .small-list li {
      padding:8px 10px;
      border:1px solid var(--line);
      border-radius:12px;
      background:#fbfdff;
      font-size:13px;
      color:#3c4a5f;
    }

    .footer {
      text-align:center;
      color:#7a8798;
      font-size:12px;
      margin-top:18px;
    }

    @media(max-width:800px) {
      .grid { grid-template-columns:1fr; }
      .actions { grid-template-columns:1fr; }
      h1 { font-size:22px; }
    }
  </style>
</head>
<body>
  <header class="top">
    <div class="top-inner">
      <div>
        <h1>On Time Truckers — OTT Master</h1>
        <div class="sub">Production operations portal</div>
      </div>
      <div class="badge">CFS • Warehouse • Customer Portal</div>
    </div>
  </header>

  <main>
    <div class="grid">
      <section class="card">
        <h2>Welcome</h2>
        <p>Select your portal. If you already logged in from one of the modules, this page can also route you based on the saved user role.</p>

        <div class="actions">
          <a class="btn primary" href="./ui/operational-integration-dashboard.html">Internal Dashboard</a>
          <a class="btn gold" href="./ui/customer-portal.html">Customer Portal</a>
          <a class="btn" href="./ui/recovery-queue.html">Recovery / Driver</a>
          <a class="btn" href="./ui/warehouse-inspection.html">Warehouse</a>
          <a class="btn" href="./ui/forklift-driver-board.html">Forklift Board</a>
          <a class="btn" href="./ui/equipment-return.html">Equipment Return</a>
        </div>

        <div id="status" class="status">Ready.</div>
      </section>

      <section class="card">
        <h2>Smart Landing</h2>
        <p>This page keeps the website root clean and avoids the Render “Page not found” issue.</p>

        <div class="actions">
          <button class="primary" id="btnSmartRoute">Continue Based on Role</button>
          <button id="btnClearRoute">Clear Saved Route</button>
        </div>

        <ul class="small-list">
          <li><b>Customer</b> opens Customer Portal.</li>
          <li><b>Admin / Office / Internal</b> opens Internal Dashboard.</li>
          <li><b>Driver</b> opens Recovery / Driver.</li>
          <li><b>Warehouse</b> opens Warehouse Inspection.</li>
        </ul>
      </section>
    </div>

    <div class="footer">© On Time Truckers, Inc. — OTT Master</div>
  </main>

  <script>
    (function () {
      const ROUTES = {
        customer: "./ui/customer-portal.html",
        admin: "./ui/operational-integration-dashboard.html",
        office: "./ui/operational-integration-dashboard.html",
        internal: "./ui/operational-integration-dashboard.html",
        super: "./ui/operational-integration-dashboard.html",
        driver: "./ui/recovery-queue.html",
        warehouse: "./ui/warehouse-inspection.html",
        forklift: "./ui/forklift-driver-board.html",
        equipment: "./ui/equipment-return.html"
      };

      function status(msg) {
        const box = document.getElementById("status");
        if (box) box.textContent = msg;
      }

      function getSavedRoleText() {
        const values = [];

        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          const value = localStorage.getItem(key);

          if (!key || !value) continue;

          if (/role|profile|user|auth|portal/i.test(key)) {
            values.push(key + " " + value);
          }
        }

        return values.join(" ").toLowerCase();
      }

      function resolveRoute() {
        const text = getSavedRoleText();

        if (!text) return null;

        if (text.includes("customer")) return ROUTES.customer;
        if (text.includes("driver")) return ROUTES.driver;
        if (text.includes("warehouse")) return ROUTES.warehouse;
        if (text.includes("forklift")) return ROUTES.forklift;
        if (text.includes("equipment")) return ROUTES.equipment;
        if (text.includes("admin") || text.includes("office") || text.includes("internal") || text.includes("super")) {
          return ROUTES.admin;
        }

        return null;
      }

      document.getElementById("btnSmartRoute").addEventListener("click", function () {
        const route = resolveRoute();

        if (!route) {
          status("No saved role found yet. Please choose Customer Portal or Internal Dashboard manually.");
          return;
        }

        status("Routing to: " + route);
        window.location.href = route;
      });

      document.getElementById("btnClearRoute").addEventListener("click", function () {
        localStorage.removeItem("ottCustomerPortalMode");
        localStorage.removeItem("ottCustomerPortalAdminVerified");
        status("Saved route mode cleared.");
      });

      const route = resolveRoute();
      if (route && new URLSearchParams(location.search).get("auto") === "1") {
        window.location.href = route;
      }
    })();
  </script>
</body>
</html>
`;

fs.writeFileSync(rootIndex, html, "utf8");

console.log("PASS: Phase 13 root website entry created.");
console.log("Created: " + rootIndex);
if (fs.existsSync(backup)) console.log("Backup: " + backup);