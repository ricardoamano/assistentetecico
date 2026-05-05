-- ============================================================
-- NESTOR — Seed: usuário admin inicial
-- Substitua o número pelo número real do Amano
-- ============================================================

INSERT INTO authorized_users (phone, name, role, active)
VALUES
    ('5511999999999', 'Amano', 'admin', true)
ON CONFLICT (phone) DO NOTHING;

-- Para adicionar mais técnicos, use o padrão abaixo:
-- INSERT INTO authorized_users (phone, name, role, active)
-- VALUES ('5511888888888', 'Nome do Técnico', 'tecnico', true);
