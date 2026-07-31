# 🧽 Limpeza & Drivers

Sistema **desktop** de limpeza de disco e atualização de drivers para Windows, feito com
**Electron + React + TypeScript** (frontend) e **Java** (backend de operações do sistema).

## ⚡ Recursos

- **Turbo Update (estilo Driver Booster):** verifica todos os drivers + componentes do Windows e instala automaticamente as versões assinadas mais recentes.
- **Tela Matrix:** terminal ao vivo com "chuva de código" mostrando cada passo real da atualização.
- **Limpeza de disco** segura (temporários, cache do Windows Update, Lixeira).
- **App executável** pronto pra usar (`LimpezaDrivers.exe`) — sem precisar instalar Node/Java pra rodar.

## ▶️ Usar imediatamente (app pronto)

Executável já gerado em:

```
release/LimpezaDrivers-win32-x64/LimpezaDrivers.exe
```

Para **atualizar drivers** (precisa de administrador), use o atalho
**`Abrir como Administrador.bat`** na mesma pasta, ou clique com o botão direito no
`.exe` → *Executar como administrador*. Para só verificar/limpar, basta abrir o `.exe`.

Regerar o executável a qualquer momento:

```bash
npm run pack
```

## Por que é seguro

| Área | Como funciona |
|------|---------------|
| **Drivers** | Instalados **somente** pelo **Windows Update Agent** (`Microsoft.Update.Session`). O Windows valida a **assinatura digital / certificado (WHQL)** de cada pacote. **Nunca** baixa drivers de terceiros. |
| **Limpeza** | Apaga apenas pastas temporárias conhecidas (`%TEMP%`, `Windows\Temp`), caches do Windows Update e a Lixeira. Documentos e programas nunca são tocados. |
| **Rede** | Backend escuta só em `127.0.0.1` e exige um token de sessão gerado a cada abertura. Nada é enviado à internet. |
| **UI** | `contextIsolation` ligado, `nodeIntegration` desligado, `sandbox` ativo. |

## Arquitetura

```
Electron (main.ts)  ──spawn──►  Java backend (backend.jar, 127.0.0.1)
      │                              │ executa comandos seguros do Windows
      │ IPC (ponte preload)          │ (PowerShell, pnputil, WUA COM)
      ▼                              ▼
React + TypeScript (renderer)   pastas Temp / Lixeira / Windows Update
```

## Requisitos

- **Node.js** 18+ e **npm**
- **JDK 17+** (`java` e `javac` no PATH) — testado com JDK 21

## Rodar em desenvolvimento

```bash
npm install
npm run dev
```

O `npm run dev` compila o backend Java, sobe o Vite e abre o Electron.

## Gerar instalador (.exe)

```bash
npm run dist
```

Saída em `release/`. Para instalar drivers e limpar pastas do sistema, o instalador já
solicita **elevação de administrador** (`requireAdministrator`).

## Assinatura de código (Authenticode)

Para o Windows/SmartScreen confiar no app (sem alerta de "editor desconhecido"), assine o
`.exe` com um certificado de code signing. Com o certificado em mãos, defina as variáveis
de ambiente antes do `npm run dist`:

```bash
# PowerShell
$env:CSC_LINK="C:\caminho\meucert.pfx"
$env:CSC_KEY_PASSWORD="senha-do-certificado"
npm run dist
```

O `electron-builder` assina automaticamente o executável e o instalador (SHA-256).
Certificados EV eliminam o aviso do SmartScreen imediatamente.

## Estrutura

```
electron/         processo principal + preload (TypeScript)
src/              interface React (páginas: Painel, Limpeza, Drivers, Segurança)
java-backend/     backend Java (HTTP local, sem dependências externas)
scripts/          build do backend Java
```

## Licença

MIT — © Daniel Santos
