# Windows 1.3.0 — gestor de celulares

Abra **Celular → Gerir celulares** ou **Definições → Gerir celulares**.

## O que pode fazer
- Ver os celulares autorizados e o histórico de dispositivos removidos ou de pedidos de emparelhamento recebidos.
- Procurar pelo nome e filtrar autorizados ou removidos/pedidos.
- Consultar último contacto pela rede, última sincronização, primeiro registo e endereço do último contacto.
- Editar o nome de cada celular.
- Remover um celular com confirmação num modal próprio. A autorização é revogada, sem apagar os dados locais do celular nem o histórico no Windows. Os restantes celulares continuam autorizados.
- Adicionar um celular pelo fluxo QR existente.

## Estado da ligação
A tela atualiza os registos a cada 3 segundos.
- **Em comunicação:** existe uma operação em curso com o celular.
- **Contacto recente:** houve uma comunicação nos últimos 60 segundos enquanto o serviço local atual estava ativo.
- **Sem contacto recente:** não existe evidência recente de ligação. Isto não é uma sondagem contínua ao hotspot.
- O cabeçalho indica separadamente se o serviço de sincronização do PC está ativo ou parado.

O mobile atual comunica quando o utilizador sincroniza ou atualiza a ligação. Por isso, contacto recente não garante que o hotspot continue ligado. Uma exportação/importação de arquivo não indica presença na rede. Não é necessário atualizar o APK para usar este gestor.

## Histórico
Regista pedidos e autorizações de emparelhamento, recusas, sincronizações, falhas, conflitos, exportações/importações de arquivos, alterações de nome e remoções. A exportação de um arquivo prepara a atualização; não prova que ela já foi importada no celular.

Conserva as últimas 100 atividades por celular. O histórico detalhado começa nesta versão; os dispositivos antigos continuam a aparecer, mas datas que nunca foram registadas aparecem como “Sem registo”.

Cada conta vê apenas os seus dispositivos e respetivo histórico. Não são expostas chaves de emparelhamento nem conteúdos comerciais no gestor.

O histórico fica protegido pelo Windows em:
%APPDATA%/REST Desktop/data/mobile-history.enc

Os backups .restroot passam a incluir o histórico, juntamente com os emparelhamentos.

## Verificações
58 testes passaram, incluindo presença expirada, isolamento entre contas, retenção do histórico, revogação individual e rejeição da chave antiga na sincronização real.
TypeScript e compilação passaram. A interface foi verificada em temas claro/escuro, pesquisa, edição de nomes, cancelamento/remoção e bloqueio quando a conta muda. O fluxo de backup confirmou a recuperação do histórico e os registos de sincronização por arquivo.
