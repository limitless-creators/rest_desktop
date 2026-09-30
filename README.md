# REST Desktop — Limitless, Lda

Aplicação de gestão comercial local para Windows x64, baseada no REST web. React/TypeScript, Electron e SQLite. Não requer Node.js, servidor ou internet no computador do cliente.

## Utilização

1. Instale o ficheiro `release/REST-Desktop-1.3.1-Setup.exe`.
2. Abra REST Desktop, crie uma conta local e guarde o código de recuperação mostrado no registo.
3. Inicie sessão e complete os dados da empresa.
4. Utilize facturas, cotações, recibos, vendas, inventário, despesas, clientes, contactos e relatórios.
5. Nas Definições, crie uma cópia de segurança e guarde-a também fora deste computador.

As cópias root e o restauro de toda a instalação são autorizados pela senha da conta atualmente aberta. A exportação do formato antigo .restbackup mantém as regras legadas. As contas seguintes têm dados comerciais separados. Cada utilizador Windows tem a sua própria pasta de dados. O login é local e não aceita automaticamente contas da edição cloud.

Os dados ficam em `%APPDATA%/REST Desktop/data/rest.sqlite`; a localização efectiva aparece nas Definições. Os comprovativos são guardados dentro da base SQLite, para assegurar que o backup inclui sempre os ficheiros correspondentes.

UFSA, WhatsApp e e-mail abrem as aplicações/sites externos e dependem dos respectivos serviços. A aplicação não sincroniza com a nuvem. A sincronização local com REST Local Android é iniciada no menu Celular; consulte docs/teste-android-1.1.0.md.

## Backups e recuperação

Versão 1.2.0: backup completo protegido por senha (.restroot) e sincronização bidirecional com anexos (.restsync). Consulte [o guia dos arquivos](docs/arquivos-1.2.0.md). O root pode ser restaurado numa instalação vazia pelo menu Arquivos, sem criar uma conta. As notas seguintes sobre .restbackup referem-se ao formato legado.


- Ficheiro `.restbackup` com a base completa, contas, logótipos e comprovativos, acompanhado por checksum SHA-256.
- Cópia automática diária no arranque e enquanto a aplicação estiver aberta; conserva as 14 cópias diárias mais recentes.
- Cópias automáticas no mesmo disco ajudam a recuperar alterações, mas uma cópia externa é necessária para recuperar após perda do disco.
- Restauro exige administrador local, confirmação e estrutura compatível; guarda uma cópia do estado anterior antes de substituir a base.
- Num computador novo, crie a primeira conta local para aceder ao restauro. Depois do restauro, use as credenciais que constavam na cópia.
- As contas protegem o acesso através da aplicação. A base não é cifrada; a protecção dos ficheiros depende da conta Windows e das permissões do disco.
- A desinstalação preserva os dados por defeito. Actualize usando um novo instalador; não copie apenas o executável.

## Desenvolvimento

Requer Node.js 24+ e Windows x64 para empacotar/testar o alvo Windows.

```powershell
npm ci
npm run lint
npm test
npm run build
npm start
npm run test:desktop
npm run dist
```

`npm run dev` serve apenas a interface para desenvolvimento; os serviços locais requerem Electron. Não há credenciais Supabase nem ficheiros .env na aplicação.

- `src/`: interface e contratos locais.
- `electron/service.cjs`: autenticação, consultas autorizadas e regras transaccionais.
- `electron/schema.cjs`: esquema SQLite versionado.
- `electron/maintenance.cjs`: backup, restauro e importação.
- `electron/worker.cjs`: execução do serviço fora do processo da interface.
- `electron/main.cjs` / `preload.cjs`: integração Windows e ponte restrita.
- `tests/`: regras de negócio, isolamento, precisão decimal e recuperação.
- `test-results/`: capturas e evidências dos testes desktop.

## Importação opcional

A importação aceita uma exportação preparada no formato documentado em [docs/importacao.md](docs/importacao.md), apenas numa conta sem dados comerciais. Não consulta nem altera a edição cloud. Palavras-passe antigas não são importadas.

## Distribuição

O instalador de desenvolvimento não tem assinatura Authenticode da Limitless, Lda. A assinatura de produção depende de um certificado/serviço de assinatura da empresa.

Consulte [docs/validacao.md](docs/validacao.md) para o estado dos testes e limitações da entrega.

Versão 1.2.1: [senha para criar o root e nomes dos celulares](docs/novidades-1.2.1.md).

Versão 1.2.2: [restauro unificado de .restroot e .restbackup](docs/novidades-1.2.2.md).

Versão 1.2.3: [restauro com confirmação da senha da conta atual](docs/novidades-1.2.3.md), sem depender da primeira conta.

Versão 1.3.0: [gestor de celulares, estados e histórico de sincronizações](docs/gestor-celulares-1.3.0.md).

Versão 1.3.1: [reautorizar celulares removidos sem substituir os dados locais](docs/reautorizar-celular-1.3.1.md). Requer mobile 1.1.2.
