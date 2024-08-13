const Utils = {
    getMousePosition: function(canvas, e) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        return [
            (e.clientX - rect.left) * scaleX,
            (e.clientY - rect.top) * scaleY
        ];
    },

    showNotification: function(message) {
        const notification = document.getElementById('notification');
        notification.textContent = message;
        notification.style.display = 'block';
        notification.setAttribute('aria-hidden', 'false');
        setTimeout(() => {
            notification.style.display = 'none';
            notification.setAttribute('aria-hidden', 'true');
        }, 2000);
    },

    createButton: function(text, onClick) {
        const button = document.createElement('button');
        button.textContent = text;
        button.className = 'page-button';
        button.onclick = onClick;
        return button;
    },

    setDrawingStyle: function(context, stroke) {
        context.strokeStyle = stroke.color;
        context.lineWidth = stroke.lineWidth;
        context.lineCap = 'round';
        context.lineJoin = 'round';
        context.globalAlpha = stroke.opacity;
    },

    getToolName: function(tool) {
        const toolNames = {
            mouse: '鼠標',
            pencil: '鉛筆',
            highlighter: '螢光筆',
            eraser: '橡皮擦',
            shape: '形狀'
        };
        return toolNames[tool] || tool;
    },

    updateSizeDisplay: function(tool) {
        const sizeInput = document.getElementById(`${tool}Size`);
        const sizeDisplay = document.getElementById(`${tool}SizeDisplay`);
        sizeDisplay.textContent = `${sizeInput.value}px`;
    },

    updateOpacityDisplay: function(tool) {
        const opacityInput = document.getElementById(`${tool}Opacity`);
        const opacityDisplay = document.getElementById(`${tool}OpacityDisplay`);
        opacityDisplay.textContent = `${opacityInput.value}%`;
    },

    updateShapeButton: function(shape) {
        const shapeButtons = document.querySelectorAll('.shape-button');
        shapeButtons.forEach(button => {
            button.classList.remove('active');
            if (button.dataset.shape === shape) {
                button.classList.add('active');
            }
        });
        const shapeToolButton = document.getElementById('shapeTool');
        const shapeEmoji = {
            rectangle: '🔲',
            circle: '🔘',
            line: '┃',
            arrow: '➜'
        };
        shapeToolButton.innerHTML = `${shapeEmoji[shape]} 形狀`;
    }
};