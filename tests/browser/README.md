# Verificação da interface no navegador

Executar a partir da raiz da cópia isolada, com Node 22+, Google Chrome e Playwright disponível:

```sh
python3 -m http.server 8783 --bind 127.0.0.1
# Em outro terminal:
PLAYWRIGHT_MODULE=/caminho/para/playwright node tests/browser/verificar-interface.cjs
```

Se Playwright estiver no caminho padrão de módulos, omitir `PLAYWRIGHT_MODULE`.
`BROWSER_EVIDENCE_DIR` permite escolher a pasta de capturas e resultados (padrão `/tmp/maringa-integracao-browser-evidencias`).

O teste abre contextos Chrome novos, bloqueia service workers e requisições para `*.supabase.co` e substitui somente o cliente Supabase por uma fixture em memória. Usa os controladores, adaptador remoto, interface, CSS e Leaflet reais da cópia local. Não usa credenciais ou dados pessoais. As imagens de mapa/CDN podem ser baixadas normalmente.

A fixture testa contratos e comportamentos de interface; não comprova autenticação nem RLS do servidor. Essas verificações são realizadas separadamente por `scripts/testar-banco-isolado.sh`.

Cobre:
- cadastro, edição, recarga, exclusão e falha de gravação;
- formulário e gravação em largura móvel;
- visitante sem sessão, consulta sem mutação e rota sem permissão;
- três mapas em 1440 e 390 px;
- marcadores, filtros de estruturas, ocultar/restaurar unidades, busca, zona e localizar;
- ausência de exceções JavaScript e de tentativas de conexão ao Supabase remoto;
- ocorrência conectada: gravação, recarga, confirmação, vínculo, resolução/arquivamento, falha de gravação e acesso pelo cadastro existente.

`BROWSER_SCENARIO` permite repetir somente um cenário pelo nome. O contrato da fixture de ocorrências é extraído da migração local; a fixture não substitui os testes SQL de validação e RLS.

Fixtures nunca entram no artefato de publicação (`tests/` é excluído pelo preparador).
