-- «En prueba»: solo la fila «Clase de prueba ACCTKD»; sin pagos sintéticos ni historial/grado.
DELETE FROM pago AS p
USING alumno AS a
WHERE p.id_alumno = a.id_alumno AND a.estado = 'prueba';

DELETE FROM historial_grados AS h
USING alumno AS a
WHERE h.id_alumno = a.id_alumno AND a.estado = 'prueba';

UPDATE alumno SET id_grado_actual = NULL WHERE estado = 'prueba';

DELETE FROM asistencia_alumno AS aa
USING alumno AS a
WHERE aa.id_alumno = a.id_alumno AND a.estado = 'prueba'
  AND aa.observacion IS DISTINCT FROM 'Clase de prueba ACCTKD';
