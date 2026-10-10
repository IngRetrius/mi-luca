# 0034. Perfiles inactivos y borrado a pedido del cliente

- Estado: Aceptada (pedido del asesor del 09/10/2026: "mejor trabajemos con inactividad, de esta forma tenemos el backup en la base de datos; ya si el cliente quiere borrarlo, que se elimine completo"; aceptó los supuestos de G25 al decir "empieza"). Amplía la decisión del 08/10/2026 de borrar solo desde el editor SQL (punto 41 de `03-modelo-de-datos.md`).
- Fecha: 2026-10-09

## Contexto

El asesor necesita sacar de su lista a los clientes que dejan la asesoría. Hasta ahora un perfil completo solo se borraba desde el editor SQL, con `private.delete_client_data`, cuando el cliente lo pedía por correo. La base dejaba además que el asesor borrara con la API un perfil sin dueño, pero ese borrado dejaba el historial del perfil en `audit_log`, que no tiene clave foránea.

El asesor no quiere perder los datos de quien se va: si vuelve, se retoma donde quedó. La ley le da al cliente el derecho a pedir que se borren (Ley 1581, art. 8; RGPD, art. 17), y eso tiene que seguir siendo fácil.

## Decisión

- **El asesor desactiva, no borra.** `clients.inactive_at` marca desde cuándo un perfil está inactivo. Solo el asesor con acceso la cambia (guarda de columnas de criterio profesional) y la fecha la pone la base. Un perfil inactivo sale de la lista principal y pasa a la pestaña Inactivos; se ve y se edita igual, y el motor calcula igual. Se reactiva cuando el cliente vuelve.
- **Invitaciones:** al desactivar se anula la invitación pendiente, y RLS no deja invitar un perfil inactivo.
- **El cliente no nota la inactividad:** sigue entrando y viendo su plan, que es suyo.
- **El borrado completo lo pide el cliente:** desde Privacidad y datos (P-C14), de inmediato y sin plazo de gracia, o por correo, y el responsable lo ejecuta en el editor SQL como hasta ahora. Se borra el perfil con todo lo suyo, su historial, sus documentos y su cuenta de acceso. Cuando borra el cliente, sus asesores con acceso reciben el aviso "Un cliente borró su cuenta", sin el perfil ni el nombre: guardarlo contradiría el borrado.
- **Un solo camino en la base:** `public.delete_client(cliente)` acepta al dueño, o al asesor con acceso si nadie aceptó el perfil (uno creado por error), y llama a `private.delete_client_data`. Se quita el `delete` directo sobre `clients` para que ningún borrado deje historial suelto. Los documentos se borran antes con la API de Storage (ADR 0030).

## Consecuencias

- Migración `client_inactivity_deletion` con sus pruebas pgTAP. Hay que subirla al remoto antes de publicar el código: sin ella, la lista y la ficha fallan al leer `inactive_at`.
- Pantallas nuevas: Borrar perfil (P-A27, solo perfiles sin dueño) y Borrar mi cuenta (P-C14). Cambian Clientes (P-A01, pestañas e insignia "Inactivo"), la ficha (P-A03, franja de inactivo y estado del perfil), Privacidad y datos (P-C11) y Entrar (P-G01, aviso de cuenta borrada).
- Los datos de quien se va se guardan sin plazo mientras no pida borrarlos. Los avisos de privacidad vigentes ya dan el correo para pedirlo; la próxima versión dirá también que se puede desde la app.
- Inactivo no es una copia de seguridad: si se pierde la base o el cliente borra su cuenta, los datos se pierden.
- `clients.status = 'borrado_solicitado'` y `clients.deletion_requested_at` siguen sin usarse.
- El motor no cambia.

## Alternativas consideradas

- **Que el asesor borre cualquier perfil desde la ficha:** fue el primer plan; el asesor prefirió conservar los datos.
- **Plazo de gracia antes de borrar:** permite arrepentirse, pero exige una tarea programada y un estado intermedio; el servicio es informal y la confirmación basta.
- **Cliente inactivo sin acceso a la app:** cortaría el acceso a sus propios datos, que la ley le reconoce, sin una razón del asesor para hacerlo.
- **Usar `status` para la inactividad:** `status` lo pone la base según la invitación; mezclarlo perdía el estado al reactivar.
