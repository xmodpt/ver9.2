#!/usr/bin/env python3
"""
Main printer controller class
"""

import time
import threading
import logging
from printer_state import PrinterState, PrintStatus
from communication import SerialCommunicator
from config import DEFAULT_FIRMWARE_VERSION, MONITORING_INTERVAL

logger = logging.getLogger(__name__)

class PrinterController:
    """
    Main printer controller that handles all printer operations
    """
    
    def __init__(self):
        self.communicator = SerialCommunicator()
        self.firmware_version = DEFAULT_FIRMWARE_VERSION
        self.print_status = PrintStatus()
        self.selected_file = ""
        self.z_position = 0.0
        
        # Monitoring thread
        self._monitoring_thread = None
        self._stop_monitoring = False
        
    @property
    def is_connected(self):
        return self.communicator.is_connected
    
    def connect(self):
        """Connect to printer"""
        try:
            if not self.communicator.connect():
                return False
            
            # Initialize SD card
            try:
                self.communicator.send_command("M21")
                time.sleep(1)
            except Exception as e:
                logger.debug(f"SD initialization warning: {e}")
            
            # Get firmware version
            try:
                version_response = self.communicator.send_command("M115")
                if version_response and "FIRMWARE_NAME:" in version_response:
                    if "PROTOCOL_VERSION:" in version_response:
                        parts = version_response.split("PROTOCOL_VERSION:")
                        if len(parts) > 1:
                            self.firmware_version = parts[1].strip().split()[0]
            except Exception as e:
                logger.debug(f"Could not get firmware version: {e}")
            
            # Start monitoring
            self._start_monitoring()
                
            logger.info(f"Connected to printer, firmware: {self.firmware_version}")
            return True
                
        except Exception as e:
            logger.error(f"Failed to connect to printer: {e}")
            return False
    
    def disconnect(self):
        """Disconnect from printer"""
        try:
            self._stop_monitoring = True
            if self._monitoring_thread and self._monitoring_thread.is_alive():
                self._monitoring_thread.join(timeout=5)
                
            self.communicator.disconnect()
            logger.info("Disconnected from printer")
        except Exception as e:
            logger.error(f"Error disconnecting: {e}")
    
    def _start_monitoring(self):
        """Start monitoring thread"""
        if self._monitoring_thread and self._monitoring_thread.is_alive():
            return
            
        self._stop_monitoring = False
        self._monitoring_thread = threading.Thread(target=self._monitoring_loop, daemon=True)
        self._monitoring_thread.start()
        logger.info("Started printer monitoring thread")
    
    def _monitoring_loop(self):
        """Monitor printer status"""
        while not self._stop_monitoring and self.is_connected:
            try:
                if self.print_status.state == PrinterState.PRINTING:
                    self.get_print_status()
                    
                time.sleep(MONITORING_INTERVAL)
                
            except Exception as e:
                logger.debug(f"Monitoring loop error: {e}")
                time.sleep(5)
    
    def get_firmware_version(self):
        """Get firmware version"""
        if not self.is_connected:
            raise Exception("Printer not connected")
        return self.firmware_version
    
    def get_print_status(self):
        """Get current print status"""
        if not self.is_connected:
            return PrintStatus(state=PrinterState.UNKNOWN)
            
        try:
            response = self.communicator.send_command("M27")
            if response:
                if "SD printing byte" in response:
                    match = self.communicator.regex_sdPrintingByte.search(response)
                    if match:
                        current = int(match.group("current"))
                        total = int(match.group("total"))
                        
                        self.print_status.current_byte = current
                        self.print_status.total_bytes = total
                        
                        if total > 0:
                            self.print_status.progress_percent = (current / total) * 100
                            
                            if current >= total:
                                self.print_status.state = PrinterState.FINISHED
                            elif current > 0:
                                self.print_status.state = PrinterState.PRINTING
                            else:
                                self.print_status.state = PrinterState.IDLE
                        else:
                            self.print_status.state = PrinterState.IDLE
                            
                elif "Not SD printing" in response:
                    self.print_status.state = PrinterState.IDLE
                    self.print_status.progress_percent = 0
                    self.print_status.current_byte = 0
                    
            return self.print_status
            
        except Exception as e:
            logger.error(f"Error getting print status: {e}")
            return PrintStatus(state=PrinterState.ERROR)
    
    def get_selected_file(self):
        """Get currently selected file"""
        return self.selected_file
    
    def get_z_position(self):
        """Get current Z position"""
        try:
            response = self.communicator.send_command("M114")
            if response and "Z:" in response:
                match = self.communicator.parse_M4000["floatZ"].search(response)
                if match:
                    self.z_position = float(match.group('value'))
            return self.z_position
        except Exception as e:
            logger.debug(f"Error getting Z position: {e}")
            return self.z_position
    
    def select_file(self, filename):
        """Select file for printing"""
        try:
            logger.info(f"select_file called with filename: {filename}")
            
            # Initialize SD card first
            logger.info("Initializing SD card with M21")
            self.communicator.send_command("M21")
            time.sleep(1)
            
            # Select the file
            logger.info(f"Selecting file with M23: {filename}")
            response = self.communicator.send_command(f"M23 {filename}", timeout=10)
            logger.info(f"M23 response: {response}")
            
            if response and ("ok" in response.lower() or "file opened" in response.lower()):
                self.selected_file = filename
                logger.info(f"File selected successfully: {filename}")
                return True
            else:
                logger.warning(f"File selection failed: {response}")
                return False
        except Exception as e:
            logger.error(f"Error selecting file {filename}: {e}")
            return False
    
    def start_printing(self, filename=None):
        """Start printing selected file"""
        try:
            logger.info(f"start_printing called with filename: {filename}")
            logger.info(f"Current selected_file: {self.selected_file}")
            
            if filename:
                logger.info(f"Attempting to select file: {filename}")
                if not self.select_file(filename):
                    logger.error(f"Failed to select file: {filename}")
                    return False
                logger.info(f"File selection successful: {filename}")
                    
            if not self.selected_file:
                logger.error("No file selected for printing")
                logger.error(f"filename parameter: {filename}")
                logger.error(f"self.selected_file: {self.selected_file}")
                return False
                
            logger.info(f"Starting print: {self.selected_file}")
            response = self.communicator.send_command(f"M6030 '{self.selected_file}'", timeout=15)
            
            if response and "ok" in response.lower():
                self.print_status.state = PrinterState.PRINTING
                logger.info(f"Started printing: {self.selected_file}")
                return True
            else:
                logger.warning(f"Print start failed: {response}")
                return False
            
        except Exception as e:
            logger.error(f"Error starting print: {e}")
            return False
    
    def pause_printing(self):
        """Pause current print"""
        try:
            response = self.communicator.send_command("M25")
            if response and "ok" in response.lower():
                self.print_status.state = PrinterState.PAUSED
                logger.info("Print paused")
                return True
            return False
        except Exception as e:
            logger.error(f"Error pausing print: {e}")
            return False
    
    def resume_printing(self):
        """Resume paused print"""
        try:
            response = self.communicator.send_command("M24")
            if response and "ok" in response.lower():
                self.print_status.state = PrinterState.PRINTING
                logger.info("Print resumed")
                return True
            return False
        except Exception as e:
            logger.error(f"Error resuming print: {e}")
            return False
    
    def stop_printing(self):
        """Stop current print"""
        try:
            response = self.communicator.send_command("M33")
            if response and "ok" in response.lower():
                self.print_status.state = PrinterState.IDLE
                self.print_status.progress_percent = 0
                self.print_status.current_byte = 0
                self.selected_file = ""
                logger.info("Print stopped")
                return True
            return False
        except Exception as e:
            logger.error(f"Error stopping print: {e}")
            return False
    
    def move_to_home(self):
        """Home Z axis"""
        try:
            response = self.communicator.send_command("G28 Z0")
            return response and "ok" in response.lower()
        except Exception as e:
            logger.error(f"Error homing Z: {e}")
            return False
    
    def move_by(self, distance):
        """Move Z axis by relative distance"""
        try:
            response = self.communicator.send_command(f"G91\nG1 Z{distance} F600\nG90")
            return response and "ok" in response.lower()
        except Exception as e:
            logger.error(f"Error moving Z by {distance}: {e}")
            return False
    
    def reboot(self):
        """Reboot printer"""
        try:
            self.communicator.send_command("M999")
            return True  # Don't wait for response as printer reboots
        except Exception as e:
            logger.error(f"Error rebooting printer: {e}")
            return False
