# Templates de Exportacao

Este diretorio permite usar um arquivo modelo do Excel para preservar graficos, segmentacoes e tabelas dinamicas.

## Liberacoes Externas

- Nome esperado por padrao: `templates/liberacoes-externas-template.xlsx`
- Override por ambiente: `EXTERNAL_LIBERACOES_EXCEL_TEMPLATE`

Quando o template existe, a exportacao em `/admin/liberacoes-externas/export/excel` reutiliza as abas existentes e atualiza os dados nas abas:

- `Resumo Executivo`
- `Perfil Apto`
- `Fora do Perfil`
- `Dashboard BI`

Assim, graficos e pivots pre-configurados no template podem continuar funcionando ao abrir o arquivo no Excel.
