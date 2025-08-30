/**
 * Modern File Manager JavaScript with Thumbnail Support and Modal Integration
 * Enhanced file management with modern UI, thumbnail extraction, and modal viewing
 */

class ModernFileManager {
    constructor() {
        this.files = [];
        this.isLoading = false;
        this.isDragOver = false;
        this.supportedFormats = [];
        this.statsRefreshInterval = null;
        
        this.init();
    }
    
    async init() {
        console.log('🗂️ Initializing Modern File Manager with Thumbnail Modal...');
        
        // Load supported formats
        await this.loadSupportedFormats();
        
        // Setup event handlers
        this.setupEventHandlers();
        
        // Initialize thumbnail modal styles
        this.injectThumbnailModalStyles();
        
        // Initialize thumbnail modal system
        this.initializeThumbnailModal();
        
        // Initial file load
        await this.refreshFiles();
        
        // Setup auto-refresh
        this.startStatsRefresh();
        
        console.log('✅ Modern File Manager with Thumbnail Modal initialized');
    }
    
    async loadSupportedFormats() {
        try {
            const response = await fetch('/api/file_formats');
            const data = await response.json();
            
            if (data.success) {
                this.supportedFormats = data.formats;
                console.log(`📋 Loaded ${data.total_formats} supported formats`);
            }
        } catch (error) {
            console.warn('Failed to load supported formats:', error);
        }
    }
    
    setupEventHandlers() {
        // File input handler
        const fileInput = document.getElementById('fileInput');
        const uploadArea = document.getElementById('uploadArea');
        
        if (uploadArea && fileInput) {
            // Click to browse
            uploadArea.onclick = (e) => {
                e.preventDefault();
                fileInput.click();
            };
            
            // File input change
            fileInput.onchange = (e) => this.handleFileUpload(e.target.files);
            
            // Drag and drop
            uploadArea.ondragover = (e) => this.handleDragOver(e);
            uploadArea.ondragleave = (e) => this.handleDragLeave(e);
            uploadArea.ondrop = (e) => this.handleDrop(e);
        }
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 'u':
                        e.preventDefault();
                        fileInput?.click();
                        break;
                    case 'r':
                        e.preventDefault();
                        this.refreshFiles();
                        break;
                }
            }
        });
        
        // Thumbnail click handler
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('file-thumbnail')) {
                console.log('🔍 DEBUG: ===== THUMBNAIL CLICK EVENT =====');
                e.preventDefault();
                const thumbnailSrc = e.target.dataset.thumbnailSrc;
                const fileName = e.target.dataset.fileName;
                const fileData = e.target.dataset.fileData;
                
                console.log('🔍 DEBUG: thumbnailSrc =', thumbnailSrc);
                console.log('🔍 DEBUG: fileName =', fileName);
                console.log('🔍 DEBUG: fileData =', fileData);
                console.log('🔍 DEBUG: e.target.dataset =', e.target.dataset);
                
                if (thumbnailSrc && fileName) {
                    console.log('🔍 DEBUG: Calling openThumbnailModal from click event');
                    this.openThumbnailModal(thumbnailSrc, fileName, fileData, true); // true = isBase64
                } else {
                    console.error('🔍 DEBUG: Missing thumbnailSrc or fileName');
                    console.error('🔍 DEBUG: thumbnailSrc exists =', !!thumbnailSrc);
                    console.error('🔍 DEBUG: fileName exists =', !!fileName);
                }
                console.log('🔍 DEBUG: ===== END THUMBNAIL CLICK EVENT =====');
            }
        });
    }
    
    initializeThumbnailModal() {
        // Wait for ThumbnailModal class to be available
        if (typeof ThumbnailModal !== 'undefined') {
            window.thumbnailModal = new ThumbnailModal();
            console.log('📸 Thumbnail modal system initialized');
        } else {
            // Retry after a short delay
            setTimeout(() => {
                if (typeof ThumbnailModal !== 'undefined') {
                    window.thumbnailModal = new ThumbnailModal();
                    console.log('📸 Thumbnail modal system initialized (delayed)');
                } else {
                    console.warn('⚠️ ThumbnailModal class not found');
                }
            }, 100);
        }
    }
    
    injectThumbnailModalStyles() {
        const styleId = 'thumbnailModalFileManagerStyles';
        
        // Check if styles already injected
        if (document.getElementById(styleId)) {
            return;
        }
        
        const styles = `
        /* Thumbnail Modal Integration Styles */
        .thumbnail-overlay-icon {
            position: absolute;
            top: 8px;
            right: 8px;
            background: rgba(0, 0, 0, 0.7);
            color: white;
            padding: 4px 6px;
            border-radius: 4px;
            font-size: 0.8rem;
            opacity: 0;
            transition: opacity 0.3s ease;
            pointer-events: none;
            z-index: 10;
        }

        .file-thumbnail-container:hover .thumbnail-overlay-icon {
            opacity: 1;
        }

        /* Enhanced File Thumbnail */
        .file-thumbnail {
            transition: transform 0.3s ease, box-shadow 0.3s ease;
            cursor: pointer;
        }

        .file-thumbnail:hover {
            transform: scale(1.05);
            box-shadow: 0 4px 12px rgba(33, 150, 243, 0.4);
        }

        /* File Action Button Info Style */
        .file-action-btn.btn-info {
            background: #17a2b8;
            color: white;
        }

        .file-action-btn.btn-info:hover {
            background: #138496;
        }

        /* Thumbnail Click Hint */
        .file-thumbnail-container {
            position: relative;
        }

        .file-thumbnail-container::before {
            content: "";
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(33, 150, 243, 0.1);
            opacity: 0;
            transition: opacity 0.3s ease;
            border-radius: 8px;
            pointer-events: none;
        }

        .file-thumbnail-container:hover::before {
            opacity: 1;
        }

        /* Enhanced Modern File Card */
        .modern-file-card {
            transition: transform 0.3s ease, box-shadow 0.3s ease;
        }

        .modern-file-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
        }

        /* Thumbnail Loading State */
        .file-thumbnail.loading {
            background: linear-gradient(90deg, #4a4a4a 25%, #525252 50%, #4a4a4a 75%);
            background-size: 200% 100%;
            animation: thumbnail-loading 1.5s infinite;
        }

        @keyframes thumbnail-loading {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
        }

        /* Clickable thumbnail styling */
        .file-thumbnail[data-has-thumbnail="true"] {
            position: absolute;
        }

        .file-thumbnail[data-has-thumbnail="true"]::after {
            content: "🔍";
            position: absolute;
            bottom: 4px;
            right: 4px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 2px 4px;
            border-radius: 3px;
            font-size: 0.7rem;
            opacity: 0;
            transition: opacity 0.3s ease;
        }

        .file-thumbnail[data-has-thumbnail="true"]:hover::after {
            opacity: 1;
        }
        `;
        
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = styles;
        document.head.appendChild(style);
        
        console.log('📸 Thumbnail modal styles injected');
    }
    
    handleDragOver(e) {
        e.preventDefault();
        if (!this.isDragOver) {
            this.isDragOver = true;
            e.currentTarget.classList.add('dragover');
        }
    }
    
    handleDragLeave(e) {
        e.preventDefault();
        // Only remove dragover if leaving the upload area entirely
        if (!e.currentTarget.contains(e.relatedTarget)) {
            this.isDragOver = false;
            e.currentTarget.classList.remove('dragover');
        }
    }
    
    handleDrop(e) {
        e.preventDefault();
        this.isDragOver = false;
        e.currentTarget.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            this.handleFileUpload(files);
        }
    }
    
    async handleFileUpload(files) {
        if (!files || files.length === 0) return;
        
        const formData = new FormData();
        const fileArray = Array.from(files);
        
        // Validate files
        const validFiles = [];
        const invalidFiles = [];
        
        fileArray.forEach(file => {
            const extension = '.' + file.name.split('.').pop().toLowerCase();
            const isSupported = this.supportedFormats.some(format => format.extension === extension);
            
            if (isSupported) {
                validFiles.push(file);
                formData.append('files', file);
            } else {
                invalidFiles.push({
                    name: file.name,
                    reason: `Unsupported format: ${extension}`
                });
            }
        });
        
        if (invalidFiles.length > 0) {
            this.showAlert(`${invalidFiles.length} files skipped (unsupported formats)`, 'warning');
        }
        
        if (validFiles.length === 0) {
            this.showAlert('No valid files to upload', 'error');
            return;
        }
        
        try {
            this.showUploadProgress(true);
            this.showAlert(`Uploading ${validFiles.length} file(s)...`, 'info');
            
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showAlert(
                    `Successfully uploaded ${result.total_uploaded} file(s)` + 
                    (result.total_errors > 0 ? ` (${result.total_errors} failed)` : ''), 
                    'success'
                );
                
                // Add console messages for each uploaded file
                result.uploaded.forEach(file => {
                    if (typeof addConsoleMessage === 'function') {
                        addConsoleMessage(`Uploaded with thumbnail: ${file.name}`, 'success');
                    }
                });
                
                // Refresh file list to show new files
                await this.refreshFiles();
            } else {
                this.showAlert('Upload failed', 'error');
            }
            
            // Show any individual file errors
            if (result.errors && result.errors.length > 0) {
                result.errors.forEach(error => {
                    if (typeof addConsoleMessage === 'function') {
                        addConsoleMessage(`Upload error: ${error.filename} - ${error.error}`, 'error');
                    }
                });
            }
            
        } catch (error) {
            this.showAlert(`Upload error: ${error.message}`, 'error');
            if (typeof addConsoleMessage === 'function') {
                addConsoleMessage(`Upload error: ${error.message}`, 'error');
            }
        } finally {
            this.showUploadProgress(false);
        }
    }
    
    async refreshFiles() {
        if (this.isLoading) return;
        
        this.isLoading = true;
        this.showLoadingState();
        
        try {
            const response = await fetch('/api/files');
            const data = await response.json();
            
            if (Array.isArray(data)) {
                // Handle direct array response
                this.files = data.map(file => ({
                    ...file,
                    has_thumbnail: !!file.thumbnail,
                    thumbnail: file.thumbnail ? `/api/thumbnails/${file.thumbnail}` : null
                }));
                
                this.renderFiles();
                this.updateStats();
                
                if (typeof addConsoleMessage === 'function') {
                    addConsoleMessage(`Loaded ${data.length} files with thumbnail support`, 'info');
                }
            } else if (data.success) {
                // Handle success response object
                this.files = data.files.map(file => ({
                    ...file,
                    has_thumbnail: !!file.thumbnail,
                    thumbnail: file.thumbnail ? `/api/thumbnails/${file.thumbnail}` : null
                }));
                
                this.renderFiles();
                this.updateStats();
                
                if (typeof addConsoleMessage === 'function') {
                    addConsoleMessage(`Loaded ${data.files.length} files with thumbnail support`, 'info');
                }
            } else {
                this.showAlert('Failed to load files', 'error');
                this.renderEmptyState();
            }
            
        } catch (error) {
            console.error('Failed to refresh files:', error);
            this.showAlert('Failed to load files', 'error');
            this.renderEmptyState();
        } finally {
            this.isLoading = false;
        }
    }
    
    renderFiles() {
        const container = document.getElementById('modernFileGrid');
        if (!container) return;
        
        if (this.files.length === 0) {
            this.renderEmptyState();
            return;
        }
        
        container.innerHTML = this.files.map(file => this.createFileCard(file)).join('');
        
        // Add entrance animations
        const cards = container.querySelectorAll('.modern-file-card');
        cards.forEach((card, index) => {
            card.style.animationDelay = `${index * 0.05}s`;
            card.classList.add('file-card-enter');
        });
    }
    
    // FIXED createFileCard method - integrating the fixes from your first document
    createFileCard(file) {
        // Create a clean filename without any special characters for the onclick
        const cleanFileName = file.name.replace(/'/g, "\\'").replace(/"/g, '\\"');
        
        // Safely encode file data using base64 to avoid JSON escaping issues
        const fileDataBase64 = btoa(JSON.stringify({
            name: file.name,  // Ensure the name is properly stored
            size: file.size,
            size_mb: file.size_mb || (file.size / (1024 * 1024)).toFixed(1),
            extension: file.extension,
            modified: file.modified,
            path: file.path,
            thumbnail: file.thumbnail,
            has_thumbnail: file.has_thumbnail,
            metadata: file.metadata || null
        }));
        
        const thumbnailHtml = file.has_thumbnail ? 
            `<img src="${file.thumbnail}" 
                  alt="${file.name}" 
                  class="file-thumbnail" 
                  loading="lazy" 
                  onerror="this.style.display='none'" 
                  style="cursor: pointer;" 
                  title="Click to view larger thumbnail"
                  data-has-thumbnail="true"
                  data-thumbnail-src="${file.thumbnail}"
                  data-file-name="${cleanFileName}"
                  data-file-data="${fileDataBase64}">` :
            `<div class="file-placeholder">${this.getFileIcon(file.extension)}</div>`;
        
        const metadataHtml = file.metadata ? this.createMetadataHtml(file.metadata) : '';
        const printSettingsHtml = file.metadata ? this.createPrintSettingsHtml(file.metadata) : '';
        
        return `
            <div class="modern-file-card file-card-enhanced" data-filename="${cleanFileName}">
                <div class="file-thumbnail-container">
                    ${thumbnailHtml}
                    <div class="file-format-badge">${file.extension.replace('.', '').toUpperCase()}</div>
                    ${file.has_thumbnail ? '<div class="thumbnail-overlay-icon">🔍</div>' : ''}
                </div>
                
                <div class="file-info">
                    <div class="file-name" title="${file.name}">${file.name}</div>
                    
                    <div class="file-metadata">
                        <div class="file-meta-item">
                            <span class="file-meta-label">Size</span>
                            <span class="file-meta-value">${file.size_mb || (file.size / (1024 * 1024)).toFixed(1)} MB</span>
                        </div>
                        <div class="file-meta-item">
                            <span class="file-meta-label">Modified</span>
                            <span class="file-meta-value">${this.formatDate(file.modified)}</span>
                        </div>
                    </div>
                    
                    ${metadataHtml}
                    ${printSettingsHtml}
                    
                    <div class="file-actions">
                        <button class="file-action-btn btn-primary" onclick="modernFileManager.selectAndPrint('${cleanFileName}')">
                            <i class="fas fa-print"></i> Print
                        </button>
                        <button class="file-action-btn btn-secondary" onclick="modernFileManager.downloadFile('${cleanFileName}')">
                            <i class="fas fa-download"></i> Download
                        </button>
                        ${file.has_thumbnail ? 
                            `<button class="file-action-btn btn-info" onclick="modernFileManager.openThumbnailModal('${file.thumbnail}', '${cleanFileName}', '${fileDataBase64}', true)" title="View Thumbnail">
                                <i class="fas fa-search-plus"></i>
                            </button>` : ''
                        }
                        <button class="file-action-btn btn-danger" onclick="modernFileManager.deleteFile('${cleanFileName}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
    
    // Enhanced openThumbnailModal with better filename handling - integrating fixes
    openThumbnailModal(thumbnailSrc, fileName, fileData = null, isBase64 = false) {
        console.log('📸 Opening thumbnail modal from file manager');
        console.log('📸 Filename:', fileName);
        console.log('📸 Is Base64:', isBase64);
        
        // Handle base64 encoded data
        let parsedFileData = null;
        
        if (isBase64 && typeof fileData === 'string') {
            try {
                parsedFileData = JSON.parse(atob(fileData));
                console.log('📸 Decoded base64 file data:', parsedFileData);
            } catch (e) {
                console.warn('📸 Failed to decode base64 file data:', e);
                parsedFileData = { name: fileName };
            }
        } else if (typeof fileData === 'string') {
            try {
                parsedFileData = JSON.parse(fileData.replace(/&quot;/g, '"').replace(/&#39;/g, "'"));
                console.log('📸 Parsed string file data:', parsedFileData);
            } catch (e) {
                console.warn('📸 Failed to parse file data:', e);
                parsedFileData = { name: fileName };
            }
        } else {
            parsedFileData = fileData || { name: fileName };
        }
        
        // Ensure parsedFileData has the filename
        if (!parsedFileData.name) {
            parsedFileData.name = fileName;
        }
        
        console.log('📸 Final file data for modal:', parsedFileData);
        
        // Ensure thumbnail modal is initialized
        if (!window.thumbnailModal) {
            console.log('📸 Initializing thumbnail modal...');
            if (typeof ThumbnailModal !== 'undefined') {
                window.thumbnailModal = new ThumbnailModal();
            } else {
                console.error('📸 ThumbnailModal class not available');
                this.showAlert('Thumbnail viewer not available. Please refresh the page.', 'error');
                return;
            }
        }
        
        // Use the global thumbnail modal
        if (window.thumbnailModal) {
            console.log('📸 Calling thumbnailModal.show');
            window.thumbnailModal.show(thumbnailSrc, fileName, parsedFileData);
        } else {
            console.error('📸 Thumbnail modal system not available');
            this.showAlert('Thumbnail viewer not available. Please ensure the thumbnail modal scripts are loaded.', 'error');
        }
    }
    
    createMetadataHtml(metadata) {
        if (!metadata || Object.keys(metadata).length === 0) return '';
        
        const metadataItems = Object.entries(metadata)
            .filter(([key, value]) => value !== null && value !== undefined && value !== '')
            .map(([key, value]) => `
                <div class="file-meta-item">
                    <span class="file-meta-label">${this.formatFieldName(key)}</span>
                    <span class="file-meta-value">${this.formatFieldValue(key, value)}</span>
                </div>
            `).join('');
        
        return metadataItems ? `<div class="file-metadata-extended">${metadataItems}</div>` : '';
    }
    
    createPrintSettingsHtml(metadata) {
        if (!metadata) return '';
        
        const printSettings = [];
        const printKeys = ['layer_height', 'exposure_time', 'bottom_exposure_time', 'bottom_layers'];
        
        printKeys.forEach(key => {
            if (metadata[key] !== null && metadata[key] !== undefined && metadata[key] !== '') {
                printSettings.push(`
                    <div class="file-meta-item print-setting">
                        <span class="file-meta-label">${this.formatFieldName(key)}</span>
                        <span class="file-meta-value">${this.formatFieldValue(key, metadata[key])}</span>
                    </div>
                `);
            }
        });
        
        return printSettings.length > 0 ? 
            `<div class="file-print-settings">${printSettings.join('')}</div>` : '';
    }
    
    formatFieldName(field) {
        return field.replace(/_/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase())
            .replace(/\b(ctb|cbddlp|pwmx|pwmo|pwms|pws|pw0|pwx)\b/gi, l => l.toUpperCase());
    }
    
    formatFieldValue(field, value) {
        if (typeof value === 'number') {
            if (field.includes('time')) {
                return `${value}s`;
            } else if (field.includes('height') || field.includes('width') || field.includes('depth')) {
                return `${value}mm`;
            } else if (field.includes('size')) {
                return `${(value / (1024 * 1024)).toFixed(1)} MB`;
            }
        }
        return String(value);
    }
    
    getFileIcon(extension) {
        const icons = {
            '.ctb': '🖨️',
            '.cbddlp': '🖨️',
            '.pwmx': '🖨️',
            '.pwmo': '🖨️',
            '.pwms': '🖨️',
            '.pws': '🖨️',
            '.pw0': '🖨️',
            '.pwx': '🖨️'
        };
        return icons[extension] || '📄';
    }
    
    formatDate(dateString) {
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        } catch (e) {
            return dateString;
        }
    }
    
    renderEmptyState() {
        const container = document.getElementById('modernFileGrid');
        if (!container) return;
        
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📁</div>
                <div class="empty-state-title">No Files Found</div>
                <div class="empty-state-subtitle">Upload some 3D printing files to get started</div>
                <div class="empty-state-hint">Supported formats: CTB, CBDDLP, PWMX, PWS, PW0, PWX</div>
            </div>
        `;
    }
    
    showLoadingState() {
        const container = document.getElementById('modernFileGrid');
        if (!container) return;
        
        container.innerHTML = `
            <div class="loading-state">
                <div class="loading-spinner"></div>
                <div class="loading-text">Loading files...</div>
            </div>
        `;
    }
    
    showUploadProgress(show) {
        const uploadArea = document.getElementById('modernUploadArea');
        if (!uploadArea) return;
        
        if (show) {
            uploadArea.style.opacity = '0.5';
            uploadArea.style.pointerEvents = 'none';
        } else {
            uploadArea.style.opacity = '1';
            uploadArea.style.pointerEvents = 'auto';
        }
    }
    
    async updateStats() {
        try {
            const response = await fetch('/api/storage_stats');
            const data = await response.json();
            
            if (data.success) {
                this.renderStats(data.stats);
            }
        } catch (error) {
            console.debug('Failed to update stats:', error);
        }
    }
    
    renderStats(stats) {
        const container = document.getElementById('fileStatsBar');
        if (!container || !stats) return;
        
        const totalSizeGB = (stats.total_file_size / (1024 * 1024 * 1024)).toFixed(1);
        const freeSpaceGB = (stats.disk_usage.free / (1024 * 1024 * 1024)).toFixed(1);
        const usedPercent = stats.disk_usage.used_percent?.toFixed(1) || '0';
        
        container.innerHTML = `
            <div class="file-stats-grid">
                <div class="file-stat-item">
                    <span class="file-stat-value">${stats.total_files}</span>
                    <span class="file-stat-label">Files</span>
                </div>
                <div class="file-stat-item">
                    <span class="file-stat-value">${stats.files_with_thumbnails}</span>
                    <span class="file-stat-label">With Thumbnails</span>
                </div>
                <div class="file-stat-item">
                    <span class="file-stat-value">${totalSizeGB}GB</span>
                    <span class="file-stat-label">Total Size</span>
                </div>
                <div class="file-stat-item">
                    <span class="file-stat-value">${freeSpaceGB}GB</span>
                    <span class="file-stat-label">Free Space</span>
                </div>
                <div class="file-stat-item">
                    <span class="file-stat-value">${usedPercent}%</span>
                    <span class="file-stat-label">Used</span>
                </div>
            </div>
        `;
    }
    
    startStatsRefresh() {
        if (this.statsRefreshInterval) {
            clearInterval(this.statsRefreshInterval);
        }
        
        this.statsRefreshInterval = setInterval(() => {
            this.updateStats();
        }, 30000); // Update every 30 seconds
    }
    
    // File Actions
    // FIXED selectAndPrint method - integrating the fixes
    async selectAndPrint(filename) {
        console.log('🖨️ ModernFileManager.selectAndPrint called with:', filename);
        
        // Call the global selectAndPrint function if available
        if (typeof window.selectAndPrint === 'function') {
            console.log('🖨️ Calling global selectAndPrint function');
            window.selectAndPrint(filename);
        } else if (typeof selectAndPrint === 'function') {
            console.log('🖨️ Calling selectAndPrint function');
            selectAndPrint(filename);
        } else {
            console.error('🖨️ selectAndPrint function not available');
            this.showAlert('Print function not available. Please ensure the main application is loaded.', 'error');
        }
    }
    
    async downloadFile(filename) {
        try {
            const url = `/api/download/${encodeURIComponent(filename)}`;
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            this.showAlert(`Downloaded: ${filename}`, 'success');
        } catch (error) {
            this.showAlert(`Download failed: ${error.message}`, 'error');
        }
    }
    
    async deleteFile(filename) {
        if (!confirm(`Delete ${filename}?`)) return;
        
        try {
            const response = await fetch('/api/delete_file', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filename })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showAlert(`Deleted: ${filename}`, 'success');
                await this.refreshFiles();
            } else {
                this.showAlert(`Delete failed: ${result.error}`, 'error');
            }
        } catch (error) {
            this.showAlert(`Delete error: ${error.message}`, 'error');
        }
    }
    
    async regenerateThumbnails() {
        try {
            this.showAlert('Regenerating thumbnails...', 'info');
            
            const response = await fetch('/api/regenerate_thumbnails', {
                method: 'POST'
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showAlert(`Regenerated ${result.regenerated || result.generated || 0} thumbnails`, 'success');
                await this.refreshFiles();
            } else {
                this.showAlert('Failed to regenerate thumbnails', 'error');
            }
        } catch (error) {
            this.showAlert(`Thumbnail regeneration failed: ${error.message}`, 'error');
        }
    }
    
    async cleanupFiles() {
        if (!confirm('Remove old files to free space?')) return;
        
        try {
            const response = await fetch('/api/cleanup_files', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    max_files: 50,
                    max_age_days: 30
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showAlert(`Cleanup completed: ${result.deleted_count} files removed`, 'success');
                await this.refreshFiles();
            } else {
                this.showAlert(`Cleanup failed: ${result.error}`, 'error');
            }
        } catch (error) {
            this.showAlert(`Cleanup error: ${error.message}`, 'error');
        }
    }
    
    showAlert(message, type = 'info') {
        if (typeof showAlert === 'function') {
            showAlert(message, type);
        } else {
            console.log(`${type.toUpperCase()}: ${message}`);
        }
        
        if (typeof addConsoleMessage === 'function') {
            addConsoleMessage(message, type);
        }
    }
    
    destroy() {
        if (this.statsRefreshInterval) {
            clearInterval(this.statsRefreshInterval);
        }
    }
}

// Initialize the modern file manager
let modernFileManager = null;

document.addEventListener('DOMContentLoaded', function() {
    // Only initialize if we have the modern file manager elements
    if (document.getElementById('modernFileGrid')) {
        modernFileManager = new ModernFileManager();
        
        // Make it globally available
        window.modernFileManager = modernFileManager;
        
        // Initialize the file manager
        modernFileManager.init().then(() => {
            console.log('🗂️ Modern File Manager with Thumbnail Modal initialized');
            console.log('📸 Click any thumbnail to view it larger!');
            console.log('🔍 Thumbnails with magnifying glass icon are clickable');
        }).catch(error => {
            console.error('❌ Failed to initialize Modern File Manager:', error);
        });
    }
    
    // Ensure thumbnail modal is available globally
    if (typeof ThumbnailModal !== 'undefined' && !window.thumbnailModal) {
        window.thumbnailModal = new ThumbnailModal();
        console.log('📸 Global thumbnail modal initialized');
    }
});

// Legacy compatibility functions
window.refreshModernFiles = function() {
    if (modernFileManager) {
        modernFileManager.refreshFiles();
    }
};

window.regenerateThumbnails = function() {
    if (modernFileManager) {
        modernFileManager.regenerateThumbnails();
    }
};

window.cleanupModernFiles = function() {
    if (modernFileManager) {
        modernFileManager.cleanupFiles();
    }
};

// Export the openThumbnailModal function for global access
window.openThumbnailModalFromFileManager = function(thumbnailSrc, fileName, fileData) {
    if (modernFileManager) {
        modernFileManager.openThumbnailModal(thumbnailSrc, fileName, fileData);
    } else {
        console.error('📸 Modern File Manager not initialized');
    }
};

// Fallback thumbnail modal initialization
window.initializeThumbnailModalFallback = function() {
    if (typeof ThumbnailModal !== 'undefined' && !window.thumbnailModal) {
        window.thumbnailModal = new ThumbnailModal();
        console.log('📸 Fallback thumbnail modal initialized');
    }
};

// Try to initialize thumbnail modal when ThumbnailModal class becomes available
if (typeof ThumbnailModal !== 'undefined') {
    window.initializeThumbnailModalFallback();
} else {
    // Wait for it to load
    const checkThumbnailModal = setInterval(() => {
        if (typeof ThumbnailModal !== 'undefined') {
            window.initializeThumbnailModalFallback();
            clearInterval(checkThumbnailModal);
        }
    }, 100);
}