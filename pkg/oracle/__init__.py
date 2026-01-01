"""
Excalibur $EXS Protocol - Oracle Package
-----------------------------------------
Blockchain LLM and Oracle Operator for Protocol Intelligence

This package provides on-chain intelligence through:
- BlockchainLLM: Arthurian knowledge base and protocol understanding
- ExcaliburOracle: Intelligent forge validation and prophecy interpretation

Author: Travis D. Jones <holedozer@gmail.com>
License: BSD 3-Clause
"""

from .blockchain_llm import BlockchainLLM, EXCALIBUR_TRUTH
from .oracle_operator import ExcaliburOracle

__all__ = [
    'BlockchainLLM',
    'ExcaliburOracle',
    'EXCALIBUR_TRUTH'
]

__version__ = '1.0.0'
