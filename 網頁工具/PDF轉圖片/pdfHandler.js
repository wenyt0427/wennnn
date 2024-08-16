const PDFHandler = (function(utils, drawingTools) {
    let pdfDoc = null;
    let currentPage = 1;
    let pageScales = new Map();
    const RENDER_SCALE = 2; // 提高渲染解析度
    let isDownloading = false; // 防止重複下載
    let originalFileName = ''; // 儲存原始檔案名稱

    function handleFile(file) {
        if (file.type !== 'application/pdf') {
            alert('請上傳PDF檔案');
            return;
        }

        originalFileName = file.name.replace('.pdf', ''); // 儲存原始檔案名稱（不含副檔名）

        const reader = new FileReader();
        reader.onloadstart = () => {
            showUploadProgress();
        };

        reader.onprogress = (e) => {
            if (e.lengthComputable) {
                const percentLoaded = Math.round((e.loaded / e.total) * 100);
                updateUploadProgress(percentLoaded);
            }
        };

        reader.onload = (e) => {
            loadPDF(e.target.result);
        };

        reader.onloadend = () => {
            hideUploadProgress();
        };

        reader.readAsArrayBuffer(file);
    }

    function showUploadProgress() {
        const progressContainer = document.getElementById('progressContainer');
        progressContainer.style.display = 'block';
        document.getElementById('uploadProgress').value = 0;
    }

    function updateUploadProgress(percent) {
        document.getElementById('uploadProgress').value = percent;
    }

    function hideUploadProgress() {
        const progressContainer = document.getElementById('progressContainer');
        progressContainer.style.display = 'none';
    }

    function loadPDF(data) {
        pdfjsLib.getDocument({ data }).promise.then((pdf) => {
            pdfDoc = pdf;
            document.getElementById('pdfViewer').innerHTML = '';
            document.getElementById('pageSelector').innerHTML = '';
            document.getElementById('thumbnailContainer').innerHTML = '';

            for (let i = 1; i <= pdf.numPages; i++) {
                renderPage(i);
                renderThumbnail(i);
            }
            setActivePage(1, false);
            
            document.getElementById('dropZone').style.display = 'none';
            document.getElementById('reuploadButton').style.display = 'block';
            
            utils.showNotification('PDF 已成功加載');
        }).catch(error => {
            console.error('Error loading PDF:', error);
            alert('PDF 加載失敗，請檢查文件是否損壞或重試。');
        });
    }

    function renderPage(pageNum) {
        pdfDoc.getPage(pageNum).then((page) => {
            const originalViewport = page.getViewport({ scale: 1 });
            const scale = RENDER_SCALE;
            const viewport = page.getViewport({ scale: scale });
            const pageContainer = document.createElement('div');
            pageContainer.className = 'page-container';
            pageContainer.id = `page-container-${pageNum}`;
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');

            canvas.height = viewport.height;
            canvas.width = viewport.width;

            pageScales.set(pageNum, {
                scale: scale,
                width: originalViewport.width,
                height: originalViewport.height,
                viewportWidth: viewport.width,
                viewportHeight: viewport.height,
                rotation: page.rotate
            });

            const renderContext = {
                canvasContext: context,
                viewport: viewport
            };
            page.render(renderContext);

            pageContainer.appendChild(canvas);

            const drawingCanvas = document.createElement('canvas');
            drawingCanvas.className = 'drawing-canvas';
            drawingCanvas.width = canvas.width;
            drawingCanvas.height = canvas.height;
            drawingCanvas.dataset.pageNum = pageNum;
            pageContainer.appendChild(drawingCanvas);

            drawingTools.initializeDrawingCanvas(drawingCanvas, pageNum);

            drawingCanvas.addEventListener('mousedown', (e) => {
                if (currentPage !== pageNum) {
                    setActivePage(pageNum, false);
                }
            });

            const buttonsContainer = document.createElement('div');
            buttonsContainer.className = 'page-buttons';

            const copyButton = utils.createButton('📋', () => copyPageToClipboard(pageNum, copyButton));
            const pngButton = utils.createButton('PNG', () => downloadPage(pageNum, 'png'));
            const jpgButton = utils.createButton('JPG', () => downloadPage(pageNum, 'jpg'));
            const deleteButton = utils.createButton('❌', () => deletePage(pageNum));

            buttonsContainer.appendChild(copyButton);
            buttonsContainer.appendChild(pngButton);
            buttonsContainer.appendChild(jpgButton);
            buttonsContainer.appendChild(deleteButton);
            pageContainer.appendChild(buttonsContainer);

            const pageNumberElement = document.createElement('div');
            pageNumberElement.className = 'page-number';
            pageNumberElement.textContent = `頁 ${pageNum}`;
            pageContainer.appendChild(pageNumberElement);

            document.getElementById('pdfViewer').appendChild(pageContainer);

            pageContainer.addEventListener('click', () => setActivePage(pageNum, false));

            drawingTools.updateCursor();
        });
    }

    function renderThumbnail(pageNum) {
        pdfDoc.getPage(pageNum).then((page) => {
            const viewport = page.getViewport({ scale: 0.2 });
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            const renderContext = {
                canvasContext: context,
                viewport: viewport
            };
            page.render(renderContext);

            canvas.className = 'thumbnail';
            canvas.dataset.pageNum = pageNum;
            canvas.addEventListener('click', () => setActivePage(pageNum, true));

            document.getElementById('thumbnailContainer').appendChild(canvas);
        });
    }

    function setActivePage(pageNum, shouldScroll) {
        const allPages = document.querySelectorAll('.page-container');
        allPages.forEach(page => {
            page.classList.remove('active');
        });
        const activePage = document.getElementById(`page-container-${pageNum}`);
        if (activePage) {
            activePage.classList.add('active');
            currentPage = pageNum;
            drawingTools.setCurrentPage(pageNum);
            
            if (shouldScroll) {
                activePage.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }

            const allThumbnails = document.querySelectorAll('.thumbnail');
            allThumbnails.forEach(thumbnail => {
                thumbnail.classList.remove('active');
            });
            const activeThumbnail = document.querySelector(`.thumbnail[data-page-num="${pageNum}"]`);
            if (activeThumbnail) {
                activeThumbnail.classList.add('active');
                if (shouldScroll) {
                    activeThumbnail.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            }
        }
    }

    function copyPageToClipboard(pageNum, button) {
        const pageContainer = document.getElementById(`page-container-${pageNum}`);
        if (pageContainer) {
            const pdfCanvas = pageContainer.querySelector('canvas:not(.drawing-canvas)');
            const drawingCanvas = pageContainer.querySelector('.drawing-canvas');

            const mergedCanvas = document.createElement('canvas');
            mergedCanvas.width = pdfCanvas.width;
            mergedCanvas.height = pdfCanvas.height;
            const ctx = mergedCanvas.getContext('2d');

            ctx.drawImage(pdfCanvas, 0, 0);
            ctx.drawImage(drawingCanvas, 0, 0);

            mergedCanvas.toBlob((blob) => {
                const item = new ClipboardItem({ "image/png": blob });
                navigator.clipboard.write([item]).then(() => {
                    button.textContent = '✅';
                    setTimeout(() => {
                        button.textContent = '📋';
                    }, 3000);
                    utils.showNotification(`已複製頁面 ${pageNum} 到剪貼簿`);
                }, (error) => {
                    console.error("複製失敗: ", error);
                    alert("複製到剪貼簿失敗，請檢查瀏覽器權限設置。");
                });
            });
        }
    }

    function downloadPage(pageNum, format) {
        const pageContainer = document.getElementById(`page-container-${pageNum}`);
        const pdfCanvas = pageContainer.querySelector('canvas:not(.drawing-canvas)');
        const drawingCanvas = pageContainer.querySelector('.drawing-canvas');

        const mergedCanvas = document.createElement('canvas');
        mergedCanvas.width = pdfCanvas.width;
        mergedCanvas.height = pdfCanvas.height;
        const ctx = mergedCanvas.getContext('2d');
        ctx.drawImage(pdfCanvas, 0, 0);
        ctx.drawImage(drawingCanvas, 0, 0);

        const image = mergedCanvas.toDataURL(`image/${format}`, 1.0);
        const link = document.createElement('a');
        link.href = image;
        link.download = `page${pageNum}.${format}`;
        link.click();
        utils.showNotification(`已下載頁面 ${pageNum} 為 ${format.toUpperCase()} 格式`);
    }

    function deletePage(pageNum) {
        const pageContainer = document.getElementById(`page-container-${pageNum}`);
        if (pageContainer) {
            pageContainer.remove();
            const thumbnail = document.querySelector(`.thumbnail[data-page-num="${pageNum}"]`);
            if (thumbnail) {
                thumbnail.remove();
            }
            utils.showNotification(`已刪除頁面 ${pageNum}`);
        }
    }

    function navigatePage(direction) {
        if (pdfDoc) {
            const newPage = currentPage + direction;
            if (newPage >= 1 && newPage <= pdfDoc.numPages) {
                setActivePage(newPage, true);
            }
        }
    }

    function scrollToPage(pageNum) {
        setActivePage(pageNum, true);
    }

    async function downloadPDF() {
        if (!pdfDoc || isDownloading) {
            return;
        }

        isDownloading = true;
        utils.showNotification('正在準備下載 PDF，請稍候...');

        const progressBar = document.getElementById('downloadProgress');
        progressBar.style.display = 'inline-block';
        progressBar.value = 0;

        try {
            const pdfBytes = await pdfDoc.getData();
            const existingPdfDoc = await PDFLib.PDFDocument.load(pdfBytes);
            const newPdfDoc = await PDFLib.PDFDocument.create();

            for (let i = 1; i <= pdfDoc.numPages; i++) {
                const [embeddedPage] = await newPdfDoc.embedPdf(existingPdfDoc, [i - 1]);
                const { width, height } = embeddedPage.scale(1);
                const page = newPdfDoc.addPage([width, height]);
                page.drawPage(embeddedPage);

                const pageImage = await createCompressedPageImage(i);
                const image = await newPdfDoc.embedPng(pageImage);
                page.drawImage(image, {
                    x: 0,
                    y: 0,
                    width: width,
                    height: height,
                });

                progressBar.value = (i / pdfDoc.numPages) * 100;
            }

            const pdfBytesCompressed = await newPdfDoc.save({
                useObjectStreams: false,
                addDefaultPage: false,
                objectsPerTick: 100,
                updateFieldAppearances: false,
                compress: true
            });

            const compressedPdfBlob = new Blob([pdfBytesCompressed], { type: 'application/pdf' });
            
            saveAs(compressedPdfBlob, `${originalFileName}_Wennnn_Studio.pdf`);

            utils.showNotification('PDF 準備完成，請選擇保存位置');
        } catch (error) {
            console.error('PDF 下載失敗:', error);
            utils.showNotification('PDF 下載失敗，請重試');
        } finally {
            isDownloading = false;
            progressBar.style.display = 'none';
        }
    }

    async function createCompressedPageImage(pageNum) {
        const pageContainer = document.getElementById(`page-container-${pageNum}`);
        const pdfCanvas = pageContainer.querySelector('canvas:not(.drawing-canvas)');
        const drawingCanvas = pageContainer.querySelector('.drawing-canvas');

        const mergedCanvas = document.createElement('canvas');
        mergedCanvas.width = pdfCanvas.width;
        mergedCanvas.height = pdfCanvas.height;
        const ctx = mergedCanvas.getContext('2d');

        ctx.drawImage(pdfCanvas, 0, 0);
        ctx.drawImage(drawingCanvas, 0, 0);

        return new Promise((resolve) => {
            mergedCanvas.toBlob((blob) => {
                const reader = new FileReader();
                reader.onloadend = function() {
                    resolve(reader.result);
                }
                reader.readAsDataURL(blob);
            }, 'image/png', 0.5);  // 使用 50% 的質量，可以根據需要調整
        });
    }

    return {
        handleFile: handleFile,
        loadPDF: loadPDF,
        renderPage: renderPage,
        renderThumbnail: renderThumbnail,
        copyPageToClipboard: copyPageToClipboard,
        downloadPage: downloadPage,
        deletePage: deletePage,
        navigatePage: navigatePage,
        scrollToPage: scrollToPage,
        setActivePage: setActivePage,
        downloadPDF: downloadPDF
    };
})(Utils, DrawingTools);
