"""
Emporium of Man - Sovereign Vault and Grail Management System

This package implements the Emporium of Man functionality for Merlin's Portal,
including Sovereign Vault management, blockchain monitoring, and prophecy inscription mechanics.

Author: Travis D. Jones <holedozer@gmail.com>
License: BSD 3-Clause
Copyright (c) 2025, Travis D. Jones
"""

from .blockchain_monitor import BlockchainMonitor
from .grail_logic import GrailLogic, SovereignVault
from .emporium_endpoints import EmporiumAPI

__all__ = [
    'BlockchainMonitor',
    'GrailLogic',
    'SovereignVault',
    'EmporiumAPI',
]

__version__ = '1.0.0'
