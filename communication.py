#!/usr/bin/env python3
"""
Serial communication handler for printer communication
"""

import time
import serial
import threading
import logging
import re
from config import SERIAL_PORT, BAUDRATE, SERIAL_TIMEOUT, DEFAULT_FIRMWARE_VERSION

logger = logging.getLogger(__name__)

class SerialCommunicator:
    """
    Handles low-level serial communication with the printer
    """
    
    def __init__(self, port=SERIAL_PORT, baudrate=BAUDRATE, timeout=SERIAL_TIMEOUT):
        self.port = port
        self.baudrate = baudrate
        self.timeout = timeout
        self.connection = None
        self.is_connected = False
        self._communication_lock = threading.Lock()
        
        # Response parsing patterns
        self.regex_float_pattern = r"[-+]?[0-9]*\.?[0-9]+"
        self.regex_int_pattern = r"\d+"
        self.regex_sdPrintingByte = re.compile(r"(?P<current>[0-9]+)/(?P<total>[0-9]+)")
        self.fix_M114 = re.compile(r"C: ")
        
        # Parse patterns for M4000 responses
        self.parse_M4000 = {
            "floatB": re.compile(r"(^|[^A-Za-z])[Bb]:\s*(?P<actual>%s)(\s*\/?\s*(?P<target>%s))?" %
                             (self.regex_float_pattern, self.regex_float_pattern)),
            "floatD": re.compile(r"(^|[^A-Za-z])[Dd]z?\s*(?P<current>%s)(\s*\/?\s*(?P<total>%s))(\s*\/?\s*(?P<pause>%s))?" %
                             (self.regex_float_pattern, self.regex_float_pattern, self.regex_int_pattern)),
            "floatX": re.compile(r"(^|[^A-Za-z])[Xx]:(?P<value>%s)" % self.regex_float_pattern),
            "floatY": re.compile(r"(^|[^A-Za-z])[Yy]:(?P<value>%s)" % self.regex_float_pattern),
            "floatZ": re.compile(r"(^|[^A-Za-z])[Zz]:(?P<value>%s)" % self.regex_float_pattern),
        }
        
        self._logged_replacements = {}
    
    def connect(self):
        """Establish serial connection"""
        try:
            if self.connection and self.connection.is_open:
                self.connection.close()
                
            time.sleep(1)
                
            self.connection = serial.Serial(
                port=self.port,
                baudrate=self.baudrate,
                timeout=self.timeout,
                exclusive=False
            )
            
            # Wait for connection to stabilize
            time.sleep(2)
            
            # Clear any pending data
            self.connection.reset_input_buffer()
            self.connection.reset_output_buffer()
            
            # Test connection with hello command
            response = self.send_command("M4002")
            if response:
                self.is_connected = True
                logger.info("Serial connection established")
                return True
            else:
                logger.error("No response to hello command")
                return False
                
        except Exception as e:
            logger.error(f"Failed to connect: {e}")
            self.is_connected = False
            return False
    
    def disconnect(self):
        """Close serial connection"""
        try:
            if self.connection and self.connection.is_open:
                self.connection.close()
            self.is_connected = False
            logger.info("Serial connection closed")
        except Exception as e:
            logger.error(f"Error disconnecting: {e}")
    
    def send_command(self, command, timeout=None):
        """Send command and return response"""
        if not self.connection or not self.connection.is_open:
            raise Exception("Serial connection not established")
            
        with self._communication_lock:
            try:
                # Clear input buffer
                self.connection.reset_input_buffer()
                
                # Send command
                if not command.endswith('\n'):
                    command += '\n'
                command_bytes = command.encode('latin-1', errors='ignore')
                self.connection.write(command_bytes)
                self.connection.flush()
                
                # Wait for response
                response_timeout = timeout or (self.timeout * 3 if 'M6030' in command or 'M23' in command else self.timeout)
                response = ""
                start_time = time.time()
                
                # For multi-command sequences, wait longer and collect multiple responses
                is_multi_command = '\n' in command
                if is_multi_command:
                    response_timeout *= 2  # Double timeout for multi-commands
                    logger.debug(f"Multi-command detected, extended timeout to {response_timeout}s")
                
                while time.time() - start_time < response_timeout:
                    if self.connection.in_waiting > 0:
                        try:
                            char = self.connection.read(1).decode('latin-1', errors='ignore')
                            response += char
                            # For multi-commands, look for multiple 'ok' responses
                            if is_multi_command and response.count('ok') >= command.count('\n') + 1:
                                break
                            # For single commands, break on newline
                            elif not is_multi_command and (response.endswith('\n') or response.endswith('\r\n')):
                                break
                        except UnicodeDecodeError:
                            continue
                    else:
                        time.sleep(0.01)
                
                # Process response
                response = self._process_response(response.strip(), command.strip())
                logger.debug(f"Command: {command.strip()} -> Response: {response}")
                return response
                
            except Exception as e:
                logger.error(f"Communication error for command {command.strip()}: {e}")
                raise
    
    def _process_response(self, response, original_command):
        """Process and clean up printer responses"""
        if not response:
            return response
        
        # Filter out non-printable characters
        try:
            filtered_response = ''.join(char for char in response if ord(char) >= 32 or char in '\r\n\t')
            if filtered_response != response:
                logger.debug(f"Filtered binary data from response")
                response = filtered_response
        except:
            pass
        
        # For multi-command sequences, ensure we have proper response handling
        if '\n' in original_command:
            # Count expected 'ok' responses (one per command line)
            expected_oks = original_command.count('\n') + 1
            actual_oks = response.lower().count('ok')
            
            if actual_oks < expected_oks:
                logger.debug(f"Multi-command response: expected {expected_oks} 'ok's, got {actual_oks}")
                # This is normal for some firmware - don't treat as error
            
        # Fix common firmware response issues
        if response == "wait" or response.startswith("wait"):
            self._log_replacement("wait", response, "echo:busy processing")
            return "echo:busy processing"
        
        if "CBD make it" in response:
            fixed = response.replace("CBD make it", f"FIRMWARE_NAME:CBD made it PROTOCOL_VERSION:{DEFAULT_FIRMWARE_VERSION}")
            self._log_replacement("identifier", response, fixed)
            return fixed
        elif "ZWLF make it" in response:
            fixed = response.replace("ZWLF make it", f"FIRMWARE_NAME:ZWLF made it PROTOCOL_VERSION:{DEFAULT_FIRMWARE_VERSION}")
            self._log_replacement("identifier", response, fixed)
            return fixed
            
        # Fix M114 response format
        if "C: X:" in response:
            fixed = self.fix_M114.sub("", response)
            self._log_replacement("M114", response, fixed)
            return fixed
            
        # Handle start command response
        if response.startswith('ok V'):
            fixed = 'ok start' + response
            self._log_replacement("start", response, fixed)
            return fixed
            
        return response
    
    def _log_replacement(self, replacement_type, original, replacement):
        """Log response replacements once per type"""
        if replacement_type not in self._logged_replacements:
            logger.info(f"Replacing {replacement_type}: '{original}' -> '{replacement}'")
            self._logged_replacements[replacement_type] = True
        else:
            logger.debug(f"Replacing {replacement_type}: '{original}' -> '{replacement}'")
