/**
 * Thumbnail Modal System - FIXED PRINT FUNCTIONALITY
 * Handles thumbnail popup modals with zoom functionality
 */

class ThumbnailModal {
    constructor() {
        console.log('📸 ThumbnailModal constructor called');
        this.modal = null;
        this.currentImageSrc = null;
        this.currentFileName = null;
        this.currentFileData = null; // Store complete file data
        this.isZoomed = false;
        
        this.init();
    }
    
    init() {
        this.createModal();
        this.setupEventListeners();
        console.log('📸 Thumbnail modal system initialized');
    }
    
    createModal() {
        // Check if modal already exists
        if (document.getElementById('thumbnailModal')) {
            this.modal = document.getElementById('thumbnailModal');
            return;
        }
        
        // Create modal HTML
        this.modal = document.createElement('div');
        this.modal.id = 'thumbnailModal';
        this.modal.className = 'thumbnail-modal';
        this.modal.innerHTML = `
            <div class="thumbnail-modal-content">
                <div class="thumbnail-modal-header">
                    <h3 class="thumbnail-modal-title" id="thumbnailModalTitle">File Thumbnail</h3>
                    <button class="thumbnail-modal-close" onclick="thumbnailModal.close()" title="Close (Esc)">
                        ×
                    </button>
                </div>
                
                <div class="thumbnail-modal-body" id="thumbnailModalBody">
                    <div class="thumbnail-modal-loading" id="thumbnailLoading">
                        <div class="thumbnail-loading-spinner"></div>
                        <div>Loading thumbnail...</div>
                    </div>
                </div>
                
                <div class="thumbnail-modal-footer">
                    <div class="thumbnail-modal-meta" id="thumbnailModalMeta">
                        <!-- File metadata will be populated here -->
                    </div>
                    
                    <div class="thumbnail-modal-actions">
                        <button class="thumbnail-modal-btn btn-secondary" onclick="thumbnailModal.downloadImage()" title="Download thumbnail">
                            <i class="fas fa-download"></i> Download
                        </button>
                        <button class="thumbnail-modal-btn btn-primary" onclick="thumbnailModal.printFile()" title="Print this file">
                            <i class="fas fa-print"></i> Print File
                        </button>
                        <button class="thumbnail-modal-btn btn-success" onclick="thumbnailModal.openFullscreen()" title="View fullscreen">
                            <i class="fas fa-expand"></i> Fullscreen
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(this.modal);
    }
    
    setupEventListeners() {
        // Close on outside click
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.close();
            }
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (this.modal.classList.contains('active')) {
                switch(e.key) {
                    case 'Escape':
                        e.preventDefault();
                        this.close();
                        break;
                    case 'Enter':
                    case ' ':
                        e.preventDefault();
                        this.toggleZoom();
                        break;
                    case 'f':
                    case 'F':
                        e.preventDefault();
                        this.openFullscreen();
                        break;
                    case 'p':
                    case 'P':
                        e.preventDefault();
                        this.printFile();
                        break;
                    case 'd':
                    case 'D':
                        e.preventDefault();
                        this.downloadImage();
                        break;
                }
            }
        });
    }
    
    show(thumbnailSrc, fileName, fileData = null) {
        console.log('📸 Showing thumbnail modal for:', fileName);
        
        // Store all the data properly
        this.currentImageSrc = thumbnailSrc;
        this.currentFileName = fileName;
        this.currentFileData = fileData;
        
        // Handle base64 encoded file data if needed
        if (typeof fileData === 'string' && fileData.length > 0) {
            try {
                // Check if it's base64 encoded
                if (fileData.match(/^[A-Za-z0-9+/]*={0,2}$/)) {
                    this.currentFileData = JSON.parse(atob(fileData));
                } else {
                    this.currentFileData = JSON.parse(fileData);
                }
            } catch (e) {
                console.warn('Failed to parse file data, using basic info:', e);
                this.currentFileData = { name: fileName };
            }
        } else if (!fileData) {
            this.currentFileData = { name: fileName };
        }
        
        console.log('📸 Current file data set to:', this.currentFileData);
        
        // Update modal title
        const title = document.getElementById('thumbnailModalTitle');
        if (title) {
            title.textContent = fileName || 'File Thumbnail';
        }
        
        // Show loading state
        this.showLoading();
        
        // Show modal
        this.modal.classList.add('active');
        
        // Load the image
        this.loadImage(thumbnailSrc, this.currentFileData);
        
        // Focus management
        setTimeout(() => {
            const closeBtn = this.modal.querySelector('.thumbnail-modal-close');
            if (closeBtn) closeBtn.focus();
        }, 100);
    }
    
    showLoading() {
        const body = document.getElementById('thumbnailModalBody');
        if (body) {
            body.innerHTML = `
                <div class="thumbnail-modal-loading">
                    <div class="thumbnail-loading-spinner"></div>
                    <div>Loading thumbnail...</div>
                </div>
            `;
        }
    }
    
    loadImage(src, fileData = null) {
        const body = document.getElementById('thumbnailModalBody');
        if (!body) return;
        
        const img = new Image();
        
        img.onload = () => {
            console.log('📸 Thumbnail loaded successfully');
            
            // Create image container
            body.innerHTML = `
                <img class="thumbnail-large" 
                     src="${src}" 
                     alt="${this.currentFileName}"
                     onclick="thumbnailModal.toggleZoom()"
                     title="Click to zoom (Space)"
                     style="max-width: 500px; max-height: 500px;">
            `;
            
            // Update metadata
            this.updateMetadata(fileData);
        };
        
        img.onerror = () => {
            console.error('📸 Failed to load thumbnail');
            this.showError();
        };
        
        // Start loading
        img.src = src;
    }
    
    showError() {
        const body = document.getElementById('thumbnailModalBody');
        if (body) {
            body.innerHTML = `
                <div class="thumbnail-modal-error">
                    <div class="thumbnail-error-icon">🖼️</div>
                    <div class="thumbnail-error-text">Failed to load thumbnail</div>
                    <div class="thumbnail-error-hint">The thumbnail file may be corrupted or missing</div>
                </div>
            `;
        }
    }
    
    updateMetadata(fileData) {
        const metaContainer = document.getElementById('thumbnailModalMeta');
        if (!metaContainer || !fileData) return;
        
        const metadata = [
            { label: 'File Name', value: fileData.name || this.currentFileName },
            { label: 'File Size', value: this.formatFileSize(fileData.size) },
            { label: 'Format', value: (fileData.extension || '').toUpperCase() },
            { label: 'Modified', value: fileData.modified || 'Unknown' }
        ];
        
        // Add file-specific metadata if available
        if (fileData.metadata) {
            if (fileData.metadata.layer_count) {
                metadata.push({ label: 'Layers', value: fileData.metadata.layer_count });
            }
            if (fileData.metadata.layer_height) {
                metadata.push({ label: 'Layer Height', value: `${fileData.metadata.layer_height}mm` });
            }
            if (fileData.metadata.resolution_x && fileData.metadata.resolution_y) {
                metadata.push({ 
                    label: 'Resolution', 
                    value: `${fileData.metadata.resolution_x}×${fileData.metadata.resolution_y}px` 
                });
            }
        }
        
        metaContainer.innerHTML = metadata.map(item => `
            <div class="thumbnail-meta-item">
                <span class="thumbnail-meta-label">${item.label}:</span>
                <span class="thumbnail-meta-value">${item.value}</span>
            </div>
        `).join('');
    }
    
    toggleZoom() {
        const img = this.modal.querySelector('.thumbnail-large');
        if (!img) return;
        
        this.isZoomed = !this.isZoomed;
        
        if (this.isZoomed) {
            img.classList.add('zoomed');
            img.title = 'Click to zoom out (Space)';
        } else {
            img.classList.remove('zoomed');
            img.title = 'Click to zoom (Space)';
        }
        
        console.log('📸 Thumbnail zoom toggled:', this.isZoomed ? 'zoomed in' : 'zoomed out');
    }
    
    openFullscreen() {
        const img = this.modal.querySelector('.thumbnail-large');
        if (!img) {
            if (typeof showAlert === 'function') {
                showAlert('No image to view in fullscreen', 'warning');
            }
            return;
        }
        
        try {
            if (img.requestFullscreen) {
                img.requestFullscreen();
            } else if (img.webkitRequestFullscreen) {
                img.webkitRequestFullscreen();
            } else if (img.mozRequestFullScreen) {
                img.mozRequestFullScreen();
            } else if (img.msRequestFullscreen) {
                img.msRequestFullscreen();
            } else {
                throw new Error('Fullscreen not supported');
            }
            
            console.log('📸 Opened thumbnail in fullscreen');
            
        } catch (error) {
            console.warn('📸 Fullscreen failed:', error);
            if (typeof showAlert === 'function') {
                showAlert('Fullscreen not supported on this device', 'warning');
            }
        }
    }
    
    downloadImage() {
        if (!this.currentImageSrc || !this.currentFileName) {
            if (typeof showAlert === 'function') {
                showAlert('No image to download', 'warning');
            }
            return;
        }
        
        try {
            const link = document.createElement('a');
            link.href = this.currentImageSrc;
            link.download = `${this.currentFileName}_thumbnail.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            console.log('📸 Downloaded thumbnail:', this.currentFileName);
            
            if (typeof showAlert === 'function') {
                showAlert('Thumbnail downloaded', 'success');
            }
            
        } catch (error) {
            console.error('📸 Download failed:', error);
            if (typeof showAlert === 'function') {
                showAlert('Failed to download thumbnail', 'error');
            }
        }
    }
    
    printFile() {
        console.log('🖨️ PRINT FILE CALLED');
        console.log('🖨️ Current filename:', this.currentFileName);
        console.log('🖨️ Current file data:', this.currentFileData);
        
        // Get the actual filename to print
        let filenameToPrint = null;
        
        // Try multiple sources for the filename
        if (this.currentFileData && this.currentFileData.name) {
            filenameToPrint = this.currentFileData.name;
            console.log('🖨️ Using filename from fileData.name:', filenameToPrint);
        } else if (this.currentFileName) {
            filenameToPrint = this.currentFileName;
            console.log('🖨️ Using filename from currentFileName:', filenameToPrint);
        }
        
        if (!filenameToPrint) {
            console.error('🖨️ No filename available for printing');
            if (typeof showAlert === 'function') {
                showAlert('No file selected for printing', 'error');
            }
            return;
        }
        
        console.log('🖨️ Final filename to print:', filenameToPrint);
        
        // Close modal first
        this.close();
        
        // Call the global print function with proper error handling
        try {
            if (typeof selectAndPrint === 'function') {
                console.log('🖨️ Calling selectAndPrint function');
                selectAndPrint(filenameToPrint);
            } else if (typeof window.selectAndPrint === 'function') {
                console.log('🖨️ Calling window.selectAndPrint function');
                window.selectAndPrint(filenameToPrint);
            } else if (window.modernFileManager && typeof window.modernFileManager.selectAndPrint === 'function') {
                console.log('🖨️ Calling modernFileManager.selectAndPrint function');
                window.modernFileManager.selectAndPrint(filenameToPrint);
            } else {
                console.error('🖨️ No print function available');
                if (typeof showAlert === 'function') {
                    showAlert('Print function not available', 'error');
                } else {
                    alert('Print function not available');
                }
            }
        } catch (error) {
            console.error('🖨️ Error calling print function:', error);
            if (typeof showAlert === 'function') {
                showAlert(`Print error: ${error.message}`, 'error');
            }
        }
    }
    
    close() {
        console.log('📸 Closing thumbnail modal');
        
        this.modal.classList.remove('active');
        this.currentImageSrc = null;
        this.currentFileName = null;
        this.currentFileData = null;
        this.isZoomed = false;
        
        // Clear modal content after animation
        setTimeout(() => {
            const body = document.getElementById('thumbnailModalBody');
            if (body) {
                body.innerHTML = `
                    <div class="thumbnail-modal-loading">
                        <div class="thumbnail-loading-spinner"></div>
                        <div>Loading thumbnail...</div>
                    </div>
                `;
            }
            
            const meta = document.getElementById('thumbnailModalMeta');
            if (meta) {
                meta.innerHTML = '';
            }
        }, 300);
    }
    
    formatFileSize(bytes) {
        if (!bytes || bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

// Initialize the thumbnail modal system
let thumbnailModal = null;

document.addEventListener('DOMContentLoaded', function() {
    console.log('📸 Initializing thumbnail modal');
    thumbnailModal = new ThumbnailModal();
    
    // Make it globally available
    window.thumbnailModal = thumbnailModal;
    
    console.log('📸 Thumbnail modal system loaded');
});

// Helper function to open thumbnail modal from file manager
window.openThumbnailModal = function(thumbnailSrc, fileName, fileData = null) {
    console.log('📸 Opening thumbnail modal:', fileName);
    
    if (thumbnailModal) {
        thumbnailModal.show(thumbnailSrc, fileName, fileData);
    } else {
        console.error('📸 thumbnailModal not initialized');
    }
};

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ThumbnailModal;
}