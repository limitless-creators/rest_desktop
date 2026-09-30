# Decisões da edição Windows

Base: revisão web 84b0b26faed570c54af998ebd462f168e5ff2b8f, incluindo a alteração local de identificação para Limitless, Lda. Nenhum .env, segredo ou dado de produção foi copiado.

## Comunicação e isolamento

A interface mantém as telas React e usa localClient. Este adaptador conserva a estrutura de resultados esperada pelas funções existentes, mas não importa nem usa o SDK Supabase. A ponte Electron apenas expõe operações locais autorizadas. O serviço valida tabelas/campos, filtra sempre pela sessão e usa parâmetros SQL.

O processo da interface tem sandbox e contextIsolation activos, sem Node. O acesso SQLite e o hash de palavras-passe executam num worker do processo principal, para não bloquear a janela. Pedidos HTTP da interface são bloqueados; links externos autorizados abrem no sistema.

## Dados e integridade

SQLite em WAL com foreign_keys e synchronous=FULL. Montantes são armazenados como texto decimal e calculados com decimal.js, arredondamento HALF_UP, 2 casas para totais e 4 para quantidades/preços unitários. A interface recebe números compatíveis com a edição original.

As operações de documentos, vendas e recibos são transaccionais. Identificadores de pedido persistidos permitem repetir pedidos sem duplicar documentos ou movimentos de stock. A base local mantém contadores por conta e tipo de documento.

O acesso é de um computador. Não partilhar rest.sqlite por rede nem por sincronização de ficheiros em uso.

## Ajustes ao plano

- Comprovativos são BLOBs no SQLite, em vez de ficheiros separados. Esta decisão torna documentos e anexos recuperáveis por uma única cópia consistente e evita referências a ficheiros perdidos.
- SQLite fornecido pelo runtime Node do Electron, evitando instalar um servidor ou recompilar um driver nativo adicional.
- Actualizações feitas pelo instalador completo. Não existe detecção de versões web nem actualizador dependente de um servidor.
- Limites comerciais de alterações de perfil da edição cloud foram removidos, conforme o pressuposto do plano de não introduzir bloqueios de licença.
- UFSA abre no navegador do sistema; conteúdo remoto não é executado no contexto com acesso aos serviços locais.
- A primeira conta gere backups de toda a instalação; contas adicionais têm dados comerciais separados.
- O esquema inicial é a versão 1. Uma futura alteração de esquema deve acrescentar migração e backup prévio, com testes de actualização.

## Referências

- Electron, segurança: https://www.electronjs.org/docs/latest/tutorial/security
- Node, SQLite: https://nodejs.org/download/release/latest-v24.x/docs/api/sqlite.html
- SQLite, uso local: https://www.sqlite.org/whentouse.html
- electron-builder, Windows: https://www.electron.build/docs/win/
