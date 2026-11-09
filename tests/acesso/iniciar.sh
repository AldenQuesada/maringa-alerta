#!/usr/bin/env bash
# Somente infraestrutura descartável: nenhuma credencial ou pessoa de produção.
set -euo pipefail
context=${PRA_SOMAR_DOCKER_CONTEXT:-default}
docker_cmd=(docker --context "$context")
prefix=${PRA_SOMAR_TEST_PREFIX:-pra-somar-fase2}
network="$prefix-auth"
"${docker_cmd[@]}" network create --internal "$network" >/dev/null
"${docker_cmd[@]}" run -d --name "$prefix-db" --network "$network" --network-alias db -e POSTGRES_PASSWORD=teste-local-banco postgis/postgis:17-3.5@sha256:01a6a70e41e6c4467c8f55f6063555ed72db2d6662cd0d571040d42eadaeb6f6 >/dev/null
for attempt in $(seq 1 40); do
 if "${docker_cmd[@]}" exec "$prefix-db" sh -c 'test "$(cat /proc/1/comm)" = postgres && pg_isready -h 127.0.0.1' >/dev/null 2>&1; then break; fi
 sleep 1
done
"${docker_cmd[@]}" exec "$prefix-db" createdb -U postgres --template=template0 teste_acesso
"${docker_cmd[@]}" exec -i "$prefix-db" psql -U postgres -d teste_acesso -v ON_ERROR_STOP=1 < tests/acesso/bootstrap.sql >/dev/null
"${docker_cmd[@]}" run -d --name "$prefix-auth" --network "$network" --network-alias auth \
 -e GOTRUE_API_HOST=0.0.0.0 -e GOTRUE_API_PORT=9999 -e API_EXTERNAL_URL=http://127.0.0.1:8785/auth/v1 \
 -e GOTRUE_DB_DRIVER=postgres -e GOTRUE_DB_DATABASE_URL=postgres://supabase_auth_admin:teste-local-auth@db:5432/teste_acesso \
 -e GOTRUE_SITE_URL=http://127.0.0.1:8785 -e GOTRUE_URI_ALLOW_LIST='http://127.0.0.1:8785/acesso/#token=*,http://127.0.0.1:8785/acesso/?recuperar=1' \
 -e GOTRUE_JWT_SECRET=segredo-jwt-exclusivo-dos-testes-descartaveis-2026 -e GOTRUE_JWT_AUD=authenticated \
 -e GOTRUE_JWT_DEFAULT_GROUP_NAME=authenticated -e GOTRUE_JWT_ADMIN_ROLES=service_role \
 -e GOTRUE_EXTERNAL_EMAIL_ENABLED=true -e GOTRUE_MAILER_AUTOCONFIRM=false -e GOTRUE_PASSWORD_MIN_LENGTH="$(node scripts/politica-auth.mjs minimo)" \
 -e GOTRUE_DISABLE_SIGNUP="$(node scripts/politica-auth.mjs cadastroPublicoBloqueado)" \
 -e GOTRUE_SECURITY_UPDATE_PASSWORD_REQUIRE_REAUTHENTICATION="$(node scripts/politica-auth.mjs reautenticar)" -e GOTRUE_SECURITY_UPDATE_PASSWORD_REQUIRE_CURRENT_PASSWORD="$(node scripts/politica-auth.mjs exigirSenhaAtual)" \
 -e GOTRUE_SMTP_HOST=web -e GOTRUE_SMTP_PORT=2525 -e GOTRUE_SMTP_ADMIN_EMAIL=acesso@example.invalid \
 -e GOTRUE_SMTP_SENDER_NAME='Pra Somar' -e GOTRUE_SMTP_MAX_FREQUENCY=1s \
 -e GOTRUE_MAILER_TEMPLATES_INVITE=http://web:8785/supabase/templates/acesso-invite.html \
 -e GOTRUE_MAILER_TEMPLATES_MAGIC_LINK=http://web:8785/supabase/templates/acesso-magic-link.html \
 -e GOTRUE_MAILER_URLPATHS_RECOVERY=/auth/v1/verify \
 -e GOTRUE_RATE_LIMIT_EMAIL_SENT=1000 -e GOTRUE_RATE_LIMIT_TOKEN_REFRESH=1000 \
 supabase/gotrue:v2.197.0@sha256:1736a63078f5922b198c4cbe50f80ab9a2d3b54fe8b7b6cfb2e9dc5dbbc12c6b >/dev/null
for attempt in $(seq 1 40); do
 if "${docker_cmd[@]}" exec "$prefix-auth" wget -qO- http://127.0.0.1:9999/health >/dev/null 2>&1; then break; fi
 sleep 1
done
"${docker_cmd[@]}" exec "$prefix-auth" wget -qO- http://127.0.0.1:9999/health >/dev/null
# A migração inicial do Auth fornece a versão histórica; o ambiente hospedado usa claims JSON.
"${docker_cmd[@]}" exec -i "$prefix-db" psql -U postgres -d teste_acesso -v ON_ERROR_STOP=1 < tests/acesso/identidade.sql >/dev/null
for migration in supabase/migrations/*.sql; do
 "${docker_cmd[@]}" exec -i "$prefix-db" psql -U postgres -d teste_acesso -v ON_ERROR_STOP=1 < "$migration" > /tmp/pra-somar-acesso-migracao.log 2>&1 || { cat /tmp/pra-somar-acesso-migracao.log; exit 1; }
done
"${docker_cmd[@]}" exec -i "$prefix-db" psql -U postgres -d teste_acesso -v ON_ERROR_STOP=1 -c "revoke usage on schema auth from ma_escritor;insert into private.ma_convites_iniciais(email) values('administrador@example.invalid');" >/dev/null
"${docker_cmd[@]}" run -d --name "$prefix-rest" --network "$network" --network-alias rest \
 -e PGRST_DB_URI=postgres://authenticator:teste-local-api@db:5432/teste_acesso -e PGRST_DB_SCHEMAS=public -e PGRST_DB_ANON_ROLE=anon \
 -e PGRST_JWT_SECRET=segredo-jwt-exclusivo-dos-testes-descartaveis-2026 \
 postgrest/postgrest:v14.1@sha256:e9490aa503a5fb07d8e8c80da46e5c0c193894e583b59ed9077e74c4101ffae2 >/dev/null
"${docker_cmd[@]}" run -d --name "$prefix-web" --network "$network" --network-alias web --workdir /app \
 mcr.microsoft.com/playwright:v1.65.0-noble@sha256:6e3fb709361521eb27161606e6da6d2674e5e89fa16516cb37d6fdd91372273d sleep infinity >/dev/null
# Tar evita levar .git, credenciais, backups ou artefatos alheios para o ambiente de teste.
COPYFILE_DISABLE=1 tar --no-xattrs --exclude=.git --exclude=.fase0-privado --exclude=.test-results --exclude=.playwright-report --exclude=.publicacao -cf - . | "${docker_cmd[@]}" exec -i "$prefix-web" tar -xf - -C /app
"${docker_cmd[@]}" exec -d "$prefix-web" node tests/acesso/servidor.mts
printf 'Ambiente pronto: %s-web\n' "$prefix"
