const PDFApp = (function(utils, drawingTools, pdfHandler) {
    let currentPage = 1;
    let buttonsVisible = true;
    let pdfViewerElement;
    let thumbnailContainerElement;
    let scrollThrottle;
    let sidebarElement;
    let mainContentElement;
    let sidebarToggleElement;

    function init() {
        const dropZone = document.getElementById('dropZone');
        const fileInput = document.getElementById('fileInput');
        const toggleButtons = document.getElementById('toggleButtons');
        const reuploadButton = document.getElementById('reuploadButton');
        const downloadPDFButton = document.getElementById('downloadPDFTool');
        pdfViewerElement = document.getElementById('pdfViewer');
        thumbnailContainerElement = document.getElementById('thumbnailContainer');
        sidebarElement = document.getElementById('sidebar');
        mainContentElement = document.querySelector('.main-content');
        sidebarToggleElement = document.getElementById('sidebarToggle');

        adjustContentHeight();
        window.addEventListener('resize', adjustContentHeight);

        dropZone.onclick = () => fileInput.click();
        dropZone.ondragover = (e) => {
            e.preventDefault();
            dropZone.style.borderColor = '#000';
        };
        dropZone.ondragleave = () => {
            dropZone.style.borderColor = '#ccc';
        };
        dropZone.ondrop = (e) => {
            e.preventDefault();
            dropZone.style.borderColor = '#ccc';
            if (e.dataTransfer.files.length > 0) {
                pdfHandler.handleFile(e.dataTransfer.files[0]);
            }
        };
        fileInput.onchange = () => {
            if (fileInput.files.length > 0) {
                pdfHandler.handleFile(fileInput.files[0]);
            }
        };
        toggleButtons.onclick = togglePageButtons;
        downloadPDFButton.onclick = pdfHandler.downloadPDF;

        reuploadButton.onclick = () => {
            document.getElementById('dropZone').style.display = 'flex';
            reuploadButton.style.display = 'none';
        };

        document.querySelectorAll('.tool-button').forEach(button => {
            if (['undoTool', 'redoTool', 'clearAllTool'].includes(button.id)) {
                button.addEventListener('click', handleFunctionButton);
            } else {
                button.addEventListener('click', (e) => {
                    const tool = e.target.id.replace('Tool', '');
                    switchTool(tool);
                });
            }
        });

        document.querySelectorAll('.shape-button').forEach(button => {
            button.addEventListener('click', (e) => {
                const shape = e.target.dataset.shape;
                drawingTools.setCurrentShape(shape);
                switchTool('shape');
            });
        });

        document.addEventListener('keydown', handleKeyboardShortcuts);
        document.addEventListener('mousemove', drawingTools.updateEraserCursor);

        ['pencil', 'highlighter', 'eraser', 'shape'].forEach(tool => {
            const sizeInput = document.getElementById(`${tool}Size`);
            if (sizeInput) {
                sizeInput.addEventListener('input', () => {
                    drawingTools.updateCursor();
                    utils.updateSizeDisplay(tool);
                    switchTool(tool);
                });
                utils.updateSizeDisplay(tool);
            }
        });

        const highlighterOpacity = document.getElementById('highlighterOpacity');
        if (highlighterOpacity) {
            highlighterOpacity.addEventListener('input', () => {
                utils.updateOpacityDisplay('highlighter');
                switchTool('highlighter');
            });
            utils.updateOpacityDisplay('highlighter');
        }

        const shapeOpacity = document.getElementById('shapeOpacity');
        if (shapeOpacity) {
            shapeOpacity.addEventListener('input', () => {
                utils.updateOpacityDisplay('shape');
                switchTool('shape');
            });
            utils.updateOpacityDisplay('shape');
        }

        ['pencil', 'highlighter', 'shape'].forEach(tool => {
            const colorInput = document.getElementById(`${tool}Color`);
            if (colorInput) {
                colorInput.addEventListener('change', () => {
                    updateColorIndicator(tool);
                    switchTool(tool);
                });
                updateColorIndicator(tool);
            }
        });

        sidebarToggleElement.addEventListener('click', toggleSidebar);

        pdfViewerElement.addEventListener('scroll', handleScroll);

        // 監聽全局的滾輪事件，用於處理縮放
        document.addEventListener('wheel', handleGlobalWheel, { passive: false });

        // 監聽全局的鼠標事件，用於處理拖動
        document.addEventListener('mousedown', handleGlobalMouseDown);
    }

    function adjustContentHeight() {
        const topToolbar = document.querySelector('.top-toolbar');
        const contentContainer = document.querySelector('.content-container');
        if (topToolbar && contentContainer) {
            const toolbarHeight = topToolbar.offsetHeight;
            contentContainer.style.height = `calc(100vh - ${toolbarHeight}px)`;
        }
    }

    function togglePageButtons() {
        buttonsVisible = !buttonsVisible;
        const pageButtons = document.querySelectorAll('.page-buttons');
        pageButtons.forEach(buttons => {
            buttons.style.display = buttonsVisible ? 'flex' : 'none';
        });
        document.getElementById('toggleButtons').textContent = buttonsVisible ? '👁️' : '👁️‍🗨️';
    }

    function switchTool(tool) {
        drawingTools.setCurrentTool(tool);
        updateToolState();
    }

    function updateToolState() {
        const toolState = drawingTools.updateToolState();
        console.log('Current tool state:', toolState);
    }

    function handleKeyboardShortcuts(e) {
        if (e.ctrlKey && e.key === 'z') {
            e.preventDefault();
            drawingTools.undo();
        } else if (e.ctrlKey && e.key === 'y') {
            e.preventDefault();
            drawingTools.redo();
        } else if (e.ctrlKey && e.key === 'Delete') {
            e.preventDefault();
            drawingTools.clearAll();
        } else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            pdfHandler.navigatePage(-1);
        } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            pdfHandler.navigatePage(1);
        }
    }

    function handleFunctionButton(e) {
        switch (e.target.id) {
            case 'undoTool':
                drawingTools.undo();
                break;
            case 'redoTool':
                drawingTools.redo();
                break;
            case 'clearAllTool':
                drawingTools.clearAll();
                break;
        }
        e.preventDefault();
        e.stopPropagation();
    }

    function updateColorIndicator(tool) {
        const toolButton = document.getElementById(`${tool}Tool`);
        const colorInput = document.getElementById(`${tool}Color`);
        if (toolButton && colorInput) {
            toolButton.style.setProperty('--indicator-color', colorInput.value);
        }
    }

    function handleScroll() {
        if (scrollThrottle) {
            clearTimeout(scrollThrottle);
        }
        scrollThrottle = setTimeout(() => {
            const pageContainers = pdfViewerElement.querySelectorAll('.page-container');
            let closestPage = null;
            let closestDistance = Infinity;

            pageContainers.forEach(container => {
                const rect = container.getBoundingClientRect();
                const distance = Math.abs(rect.top);
                if (distance < closestDistance) {
                    closestDistance = distance;
                    closestPage = container;
                }
            });

            if (closestPage) {
                const pageNum = parseInt(closestPage.id.replace('page-container-', ''));
                pdfHandler.setActivePage(pageNum, false);
            }
        }, 100);
    }

    function toggleSidebar() {
        sidebarElement.classList.toggle('collapsed');
        mainContentElement.classList.toggle('expanded');
        const toggleIcon = sidebarToggleElement.querySelector('.toggle-icon');
        toggleIcon.textContent = sidebarElement.classList.contains('collapsed') ? '▶' : '◀';
    }

    function handleGlobalWheel(e) {
        if (e.ctrlKey) {
            e.preventDefault(); // 防止頁面縮放
            const pageContainer = e.target.closest('.page-container');
            if (pageContainer) {
                const pageNum = parseInt(pageContainer.id.replace('page-container-', ''));
                const delta = e.deltaY > 0 ? -0.1 : 0.1;
                pdfHandler.zoomPage(pageNum, delta);
            }
        }
    }

    function handleGlobalMouseDown(e) {
        if (e.ctrlKey) {
            const pageContainer = e.target.closest('.page-container');
            if (pageContainer) {
                e.preventDefault();
                const pageNum = parseInt(pageContainer.id.replace('page-container-', ''));
                pdfHandler.handlePageDrag(e, pageNum);
            }
        }
    }

    return {
        init: init
    };
})(Utils, DrawingTools, PDFHandler);

document.addEventListener('DOMContentLoaded', PDFApp.init);
