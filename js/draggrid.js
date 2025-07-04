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
      compact: true, 
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
  
    this._handleDragMove = this._handleDragMove.bind(this);
    this._handleDragEnd = this._handleDragEnd.bind(this);
    this._handleResizeMove = this._handleResizeMove.bind(this);
    this._handleResizeEnd = this._handleResizeEnd.bind(this);

    this._initGrid();
    this._initStyles();
    this._initContainer();
    this._createPlaceholder();
  }

  _initGrid() {
    for (let row = 0; row < 100; row++) { 
      this.grid[row] = [];
      for (let col = 0; col < this.options.columns; col++) {
        this.grid[row][col] = null;
      }
    }
  }

  _initStyles() {
    if (!document.getElementById('drag-grid-styles')) {
      const styles = document.createElement('style');
      styles.id = 'drag-grid-styles';
      styles.textContent = `
        .drag-grid-container {
          position: relative;
          width: 100%;
          background: #222222;
          min-height: 100px;
        }
        .drag-grid-item {
          position: absolute;
          background: #333;
          color: #fff;
          border: 1px solid #444;
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
          border: 1pxrgb(48, 64, 77);
          border-radius: 5px;
          position: absolute;
          z-index: 9;
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
          background-color: rgba(29, 34, 40, 0.2);
          padding: 0.3rem;
          border-radius: 5px;
          display: flex;
          justify-content: center;
          align-items: center;
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

  _initContainer() {
    this.container.classList.add('drag-grid-container');
    this.container.style.height = `${this.options.rowHeight * 5}px`;
  }

  _createPlaceholder() {
    this.placeholderElement = document.createElement('div');
    this.placeholderElement.className = 'drag-grid-placeholder';
    this.placeholderElement.style.display = 'none';
    this.container.appendChild(this.placeholderElement);
  }

  _setupDragAndResize(element, config) {
    if (!this.options.draggable && !this.options.resizable) {
      return;
    }
    let dragHandle = element.querySelector('.drag-grid-drag-handle');
    if (!dragHandle && this.options.draggable) {
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

        const line1 = document.createElementNS(svgNS, 'line');
        line1.setAttribute('x1', '18');
        line1.setAttribute('y1', '6');
        line1.setAttribute('x2', '6');
        line1.setAttribute('y2', '18');

        const line2 = document.createElementNS(svgNS, 'line');
        line2.setAttribute('x1', '6');
        line2.setAttribute('y1', '6');
        line2.setAttribute('x2', '18');
        line2.setAttribute('y2', '18');

        svg.appendChild(line1);
        svg.appendChild(line2);

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
        
        paths.forEach(d => {
          const path = document.createElementNS(svgNS, 'path');
          path.setAttribute('d', d);
          svg.appendChild(path);
        });

        resizeHandle.appendChild(svg);
        element.appendChild(resizeHandle);
      }

      resizeHandle.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.isResizing = true;
        this.resizeItem = element;
        this.startX = e.clientX;
        this.startY = e.clientY;
        this.startWidth = element.offsetWidth;
        this.startHeight = element.offsetHeight;

        element.classList.add('resizing');

        const index = this.items.findIndex(item => item.el === element);
        if (index !== -1) {
          const currentConfig = this.items[index].config;
          this.startPosX = currentConfig.x;
          this.startPosY = currentConfig.y;
        }

        document.addEventListener('mousemove', this._handleResizeMove);
        document.addEventListener('mouseup', this._handleResizeEnd);
      });
    }
    if (this.options.draggable && dragHandle) {

      dragHandle.addEventListener('mousedown', (e) => {
        if (!this._canStartDrag || dragHandle.classList.contains('drag-disabled')) {
          return;
        }
        e.preventDefault();
        this.isDragging = true;
        this.dragItem = element;
        this.startX = e.clientX;
        this.startY = e.clientY;
        
        element.classList.add('dragging');
        
        const index = this.items.findIndex(item => item.el === element);
        if (index !== -1) {
          const currentConfig = this.items[index].config;
          this.startPosX = currentConfig.x;
          this.startPosY = currentConfig.y;
          this.startWidth = currentConfig.width;
          this.startHeight = currentConfig.height;
          
          this._updatePlaceholder(currentConfig.x, currentConfig.y, currentConfig.width, currentConfig.height);
          this.placeholderElement.style.display = 'block';
        }
        
        document.addEventListener('mousemove', this._handleDragMove);
        document.addEventListener('mouseup', this._handleDragEnd);
      });
    }
  }

  _handleDragMove(e) {
    if (!this.isDragging || !this.dragItem) return;
  
    const deltaX = e.clientX - this.startX;
    const deltaY = e.clientY - this.startY;
  
    const colWidth = this.container.offsetWidth / this.options.columns;
    const deltaGridX = Math.round(deltaX / colWidth);
    const deltaGridY = Math.round(deltaY / this.options.rowHeight);
  
    const newX = Math.max(0, Math.min(this.startPosX + deltaGridX, this.options.columns - this.startWidth));
    const newY = Math.max(0, this.startPosY + deltaGridY);

    if (this._canFit(newX, newY, this.startWidth, this.startHeight, this.dragItem.id)) {
      this._updatePlaceholder(newX, newY, this.startWidth, this.startHeight);
      this.placeholderElement.style.display = 'block';
      this.placeholderElement.style.backgroundColor = 'rgba(33, 150, 243, 0.2)'; 
      this.swapTargetWidget = null;
    } else if (this.options.swappable) {
      const targetWidget = this._findPredominantWidgetInRegion(newX, newY, this.startWidth, this.startHeight, this.dragItem.id);
    
      if (targetWidget) {
        this.swapTargetWidget = targetWidget.item;
      
        this._updatePlaceholder(
          targetWidget.item.config.x, 
          targetWidget.item.config.y, 
          targetWidget.item.config.width, 
          targetWidget.item.config.height
        );
        this.placeholderElement.style.display = 'block';
        this.placeholderElement.style.backgroundColor = 'rgba(112, 62, 46, 0.2)'; 
      } else {
        this.placeholderElement.style.display = 'none';
        this.swapTargetWidget = null;
      }
    } else {
      this.placeholderElement.style.display = 'none';
    }
  }

  _handleDragEnd(e) {
    if (!this.isDragging || !this.dragItem) return;
  
    const deltaX = e.clientX - this.startX;
    const deltaY = e.clientY - this.startY;

    const colWidth = this.container.offsetWidth / this.options.columns;
    const deltaGridX = Math.round(deltaX / colWidth);
    const deltaGridY = Math.round(deltaY / this.options.rowHeight);
  
    const newX = Math.max(0, Math.min(this.startPosX + deltaGridX, this.options.columns - this.startWidth));
    const newY = Math.max(0, this.startPosY + deltaGridY);
  
    const dragIndex = this.items.findIndex(item => item.el === this.dragItem);
    if (dragIndex !== -1) {
      this._freeGridSpace(this.items[dragIndex].config.id);
    
      if (this._canFit(newX, newY, this.startWidth, this.startHeight, this.dragItem.id)) {
        this.moveWidget(this.dragItem, newX, newY);
      } 
      else if (this.options.swappable && this.swapTargetWidget) {
        this._swapWidgets(this.items[dragIndex], this.swapTargetWidget);
      } 
      else {
        const itemConfig = this.items[dragIndex].config;
      
        itemConfig.x = newX;
        itemConfig.y = newY;
      
        this.dragItem.setAttribute('data-gs-x', newX);
        this.dragItem.setAttribute('data-gs-y', newY);
        this._updateElementStyles(this.dragItem, itemConfig);
      
        this._occupyGrid(itemConfig);
        this._resolveCollisionsWithItem(itemConfig);
      }
    }
  
    this.dragItem.classList.remove('dragging');
    this.isDragging = false;
    this.dragItem = null;
    this.swapTargetWidget = null;
    this.placeholderElement.style.display = 'none';
    this.placeholderElement.style.backgroundColor = 'rgba(33, 150, 243, 0.2)';
  
    document.removeEventListener('mousemove', this._handleDragMove);
    document.removeEventListener('mouseup', this._handleDragEnd);
    this._triggerChange();
  }

  _handleResizeMove(e) {
    if (!this.isResizing || !this.resizeItem) return;

    const deltaX = e.clientX - this.startX;
    const deltaY = e.clientY - this.startY;

    const colWidth = this.container.offsetWidth / this.options.columns;
    let newWidthPx = Math.max(this.startWidth + deltaX, this.options.minWidth);
    const newHeightPx = Math.max(this.startHeight + deltaY, this.options.rowHeight);

    const itemIndex = this.items.findIndex(item => item.el === this.resizeItem);
    const currentX = itemIndex !== -1 ? this.items[itemIndex].config.x : 0;
  
    const maxAvailableWidth = (this.options.columns - currentX) * colWidth;

    newWidthPx = Math.min(newWidthPx, maxAvailableWidth);

    const newWidth = Math.round(newWidthPx / colWidth);
    const newHeight = Math.round(newHeightPx / this.options.rowHeight);

    this._updatePlaceholder(this.startPosX, this.startPosY, newWidth, newHeight);
    this.placeholderElement.style.display = 'block';
  
    if (this._canFit(this.startPosX, this.startPosY, newWidth, newHeight, this.resizeItem.id)) {
      this.placeholderElement.style.backgroundColor = 'rgba(55, 70, 83, 0.2)';
    } else {
      this.placeholderElement.style.backgroundColor = 'rgba(88, 98, 76, 0.2)'; 
    }
  }

  _handleResizeEnd(e) {
    if (!this.isResizing || !this.resizeItem) return;

    const colWidth = this.container.offsetWidth / this.options.columns;
    const deltaX = e.clientX - this.startX;
    const deltaY = e.clientY - this.startY;

    const itemIndex = this.items.findIndex(item => item.el === this.resizeItem);
    if (itemIndex === -1) return;
  
    const currentConfig = this.items[itemIndex].config;
    const currentX = currentConfig.x;
    const oldWidth = currentConfig.width;
    const oldHeight = currentConfig.height;

    const maxAvailableWidth = (this.options.columns - currentX) * colWidth;

    let newWidthPx = Math.max(this.startWidth + deltaX, this.options.minWidth);
    newWidthPx = Math.min(newWidthPx, maxAvailableWidth);
  
    const newHeightPx = Math.max(this.startHeight + deltaY, this.options.rowHeight);

    const newWidth = Math.round(newWidthPx / colWidth);
    const newHeight = Math.round(newHeightPx / this.options.rowHeight);

    this._freeGridSpace(currentConfig.id);

    currentConfig.width = newWidth;
    currentConfig.height = newHeight;

    this.resizeItem.setAttribute('data-gs-width', newWidth);
    this.resizeItem.setAttribute('data-gs-height', newHeight);
    this._updateElementStyles(this.resizeItem, currentConfig);
    this._occupyGrid(currentConfig);

    if (newWidth > oldWidth || newHeight > oldHeight) {
      this._resolveCollisionsWithItem(currentConfig);
    } 
  
    if (this.options.compact && (newWidth < oldWidth || newHeight < oldHeight)) {
      this._compactLayout();
    }

    this._triggerChange();
    this.resizeItem.classList.remove('resizing');
    this.isResizing = false;
    this.resizeItem = null;
    this.placeholderElement.style.display = 'none';
    this.placeholderElement.style.backgroundColor = 'rgba(33, 150, 243, 0.2)'; // Restaurar color original
    document.removeEventListener('mousemove', this._handleResizeMove);
    document.removeEventListener('mouseup', this._handleResizeEnd);
    this._updateContainerHeight();
  }

  _compactLayout() {
    const sortedItems = [...this.items].sort((a, b) => {
      if (a.config.y === b.config.y) return a.config.x - b.config.x;
      return a.config.y - b.config.y;
    });

    for (const item of sortedItems) {
      this._freeGridSpace(item.config.id);
    }

    for (const item of sortedItems) {
      let newY = 0;
      let found = false;
      
      while (!found) {
        if (this._canFit(item.config.x, newY, item.config.width, item.config.height, item.config.id)) {
          found = true;
        } else {
          newY++;
        }
      }
      if (newY !== item.config.y) {
        item.config.y = newY;
        item.el.setAttribute('data-gs-y', newY);
        this._updateElementStyles(item.el, item.config);
      }
      this._occupyGrid(item.config);
    }
  }

  _resolveCollisionsWithItem(itemConfig) {
    const affectedItems = this._getAffectedItems(itemConfig);
    if (affectedItems.length === 0) return;
    
    const isVerticalResizeOnly = this.resizeItem && 
      this.startWidth === itemConfig.width &&
      this.startHeight < itemConfig.height;
    
    const isHorizontalResizeOnly = this.resizeItem && 
      this.startWidth < itemConfig.width &&
      this.startHeight === itemConfig.height;
    
    const isDiagonalResize = this.resizeItem &&
      this.startWidth < itemConfig.width &&
      this.startHeight < itemConfig.height;
    
    const isVerticalMoveOnly = !this.resizeItem && 
      this.startX === itemConfig.x &&
      this.startY < itemConfig.y;
    
    affectedItems.forEach(item => {
      this._freeGridSpace(item.config.id);
    });
    
    if (isDiagonalResize) {
      const itemsToRight = affectedItems.filter(item => {
        return item.config.x >= itemConfig.x + this.startWidth &&
               item.config.y < itemConfig.y + this.startHeight && 
               item.config.y + item.config.height > itemConfig.y;
      });
      
      const itemsBelow = affectedItems.filter(item => {
        return item.config.y >= itemConfig.y + this.startHeight && 
               item.config.x < itemConfig.x + this.startWidth && 
               item.config.x + item.config.width > itemConfig.x;
      });
      
      const itemsInDiagonalRegion = affectedItems.filter(item => {
        return item.config.x >= itemConfig.x + this.startWidth && 
               item.config.y >= itemConfig.y + this.startHeight;
      });
      
      itemsToRight.sort((a, b) => a.config.x - b.config.x);
      for (const item of itemsToRight) {
        let newX = itemConfig.x + itemConfig.width;
        
        while (!this._canFit(newX, item.config.y, item.config.width, item.config.height, item.config.id)) {
          newX++;
        }
        
        item.config.x = newX;
        item.el.setAttribute('data-gs-x', newX);
        this._updateElementStyles(item.el, item.config);
        this._occupyGrid(item.config);
      }
      
      itemsBelow.sort((a, b) => a.config.y - b.config.y);
      for (const item of itemsBelow) {
        let newY = itemConfig.y + itemConfig.height;
        
        while (!this._canFit(item.config.x, newY, item.config.width, item.config.height, item.config.id)) {
          newY++;
        }
        
        item.config.y = newY;
        item.el.setAttribute('data-gs-y', newY);
        this._updateElementStyles(item.el, item.config);
        this._occupyGrid(item.config);
      }
      
      for (const item of itemsInDiagonalRegion) {
        let newX = itemConfig.x + itemConfig.width;
        let newY = item.config.y;
        
        if (!this._canFit(newX, newY, item.config.width, item.config.height, item.config.id)) {
          newX = item.config.x;
          newY = itemConfig.y + itemConfig.height;
          
          if (!this._canFit(newX, newY, item.config.width, item.config.height, item.config.id)) {
            newX = itemConfig.x + itemConfig.width;
            
            while (!this._canFit(newX, newY, item.config.width, item.config.height, item.config.id)) {
              newY++;
            }
          }
        }
        
        item.config.x = newX;
        item.config.y = newY;
        item.el.setAttribute('data-gs-x', newX);
        item.el.setAttribute('data-gs-y', newY);
        this._updateElementStyles(item.el, item.config);
        this._occupyGrid(item.config);
      }
      
      const processedItems = [...itemsToRight, ...itemsBelow, ...itemsInDiagonalRegion].map(item => item.config.id);
      affectedItems.forEach(item => {
        if (!processedItems.includes(item.config.id)) {
          this._occupyGrid(item.config);
        }
      });
    }
    else if (isVerticalResizeOnly || isVerticalMoveOnly) {
      const itemsToProcess = affectedItems.filter(item => {
        const isDirectlyBelow = 
          item.config.y >= (isVerticalResizeOnly ? this.startPosY + this.startHeight : this.startY) &&
          ((item.config.x < itemConfig.x + itemConfig.width && 
          item.config.x + item.config.width > itemConfig.x) ||  
          (item.config.x === itemConfig.x && item.config.width === itemConfig.width)); 
        
        return isDirectlyBelow;
      });
      
      itemsToProcess.sort((a, b) => {
        if (a.config.y === b.config.y) return a.config.x - b.config.x;
        return a.config.y - b.config.y;
      });
      
      for (const item of itemsToProcess) {
        let newY = itemConfig.y + itemConfig.height;
        
        while (!this._canFit(item.config.x, newY, item.config.width, item.config.height, item.config.id)) {
          newY++;
        }
        
        item.config.y = newY;
        item.el.setAttribute('data-gs-y', newY);
        this._updateElementStyles(item.el, item.config);
        this._occupyGrid(item.config);
      }
      
      affectedItems.forEach(item => {
        if (!itemsToProcess.some(processedItem => processedItem.config.id === item.config.id)) {
          this._occupyGrid(item.config);
        }
      });
    } 
    else if (isHorizontalResizeOnly) {
      const itemsToRight = affectedItems.filter(item => {
        return item.config.x >= this.startPosX + this.startWidth && 
               item.config.y < itemConfig.y + itemConfig.height && 
               item.config.y + item.config.height > itemConfig.y;
      });
      
      itemsToRight.sort((a, b) => a.config.x - b.config.x);
      
      for (const item of itemsToRight) {
        let newX = itemConfig.x + itemConfig.width;
        
        while (!this._canFit(newX, item.config.y, item.config.width, item.config.height, item.config.id)) {
          newX++;
        }
        
        item.config.x = newX;
        item.el.setAttribute('data-gs-x', newX);
        this._updateElementStyles(item.el, item.config);
        this._occupyGrid(item.config);
      }
      
      affectedItems.forEach(item => {
        if (!itemsToRight.some(rightItem => rightItem.config.id === item.config.id)) {
          this._occupyGrid(item.config);
        }
      });
    } 
    else {
      affectedItems.sort((a, b) => {
        if (a.config.y === b.config.y) return a.config.x - b.config.x;
        return a.config.y - b.config.y;
      });
      
      for (const item of affectedItems) {
        let newY = itemConfig.y + itemConfig.height;
        let newX = item.config.x;
        
        if (this._canFit(newX, newY, item.config.width, item.config.height, item.config.id)) {
          item.config.y = newY;
          item.el.setAttribute('data-gs-y', newY);
        } else {
          newY = item.config.y;
          newX = itemConfig.x + itemConfig.width;
          
          if (this._canFit(newX, newY, item.config.width, item.config.height, item.config.id)) {
            item.config.x = newX;
            item.el.setAttribute('data-gs-x', newX);
          } else {
            newX = item.config.x;
            newY = itemConfig.y + itemConfig.height;
            
            while (!this._canFit(newX, newY, item.config.width, item.config.height, item.config.id)) {
              newY++;
            }
            
            item.config.y = newY;
            item.el.setAttribute('data-gs-y', newY);
          }
        }
        
        this._updateElementStyles(item.el, item.config);
        this._occupyGrid(item.config);
      }
    }
    
    this._updateContainerHeight();
  }

  _getAffectedItems(itemConfig) {
    const affectedItems = [];
    
    for (const item of this.items) {
      if (item.config.id === itemConfig.id) continue;
      
      const isColliding = 
        item.config.x < itemConfig.x + itemConfig.width &&
        item.config.x + item.config.width > itemConfig.x &&
        item.config.y < itemConfig.y + itemConfig.height &&
        item.config.y + item.config.height > itemConfig.y;
      
      if (isColliding) {
        affectedItems.push(item);
      }
    }
    
    return affectedItems;
  }

  _shiftWidgetsRight(startX, startY, widthToAdd, height, skipId) {
    const affectedWidgets = [];
    
    for (let i = 0; i < this.items.length; i++) {
      const widget = this.items[i];
      if (widget.config.id === skipId) continue;
      
      const widgetX = widget.config.x;
      const widgetY = widget.config.y;
      const widgetWidth = widget.config.width;
      const widgetHeight = widget.config.height;

      const yOverlap = (widgetY < startY + height) && (widgetY + widgetHeight > startY);
      
      const isToRight = widgetX >= startX;
      
      if (yOverlap && isToRight) {
        affectedWidgets.push({
          index: i,
          currentX: widgetX
        });
      }
    }
    
    affectedWidgets.sort((a, b) => b.currentX - a.currentX);
    
    for (const widget of affectedWidgets) {
      const config = this.items[widget.index].config;
      const element = this.items[widget.index].el;
      
      if (config.x + widthToAdd + config.width > this.options.columns) {
        const newY = config.y + height;
        
        this._freeGridSpace(config.id);
        
        config.x = 0; 
        config.y = newY;
        
        element.setAttribute('data-gs-x', config.x);
        element.setAttribute('data-gs-y', config.y);
        this._updateElementStyles(element, config);
        
        this._occupyGrid(config);
      } else {
        this._freeGridSpace(config.id);
        
        config.x = config.x + widthToAdd;
        
        element.setAttribute('data-gs-x', config.x);
        this._updateElementStyles(element, config);
        
        this._occupyGrid(config);
      }
    }
  }

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

  _findPredominantWidgetInRegion(x, y, width, height, skipId) {
    const widgetCounts = {};
    let maxCount = 0;
    let predominantWidgetId = null;
    
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

  _swapWidgets(sourceWidget, targetWidget) {
    const sourceX = sourceWidget.config.x;
    const sourceY = sourceWidget.config.y;
    const sourceWidth = sourceWidget.config.width;
    const sourceHeight = sourceWidget.config.height;
    
    const targetX = targetWidget.config.x;
    const targetY = targetWidget.config.y;
    const targetWidth = targetWidget.config.width;
    const targetHeight = targetWidget.config.height;
    
    this._freeGridSpace(sourceWidget.config.id);
    this._freeGridSpace(targetWidget.config.id);
    
    sourceWidget.config.x = targetX;
    sourceWidget.config.y = targetY;
    sourceWidget.config.width = targetWidth;
    sourceWidget.config.height = targetHeight;
    
    targetWidget.config.x = sourceX;
    targetWidget.config.y = sourceY;
    targetWidget.config.width = sourceWidth;
    targetWidget.config.height = sourceHeight;
    
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
    
    this._occupyGrid(sourceWidget.config);
    this._occupyGrid(targetWidget.config);
    this._updateContainerHeight();
  }


  onChange(callback) {
    this.onChangeCallback = callback;
  }

  _triggerChange() {
    if (this.onChangeCallback) {
      const serializedData = this.serialize();
      this.onChangeCallback(serializedData);
      if (this.options.saveUrl) {
        this.saveToServer(serializedData);
      }
    }
  }

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

  addWidget(options = {}) {
    const defaults = {
      x: 0,
      y: 0,
      width: 3,
      height: 2,
      content: '',
      title: '',
      class: '',
      id: `widget-${Date.now()}`
    };

    const config = Object.assign({}, defaults, options);
    const element = document.createElement('div');
    element.className = `drag-grid-item ${config.class}`;
    element.id = config.id;
    
    element.setAttribute('data-gs-x', config.x);
    element.setAttribute('data-gs-y', config.y);
    element.setAttribute('data-gs-width', config.width);
    element.setAttribute('data-gs-height', config.height);
    
    this._updateElementStyles(element, config);
    
    const content = document.createElement('div');
    content.className = 'drag-grid-item-content';
    content.innerHTML = config.content;
    element.appendChild(content);
    
    this.container.appendChild(element);
    
    this._occupyGrid(config);

    this.items.push({
      el: element,
      config: config
    });
    

    this._setupDragAndResize(element, config);
    
    this._updateContainerHeight();
    
    this._triggerChange();
    
    return element;
  }

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

  _occupyGrid(config) {
    for (let row = config.y; row < config.y + config.height; row++) {
      for (let col = config.x; col < config.x + config.width; col++) {
        if (this.grid[row] && this.grid[row][col] !== undefined) {
          this.grid[row][col] = config.id;
        }
      }
    }
  }

  _updateContainerHeight() {
    let maxY = 0;
    
    this.items.forEach(item => {
      const bottomY = parseInt(item.config.y) + parseInt(item.config.height);
      maxY = Math.max(maxY, bottomY);
    });
    
    const newHeight = Math.max(5, maxY) * this.options.rowHeight;
    this.container.style.height = `${newHeight}px`;
  }

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

  _canFit(x, y, width, height, skipId = null) {
    if (x < 0 || x + width > this.options.columns || y < 0) {
      return false;
    }
  
    for (let row = y; row < y + height; row++) {
      for (let col = x; col < x + width; col++) {
        if (!this.grid[row]) {
          this.grid[row] = [];
          for (let i = 0; i < this.options.columns; i++) {
            this.grid[row][i] = null;
          }
        }
        
        if (this.grid[row][col] !== null && this.grid[row][col] !== skipId) {
          return false;
        }
      }
    }
    
    return true;
  }

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

  removeWidget(el) {
    const element = typeof el === 'string' ? document.getElementById(el) : el;
    if (!element) return;
    
    const index = this.items.findIndex(item => item.el === element);
    if (index !== -1) {
      const config = this.items[index].config;
      
      this._freeGridSpace(config.id);
      
      element.parentElement.removeChild(element);
      this.items.splice(index, 1);
      
      if (this.options.compact) {
        this._compactLayout();
      }
      
      this._updateContainerHeight();
      
      this._triggerChange();
    }
  }
  enableCompact(enabled = true) {
    this.options.compact = enabled;
    
    if (enabled) {
      this._compactLayout();
      this._updateContainerHeight();
    }
    
    return this;
  }

  moveWidget(el, x, y) {
    const element = typeof el === 'string' ? document.getElementById(el) : el;
    if (!element) return;
    
    const index = this.items.findIndex(item => item.el === element);
    if (index !== -1) {
      const config = this.items[index].config;
      
      this._freeGridSpace(config.id);

      config.x = x;
      config.y = y;
      

      element.setAttribute('data-gs-x', x);
      element.setAttribute('data-gs-y', y);
      this._updateElementStyles(element, config);
      
      this._occupyGrid(config);
      
      this._updateContainerHeight();
    }
  }

  resizeWidget(el, width, height) {
    const element = typeof el === 'string' ? document.getElementById(el) : el;
    if (!element) return;
    
    const index = this.items.findIndex(item => item.el === element);
    if (index !== -1) {
      const config = this.items[index].config;
      

      this._freeGridSpace(config.id);
      
      config.width = width;
      config.height = height;
      
      element.setAttribute('data-gs-width', width);
      element.setAttribute('data-gs-height', height);
      this._updateElementStyles(element, config);
      
      this._occupyGrid(config);
      
      this._updateContainerHeight();
    }
  }

  serialize() {
    return this.items.map(item => {
      return {
        id: item.config.id,
        x: parseInt(item.el.getAttribute('data-gs-x')),
        y: parseInt(item.el.getAttribute('data-gs-y')),
        width: parseInt(item.el.getAttribute('data-gs-width')),
        height: parseInt(item.el.getAttribute('data-gs-height')),
        content: item.el.querySelector('.drag-grid-item-content').innerHTML,
        class: item.config.class || '',
        title: item.config.title || ''
      };
    });
  }

  load(items) {
      while (this.items.length > 0) {
        this.removeWidget(this.items[0].el);
      }
      
      this._initGrid();
      
      if (Array.isArray(items) && items.length > 0) {
        items.forEach(item => {
          this.addWidget({
            id: item.id || `widget-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            x: parseInt(item.x) || 0,
            y: parseInt(item.y) || 0,
            width: parseInt(item.width) || 3,
            height: parseInt(item.height) || 2,
            content: item.content || '',
            class: item.class || '',
            title: item.title || ''
          });
        });
      }
      
      this._updateContainerHeight();
      
      return this;
    }
    

  clear() {
    while (this.items.length > 0) {
      this.removeWidget(this.items[0].el);
    }
    
    this._initGrid();

    this._updateContainerHeight();
    
    this._triggerChange();
    
    return this;
  }
    
  updateWidgetContent(el, content) {
    const element = typeof el === 'string' ? document.getElementById(el) : el;
    if (!element) return;
    
    const contentEl = element.querySelector('.drag-grid-item-content');
    if (contentEl) {
      contentEl.innerHTML = content;
      
      const index = this.items.findIndex(item => item.el === element);
      if (index !== -1) {
        this.items[index].config.content = content;
        
        this._triggerChange();
      }
    }
    
    return this;
  }
    
  updateWidgetTitle(el, title) {
    const element = typeof el === 'string' ? document.getElementById(el) : el;
    if (!element) return;
    
    const dragHandle = element.querySelector('.drag-grid-drag-handle');
    if (dragHandle) {
      const removeButton = dragHandle.querySelector('.remove-button');
      
      if (removeButton) {
        dragHandle.innerHTML = title;
        dragHandle.appendChild(removeButton);
      } else {
        dragHandle.innerHTML = title;
      }
      
      const index = this.items.findIndex(item => item.el === element);
      if (index !== -1) {
        this.items[index].config.title = title;
        
        this._triggerChange();
      }
    }
    
    return this;
  }
    
  getWidgetConfig(id) {
    const item = this.items.find(item => item.config.id === id);
    return item ? { ...item.config } : null;
  }
    
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
    
  addWidgetClass(el, className) {
    const element = typeof el === 'string' ? document.getElementById(el) : el;
    if (element && className) {
      element.classList.add(className);
    }
    return this;
  }
  
  removeWidgetClass(el, className) {
    const element = typeof el === 'string' ? document.getElementById(el) : el;
    if (element && className) {
      element.classList.remove(className);
    }
    return this;
  }
    
  updateOptions(options) {
    this.options = Object.assign(this.options, options);

    this.items.forEach(item => {
      this._updateElementStyles(item.el, item.config);
    });
    
    this._updateContainerHeight();
    
    return this;
  }

  enableDragging(enabled = true) {
    this.options.draggable = enabled;
    
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
    
    this._canStartDrag = enabled;
    
    return this;
  }
    
  enableResizing(enabled = true) {
    this.options.resizable = enabled;
    
    this.items.forEach(item => {
      const resizeHandle = item.el.querySelector('.resize-handle');
      if (resizeHandle) {
        resizeHandle.style.display = enabled ? 'block' : 'none';
      }
    });
    
    return this;
  }
    
  enableRemoving(enabled = true) {
    this.options.removable = enabled;
    
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

          const line1 = document.createElementNS(svgNS, 'line');
          line1.setAttribute('x1', '18');
          line1.setAttribute('y1', '6');
          line1.setAttribute('x2', '6');
          line1.setAttribute('y2', '18');

          const line2 = document.createElementNS(svgNS, 'line');
          line2.setAttribute('x1', '6');
          line2.setAttribute('y1', '6');
          line2.setAttribute('x2', '18');
          line2.setAttribute('y2', '18');

          svg.appendChild(line1);
          svg.appendChild(line2);

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

  enableSwap(enabled = true) {
    this.options.swappable = enabled;
    return this;
  }
}
