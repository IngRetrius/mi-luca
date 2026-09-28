# 0002. Next.js como PWA, alojada en Vercel Pro

- Estado: Propuesta
- Fecha: 2026-09-28

## Contexto

Web mobile-first instalable, sin tiendas; conexión lenta; autenticación con Supabase en servidor y cookies (clave para la sesión en iOS); una persona opera todo. Comparación completa en `docs/02-arquitectura.md`, sección 2.

## Decisión

Next.js 16 con App Router, como PWA, alojada en Vercel en el plan Pro desde el primer despliegue que vean clientes.

## Consecuencias

- Renderizado en servidor y acciones de servidor; guía oficial de Supabase para esta combinación.
- 20 USD al mes por Vercel Pro [F11]. Hobby no se puede usar porque excluye el uso comercial [F12].
- Dependencia media de Vercel; Next.js se puede alojar en otros proveedores si hace falta.

## Alternativas consideradas

SvelteKit, una SPA en Cloudflare Pages y Next.js en servidor propio (ver la tabla de la sección 2 de la arquitectura).
