# k6 Load Test — FakeStore Login

Prueba de carga sobre el endpoint de login de FakeStore API usando k6 con executor `constant-arrival-rate`.

## Tecnologías

| Herramienta | Versión |
|-------------|---------|
| k6          | v0.55.0 |
| Node.js     | no requerido (k6 corre standalone) |
| papaparse   | 5.1.1 (via jslib.k6.io) |

## Estructura

```
k6-test/
├── data/
│   └── users.csv          # credenciales de prueba
├── scripts/
│   └── login-test.js      # script principal k6
├── results/               # carpeta para outputs (JSON, HTML)
├── readme.md
└── conclusiones.md
```

## Requisitos previos

1. Instalar k6: https://grafana.com/docs/k6/latest/set-up/install-k6/

2. Verificar instalación:
   ```bash
   k6 version
   ```

## Ejecutar la prueba

```bash
k6 run scripts/login-test.js
```

## Resultados de la última ejecución

| Archivo | Descripción |
|---|---|
| [results/report.html](results/report.html) | Reporte visual HTML |
| [results/output.json](results/output.json) | Métricas raw en JSON |
| [results/console-output.txt](results/console-output.txt) | Salida de consola |

## Criterios de aceptación (thresholds)

| Métrica | Umbral |
|---|---|
| `http_req_failed` | < 3% |
| `http_req_duration` p(95) | < 1500 ms |
| `checks` | > 97% |

Si alguno de estos umbrales no se cumple, k6 retorna exit code `1`.

## Configuración del escenario

| Parámetro | Valor |
|---|---|
| Executor | `constant-arrival-rate` |
| Rate | 20 iter/s (20 TPS) |
| Duración | 1 minuto |
| preAllocatedVUs | 30 |
| maxVUs | 60 |

## Por qué `constant-arrival-rate`

Con `constant-vus` el TPS real depende de la latencia del servidor: si la API se pone lenta, el throughput cae. `constant-arrival-rate` desacopla el TPS de la latencia — k6 siempre intenta lanzar exactamente N iteraciones por segundo, creando VUs adicionales si hace falta (hasta `maxVUs`). Es el executor correcto cuando el requisito es "al menos 20 TPS".
