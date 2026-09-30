# Windows 1.2.3 — confirmar identidade no restauro

O restauro deixou de depender da primeira conta criada na instalação.

1. Entre na conta local que utiliza atualmente.
2. Abra “Restaurar cópia de segurança” em Definições, Ficheiro ou Arquivos.
3. Selecione o arquivo .restroot ou .restbackup.
4. Confirme a senha da conta atualmente aberta no modal “Confirmar identidade”.
5. Para .restroot, introduza também a senha de proteção do arquivo.
6. Reveja e confirme a substituição dos dados de toda a instalação.

Uma senha incorreta ou o cancelamento não aplicam o restauro. Antes da substituição é guardada uma cópia de segurança dos dados atuais. Após restaurar, entre com uma conta e senha existentes no backup. A senha da conta confirma a identidade; a senha do arquivo desencripta o backup e continua necessária.

Numa instalação completamente vazia não existe conta cuja identidade confirmar; o root continua a poder ser restaurado com a senha do arquivo e confirmação da substituição.

Estas alterações são apenas no Windows.
