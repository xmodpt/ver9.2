/**
 * File Manager Integration for Thumbnail Modal
 * Updates to ModernFileManager to add thumbnail click functionality
 */

// Add this to your existing ModernFileManager class in filemanager.js

// Update the createFileCard method to add thumbnail click handlers
createFileCard(file) {
    const thumbnailHtml = file.has_thumbnail ? 
        `<img src="${file.thumbnail}" alt="${file.name}" class="file-thumbnail" loading="lazy" 
             onerror="this.style.display='none'" 
             onclick="modernFileManager.openThumbnailModal('${file.thumbnail}', '${file.name}', ${JSON.stringify(file).replace(/"/g, '&quot;')})"
             style="cursor: pointer;" 
             title="Click to view larger thumbnail">` :
        `<div class="file-placeholder">${this.getFileIcon(file.extension)}</div>`;
    
    const metadataHtml = file.metadata ? this.createMetadataHtml(file.metadata) : '';
    const printSettingsHtml = file.metadata ? this.createPrintSettingsHtml(file.metadata) : '';
    
    return `
        <div class="modern-file-card file-card-enhanced" data-filename="${file.name}">
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
                        <span class="file-meta-value">${file.size_mb} MB</span>
                    </div>
                    <div class="file-meta-item">
                        <span class="file-meta-label">Modified</span>
                        <span class="file-meta-value">${this.formatDate(file.modified)}</span>
                    </div>
                </div>
                
                ${metadataHtml}
                ${printSettingsHtml}
                
                <div class="file-actions">
                    <button class="file-action-btn btn-primary" onclick="modernFileManager.selectAndPrint('${file.name}')">
                        <i class="fas fa-print"></i> Print
                    </button>
                    <button class="file-action-btn btn-secondary" onclick="modernFileManager.downloadFile('${file.name}')">
                        <i class="fas fa-download"></i> Download
                    </button>
                    ${file.has_thumbnail ? 
                        `<button class="file-action-btn btn-info" onclick="modernFileManager.openThumbnailModal('${file.thumbnail}', '${file.name}', ${JSON.stringify(file).replace(/"/g, '&quot;')})" title="View Thumbnail">
                            <i class="fas fa-search-plus"></i>
                        </button>` : ''
                    }
                    <button class="file-action-btn btn-danger" onclick="modernFileManager.deleteFile('${file.name}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
}

// Add this method to the ModernFileManager class
openThumbnailModal(thumbnailSrc, fileName, fileData = null) {
    console.log('📸 Opening thumbnail modal from file manager:', fileName);
    
    // Parse fileData if it's a string
    if (typeof fileData === 'string') {
        try {
            fileData = JSON.parse(fileData);
        } catch (e) {
            console.warn('Failed to parse file data:', e);
            fileData = { name: fileName };
        }
    }
    
    // Ensure fileData has required properties
    if (!fileData) {
        fileData = { name: fileName };
    }
    
    // Use the global thumbnail modal
    if (window.thumbnailModal) {
        window.thumbnailModal.show(thumbnailSrc, fileName, fileData);
    } else if (typeof openThumbnailModal === 'function') {
        openThumbnailModal(thumbnailSrc, fileName, fileData);
    } else {
        console.error('📸 Thumbnail modal system not available');
        this.showAlert('Thumbnail viewer not available', 'error');
    }
}

// Add thumbnail overlay styles to your CSS (add this to style.css or filemanager.css)
const thumbnailOverlayStyles = `
/* Thumbnail Overlay Icon */
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
}

.file-thumbnail-container:hover .thumbnail-overlay-icon {
    opacity: 1;
}

/* Enhanced File Thumbnail */
.file-thumbnail {
    transition: transform 0.3s ease, box-shadow 0.3s ease;
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
`;

// Inject the styles
function injectThumbnailModalStyles() {
    const styleId = 'thumbnailModalStyles';
    
    // Check if styles already injected
    if (document.getElementById(styleId)) {
        return;
    }
    
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = thumbnailOverlayStyles;
    document.head.appendChild(style);
    
    console.log('📸 Thumbnail modal styles injected');
}

// Auto-inject styles when this script loads
document.addEventListener('DOMContentLoaded', function() {
    injectThumbnailModalStyles();
});

// If DOM already loaded
if (document.readyState !== 'loading') {
    injectThumbnailModalStyles();
}

// Enhanced refresh method to include thumbnail modal support
async function refreshFilesWithThumbnailSupport() {
    if (this.isLoading) return;
    
    this.isLoading = true;
    this.showLoadingState();
    
    try {
        const response = await fetch('/api/files');
        const data = await response.json();
        
        if (data.success) {
            this.files = data.files;
            
            // Enhance file data with thumbnail information
            this.files = this.files.map(file => ({
                ...file,
                has_thumbnail: !!file.thumbnail,
                thumbnail: file.thumbnail ? `/api/thumbnails/${file.thumbnail}` : null
            }));
            
            this.renderFiles();
            this.updateStats();
            
            if (typeof addConsoleMessage === 'function') {
                addConsoleMessage(`Loaded ${data.count} files with thumbnail support`, 'info');
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

// Export the integration functions for global use
window.injectThumbnailModalStyles = injectThumbnailModalStyles;
window.refreshFilesWithThumbnailSupport = refreshFilesWithThumbnailSupport;

// Extend the existing ModernFileManager if it exists
if (window.modernFileManager && typeof window.modernFileManager === 'object') {
    // Add the openThumbnailModal method to existing instance
    window.modernFileManager.openThumbnailModal = function(thumbnailSrc, fileName, fileData = null) {
        console.log('📸 Opening thumbnail modal from file manager:', fileName);
        
        // Parse fileData if it's a string
        if (typeof fileData === 'string') {
            try {
                fileData = JSON.parse(fileData.replace(/&quot;/g, '"'));
            } catch (e) {
                console.warn('Failed to parse file data:', e);
                fileData = { name: fileName };
            }
        }
        
        // Ensure fileData has required properties
        if (!fileData) {
            fileData = { name: fileName };
        }
        
        // Use the global thumbnail modal
        if (window.thumbnailModal) {
            window.thumbnailModal.show(thumbnailSrc, fileName, fileData);
        } else if (typeof openThumbnailModal === 'function') {
            openThumbnailModal(thumbnailSrc, fileName, fileData);
        } else {
            console.error('📸 Thumbnail modal system not available');
            this.showAlert('Thumbnail viewer not available', 'error');
        }
    };
    
    console.log('📸 Extended existing ModernFileManager with thumbnail modal support');
}