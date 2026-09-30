# Importação de dados existentes

Formato de entrada: ficheiro JSON UTF-8, preparado a partir de uma exportação dos dados de uma única conta cloud. Não incluir tokens, credenciais ou a tabela de autenticação.

```json
{
  "format": "rest-local-import-v1",
  "tables": {
    "contacts": [
      {
        "id": "identificador-original",
        "name": "Cliente",
        "email": "cliente@example.com",
        "created_at": "2026-09-23T10:00:00Z"
      }
    ]
  },
  "attachments": []
}
```

Tabelas permitidas: company_settings, stock_items, invoices, quotes, invoice_items, quote_items, receipts, expenses, general_sales, contacts e debt_clients.

Os nomes dos campos são os nomes SQL da referência cloud em `cloud-schema-reference.sql`. Preservar IDs, relações e seq_number. O importador atribui user_id à conta local actual e ajusta os contadores para continuar depois do maior número importado.

Exportar todos os itens de cada documento. Preservar stock_deducted nas facturas e os saldos de inventário existentes, evitando uma nova dedução ao importar documentos já pagos. Montantes devem representar os dados originais, sem conversões de moeda.

Cada comprovativo deve ter um identificador próprio e os seguintes campos no array attachments:

```json
{"id":"uuid-do-comprovativo","mime":"image/png","base64":"CONTEUDO_BASE64"}
```

O campo receipt_image_url da despesa correspondente passa a `local:uuid-do-comprovativo`. Referências remotas sem ficheiro local são rejeitadas. Limite por comprovativo: 10 MB. Limite da exportação: 200 MB / 100.000 registos.

O utilizador vê as contagens antes de confirmar. O importador detecta alterações do ficheiro entre a pré-visualização e a importação. A gravação é transaccional: uma relação inválida ou anexo em falta cancela a importação integralmente.

Depois de importar, reconciliar contagens, totais, documentos e inventário com a origem. Não houve acesso aos dados reais cloud durante o desenvolvimento.
