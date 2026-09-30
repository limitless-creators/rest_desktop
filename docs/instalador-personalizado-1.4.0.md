# Instalador REST Desktop 1.4.0

O novo wizard usa a identidade visual do REST e mantém o motor NSIS do electron-builder.

## Experiência

- Boas-vindas com logótipo, azul escuro e detalhes dourados.
- Escolha da pasta e opções de instalação preservadas.
- Quatro telas reais com dados fictícios: painel, facturação, inventário e resultados.
- Transição automática aproximadamente a cada 5 segundos durante a instalação.
- Barra ligada ao progresso nativo do NSIS; não existe atraso artificial na versão de produção.
- Recursos visuais incluídos no executável. Não precisam de internet.
- Na página de conclusão, o REST abre automaticamente como utilizador normal. A rotina impede abertura duplicada.
- Instalação silenciosa, falha/cancelamento e necessidade de reiniciar não provocam abertura automática pela página final.
- Configuração de dados locais, appId, actualização e atalhos mantida. A instalação não inclui os dados fictícios das capturas.

## Gerar e manter

`npm run dist` gera o instalador a partir dos recursos já incluídos no projeto.

`npm run installer:assets` recria as capturas e artes numa base de demonstração isolada.
`npm run installer:ui` recria os modelos de diálogo ampliados usando o NSIS 3.0.4.1 da cache do electron-builder (aceita NSIS_HOME).

`powershell -File scripts/test-installer.ps1` compila e executa os ensaios nativos. São usados executáveis simulados e pastas únicas em .smoke-data, sem registo de instalação nem alteração dos atalhos ou dos dados do utilizador. Também gera test-results/REST-Installer-Preview.exe para revisão manual do wizard.

## Verificação em 30/09/2026

- TypeScript, Vite e compilação NSIS: passaram.
- 63 testes da aplicação: passaram.
- Aplicação empacotada 1.4.0: início de sessão, documentos, stock e navegação offline passaram, sem pedidos externos.
- Rotina nativa de abertura: modos silencioso/reinício não abrem; execução normal abre exactamente uma vez.
- Slideshow nativo: indicador muda de cor entre slides enquanto a secção de instalação decorre.
- Capturas de demonstração revistas como imagens.
- A revisão visual interactiva completa do wizard ficou pendente: o serviço de controlo nativo do computador não estava disponível. Os ensaios automatizados não substituem a revisão em diferentes escalas de DPI.
- A instalação existente do utilizador não foi substituída durante estes testes.

## Entrega

release/REST-Desktop-1.4.0-Setup.exe — 114937755 bytes.

SHA-256: fbe57f97e8618f50fae4d953c42029a20671aedd88264fd3c4592b03100de686

Fontes principais: build/installer.nsh; scripts/installer-assets.cjs; scripts/installer-ui.cjs.
