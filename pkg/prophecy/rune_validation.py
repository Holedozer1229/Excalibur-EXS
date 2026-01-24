#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Excalibur Rune Validation Module
---------------------------------
Validates prophecy runes and cryptographic proofs.

Author: Travis D. Jones <holedozer@icloud.com>
License: BSD 3-Clause
"""

import hashlib
import hmac
from typing import Dict, List, Optional, Tuple
from datetime import datetime, timezone


class RuneValidator:
    """
    Validates prophecy runes using cryptographic methods.
    
    Runes are cryptographic signatures that prove the validity of a prophecy.
    Each rune is derived from the 13-word axiom and validated against
    zero-torsion proofs.
    """
    
    # Canonical 13-word axiom
    CANONICAL_AXIOM = "sword legend pull magic kingdom artist stone destroy forget fire steel honey question"
    
    # Rune alphabet for ancient encoding
    RUNE_ALPHABET = "ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ"
    
    def __init__(self, difficulty: int = 4):
        """
        Initialize the rune validator.
        
        Args:
            difficulty: Number of leading zero bytes required (default: 4)
        """
        self.difficulty = difficulty
        self.validated_runes = []
        
    def validate_axiom(self, axiom: str) -> Dict:
        """
        Validate that an axiom matches the canonical form.
        
        Args:
            axiom: The axiom string to validate
            
        Returns:
            Validation result dictionary
        """
        words = axiom.strip().lower().split()
        canonical_words = self.CANONICAL_AXIOM.split()
        
        is_valid = (
            len(words) == 13 and
            words == canonical_words
        )
        
        return {
            "valid": is_valid,
            "word_count": len(words),
            "expected_count": 13,
            "axiom_hash": hashlib.sha256(axiom.encode()).hexdigest() if is_valid else None,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    
    def compute_rune_signature(self, axiom: str, nonce: int, salt: str = "") -> str:
        """
        Compute a cryptographic rune signature.
        
        Args:
            axiom: The prophecy axiom
            nonce: Proof-of-work nonce
            salt: Optional salt for additional entropy
            
        Returns:
            Hex-encoded rune signature
        """
        message = f"{axiom}:{nonce}:{salt}".encode()
        return hashlib.sha256(message).hexdigest()
    
    def validate_rune_proof(self, axiom: str, nonce: int, hash_result: str) -> Dict:
        """
        Validate a rune proof-of-work submission.
        
        Args:
            axiom: The prophecy axiom
            nonce: Claimed nonce value
            hash_result: Resulting hash to verify
            
        Returns:
            Detailed validation result
        """
        # Validate axiom first
        axiom_check = self.validate_axiom(axiom)
        if not axiom_check["valid"]:
            return {
                "verdict": "INVALID_AXIOM",
                "valid": False,
                "reason": "Axiom does not match canonical form",
                "axiom_check": axiom_check,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        
        # Compute expected hash
        expected_hash = self.compute_rune_signature(axiom, nonce)
        
        # Check if hash matches
        if expected_hash != hash_result:
            return {
                "verdict": "HASH_MISMATCH",
                "valid": False,
                "reason": "Hash does not match expected value",
                "expected": expected_hash,
                "received": hash_result,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        
        # Check difficulty (leading zero bytes)
        leading_zeros = self._count_leading_zero_bytes(hash_result)
        meets_difficulty = leading_zeros >= self.difficulty
        
        result = {
            "verdict": "VALID" if meets_difficulty else "INSUFFICIENT_DIFFICULTY",
            "valid": meets_difficulty,
            "nonce": nonce,
            "hash": hash_result,
            "difficulty": {
                "required": self.difficulty,
                "achieved": leading_zeros,
                "meets_requirement": meets_difficulty
            },
            "rune_signature": self._encode_rune(hash_result[:8]),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        if meets_difficulty:
            self.validated_runes.append({
                "nonce": nonce,
                "hash": hash_result,
                "rune": result["rune_signature"],
                "timestamp": result["timestamp"]
            })
        
        return result
    
    def _count_leading_zero_bytes(self, hex_string: str) -> int:
        """Count leading zero bytes in hex string (2 chars per byte)."""
        count = 0
        for i in range(0, len(hex_string), 2):
            if hex_string[i:i+2] == '00':
                count += 1
            else:
                break
        return count
    
    def _encode_rune(self, hex_fragment: str) -> str:
        """
        Encode a hex fragment into ancient runic script.
        
        Args:
            hex_fragment: Hex string to encode
            
        Returns:
            Runic encoding
        """
        runes = []
        for char in hex_fragment:
            if char in '0123456789abcdef':
                idx = int(char, 16)
                if idx < len(self.RUNE_ALPHABET):
                    runes.append(self.RUNE_ALPHABET[idx])
        return ''.join(runes)
    
    def verify_zero_torsion(self, hash_result: str, threshold: float = 0.01) -> Dict:
        """
        Verify zero-torsion property of the hash (cryptographic uniformity).
        
        Zero-torsion means the hash exhibits high entropy and uniform distribution.
        
        Args:
            hash_result: Hash to analyze
            threshold: Maximum deviation from perfect uniformity
            
        Returns:
            Zero-torsion verification result
        """
        # Convert hex to bytes
        try:
            hash_bytes = bytes.fromhex(hash_result)
        except ValueError:
            return {
                "valid": False,
                "reason": "Invalid hex string",
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        
        # Calculate entropy
        byte_counts = [0] * 256
        for byte in hash_bytes:
            byte_counts[byte] += 1
        
        total = len(hash_bytes)
        expected_freq = 1.0 / 256
        
        # Calculate chi-square statistic for uniformity
        chi_square = 0
        for count in byte_counts:
            observed_freq = count / total
            chi_square += (observed_freq - expected_freq) ** 2 / expected_freq
        
        # Normalize by total bytes
        torsion = chi_square / total
        is_zero_torsion = torsion < threshold
        
        return {
            "valid": is_zero_torsion,
            "torsion_metric": torsion,
            "threshold": threshold,
            "entropy_quality": "HIGH" if is_zero_torsion else "LOW",
            "meets_zero_torsion": is_zero_torsion,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    
    def batch_validate_runes(self, proofs: List[Dict]) -> Dict:
        """
        Validate multiple rune proofs in batch.
        
        Args:
            proofs: List of proof dictionaries with 'axiom', 'nonce', 'hash'
            
        Returns:
            Batch validation results
        """
        results = {
            "total": len(proofs),
            "valid": 0,
            "invalid": 0,
            "proofs": []
        }
        
        for proof in proofs:
            result = self.validate_rune_proof(
                proof.get("axiom", ""),
                proof.get("nonce", 0),
                proof.get("hash", "")
            )
            results["proofs"].append(result)
            if result["valid"]:
                results["valid"] += 1
            else:
                results["invalid"] += 1
        
        results["timestamp"] = datetime.now(timezone.utc).isoformat()
        return results
    
    def get_validated_runes(self, limit: int = 10) -> List[Dict]:
        """
        Get recently validated runes.
        
        Args:
            limit: Maximum number of runes to return
            
        Returns:
            List of validated runes
        """
        return self.validated_runes[-limit:]
    
    def compute_merkle_root(self, runes: List[str]) -> str:
        """
        Compute Merkle root of validated runes.
        
        Args:
            runes: List of rune hashes
            
        Returns:
            Merkle root hash
        """
        if not runes:
            return hashlib.sha256(b"").hexdigest()
        
        # Build Merkle tree
        current_level = [hashlib.sha256(r.encode()).digest() for r in runes]
        
        while len(current_level) > 1:
            next_level = []
            for i in range(0, len(current_level), 2):
                if i + 1 < len(current_level):
                    combined = current_level[i] + current_level[i + 1]
                else:
                    combined = current_level[i] + current_level[i]
                next_level.append(hashlib.sha256(combined).digest())
            current_level = next_level
        
        return current_level[0].hex()


def main():
    """Demonstrate rune validation functionality."""
    print("⚔️ Excalibur Rune Validation System")
    print("=" * 60)
    print()
    
    validator = RuneValidator(difficulty=4)
    
    # Test axiom validation
    print("📜 Testing Axiom Validation:")
    axiom = validator.CANONICAL_AXIOM
    result = validator.validate_axiom(axiom)
    print(f"  Valid: {result['valid']}")
    print(f"  Word Count: {result['word_count']}/13")
    print()
    
    # Test rune signature computation
    print("🔮 Computing Rune Signature:")
    nonce = 12345
    signature = validator.compute_rune_signature(axiom, nonce)
    print(f"  Nonce: {nonce}")
    print(f"  Signature: {signature[:16]}...")
    print()
    
    # Test proof validation
    print("✨ Validating Rune Proof:")
    proof = validator.validate_rune_proof(axiom, nonce, signature)
    print(f"  Verdict: {proof['verdict']}")
    print(f"  Difficulty: {proof['difficulty']['achieved']}/{proof['difficulty']['required']}")
    if 'rune_signature' in proof:
        print(f"  Rune: {proof['rune_signature']}")
    print()
    
    # Test zero-torsion
    print("🌀 Zero-Torsion Verification:")
    torsion = validator.verify_zero_torsion(signature)
    print(f"  Valid: {torsion['valid']}")
    print(f"  Entropy Quality: {torsion['entropy_quality']}")
    print()
    
    print("✅ Rune validation system operational")


if __name__ == "__main__":
    main()
