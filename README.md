# Juntos+

La app de la casa: tareas que se repiten solas, calendario compartido y
recordatorios de convivencia. Hecha para una familia de cuatro.

- **`app/`** — el código (React + TypeScript + Vite).
- **`docs/`** — la app ya compilada; es lo que publica GitHub Pages.
- **`nube/`** — el esquema de la base de datos y cómo conectarla.
- **`diseno/`** — el concepto y el anteproyecto, para consultar decisiones.

## Trabajar en ella

```bash
cd app
npm install
npm run dev      # desarrollo
npm run build    # compila a ../docs
```

## Publicarla

Settings → Pages → *Deploy from a branch* → rama `main`, carpeta `/docs`.
Queda en `https://<usuario>.github.io/juntos-mas/`.

## Cómo está pensada

- Todo se guarda primero en el teléfono: la app abre y funciona sin señal.
- Una tarea se repite si tiene su palomita; si no, es de esa semana y se va.
- Hay tareas de los dos, turnos que rotan cada lunes y semanales sin día fijo.
- Los recordatorios solo los ve la persona a la que le tocan.
