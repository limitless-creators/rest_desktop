# Matriz de paridade funcional

| Área | Edição Windows | Evidência |
| --- | --- | --- |
| Design e navegação | Componentes React, cores, logótipos, temas e idiomas reutilizados | Capturas de telas em test-results |
| Painel | Indicadores calculados a partir da base local | Factura paga e receita no teste desktop |
| Facturas e itens | Emissão, consulta, estados e PDF; cálculos e gravação locais | Testes transaccionais e execução Electron |
| Cotações e itens | Registo, aprovação e relações comerciais locais | Navegação e serviço de documentos |
| Recibos | Pagamentos parciais/totais e ligação à factura | Testes de liquidação e stock |
| Vendas avulsas | Registo local e dedução de inventário | Testes de venda e repetição |
| Inventário | Cadastro, quantidades, preços, filtros e relatórios | Formulário real, PDF e testes de stock |
| Clientes | Cadastro e estados, criação a partir de documentos | Serviço local e navegação |
| Contactos | Cadastro/consulta local | Teste com 1.208 registos e navegação |
| Despesas | Cadastro, estados e comprovativos locais | Serviços e testes de anexos |
| Relatórios | Agregações, PDF e Excel | Exportação real no executável |
| Empresa principal/secundária | Definições, bancos, marca e perfis reutilizados | Definições locais e JSON persistido |
| Autenticação | Registo/login local, alteração de senha e recuperação offline | Testes de serviço e formulários |
| Anexos | SQLite BLOB, com isolamento por conta | Teste de acesso e restauro |
| Backups | Manual e diário; restauro por administrador | Testes de integridade, cópia e restauro |
| UFSA | Abre portal oficial externamente | Adaptação explícita para função online |
| WhatsApp/e-mail | Abrem destinos externos autorizados | Código de integração preservado |
| Actualizações | Instalador Windows completo | Pacote NSIS gerado |
| Assinatura do produtor | Limitless, Lda | Rodapé, definições, metadados e instalador |

As componentes comerciais foram reutilizadas da edição web. As adaptações específicas estão descritas em arquitectura.md. A matriz distingue funcionalidade implementada de homologação externa: consultar validacao.md antes de distribuição em produção.
