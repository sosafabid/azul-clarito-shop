-- Defensa en la base de datos: la tienda nunca puede quedarse sin una SUPER_ADMIN activa.
-- Rechaza (con error) cualquier UPDATE o DELETE que quite el rol, desactive o borre a la ÚLTIMA
-- SUPER_ADMIN activa, venga de la aplicación, de un script o de una consulta manual.
-- No modifica ningún dato existente: solo agrega la función y el trigger.
CREATE OR REPLACE FUNCTION protect_last_super_admin() RETURNS trigger AS $$
BEGIN
  IF OLD.role = 'SUPER_ADMIN' AND OLD.is_active THEN
    IF TG_OP = 'DELETE' OR NEW.role <> 'SUPER_ADMIN' OR NOT NEW.is_active THEN
      IF NOT EXISTS (SELECT 1 FROM users WHERE role = 'SUPER_ADMIN' AND is_active AND id <> OLD.id) THEN
        RAISE EXCEPTION 'last_super_admin_protected: no se puede quitar el acceso de la unica SUPER_ADMIN activa' USING ERRCODE = 'P0001';
      END IF;
    END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE TRIGGER users_protect_last_super_admin
  BEFORE UPDATE OR DELETE ON users
  FOR EACH ROW EXECUTE FUNCTION protect_last_super_admin();
