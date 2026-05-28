-- Política RLS para llave_kyorugi (faltaba al crear la tabla F2)
DROP POLICY IF EXISTS "Acceso total anon" ON llave_kyorugi;
CREATE POLICY "Acceso total anon" ON llave_kyorugi FOR ALL TO anon USING (true) WITH CHECK (true);
