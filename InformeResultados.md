# Informe de Resultados — Prueba de Carga (Ejercicio 2)

**Fecha de ejecución:** 2025-04-24
**Duración:** aproximadamente 50 minutos (01:40:00 – 02:30:00)
**Herramienta:** k6
**Datos analizados:** textSummary.txt + diagrama de monitoreo VUs/http_reqs

---

## 1. ¿Qué se probó?

Se ejecutó una prueba de carga sobre un servicio usando hasta **140 usuarios virtuales (VUs)** durante ~50 minutos. En total se realizaron **276,650 peticiones** a una velocidad promedio de **73 peticiones por segundo**.

---

## 2. ¿Se cumplieron los criterios?

| Criterio | Límite aceptable | Resultado | ¿Pasó? |
|---|---|---|---|
| Tasa de error | menos del 3% | 2.44% | ✅ Sí |
| Validaciones exitosas (checks) | más del 97% | 97.55% | ✅ Sí |
| Tiempo de respuesta p(95) | menos de 1500 ms | **1570 ms** | ❌ No |

El servicio pasó dos de los tres criterios, pero **el tiempo de respuesta superó el límite permitido**. Además, los que pasaron lo hicieron por muy poco margen (menos del 1%), lo que indica que el sistema estuvo operando cerca de su límite.

---

## 3. Tiempos de respuesta

| Métrica | Valor |
|---|---|
| Promedio | 861 ms |
| Mínimo | 191 ms |
| Mediana (50%) | 613 ms |
| p(90) — el 90% de requests tardó menos de... | 1280 ms |
| p(95) — el 95% de requests tardó menos de... | **1570 ms** ← supera el límite |
| Máximo | **29.93 segundos** |

El tiempo máximo de 29 segundos es una señal clara de que hubo momentos donde el servidor no pudo responder a tiempo.

Algo interesante: casi todo ese tiempo fue tiempo de espera a que el servidor respondiera. El tiempo de transmisión de red fue mínimo (menos de 1 ms). Esto indica que **el problema de rendimiento está en el servidor, no en la red**.

---

## 4. Errores encontrados

De las 276,650 peticiones, **6,759 fallaron** (2.44%).

| Etapa | Tipo de error | Cantidad |
|---|---|---|
| Stage 0 | Error del servidor (5xx) | 1 |
| Stage 1 | Error del cliente (4xx) | 769 |
| Stage 2 | Error del servidor (5xx) | 5,989 |
| **Total** | | **6,759** |

- En el **Stage 1** los errores 4xx pueden indicar que algunas peticiones llegaron mal formadas o que hubo problemas de autenticación durante la rampa de carga.
- En el **Stage 2** casi todos los errores son 5xx, o sea, el servidor se saturó y empezó a rechazar peticiones cuando la carga fue máxima y prolongada.
- En el **Stage 0** prácticamente no hubo errores, lo que muestra que con poca carga el sistema funciona bien.

---

## 5. Diagrama VUs / http_reqs

El diagrama muestra cómo se comportaron los usuarios virtuales y las peticiones por segundo durante la prueba.

**Fase estable (01:40 – ~01:58):**
Con 140 VUs activos, el sistema procesaba entre 75 y 100 peticiones por segundo de forma estable. En el punto marcado (02:02:00), había 140 VUs generando 82.6 req/s, lo que da aproximadamente 0.59 peticiones por segundo por cada VU — esto es coherente con un tiempo de respuesta promedio de ~861ms.

**Caída abrupta (~02:00 – 02:05):**
Se ve una caída muy marcada donde los VUs bajan casi a 0 y las peticiones también caen a 0. Esto puede indicar alguno de los siguientes eventos:
- El servidor no soportó la carga y dejó de responder temporalmente.
- Se produjo un timeout masivo de conexiones.
- Fue una etapa de bajada planificada en el escenario (ramp-down seguido de ramp-up).

Esta caída coincide con el momento donde se concentran la mayoría de los errores 5xx.

**Recuperación (02:05 – 02:30):**
El sistema volvió a estabilizarse en ~140 VUs y entre 75-100 req/s. Esto muestra que el servidor se recuperó y no quedó dañado de forma permanente.

---

## 6. Conclusiones

1. El tiempo de respuesta **no cumple el criterio**: el p(95) fue de 1570ms, superando el límite de 1500ms.
2. El **problema está en el servidor**, no en la red. Casi todo el tiempo de respuesta es tiempo de espera.
3. **Con poca carga funciona bien**, pero cuando la carga sube y se sostiene, el servidor empieza a generar errores y se vuelve lento.
4. La caída visible en el diagrama alrededor de las 02:00 es un evento importante que debería investigarse.
5. Los criterios de error y checks **pasaron por muy poco margen** — si la carga fuera un poco mayor, el sistema fallaría en todo.

---

## 7. Recomendaciones

1. Revisar qué pasó en el servidor entre las 02:00 y 02:05 (logs del servidor).
2. Investigar por qué el servidor tarda tanto en responder — puede haber consultas lentas a base de datos o procesos que bloquean la respuesta.
3. Revisar los errores 4xx del Stage 1 para asegurarse de que las peticiones están bien formadas desde el inicio.
4. Considerar agregar más capacidad al servidor si se espera manejar 140 usuarios simultáneos dentro del tiempo de respuesta permitido.
5. Repetir la prueba con una carga un poco menor para encontrar el punto donde el sistema sí cumple todos los criterios.
