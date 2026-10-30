# QuimiConecta

Videojuego educativo web en pixel art de 16 bits sobre estructuras de Lewis y enlaces químicos, para secundaria. Es un concurso: el estudiante (icono de Messenger con su foto) responde en la pizarra central mientras el Prof. Enlace comenta cada jugada.

Son nueve preguntas en tres etapas, cada una de un punto:

1. **Reglas básicas** (preguntas 1–3): opción múltiple sobre octeto, dueto, electrones de valencia y Lewis.
2. **Construcción molecular** (preguntas 4–6): rompecabezas con Matter.js. Se construyen H₂O, CO₂ y NH₃ arrastrando átomos, soltando piezas de enlace entre ellos y añadiendo pares de electrones no compartidos.
3. **Fórmulas químicas** (preguntas 7–9): se identifica la fórmula de una estructura de Lewis dibujada.

La calificación va de S (9 puntos) a F (0–1) según la tabla del enunciado.

## Uso

```bash
npm install
npm run dev          # http://localhost:5173 (la cámara exige localhost o HTTPS)
npm test             # 37 pruebas con Vitest
npm run typecheck    # TypeScript estricto
npm run lint         # Oxlint
npm run build        # build de producción en dist/
npm run build:single # un único quimiconecta.html autocontenido
```

## Estructura

```
src/
  game/                 lógica sin interfaz
    questions/bank.ts   banco de las 9 preguntas (editar aquí)
    molecular/          moléculas, dibujo de Lewis y validador químico
    physics/            MoleculeWorld: integración con Matter.js
    grading.ts          escala S–F y calificación provisional
    session.ts          reductor de la partida (sin puntos duplicados)
    dialogue.ts         frases del científico
    layout.ts           composición del escenario (horizontal y vertical)
    photo.ts            recorte de la foto al círculo del Messenger
    avatarGeometry.ts   geometría del círculo (generada)
  components/
    screens/            inicio, instrucciones, registro, juego, resultados
    game/               HUD, marcador, etapas, tableros y rompecabezas
    characters/         científico, globo de diálogo, avatar del estudiante
    board/ chem/ ui/    pizarra, átomos, diagramas, botones e iconos pixel
  hooks/                cámara, escalado, máquina de escribir, sonido...
  audio/sound.ts        efectos y música chiptune con Web Audio
  styles/               estilos globales y carga de la fuente
  tests/                pruebas automáticas
scripts/
  prepare_assets.py     genera los assets derivados desde los originales
  inline-html.mjs       une el build en un solo HTML
```

## Assets

Los originales están en `src/assets/sprites` sin modificar: `scientist-sheet.png`, `lab-background.png`, `messenger.png` y `whiteboard-original.png`. Se renderizan con `image-rendering: pixelated`.

`scripts/prepare_assets.py` genera estos derivados sin redibujar ni suavizar píxeles:

- **`board-*.png`**: la pizarra recompuesta en 9 partes para cada formato. Las esquinas, la cuadrícula y la bandeja con el rotulador no se estiran.
- **`messenger-ring.png` y `messenger-gloss.png`**: el aro y el brillo de la cabeza del Messenger, para colocar la foto dentro del círculo original. El círculo se midió por ajuste de elipse sobre el sprite.
- **`Minecraft-ES.ttf`**: la fuente Minecraft entregada, que no tenía tildes, ñ, ü ni ¿. Esos glifos se dibujaron sobre su misma rejilla de píxeles.

Uso: `python3 scripts/prepare_assets.py <carpeta_con_las_imágenes> <carpeta_con_Minecraft.ttf>` (requiere Pillow, NumPy y fontTools).

Del spritesheet del científico se usan los retratos de hablar y parpadear (46×46; la última fila trae píxeles amarillos de la cuadrícula) y la animación de caminar en el menú.

## Construcción molecular

- Las piezas son cuerpos de Matter.js sobre una mesa sin gravedad. Al arrastrar, un muelle sigue al puntero.
- Un enlace soltado entre dos átomos se convierte en una restricción entre ellos. Mientras se arrastra, los átomos donde encajaría parpadean.
- Los pares libres orbitan su átomo. Una repulsión equilibrada entre enlaces y pares reparte la molécula como en un dibujo de Lewis, sin hacerla girar ni desplazarse.
- La corrección compara el grafo construido con el de la molécula: elementos, átomo central, tipo de cada enlace y, cuando se pide la estructura completa, pares no compartidos y reglas del octeto y del dueto. No depende de la posición en pantalla.
- La respuesta se confirma una sola vez. Si es incorrecta, se marcan en rojo las piezas a revisar, se puede ver la solución y corregir en modo práctica sin puntos.
- **Control alternativo:** toca un enlace y luego dos átomos, o un par y luego un átomo. Con teclado: Tab, Enter, flechas para mover piezas y Supr para quitar las conexiones de un átomo.

## Decisiones a revisar

- **Etapa 3:** usa CH₄, CH₂O y N₂ en lugar de repetir H₂O, CO₂ y NH₃, que el estudiante acaba de construir. Se cambia en `bank.ts`.
- **Piezas sobrantes:** las preguntas 4 y 6 incluyen un enlace doble y un par de electrones de más. Así hay que decidir, no solo colocar.
- **Proyecto base:** el zip original solo contenía el README de la plantilla `react-compiler-ts` de Vite. Se generó esa misma plantilla; la versión actual usa Oxlint en lugar de ESLint.

## Privacidad

La foto (cámara o archivo) se procesa en el navegador y solo vive en memoria durante la partida. No se envía a ningún servidor. Se puede jugar sin foto.
