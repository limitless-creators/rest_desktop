# Plano de execução — REST Desktop para Windows

Data: 23/09/2026. Estado: edição Windows implementada e instalador gerado; consultar validacao.md para evidências e homologação pendente.

## Objectivo e pressupostos

Criar uma edição independente do REST, com o mesmo design e funções comerciais da edição web, instalada no Windows e com dados guardados localmente. Manter a identificação do produtor como Limitless, Lda.

- Base do plano: um computador Windows x64, vários utilizadores locais com sessões individuais e separação dos respectivos dados, conforme o comportamento actual. Partilha de dados entre utilizadores exige uma definição própria de permissões.
- Funcionar sem internet desde a instalação e primeira configuração, incluindo autenticação, facturação, stock, relatórios e anexos.
- Entregar um instalador completo; o cliente não precisa de instalar Node.js, uma base de dados ou um servidor, nem de abrir um navegador.
- A proposta usa Electron: é uma aplicação desktop instalada, com janela e integração Windows, cuja interface React é renderizada por Chromium integrado. Não é uma reescrita em controlos WinUI/WPF.
- A edição local pode ser comercializada por licença ou subscrição, mas o modelo comercial e a activação offline são decisões separadas. Não implementar bloqueios de licença nesta primeira entrega sem uma regra comercial definida.
- Sincronização com a nuvem, aplicação móvel e utilização simultânea entre computadores não fazem parte desta primeira edição.
- Se for necessário acesso simultâneo em rede local, rever a arquitectura antes da fase 2: serviço central na LAN, autenticação e base de dados geridos pelo servidor. Não partilhar o ficheiro SQLite por uma pasta de rede.

## Diagnóstico do código actual

| Área | Implementação encontrada | Adaptação prevista |
| --- | --- | --- |
| Interface | React, TypeScript, Vite e Tailwind; componentes em `src/components` | Reutilizar telas, estilos, idiomas, temas e modelos de documentos |
| Dados | `src/lib/db.ts`, `shared/readRows.ts` e cliente Supabase | Contratos de serviços com implementação local |
| Autenticação | Supabase em `AuthView.tsx`, `App.tsx` e `src/lib/supabase.ts` | Contas, sessões e recuperação locais |
| Regras de negócio | SQL PostgreSQL em `supabase/schema.sql` e migrações | Portar explicitamente regras e transacções para serviços locais |
| Comprovativos | `src/lib/b2.ts`, funções Supabase e armazenamento remoto | Ficheiros locais associados à base de dados |
| PDF e Excel | `src/lib/pdf.ts` e `src/lib/excel.ts` | Reutilizar geração; adaptar gravação e impressão no Windows |
| Recursos externos | Google Fonts, imagem remota, UFSA e ligações WhatsApp | Empacotar recursos visuais; tratar serviços externos como funções online |
| Actualizações | `src/lib/useUpdateDetector.ts` verifica a aplicação web | Versões desktop e actualização por instalador |
| Testes | `tests/backend.test.ts` e `tests/schema.test.ts`, incluindo PGlite | Manter referência de comportamento e criar testes contra a implementação local |

Este diagnóstico é do repositório; não confirma o esquema ou os dados actualmente existentes em produção.

## Arquitectura proposta

Interface React → ponte restrita Electron → serviços locais → SQLite e pasta de anexos.

- Electron para janela, ciclo de vida, diálogos de ficheiros e impressão; electron-builder/NSIS para o instalador Windows.
- SQLite como base transaccional local. Escolher e fixar o driver após validar compatibilidade com a versão Electron e com o executável empacotado.
- Executar acesso a dados fora da interface, num processo de serviço local controlado pela aplicação; operações demoradas não podem bloquear a janela.
- Expor operações específicas na ponte, com validação de dados, sessão e propriedade dos registos. Não expor SQL, caminhos arbitrários, comandos de sistema ou APIs Node à interface.
- Manter `contextIsolation` e sandbox activos, `nodeIntegration` desactivado e uma política de conteúdo restrita. Abrir ligações externas no navegador do sistema, validando os destinos permitidos.
- Guardar dados na pasta de dados da aplicação do utilizador Windows, fora da pasta de instalação, com estrutura para base, anexos, backups e logs. O caminho final será mostrado nas definições.
- Empacotar fontes, imagens e restantes recursos necessários para reproduzir o design offline.
- Preservar identificadores e relações; representar montantes com precisão decimal definida, evitando erros de arredondamento. Quantidades e taxas precisam de escalas explícitas.

## Fases de execução

### 1. Fixar a referência e criar a edição independente

- Registar a revisão de origem e identificar alterações locais que ainda não estejam nessa revisão.
- Criar um projecto independente em `desktop_app/`, com dependências, build e documentação próprios; copiar apenas código e recursos necessários, sem `.env`, credenciais, dados de produção, `node_modules` ou artefactos antigos.
- Inventariar cada tela e acção: painel, facturas, cotações, recibos, vendas, clientes, relatórios, inventário, despesas, contactos, métricas, notícias, UFSA e definições, quando presentes.
- Registar fluxos, estados, fórmulas, filtros, limites comerciais e permissões existentes; criar uma matriz de paridade com critérios por função.
- Capturar referências visuais com dados de teste, nos dois idiomas e temas.

Aceitação: baseline identificada, matriz de paridade completa e build da edição web de referência verificado.

### 2. Criar a aplicação Windows mínima

- Configurar Electron, processo principal, preload, comunicação tipada e serviço de dados.
- Carregar o frontend empacotado sem servidor de desenvolvimento; preparar navegação, ícones, nome REST Desktop e produtor Limitless, Lda.
- Configurar instância única, encerramento limpo, registo de falhas e tratamento de ligações externas.
- Gerar cedo um instalador experimental, validando o driver SQLite no pacote real.

Aceitação: instalar e abrir numa máquina limpa, sem Node.js e sem internet, com a interface base e uma leitura/escrita local de teste.

### 3. Implementar base de dados e regras comerciais

- Criar esquema e migrações locais versionadas, relações, índices, restrições e contadores de documentos.
- Portar os comportamentos de `rest_save_document`, `rest_create_sale`, `rest_create_receipt`, `rest_apply_invoice_stock` e repetição segura de operações.
- Preservar atomicidade entre documentos, itens, pagamentos, estados e movimentos de stock, incluindo reversão integral em caso de erro.
- Garantir numeração única por âmbito, isolamento de dados e que a repetição de uma operação não desconta stock nem duplica recibos.
- Implementar serviços locais de leitura, pesquisa, filtros e relatórios, mantendo as estruturas de dados esperadas pela interface.

Aceitação: testes de regras, precisão monetária, stock insuficiente, repetição, falha intermédia e isolamento passam contra SQLite real.

### 4. Adaptar autenticação e ligar todos os módulos

- Criar configuração inicial, conta administradora local, início/fim de sessão e alteração de palavra-passe.
- Guardar palavras-passe com hash adaptativo e salt; definir recuperação offline por código de recuperação ou administrador autorizado.
- Substituir todas as chamadas directas ao Supabase por contratos locais; não basta mudar a configuração do cliente.
- Ligar todos os módulos da matriz à base local, incluindo perfis de empresa e definições. Preservar as permissões existentes e documentar qualquer adaptação necessária.
- Manter navegação, textos, estados vazios, temas, idiomas e cálculos da edição de referência.

Aceitação: todos os fluxos comerciais da matriz funcionam sem rede; contas distintas não acedem aos dados umas das outras.

### 5. Adaptar anexos, documentos e serviços externos

- Guardar comprovativos e logótipos localmente com nomes internos, validação e referências relativas; tratar falhas entre gravação do ficheiro e da base.
- Adaptar exportação PDF/Excel, escolha da pasta de destino, visualização e impressão usando os recursos Windows.
- Empacotar fontes e imagens; verificar que abrir telas e documentos não exige downloads externos.
- Preservar acesso à UFSA quando houver internet, abrindo o site externamente se a incorporação não for suportada. Sem rede, mostrar a indisponibilidade sem bloquear o sistema.
- Manter ligações WhatsApp e suporte como acções online. Não simular dados actuais de serviços externos quando estiver offline.

Aceitação: anexos continuam acessíveis após reinício; PDFs e folhas exportadas mantêm conteúdo e apresentação; indisponibilidade de internet não afecta operações locais.

### 6. Implementar backup, restauro e importação opcional

- Criar backups consistentes usando os mecanismos da base de dados e coordenação com os anexos; não copiar indiscriminadamente uma base aberta.
- Incluir base, anexos e manifesto de versão/checksums. Permitir cópia manual para disco externo e programação enquanto a aplicação estiver aberta, com execução pendente no arranque seguinte.
- Validar integridade e versão antes de restaurar; criar cópia de segurança do estado actual e substituir os dados apenas depois da validação.
- Testar restauro noutra instalação e recuperação após encerramento inesperado.
- Criar um importador opcional de exportação da edição cloud, com pré-visualização e relatório de reconciliação. A execução sobre dados reais será uma operação separada, quando os dados forem disponibilizados.
- Preservar IDs, referências, numeração, datas, estados, montantes, stock e anexos; definir novas credenciais locais em vez de presumir migração das palavras-passe Supabase.

Aceitação: backup restaurado reproduz contagens, totais, relações e anexos; importação de amostra identifica incompatibilidades sem modificar a origem.

### 7. Finalizar distribuição e actualizações

- Gerar instalador `.exe` completo, atalhos, versão e identificação Limitless, Lda.
- Permitir instalação por utilizador; confirmar permissões das pastas de dados e compatibilidade com as versões Windows declaradas como suportadas.
- Actualizar por novo instalador, preservando dados; executar backup antes das migrações e tratar falhas sem deixar uma base parcialmente migrada.
- Definir compatibilidade entre versões e recuperação a partir do backup; não assumir que uma base migrada pode ser aberta por uma versão anterior.
- Preservar dados na desinstalação por defeito, oferecendo eliminação apenas como acção explícita.
- Preparar assinatura do executável e instalador. A assinatura de produção depende de certificado/serviço de assinatura da entidade; não inventar credenciais nem prometer ausência de avisos do Windows.

Aceitação: instalação, actualização, desinstalação e reinstalação testadas com dados preservados; estado da assinatura claramente documentado.

### 8. Validar e entregar

- Executar verificações de tipos, build, testes de serviços e testes completos dos principais fluxos pela interface.
- Validar criação/edição de documentos, conversões disponíveis, pagamento parcial/total, stock, despesas, clientes, relatórios e perfis de empresa conforme a matriz de paridade.
- Comparar visualmente as telas e documentos com a referência; testar resoluções desktop e escala do Windows de 100%, 125% e 150%.
- Testar com internet desligada desde a instalação, reinício do computador, encerramento forçado, falta de espaço, anexos ausentes e operações repetidas.
- Testar volumes representativos e conjuntos com mais de 1.000 registos, verificando que relatórios não ficam truncados.
- Validar o instalador numa máquina ou VM Windows limpa, distinta do ambiente de desenvolvimento; registar evidência e qualquer bloqueio de ambiente.

Aceitação final: todos os critérios obrigatórios da matriz passam; entregar instalador, código, instruções de instalação, backup/restauro e relatório de validação com limitações conhecidas.

## Sequência e pontos de decisão

Executar as fases pela ordem indicada, registando evidências e pendências ao terminar cada uma. Não avançar com regras de negócio que falhem os testes. Actualizar este plano quando a implementação revelar diferenças relevantes.

Antes de consolidar a arquitectura, confirmar ou manter explicitamente os pressupostos: um computador versus rede local; aplicação Electron versus exigência de interface WinUI/WPF; sistemas Windows alvo; licença permanente versus subscrição; instalação vazia versus migração de dados. Os pressupostos acima permitem iniciar uma edição local de um computador sem depender de decisões comerciais.

Não fixar prazo de entrega antes de concluir o inventário e a prova do pacote Windows. A maior incerteza técnica é a fidelidade da conversão das regras PostgreSQL e dos fluxos de documentos, não a reprodução do design.

## Referências técnicas

- Electron — segurança e isolamento: https://www.electronjs.org/docs/latest/tutorial/security
- SQLite — adequação a aplicações locais: https://www.sqlite.org/whentouse.html
- SQLite — limitações de acesso directo pela rede: https://www.sqlite.org/useovernet.html
- electron-builder — instalador NSIS: https://www.electron.build/nsis/
- electron-builder — distribuição e assinatura Windows: https://www.electron.build/docs/win/
