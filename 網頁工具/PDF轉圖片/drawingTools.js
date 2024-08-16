const DrawingTools = (function(utils) {
    let currentTool = 'mouse';
    let currentShape = 'rectangle';
    let isDrawing = false;
    let startX = 0;
    let startY = 0;
    let lastX = 0;
    let lastY = 0;
    let currentStroke = null;
    let drawingHistories = new Map();
    let redoHistories = new Map();
    let currentPage = 1;
    let tempCanvas = null;
    let colorPalettesInitialized = false;

    function setCurrentTool(tool) {
        currentTool = tool;
        resetCanvasContext();
        updateToolUI();
    }

    function setCurrentShape(shape) {
        currentShape = shape;
        if (typeof utils.updateShapeButton === 'function') {
            utils.updateShapeButton(shape);
        } else {
            console.warn('utils.updateShapeButton is not a function');
        }
    }

    function setCurrentPage(pageNum) {
        currentPage = pageNum;
        if (!drawingHistories.has(pageNum)) {
            drawingHistories.set(pageNum, []);
            redoHistories.set(pageNum, []);
        }
    }

    function resetCanvasContext() {
        const canvas = document.querySelector(`#page-container-${currentPage} .drawing-canvas`);
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.globalCompositeOperation = 'source-over';
            ctx.globalAlpha = 1;
        }
    }

    function initializeDrawingCanvas(canvas, pageNum) {
        setCurrentPage(pageNum);
        const context = canvas.getContext('2d');
        
        tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        
        canvas.addEventListener('mousedown', startDrawing);
        canvas.addEventListener('mousemove', draw);
        canvas.addEventListener('mouseup', stopDrawing);
        canvas.addEventListener('mouseout', stopDrawing);

        canvas.addEventListener('touchstart', handleTouchStart);
        canvas.addEventListener('touchmove', handleTouchMove);
        canvas.addEventListener('touchend', handleTouchEnd);

        if (!colorPalettesInitialized) {
            initializeColorPalette('pencilPalette', 'pencilColor');
            initializeColorPalette('highlighterPalette', 'highlighterColor');
            initializeColorPalette('shapePalette', 'shapeColor');
            colorPalettesInitialized = true;
        }

        document.getElementById('pencilColor').value = '#FF0000';
        document.getElementById('shapeColor').value = '#FF0000';

        initializeOpacitySliders();

        redrawCanvas(context);

        const shapeButtons = document.querySelectorAll('.shape-button');
        shapeButtons.forEach(button => {
            button.addEventListener('click', function() {
                setCurrentShape(this.dataset.shape);
            });
        });

        const shapeFillCheckbox = document.getElementById('shapeFill');
        if (shapeFillCheckbox) {
            shapeFillCheckbox.addEventListener('change', function() {
                setCurrentTool('shape');
                updateToolState();
            });
        }

        resetCanvasContext();
    }

    function initializeOpacitySliders() {
        const highlighterOpacitySlider = document.getElementById('highlighterOpacity');
        const shapeOpacitySlider = document.getElementById('shapeOpacity');

        if (highlighterOpacitySlider) {
            highlighterOpacitySlider.addEventListener('input', function() {
                updateOpacityDisplay('highlighter');
                updateToolState();
            });
        }

        if (shapeOpacitySlider) {
            shapeOpacitySlider.addEventListener('input', function() {
                updateOpacityDisplay('shape');
                updateToolState();
            });
        }

        updateOpacityDisplay('highlighter');
        updateOpacityDisplay('shape');
    }

    function updateOpacityDisplay(tool) {
        const opacitySlider = document.getElementById(`${tool}Opacity`);
        const opacityDisplay = document.getElementById(`${tool}OpacityDisplay`);
        if (opacitySlider && opacityDisplay) {
            const opacityValue = opacitySlider.value;
            opacityDisplay.textContent = `${opacityValue}%`;
        }
    }

    function startDrawing(e) {
        if (currentTool === 'mouse') return;
        isDrawing = true;
        [startX, startY] = getCanvasMousePosition(e.target, e);
        [lastX, lastY] = [startX, startY];
        currentStroke = {
            tool: currentTool,
            color: getToolColor(),
            lineWidth: getToolSize(),
            opacity: getToolOpacity(),
            points: [{x: startX, y: startY}]
        };

        if (currentTool === 'shape') {
            currentStroke.shapeType = currentShape;
            const shapeFillCheckbox = document.getElementById('shapeFill');
            currentStroke.fill = shapeFillCheckbox ? shapeFillCheckbox.checked : false;
            currentStroke.fillColor = currentStroke.color;
        }

        const ctx = e.target.getContext('2d');
        ctx.beginPath();
        ctx.moveTo(startX, startY);
    }

    function draw(e) {
        if (!isDrawing || currentTool === 'mouse') return;

        const canvas = e.target;
        const ctx = canvas.getContext('2d');
        const [x, y] = getCanvasMousePosition(canvas, e);

        if (currentTool === 'shape') {
            const tempCtx = tempCanvas.getContext('2d');
            tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
            drawShape(tempCtx, startX, startY, x, y, currentStroke);
            
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            redrawCanvas(ctx);
            ctx.drawImage(tempCanvas, 0, 0);
        } else if (currentTool === 'eraser') {
            applyEraser(ctx, lastX, lastY, x, y, currentStroke.lineWidth);
        } else {
            applyDrawingStyle(ctx, currentStroke);
            ctx.beginPath();
            ctx.moveTo(lastX, lastY);
            ctx.lineTo(x, y);
            ctx.stroke();
        }

        currentStroke.points.push({x, y});
        [lastX, lastY] = [x, y];
    }

    function stopDrawing(e) {
        if (isDrawing) {
            isDrawing = false;
            if (currentStroke && currentStroke.points.length > 1) {
                const canvas = e.target;
                const ctx = canvas.getContext('2d');

                if (currentTool === 'shape') {
                    const lastPoint = currentStroke.points[currentStroke.points.length - 1];
                    currentStroke.endX = lastPoint.x;
                    currentStroke.endY = lastPoint.y;
                }

                drawingHistories.get(currentPage).push(currentStroke);
                redoHistories.set(currentPage, []);

                redrawCanvas(ctx);
            }
            currentStroke = null;
            resetCanvasContext();
        }
    }

    function handleTouchStart(e) {
        e.preventDefault();
        const touch = e.touches[0];
        startDrawing({target: e.target, clientX: touch.clientX, clientY: touch.clientY});
    }

    function handleTouchMove(e) {
        e.preventDefault();
        const touch = e.touches[0];
        draw({target: e.target, clientX: touch.clientX, clientY: touch.clientY});
    }

    function handleTouchEnd(e) {
        e.preventDefault();
        stopDrawing({target: e.target});
    }

    function getToolColor() {
        let color;
        switch (currentTool) {
            case 'pencil':
                color = document.getElementById('pencilColor')?.value || '#000000';
                break;
            case 'highlighter':
                color = document.getElementById('highlighterColor')?.value || '#FFFF00';
                break;
            case 'shape':
                color = document.getElementById('shapeColor')?.value || '#FF0000';
                break;
            case 'eraser':
                color = '#FFFFFF';
                break;
            default:
                color = '#000000';
        }
        return color;
    }

    function convertToRGBA(color, opacity) {
        if (color.startsWith('#')) {
            const r = parseInt(color.slice(1, 3), 16);
            const g = parseInt(color.slice(3, 5), 16);
            const b = parseInt(color.slice(5, 7), 16);
            return `rgba(${r}, ${g}, ${b}, ${opacity})`;
        }
        return color;
    }

    function getToolSize() {
        switch (currentTool) {
            case 'pencil':
                return parseInt(document.getElementById('pencilSize')?.value || '1');
            case 'highlighter':
                return parseInt(document.getElementById('highlighterSize')?.value || '5');
            case 'eraser':
                return parseInt(document.getElementById('eraserSize')?.value || '10');
            case 'shape':
                return parseInt(document.getElementById('shapeSize')?.value || '2');
            default:
                return 1;
        }
    }

    function getToolOpacity() {
        switch (currentTool) {
            case 'highlighter':
                return parseInt(document.getElementById('highlighterOpacity')?.value || '50') / 100;
            case 'shape':
                if (currentShape === 'arrow') {
                    return 1; // 箭頭保持100%不透明度
                }
                return parseInt(document.getElementById('shapeOpacity')?.value || '100') / 100;
            default:
                return 1;
        }
    }

    function applyDrawingStyle(ctx, stroke) {
        ctx.strokeStyle = convertToRGBA(stroke.color, stroke.opacity);
        ctx.fillStyle = convertToRGBA(stroke.fillColor || stroke.color, stroke.opacity);
        ctx.lineWidth = stroke.lineWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalCompositeOperation = 'source-over';
    }

    function drawShape(ctx, startX, startY, endX, endY, stroke) {
        ctx.save();
        applyDrawingStyle(ctx, stroke);
        
        ctx.beginPath();
        switch (stroke.shapeType) {
            case 'rectangle':
                ctx.rect(startX, startY, endX - startX, endY - startY);
                if (stroke.fill) {
                    ctx.fill();
                } else {
                    ctx.stroke();
                }
                break;
            case 'circle':
                const radius = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
                ctx.arc(startX, startY, radius, 0, 2 * Math.PI);
                if (stroke.fill) {
                    ctx.fill();
                } else {
                    ctx.stroke();
                }
                break;
            case 'line':
                ctx.moveTo(startX, startY);
                ctx.lineTo(endX, endY);
                ctx.stroke();
                break;
            case 'arrow':
                ctx.globalAlpha = 1; // 確保箭頭始終是100%不透明
                drawArrow(ctx, startX, startY, endX, endY, stroke.lineWidth, 1, stroke.color);
                break;
        }
        
        ctx.restore();
    }

    function drawArrow(ctx, fromX, fromY, toX, toY, lineWidth, opacity, color) {
        const headLength = Math.min(lineWidth * 5, Math.sqrt(Math.pow(toX - fromX, 2) + Math.pow(toY - fromY, 2)) / 3);
        const angle = Math.atan2(toY - fromY, toX - fromX);
        const thirtyDegrees = Math.PI / 6;

        ctx.save();
        ctx.strokeStyle = convertToRGBA(color, opacity);
        ctx.lineWidth = lineWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalCompositeOperation = 'source-over';

        // 繪製箭桿
        ctx.beginPath();
        ctx.moveTo(fromX, fromY);
        ctx.lineTo(toX, toY);
        ctx.stroke();

        // 繪製左側箭頭線
        ctx.beginPath();
        ctx.moveTo(toX, toY);
        ctx.lineTo(
            toX - headLength * Math.cos(angle - thirtyDegrees),
            toY - headLength * Math.sin(angle - thirtyDegrees)
        );
        ctx.stroke();

        // 繪製右側箭頭線
        ctx.beginPath();
        ctx.moveTo(toX, toY);
        ctx.lineTo(
            toX - headLength * Math.cos(angle + thirtyDegrees),
            toY - headLength * Math.sin(angle + thirtyDegrees)
        );
        ctx.stroke();

        ctx.restore();
    }

    function applyEraser(ctx, startX, startY, endX, endY, size) {
        ctx.save();
        ctx.globalCompositeOperation = 'destination-out';
        ctx.strokeStyle = 'rgba(0,0,0,1)';
        ctx.lineWidth = size;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
        ctx.restore();
    }

    function redrawCanvas(ctx) {
        const pageNum = parseInt(ctx.canvas.dataset.pageNum);
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        const history = drawingHistories.get(pageNum) || [];

        history.forEach(stroke => {
            if (stroke.tool === 'clearAll') {
                ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            } else if (stroke.tool === 'shape') {
                drawShape(ctx, stroke.points[0].x, stroke.points[0].y, stroke.endX, stroke.endY, stroke);
            } else if (stroke.tool === 'eraser') {
                for (let i = 1; i < stroke.points.length; i++) {
                    applyEraser(ctx, stroke.points[i-1].x, stroke.points[i-1].y, 
                                stroke.points[i].x, stroke.points[i].y, stroke.lineWidth);
                }
                        } else {
                applyDrawingStyle(ctx, stroke);
                ctx.beginPath();
                ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
                stroke.points.forEach((point, index) => {
                    if (index > 0) {
                        ctx.lineTo(point.x, point.y);
                    }
                });
                ctx.stroke();
            }
        });

        resetCanvasContext();
    }

    function undo() {
        const history = drawingHistories.get(currentPage);
        const redoHistory = redoHistories.get(currentPage);
        if (history && history.length > 0) {
            const lastStroke = history.pop();
            redoHistory.push(lastStroke);
            redrawCanvas(document.querySelector(`#page-container-${currentPage} .drawing-canvas`).getContext('2d'));
        }
    }

    function redo() {
        const history = drawingHistories.get(currentPage);
        const redoHistory = redoHistories.get(currentPage);
        if (redoHistory && redoHistory.length > 0) {
            const strokeToRedo = redoHistory.pop();
            history.push(strokeToRedo);
            redrawCanvas(document.querySelector(`#page-container-${currentPage} .drawing-canvas`).getContext('2d'));
        }
    }

    function clearAll() {
        const history = drawingHistories.get(currentPage);
        history.push({ tool: 'clearAll' });
        redoHistories.set(currentPage, []);
        redrawCanvas(document.querySelector(`#page-container-${currentPage} .drawing-canvas`).getContext('2d'));
        if (typeof utils.showNotification === 'function') {
            utils.showNotification('已清除所有繪圖內容');
        } else {
            console.warn('utils.showNotification is not a function');
        }
    }

    function updateCursor() {
        const drawingCanvases = document.querySelectorAll('.drawing-canvas');
        drawingCanvases.forEach(canvas => {
            switch (currentTool) {
                case 'pencil':
                case 'highlighter':
                case 'shape':
                    canvas.style.cursor = 'crosshair';
                    const eraserCursor = document.getElementById('eraserCursor');
                    if (eraserCursor) {
                        eraserCursor.style.display = 'none';
                    }
                    break;
                case 'eraser':
                    canvas.style.cursor = 'none';
                    const eraserCursor2 = document.getElementById('eraserCursor');
                    if (eraserCursor2) {
                        eraserCursor2.style.display = 'block';
                    }
                    break;
                default:
                    canvas.style.cursor = 'default';
                    const eraserCursor3 = document.getElementById('eraserCursor');
                    if (eraserCursor3) {
                        eraserCursor3.style.display = 'none';
                    }
            }
        });
    }

    function updateEraserCursor(e) {
        const eraserCursor = document.getElementById('eraserCursor');
        if (!eraserCursor) return;

        if (currentTool === 'eraser') {
            const eraserSize = getToolSize();
            const canvas = e.target.closest('.drawing-canvas');
            if (!canvas) return;

            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;

            const x = (e.clientX - rect.left) * scaleX;
            const y = (e.clientY - rect.top) * scaleY;

            eraserCursor.style.width = `${eraserSize / scaleX}px`;
            eraserCursor.style.height = `${eraserSize / scaleY}px`;
            eraserCursor.style.left = `${e.clientX - eraserSize / (2 * scaleX)}px`;
            eraserCursor.style.top = `${e.clientY - eraserSize / (2 * scaleY)}px`;
            eraserCursor.style.border = '2px solid black';
            eraserCursor.style.backgroundColor = 'rgba(255, 255, 255, 0.5)';

            if (x >= 0 && x <= canvas.width && y >= 0 && y <= canvas.height) {
                eraserCursor.style.display = 'block';
            } else {
                eraserCursor.style.display = 'none';
            }
        } else {
            eraserCursor.style.display = 'none';
        }
    }

    function getCanvasMousePosition(canvas, e) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        return [
            (e.clientX - rect.left) * scaleX,
            (e.clientY - rect.top) * scaleY
        ];
    }

    function initializeColorPalette(paletteId, colorInputId) {
        const palette = document.getElementById(paletteId);
        const colorInput = document.getElementById(colorInputId);
        if (!palette || !colorInput) return;

        const colors = [
            { name: '黑色', hex: '#000000' },
            { name: '白色', hex: '#FFFFFF' },
            { name: '淺灰色', hex: '#D3D3D3' },
            { name: '深灰色', hex: '#808080' },
            { name: '粉紅色', hex: '#FFC0CB' },
            { name: '紅色', hex: '#FF0000' },
            { name: '橙色', hex: '#FFA500' },
            { name: '黃色', hex: '#FFFF00' },
            { name: '萊姆綠', hex: '#32CD32' },
            { name: '綠色', hex: '#008000' },
            { name: '藍色', hex: '#0000FF' },
            { name: '深藍色', hex: '#000080' },
            { name: '紫色', hex: '#800080' },
            { name: '紫羅蘭色', hex: '#EE82EE' },
            { name: '米色', hex: '#F5DEB3' },
            { name: '棕色', hex: '#A52A2A' },
            { name: '淺棕色', hex: '#DEB887' },
            { name: '淡黃色', hex: '#FFFACD' },
            { name: '薄荷綠', hex: '#98FB98' },
            { name: '淺藍色', hex: '#ADD8E6' }
        ];

        palette.innerHTML = '';

        colors.forEach(color => {
            const swatch = document.createElement('div');
            swatch.className = 'color-swatch';
            swatch.style.backgroundColor = color.hex;
            swatch.title = color.name;
            swatch.onclick = () => {
                colorInput.value = color.hex;
                colorInput.dispatchEvent(new Event('change'));
            };
            palette.appendChild(swatch);
        });
    }

    function updateToolState() {
        const toolState = {
            tool: currentTool,
            shape: currentShape,
            color: getToolColor(),
            size: getToolSize(),
            opacity: getToolOpacity(),
            fill: document.getElementById('shapeFill')?.checked || false
        };
        console.log('Current tool state:', toolState);
        return toolState;
    }

    function updateToolUI() {
        document.querySelectorAll('.tool-button').forEach(button => {
            button.classList.remove('active');
        });

        const activeToolButton = document.getElementById(`${currentTool}Tool`);
        if (activeToolButton) {
            activeToolButton.classList.add('active');
        }

        updateCursor();

        if (currentTool === 'shape') {
            document.querySelectorAll('.shape-button').forEach(button => {
                button.classList.remove('active');
                if (button.dataset.shape === currentShape) {
                    button.classList.add('active');
                }
            });
        }

        const highlighterOpacityContainer = document.getElementById('highlighterOpacityContainer');
        const shapeOpacityContainer = document.getElementById('shapeOpacityContainer');
        
        if (highlighterOpacityContainer) {
            highlighterOpacityContainer.style.display = currentTool === 'highlighter' ? 'block' : 'none';
        }
        if (shapeOpacityContainer) {
            shapeOpacityContainer.style.display = currentTool === 'shape' ? 'block' : 'none';
        }

        if (typeof utils.showNotification === 'function' && typeof utils.getToolName === 'function') {
            utils.showNotification(`已切換到${utils.getToolName(currentTool)}工具`);
        } else {
            console.warn('utils.showNotification or utils.getToolName is not a function');
        }
    }

    function getDrawingHistoryForPage(pageNum) {
        return drawingHistories.get(pageNum) || [];
    }

    return {
        setCurrentTool: setCurrentTool,
        setCurrentShape: setCurrentShape,
        setCurrentPage: setCurrentPage,
        initializeDrawingCanvas: initializeDrawingCanvas,
        redrawCanvas: redrawCanvas,
        updateCursor: updateCursor,
        updateEraserCursor: updateEraserCursor,
        undo: undo,
        redo: redo,
        clearAll: clearAll,
        updateToolState: updateToolState,
        getDrawingHistoryForPage: getDrawingHistoryForPage
    };
})(Utils);
