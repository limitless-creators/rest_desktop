# Validação — REST Desktop 1.0.0

Data: 23/09/2026. Ambiente: Windows x64, build 26200; Node 24.19.0 para ferramentas de desenvolvimento; Electron 44.4.5 no executável.

## Verificações concluídas

- TypeScript: `npm run lint` passou.
- Compilação Vite: passou. Permanece o aviso de tamanho do bundle principal; não é um erro de compilação.
- 18 testes de serviços passaram: autenticação/recuperação, persistência, isolamento de contas, precisão decimal, pagamentos parciais e totais, excesso de pagamento, falha de stock, operações repetidas, documentos pagos, conversão de cotação inválida, nomes de stock ambíguos, numeração, leitura de 1.208 registos, anexos, backup/restauro, cópia corrompida, backup diário e importação.
- Executável empacotado iniciou com os recursos incluídos no ASAR e base própria. Factura, recibo e inventário foram gravados através da ponte Electron.
- Navegação: painel, facturas, cotações, recibos, vendas, clientes, relatórios, stock, despesas, contactos e definições abriram no executável.
- Nenhum erro JavaScript nem pedido HTTP/HTTPS foi detectado no teste de navegação. As fontes e imagens necessárias estão incluídas no pacote.
- Registo, login, cadastro de stock e emissão de factura paga foram testados pelos formulários da aplicação instalada; a factura reduziu o stock de 12 para 10 unidades.
- PDF de factura/modelo, relatório PDF de stock e Excel foram gerados pelo executável; ficheiros não vazios e assinaturas de formato verificadas.
- Temas claro/escuro e português/inglês foram exercitados; foram capturadas imagens em zoom 100%, 125% e 150%. Zoom Electron não substitui testes de DPI físico do Windows.
- Instalador NSIS executado numa pasta de teste: código de saída 0. Reinstalação da mesma versão: código 0, com dados preservados e reabertura confirmada. Desinstalação temporária: código 0; executável e registo removidos.
- Reabertura pela aplicação instalada: login local, factura anterior e stock persistido confirmados.

Evidências locais em `test-results/`: capturas PNG, PDFs, Excel e relatórios `packaged-smoke.log`, `packaged-ui.log`, `installed-ui.log` e `restart.log`. São dados fictícios; a pasta não integra o instalador.

## Artefacto

`release/REST-Desktop-1.0.0-Setup.exe`

Tamanho: 114.312.024 bytes. SHA-256:

```text
31c51385a650bc282d415fd738c07d2d9ad90c0241644bd37df4de491d2fc6f3
```

Estado Authenticode verificado: **NotSigned**. O instalador funcional não possui assinatura digital da empresa.

## Limites desta validação

- Os testes de instalação foram realizados neste computador de desenvolvimento, com pastas e bases isoladas. Ainda é necessária homologação numa máquina/VM Windows limpa e no hardware do cliente.
- Não houve ensaio de corte físico de energia, disco cheio real ou impressão numa impressora física.
- Comparação visual feita por inspecção das telas e reaproveitamento dos componentes; não houve comparação automatizada pixel a pixel com uma sessão cloud de produção.
- A importação foi testada com uma amostra sintética. A migração e reconciliação dos dados reais cloud dependem da disponibilização da exportação.
- Windows 11 x64 foi o ambiente disponível. Outras versões/arquitecturas não foram homologadas.
- A base de dados não é cifrada. Os backups contêm todos os dados e contas da instalação.
- Não há sincronização cloud, serviço de rede local, actualização remota automática nem activação comercial de subscrição nesta versão.
- As contas locais não reproduzem as palavras-passe cloud. A recuperação usa o código local fornecido no registo.

A edição web original não foi modificada durante este desenvolvimento.

## Verificação adicional sem acesso à internet

O executável distribuído foi testado com HTTP/HTTPS da sessão direccionado para um proxy local inacessível, sem desligar a rede do computador. Uma tentativa de ligação confirmou `ERR_PROXY_CONNECTION_FAILED`. Com essa indisponibilidade, passaram os formulários de registo, login, cadastro de stock, emissão de factura paga, exportação PDF/Excel e reabertura dos dados após encerramento. Evidências: `test-results/offline-ui.log` e `test-results/offline-restart.log`.

Os testes podem ser repetidos definindo `REST_TEST_OFFLINE=1` e `REST_SMOKE_EXE` para o executável empacotado. UFSA, WhatsApp e e-mail são serviços externos e continuam a depender de internet; a gestão comercial e os dados permanecem locais. Esta verificação não exigiu alteração do instalador entregue.
## Correcção offline — versão 1.0.1 (23/09/2026)

O ensaio anterior bloqueava HTTP/HTTPS, mas não reproduzia navigator.onLine=false nem o evento offline do Windows. Por isso não detectou o modal herdado da edição web. A confirmação anterior de funcionamento offline era incompleta.

Removidos do App.tsx o estado de conectividade, os listeners online/offline e o modal bloqueador. A versão Windows usa os serviços locais independentemente do Wi-Fi. A edição cloud permanece separada.

O teste scripts/ui-flows.cjs agora inicia com navigator.onLine=false, confirma ausência do modal, alterna online/offline e executa registo, login, cadastro de stock, emissão de factura paga e exportações PDF/Excel com a rede da sessão bloqueada. O teste detectou o erro no executável 1.0.0 e passou no executável empacotado 1.0.1. Evidência: test-results/offline-1.0.1-ui.log. Não se desligou fisicamente o Wi-Fi deste computador.

Validação: TypeScript, 18 testes da base de dados, build de produção, empacotamento NSIS e fluxo completo da interface sem erros.

Instalador: release/REST-Desktop-1.0.1-Setup.exe
Tamanho: 114311325 bytes.
SHA-256: 3ded5c886146894654477fa17070690f81b7bea08a30b3afc1e63cfa968c420e

Actualização: fechar REST Desktop e executar o instalador 1.0.1 no mesmo utilizador Windows. Não é necessário desinstalar; a pasta de dados mantém-se. A instalação existente do utilizador não foi alterada durante estes testes.
## Diagnóstico da criação de facturas — versão 1.0.2

A camada de dados descartava o erro do serviço local e a interface mostrava apenas "Falha ao criar factura". Agora a mensagem original chega ao utilizador, sem o prefixo técnico da chamada Electron, mantendo os campos para correcção e nova tentativa.

Testes da interface numa base isolada, offline: formulário completo com factura paga; formulário lateral com facturas pendente e vencida para cliente existente; ausência de itens; stock insuficiente; confirmação de que a tentativa rejeitada não grava uma factura; correcção da quantidade e nova submissão com sucesso. TypeScript e build passaram. Evidência: test-results/invoice-diagnostic-ui.log.

A causa exacta do caso relatado pelo utilizador ainda depende do texto detalhado do erro e dos dados preenchidos. Esta alteração corrige a perda do diagnóstico; não altera as regras de stock nem permite documentos inválidos. Não houve alterações à base real do utilizador.
Executavel empacotado 1.0.2: mesmos testes aprovados (test-results/invoice-1.0.2-ui.log). Instalador NSIS concluido. SHA-256: b1216755c58f7f6d101a342cb1a9bf4f87147f5de1789e4cb41d953e956a86bf

## Windows 1.1.0 — QR e sincronização local (26/09/2026)

Implementado o menu Celular: gerar QR, parar API local e revogar dispositivos. Confirmação nativa no PC, chave por dispositivo protegida pelo Windows e mensagens cifradas. QR com validade de 10 minutos e convite de uso único. Intervalos de numeração reservados por dispositivo.

Corrigidos durante a validação: mostrar novo QR preserva o endpoint activo; a conta é revalidada após a aprovação; a interface actualiza os dados recebidos; o restauro encerra a API e revoga autorizações antigas; documentos existentes não podem mudar de número.

Validação concluída:
- TypeScript e build de produção.
- 27 testes aprovados: 18 de regras comerciais/manutenção e 9 de sincronização usando o núcleo SQLite mobile.
- QR decodificado a partir dos pixels no executável empacotado.
- Emparelhamento cifrado com confirmação do menu nativo, recepção de contacto visível na interface, repetição sem duplicados e encerramento da API.
- Teste da aplicação empacotada sem acesso HTTP/HTTPS e com estado offline: registo, login, stock, facturas pendentes/pagas/vencidas, mensagens de validação, PDF e Excel.
- Bases de teste isoladas; a instalação e os dados reais do utilizador não foram alterados.

Evidências: test-results/tests-1.1.0.log, qr-packaged-1.1.0.log, offline-packaged-1.1.0.log, package-1.1.0.log; imagens windows-qr-1.1.0.png e windows-sync-contact-1.1.0.png.

Limites: sem Android físico ligado; a câmara e a ligação através de hotspot real ainda não foram homologadas. Conflitos são detectados e bloqueados, mas não existe ainda ecrã dedicado para os resolver. A sincronização usa snapshots completos e limite de pedido de 64 MiB. Consulte docs/teste-android-1.1.0.md.

Instalador: release/REST-Desktop-1.1.0-Setup.exe
Tamanho: 114572696 bytes.
SHA-256: 72d43817eb71d60f3034f327f055703f307b7dc406dcf7c03a9d05759f11ece3
Authenticode: NotSigned.
## Vendas Hoje — versão 1.1.1

Corrigida a divergência do dashboard: a contagem usava todas as facturas pagas, enquanto o valor usava apenas vendas gerais do dia.
O valor e a contagem agora consideram as mesmas operações: vendas gerais com data de hoje e facturas pagas com data de emissão de hoje. Recibos não são somados, para não contar novamente o pagamento da mesma factura. Facturas pendentes/vencidas e outras datas não entram no total. O dia é determinado pelo calendário local do computador; os valores são somados com precisão decimal.

TypeScript e 31 testes aprovados. Inclui regressão do card renderizado: 50 MT de venda geral + 150 MT de factura paga = 200 MT, 2 transacções.
Executavel Windows empacotado validado com base de dados isolada: total 200 MT, 2 transaccoes; facturas antigas e pendentes excluidas. Evidencias: test-results/sales-packaged-1.1.1.log e test-results/sales-today-1.1.1.png.
Instalador: release/REST-Desktop-1.1.1-Setup.exe (114582988 bytes).
SHA-256: 528e153bac3f24db074df22a392183eb8e4e4bba2fb658c53d72bf033d6988fa

## UFSA — versão 1.1.2

Reposto o portal em iframe dentro da aplicação. Sem acesso à rede, a área UFSA mostra aviso centralizado e botão Tentar novamente. Verifica disponibilidade ao entrar, a cada 30 segundos e ao recuperar a ligação. Respostas de erro do portal têm mensagem própria. As restantes funções continuam locais.

Mantidos sandbox e isolamento do Electron; o iframe não recebe a ponte de dados locais. A política de rede e CSP permite apenas HTTPS nos dois hosts UFSA (ufsa.gov.mz e www.ufsa.gov.mz). Não são removidos cabeçalhos de segurança do servidor.

Validação: TypeScript, compilação e 33 testes aprovados. Teste Electron com rede simulada cobriu entrada offline, repetição, perda de ligação, recuperação, indisponibilidade do portal e ausência de acesso do iframe à ponte local. Aviso verificado visualmente em test-results/ufsa-offline-1.1.2.png. Neste ambiente o portal real respondeu HTTP 403; não foi possível homologar os anúncios reais ou a navegação interna. Evidências: test-results/ufsa-1.1.2.log e test-results/ufsa-packaged-1.1.2.log.

Instalador: release/REST-Desktop-1.1.2-Setup.exe
SHA-256: 83e8f45e2ca2f7fb7050b0c8369033593ea331a53c6986f4d89e4322ba8b3335

## Gráficos financeiros — versão 1.1.3

Substituídos os gráficos de barras/linhas anteriores das métricas por duas linhas interactivas, com preenchimento discreto, escala monetária, guia vertical e valores exactos em MT. Rato consulta, clique fixa a selecção, teclado permite consultar os pontos. Layout adaptado à largura da janela e aos temas claro/escuro.

Até 31 dias: pontos diários, incluindo dias sem movimentos. Períodos maiores: agregação mensal. Mantido o critério financeiro anterior do gráfico (valores facturados por data de emissão e despesas por data); indicado no rodapé para evitar confusão com recebimentos. Os restantes indicadores e exportações não foram alterados.

Validação: TypeScript, compilação, 37 testes aprovados. Teste Electron com base isolada: hover, clique persistente, setas/Home/End, alteração de período e verificação visual dos temas. Evidências: test-results/chart-1.1.3.log, chart-desktop-light-1.1.3.png e chart-desktop-dark-1.1.3.png.

Executavel empacotado validado: test-results/chart-packaged-1.1.3.log.
Instalador: release/REST-Desktop-1.1.3-Setup.exe
SHA-256: 6b067dd1fed23b20257f47693de0a80cbcdd43a0aececdfa756785a0bcea33b0

## Correcções de produtos e UFSA — versão 1.1.4

As listas Mais Vendidos/Menos Vendidos já existiam, mas fetchInvoices não carregava os itens das facturas. A leitura agora inclui todas as páginas dos itens locais da conta e associa cada linha à sua factura; a criação também preserva os itens no estado imediato da interface. Sem alteração dos documentos guardados ou do critério das métricas.

UFSA: endereço https://www.ufsa.gov.mz/. Corrigida a validação que recusava respostas HTTP 200 do Electron quando response.url vinha vazio. Mantida a restrição de rede aos hosts UFSA e aplicada identificação Chromium apenas aos pedidos desse portal para compatibilidade. Não foram removidos cabeçalhos de segurança do site.

Validação: TypeScript, build e 40 testes aprovados; regressões para mais de 100 itens, associação por factura, quantidades numéricas, criação imediata e resposta HTTP sem URL. Teste Electron comprovou listas de produtos e carregamento real do UFSA no iframe, com isolamento da ponte de dados locais. Evidências: test-results/fixes-1.1.4.log, products-1.1.4.png, ufsa-live-1.1.4.png.

Executavel empacotado: rankings 8/4/2 e 2/4/8 confirmados; portal real e navegacao para concursos.php validados. Activacao DOM do link usada no teste Electron oculto. Evidencia: test-results/fixes-packaged-1.1.4.log.
Instalador: release/REST-Desktop-1.1.4-Setup.exe
SHA-256: 5f79d8d5550bd9956e637a6574b1b20ce475f5b5856db43950b1ce59d418439c

## Versão 1.2.0 — arquivos completos e sincronização

- 51 testes passaram; TypeScript e build Vite passaram.
- Teste de UI na aplicação fonte e empacotada passou: root, restauro, emparelhamentos, troca de arquivos e anexos.
- Mobile: TypeScript, 10 testes e exportação Android passaram; revisão visual em React Native Web, com diálogos nativos simulados, passou. Teste em Android físico pendente.
- Evidências: test-results/tests-1.2.0.log, archives-ui-1.2.0.log, archives-packaged-1.2.0.log, mobile-archives-ui-1.1.0.log e capturas archives-mobile-*.png.
- Instalador: REST-Desktop-1.2.0-Setup.exe (114592362 bytes). SHA-256: 039a08e74eeae4f94acb22deba88c7f9014cd7a906fc9a770d5349cc6ed20e02.

## Versão 1.2.1
- 52 testes passaram; TypeScript e build passaram.
- Teste da aplicação empacotada passou: senha da conta e do backup, root/restauro, anexos, seleção customizada, nome persistido, reabertura da gestão de celulares e cancelamento sem gravar.
- Capturas: test-results/root-password-1.2.1.png e device-selector-1.2.1.png.
- Instalador: REST-Desktop-1.2.1-Setup.exe, 114594591 bytes.
- SHA-256: 436f7966db551f1c6803016629b3723b166ca6996a862ffe5a3062cd35ab0434.