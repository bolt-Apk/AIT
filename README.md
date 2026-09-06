# AVI_ROND

[![Open in Bolt](https://bolt.new/static/open-in-bolt.svg)](https://bolt.new/~/sb1-ikevnvzm)

## Supabase and AI Tunnel configuration

The frontend uses these public build variables:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_SITE_URL=https://your-domain.example
```

Set them in the deployment provider before building the Docker image. They are embedded into the Vite frontend bundle; do not put private service keys in `VITE_*` variables.

The Edge Functions use the private AI Tunnel key:

```text
AITUNNEL_API_KEY
```

Set it in Supabase under **Project Settings -> Edge Functions -> Secrets**, or for local development copy `supabase/functions/.env.example` to `supabase/functions/.env` and fill in a newly issued key. The `.env` file is ignored by Git.

Never commit `AITUNNEL_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, payment keys, or other private credentials. If a key was shared in chat or committed accidentally, revoke it and issue a replacement immediately.

## Timeweb PostgreSQL

The backend connects to the external PostgreSQL instance through the Timeweb hostname with certificate verification. Configure these runtime variables in the deployment provider:

```env
POSTGRESQL_HOST=33762e7b877b54434096a3f8.twc1.net
POSTGRESQL_PORT=5432
POSTGRESQL_USER=gen_user
POSTGRESQL_PASSWORD=your-password
POSTGRESQL_DBNAME=default_db
POSTGRESQL_SSL=true
PGSSLROOTCERT=/app/certs/root.crt
```

Download the Timeweb CA certificate from `https://st.timeweb.com/cloud-static/ca.crt` and make it available at `PGSSLROOTCERT` in the backend container. The hostname must remain `33762e7b877b54434096a3f8.twc1.net`; do not replace it with the IP address when using `verify-full` certificate validation.
