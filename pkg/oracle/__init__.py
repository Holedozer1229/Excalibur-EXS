"""
Excalibur $EXS Protocol - Oracle Package
-----------------------------------------
Blockchain LLM and Oracle Operator for Protocol Intelligence

This package provides on-chain intelligence through:
- BlockchainLLM: Arthurian knowledge base and protocol understanding
- ExcaliburOracle: Intelligent forge validation and prophecy interpretation
- DivinationEngine: Context-aware divination and quest management
- GrailEnergyManager: Grail state and energy tracking
- BlockchainMonitor: Block monitoring and inscription detection

Author: Travis D. Jones <holedozer@icloud.com>
License: BSD 3-Clause
"""

from .blockchain_llm import BlockchainLLM, EXCALIBUR_TRUTH
from .oracle_operator import ExcaliburOracle
from .oracle_logic import DivinationEngine, OracleContext
from .grail_state import GrailEnergyManager, GrailState
from .blockchain_monitor import BlockchainMonitor, BlockInfo

__all__ = [
    'BlockchainLLM',
    'ExcaliburOracle',
    'DivinationEngine',
    'OracleContext',
    'GrailEnergyManager',
    'GrailState',
    'BlockchainMonitor',
    'BlockInfo',
    'EXCALIBUR_TRUTH'
]

__version__ = '1.0.0'
