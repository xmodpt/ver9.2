#!/usr/bin/env python3
"""
Printer state management classes and enums
"""

from enum import Enum
from dataclasses import dataclass
from typing import Optional

class PrinterState(Enum):
    IDLE = "IDLE"
    PRINTING = "PRINTING"
    PAUSED = "PAUSED" 
    FINISHED = "FINISHED"
    ERROR = "ERROR"
    UNKNOWN = "UNKNOWN"

@dataclass
class PrintStatus:
    state: PrinterState = PrinterState.IDLE
    progress_percent: float = 0.0
    current_layer: int = 0
    total_layers: int = 0
    current_byte: int = 0
    total_bytes: int = 0

def serialize_print_status(status):
    """Convert PrintStatus object to JSON serializable dict"""
    if status is None:
        return {
            'state': 'UNKNOWN', 
            'progress_percent': 0, 
            'current_layer': 0, 
            'total_layers': 0,
            'current_byte': 0,
            'total_bytes': 0
        }
    
    return {
        'state': status.state.value,
        'progress_percent': status.progress_percent,
        'current_layer': status.current_layer,
        'total_layers': status.total_layers,
        'current_byte': status.current_byte,
        'total_bytes': status.total_bytes
    }
