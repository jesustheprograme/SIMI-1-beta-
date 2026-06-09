# Lectura Siemens S7

## Objetivo

El alcance real es hacer lecturas de datos desde un PLC Siemens en futuras implementaciones reales.

## Archivos

| Archivo | Que se realiza ahi |
| --- | --- |
| `src/drivers/siemensS7Protocol.js` | Lee variables Siemens S7 con `nodeS7` usando direcciones como `DB1,REAL0`, `DB1,INT4`, `DB1,X6.0`, `M0.0` o `MW10`. |
| `src/drivers/IndustrialDriver.js` | Selecciona el driver segun `protocol`. Para Siemens usa `siemens-s7` solo en lectura. |
| `config/plcs.json` | Define IP, rack, slot, puerto 102 y la lista de tags Siemens. |

## Recomendacion

Para empezar facil en Node/React/Backend se usa `nodeS7`. El backend hace polling periodico sobre direcciones configuradas del PLC y entrega los valores al runtime existente.

Para probar sin PLC real se recomienda `python-snap7` como servidor simulado. Ese servidor expone DBs con valores de prueba y el backend Node los lee como si fueran un PLC.

## Requisitos para PLC real

Para Siemens S7-1200 o S7-1500, el tecnico PLC debe configurar:

- PUT/GET habilitado.
- DB no optimizado.
- IP fija del PLC.
- Puerto 102 accesible.
- Rack 0.
- Slot 1.

## Conclusion

Para el alcance actual del proyecto, se plantea unicamente la lectura de variables desde PLC Siemens mediante S7 Communication. La primera implementacion usa `nodeS7` en el backend, realizando lecturas periodicas por polling sobre direcciones configuradas del PLC. En pruebas sin hardware real se puede usar `python-snap7` como servidor simulado. En futuras implementaciones reales, el sistema podra conectarse a PLCs S7-1200/S7-1500 siempre que se habilite PUT/GET y se expongan bloques de datos no optimizados.
