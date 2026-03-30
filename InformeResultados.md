# Informe de Resultados — Prueba de Carga (Ejercicio 2)

**Fecha de ejecución:** 2025-04-24
**Duración aproximada:** 50 minutos (01:40:00 – 02:30:00)
**Herramienta:** k6
**Fuente de datos:** textSummary.txt + diagrama de monitoreo VUs/http_reqs

---

## 1. Resumen ejecutivo

La prueba alcanzó un volumen de **276,650 requests** a una tasa de **73.18 req/s** con hasta **140 usuarios virtuales (VUs)**. Los criterios de aceptación se cumplieron parcialmente:

| Criterio | Umbral | Resultado | Estado |
|---|---|---|---|
| Tasa de error (`http_req_failed`) | < 3% | 2.44% | ✅ PASS |
| Checks exitosos | > 97% | 97.55% | ✅ PASS |
| Tiempo de respuesta p(95) | < 1500 ms | **1570 ms** | ❌ FAIL |

> El sistema pasa los umbrales de error y checks por márgenes muy estrechos (0.55% y 0.56% respectivamente), lo que indica operación en el límite de su capacidad.

---

## 2. Métricas de latencia

| Métrica | Valor |
|---|---|
| Promedio (`avg`) | 861.68 ms |
| Mínimo (`min`) | 191.86 ms |
| Mediana (`med`) | 613.42 ms |
| p(90) | 1280 ms |
| p(95) | **1570 ms** ← supera SLA |
| Máximo (`max`) | **29.93 s** |

La latencia de espera (`http_req_waiting`) es prácticamente idéntica a la duración total:

| Métrica | http_req_duration | http_req_waiting |
|---|---|---|
| avg | 861.68 ms | 861.21 ms |
| p(95) | 1570 ms | 1570 ms |

El tiempo de red (receiving + sending) representa menos de 0.6 ms en promedio, lo que confirma que **el cuello de botella es completamente del lado del servidor (TTFB)**, no de la red.

---

## 3. Análisis de errores

Total de requests fallidas: **6,759** (2.44% de 276,650)

| Etapa | Tipo | Cantidad | Tasa |
|---|---|---|---|
| Stage 0 | HTTP 5xx | 1 | 0.000265/s |
| Stage 1 | HTTP 4xx | 769 | 0.203409/s |
| Stage 2 | HTTP 5xx | 5,987 | 1.583625/s |
| Stage 2 | HTTP 5xx | 2 | 0.000529/s |
| **Total** | | **6,759** | |

**Interpretación:**
- Los errores 4xx en Stage 1 (769) sugieren problemas de autenticación o requests mal formados durante la rampa de carga inicial.
- La concentración de errores 5xx en Stage 2 (5,989 en total) indica **saturación del servidor bajo carga sostenida** — el servidor rechaza requests cuando el volumen es máximo.
- El Stage 0 prácticamente no genera errores, lo que confirma que el sistema funciona bien con carga baja.

---

## 4. Análisis del diagrama VUs / http_reqs

El diagrama de monitoreo muestra el comportamiento de VUs y http_reqs entre las 01:40 y las 02:30.

**Observaciones clave:**

**a) Comportamiento normal (01:40 – 01:58 aprox.):**
- VUs estables alrededor de 130-140.
- http_reqs sostenido entre 75-100/s.
- Ratio: con 140 VUs y ~82.6 req/s → **~0.59 req/s por VU**, coherente con un avg de respuesta de ~861ms (teórico máximo ≈ 1.16 req/s por VU por tiempo de espera).

**b) Caída crítica (~02:00 – 02:05):**
- Los VUs caen abruptamente desde ~140 hasta casi 0 y luego se recuperan.
- Simultáneamente, http_reqs también cae a 0.
- Posibles causas: timeout de conexión masivo, restart del servidor bajo presión, o un stage de ramp-down planificado seguido de ramp-up.
- Esta anomalía coincide con la concentración de errores 5xx en Stage 2.

**c) Recuperación (02:05 – 02:30):**
- El sistema retoma ~140 VUs y entre 75-100 req/s.
- La recuperación es estable, lo que indica que el servidor no quedó degradado permanentemente.

---

## 5. Relación VUs vs. Throughput

| Punto de tiempo | VUs | http_reqs/s | req/s por VU |
|---|---|---|---|
| 02:02:00 (pico normal) | 140 | 82.6 | 0.59 |
| Global (promedio) | ~130 | 73.18 | 0.56 |

La eficiencia por VU (~0.59 req/s) está por debajo del teórico (~1 req/s con 1s de latencia), explicado por el avg de 861ms + overhead de iteración. El sistema no escala linealmente a partir de cierto punto de VUs, señal de saturación.

---

## 6. Conclusiones

1. **El p(95) supera el SLA de 1500ms (1570ms):** el sistema no cumple el criterio de tiempo de respuesta bajo carga de 140 VUs a 73 req/s.
2. **El cuello de botella es el servidor:** prácticamente todo el tiempo de respuesta es TTFB. No hay problemas de red.
3. **Los errores se concentran en Stage 2:** la saturación bajo carga sostenida genera rechazos 5xx. El sistema maneja bien la carga inicial pero falla cuando el volumen es máximo y prolongado.
4. **La caída en el diagrama (~02:00) es un evento significativo:** posiblemente un crash/restart del backend bajo presión. Requiere investigación en los logs del servidor en ese intervalo.
5. **Márgenes de seguridad muy estrechos:** con un 2.44% de error y 97.55% de checks, el sistema opera al límite. Cualquier incremento de carga lo haría fallar todos los thresholds.

---

## 7. Recomendaciones

1. **Investigar los logs del servidor** en el intervalo 02:00–02:05 para determinar la causa de la caída de VUs.
2. **Optimizar el tiempo de procesamiento del servidor (TTFB):** revisar queries lentas, conexiones a base de datos, o lógica de negocio bloqueante.
3. **Implementar escalado horizontal o vertical:** el sistema actual no soporta 140 VUs simultáneos dentro del SLA de 1500ms.
4. **Revisar los errores 4xx en Stage 1:** validar que los datos de entrada del CSV sean correctos y que no haya problemas de autenticación al inicio de la rampa.
5. **Agregar alertas de capacidad** cuando el p(90) supere 1200ms, como señal temprana antes de llegar al límite del SLA.
6. **Ejecutar pruebas de soak** (mínimo 30 minutos estables) para detectar degradación progresiva por memory leaks o agotamiento de conexiones.
