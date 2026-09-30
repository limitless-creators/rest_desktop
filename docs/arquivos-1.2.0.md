# Arquivos locais — Windows 1.2.0 / Android 1.1.0

## Backup root (.restroot)
No Windows, abra **Arquivos → Criar backup root da instalação**, ou use as Definições. Desde a versão 1.2.1, qualquer conta autenticada pode criar o backup, confirmando a senha da sua conta e definindo uma senha do arquivo com pelo menos 8 caracteres.

Inclui todas as contas locais, dados comerciais, anexos guardados na aplicação, logótipos, carimbos, numeração, configurações, histórico de sincronização e autorizações dos celulares emparelhados. O conteúdo é comprimido e cifrado com AES-256-GCM e senha derivada por scrypt. Não inclui o instalador nem ficheiros externos que não tenham sido anexados à aplicação.

Para recuperar, escolha **Arquivos → Restaurar cópia de segurança**, selecione o arquivo e indique a senha. Numa instalação vazia, pode fazê-lo antes de criar uma conta. Depois, entre com as credenciais existentes no backup. O restauro substitui os dados locais, após confirmação, e guarda uma cópia de segurança do estado anterior. Guarde a senha: não existe recuperação da senha do arquivo.

## Sincronização (.restsync)
O primeiro emparelhamento continua a ser feito por QR. Depois, a troca de arquivos dispensa hotspot ou internet; basta transferir o arquivo entre os dispositivos. Cada arquivo é cifrado para o celular emparelhado e inclui os dados e anexos necessários.

### Celular para Windows
1. No celular, abra **Sincronização com o PC → Enviar arquivo de sincronização**. A opção **Enviar Atualização** do aviso de ligação indisponível também prepara este arquivo.
2. Transfira o arquivo e, no Windows, abra **Arquivos → Importar sincronização do celular**.
3. Reveja e confirme. Guarde a resposta que o Windows oferece.
4. No celular, escolha **Importar arquivo do Windows** e importe a resposta.

As alterações do celular só deixam de estar pendentes após a confirmação do PC. Alterações feitas depois da exportação permanecem pendentes.

### Windows para celular
No Windows, escolha **Arquivos → Exportar sincronização para celular**, selecione o dispositivo e transfira o arquivo. No celular, use **Importar arquivo do Windows** e confirme. Se houver alterações locais pendentes, envie-as ao PC pelo fluxo anterior.

### Proteções e limites
- Importar novamente o mesmo arquivo não duplica dados; versões antigas são rejeitadas.
- Alterações incompatíveis no mesmo registo bloqueiam a importação inteira. Reveja os registos indicados nas duas aplicações e gere uma nova atualização.
- Uma cópia de segurança é criada antes de aplicar a importação. O root continua a ser o mecanismo de recuperação completa no Windows.
- Comprovativos locais JPEG, PNG, WebP e PDF são incluídos, até 10 MiB por anexo. Referências a comprovativos externos ou ausentes impedem a exportação, evitando backups incompletos.
- Limites: conteúdo de sincronização de 48 MiB; arquivo de sincronização de 64 MiB; base SQLite do root de 256 MiB; arquivo root de 512 MiB.
- O formato antigo .rest-mobile-backup.json não é importado por este fluxo: exporte novamente na versão atual. Os backups Windows legados .restbackup continuam disponíveis no menu Ficheiro.

## Validação
51 testes Windows passaram, incluindo o núcleo real de sincronização mobile, conflitos, repetições, adulteração, anexos, restauro e isolamento entre dispositivos. O teste da aplicação Windows empacotada confirmou criação/restauro root, manutenção dos emparelhamentos e exportação/importação/resposta com anexos.

TypeScript e exportação Expo Android passaram. A interface mobile foi revista em 390 px, temas claro e escuro, com seletores nativos simulados. Ainda é necessário testar partilha, seleção de ficheiros e importação num Android físico. Não foi gerado APK nesta revisão.

Para gerar APK a partir de rest_mobile_offline/mobile_app:
~~~powershell
npx eas-cli build --platform android --profile preview
~~~

Na versão 1.2.2, o restauro em Ficheiro, Arquivos e Definições aceita .restroot e .restbackup no mesmo seletor. A opção Importar dados (JSON) é separada.
