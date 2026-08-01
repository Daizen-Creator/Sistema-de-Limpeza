// Notificacao CUSTOMIZADA (toast) no tema hacker — janela HTML no canto da tela,
// no lugar da notificacao nativa do Windows. Igual a Steam faz.

const esc = (s: string) =>
  String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));

export function toastHtml(title: string, body: string, icon: string): string {
  return `data:text/html;charset=utf-8,` + encodeURIComponent(`
<!doctype html><html><head><meta charset="utf-8"><style>
  * { margin:0; padding:0; box-sizing:border-box; -webkit-user-select:none; }
  html,body { height:100%; background:transparent; overflow:hidden; font-family:"Consolas","Segoe UI",monospace; }
  body { display:flex; align-items:center; padding:6px; }
  .toast {
    position:relative; width:100%; display:flex; gap:12px; align-items:center;
    background:linear-gradient(120deg, rgba(6,24,13,.98), rgba(4,12,7,.98));
    border:1px solid #12c04a; border-left:3px solid #22ff77; border-radius:11px;
    padding:12px 14px; box-shadow:0 6px 28px rgba(0,0,0,.5), 0 0 22px rgba(34,255,119,.25);
    overflow:hidden; animation:slide .32s cubic-bezier(.2,.9,.3,1.3) both;
  }
  @keyframes slide { from { transform:translateX(120%); opacity:0 } to { transform:none; opacity:1 } }
  .toast::after {
    content:""; position:absolute; inset:0; pointer-events:none;
    background:repeating-linear-gradient(rgba(0,0,0,0) 0 2px, rgba(0,0,0,.18) 3px);
    mix-blend-mode:multiply;
  }
  .ic {
    width:40px; height:40px; border-radius:9px; flex-shrink:0; object-fit:cover;
    border:1px solid #1c5a3a; box-shadow:0 0 10px rgba(34,255,119,.35);
  }
  .txt { flex:1; min-width:0; z-index:1; }
  .ttl { color:#6dffa0; font-size:13px; font-weight:800; letter-spacing:.5px; text-shadow:0 0 8px rgba(34,255,119,.5);
         white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .bdy { color:#a8d4bb; font-size:12px; margin-top:2px; line-height:1.35; }
  .brand { position:absolute; top:8px; right:12px; font-size:9px; color:#2e7d4f; letter-spacing:1px; z-index:1; }
  .bar { position:absolute; left:0; bottom:0; height:2px; background:linear-gradient(90deg,#22ff77,#00e5ff); width:100%;
         transform-origin:left; animation:drain 5s linear forwards; }
  @keyframes drain { from { transform:scaleX(1) } to { transform:scaleX(0) } }
</style></head><body>
  <div class="toast">
    <img class="ic" src="${icon}"/>
    <div class="txt">
      <div class="ttl">${esc(title)}</div>
      <div class="bdy">${esc(body)}</div>
    </div>
    <div class="brand">NEXUSCLEAN</div>
    <div class="bar"></div>
  </div>
</body></html>`);
}
