# Supabase Setup для хранения конфигурации агентов

## 1. Создание проекта в Supabase

1. Перейдите на [supabase.com](https://supabase.com)
2. Создайте новый проект (или используйте существующий)
3. Запишите:
   - **Project URL** (например: `https://xxxxx.supabase.co`)
   - **Anon/Public Key** (находится в Settings → API)

## 2. Создание таблицы в Supabase

Выполните следующий SQL в SQL Editor в Supabase:

```sql
-- Создаем таблицу для хранения конфигурации агентов
CREATE TABLE IF NOT EXISTS agent_config (
  id TEXT PRIMARY KEY DEFAULT 'main',
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Включаем Row Level Security (RLS)
ALTER TABLE agent_config ENABLE ROW LEVEL SECURITY;

-- Создаем политику: разрешаем всем читать и писать (для демо)
-- В продакшене можно настроить более строгие политики
CREATE POLICY "Allow public read/write access" ON agent_config
  FOR ALL
  USING (true)
  WITH CHECK (true);
```

## 3. Настройка переменных окружения

### Локально (`.env.local`):

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### На Vercel:

1. Перейдите в Settings → Environment Variables
2. Добавьте:
   - `NEXT_PUBLIC_SUPABASE_URL` = ваш Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = ваш Anon Key

## 4. Проверка

После настройки:
1. Сохраните конфигурацию в админке (`/admin`)
2. Проверьте в Supabase Dashboard → Table Editor → `agent_config`
3. Должна появиться запись с `id = 'main'` и вашей конфигурацией в поле `config`

## Важно

- Конфигурация хранится в Supabase и не теряется при обновлении проекта
- Если Supabase не настроен, система автоматически использует localStorage как fallback
- Для продакшена рекомендуется настроить более строгие RLS политики

