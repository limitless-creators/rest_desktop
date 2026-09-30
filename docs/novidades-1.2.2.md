# Windows 1.2.2 — restauro de backups

Corrigido o menu Ficheiro, que ainda filtrava apenas .restbackup.

- Ficheiro → Restaurar cópia de segurança, Arquivos → Restaurar cópia de segurança e o botão das Definições usam o mesmo fluxo.
- O filtro inicial mostra tanto .restroot como .restbackup.
- Um .restroot pede a senha do arquivo e restaura também os emparelhamentos.
- As cópias antigas .restbackup continuam a ser aceites no fluxo de restauro SQLite.
- Ficheiro → Criar cópia de segurança agora cria .restroot. A exportação antiga ficou identificada como “Criar cópia antiga (.restbackup)”.
- “Importar dados (JSON)” identifica claramente a importação de dados separada do restauro de backups.

Instale REST-Desktop-1.2.2-Setup.exe e use “Restaurar cópia de segurança” para selecionar o backup. Não é necessário mudar a extensão dos arquivos.
