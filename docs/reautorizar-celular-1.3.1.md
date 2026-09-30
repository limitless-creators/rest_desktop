# Reautorizar um celular removido — Windows 1.3.1 / mobile 1.1.2

Instale Windows 1.3.1 e gere/instale o APK mobile 1.1.2 por cima da aplicação existente, sem limpar os dados.

1. Ative o hotspot e ligue o PC.
2. Entre no Windows na mesma conta à qual o celular estava associado.
3. Abra Celular → Ligar Android / mostrar QR (ou Adicionar celular no gestor).
4. No mobile, abra Sincronização com o PC → Ler QR / autorizar novamente.
5. Se a autorização anterior foi revogada, aparece o modal “Autorizar novamente este celular?”. Toque em Solicitar autorização.
6. Confirme a autorização e o nome no Windows.
7. No mobile, toque em Sincronizar agora.

## Preservação dos dados
A reautorização troca a chave de acesso e atualiza a revisão do protocolo. Não substitui a base local, o estado base da sincronização, os anexos, os contadores nem as alterações pendentes. Os números dos documentos existentes são preservados. A sincronização posterior continua a bloquear conflitos sem sobrescrever os registos.

A conta do Windows deve corresponder à do celular. O PC valida a identidade anterior e os intervalos de numeração. Pedidos recusados, QR de outra conta e intervalos incompatíveis não substituem os dados do telefone.

O gestor mantém o histórico e regista “Celular autorizado novamente; sincronização pendente”. Remoções feitas no gestor da versão 1.3.0 são suportadas, mesmo sem os intervalos no histórico, mediante validação dos intervalos reservados e ausência de sobreposição com outros celulares autorizados.

Se a resposta se perder, gere outro QR e repita a autorização. Se o Windows for antigo, a app pede a atualização antes de enviar o pedido. Arquivos .restsync anteriores usam a chave revogada; exporte novos arquivos depois de autorizar novamente.

## Validação
63 testes Windows/protocolo passaram, incluindo o núcleo real mobile: documentos, anexos, numeração, pendências, recusa, conta diferente, intervalos incompatíveis, conflito e repetição após resposta perdida.
TypeScript e exportação Android passaram. O modal foi revisto em React Native Web nos temas claro/escuro, com serviços nativos simulados. A leitura da câmara e o armazenamento seguro ainda requerem validação num Android físico. APK não gerado nesta revisão.

A partir de rest_mobile_offline/mobile_app:
    npx eas-cli build --platform android --profile preview
