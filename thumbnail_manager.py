#!/usr/bin/env python3
"""
Thumbnail Manager for 3D Printing Files
Handles thumbnail extraction for various file formats (CTB, CBDDLP, PWMX, etc.)
Based on UVtools file format specifications
"""

import os
import struct
import logging
from pathlib import Path
from PIL import Image
import io
import json
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)

class ThumbnailManager:
    """Manages thumbnail extraction and storage for 3D printing files"""
    
    def __init__(self, thumbnails_dir: str = "thumbnails"):
        self.thumbnails_dir = Path(thumbnails_dir)
        self.thumbnails_dir.mkdir(exist_ok=True)
        
        # Supported file formats and their handlers
        self.format_handlers = {
            '.ctb': self._extract_ctb_thumbnail,
            '.cbddlp': self._extract_cbddlp_thumbnail,
            '.pwmx': self._extract_pwmx_thumbnail,
            '.pwmo': self._extract_pwmo_thumbnail,
            '.pwms': self._extract_pwms_thumbnail,
            '.pws': self._extract_pws_thumbnail,
            '.pw0': self._extract_pw0_thumbnail,
            '.pwx': self._extract_pwx_thumbnail
        }
    
    def extract_thumbnail(self, file_path: str) -> Optional[str]:
        """
        Extract thumbnail from a 3D printing file
        
        Args:
            file_path: Path to the file
            
        Returns:
            Path to the generated thumbnail or None if failed
        """
        try:
            file_path = Path(file_path)
            if not file_path.exists():
                logger.error(f"File not found: {file_path}")
                return None
            
            # Get file extension
            extension = file_path.suffix.lower()
            if extension not in self.format_handlers:
                logger.warning(f"Unsupported file format: {extension}")
                return None
            
            # Generate thumbnail filename
            thumbnail_filename = f"{file_path.stem}_thumb.png"
            thumbnail_path = self.thumbnails_dir / thumbnail_filename
            
            # Check if thumbnail already exists
            if thumbnail_path.exists():
                logger.info(f"Thumbnail already exists: {thumbnail_path}")
                return str(thumbnail_path)
            
            # Extract thumbnail using appropriate handler
            handler = self.format_handlers[extension]
            thumbnail_data = handler(file_path)
            
            if thumbnail_data:
                # Save thumbnail
                with open(thumbnail_path, 'wb') as f:
                    f.write(thumbnail_data)
                logger.info(f"Thumbnail extracted: {thumbnail_path}")
                return str(thumbnail_path)
            else:
                logger.warning(f"Failed to extract thumbnail from {file_path}")
                return None
                
        except Exception as e:
            logger.error(f"Error extracting thumbnail from {file_path}: {e}")
            return None
    
    def delete_thumbnail(self, file_path: str) -> bool:
        """
        Delete thumbnail for a file
        
        Args:
            file_path: Path to the original file
            
        Returns:
            True if thumbnail was deleted or didn't exist, False on error
        """
        try:
            file_path = Path(file_path)
            thumbnail_filename = f"{file_path.stem}_thumb.png"
            thumbnail_path = self.thumbnails_dir / thumbnail_filename
            
            if thumbnail_path.exists():
                thumbnail_path.unlink()
                logger.info(f"Thumbnail deleted: {thumbnail_path}")
            
                return True
                
        except Exception as e:
            logger.error(f"Error deleting thumbnail for {file_path}: {e}")
            return False
    
    def get_thumbnail_path(self, file_path: str) -> Optional[str]:
        """
        Get the path to the thumbnail for a file
        
        Args:
            file_path: Path to the original file
            
        Returns:
            Path to thumbnail if it exists, None otherwise
        """
        try:
            file_path = Path(file_path)
            thumbnail_filename = f"{file_path.stem}_thumb.png"
            thumbnail_path = self.thumbnails_dir / thumbnail_filename
            
            if thumbnail_path.exists():
                return str(thumbnail_path)
            else:
                return None
                
        except Exception as e:
            logger.error(f"Error getting thumbnail path for {file_path}: {e}")
            return None
    
    def get_thumbnail_stats(self) -> Dict[str, Any]:
        """
        Get statistics about thumbnails
        
        Returns:
            Dictionary with thumbnail statistics
        """
        try:
            thumbnail_files = list(self.thumbnails_dir.glob("*.png"))
            total_size = sum(f.stat().st_size for f in thumbnail_files)
            
            return {
                'total_thumbnails': len(thumbnail_files),
                'total_size_bytes': total_size,
                'total_size_mb': round(total_size / (1024 * 1024), 2),
                'thumbnails_directory': str(self.thumbnails_dir),
                'supported_formats': list(self.format_handlers.keys())
            }
            
        except Exception as e:
            logger.error(f"Error getting thumbnail stats: {e}")
            return {'error': str(e)}
    
    def cleanup_orphaned_thumbnails(self, existing_files: list) -> int:
        """
        Remove thumbnails for files that no longer exist
        
        Args:
            existing_files: List of existing file paths
            
        Returns:
            Number of orphaned thumbnails removed
        """
        try:
            existing_stems = set()
            for file_path in existing_files:
                if isinstance(file_path, str):
                    file_path = Path(file_path)
                existing_stems.add(file_path.stem)
            
            removed_count = 0
            for thumbnail_file in self.thumbnails_dir.glob("*.png"):
                thumbnail_stem = thumbnail_file.stem.replace('_thumb', '')
                if thumbnail_stem not in existing_stems:
                    thumbnail_file.unlink()
                    removed_count += 1
                    logger.debug(f"Removed orphaned thumbnail: {thumbnail_file}")
            
            logger.info(f"Cleaned up {removed_count} orphaned thumbnails")
            return removed_count
            
        except Exception as e:
            logger.error(f"Error cleaning up orphaned thumbnails: {e}")
            return 0
    
    def _extract_ctb_thumbnail(self, file_path: Path) -> Optional[bytes]:
        """Extract thumbnail from CTB (Chitubox) files based on UVtools implementation"""
        try:
            logger.info(f"Extracting CTB thumbnail from: {file_path.name}")
            
            with open(file_path, 'rb') as f:
                # Read CTB header
                header = f.read(4)
                logger.debug(f"CTB header: {header}")
                
                # Check for different CTB formats
                if header == b'CTB\x00':
                    # Regular CTB file
                    logger.debug("Detected regular CTB file")
                    return self._extract_regular_ctb_thumbnail(f)
                elif header in [b'\x07\x01\xfd\x12', b'\x86\x00\xfd\x12', b'\x19\x00\xfd\x12']:
                    # These are actually regular CTB files with different magic numbers
                    logger.debug("Detected CTB file with alternative magic number")
                    return self._extract_regular_ctb_thumbnail(f)
                else:
                    # Try to read as magic number
                    f.seek(0)
                    magic_bytes = f.read(4)
                    if len(magic_bytes) == 4:
                        magic = struct.unpack('<I', magic_bytes)[0]
                        logger.debug(f"Magic number: 0x{magic:08X}")
                        
                        # Check for CTB magic numbers from working code
                        if magic in [0x12FD0019, 0x12FD0086]:
                            logger.debug("Detected CTB format by magic number")
                            return self._extract_regular_ctb_thumbnail(f)
                    
                    logger.error(f"Unknown CTB file header: {header}")
                    return None
                
        except Exception as e:
            logger.error(f"Error extracting CTB thumbnail: {e}")
            return None
    
    def _extract_regular_ctb_thumbnail(self, f) -> Optional[bytes]:
        """Extract thumbnail from regular CTB file"""
        try:
            # Read version
            version = struct.unpack('<I', f.read(4))[0]
            logger.debug(f"CTB version: {version}")
            
            # Read header data (112 bytes total)
            header_data = f.read(108)  # 4 + 108 = 112 bytes total
            if len(header_data) < 108:
                logger.error("CTB header too short")
                return None
            
            # Parse header values
            values = struct.unpack('<' + 'I' * 27, header_data)
            
            # Extract relevant values based on CTB format
            # Based on UVtools output, these are the correct indices:
            large_preview_offset = values[15]  # PreviewLargeOffsetAddress
            small_preview_offset = values[16]  # PreviewSmallOffsetAddress (or LayersDefinitionOffsetAddress)
            
            logger.debug(f"CTB header: large_preview={large_preview_offset}, small_preview={small_preview_offset}")
            
            # Try large preview first, then small preview
            preview_offsets = [large_preview_offset, small_preview_offset]
            
            for i, preview_offset in enumerate(preview_offsets):
                if preview_offset == 0:
                    continue
                    
                logger.debug(f"Trying preview {i+1} at offset {preview_offset}")
                
                try:
                    # Seek to preview header
                    f.seek(preview_offset)
                    preview_header_data = f.read(16)
                    
                    if len(preview_header_data) < 16:
                        logger.warning(f"Preview {i+1} header too short")
                        continue
                    
                    # Parse preview header
                    preview_values = struct.unpack('<IIII', preview_header_data)
                    preview_resolution_x, preview_resolution_y, preview_image_offset, preview_image_length = preview_values
                    
                    logger.debug(f"Preview {i+1}: {preview_resolution_x}x{preview_resolution_y}, offset={preview_image_offset}, length={preview_image_length}")
                    
                    # Validate preview dimensions and length
                    if preview_resolution_x == 0 or preview_resolution_y == 0 or preview_image_length == 0:
                        logger.warning(f"Preview {i+1} has invalid dimensions or length")
                        continue
                    
                    # Check if dimensions are reasonable
                    if preview_resolution_x > 1000 or preview_resolution_y > 1000:
                        logger.warning(f"Preview {i+1} dimensions too large: {preview_resolution_x}x{preview_resolution_y}")
                        continue
                    
                    # Seek to image data
                    f.seek(preview_image_offset)
                    image_data = f.read(preview_image_length)
                    
                    if len(image_data) != preview_image_length:
                        logger.warning(f"Preview {i+1} image data incomplete: {len(image_data)}/{preview_image_length}")
                        continue
                    
                    logger.info(f"Extracted CTB thumbnail from preview {i+1}: {preview_image_length} bytes")
                    
                    # Convert RGB565 to PNG using the working approach
                    result = self._convert_rgb565_to_png_enhanced(image_data, preview_resolution_x, preview_resolution_y)
                    
                    if result:
                        logger.info(f"Successfully converted CTB thumbnail to PNG ({len(result)} bytes)")
                        return result
                    else:
                        logger.warning(f"Failed to convert preview {i+1} to PNG")
                        
                except Exception as e:
                    logger.warning(f"Error processing preview {i+1}: {e}")
                    continue
            
            logger.error("No valid preview found in CTB file")
            return None
            
        except Exception as e:
            logger.error(f"Error extracting regular CTB thumbnail: {e}")
            return None
    
    def _extract_encrypted_ctb_thumbnail(self, f) -> Optional[bytes]:
        """Extract thumbnail from encrypted CTB file - simplified approach"""
        try:
            logger.debug("Attempting to extract thumbnail from encrypted CTB file")
            
            # For encrypted CTB files, we'll try to find preview data in common locations
            # This is a simplified approach that may work for some files
            
            # Try common preview offsets
            common_offsets = [0x300, 0x400, 0x500, 0x600, 0x700, 0x800, 0x900, 0x1000]
            
            for offset in common_offsets:
                try:
                    f.seek(offset)
                    preview_header = f.read(16)
                    
                    if len(preview_header) == 16:
                        try:
                            preview_values = struct.unpack('<IIII', preview_header)
                            resolution_x, resolution_y, image_offset, image_length = preview_values
                            
                            logger.debug(f"Found potential preview at offset {offset}: {resolution_x}x{resolution_y}, offset={image_offset}, length={image_length}")
                            
                            # Validate dimensions
                            if 1 <= resolution_x <= 1000 and 1 <= resolution_y <= 1000 and image_length > 0:
                                # Try to read the image data
                                f.seek(image_offset)
                                image_data = f.read(image_length)
                                
                                if len(image_data) == image_length:
                                    logger.info(f"Extracted encrypted CTB thumbnail: {image_length} bytes")
                                    
                                    # Convert RGB565 to PNG using the working approach
                                    result = self._convert_rgb565_to_png_enhanced(image_data, resolution_x, resolution_y)
                                    
                                    if result:
                                        logger.info(f"Successfully converted encrypted CTB thumbnail to PNG ({len(result)} bytes)")
                                        return result
                        except Exception as e:
                            logger.debug(f"Error processing preview at offset {offset}: {e}")
                            continue
                            
                except Exception as e:
                    logger.debug(f"Error reading at offset {offset}: {e}")
                    continue
            
            logger.warning("No preview found in encrypted CTB file")
            return None
            
        except Exception as e:
            logger.error(f"Error extracting encrypted CTB thumbnail: {e}")
            return None
    
    def _extract_cbddlp_thumbnail(self, file_path: Path) -> Optional[bytes]:
        """Extract thumbnail from CBDDLP files"""
        try:
            with open(file_path, 'rb') as f:
                # Read CBDDLP header
                header = f.read(8)
                if header != b'CBDDLP\x00':
                    logger.error("Invalid CBDDLP file header")
                    return None
                
                # Skip to thumbnail section
                f.seek(0x60)  # Thumbnail offset
                
                # Read thumbnail size
                thumb_size = struct.unpack('<I', f.read(4))[0]
                if thumb_size == 0:
                    logger.warning("No thumbnail found in CBDDLP file")
                    return None
                
                # Read thumbnail data
                thumbnail_data = f.read(thumb_size)
                
                return self._convert_to_png(thumbnail_data)
                
        except Exception as e:
            logger.error(f"Error extracting CBDDLP thumbnail: {e}")
        return None
    
    def _extract_pwmx_thumbnail(self, file_path: Path) -> Optional[bytes]:
        """Extract thumbnail from PWMX files"""
        try:
            with open(file_path, 'rb') as f:
                # Read PWMX header
                header = f.read(4)
                if header != b'PWMX':
                    logger.error("Invalid PWMX file header")
                    return None
                
                # Skip to thumbnail section
                f.seek(0x40)  # Thumbnail offset
                
                # Read thumbnail size
                thumb_size = struct.unpack('<I', f.read(4))[0]
                if thumb_size == 0:
                    logger.warning("No thumbnail found in PWMX file")
                    return None
                
                # Read thumbnail data
                thumbnail_data = f.read(thumb_size)
                
                return self._convert_to_png(thumbnail_data)
                
        except Exception as e:
            logger.error(f"Error extracting PWMX thumbnail: {e}")
        return None
    
    def _extract_pwmo_thumbnail(self, file_path: Path) -> Optional[bytes]:
        """Extract thumbnail from PWMO files"""
        return self._extract_pwmx_thumbnail(file_path)  # Same format
    
    def _extract_pwms_thumbnail(self, file_path: Path) -> Optional[bytes]:
        """Extract thumbnail from PWMS files"""
        return self._extract_pwmx_thumbnail(file_path)  # Same format
    
    def _extract_pws_thumbnail(self, file_path: Path) -> Optional[bytes]:
        """Extract thumbnail from PWS files"""
        return self._extract_pwmx_thumbnail(file_path)  # Same format
    
    def _extract_pw0_thumbnail(self, file_path: Path) -> Optional[bytes]:
        """Extract thumbnail from PW0 files"""
        return self._extract_pwmx_thumbnail(file_path)  # Same format
    
    def _extract_pwx_thumbnail(self, file_path: Path) -> Optional[bytes]:
        """Extract thumbnail from PWX files"""
        return self._extract_pwmx_thumbnail(file_path)  # Same format
    
    def _convert_to_png(self, image_data: bytes) -> Optional[bytes]:
        """
        Convert image data to PNG format
        
        Args:
            image_data: Raw image data
            
        Returns:
            PNG image data as bytes
        """
        try:
            # Check if it's already a PNG or JPEG
            if image_data.startswith(b'\x89PNG\r\n\x1a\n'):
                # Already PNG, just resize if needed
                image = Image.open(io.BytesIO(image_data))
            elif image_data.startswith(b'\xff\xd8\xff'):
                # JPEG format
                image = Image.open(io.BytesIO(image_data))
            else:
                # Try to open as image and convert to PNG
                image = Image.open(io.BytesIO(image_data))
            
            # Convert to RGB if needed
            if image.mode in ('RGBA', 'LA', 'P'):
                image = image.convert('RGB')
            
            # Resize if image is too large (max 200x200 for thumbnails)
            max_size = (200, 200)
            if image.size[0] > max_size[0] or image.size[1] > max_size[1]:
                image.thumbnail(max_size, Image.Resampling.LANCZOS)
            
            # Save as PNG
            output = io.BytesIO()
            image.save(output, format='PNG', optimize=True)
            return output.getvalue()
            
        except Exception as e:
            logger.error(f"Error converting image to PNG: {e}")
            # Try to create a default thumbnail
            return self._create_default_thumbnail()
    
    def _create_default_thumbnail(self) -> bytes:
        """
        Create a default thumbnail when extraction fails
            
        Returns:
            Default thumbnail as PNG bytes
        """
        try:
            # Create a simple default thumbnail with a 3D printer icon
            image = Image.new('RGB', (200, 200), (60, 60, 60))
            
            # Save as PNG
            output = io.BytesIO()
            image.save(output, format='PNG', optimize=True)
            return output.getvalue()
            
        except Exception as e:
            logger.error(f"Error creating default thumbnail: {e}")
            return None
    
    def generate_thumbnail_for_file(self, file_path: str) -> Optional[str]:
        """
        Generate a thumbnail for a file, even if it doesn't have embedded thumbnails
        
        Args:
            file_path: Path to the file
            
        Returns:
            Path to the generated thumbnail or None if failed
        """
        try:
            file_path = Path(file_path)
            if not file_path.exists():
                logger.error(f"File not found: {file_path}")
                return None
            
            # Generate thumbnail filename
            thumbnail_filename = f"{file_path.stem}_thumb.png"
            thumbnail_path = self.thumbnails_dir / thumbnail_filename
            
            # Check if thumbnail already exists
            if thumbnail_path.exists():
                logger.info(f"Thumbnail already exists: {thumbnail_path}")
                return str(thumbnail_path)
            
            # Try to extract embedded thumbnail first
            thumbnail_path_str = self.extract_thumbnail(str(file_path))
            if thumbnail_path_str:
                return thumbnail_path_str
            
            # If no embedded thumbnail, create a default one
            logger.info(f"Creating default thumbnail for {file_path.name}")
            default_thumbnail = self._create_default_thumbnail()
            
            if default_thumbnail:
                with open(thumbnail_path, 'wb') as f:
                    f.write(default_thumbnail)
                logger.info(f"Default thumbnail created: {thumbnail_path}")
                return str(thumbnail_path)
            else:
                logger.warning(f"Failed to create default thumbnail for {file_path}")
                return None
            
        except Exception as e:
            logger.error(f"Error generating thumbnail for {file_path}: {e}")
            return None
    
    def _convert_rgb565_to_png_enhanced(self, data: bytes, width: int, height: int) -> Optional[bytes]:
        """
        Convert RGB565 data to PNG format using the exact working code approach
        """
        try:
            logger.debug(f"Converting RGB565 data: {len(data)} bytes, {width}x{height}")
            
            if not Image:
                logger.error("PIL not available")
                return None
            
            # Use the exact approach from the working code
            array, i = [], 0
            REPEAT_RGB15_MASK = 1 << 5
            
            while i < len(data) and len(array) < width * height:
                if i + 1 >= len(data):
                    break
                    
                color16 = struct.unpack_from("<H", data, i)[0]
                i += 2
                repeat = 1
                
                if color16 & REPEAT_RGB15_MASK:
                    if i + 1 >= len(data):
                        break
                    repeat += struct.unpack_from("<H", data, i)[0] & 0xFFF
                    i += 2

                # Extract RGB components using the exact working code approach
                r = ((color16 >> 0) & 0x1F) << 3
                g = ((color16 >> 6) & 0x1F) << 3
                b = ((color16 >> 11) & 0x1F) << 3

                for _ in range(min(repeat, width * height - len(array))):
                    array.append((r, g, b))

            # Fill remaining pixels with black
            while len(array) < width * height:
                array.append((0, 0, 0))

            # Create PIL image using the working code approach
            img = Image.new('RGB', (width, height))
            img.putdata(array[:width * height])
            
            # Resize if image is too large (max 200x200 for thumbnails)
            max_size = (200, 200)
            if img.size[0] > max_size[0] or img.size[1] > max_size[1]:
                img.thumbnail(max_size, Image.Resampling.LANCZOS)
            
            # Save as PNG
            output = io.BytesIO()
            img.save(output, format='PNG', optimize=True)
            result = output.getvalue()
            logger.debug(f"Generated PNG thumbnail: {len(result)} bytes")
            return result
                
        except Exception as e:
            logger.error(f"Error converting RGB565 to PNG: {e}")
            return None
    
    def _convert_compressed_rgb565_to_png(self, data: bytes, width: int, height: int) -> Optional[bytes]:
        """
        Convert compressed or alternative format RGB565 data to PNG
        
        Args:
            data: Raw image data (possibly compressed)
            width: Image width
            height: Image height
            
        Returns:
            PNG image data as bytes
        """
        try:
            logger.debug(f"Attempting to convert compressed data: {len(data)} bytes, {width}x{height}")
            
            # Try different approaches for compressed data
            
            # Approach 1: Try to treat as raw RGB565 data (even if incomplete)
            if len(data) >= width * height:
                # Try to create image from available data
                array = []
                for i in range(0, min(len(data), width * height * 2), 2):
                    if i + 1 < len(data):
                        color16 = struct.unpack_from("<H", data, i)[0]
                        # Use the correct RGB565 conversion from UVtools
                        r = ((color16 >> 0) & 0x1F) << 3
                        g = ((color16 >> 5) & 0x3F) << 2  # 6 bits for green
                        b = ((color16 >> 11) & 0x1F) << 3
                        array.append((r, g, b))
                
                # Fill remaining pixels
                while len(array) < width * height:
                    array.append((0, 0, 0))
                
                if not Image:
                    logger.error("PIL not available")
                    return None
                    
                img = Image.new('RGB', (width, height))
                img.putdata(array[:width * height])
                
                # Resize if needed
                max_size = (200, 200)
                if img.size[0] > max_size[0] or img.size[1] > max_size[1]:
                    img.thumbnail(max_size, Image.Resampling.LANCZOS)
                
                output = io.BytesIO()
                img.save(output, format='PNG', optimize=True)
                result = output.getvalue()
                logger.debug(f"Generated PNG from compressed data: {len(result)} bytes")
                return result
            
            # Approach 2: Try to decode as RLE compressed data
            logger.debug("Trying RLE decompression approach")
            try:
                array = []
                i = 0
                while i < len(data) and len(array) < width * height:
                    if i + 1 >= len(data):
                        break
                    
                    # Read color and count
                    color16 = struct.unpack_from("<H", data, i)[0]
                    i += 2
                    
                    # Check if this is a repeat marker
                    if color16 & 0x8000:  # Check for repeat bit
                        if i + 1 < len(data):
                            repeat_count = struct.unpack_from("<H", data, i)[0] & 0x7FFF
                            i += 2
                        else:
                            repeat_count = 1
                    else:
                        repeat_count = 1
                    
                    # Convert RGB565 to RGB888
                    r = ((color16 >> 0) & 0x1F) << 3
                    g = ((color16 >> 5) & 0x3F) << 2  # 6 bits for green
                    b = ((color16 >> 11) & 0x1F) << 3
                    
                    # Add pixels
                    for _ in range(min(repeat_count, width * height - len(array))):
                        array.append((r, g, b))
                
                # Fill remaining pixels
                while len(array) < width * height:
                    array.append((0, 0, 0))
                
                if not Image:
                    logger.error("PIL not available")
                    return None
                    
                img = Image.new('RGB', (width, height))
                img.putdata(array[:width * height])
                
                # Resize if needed
                max_size = (200, 200)
                if img.size[0] > max_size[0] or img.size[1] > max_size[1]:
                    img.thumbnail(max_size, Image.Resampling.LANCZOS)
                
                output = io.BytesIO()
                img.save(output, format='PNG', optimize=True)
                result = output.getvalue()
                logger.debug(f"Generated PNG from RLE data: {len(result)} bytes")
                return result
                
            except Exception as e:
                logger.debug(f"RLE approach failed: {e}")
            
            # Approach 3: Try to create a simple pattern or gradient
            logger.debug("Creating fallback image from compressed data")
            if not Image:
                logger.error("PIL not available")
                return None
                
            # Create a simple gradient or pattern
            img = Image.new('RGB', (width, height), (60, 60, 60))
            
            # Add some pattern based on the data
            if len(data) > 0:
                # Use the first few bytes to create a simple pattern
                for y in range(height):
                    for x in range(width):
                        if len(data) > 0:
                            # Use data to influence the color
                            data_index = (y * width + x) % len(data)
                            color_value = data[data_index] if data_index < len(data) else 0
                            r = (color_value * 2) % 256
                            g = (color_value * 3) % 256
                            b = (color_value * 5) % 256
                            img.putpixel((x, y), (r, g, b))
            
            # Resize if needed
            max_size = (200, 200)
            if img.size[0] > max_size[0] or img.size[1] > max_size[1]:
                img.thumbnail(max_size, Image.Resampling.LANCZOS)
            
            output = io.BytesIO()
            img.save(output, format='PNG', optimize=True)
            result = output.getvalue()
            logger.debug(f"Generated fallback PNG: {len(result)} bytes")
            return result
            
        except Exception as e:
            logger.error(f"Error converting compressed RGB565 to PNG: {e}")
            return None