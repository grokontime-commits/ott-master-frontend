const fs = require("fs");
const path = require("path");

const file = path.join(process.cwd(), "live-server", "ui", "upload-manifest-review.html");

let html = fs.readFileSync(file, "utf8");

const marker = "PHASE 17C HIDE FORCE VERIFY ONLY";

if (!html.includes(marker)) {
  html += `
<!-- PHASE 17C HIDE FORCE VERIFY ONLY -->
<style>
  #btnForceVerifyLogin {
    display: none !important;
  }
</style>
<script>
(function () {
  function removeForceVerify() {
    const btn = document.getElementById("btnForceVerifyLogin");
    if (btn) btn.remove();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", removeForceVerify);
  } else {
    removeForceVerify();
  }

  setInterval(removeForceVerify, 1000);
})();
</script>
`;
}

fs.writeFileSync(file, html, "utf8");

console.log("PASS: restored clean layout and hid Force Verify Login only.");