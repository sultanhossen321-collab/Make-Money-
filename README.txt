MAKE MONEY — next build

Included:
- index.html: Telegram Mini App
- admin.html / admin_supabase.html: Admin panel
- config.js: supplied Supabase URL + publishable key
- supabase/functions/telegram-auth/index.ts: secure Telegram initData validation

IMPORTANT:
1) This build does NOT collect Gmail passwords or account credentials.
2) Enable Supabase Anonymous Auth for the Mini App.
3) Deploy the telegram-auth Edge Function.
4) Set Edge Function secrets:
   TELEGRAM_BOT_TOKEN = your Telegram bot token
   SUPABASE_SECRET_KEY = your Supabase server-side secret key
   (Do NOT put either secret in browser code.)
5) The app expects the production schema with profiles, tasks, task_submissions, settings, withdrawals, admin_users and the approval RPCs.
6) Rewarded ads must use a real provider callback/verification before crediting balance.
