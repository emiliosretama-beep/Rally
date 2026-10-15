# Radar Rally

App móvil (artifact de claude.ai) con el radar semanal de oportunidades para vender con IA.

- App: https://claude.ai/artifact/P1sqsPHa7qSwbqr3gXS6Zf
- `index.html` es el código de la página. Se publica con la herramienta Artifact.
- Datos (en la base de datos del artifact, no en este repo):
  - `reports/<YYYY-MM-DD>`: un reporte por semana.
  - `data/users/<id>/ideas`: ideas marcadas (interesa / haciendo / descartada). Privado.
  - `data/users/<id>/chat`: conversación con el asistente. Privado.
- Tarea programada "Radar semanal": cada lunes 7:46 (hora de Ciudad de México) investiga y escribe un reporte nuevo.
