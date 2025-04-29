
![DragGrid Logo](https://raw.githubusercontent.com/juansueldo/draggrid/refs/heads/main/img/logo-complete.png)

Una biblioteca JavaScript ligera para crear layouts de cuadrícula con elementos arrastrables y redimensionables, perfecta para crear dashboards, paneles de control, y otros sistemas de interfaz modulares.

## Características

- Cuadrícula flexible con tamaño de columnas configurable
- Widgets arrastrables y redimensionables
- Intercambio (swap) de widgets
- Guardado y carga de configuraciones
- Callbacks para cambios en la cuadrícula
- Manejo de colisiones
- Funcionalidad de autoposicionamiento
- Ajuste de altura automático del contenedor
- Compatibilidad con edición de contenido en línea
- Guardado automático en el servidor
- Personalización de estilos con CSS

## Instalación

```html
<script src="draggrid.js"></script>
```

## Uso básico

```javascript
// Crear una instancia de DragGrid
const grid = new DragGrid('#container', {
  columns: 12,           // Número de columnas
  rowHeight: 50,         // Altura de cada fila en píxeles
  margin: 10             // Margen entre elementos
});

// Añadir widgets
grid.addWidget({
  x: 0,                  // Posición x en la cuadrícula
  y: 0,                  // Posición y en la cuadrícula
  width: 3,              // Ancho en unidades de columna
  height: 2,             // Alto en unidades de fila
  content: 'Contenido del widget', // Contenido HTML
  title: 'Mi Widget'     // Título del widget
});
```

## Opciones de configuración

| Opción | Tipo | Predeterminado | Descripción |
|--------|------|---------------|------------|
| `columns` | Number | 12 | Número de columnas en la cuadrícula |
| `rowHeight` | Number | 50 | Altura de cada fila en píxeles |
| `minWidth` | Number | 100 | Ancho mínimo de un widget en píxeles |
| `margin` | Number | 10 | Margen entre widgets en píxeles |
| `acceptWidgets` | Boolean | true | Permitir añadir nuevos widgets |
| `float` | Boolean | false | Permitir posicionamiento flotante |
| `removable` | Boolean | false | Permitir eliminar widgets |
| `draggable` | Boolean | true | Permitir arrastrar widgets |
| `resizable` | Boolean | true | Permitir redimensionar widgets |
| `swappable` | Boolean | false | Permitir intercambio de widgets |
| `saveUrl` | String | null | URL para guardar la configuración |
| `saveMethod` | String | 'POST' | Método HTTP para guardar la configuración |

## Métodos

### Gestión de widgets

#### `addWidget(options)`
Añade un nuevo widget a la cuadrícula.

```javascript
grid.addWidget({
  x: 0,                  // Posición x inicial
  y: 0,                  // Posición y inicial
  width: 3,              // Ancho en columnas
  height: 2,             // Alto en filas
  content: '<p>Hola mundo</p>', // Contenido HTML
  title: 'Mi Widget',    // Título del widget (opcional)
  id: 'widget-1'         // ID personalizado (opcional)
});
```

#### `removeWidget(elementOrId)`
Elimina un widget de la cuadrícula.

```javascript
grid.removeWidget('widget-1');  // Por ID
// o
grid.removeWidget(elementReference); // Por referencia al elemento DOM
```

#### `moveWidget(elementOrId, x, y)`
Mueve un widget a una nueva posición.

```javascript
grid.moveWidget('widget-1', 3, 2); // Mover a x:3, y:2
```

#### `resizeWidget(elementOrId, width, height)`
Cambia el tamaño de un widget.

```javascript
grid.resizeWidget('widget-1', 4, 3); // Redimensionar a 4x3
```

#### `updateWidgetContent(elementOrId, content)`
Actualiza el contenido HTML de un widget.

```javascript
grid.updateWidgetContent('widget-1', '<p>Nuevo contenido</p>');
```

#### `updateWidgetTitle(elementOrId, title)`
Actualiza el título de un widget.

```javascript
grid.updateWidgetTitle('widget-1', 'Nuevo título');
```

#### `getWidgetConfig(id)`
Obtiene la configuración actual de un widget.

```javascript
const config = grid.getWidgetConfig('widget-1');
console.log(config); // {id: 'widget-1', x: 0, y: 0, width: 3, height: 2, ...}
```

#### `makeWidgetContentEditable(elementOrId, editable)`
Hace que el contenido de un widget sea editable en línea.

```javascript
grid.makeWidgetContentEditable('widget-1', true);
```

#### `addWidgetClass(elementOrId, className)`
Añade una clase CSS personalizada a un widget.

```javascript
grid.addWidgetClass('widget-1', 'mi-clase-personalizada');
```

#### `removeWidgetClass(elementOrId, className)`
Elimina una clase CSS personalizada de un widget.

```javascript
grid.removeWidgetClass('widget-1', 'mi-clase-personalizada');
```

### Gestión de la cuadrícula

#### `findEmptySpace(width, height)`
Encuentra una posición vacía en la cuadrícula para un widget del tamaño especificado.

```javascript
const position = grid.findEmptySpace(3, 2);
// Devuelve {x: posX, y: posY}
```

#### `serialize()`
Serializa el estado actual de la cuadrícula para guardarlo.

```javascript
const gridData = grid.serialize();
localStorage.setItem('gridConfig', JSON.stringify(gridData));
```

#### `load(items)`
Carga una configuración serializada.

```javascript
const savedData = JSON.parse(localStorage.getItem('gridConfig'));
grid.load(savedData);
```

#### `clear()`
Elimina todos los widgets de la cuadrícula.

```javascript
grid.clear();
```

#### `saveToServer(data)`
Guarda el estado de la cuadrícula en el servidor.

```javascript
grid.saveToServer().then(response => {
  console.log('Guardado exitoso', response);
}).catch(error => {
  console.error('Error al guardar', error);
});
```

#### `onChange(callback)`
Registra una función para ser llamada cuando hay cambios en la cuadrícula.

```javascript
grid.onChange(function(gridData) {
  console.log('La cuadrícula ha cambiado', gridData);
});
```

### Controles de comportamiento

#### `updateOptions(options)`
Actualiza las opciones de configuración.

```javascript
grid.updateOptions({
  rowHeight: 60,
  margin: 15
});
```

#### `enableDragging(enabled)`
Habilita o deshabilita el arrastre de widgets.

```javascript
grid.enableDragging(false); // Deshabilitar arrastre
```

#### `enableResizing(enabled)`
Habilita o deshabilita el redimensionamiento de widgets.

```javascript
grid.enableResizing(false); // Deshabilitar redimensionamiento
```

#### `enableRemoving(enabled)`
Habilita o deshabilita la eliminación de widgets.

```javascript
grid.enableRemoving(true); // Habilitar eliminación
```

#### `enableSwap(enabled)`
Habilita o deshabilita el intercambio entre widgets.

```javascript
grid.enableSwap(true); // Habilitar intercambio
```

## Eventos

DragGrid utiliza un sistema de callbacks para notificar cambios:

```javascript
grid.onChange(function(data) {
  console.log('Cambios en la cuadrícula:', data);
  // data contiene un array con la configuración de todos los widgets
});
```

## Personalización de estilos

DragGrid inserta su propio conjunto de estilos CSS, pero puedes sobrescribirlos para personalizar la apariencia:

```css
/* Personalizar widget */
.drag-grid-item {
  background: #f5f5f5;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

/* Personalizar barra de título */
.drag-grid-drag-handle {
  background: #2196F3;
  color: white;
  border-radius: 8px 8px 0 0;
}

/* Personalizar placeholder durante el arrastre */
.drag-grid-placeholder {
  background: rgba(76, 175, 80, 0.2);
  border: 2px dashed #4CAF50;
}
```

## Ejemplo completo

```html
<!DOCTYPE html>
<html>
<head>
  <title>DragGrid Demo</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      padding: 20px;
    }
    #container {
      height: 600px;
      border: 1px solid #ddd;
    }
  </style>
</head>
<body>
  <h1>DragGrid Dashboard</h1>
  <div id="container"></div>
  
  <script src="draggrid.js"></script>
  <script>
    document.addEventListener('DOMContentLoaded', function() {
      const grid = new DragGrid('#container', {
        columns: 12,
        rowHeight: 60,
        margin: 10,
        draggable: true,
        resizable: true,
        removable: true,
        swappable: true
      });
      
      // Añadir widgets
      grid.addWidget({
        id: 'widget1',
        x: 0,
        y: 0,
        width: 3,
        height: 2,
        title: 'Widget 1',
        content: '<p>Este es el contenido del widget 1</p>'
      });
      
      grid.addWidget({
        id: 'widget2',
        x: 3,
        y: 0,
        width: 4,
        height: 3,
        title: 'Widget 2',
        content: '<p>Este es el contenido del widget 2</p>'
      });
      
      // Guardar cuando cambie la cuadrícula
      grid.onChange(function(data) {
        console.log('Grid changed', data);
        localStorage.setItem('gridConfig', JSON.stringify(data));
      });
      
      // Cargar configuración guardada si existe
      const savedConfig = localStorage.getItem('gridConfig');
      if (savedConfig) {
        grid.load(JSON.parse(savedConfig));
      }
    });
  </script>
</body>
</html>
```

## Compatibilidad

DragGrid está diseñado para funcionar en navegadores modernos con soporte para ES6:
- Chrome
- Firefox
- Safari
- Edge (Chromium)

## Licencia

Este proyecto está licenciado bajo la licencia MIT - ver el archivo LICENSE para más detalles.
