# EDCycling — site da equipa

Next.js 15 (App Router) + Supabase (auth, Postgres, Storage), pronto para a Vercel.

- **Eventos** (`/`): calendário só para membros. Membros veem quem vai e respondem Vou / Talvez / Não vou.
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


## Login com password e convites

Não há registo público: só entra quem um admin convidar na página **Gestão → Membros**.

1. **SQL**: se já tinhas corrido o `schema.sql` antes desta versão, corre `supabase/migrations/002_convites_password.sql`.
2. **Desligar o registo público**: em *Authentication → Sign In / Providers*, desliga **Allow new users to sign up**. Os convites continuam a funcionar.
3. **Templates de email**: em *Authentication → Emails*:
   - **Invite user**: assunto "Convite para a EDCycling", corpo = `supabase/email-templates/convite.html`
   - **Reset Password**: assunto "Password nova — EDCycling", corpo = `supabase/email-templates/recuperar-password.html`
4. **Chave secreta**: em *Project Settings → API Keys → Secret keys*, copia a chave para `SUPABASE_SECRET_KEY`, no `.env` e na Vercel. Nunca lhe ponhas o prefixo `NEXT_PUBLIC_`.
5. **Site URL**: em *Authentication → URL Configuration*, mete o URL da Vercel. Os links dos emails usam esse endereço.

Quem já tinha conta (por exemplo, os admins) define a password em **Perfil → Alterar password**, ou em "Esqueci-me da password" no ecrã de entrar.


## Treinos

Separador **Treinos** (só membros): calendário com vista de mês e de semana. Clicar num dia abre o modal para criar um treino, ou um evento se fores admin. Os eventos com data aparecem no mesmo calendário.

- Cada treino pode ter um **GPX**. O site calcula no browser os km, o D+ (ignora variações abaixo de 3 m), o tempo e a média, e mostra o traçado.
- O topo do calendário soma os km e o D+ feitos no mês ou na semana visível, e também os km planeados.
- Quem criou o treino (ou um admin) pode editá-lo e apagá-lo.

**Setup:** corre `supabase/migrations/003_treinos.sql` no SQL Editor. Cria a tabela `treinos` e o bucket privado `gpx`.


## Presenças e estatísticas

- **Treinos**: cada membro responde Vou / Talvez / Não vou. Depois do treino, um admin abre **Registar presenças** e marca quem foi. Essa lista passa a ser a oficial.
- **Estatísticas** (`/estatisticas`), por época:
  - km da equipa, D+, treinos, média de atletas por treino;
  - km por mês e km por tipo de treino;
  - ranking de atletas (km, treinos, % de presença, D+, tempo, eventos), ordenável por qualquer coluna.
- **Regras**:
  - conta a lista do admin; nos treinos sem presenças registadas, conta quem disse "vou";
  - os km vêm do GPX; sem GPX, usam-se os km planeados;
  - nos eventos realizados contam os inscritos com "vou" e os km do evento.

**Setup:** corre `supabase/migrations/004_presencas_treinos.sql` no SQL Editor (depois da 003).


## Página de apresentação e privacidade

- `/` é a página pública da equipa: quem somos, números gerais (atletas, km e treinos do ano) e contacto. Os textos estão em `lib/equipa.ts`.
- **Eventos, treinos, fotos e estatísticas são só para membros.** Sem conta não se vê nenhuma data nem local, nem no site nem pela API. Os números da página pública vêm da função `resumo_publico()`, que só devolve totais.
- **Presenças**: em treinos e eventos já passados, o admin regista quem participou. Escolhe da lista de atletas ou escreve o nome de quem não tem conta. Esses nomes também entram no ranking, marcados como "sem conta".

**Setup:** corre `supabase/migrations/005_privacidade_presencas.sql`, depois da 004.

## Corrida e natação

Os treinos podem ser de **Corrida** ou **Natação**, além dos tipos de bicicleta. O ritmo aparece em min/km na corrida e em min/100 m na natação. Nas estatísticas, km e D+ contam só bicicleta; corrida e natação têm colunas próprias no ranking.

**Setup:** corre `supabase/migrations/006_corrida_natacao.sql`, depois da 005.

## Contas de gestão

Em **Gestão → Membros**, desmarca **Atleta** nas contas que só servem para gerir o site (por exemplo, o email da equipa). Essas contas continuam a poder ser admin, mas não aparecem nas presenças, no ranking nem na contagem de atletas, e não respondem "vou".

**Setup:** corre `supabase/migrations/007_contas_gestao.sql`. Já marca o `teamedcycling@gmail.com` como conta de gestão.
