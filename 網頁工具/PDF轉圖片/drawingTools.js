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
    }

    function setCurrentShape(shape) {
        currentShape = shape;
        utils.updateShapeButton(shape);
    }

    function setCurrentPage(pageNum) {
        currentPage = pageNum;
        if (!drawingHistories.has(pageNum)) {
            drawingHistories.set(pageNum, []);
            redoHistories.set(pageNum, []);
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

        redrawCanvas(context);

        const shapeButtons = document.querySelectorAll('.shape-button');
        shapeButtons.forEach(button => {
            button.addEventListener('click', function() {
                setCurrentShape(this.dataset.shape);
            });
        });

        function startDrawing(e) {
            if (currentTool === 'mouse') return;
            isDrawing = true;
            [startX, startY] = utils.getMousePosition(canvas, e);
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
                currentStroke.fill = document.getElementById('shapeFill').checked;
            }
        }

        function draw(e) {
            if (!isDrawing || currentTool === 'mouse') return;

            const [x, y] = utils.getMousePosition(canvas, e);

            if (currentTool === 'shape') {
                const tempCtx = tempCanvas.getContext('2d');
                tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
                drawShape(tempCtx, startX, startY, x, y, currentStroke);
                
                context.clearRect(0, 0, canvas.width, canvas.height);
                redrawCanvas(context);
                context.drawImage(tempCanvas, 0, 0);
            } else {
                context.beginPath();
                context.moveTo(lastX, lastY);
                context.lineTo(x, y);
                utils.setDrawingStyle(context, currentStroke);
                context.globalCompositeOperation = currentTool === 'eraser' ? 'destination-out' : 'source-over';
                context.stroke();
            }

            currentStroke.points.push({x, y});
            [lastX, lastY] = [x, y];
        }

        function stopDrawing() {
            if (isDrawing) {
                isDrawing = false;
                if (currentStroke && currentStroke.points.length > 1) {
                    if (currentTool === 'shape') {
                        const lastPoint = currentStroke.points[currentStroke.points.length - 1];
                        currentStroke.endX = lastPoint.x;
                        currentStroke.endY = lastPoint.y;
                    }
                    drawingHistories.get(currentPage).push(currentStroke);
                    redoHistories.set(currentPage, []);
                }
                currentStroke = null;
                redrawCanvas(context);
            }
        }

        function handleTouchStart(e) {
            e.preventDefault();
            const touch = e.touches[0];
            startDrawing(touch);
        }

        function handleTouchMove(e) {
            e.preventDefault();
            const touch = e.touches[0];
            draw(touch);
        }

        function handleTouchEnd(e) {
            e.preventDefault();
            stopDrawing();
        }
    }

    function getToolColor() {
        switch (currentTool) {
            case 'pencil':
                return document.getElementById('pencilColor').value;
            case 'highlighter':
                return document.getElementById('highlighterColor').value;
            case 'shape':
                return document.getElementById('shapeColor').value;
            case 'eraser':
                return '#FFFFFF';
            default:
                return '#000000';
        }
    }

    function getToolSize() {
        switch (currentTool) {
            case 'pencil':
                return parseInt(document.getElementById('pencilSize').value);
            case 'highlighter':
                return parseInt(document.getElementById('highlighterSize').value);
            case 'eraser':
                return parseInt(document.getElementById('eraserSize').value);
            case 'shape':
                return parseInt(document.getElementById('shapeSize').value);
            default:
                return 1;
        }
    }

    function getToolOpacity() {
        if (currentTool === 'highlighter') {
            return parseInt(document.getElementById('highlighterOpacity').value) / 100;
        } else if (currentTool === 'shape') {
            return parseInt(document.getElementById('shapeOpacity').value) / 100;
        }
        return 1;
    }

    function drawShape(ctx, startX, startY, endX, endY, stroke) {
        ctx.beginPath();
        ctx.strokeStyle = stroke.color;
        ctx.fillStyle = stroke.color;
        ctx.lineWidth = stroke.lineWidth;
        ctx.globalAlpha = stroke.opacity;
        
        switch (stroke.shapeType) {
            case 'rectangle':
                ctx.rect(startX, startY, endX - startX, endY - startY);
                break;
            case 'circle':
                const radius = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
                ctx.arc(startX, startY, radius, 0, 2 * Math.PI);
                break;
            case 'line':
                ctx.moveTo(startX, startY);
                ctx.lineTo(endX, endY);
                ctx.lineCap = 'butt';
                break;
            case 'arrow':
                drawArrow(ctx, startX, startY, endX, endY, stroke.lineWidth);
                return;
        }
        
        if (stroke.fill && (stroke.shapeType === 'rectangle' || stroke.shapeType === 'circle')) {
            ctx.fill();
        } else {
            ctx.stroke();
        }
        ctx.globalAlpha = 1;
    }

    function drawArrow(ctx, fromX, fromY, toX, toY, lineWidth) {
        const angle = Math.atan2(toY - fromY, toX - fromX);
        const length = Math.sqrt(Math.pow(toX - fromX, 2) + Math.pow(toY - fromY, 2));

        const bodyWidth = lineWidth;
        const headWidth = bodyWidth * 3;
        const headLength = headWidth;

        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const bodyLength = length - headLength;

        const bodyTopLeftX = fromX + (bodyWidth / 2) * sin;
        const bodyTopLeftY = fromY - (bodyWidth / 2) * cos;
        const bodyTopRightX = fromX + bodyLength * cos + (bodyWidth / 2) * sin;
        const bodyTopRightY = fromY + bodyLength * sin - (bodyWidth / 2) * cos;
        const bodyBottomRightX = fromX + bodyLength * cos - (bodyWidth / 2) * sin;
        const bodyBottomRightY = fromY + bodyLength * sin + (bodyWidth / 2) * cos;
        const bodyBottomLeftX = fromX - (bodyWidth / 2) * sin;
        const bodyBottomLeftY = fromY + (bodyWidth / 2) * cos;

        const headTopX = toX;
        const headTopY = toY;
        const headBottomLeftX = toX - headLength * cos - (headWidth / 2) * sin;
        const headBottomLeftY = toY - headLength * sin + (headWidth / 2) * cos;
        const headBottomRightX = toX - headLength * cos + (headWidth / 2) * sin;
        const headBottomRightY = toY - headLength * sin - (headWidth / 2) * cos;

        ctx.beginPath();
        ctx.moveTo(bodyTopLeftX, bodyTopLeftY);
        ctx.lineTo(bodyTopRightX, bodyTopRightY);
        ctx.lineTo(bodyBottomRightX, bodyBottomRightY);
        ctx.lineTo(bodyBottomLeftX, bodyBottomLeftY);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(headTopX, headTopY);
        ctx.lineTo(headBottomLeftX, headBottomLeftY);
        ctx.lineTo(headBottomRightX, headBottomRightY);
        ctx.closePath();

        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(headTopX, headTopY, lineWidth / 4, 0, Math.PI * 2);
        ctx.fill();
    }

    function redrawCanvas(ctx) {
        const pageNum = parseInt(ctx.canvas.dataset.pageNum);
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        const history = drawingHistories.get(pageNum) || [];
        history.forEach(stroke => {
            if (stroke.tool === 'clearAll') {
                ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            } else {
                ctx.globalCompositeOperation = stroke.tool === 'eraser' ? 'destination-out' : 'source-over';
                if (stroke.tool === 'shape') {
                    drawShape(ctx, stroke.points[0].x, stroke.points[0].y, stroke.endX, stroke.endY, stroke);
                } else {
                    ctx.beginPath();
                    ctx.strokeStyle = stroke.color;
                    ctx.lineWidth = stroke.lineWidth;
                    ctx.globalAlpha = stroke.opacity;
                    stroke.points.forEach((point, index) => {
                        if (index === 0) {
                            ctx.moveTo(point.x, point.y);
                        } else {
                            ctx.lineTo(point.x, point.y);
                        }
                    });
                    ctx.stroke();
                    ctx.globalAlpha = 1;
                }
            }
        });
        ctx.globalCompositeOperation = 'source-over';
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
        utils.showNotification('已清除所有繪圖內容');
    }

    function updateCursor() {
        const drawingCanvases = document.querySelectorAll('.drawing-canvas');
        drawingCanvases.forEach(canvas => {
            switch (currentTool) {
                case 'pencil':
                case 'highlighter':
                case 'shape':
                    canvas.style.cursor = 'crosshair';
                    document.getElementById('eraserCursor').style.display = 'none';
                    break;
                case 'eraser':
                    canvas.style.cursor = 'none';
                    document.getElementById('eraserCursor').style.display = 'block';
                    break;
                default:
                    canvas.style.cursor = 'default';
                    document.getElementById('eraserCursor').style.display = 'none';
            }
        });
    }

    function updateEraserCursor(e) {
        if (currentTool === 'eraser') {
            const eraserSize = parseInt(document.getElementById('eraserSize').value);
            const eraserCursor = document.getElementById('eraserCursor');
            eraserCursor.style.width = `${eraserSize}px`;
            eraserCursor.style.height = `${eraserSize}px`;
            eraserCursor.style.left = `${e.clientX - eraserSize / 2}px`;
            eraserCursor.style.top = `${e.clientY - eraserSize / 2}px`;
            eraserCursor.style.border = '2px solid black';
            eraserCursor.style.backgroundColor = 'rgba(255, 255, 255, 0.5)';

            const pdfRect = document.getElementById('pdfViewer').getBoundingClientRect();
            if (e.clientX >= pdfRect.left && e.clientX <= pdfRect.right &&
                e.clientY >= pdfRect.top && e.clientY <= pdfRect.bottom) {
                eraserCursor.style.display = 'block';
            } else {
                eraserCursor.style.display = 'none';
            }
        } else {
            document.getElementById('eraserCursor').style.display = 'none';
        }
    }

    function initializeColorPalette(paletteId, colorInputId) {
        const palette = document.getElementById(paletteId);
        const colorInput = document.getElementById(colorInputId);
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
        clearAll: clearAll
    };
})(Utils);