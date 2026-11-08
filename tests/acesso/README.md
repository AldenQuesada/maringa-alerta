# Homologação real do primeiro acesso

Ambiente descartável com PostgreSQL/PostGIS, GoTrue real, PostgREST real e Chromium/WebKit. Usa as 37 migrações completas e o mesmo handler de produção. A confirmação de e-mail do Auth fica habilitada: o fluxo não depende de desligá-la. O transportador de e-mail é capturado no ambiente de teste e pode falhar de propósito; nenhum e-mail externo é enviado. Isso valida o fluxo e o contrato de entrega, mas não comprova credenciais nem entrega do provedor em produção.

As imagens têm versão e digest fixados. A rede Docker é interna e não publica portas. Os únicos dados são fixtures `example.invalid`. O servidor de teste disponibiliza chaves descartáveis e mensagens apenas nessa rede; nunca publicar `tests/` (o empacotador do site já exclui a pasta).

```sh
npm ci
PRA_SOMAR_DOCKER_CONTEXT=default tests/acesso/iniciar.sh
docker exec pra-somar-fase2-web npx playwright test --config=tests/acesso/playwright.config.cjs
```

Use `PRA_SOMAR_TEST_PREFIX` diferente para uma nova instalação. O script recusa implicitamente nomes existentes em vez de destruir ambientes anteriores. Ao terminar, pare os quatro contêineres `<prefix>-web`, `-rest`, `-auth` e `-db`. Os resultados ficam em `/app/.test-results/acesso/resultado.json` dentro do contêiner web.
