// HTML da tela de abertura (splash), embutido como data URL para funcionar
// tanto em desenvolvimento quanto no app empacotado, sem depender de caminho.

export const splashHtml = `data:text/html;charset=utf-8,` + encodeURIComponent(`
<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { height: 100%; overflow: hidden; -webkit-user-select: none; }
  body {
    font-family: "Segoe UI", system-ui, sans-serif;
    background: radial-gradient(700px 400px at 50% 0%, #0d2416 0%, #050a07 62%);
    color: #d7ffe4;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    height: 100vh; border: 1px solid #1c3a26; border-radius: 16px;
  }
  .grid {
    position: absolute; inset: 0; opacity: .35; pointer-events: none;
    background-image:
      linear-gradient(rgba(34,255,119,.10) 1px, transparent 1px),
      linear-gradient(90deg, rgba(34,255,119,.10) 1px, transparent 1px);
    background-size: 28px 28px;
  }
  .logo {
    position: relative; width: 104px; height: 104px;
    display: grid; place-items: center;
    filter: drop-shadow(0 0 16px rgba(34,255,119,.55));
    animation: pop .6s cubic-bezier(.2,.9,.3,1.4) both, float 3s ease-in-out infinite 0.6s;
  }
  @keyframes pop { from { transform: scale(.4); opacity: 0 } to { transform: scale(1); opacity: 1 } }
  @keyframes float { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-8px) } }
  h1 {
    position: relative; margin-top: 22px; font-size: 26px; font-weight: 800; letter-spacing: 2px;
    text-shadow: 0 0 14px rgba(34,255,119,.5);
  }
  h1 span { color: #22ff77; }
  .tag { position: relative; margin-top: 6px; font-size: 13px; color: #5f9070; letter-spacing: 1px; }
  .bar {
    position: relative; margin-top: 30px; width: 240px; height: 5px; border-radius: 6px;
    background: #0a130d; overflow: hidden;
  }
  .bar > i {
    position: absolute; left: -40%; width: 40%; height: 100%; border-radius: 6px;
    background: linear-gradient(90deg, transparent, #22ff77, transparent);
    animation: slide 1.1s ease-in-out infinite;
  }
  @keyframes slide { 0% { left: -40% } 100% { left: 100% } }
  .status { position: relative; margin-top: 14px; font-size: 12px; color: #3f9d63; font-family: monospace; }
  .creator {
    position: absolute; bottom: 22px; font-size: 12px; color: #5f9070;
    display: flex; align-items: center; gap: 8px;
  }
  .avatar {
    width: 26px; height: 26px; border-radius: 50%;
    background: linear-gradient(135deg, #22ff77, #00e5ff);
    display: grid; place-items: center; font-size: 11px; font-weight: 700; color: #04160b;
  }
  .creator b { color: #d7ffe4; font-weight: 600; }
</style>
</head>
<body>
  <div class="grid"></div>

  <div class="logo">
    <svg width="104" height="104" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop stop-color="#22ff77"/><stop offset="1" stop-color="#00e5ff"/>
        </linearGradient>
      </defs>
      <path d="M32 3 L56 12 V30 C56 46 45 56 32 61 C19 56 8 46 8 30 V12 Z" fill="#04160b" stroke="url(#g)" stroke-width="2.5"/>
      <g stroke="url(#g)" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 24 L30 32 L22 40" fill="none"/>
        <path d="M34 41 H43"/>
      </g>
    </svg>
  </div>

  <h1>NEXUS<span>CLEAN</span></h1>
  <div class="tag">Otimizacao &amp; Drivers · Windows</div>
  <div class="bar"><i></i></div>
  <div class="status">&gt; iniciando nucleo de seguranca...</div>

  <div class="creator">
    <span class="avatar">DSC</span>
    <span>Criado por <b>Daniel Santos Ciriaco</b></span>
  </div>
</body>
</html>
`);
