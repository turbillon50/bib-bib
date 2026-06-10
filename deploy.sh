#!/usr/bin/env bash
cd /root/RideMe/apps/web || exit 1
TOK=$(grep ^VERCEL_TOKEN= /root/.env|cut -d= -f2-|tr -d '"')
NEON=$(grep ^NEON_DATABASE_URL_API= /root/.env|cut -d= -f2-|tr -d '"')
GM=$(grep ^GOOGLE_MAPS_API_KEY= /root/.env|cut -d= -f2-|tr -d '"')
RS=$(grep ^RESEND_API_KEY= /root/.env|cut -d= -f2-|tr -d '"')
export VERCEL_TOKEN=$TOK
echo "== LINK =="
vercel link --yes --project rideme --token "$TOK" 2>&1 | tail -3
echo "== ENV =="
for kv in "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=$GM" "SUPPORT_DATABASE_URL=$NEON" "DATABASE_URL=$NEON" "RESEND_API_KEY=$RS"; do
  K=${kv%%=*}; V=${kv#*=}
  for e in production preview development; do
    printf '%s' "$V" | vercel env add "$K" "$e" --token "$TOK" --force >/dev/null 2>&1
  done
  echo "set $K"
done
echo "== DEPLOY =="
vercel deploy --prod --yes --token "$TOK" 2>&1 | tail -8
echo "DEPLOY_END=$?"
