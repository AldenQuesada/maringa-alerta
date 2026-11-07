#!/bin/sh
# Sempre inicializa um cluster NOVO e usa somente loopback. Nunca usa um projeto Supabase.
set -eu
PG_BIN_DIR=${PG_BIN_DIR:-/usr/local/opt/postgresql@16/bin}
TEST_PORT=${MARINGA_TEST_PORT:-55439}
TEST_ROOT=$(mktemp -d "${TMPDIR:-/tmp}/maringa-integracao.XXXXXX")
STARTED=0
finish(){ if [ "$STARTED" = 1 ]; then "$PG_BIN_DIR/pg_ctl" -D "$TEST_ROOT/data" stop -m fast >/dev/null; fi; }
trap finish EXIT
trap 'exit 130' INT TERM
export LC_ALL=C LANG=C
"$PG_BIN_DIR/initdb" -D "$TEST_ROOT/data" --username=postgres -A trust --encoding=UTF8 > "$TEST_ROOT/instalacao.log" 2>&1
"$PG_BIN_DIR/pg_ctl" -D "$TEST_ROOT/data" -l "$TEST_ROOT/servidor.log" -o "-p $TEST_PORT -h 127.0.0.1 -k $TEST_ROOT" start >/dev/null
STARTED=1
run_sql(){
 if ! "$PG_BIN_DIR/psql" -X -h 127.0.0.1 -p "$TEST_PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -f "$1" >> "$TEST_ROOT/instalacao.log" 2>&1; then
  tail -30 "$TEST_ROOT/instalacao.log";return 1
 fi
}
run_sql tests/backend/bootstrap-local.sql
for migration in supabase/migrations/*.sql;do run_sql "$migration";done
for suite in permissoes seguranca-servidor operacoes painel admin-geral integracao;do
 run_sql "tests/backend/$suite.sql"
 printf 'SQL aprovado: %s\n' "$suite"
done
MARINGA_TESTE_DESCARTAVEL=1 PGHOST=127.0.0.1 PGPORT="$TEST_PORT" PGUSER=postgres PGDATABASE=postgres PSQL="$PG_BIN_DIR/psql" python3 tests/backend/concorrencia.py
printf 'Instalação integrada aprovada. Logs: %s\n' "$TEST_ROOT"
