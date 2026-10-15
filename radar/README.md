# Business AI

App móvil (artifact de claude.ai) con el radar semanal de oportunidades para vender con IA.

- App: https://claude.ai/artifact/P1sqsPHa7qSwbqr3gXS6Zf
- `index.html` es el código de la página. Se publica con la herramienta Artifact.
- Datos (en la base de datos del artifact, no en este repo):
  - `reports/<YYYY-MM-DD>`: un reporte por semana.
  - `data/users/<id>/ideas`: ideas marcadas (interesa / haciendo / descartada). Privado.
  - `data/users/<id>/chat`: conversación con el asistente. Privado.
- Tarea programada "Radar semanal": cada lunes 7:46 (hora de Ciudad de México) investiga en la web y en lo público de TikTok, Instagram, X, Reddit y YouTube, y escribe un reporte nuevo con sección `redes`.

## Sección Juegos (morado)
- `games/<YYYY-MM-DD>`: reporte semanal de qué juegos de navegador demanda la gente.
- `data/users/<id>/ideas-juegos` y `data/users/<id>/chat-juegos`: privados.
- Tarea programada "Radar de juegos": cada lunes 8:59 (hora de Ciudad de México).

## Versión independiente (sin abrir Claude)
- Carpeta `docs/`: la misma app como web normal (PWA) para GitHub Pages.
- `docs/data/business.json` y `docs/data/juegos.json`: copia de los reportes. La tarea de cada lunes los actualiza.
- El chat sigue dentro de Claude (necesita la IA); la pestaña Hablar lo abre.
