# EDCycling — site da equipa

Next.js 15 (App Router) + Supabase (auth, Postgres, Storage), pronto para a Vercel.

- **Eventos** (`/`): calendário público. Membros veem quem vai e respondem Vou / Talvez / Não vou.
- **Fotos** (`/fotos`): feed privado da equipa. As fotos são reduzidas no browser antes do upload.
- **Gestão** (`/gestao`): só admins. Criar e editar eventos, aprovar contas, dar role de admin, grelha "quem vai a quê".
- **Entrar** (`/entrar`): login sem password, com magic link por email. Contas novas ficam *pendentes* até um admin aprovar.

## 1. Supabase (≈5 min)

1. Cria um projeto em https://supabase.com (região **EU West**).
2. **SQL Editor → New query**: cola `supabase/schema.sql` e corre. Depois faz o mesmo com `supabase/seed.sql`, que carrega os 6 passeios de 2027.
3. **Authentication → URL Configuration**:
   - Site URL: `https://<o-teu-projeto>.vercel.app`
   - Redirect URLs: `https://<o-teu-projeto>.vercel.app/auth/callback` e `http://localhost:3000/auth/callback`
4. **Project Settings → API**: copia o `Project URL` e a `anon public key`.

## 2. Correr localmente

```bash
cp .env.example .env.local   # e cola as duas chaves
npm install
npm run dev                  # http://localhost:3000
```

## 3. Vercel

1. Faz push desta pasta para um repositório GitHub.
2. Em https://vercel.com: **Add New → Project**, escolhe o repositório (deteta Next.js sozinho).
3. Em **Environment Variables**, adiciona `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
4. Clica em **Deploy**.
5. Se o URL final for diferente do que puseste no passo 1.3, atualiza o Supabase com o URL certo.

## 4. Tornar-te admin

Entra uma vez no site com o teu email. Depois, no SQL Editor do Supabase:

```sql
update public.perfis set role = 'admin' where email = 'o-teu-email@exemplo.com';
```

A partir daí aprovas os membros e escolhes outros admins no separador **Gestão**.

## Domínio próprio (opcional)

Na Vercel: **Project → Settings → Domains → Add** (ex.: `edcycling.pt`). Segue as instruções de DNS e depois atualiza o Site URL e os Redirect URLs no Supabase.

## Notas

- **Emails de login**: o plano gratuito do Supabase limita o envio a poucos emails por hora. Para a equipa toda, liga um SMTP em *Authentication → Emails → SMTP Settings* (Resend, Brevo, etc.).
- **Segurança**: está toda nas regras RLS (`schema.sql`). Só admins escrevem eventos, cada membro só gere a sua inscrição, e as fotos são privadas, servidas por URLs assinados que expiram em 1 hora.
