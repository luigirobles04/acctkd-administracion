-- Corregir colores: slot 1 = azul, slot 2 = rojo
UPDATE llave_kyorugi SET color1 = 'azul' WHERE id_linea1 IS NOT NULL;
UPDATE llave_kyorugi SET color2 = 'rojo' WHERE id_linea2 IS NOT NULL;
