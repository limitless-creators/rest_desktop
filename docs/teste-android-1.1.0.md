# REST Desktop 1.1.0 — ligação ao Android

1. Feche o REST Desktop e execute REST-Desktop-1.1.0-Setup.exe no mesmo utilizador Windows. Não precisa desinstalar; a pasta de dados permanece.
2. Active o hotspot do Android e ligue o PC à rede criada pelo celular.
3. Abra o REST Desktop e entre na conta que pretende disponibilizar ao celular.
4. No menu superior, escolha **Celular → Ligar Android / mostrar QR** e seleccione a ligação Wi-Fi do hotspot.
5. Na app REST Local Android compatível, escolha **Ler QR do PC**. Confirme **Autorizar** no PC.
6. Trabalhe offline no celular. Para trocar alterações, mantenha o REST Desktop aberto, ligue ambos pelo hotspot e escolha **Sincronizar agora** no Android.

O QR expira em 10 minutos e o convite é usado uma única vez. Mostrar um novo QR na mesma sessão mantém o endereço activo. Depois de reiniciar o Windows/REST ou mudar de rede, abra novamente o menu e use **Actualizar ligação por QR** no celular já emparelhado.

O menu **Parar sincronização local** fecha a API. **Revogar celulares autorizados** retira o acesso, mantendo os dados locais do celular. Restaurar um backup revoga autorizações para evitar reutilizar intervalos de numeração antigos.

Se o Firewall do Windows solicitar autorização, permita a aplicação na rede do hotspot de confiança. A API só inicia quando o utilizador abre o menu; não precisa de internet.

## Regras desta versão de teste
- Os pedidos e respostas são cifrados e autenticados. O QR contém um segredo temporário de emparelhamento; não partilhe fotografias do QR.
- Alterações em registos diferentes são combinadas. Alterações incompatíveis no mesmo registo interrompem a sincronização inteira e preservam ambos os lados. Ainda não existe um ecrã dedicado a escolher a versão de um conflito.
- Cada celular recebe um intervalo de 1.000 números por tipo de documento. O PC passa a numerar depois do intervalo reservado. Saltos na numeração são esperados. Não há renovação automática dos intervalos nesta versão.
- Os dados são comparados por registo usando uma cópia anterior; o transporte ainda envia snapshots completos. Pedidos acima de 64 MiB são rejeitados.
- A sincronização requer a conta autorizada aberta no Windows. Se estiver desligado do celular, o PC não sabe se existem novas alterações nele.
- Não existe sincronização automática em segundo plano nem Bluetooth.

## Validação
Testes automatizados do serviço Windows com o núcleo SQLite da app mobile, e do executável Electron empacotado. O QR foi decodificado a partir dos pixels; o emparelhamento passou pela confirmação nativa; um contacto recebido apareceu na interface sem reiniciar.
A leitura pela câmara de um Android físico, permissões desse aparelho e comunicação através do hotspot físico ainda precisam de homologação. A compilação do APK não faz parte deste instalador Windows.
