# 🎯 Sistema de Drag & Drop Perfecto - Plano Editor

## Resumen de Mejoras

He implementado un **sistema de drag & drop de nivel profesional** para el editor de planos. El nuevo sistema es extremadamente robusto, intuitivo y proporciona retroalimentación visual completa.

---

## 🔧 Características Principales

### 1. **Cálculo Perfecto de Offset**
```typescript
// Antes: Offset incorrecto causaba saltos al iniciar arrastre
// Ahora: Offset preciso capturado al inicio del drag
const offset = getDragOffset(event)
setDraggingItem({
  type: 'group',
  id,
  startPos: currentPos,    // ← Posición inicial
  offset,                  // ← Offset exacto
})
```

✨ **Beneficio**: No hay saltos al iniciar el arrastre - el elemento se mueve suavemente desde donde lo tomaste.

---

### 2. **Validación de Límites del Canvas**
```typescript
function isValidPosition(x: number, y: number, itemType: 'plc' | 'group'): boolean {
  const size = itemType === 'plc' ? PLC_SIZE : GROUP_SIZE
  
  // Verifica que el elemento esté completamente dentro del canvas
  if (x < 0 || y < 0 || x + size.width > WIDTH || y + size.height > HEIGHT) {
    return false
  }
  return true
}
```

✨ **Beneficio**: No puedes arrastrar elementos fuera del canvas - están limitados automáticamente.

---

### 3. **Snapping Automático a Grid**
```typescript
function getSnappedPosition(x: number, y: number): Point {
  return {
    x: Math.max(0, snapToGrid(x)),
    y: Math.max(0, snapToGrid(y)),
  }
}
```

✨ **Beneficio**: Los elementos se alinean automáticamente a la grilla de 40px cuando los sueltas.

---

### 4. **Preview Visual en Tiempo Real**
```typescript
setDragPreview({
  type: itemType,
  x: snapped.x,
  y: snapped.y,
  isValid,
  message: isValid ? undefined : 'Fuera de los límites',
})
```

En la UI:
- ✅ **Verde con borde punteado**: Posición válida
- ❌ **Rojo con borde punteado**: Posición inválida
- 📍 Muestra la posición exacta donde caerá el elemento

---

### 5. **Retroalimentación Visual Completa**

#### Durante el arrastre:
- 🎯 **Ring azul** alrededor del elemento que se arrastra
- 🔵 **Borde más grueso** (2px) para indicar que está en movimiento
- 👆 **Cursor `grabbing`** indicando que tienes control

#### Preview:
- 📦 Cuadro translúcido mostrando dónde caerá
- 🟢 Verde si es una posición válida
- 🔴 Rojo si está fuera de límites

#### Hover:
- ✨ Sombra mejorada
- 🎨 Borde más visible
- 👆 Cursor `grab` indicando que se puede arrastrar

---

### 6. **Animaciones Suaves**
```typescript
transition={{
  type: 'spring',
  stiffness: 400,    // ← Más responsivo
  damping: 30,       // ← Menos rebote
  restDelta: 0.1,    // ← Detención precisa
}}
```

✨ **Beneficio**: Las animaciones son suaves, rápidas y satisfactorias de usar.

---

### 7. **Unificación de Sistemas de Drag**

**Antes**: Conflicto entre HTML5 drag-drop y mouse events
- Drag HTML5 y mouse events compitiendo
- Comportamiento inconsistente
- Difícil de debuguear

**Ahora**: Sistema unificado primario con mouse events
- Mouse events como sistema principal
- HTML5 drag coordina con eventos
- Comportamiento consistente y predecible

```typescript
// Sistema principal: mouse events
onMouseDown={(event) => onStartDragGroup(event, group.groupId)}

// HTML5 drag como respaldo
draggable
onDragStartCapture={(event) => { /* coordina */ }}
onDragEnd={(event) => { event.preventDefault(); onStopDragItem() }}
```

---

## 📁 Archivos Modificados

### 1. **usePlanEditor.ts** (Hook - El corazón)
**Cambios**:
- ✅ Añadido state `dragPreview` para visualización
- ✅ Mejorado state `draggingItem` con `startPos` y `offset`
- ✅ Función `isValidPosition()` para validación de límites
- ✅ Función `getSnappedPosition()` para snapping a grid
- ✅ Función `calculateDragPosition()` para cálculos precisos
- ✅ Mejorado `startDragGroup()` y `startDragPlc()`
- ✅ Limpieza de ambos states en mouseup
- ✅ Validación antes de soltar

**Ventajas**:
- Código limpio y modulado
- Funciones reutilizables
- Lógica centralizada
- Fácil de testear y extender

---

### 2. **PlanoCanvas.tsx** (Componente - La visualización)
**Cambios**:
- ✅ Añadido preview visual con AnimatePresence
- ✅ Indicadores visuales de arrastre (ring, border)
- ✅ Mejor manejo de eventos drag
- ✅ SVG width actualizado a WIDTH constante
- ✅ Mejoradas animaciones (stiffness/damping)
- ✅ Mejor UX con cursor states

**Visualización**:
```tsx
// Preview del arrastre
<motion.div
  className={dragPreview.isValid 
    ? 'border-emerald-500 bg-emerald-50'     // ✅ Verde
    : 'border-red-500 bg-red-50'}            // ❌ Rojo
  style={{
    left: dragPreview.x,
    top: dragPreview.y,
    width: dragPreview.type === 'plc' ? 128 : 176,
    height: dragPreview.type === 'plc' ? 44 : 100,
  }}
/>

// Indicador de arrastre en tiempo real
className={draggingItemId === group.groupId
  ? 'border-blue-500 ring-2 ring-blue-400 ring-offset-2'  // 🟦 Azul
  : 'border-zinc-200 hover:border-zinc-300'}
```

---

### 3. **PlanoPage.tsx** (Página - La integración)
**Cambios**:
- ✅ Destructuring incluye `draggingItem` y `dragPreview`
- ✅ Props pasados al canvas: `dragPreview` y `draggingItemId`
- ✅ Cálculo correcto de `draggingItemId`

---

### 4. **planoUtils.ts** (Utilidades)
**Cambios**:
- ✅ Exportados `WIDTH` y `HEIGHT` para validación

---

## 🎨 Experiencia de Usuario Mejorada

### Antes:
- ❌ Saltos al iniciar arrastre
- ❌ Posibilidad de arrastrar fuera del canvas
- ❌ Sin retroalimentación visual
- ❌ Comportamiento inconsistente
- ❌ Animaciones lentas o entrecortadas

### Ahora:
- ✅ Arrastre suave desde el primer pixel
- ✅ Limitado automáticamente al canvas
- ✅ Preview visual completo en tiempo real
- ✅ Comportamiento consistente y predecible
- ✅ Animaciones suaves y satisfactorias
- ✅ Validación visual (verde/rojo)
- ✅ Cursores informativos
- ✅ Transiciones smooth

---

## 🚀 Uso del Sistema

### Para el Usuario Final:
1. **Selecciona modo "Mover elementos"**
2. **Haz clic y arrastra** cualquier grupo o el PLC
3. **Observa el preview** verde/rojo mientras arrastras
4. **Suelta** para posicionar

### Para Desarrolladores:
```typescript
// El hook te proporciona todo lo que necesitas
const {
  draggingItem,      // Item actual siendo arrastrado
  dragPreview,       // Información del preview
  startDragGroup,    // Iniciar arrastre de grupo
  startDragPlc,      // Iniciar arrastre de PLC
  handleMouseMove,   // Manejar movimiento
  handleMouseUp,     // Finalizar arrastre
} = usePlanEditor()
```

---

## 📊 Especificaciones Técnicas

| Aspecto | Valor |
|--------|-------|
| Grid Size | 40px |
| Canvas Width | 1120px |
| Canvas Height | 860px |
| PLC Size | 128×44px |
| Grupo Size | 176×100px |
| Spring Stiffness | 400 |
| Spring Damping | 30 |
| Rest Delta | 0.1 |

---

## 🔐 Validaciones Implementadas

✅ **Límites del Canvas**
- Evita elementos fuera del área visible
- Respeta bordes del canvas

✅ **Snapping a Grid**
- Alineación automática a 40px
- Posicionamiento consistente

✅ **Offset Correcto**
- Cálculo precisodel punto donde se agarra el elemento
- Sin saltos al iniciar arrastre

✅ **Preview Visual**
- Muestra la posición exacta
- Indica validez con colores

---

## 🎯 Próximas Mejoras Posibles

1. **Validación de Colisiones**: Evitar que dos elementos ocupen el mismo espacio
2. **Touch Support**: Soporte para dispositivos táctiles
3. **Multi-select**: Arrastrar múltiples elementos simultáneamente
4. **Undo/Redo**: Deshacer/Rehacer acciones
5. **Snapshots**: Guardar estado en tiempo real

---

## ✨ Conclusión

El nuevo sistema de drag & drop es **robusto, preciso y delightful para el usuario**. Implementa todas las mejores prácticas de UX:
- Retroalimentación visual clara
- Comportamiento predecible
- Animaciones suaves
- Validación automática
- Código limpio y mantenible

¡El "Plano" ahora tiene una experiencia de arrastre de nivel profesional! 🎉
