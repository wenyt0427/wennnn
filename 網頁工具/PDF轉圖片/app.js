const PDFApp = (function(utils, drawingTools, pdfHandler) {
    let currentPage = 1;
    let buttonsVisible = true;
    let pdfViewerElement;
    let thumbnailContainerElement;
    let scrollThrottle;

    function init() {
        const dropZone = document.getElementById('dropZone');
        const fileInput = document.getElementById('fileInput');
        const toggleButtons = document.getElementById('toggleButtons');
        const reuploadButton = document.getElementById('reuploadButton');
        pdfViewerElement = document.getElementById('pdfViewer');
        thumbnailContainerElement = document.getElementById('thumbnailContainer');

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

        reuploadButton.onclick = () => {
            document.getElementById('dropZone').style.display = 'flex';
            reuploadButton.style.display = 'none';
        };

        document.querySelectorAll('.tool-button').forEach(button => {
            button.addEventListener('click', (e) => {
                const tool = e.target.id.replace('Tool', '');
                if (tool !== 'undo' && tool !== 'redo' && tool !== 'clearAll') {
                    drawingTools.setCurrentTool(tool);
                    document.querySelectorAll('.tool-button').forEach(btn => btn.classList.remove('active'));
                    e.target.classList.add('active');
                    drawingTools.updateCursor();
                } else if (tool === 'undo') {
                    drawingTools.undo();
                } else if (tool === 'redo') {
                    drawingTools.redo();
                } else if (tool === 'clearAll') {
                    drawingTools.clearAll();
                }
            });
        });

        document.querySelectorAll('.shape-button').forEach(button => {
            button.addEventListener('click', (e) => {
                const shape = e.target.dataset.shape;
                drawingTools.setCurrentShape(shape);
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
                });
                utils.updateSizeDisplay(tool);
            }
        });

        const highlighterOpacity = document.getElementById('highlighterOpacity');
        if (highlighterOpacity) {
            highlighterOpacity.addEventListener('input', () => {
                utils.updateOpacityDisplay('highlighter');
            });
            utils.updateOpacityDisplay('highlighter');
        }

        const shapeOpacity = document.getElementById('shapeOpacity');
        if (shapeOpacity) {
            shapeOpacity.addEventListener('input', () => {
                utils.updateOpacityDisplay('shape');
            });
            utils.updateOpacityDisplay('shape');
        }

        ['pencil', 'highlighter', 'shape'].forEach(tool => {
            const colorInput = document.getElementById(`${tool}Color`);
            if (colorInput) {
                colorInput.addEventListener('change', drawingTools.updateCursor);
            }
        });

        window.addEventListener('load', () => {
            utils.showNotification('PDF轉圖片工具已加載完成，可以開始使用了');
        });

        window.addEventListener('error', (e) => {
            console.error('發生錯誤:', e.error);
            utils.showNotification('抱歉，發生了一個錯誤。請刷新頁面或聯繫支持。');
        });

        thumbnailContainerElement.addEventListener('click', (e) => {
            if (e.target.classList.contains('thumbnail')) {
                const pageNum = parseInt(e.target.dataset.pageNum);
                scrollToPage(pageNum);
            }
        });

        pdfViewerElement.addEventListener('scroll', handleScroll);
    }

    function togglePageButtons() {
        buttonsVisible = !buttonsVisible;
        document.getElementById('toggleButtons').textContent = buttonsVisible ? '👁️' : '👁️‍🗨️';
        document.getElementById('toggleButtons').setAttribute('aria-label', buttonsVisible ? '隱藏頁面按鈕' : '顯示頁面按鈕');
        const pageButtons = document.querySelectorAll('.page-buttons');
        const pageNumbers = document.querySelectorAll('.page-number');
        pageButtons.forEach(buttonContainer => {
            buttonContainer.style.display = buttonsVisible ? 'flex' : 'none';
        });
        pageNumbers.forEach(pageNumber => {
            pageNumber.style.display = buttonsVisible ? 'block' : 'none';
        });
        utils.showNotification(buttonsVisible ? '已顯示頁面按鈕' : '已隱藏頁面按鈕');
    }

    function handleKeyboardShortcuts(e) {
        if (e.key === 'ArrowLeft') {
            pdfHandler.navigatePage(-1);
        } else if (e.key === 'ArrowRight') {
            pdfHandler.navigatePage(1);
        } else if (e.ctrlKey && (e.key === 'z' || e.key === 'Z')) {
            e.preventDefault();
            drawingTools.undo();
        } else if (e.ctrlKey && (e.key === 'y' || e.key === 'Y')) {
            e.preventDefault();
            drawingTools.redo();
        }
    }

    function scrollToPage(pageNum) {
        pdfHandler.scrollToPage(pageNum);
    }

    function handleScroll() {
        if (scrollThrottle) {
            return;
        }

        scrollThrottle = setTimeout(() => {
            const pageContainers = pdfViewerElement.querySelectorAll('.page-container');
            const viewerRect = pdfViewerElement.getBoundingClientRect();
            let maxVisibleRatio = 0;
            let mostVisiblePage = null;

            pageContainers.forEach(container => {
                const rect = container.getBoundingClientRect();
                const visibleHeight = Math.min(rect.bottom, viewerRect.bottom) - Math.max(rect.top, viewerRect.top);
                const visibleRatio = visibleHeight / rect.height;

                if (visibleRatio > maxVisibleRatio) {
                    maxVisibleRatio = visibleRatio;
                    mostVisiblePage = container;
                }
            });

            if (mostVisiblePage && maxVisibleRatio > 0.5) {
                const pageNum = parseInt(mostVisiblePage.id.split('-')[2]);
                updateActivePage(pageNum);
            }

            scrollThrottle = null;
        }, 100);
    }

    function updateActivePage(pageNum) {
        if (currentPage !== pageNum) {
            currentPage = pageNum;
            pdfHandler.setActivePage(pageNum, false);
        }
    }

    function adjustContentHeight() {
        const topToolbar = document.getElementById('topToolbar');
        const contentContainer = document.querySelector('.content-container');
        const windowHeight = window.innerHeight;
        const toolbarHeight = topToolbar.offsetHeight;
        contentContainer.style.height = `${windowHeight - toolbarHeight}px`;
    }

    return {
        init: init,
        scrollToPage: scrollToPage,
        adjustContentHeight: adjustContentHeight,
        updateActivePage: updateActivePage
    };
})(Utils, DrawingTools, PDFHandler);

document.addEventListener('DOMContentLoaded', PDFApp.init);