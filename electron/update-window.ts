// Tela de "Atualizando" (tema hacker) mostrada enquanto a nova versao baixa e instala.
// O main atualiza o progresso via webContents.executeJavaScript(setProgress(...)).

export const updateWindowHtml = `data:text/html;charset=utf-8,` + encodeURIComponent(`
<!doctype html><html><head><meta charset="utf-8"><style>
  * { margin:0; padding:0; box-sizing:border-box; -webkit-user-select:none; }
  html,body { height:100%; overflow:hidden; }
  body {
    font-family:"Consolas","Segoe UI",monospace; color:#d7ffe4;
    background:radial-gradient(700px 400px at 50% 0%, #0d2416 0%, #050a07 62%);
    border:1px solid #1c3a26; border-radius:16px;
    display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh;
  }
  .grid { position:absolute; inset:0; opacity:.3; pointer-events:none;
    background-image:linear-gradient(rgba(34,255,119,.10) 1px,transparent 1px),linear-gradient(90deg,rgba(34,255,119,.10) 1px,transparent 1px);
    background-size:28px 28px; }
  .logo { position:relative; filter:drop-shadow(0 0 16px rgba(34,255,119,.55)); animation:float 3s ease-in-out infinite; }
  @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
  h1 { position:relative; margin-top:18px; font-size:22px; font-weight:800; letter-spacing:2px; text-shadow:0 0 14px rgba(34,255,119,.5); }
  h1 span { color:#22ff77; }
  .status { position:relative; margin-top:8px; font-size:13px; color:#7dffa8; letter-spacing:1px; }
  .barwrap { position:relative; margin-top:24px; width:300px; height:8px; background:#0a130d; border-radius:6px; overflow:hidden; border:1px solid #1c3a26; }
  .bar { height:100%; width:0%; background:linear-gradient(90deg,#22ff77,#00e5ff); box-shadow:0 0 12px rgba(34,255,119,.6); transition:width .3s ease; }
  .pct { position:relative; margin-top:10px; font-size:13px; color:#22ff77; font-weight:700; }
  .sub { position:relative; margin-top:6px; font-size:11px; color:#3f9d63; }
  .indet .bar { width:35% !important; animation:indet 1.1s ease-in-out infinite; }
  @keyframes indet { 0%{margin-left:-35%} 100%{margin-left:100%} }
</style></head><body>
  <div class="grid"></div>
  <div class="logo">
    <svg width="88" height="88" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="g" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse"><stop stop-color="#22ff77"/><stop offset="1" stop-color="#00e5ff"/></linearGradient></defs>
      <path d="M32 3 L56 12 V30 C56 46 45 56 32 61 C19 56 8 46 8 30 V12 Z" fill="#04160b" stroke="url(#g)" stroke-width="2.5"/>
      <g stroke="url(#g)" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M22 24 L30 32 L22 40" fill="none"/><path d="M34 41 H43"/></g>
    </svg>
  </div>
  <h1>NEXUS<span>CLEAN</span></h1>
  <div class="status" id="status">Verificando atualizacao...</div>
  <div class="barwrap indet" id="barwrap"><div class="bar" id="bar"></div></div>
  <div class="pct" id="pct"></div>
  <div class="sub">Nao feche o aplicativo — ele reiniciara sozinho.</div>
  <script>
    window.setProgress = function(pct, status){
      var bw = document.getElementById('barwrap');
      var st = document.getElementById('status');
      var pc = document.getElementById('pct');
      if (status) st.textContent = status;
      if (pct == null || pct < 0) { bw.classList.add('indet'); pc.textContent=''; }
      else { bw.classList.remove('indet'); document.getElementById('bar').style.width = pct + '%'; pc.textContent = pct.toFixed(0) + '%'; }
    };
  </script>
</body></html>`);
