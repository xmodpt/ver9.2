#!/usr/bin/env python3
"""
CTB (Chitubox) File Format Handler
Based on UVtools file format specifications
"""

import struct
import logging
from pathlib import Path
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)

class CTBHandler:
    """Handles CTB file format operations"""
    
    def __init__(self):
        self.magic = b'CTB\x00'
        self.version = None
    
    def extract_thumbnail(self, file_path: Path) -> Optional[bytes]:
        """
        Extract thumbnail from CTB file
        
        Args:
            file_path: Path to CTB file
            
        Returns:
            Thumbnail data as bytes or None if failed
        """
        try:
            with open(file_path, 'rb') as f:
                # Read and verify header
                header = f.read(4)
                if header != self.magic:
                    logger.error(f"Invalid CTB file header: {header}")
                    return None
                
                # Read version
                self.version = struct.unpack('<I', f.read(4))[0]
                logger.debug(f"CTB version: {self.version}")
                
                # Skip to thumbnail section
                # CTB files have thumbnails at different offsets depending on version
                if self.version >= 4:
                    # Newer CTB versions
                    f.seek(0x50)
                else:
                    # Older CTB versions
                    f.seek(0x40)
                
                # Read thumbnail size
                thumb_size = struct.unpack('<I', f.read(4))[0]
                if thumb_size == 0:
                    logger.warning("No thumbnail found in CTB file")
                    return None
                
                # Read thumbnail data
                thumbnail_data = f.read(thumb_size)
                
                if len(thumbnail_data) != thumb_size:
                    logger.error(f"Thumbnail data incomplete: {len(thumbnail_data)}/{thumb_size}")
                    return None
                
                logger.info(f"Extracted CTB thumbnail: {thumb_size} bytes")
                return thumbnail_data
                
        except Exception as e:
            logger.error(f"Error extracting CTB thumbnail: {e}")
            return None
    
    def get_file_info(self, file_path: Path) -> Optional[Dict[str, Any]]:
        """
        Get basic file information from CTB file
        
        Args:
            file_path: Path to CTB file
            
        Returns:
            Dictionary with file information or None if failed
        """
        try:
            with open(file_path, 'rb') as f:
                # Read header
                header = f.read(4)
                if header != self.magic:
                    return None
                
                # Read version
                version = struct.unpack('<I', f.read(4))[0]
                
                # Read file info
                f.seek(0x10)
                layer_count = struct.unpack('<I', f.read(4))[0]
                
                f.seek(0x20)
                resolution_x = struct.unpack('<I', f.read(4))[0]
                resolution_y = struct.unpack('<I', f.read(4))[0]
                
                return {
                    'format': 'CTB',
                    'version': version,
                    'layer_count': layer_count,
                    'resolution_x': resolution_x,
                    'resolution_y': resolution_y
                }
                
        except Exception as e:
            logger.error(f"Error reading CTB file info: {e}")
            return None 