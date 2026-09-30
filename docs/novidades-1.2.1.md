# Windows 1.2.1 — senha do backup e nomes dos celulares

## Criar uma cópia completa
Qualquer conta com sessão iniciada pode criar o root em Definições → Criar backup root ou Arquivos → Criar backup root da instalação.
No formulário:
1. Confirme a **senha da conta** atualmente aberta.
2. Defina e repita a **senha do backup**, que protegerá o arquivo .restroot e será necessária para o restaurar.

Senha incorreta ou cancelamento não geram a cópia. O backup continua a incluir toda a instalação, incluindo as outras contas e os emparelhamentos. O restauro numa instalação já configurada mantém a exigência de administrador; numa instalação vazia continua disponível antes de criar conta.

## Identificar celulares
Ao autorizar um novo emparelhamento QR, indique um nome, por exemplo “Celular da loja”.
Para editar celulares já adicionados, abra **Celular → Os meus celulares / editar nomes**.
Ao exportar uma sincronização, um modal próprio da aplicação apresenta os nomes, permite editá-los e escolher o destino.
A seleção da rede do hotspot também utiliza um modal próprio da aplicação.
Os nomes ficam guardados no Windows e acompanham o backup root. Não é necessário atualizar o APK para estas alterações.

## Validação
52 testes passaram; TypeScript e compilação passaram. Incluem autorização do root por senha de conta comum, rejeição de senha incorreta/ausente, ausência de sessão e preservação de nomes durante emparelhamentos e reinício.
Teste de interface com dados isolados verifica os formulários de senha e seleção de celular, persistência do nome, backup/restauro e troca de arquivos com anexos.
