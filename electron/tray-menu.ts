// Menu de bandeja CUSTOMIZADO (tema hacker) — janela HTML no lugar do menu nativo,
// igual a Steam faz. Recebe o icone (data URL) e a versao.

export function trayMenuHtml(icon: string, version: string): string {
  return `data:text/html;charset=utf-8,` + encodeURIComponent(`
<!doctype html><html><head><meta charset="utf-8"><style>
  * { margin:0; padding:0; box-sizing:border-box; -webkit-user-select:none; }
  html,body { height:100%; background:transparent; overflow:hidden; font-family:"Consolas","Segoe UI",monospace; }
  body { display:flex; align-items:flex-end; justify-content:flex-end; padding:8px; }
  .menu {
    width:230px; background:rgba(4,12,7,.97); border:1px solid #12c04a; border-radius:12px;
    box-shadow:0 0 26px rgba(34,255,119,.28), inset 0 0 40px rgba(6,30,16,.5);
    padding:6px; color:#b6d8c4; animation:pop .12s ease both; overflow:hidden;
  }
  @keyframes pop { from { opacity:0; transform:translateY(6px) scale(.98) } to { opacity:1; transform:none } }
  .mhead {
    display:flex; align-items:center; gap:8px; padding:8px 10px 10px; color:#7dffa8;
    font-size:12px; font-weight:700; letter-spacing:1px; text-shadow:0 0 8px rgba(34,255,119,.5);
  }
  .mhead img { width:18px; height:18px; border-radius:4px; }
  .mhead span { margin-left:auto; color:#3f9d63; font-weight:400; font-size:11px; }
  .msep { height:1px; background:linear-gradient(90deg,transparent,#12c04a55,transparent); margin:4px 6px; }
  .mitem {
    display:flex; align-items:center; gap:10px; padding:9px 11px; border-radius:8px;
    font-size:13px; cursor:pointer; transition:all .1s; position:relative;
  }
  .mitem .mi { width:18px; text-align:center; font-size:14px; }
  .mitem:hover { background:rgba(34,255,119,.14); color:#eafff1; box-shadow:inset 0 0 0 1px rgba(34,255,119,.3); }
  .mitem:hover::before { content:""; position:absolute; left:0; top:6px; bottom:6px; width:2px; background:#22ff77; border-radius:2px; }
  .mitem .arrow { margin-left:auto; color:#3f9d63; font-size:11px; transition:transform .15s; }
  .mitem.danger:hover { background:rgba(255,91,91,.16); color:#ff9b9b; box-shadow:inset 0 0 0 1px rgba(255,91,91,.35); }
  .mitem.danger:hover::before { background:#ff5b5b; }
  .subprof { max-height:0; overflow:hidden; transition:max-height .2s ease; }
  .subprof.open { max-height:140px; }
  .subprof.open + .msep, .mitem.open .arrow { }
  .mitem.open .arrow { transform:rotate(180deg); }
  .mitem.sub { font-size:12px; padding:8px 11px 8px 26px; color:#8fbfa3; }
</style></head><body>
  <div class="menu">
    <div class="mhead"><img src="${icon}"/> NEXUSCLEAN <span>v${version}</span></div>
    <div class="msep"></div>
    <div class="mitem" data-a="open"><span class="mi">▸</span> Abrir painel</div>
    <div class="msep"></div>
    <div class="mitem" data-a="turbo"><span class="mi">⚡</span> Ativar Turbo FPS</div>
    <div class="mitem" data-a="clean"><span class="mi">🧹</span> Limpar temporarios</div>
    <div class="mitem" id="profBtn" data-a="toggle-prof"><span class="mi">🎮</span> Trocar perfil <span class="arrow">▾</span></div>
    <div class="subprof" id="subprof">
      <div class="mitem sub" data-a="prof-game">🎮 Modo Game</div>
      <div class="mitem sub" data-a="prof-work">💼 Modo Trabalho</div>
      <div class="mitem sub" data-a="prof-battery">🔋 Modo Economia</div>
    </div>
    <div class="msep"></div>
    <div class="mitem" data-a="update"><span class="mi">🔄</span> Verificar atualizacoes</div>
    <div class="mitem danger" data-a="quit"><span class="mi">✕</span> Sair</div>
  </div>
  <script>
    document.querySelectorAll('.mitem').forEach(function(el){
      el.addEventListener('click', function(){
        var a = el.getAttribute('data-a');
        if (a === 'toggle-prof') {
          document.getElementById('subprof').classList.toggle('open');
          document.getElementById('profBtn').classList.toggle('open');
          return;
        }
        window.api && window.api.trayAction(a);
      });
    });
  </script>
</body></html>`);
}
