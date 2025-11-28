-- SQL скрипт для создания таблицы в Supabase
-- Выполните этот скрипт в SQL Editor в Supabase Dashboard

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

-- Создаем индекс для быстрого поиска (опционально)
CREATE INDEX IF NOT EXISTS idx_agent_config_updated_at ON agent_config(updated_at);

