# Integração Front-end ↔ Back-end (Spring Boot)

## Como ligar
Em `config.js`: `USAR_DADOS_FALSOS = false` e `URL_API` com a base da API (ex.: `http://localhost:8080/api`).
Depois apague `dados-exemplo.js` e a tag `<script>` dele nas páginas. Só o login de teste (`autenticacao.js`) e os dados de exemplo deixam de valer.

## Login
`POST /auth/login` com `{ "email": "...", "senha": "..." }`
- 200: `{ "token": "<JWT>", "usuario": { "id": 1, "nome": "...", "email": "...", "perfil": "ADMIN" } }`
- 401: credenciais inválidas

Todas as outras chamadas enviam `Authorization: Bearer <token>`. Se qualquer uma responder **401**, o front volta para o login.
Usuário de teste (só com dados falsos): `admin@arecologico.com` / `123456`.

## CRUD (JSON em camelCase)
Para cada recurso: `GET /recurso` (lista completa), `POST /recurso` (201 + objeto), `PUT /recurso/{id}`, `DELETE /recurso/{id}` (204).

| Recurso | Campos |
|---|---|
| `clientes` | id, tipoCliente (FISICA, JURIDICA), nome, cpf, rg, dataNascimento, email, cnpj, telefone, cep, endereco, numero, cidade, estado |
| `funcionarios` | id, nome, cargo, pagamento |
| `contratos` | id, clienteId, descricao, tipoContrato (PMOC, MANUTENCAO_PREVENTIVA, INSTALACAO, OUTRO), dataInicio, dataFim |
| `equipamentos` | id, contratoId, marca, modelo, btus |
| `ordens-servico` | id, contratoId, funcionarioId, tipoOs (INSTALACAO, MANUTENCAO, LIMPEZA, REPARO), status (ABERTA, EM_ANDAMENTO, CONCLUIDA, CANCELADA), tipoPagamento (PIX, DINHEIRO, CARTAO, BOLETO), valor, dataAbertura, dataExecucao, descricaoProblema, descricaoExecutado, obs |
| `servicos` | id, descricao, valorServico, dataInicio, dataFim, obs |

## Detalhes que evitam dor de cabeça
- Datas no formato `yyyy-MM-dd`; valores monetários como número; `id` e chaves estrangeiras (`clienteId`, `contratoId`, `funcionarioId`) numéricos.
- Enums em MAIÚSCULAS, exatamente como acima.
- Campos vazios **não são enviados** (ex.: PF não manda `cnpj`): trate ausente como `null`.
- Habilite CORS para a origem do front (incluindo o header `Authorization`).
- Dashboard e relatórios fazem `GET` da lista completa e filtram no navegador. Se o volume crescer, vale criar endpoints de resumo.
