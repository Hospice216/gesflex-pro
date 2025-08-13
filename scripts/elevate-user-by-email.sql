-- =====================================================
-- ÉLÉVATION PAR EMAIL (compatible éditeur SQL Supabase)
-- Remplacez la valeur de target_email ci-dessous puis exécutez le script.
-- =====================================================

BEGIN;

WITH params AS (
  SELECT 'change-me@example.com'::text AS target_email
),
before_state AS (
  SELECT 'AVANT'::text AS step, u.id, u.email, u.role, u.status
  FROM users u, params p
  WHERE u.email = p.target_email
),
updated AS (
  UPDATE users u
  SET role = 'Admin', updated_at = NOW()
  FROM params p
  WHERE u.email = p.target_email
    AND u.role NOT IN ('Admin','SuperAdmin')
  RETURNING u.id
)
SELECT * FROM before_state
UNION ALL
SELECT 'APRES'::text AS step, u.id, u.email, u.role, u.status
FROM users u, params p
WHERE u.email = p.target_email;

COMMIT;

-- ✅ Utilisateur élevé à Admin (si applicable)



