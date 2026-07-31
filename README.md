# 🧽 NexusClean — Otimizador e Limpeza do Windows

Aplicativo **desktop** completo para manutenção, otimização e diagnóstico do Windows,
feito com **Electron + React + TypeScript** (interface) e **Java** (motor de operações do sistema).

> Criado por **Daniel Santos Ciriaco**.

---

## ✨ Recursos (18 seções)

| Área | O que faz |
|------|-----------|
| 📊 **Painel** | Hardware em tempo real: CPU, GPU (VRAM/driver), RAM, discos (SSD/HD) e rede |
| 🧹 **Limpeza** | Remove temporários, cache do Windows Update e Lixeira com segurança |
| 💽 **Disco** | Mapa de espaço (treemap), arquivos grandes, duplicados por hash e saúde do SSD (SMART) |
| 🔧 **Drivers** | Atualiza **só pelo Windows Update** (pacotes assinados/WHQL) |
| ⚡ **Turbo FPS** | Otimizações de desempenho para jogos com log ao vivo |
| 🚀 **Otimizações** | 10+ ajustes avançados + Deep Clean (DISM/WinSxS) e agendador |
| 🎮 **Perfis** | Modo Game / Trabalho / Economia com 1 clique |
| 🕹 **Roda?** | Estima se o PC roda jogos populares (GTA, Roblox…) e a quantos FPS |
| 🏆 **Pontuação** | Nota 0–100 de desempenho com detalhamento |
| 🌡 **Sensores** | Uso por núcleo da CPU, clock, voltagem e temperatura |
| 📋 **Processos** | Gerenciador estilo Task Manager (matar processo, prioridade) |
| 🚦 **Inicialização** | Ativa/desativa programas do boot e mostra o impacto |
| 🛰 **Rede** | Apps usando a internet, ping e traceroute |
| 🔔 **Alertas** | Avisos de temperatura, RAM e disco + log de eventos |
| 🛟 **Backup** | Ponto de restauração + backup de drivers/registro + reverter otimizações |
| 📄 **Relatórios** | Relatório técnico completo em PDF ou HTML |
| ☠ **Modo Hacker** | Varredura de diagnóstico + terminal PowerShell integrado |
| 🛡 **Segurança** | Telemetria, firewall, serviços, SFC e mais |

## 🔒 Segurança em primeiro lugar

- **Drivers:** instalados apenas pelo **Windows Update Agent** — só pacotes assinados/WHQL. Nunca de terceiros.
- **Limpeza / Disco:** operações somente leitura ou em pastas descartáveis conhecidas. O app **nunca apaga** seus arquivos por conta própria.
- **Rede:** backend local (`127.0.0.1`) protegido por token de sessão. Nada é enviado para a internet.
- **Reversível:** otimizações e alterações podem ser desfeitas (backup + reverter).

## 🖥️ Tecnologias

- **Electron** — janela desktop + integração com o sistema
- **React + TypeScript** — interface
- **Java** (JDK puro, sem dependências) — backend HTTP local que executa operações do Windows
- **PowerShell / WMI / pnputil / DISM** — comandos do sistema

## ▶️ Rodar em desenvolvimento

Requisitos: **Node.js 18+** e **JDK 17+** (java/javac no PATH).

```bash
npm install
npm run dev
```

## 📦 Gerar o executável

```bash
npm run pack
```

Saída: `%USERPROFILE%\NexusClean-App\LimpezaDrivers-win32-x64\LimpezaDrivers.exe`

Para instalar drivers e otimizar, o app se abre como **Administrador** automaticamente
(ou use o atalho *Abrir como Administrador.bat*).

## 📂 Estrutura

```
electron/         processo principal + preload (TypeScript)
src/              interface React (páginas de cada seção)
java-backend/     backend Java (HTTP local, sem dependências)
scripts/          build do backend e empacotamento
```

## 📄 Licença

MIT © Daniel Santos Ciriaco
