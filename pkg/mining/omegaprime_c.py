"""ctypes wrapper for the Omega' D18 C port (Annunaki SHA-NI powerhouse).

The Python kernel (pkg/mining/tetrapow_dice_universal.py) remains the
consensus oracle; this module is a speed layer only. Byte-identity is
enforced by test_omegaprime_c.py.
"""
import ctypes
import os

_HERE = os.path.dirname(os.path.abspath(__file__))
_SO = os.path.join(_HERE, "omegaprime_d18.so")

_lib = ctypes.CDLL(_SO)
_lib.omegaprime_hash.argtypes = [ctypes.c_char_p, ctypes.c_uint64,
                                 ctypes.c_char * 32]
_lib.omegaprime_hash.restype = None
_lib.omegaprime_grind.argtypes = [ctypes.c_char_p, ctypes.c_uint64,
                                  ctypes.c_uint64, ctypes.c_int,
                                  ctypes.POINTER(ctypes.c_uint64),
                                  ctypes.c_char * 32]
_lib.omegaprime_grind.restype = ctypes.c_int


def hash_one(daxiom: str, nonce: int) -> bytes:
    """Omega' D18 hash of one (daxiom, nonce) pair (32 bytes)."""
    out = (ctypes.c_char * 32)()
    _lib.omegaprime_hash(daxiom.encode(), ctypes.c_uint64(nonce), out)
    return bytes(out)


def grind(daxiom: str, start: int, count: int, difficulty: int):
    """Grind [start, start+count); returns (nonce, hash32) or None."""
    fn = ctypes.c_uint64(0)
    fh = (ctypes.c_char * 32)()
    hit = _lib.omegaprime_grind(daxiom.encode(), ctypes.c_uint64(start),
                                ctypes.c_uint64(count), int(difficulty),
                                ctypes.byref(fn), fh)
    return (fn.value, bytes(fh)) if hit else None
