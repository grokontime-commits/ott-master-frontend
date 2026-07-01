const fs = require("fs");
const path = require("path");

const rootIndex = path.join(process.cwd(), "live-server", "index.html");
const backup = path.join(process.cwd(), "live-server", "index.phase16.simple-landing.bak.html");

if (!fs.existsSync(rootIndex)) {
  throw new Error("Missing live-server/index.html");
}

const current = fs.readFileSync(rootIndex, "utf8");

if (!fs.existsSync(backup)) {
  fs.writeFileSync(backup, current, "utf8");
}

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>OTT Master — Opening Dashboard</title>
  <meta http-equiv="refresh" content="0; url=./ui/operational-integration-dashboard.html" />
  <style>
    body {
      margin:0;
      min-height:100vh;
      display:flex;
      align-items:center;
      justify-content:center;
      font-family:Arial, Helvetica, sans-serif;
      background:#f5f7fb;
      color:#173f73;
    }
    .card {
      max-width:520px;
      width:calc(100% - 32px);
      background:#fff;
      border:1px solid #dce3ef;
      border-radius:18px;
      padding:24px;
      box-shadow:0 10px 30px rgba(15,23,42,.08);
      text-align:center;
    }
    h1 {
      margin:0 0 8px;
      font-size:24px;
    }
    p {
      margin:0 0 16px;
      color:#64748b;
    }
    a {
      display:inline-flex;
      align-items:center;
      justify-content:center;
      padding:10px 14px;
      border-radius:12px;
      background:#173f73;
      color:white;
      font-weight:800;
      text-decoration:none;
    }
  </style>
</head>
<body>
  <main class="card">
    <h1>OTT Master</h1>
    <p>Opening Operations Dashboard...</p>
    <a href="./ui/operational-integration-dashboard.html">Open Dashboard</a>
  </main>

  <script>
    window.location.replace("./ui/operational-integration-dashboard.html");
  </script>
</body>
</html>
`;

fs.writeFileSync(rootIndex, html, "utf8");

console.log("PASS: Phase 16 root now opens real module-card dashboard.");
console.log("Backup created: " + backup);