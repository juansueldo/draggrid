/**
 * DragGrid 
 * Permite crear layouts de cuadrícula con elementos arrastrables y redimensionables
 */

class DragGrid {
  constructor(container, options = {}) {
    this.container = typeof container === 'string' ? document.querySelector(container) : container;
    this.options = Object.assign({
      columns: 12,
      rowHeight: 50,
      animate: true,
      minWidth: 100,
      margin: 10,
      acceptWidgets: true,
      float: false,
      removable: false,
      draggable: true,
      resizable: true,
      saveUrl: null,
      saveMethod: 'POST',
      swappable: false,
    }, options);

    this.items = [];
    this.grid = [];
    this.dragItem = null;
    this.resizeItem = null;
    this.placeholderElement = null;
    this.isDragging = false;
    this.isResizing = false;
    this.startX = 0;
    this.startY = 0;
    this.startWidth = 0;
    this.startHeight = 0;
    this.startPosX = 0;
    this.startPosY = 0;
    this.onChangeCallback = null;
    this.swapTargetWidget = null; 
    this._canStartDrag = this.options.draggable;
    
    // Vincular métodos al contexto de la clase
    this._handleDragMove = this._handleDragMove.bind(this);
    this._handleDragEnd = this._handleDragEnd.bind(this);
    this._handleResizeMove = this._handleResizeMove.bind(this);
    this._handleResizeEnd = this._handleResizeEnd.bind(this);

    this._initGrid();
    this._initStyles();
    this._initContainer();
    this._createPlaceholder();
  }

  /**
   * Inicializa la estructura de la cuadrícula
   */
  _initGrid() {
    for (let row = 0; row < 100; row++) { // Asumimos un máximo de 100 filas
      this.grid[row] = [];
      for (let col = 0; col < this.options.columns; col++) {
        this.grid[row][col] = null;
      }
    }
  }

  /**
   * Inicializa los estilos CSS necesarios
   */
  _initStyles() {
    if (!document.getElementById('drag-grid-styles')) {
      const styles = document.createElement('style');
      styles.id = 'drag-grid-styles';
      styles.textContent = `
        .drag-grid-container {
          position: relative;
          width: 100%;
          background: rgba(250, 250, 250, 0.2);
          min-height: 100px;
        }
        .drag-grid-item {
          position: absolute;
          background: #fff;
          border: 1px solid #ddd;
          border-radius: 5px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24);
          transition: all 0.2s ease;
          z-index: 1;
          overflow: hidden;
        }
        .drag-grid-item.dragging,
        .drag-grid-item.resizing {
          opacity: 0.8;
          z-index: 10;
          box-shadow: 0 5px 10px rgba(0,0,0,0.2);
          transition: none;
        }
        .drag-grid-item-content {
          width: 100%;
          height: 100%;
          overflow: auto;
        }
        .drag-grid-item .resize-handle {
          position: absolute;
          right: 3px;
          bottom: 8px;
          width: 16px;
          height: 16px;
          cursor: se-resize;
          border-radius: 2px;
        }
        .drag-grid-placeholder {
          background: rgba(33, 150, 243, 0.2);
          border: 1px #2196F3;
          border-radius: 5px;
          position: absolute;
          z-index: 0;
          transition: all 0.1s ease;
        }
        .drag-grid-drag-handle {
          cursor: move;
          padding: 8px;
          font-weight: bold;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .drag-grid-item .remove-button {
          cursor: pointer;
          font-size: 16px;
          margin-left: 5px;
        }
        .drag-grid-drag-handle.drag-disabled {
          cursor: default !important;
          opacity: 0.7;
        }
        .drag-grid-item .remove-button,
        .drag-grid-item .resize-handle {
          opacity: 0;
          visibility: hidden;
          transition: opacity 0.3s ease, visibility 0.3s ease;
        }
        .drag-grid-item:hover .remove-button,
        .drag-grid-item:hover .resize-handle {
          opacity: 1;
          visibility: visible;
        }
      `;
      document.head.appendChild(styles);
    }
  }

  /**
   * Inicializa el contenedor
   */
  _initContainer() {
    this.container.classList.add('drag-grid-container');
    this.container.style.height = `${this.options.rowHeight * 5}px`; // Altura inicial
  }

  /**
   * Crea el elemento placeholder usado durante el arrastre
   */
  _createPlaceholder() {
    this.placeholderElement = document.createElement('div');
    this.placeholderElement.className = 'drag-grid-placeholder';
    this.placeholderElement.style.display = 'none';
    this.container.appendChild(this.placeholderElement);
  }

  /**
   * Configura los eventos de arrastrar y redimensionar
   * @param {HTMLElement} element - Elemento del widget
   * @param {Object} config - Configuración del widget
   */
  _setupDragAndResize(element, config) {
    if (!this.options.draggable && !this.options.resizable) {
      return;
    }

    // Obtener el elemento de la manija de arrastre
    let dragHandle = element.querySelector('.drag-grid-drag-handle');
    if (!dragHandle && this.options.draggable) {
      // Si no existe, crear uno
      const newDragHandle = document.createElement('div');
      newDragHandle.className = 'drag-grid-drag-handle';
      newDragHandle.innerHTML = config.title || `&nbsp;`;
      
      if (this.options.removable) {
        const removeButton = document.createElement('span');
        removeButton.className = 'remove-button';
        const svgNS = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(svgNS, 'svg');
        svg.setAttribute('width', '16');
        svg.setAttribute('height', '16');
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('fill', 'none');
        svg.setAttribute('stroke', 'currentColor');
        svg.setAttribute('stroke-width', '2');
        svg.setAttribute('stroke-linecap', 'round');
        svg.setAttribute('stroke-linejoin', 'round');

        // Linea 1: de esquina a esquina
        const line1 = document.createElementNS(svgNS, 'line');
        line1.setAttribute('x1', '18');
        line1.setAttribute('y1', '6');
        line1.setAttribute('x2', '6');
        line1.setAttribute('y2', '18');

        // Linea 2: la otra diagonal
        const line2 = document.createElementNS(svgNS, 'line');
        line2.setAttribute('x1', '6');
        line2.setAttribute('y1', '6');
        line2.setAttribute('x2', '18');
        line2.setAttribute('y2', '18');

        // Añadir líneas al SVG
        svg.appendChild(line1);
        svg.appendChild(line2);

        // Añadir SVG al botón
        removeButton.appendChild(svg);
        removeButton.addEventListener('click', (e) => {
          e.stopPropagation();
          this.removeWidget(element);
        });
        newDragHandle.appendChild(removeButton);
      }
      
      if (element.firstChild) {
        element.insertBefore(newDragHandle, element.firstChild);
      } else {
        element.appendChild(newDragHandle);
      }
      
      dragHandle = newDragHandle;
    }

    // Configurar el redimensionamiento
    if (this.options.resizable) {
      let resizeHandle = element.querySelector('.resize-handle');
      if (!resizeHandle) {
        resizeHandle = document.createElement('div');
        resizeHandle.className = 'resize-handle';
        const svgNS = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(svgNS, 'svg');
        svg.setAttribute('width', '16');
        svg.setAttribute('height', '16');
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('fill', 'none');
        svg.setAttribute('stroke', 'currentColor');
        svg.setAttribute('stroke-width', '2');
        svg.setAttribute('stroke-linecap', 'round');
        svg.setAttribute('stroke-linejoin', 'round');

        const paths = [
          "M6 10h4v-4",
          "M4 4l6 6",
          "M18 14h-4v4",
          "M14 14l6 6"
        ];
        
        // Crear y añadir cada <path>
        paths.forEach(d => {
          const path = document.createElementNS(svgNS, 'path');
          path.setAttribute('d', d);
          svg.appendChild(path);
        });

        // Agregar SVG al div
        resizeHandle.appendChild(svg);
        element.appendChild(resizeHandle);
      }

      // Evento de inicio de redimensionamiento
      resizeHandle.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.isResizing = true;
        this.resizeItem = element;
        this.startX = e.clientX;
        this.startY = e.clientY;
        this.startWidth = element.offsetWidth;
        this.startHeight = element.offsetHeight;

        // Añadir clase de redimensionamiento
        element.classList.add('resizing');

        // Obtener configuración actual
        const index = this.items.findIndex(item => item.el === element);
        if (index !== -1) {
          const currentConfig = this.items[index].config;
          this.startPosX = currentConfig.x;
          this.startPosY = currentConfig.y;
        }

        // Adjuntar eventos temporales al documento
        document.addEventListener('mousemove', this._handleResizeMove);
        document.addEventListener('mouseup', this._handleResizeEnd);
      });
    }

    // Configurar el arrastre
    if (this.options.draggable && dragHandle) {
      // Evento de inicio de arrastre
      dragHandle.addEventListener('mousedown', (e) => {
        if (!this._canStartDrag || dragHandle.classList.contains('drag-disabled')) {
          return; // No iniciar el arrastre si está deshabilitado
        }
        e.preventDefault();
        this.isDragging = true;
        this.dragItem = element;
        this.startX = e.clientX;
        this.startY = e.clientY;
        
        // Añadir clase de arrastre
        element.classList.add('dragging');
        
        // Obtener configuración actual
        const index = this.items.findIndex(item => item.el === element);
        if (index !== -1) {
          const currentConfig = this.items[index].config;
          this.startPosX = currentConfig.x;
          this.startPosY = currentConfig.y;
          this.startWidth = currentConfig.width;
          this.startHeight = currentConfig.height;
          
          // Mostrar y posicionar el placeholder
          this._updatePlaceholder(currentConfig.x, currentConfig.y, currentConfig.width, currentConfig.height);
          this.placeholderElement.style.display = 'block';
        }
        
        // Adjuntar eventos temporales al documento
        document.addEventListener('mousemove', this._handleDragMove);
        document.addEventListener('mouseup', this._handleDragEnd);
      });
    }
  }

  /**
   * Manejador de movimiento durante el arrastre
   */
  _handleDragMove(e) {
      if (!this.isDragging || !this.dragItem) return;
      
      const deltaX = e.clientX - this.startX;
      const deltaY = e.clientY - this.startY;
      
      // Calcular nueva posición en unidades de cuadrícula
      const colWidth = this.container.offsetWidth / this.options.columns;
      const deltaGridX = Math.round(deltaX / colWidth);
      const deltaGridY = Math.round(deltaY / this.options.rowHeight);
      
      const newX = Math.max(0, Math.min(this.startPosX + deltaGridX, this.options.columns - this.startWidth));
      const newY = Math.max(0, this.startPosY + deltaGridY);
      
      // Actualizar placeholder
      this._updatePlaceholder(newX, newY, this.startWidth, this.startHeight);
      
      // Comprobar si es posible el movimiento
      if (this._canFit(newX, newY, this.startWidth, this.startHeight, this.dragItem.id)) {
        this.placeholderElement.style.display = 'block';
        this.swapTargetWidget = null; // Resetear el widget objetivo para swap
      } else {
        // Si no puede encajar, pero tenemos activado el swap, buscamos un widget para intercambiar
        if (this.options.swappable) {
          // Buscar el widget predominante en la región donde estamos arrastrando
          const targetWidget = this._findPredominantWidgetInRegion(
            newX, newY, this.startWidth, this.startHeight, this.dragItem.id
          );
          
          if (targetWidget) {
            // Marcamos este widget como objetivo para el swap y mostramos un estilo diferente en el placeholder
            this.swapTargetWidget = targetWidget.item;
            this.placeholderElement.style.display = 'block';
            this.placeholderElement.style.backgroundColor = 'rgba(33, 150, 243, 0.2)'; 
          } else {
            this.placeholderElement.style.display = 'none';
            this.swapTargetWidget = null;
          }
        } else {
          this.placeholderElement.style.display = 'none';
        }
      }
  }
  
  /**
   * Manejador de fin de arrastre
   */
  _handleDragEnd(e) {
      if (!this.isDragging || !this.dragItem) return;
      
      const deltaX = e.clientX - this.startX;
      const deltaY = e.clientY - this.startY;
      
      // Calcular nueva posición en unidades de cuadrícula
      const colWidth = this.container.offsetWidth / this.options.columns;
      const deltaGridX = Math.round(deltaX / colWidth);
      const deltaGridY = Math.round(deltaY / this.options.rowHeight);
      
      const newX = Math.max(0, Math.min(this.startPosX + deltaGridX, this.options.columns - this.startWidth));
      const newY = Math.max(0, this.startPosY + deltaGridY);
      
      // Verificar si es posible el movimiento
      if (this._canFit(newX, newY, this.startWidth, this.startHeight, this.dragItem.id)) {
        this.moveWidget(this.dragItem, newX, newY);
      } 
      // Si no puede moverse pero tenemos un widget objetivo para swap
      else if (this.options.swappable && this.swapTargetWidget) {
        // Encontrar el índice del widget que estamos arrastrando
        const dragIndex = this.items.findIndex(item => item.el === this.dragItem);
        if (dragIndex !== -1) {
          // Realizar el intercambio
          this._swapWidgets(this.items[dragIndex], this.swapTargetWidget);
        }
      }
      
      // Limpiar estado
      this.dragItem.classList.remove('dragging');
      this.isDragging = false;
      this.dragItem = null;
      this.swapTargetWidget = null;
      this.placeholderElement.style.display = 'none';
      this.placeholderElement.style.backgroundColor = 'rgba(33, 150, 243, 0.2)'; // Restaurar color original
      
      // Eliminar eventos temporales
      document.removeEventListener('mousemove', this._handleDragMove);
      document.removeEventListener('mouseup', this._handleDragEnd);
      
      // Disparar evento de cambio
      this._triggerChange();
  }
  /**
   * Manejador de movimiento durante el redimensionamiento
   */
  _handleResizeMove(e) {
    if (!this.isResizing || !this.resizeItem) return;
    
    const deltaX = e.clientX - this.startX;
    const deltaY = e.clientY - this.startY;
    
    // Calcular nuevo ancho y alto en unidades de cuadrícula
    const colWidth = this.container.offsetWidth / this.options.columns;
    const newWidthPx = Math.max(this.startWidth + deltaX, this.options.minWidth);
    const newHeightPx = Math.max(this.startHeight + deltaY, this.options.rowHeight);
    
    const newWidth = Math.round(newWidthPx / colWidth);
    const newHeight = Math.round(newHeightPx / this.options.rowHeight);
    
    // Actualizar placeholder
    this._updatePlaceholder(this.startPosX, this.startPosY, newWidth, newHeight);
    
    // Comprobar si es posible el redimensionamiento
    if (this._canFit(this.startPosX, this.startPosY, newWidth, newHeight, this.resizeItem.id)) {
      this.placeholderElement.style.display = 'block';
    } else {
      this.placeholderElement.style.display = 'none';
    }
  }
  
  /**
   * Manejador de fin de redimensionamiento
   */
  _handleResizeEnd(e) {
    if (!this.isResizing || !this.resizeItem) return;
    
    // Obtener nuevo tamaño
    const colWidth = this.container.offsetWidth / this.options.columns;
    const deltaX = e.clientX - this.startX;
    const deltaY = e.clientY - this.startY;
    
    const newWidthPx = Math.max(this.startWidth + deltaX, this.options.minWidth);
    const newHeightPx = Math.max(this.startHeight + deltaY, this.options.rowHeight);
    
    const newWidth = Math.round(newWidthPx / colWidth);
    const newHeight = Math.round(newHeightPx / this.options.rowHeight);
    
    // Verificar si es posible el redimensionamiento
    if (this._canFit(this.startPosX, this.startPosY, newWidth, newHeight, this.resizeItem.id)) {
      this.resizeWidget(this.resizeItem, newWidth, newHeight);
    }
    
    // Limpiar estado
    this.resizeItem.classList.remove('resizing');
    this.isResizing = false;
    this.resizeItem = null;
    this.placeholderElement.style.display = 'none';
    
    // Eliminar eventos temporales
    document.removeEventListener('mousemove', this._handleResizeMove);
    document.removeEventListener('mouseup', this._handleResizeEnd);
    
    // Disparar evento de cambio
    this._triggerChange();
  }

  /**
   * Actualiza la posición y tamaño del placeholder
   * @param {number} x - Posición x
   * @param {number} y - Posición y
   * @param {number} width - Ancho
   * @param {number} height - Alto
   */
  _updatePlaceholder(x, y, width, height) {
    const left = x * (100 / this.options.columns);
    const top = y * this.options.rowHeight;
    const widthPercent = width * (100 / this.options.columns);
    
    this.placeholderElement.style.left = `${left}%`;
    this.placeholderElement.style.top = `${top}px`;
    this.placeholderElement.style.width = `calc(${widthPercent}% - ${this.options.margin * 2}px)`;
    this.placeholderElement.style.height = `${height * this.options.rowHeight - this.options.margin * 2}px`;
    this.placeholderElement.style.margin = `${this.options.margin}px`;
  }
   /**
  * Encuentra el widget en una posición específica de la cuadrícula
  * @param {number} x - Posición x en la cuadrícula
  * @param {number} y - Posición y en la cuadrícula
  * @returns {Object|null} El widget encontrado o null
  */
   _findWidgetAt(x, y) {
      // Buscamos en la cuadrícula el ID del widget en esa posición
      const widgetId = this.grid[y] && this.grid[y][x];
  
      if (widgetId) {
        // Encontramos el índice del widget en la lista de items
        const index = this.items.findIndex(item => item.config.id === widgetId);
        if (index !== -1) {
          return {
            index: index,
            item: this.items[index]
          };
        }
      }
  
      return null;
    }

  /**
   * Encuentra el widget que ocupa la mayoría de una región
   * @param {number} x - Posición x en la cuadrícula
   * @param {number} y - Posición y en la cuadrícula
   * @param {number} width - Ancho de la región
   * @param {number} height - Alto de la región
   * @param {string} skipId - ID del widget a omitir
   * @returns {Object|null} El widget predominante o null
   */
  _findPredominantWidgetInRegion(x, y, width, height, skipId) {
    const widgetCounts = {};
    let maxCount = 0;
    let predominantWidgetId = null;
    
    // Contamos las ocurrencias de cada widget en la región
    for (let row = y; row < y + height; row++) {
      for (let col = x; col < x + width; col++) {
        if (this.grid[row] && this.grid[row][col] && this.grid[row][col] !== skipId) {
          const id = this.grid[row][col];
          widgetCounts[id] = (widgetCounts[id] || 0) + 1;
          
          if (widgetCounts[id] > maxCount) {
            maxCount = widgetCounts[id];
            predominantWidgetId = id;
          }
        }
      }
    }
    
    if (predominantWidgetId) {
      const index = this.items.findIndex(item => item.config.id === predominantWidgetId);
      if (index !== -1) {
        return {
          index: index,
          item: this.items[index]
        };
      }
    }
    return null;
  }

  /**
  * Realiza un intercambio entre dos widgets
  * @param {Object} sourceWidget - Widget que se está arrastrando
  * @param {Object} targetWidget - Widget con el que se intercambiará
  */
  _swapWidgets(sourceWidget, targetWidget) {
    const sourceX = sourceWidget.config.x;
    const sourceY = sourceWidget.config.y;
    const sourceWidth = sourceWidget.config.width;
    const sourceHeight = sourceWidget.config.height;
    
    const targetX = targetWidget.config.x;
    const targetY = targetWidget.config.y;
    const targetWidth = targetWidget.config.width;
    const targetHeight = targetWidget.config.height;
    
    // Liberar el espacio en la cuadrícula de ambos widgets
    this._freeGridSpace(sourceWidget.config.id);
    this._freeGridSpace(targetWidget.config.id);
    
    // Intercambiar posiciones Y dimensiones
    sourceWidget.config.x = targetX;
    sourceWidget.config.y = targetY;
    sourceWidget.config.width = targetWidth;
    sourceWidget.config.height = targetHeight;
    
    targetWidget.config.x = sourceX;
    targetWidget.config.y = sourceY;
    targetWidget.config.width = sourceWidth;
    targetWidget.config.height = sourceHeight;
    
    // Actualizar atributos y estilos CSS
    sourceWidget.el.setAttribute('data-gs-x', targetX);
    sourceWidget.el.setAttribute('data-gs-y', targetY);
    sourceWidget.el.setAttribute('data-gs-width', targetWidth);
    sourceWidget.el.setAttribute('data-gs-height', targetHeight);
    this._updateElementStyles(sourceWidget.el, sourceWidget.config);
    
    targetWidget.el.setAttribute('data-gs-x', sourceX);
    targetWidget.el.setAttribute('data-gs-y', sourceY);
    targetWidget.el.setAttribute('data-gs-width', sourceWidth);
    targetWidget.el.setAttribute('data-gs-height', sourceHeight);
    this._updateElementStyles(targetWidget.el, targetWidget.config);
    
    // Ocupar el nuevo espacio en la cuadrícula para ambos widgets
    this._occupyGrid(sourceWidget.config);
    this._occupyGrid(targetWidget.config);
    this._updateContainerHeight();
  }

  /**
  * Registra una función de callback para cambios en la cuadrícula
  * @param {Function} callback - Función a llamar cuando hay cambios
  */
  onChange(callback) {
    this.onChangeCallback = callback;
  }

  /**
  * Dispara el evento de cambio
  */
  _triggerChange() {
    if (this.onChangeCallback) {
      const serializedData = this.serialize();
      this.onChangeCallback(serializedData);
      // Si hay una URL para guardar configurada, enviar los datos mediante AJAX/fetch
      if (this.options.saveUrl) {
        this.saveToServer(serializedData);
      }
    }
  }

  /**
   * Guarda el estado de la cuadrícula en el servidor
   * @param {Array|Object} data - Datos a enviar al servidor
   */
  saveToServer(data = null) {
    const dataToSend = data || this.serialize();
    
    if (!this.options.saveUrl) {
      console.error('No se ha configurado una URL para guardar');
      return Promise.reject('No se ha configurado una URL para guardar');
    }
    
    return fetch(this.options.saveUrl, {
      method: this.options.saveMethod,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(dataToSend)
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Error al guardar en el servidor');
      }
      return response.json();
    })
    .catch(error => {
      console.error('Error al guardar la cuadrícula:', error);
      throw error;
    });
  }

  /**
   * Agrega un nuevo elemento a la cuadrícula
   * @param {Object} options - Configuración del elemento (x, y, width, height, etc.)
   * @returns {HTMLElement} El elemento creado
   */
  addWidget(options = {}) {
    const defaults = {
      x: 0,
      y: 0,
      width: 3,
      height: 2,
      content: '',
      title: '',
      id: `widget-${Date.now()}`,
      class: ''
    };

    const config = Object.assign({}, defaults, options);
    const element = document.createElement('div');
    element.className = `drag-grid-item ${config.class}`;
    element.id = config.id;
    
    // Establecer atributos de datos para la posición y tamaño
    element.setAttribute('data-gs-x', config.x);
    element.setAttribute('data-gs-y', config.y);
    element.setAttribute('data-gs-width', config.width);
    element.setAttribute('data-gs-height', config.height);
    
    // Calcular posición y tamaño CSS
    this._updateElementStyles(element, config);
    
    // Agregar contenido
    const content = document.createElement('div');
    content.className = 'drag-grid-item-content';
    content.innerHTML = config.content;
    element.appendChild(content);
    
    // Agregar elemento al DOM
    this.container.appendChild(element);
    
    // Ocupar el espacio en la cuadrícula
    this._occupyGrid(config);
    
    // Almacenar referencia al elemento
    this.items.push({
      el: element,
      config: config
    });
    
    // Configurar eventos de arrastrar y redimensionar
    this._setupDragAndResize(element, config);
    
    // Actualizar altura del contenedor si es necesario
    this._updateContainerHeight();
    
    // Disparar evento de cambio
    this._triggerChange();
    
    return element;
  }

  /**
   * Actualiza los estilos CSS de un elemento basado en su configuración
   * @param {HTMLElement} element - El elemento a actualizar
   * @param {Object} config - La configuración del elemento
   */
  _updateElementStyles(element, config) {
    const left = config.x * (100 / this.options.columns);
    const top = config.y * this.options.rowHeight;
    const width = config.width * (100 / this.options.columns);
    const height = config.height * this.options.rowHeight;
    
    element.style.left = `${left}%`;
    element.style.top = `${top}px`;
    element.style.width = `calc(${width}% - ${this.options.margin * 2}px)`;
    element.style.height = `${height - this.options.margin * 2}px`;
    element.style.margin = `${this.options.margin}px`;
  }

  /**
   * Marca como ocupado el espacio en la cuadrícula
   * @param {Object} config - Configuración del elemento
   */
  _occupyGrid(config) {
    for (let row = config.y; row < config.y + config.height; row++) {
      for (let col = config.x; col < config.x + config.width; col++) {
        if (this.grid[row] && this.grid[row][col] !== undefined) {
          this.grid[row][col] = config.id;
        }
      }
    }
  }

  /**
   * Actualiza la altura del contenedor según el contenido
   */
  _updateContainerHeight() {
    let maxY = 0;
    
    this.items.forEach(item => {
      const bottomY = parseInt(item.config.y) + parseInt(item.config.height);
      maxY = Math.max(maxY, bottomY);
    });
    
    const newHeight = Math.max(5, maxY) * this.options.rowHeight;
    this.container.style.height = `${newHeight}px`;
  }

  /**
   * Encuentra un espacio vacío en la cuadrícula para un elemento nuevo
   * @param {number} width - Ancho del elemento en unidades de cuadrícula
   * @param {number} height - Alto del elemento en unidades de cuadrícula
   * @returns {Object} Posición x, y donde encaja el elemento
   */
  findEmptySpace(width, height) {
    for (let row = 0; row < this.grid.length; row++) {
      for (let col = 0; col <= this.options.columns - width; col++) {
        if (this._canFit(col, row, width, height)) {
          return { x: col, y: row };
        }
      }
    }
    return { x: 0, y: this._getMaxOccupiedRow() + 1 };
  }

  /**
   * Verifica si un elemento puede encajar en una posición
   * @param {number} x - Posición x en la cuadrícula
   * @param {number} y - Posición y en la cuadrícula
   * @param {number} width - Ancho del elemento
   * @param {number} height - Alto del elemento
   * @param {string} [skipId] - ID del elemento a omitir en la verificación
   * @returns {boolean} Verdadero si el elemento encaja
   */
  _canFit(x, y, width, height, skipId = null) {
    // Verificar que está dentro de los límites
    if (x < 0 || x + width > this.options.columns || y < 0) {
      return false;
    }
    
    // Verificar colisiones con otros elementos
    for (let row = y; row < y + height; row++) {
      for (let col = x; col < x + width; col++) {
        if (!this.grid[row] || this.grid[row][col] === undefined) {
          // Crear fila si es necesario
          if (!this.grid[row]) {
            this.grid[row] = [];
            for (let i = 0; i < this.options.columns; i++) {
              this.grid[row][i] = null;
            }
          }
        } else if (this.grid[row][col] !== null && this.grid[row][col] !== skipId) {
          return false;
        }
      }
    }
    return true;
  }

  /**
   * Obtiene la fila más alta ocupada en la cuadrícula
   * @returns {number} Índice de la fila más alta ocupada
   */
  _getMaxOccupiedRow() {
    let maxRow = 0;
    for (let row = 0; row < this.grid.length; row++) {
      if (!this.grid[row]) continue;
      for (let col = 0; col < this.options.columns; col++) {
        if (this.grid[row][col] !== null) {
          maxRow = Math.max(maxRow, row);
        }
      }
    }
    return maxRow;
  }

  /**
   * Libera el espacio ocupado por un elemento en la cuadrícula
   * @param {string} id - ID del elemento
   */
  _freeGridSpace(id) {
    for (let row = 0; row < this.grid.length; row++) {
      if (!this.grid[row]) continue;
      for (let col = 0; col < this.options.columns; col++) {
        if (this.grid[row][col] === id) {
          this.grid[row][col] = null;
        }
      }
    }
  }

  /**
   * Elimina un widget de la cuadrícula
   * @param {string|HTMLElement} el - El elemento o su ID
   */
  removeWidget(el) {
    const element = typeof el === 'string' ? document.getElementById(el) : el;
    if (!element) return;
    
    const index = this.items.findIndex(item => item.el === element);
    if (index !== -1) {
      const config = this.items[index].config;
      
      // Liberar el espacio en la cuadrícula
      this._freeGridSpace(config.id);
      
      // Eliminar elemento del DOM y la lista de elementos
      element.parentElement.removeChild(element);
      this.items.splice(index, 1);
      
      // Actualizar altura del contenedor
      this._updateContainerHeight();
      
      // Disparar evento de cambio
      this._triggerChange();
    }
  }

  /**
   * Mueve un widget a una nueva posición
   * @param {string|HTMLElement} el - El elemento o su ID
   * @param {number} x - Nueva posición x
   * @param {number} y - Nueva posición y
   */
  moveWidget(el, x, y) {
    const element = typeof el === 'string' ? document.getElementById(el) : el;
    if (!element) return;
    
    const index = this.items.findIndex(item => item.el === element);
    if (index !== -1) {
      const config = this.items[index].config;
      
      // Liberar el espacio anterior en la cuadrícula
      this._freeGridSpace(config.id);
      
      // Actualizar configuración
      config.x = x;
      config.y = y;
      
      // Actualizar el DOM
      element.setAttribute('data-gs-x', x);
      element.setAttribute('data-gs-y', y);
      this._updateElementStyles(element, config);
      
      // Ocupar el nuevo espacio en la cuadrícula
      this._occupyGrid(config);
      
      // Actualizar altura del contenedor
      this._updateContainerHeight();
    }
  }

  /**
   * Cambia el tamaño de un widget
   * @param {string|HTMLElement} el - El elemento o su ID
   * @param {number} width - Nuevo ancho
   * @param {number} height - Nuevo alto
   */
  resizeWidget(el, width, height) {
    const element = typeof el === 'string' ? document.getElementById(el) : el;
    if (!element) return;
    
    const index = this.items.findIndex(item => item.el === element);
    if (index !== -1) {
      const config = this.items[index].config;
      
      // Liberar el espacio anterior en la cuadrícula
      this._freeGridSpace(config.id);
      
      // Actualizar configuración
      config.width = width;
      config.height = height;
      
      // Actualizar el DOM
      element.setAttribute('data-gs-width', width);
      element.setAttribute('data-gs-height', height);
      this._updateElementStyles(element, config);
      
      // Ocupar el nuevo espacio en la cuadrícula
      this._occupyGrid(config);
      
      // Actualizar altura del contenedor
      this._updateContainerHeight();
    }
  }

  /**
   * Serializa el estado actual de la cuadrícula
   * @returns {Array} Representación JSON de los elementos
   */
  serialize() {
    return this.items.map(item => {
      return {
        id: item.config.id,
        x: parseInt(item.el.getAttribute('data-gs-x')),
        y: parseInt(item.el.getAttribute('data-gs-y')),
        width: parseInt(item.el.getAttribute('data-gs-width')),
        height: parseInt(item.el.getAttribute('data-gs-height')),
        content: item.el.querySelector('.drag-grid-item-content').innerHTML,
        title: item.config.title || '',
        class: item.config.class || ''
      };
    });
  }

  /**
   * Crea elementos a partir de una configuración serializada
   * @param {Array} items - Elementos serializados
   */
  /**
   * Crea elementos a partir de una configuración serializada
   * @param {Array} items - Elementos serializados
   */
  load(items) {
      // Limpieza previa: eliminar todos los elementos existentes
      while (this.items.length > 0) {
        this.removeWidget(this.items[0].el);
      }
      
      // Reinicializar la cuadrícula
      this._initGrid();
      
      // Crear nuevos elementos a partir de los datos
      if (Array.isArray(items) && items.length > 0) {
        items.forEach(item => {
          this.addWidget({
            id: item.id || `widget-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            x: parseInt(item.x) || 0,
            y: parseInt(item.y) || 0,
            width: parseInt(item.width) || 3,
            height: parseInt(item.height) || 2,
            content: item.content || '',
            title: item.title || '',
            class: item.class || ''
          });
        });
      }
      
      // Actualizar altura del contenedor
      this._updateContainerHeight();
      
      // No disparamos el evento onChange aquí para evitar un guardado automático
      // justo después de cargar los datos
      return this;
    }
    
    /**
     * Limpia todos los elementos de la cuadrícula
     */
    clear() {
      // Eliminar todos los elementos
      while (this.items.length > 0) {
        this.removeWidget(this.items[0].el);
      }
      
      // Reinicializar la cuadrícula
      this._initGrid();
      
      // Actualizar altura del contenedor
      this._updateContainerHeight();
      
      // Disparar evento de cambio
      this._triggerChange();
      
      return this;
    }
    
    /**
     * Actualiza el contenido de un widget
     * @param {string|HTMLElement} el - El elemento o su ID
     * @param {string} content - Nuevo contenido HTML
     */
    updateWidgetContent(el, content) {
      const element = typeof el === 'string' ? document.getElementById(el) : el;
      if (!element) return;
      
      const contentEl = element.querySelector('.drag-grid-item-content');
      if (contentEl) {
        contentEl.innerHTML = content;
        
        // Actualizar el contenido en la configuración
        const index = this.items.findIndex(item => item.el === element);
        if (index !== -1) {
          this.items[index].config.content = content;
          
          // Disparar evento de cambio
          this._triggerChange();
        }
      }
      
      return this;
    }
    
    /**
     * Actualiza el título de un widget
     * @param {string|HTMLElement} el - El elemento o su ID
     * @param {string} title - Nuevo título
     */
    updateWidgetTitle(el, title) {
      const element = typeof el === 'string' ? document.getElementById(el) : el;
      if (!element) return;
      
      const dragHandle = element.querySelector('.drag-grid-drag-handle');
      if (dragHandle) {
        // Preservar el botón de eliminar si existe
        const removeButton = dragHandle.querySelector('.remove-button');
        
        // Actualizar el contenido del título
        if (removeButton) {
          dragHandle.innerHTML = title;
          dragHandle.appendChild(removeButton);
        } else {
          dragHandle.innerHTML = title;
        }
        
        // Actualizar el título en la configuración
        const index = this.items.findIndex(item => item.el === element);
        if (index !== -1) {
          this.items[index].config.title = title;
          
          // Disparar evento de cambio
          this._triggerChange();
        }
      }
      
      return this;
    }
    
    /**
     * Obtiene la configuración de un widget específico
     * @param {string} id - ID del widget
     * @returns {Object|null} Configuración del widget o null si no existe
     */
    getWidgetConfig(id) {
      const item = this.items.find(item => item.config.id === id);
      return item ? { ...item.config } : null;
    }
    
    /**
     * Establece el contenido de un widget que se puede editar en línea
     * @param {string|HTMLElement} el - El elemento o su ID
     * @param {boolean} editable - Si es editable o no
     */
    makeWidgetContentEditable(el, editable = true) {
      const element = typeof el === 'string' ? document.getElementById(el) : el;
      if (!element) return;
      
      const contentEl = element.querySelector('.drag-grid-item-content');
      if (contentEl) {
        contentEl.contentEditable = editable;
        
        if (editable) {
          // Añadir evento para guardar cambios cuando se pierde el foco
          contentEl.addEventListener('blur', () => {
            const index = this.items.findIndex(item => item.el === element);
            if (index !== -1) {
              this.items[index].config.content = contentEl.innerHTML;
              this._triggerChange();
            }
          });
        }
      }
      
      return this;
    }
    
    /**
     * Añade una clase personalizada a un widget
     * @param {string|HTMLElement} el - El elemento o su ID
     * @param {string} className - Clase a añadir
     */
    addWidgetClass(el, className) {
      const element = typeof el === 'string' ? document.getElementById(el) : el;
      if (element && className) {
        element.classList.add(className);
      }
      return this;
    }
    
    /**
     * Elimina una clase personalizada de un widget
     * @param {string|HTMLElement} el - El elemento o su ID
     * @param {string} className - Clase a eliminar
     */
    removeWidgetClass(el, className) {
      const element = typeof el === 'string' ? document.getElementById(el) : el;
      if (element && className) {
        element.classList.remove(className);
      }
      return this;
    }
    
    /**
     * Actualiza las opciones de la cuadrícula
     * @param {Object} options - Nuevas opciones
     */
    updateOptions(options) {
      this.options = Object.assign(this.options, options);
      
      // Actualizar estilos de todos los elementos
      this.items.forEach(item => {
        this._updateElementStyles(item.el, item.config);
      });
      
      // Actualizar altura del contenedor
      this._updateContainerHeight();
      
      return this;
    }
    
    /**
     * Habilita o deshabilita el modo de arrastre para todos los widgets
     * @param {boolean} enabled - Si está habilitado o no
     */
    /**
 * Habilita o deshabilita el modo de arrastre para todos los widgets
 * @param {boolean} enabled - Si está habilitado o no
 */
enableDragging(enabled = true) {
  this.options.draggable = enabled;
  
  // Actualizar los controladores de arrastre existentes
  this.items.forEach(item => {
    const dragHandle = item.el.querySelector('.drag-grid-drag-handle');
    if (dragHandle) {
      if (enabled) {
        dragHandle.style.cursor = 'move';
        dragHandle.classList.remove('drag-disabled');
      } else {
        dragHandle.style.cursor = 'default';
        dragHandle.classList.add('drag-disabled');
      }
    }
  });
  
  // Modificar el comportamiento de arrastre
  this._canStartDrag = enabled;
  
  return this;
}
    
    /**
     * Habilita o deshabilita el modo de redimensionamiento para todos los widgets
     * @param {boolean} enabled - Si está habilitado o no
     */
    enableResizing(enabled = true) {
      this.options.resizable = enabled;
      
      // Mostrar u ocultar los manejadores de redimensionamiento
      this.items.forEach(item => {
        const resizeHandle = item.el.querySelector('.resize-handle');
        if (resizeHandle) {
          resizeHandle.style.display = enabled ? 'block' : 'none';
        }
      });
      
      return this;
    }
    
    /**
     * Habilita o deshabilita la capacidad de eliminar widgets
     * @param {boolean} enabled - Si está habilitado o no
     */
    enableRemoving(enabled = true) {
      this.options.removable = enabled;
      
      // Añadir o quitar botones de eliminar
      this.items.forEach(item => {
        const dragHandle = item.el.querySelector('.drag-grid-drag-handle');
        if (dragHandle) {
          let removeButton = dragHandle.querySelector('.remove-button');
          
          if (enabled && !removeButton) {
            removeButton = document.createElement('span');
            removeButton.className = 'remove-button';
            const svgNS = 'http://www.w3.org/2000/svg';
            const svg = document.createElementNS(svgNS, 'svg');
            svg.setAttribute('width', '16');
            svg.setAttribute('height', '16');
            svg.setAttribute('viewBox', '0 0 24 24');
            svg.setAttribute('fill', 'none');
            svg.setAttribute('stroke', 'currentColor');
            svg.setAttribute('stroke-width', '2');
            svg.setAttribute('stroke-linecap', 'round');
            svg.setAttribute('stroke-linejoin', 'round');

            // Linea 1: de esquina a esquina
            const line1 = document.createElementNS(svgNS, 'line');
            line1.setAttribute('x1', '18');
            line1.setAttribute('y1', '6');
            line1.setAttribute('x2', '6');
            line1.setAttribute('y2', '18');

            // Linea 2: la otra diagonal
            const line2 = document.createElementNS(svgNS, 'line');
            line2.setAttribute('x1', '6');
            line2.setAttribute('y1', '6');
            line2.setAttribute('x2', '18');
            line2.setAttribute('y2', '18');

            // Añadir líneas al SVG
            svg.appendChild(line1);
            svg.appendChild(line2);

            // Añadir SVG al botón
            removeButton.appendChild(svg);
            removeButton.addEventListener('click', (e) => {
              e.stopPropagation();
              this.removeWidget(item.el);
            });
            dragHandle.appendChild(removeButton);
          } else if (!enabled && removeButton) {
            dragHandle.removeChild(removeButton);
          }
        }
      });
      
      return this;
  }
  /**
   * Habilita o deshabilita el intercambio (swap) entre widgets
   * @param {boolean} enabled - Si está habilitado o no
   */
  enableSwap(enabled = true) {
    this.options.swappable = enabled;
    return this;
  }
  
}
