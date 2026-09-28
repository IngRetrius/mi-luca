# Integración continua (pendiente de fase 0)

Flujos previstos:

1. `ci.yml`: instalación, lint, verificación de tipos, pruebas del motor (incluidas las de oro) y pruebas de base de datos con Supabase local, en cada pull request.
2. `e2e.yml`: pruebas de extremo a extremo contra el despliegue de vista previa.
3. `db-migrations.yml`: aplicación de migraciones al proyecto de producción solo desde la rama principal y con aprobación manual.
