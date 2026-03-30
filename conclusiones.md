# Conclusiones — Prueba de carga Login FakeStore

## Resultados obtenidos

La prueba corrió durante 60 segundos a 20 TPS, generando **1201 requests** en total.

| Threshold | Criterio | Resultado | Estado |
|---|---|---|---|
| `http_req_failed` | < 3% | 0.00% | ✅ PASS |
| `http_req_duration` p(95) | < 1500 ms | 435.79 ms | ✅ PASS |
| `checks` | > 97% | 100.00% | ✅ PASS |

| Métrica HTTP | Valor |
|---|---|
| Promedio (`avg`) | 401.46 ms |
| Mínimo (`min`) | 381.26 ms |
| Mediana (`med`) | 394.44 ms |
| Máximo (`max`) | 702.04 ms |
| p(90) | 415.24 ms |
| p(95) | 435.79 ms |
| TPS efectivo | 19.88 iters/s |
| Errores HTTP | 0 de 1201 (0%) |
| Checks exitosos | 3603 de 3603 (100%) |

## Hallazgos

> ⚠️ **IMPORTANTE — Por qué el TPS reportado es 19.88 y no exactamente 20**
>
> El script tiene `rate: 20`, lo que significa que k6 lanza exactamente **20 iteraciones por segundo** durante los 60 segundos de prueba. Sin embargo, la métrica final `http_reqs` muestra **19.88 iters/s** en lugar de 20.
>
> Esto ocurre porque k6 calcula el TPS promedio dividiendo el total de iteraciones completadas entre el **tiempo total de ejecución**, que incluye el **graceful stop** (30 segundos adicionales donde k6 ya no lanza nuevas iteraciones, pero espera que las activas terminen). Esos 30 segundos "diluyen" el promedio final.
>
> **19.88 iters/s no es un incumplimiento del requisito.** Durante los 60 segundos activos, el sistema disparó exactamente 20 TPS. La diferencia de 0.12 es un artefacto de la fórmula de cálculo de k6, no una limitación del sistema bajo prueba. Por esta razón se deja `rate: 20` en el script — subir el valor solo para "inflar" la métrica reportada sería técnicamente incorrecto.

### Executor: `constant-arrival-rate` vs `constant-vus`

Se eligió `constant-arrival-rate` porque el requisito está expresado en TPS. Con `constant-vus` el throughput real depende de la latencia: si el servidor tarda más, los VUs están ocupados esperando respuesta y el TPS cae. `constant-arrival-rate` desacopla completamente el TPS de la latencia — k6 intenta lanzar exactamente 20 iteraciones por segundo sin importar cuánto tarde cada una, escalando VUs internamente hasta `maxVUs`.

### SharedArray para CSV

`SharedArray` carga el CSV una sola vez en memoria y lo comparte entre todos los VUs. Si se usara una lectura directa dentro de `default function`, cada VU haría su propia copia en memoria, lo que no escala bien con muchos VUs.

### Selección de usuarios

La selección con `__ITER % users.length` garantiza distribución uniforme round-robin entre los 6 usuarios del CSV, evitando que un solo usuario concentre toda la carga sobre el servidor (útil si hay rate-limiting por usuario).

### FakeStore API — endpoint público

FakeStore es una API pública de pruebas sin SLA garantizado. En las ejecuciones puede haber variabilidad alta en latencia dependiendo de la carga global del servicio. Si `p(95)` supera los 1500 ms, no necesariamente es un problema del script sino de la disponibilidad del servicio externo.

## Riesgos y ambigüedades detectadas

1. **API pública sin SLA**: FakeStore no garantiza disponibilidad ni latencia. Los resultados pueden variar significativamente entre ejecuciones. Para un entorno real se recomendaría apuntar a un ambiente propio o staging.

2. **Credenciales del CSV**: Las contraseñas están en texto plano en el repositorio. Para datos sensibles reales se usaría un mecanismo de secretos (variables de entorno, k6 secrets). En este caso es aceptable porque son credenciales de una API de pruebas pública.

3. **Ambigüedad en "al menos 20 TPS"**: El requisito dice "alcanzar al menos 20 TPS". Con `constant-arrival-rate` se configura exactamente 20, lo cual cumple el mínimo. Si se quisiera demostrar que el sistema soporta picos mayores, se podría usar un escenario ramped con `ramping-arrival-rate`.

4. **Duración de 1 minuto**: No existe un requisito explícito de duración. Un minuto es razonable para estabilizar métricas, pero para pruebas de soak (detectar degradación por tiempo) se necesitaría al menos 10-30 minutos.

5. **`maxVUs: 60`**: Si la latencia del servidor supera los 3 segundos de forma sostenida, k6 podría alcanzar el límite de 60 VUs y empezar a perder iteraciones. En ese escenario se vería el warning `insufficient VUs` en la salida de k6.
