#!/usr/bin/env bash
# Um banco novo de CI, sem credenciais remotas; PostGIS histórico instalado no bootstrap.
set -euo pipefail
[[ "${MARINGA_TESTE_DESCARTAVEL:-}" == 1 && "${PGDATABASE:-}" == teste_* ]] || { echo 'Use um banco descartável autorizado.'; exit 1; }
psql -X -U supabase_admin -d postgres -v ON_ERROR_STOP=1 -c "create role postgres login superuser createdb createrole inherit password 'teste-local-descartavel';"
createdb -U supabase_admin --owner=postgres --template=template0 "$PGDATABASE"
psql -X -U postgres -v ON_ERROR_STOP=1 -f tests/backend/bootstrap-local.sql
for migration in supabase/migrations/*.sql; do
 if [[ $(basename "$migration") < 20261108184654 ]]; then psql -X -U postgres -v ON_ERROR_STOP=1 -f "$migration"; fi
done
psql -X -U supabase_admin -v ON_ERROR_STOP=1 -f tests/backend/executor-hospedado.sql
psql -X -U postgres -v ON_ERROR_STOP=1 -f tests/backend/reproduzir-acl-historica.sql
for migration in supabase/migrations/*.sql; do
 if [[ $(basename "$migration") > 20261108115725_fase1_catalogo_territorial.sql ]]; then
  psql -X -U postgres -v ON_ERROR_STOP=1 -f "$migration"
  psql -X -U postgres -v ON_ERROR_STOP=1 -v versao="$(basename "$migration")" -f tests/backend/autoridade-etapa.sql
 fi
done
psql -X -U postgres -v ON_ERROR_STOP=1 -f tests/backend/autoridade.sql
PGUSER=postgres python3 tests/backend/matriz-privilegios.py
PGUSER=postgres python3 tests/backend/matriz-regressao.py
