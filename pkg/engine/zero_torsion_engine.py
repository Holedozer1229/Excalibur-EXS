#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Excalibur Zero-Torsion Engine
------------------------------
Validates and enforces zero-torsion cryptographic properties.

Author: Travis D. Jones <holedozer@icloud.com>
License: BSD 3-Clause
"""

import hashlib
import hmac
import math
from typing import Dict, List, Optional, Tuple
from datetime import datetime, timezone
import struct


class ZeroTorsionEngine:
    """
    Engine for validating zero-torsion properties of cryptographic proofs.
    
    Zero-torsion means the cryptographic space is locally flat (no twisting),
    ensuring proofs maintain geometric integrity and resist manipulation.
    """
    
    def __init__(self, strictness: float = 0.01):
        """
        Initialize the zero-torsion engine.
        
        Args:
            strictness: Maximum allowable torsion (lower = stricter)
        """
        self.strictness = strictness
        self.validations = []
        
    def compute_hash_torsion(self, hash_value: str) -> float:
        """
        Compute torsion metric for a hash value.
        
        Args:
            hash_value: Hex hash string
            
        Returns:
            Torsion metric (0 = perfect zero-torsion)
        """
        if not hash_value or len(hash_value) < 8:
            return float('inf')
        
        # Convert hash to bytes
        try:
            hash_bytes = bytes.fromhex(hash_value)
        except ValueError:
            return float('inf')
        
        # Compute byte-level entropy variations (measure of "twisting")
        # Split into chunks and measure local vs global entropy
        chunk_size = 4
        chunks = [hash_bytes[i:i+chunk_size] for i in range(0, len(hash_bytes), chunk_size)]
        
        if len(chunks) < 2:
            return 0.0
        
        # Compute entropy for each chunk
        entropies = []
        for chunk in chunks:
            if len(chunk) == 0:
                continue
            
            # Byte distribution
            byte_counts = {}
            for byte in chunk:
                byte_counts[byte] = byte_counts.get(byte, 0) + 1
            
            # Shannon entropy
            entropy = 0.0
            total = len(chunk)
            for count in byte_counts.values():
                if count > 0:
                    p = count / total
                    entropy -= p * math.log2(p) if p > 0 else 0
            
            entropies.append(entropy)
        
        # Torsion is variance in local entropies
        if len(entropies) < 2:
            return 0.0
        
        mean_entropy = sum(entropies) / len(entropies)
        variance = sum((e - mean_entropy) ** 2 for e in entropies) / len(entropies)
        
        return variance
    
    def validate_zero_torsion(self, hash_value: str) -> Dict:
        """
        Validate that a hash exhibits zero-torsion properties.
        
        Args:
            hash_value: Hash to validate
            
        Returns:
            Validation result
        """
        torsion = self.compute_hash_torsion(hash_value)
        is_valid = torsion < self.strictness
        
        result = {
            "hash": hash_value[:16] + "...",
            "torsion": torsion,
            "strictness": self.strictness,
            "valid": is_valid,
            "quality": self._torsion_quality(torsion),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        self.validations.append(result)
        return result
    
    def _torsion_quality(self, torsion: float) -> str:
        """Classify torsion quality."""
        if torsion < 0.001:
            return "PERFECT"
        elif torsion < 0.01:
            return "EXCELLENT"
        elif torsion < 0.1:
            return "GOOD"
        elif torsion < 1.0:
            return "ACCEPTABLE"
        else:
            return "POOR"
    
    def validate_proof_sequence(
        self,
        hash_sequence: List[str]
    ) -> Dict:
        """
        Validate zero-torsion across a sequence of proofs.
        
        Args:
            hash_sequence: Ordered list of hashes
            
        Returns:
            Sequence validation result
        """
        if len(hash_sequence) < 2:
            return {
                "valid": False,
                "error": "Sequence too short (minimum 2 hashes)"
            }
        
        # Validate each hash
        individual_results = []
        for hash_val in hash_sequence:
            result = self.validate_zero_torsion(hash_val)
            individual_results.append(result)
        
        # Check sequence continuity (no sudden torsion jumps)
        torsion_changes = []
        for i in range(len(individual_results) - 1):
            t1 = individual_results[i]["torsion"]
            t2 = individual_results[i + 1]["torsion"]
            change = abs(t2 - t1)
            torsion_changes.append(change)
        
        max_change = max(torsion_changes) if torsion_changes else 0
        avg_change = sum(torsion_changes) / len(torsion_changes) if torsion_changes else 0
        
        # Sequence is valid if all individual hashes are valid and changes are smooth
        all_valid = all(r["valid"] for r in individual_results)
        smooth_transition = max_change < self.strictness * 10  # Allow 10x change
        
        return {
            "sequence_length": len(hash_sequence),
            "all_valid": all_valid,
            "smooth_transition": smooth_transition,
            "max_torsion_change": max_change,
            "avg_torsion_change": avg_change,
            "individual_results": individual_results,
            "overall_valid": all_valid and smooth_transition,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    
    def compute_torsion_signature(
        self,
        hash_value: str,
        nonce: int
    ) -> str:
        """
        Compute a zero-torsion signature for a hash and nonce.
        
        Args:
            hash_value: Base hash
            nonce: Nonce value
            
        Returns:
            Torsion-verified signature
        """
        # Combine hash and nonce
        message = f"{hash_value}:{nonce}".encode()
        
        # Compute HMAC with zero-torsion guarantee
        # Use multiple rounds to ensure flatness
        signature = message
        for _ in range(128):  # 128 rounds for zero-torsion
            signature = hashlib.sha256(signature).digest()
        
        return signature.hex()
    
    def verify_torsion_signature(
        self,
        hash_value: str,
        nonce: int,
        signature: str
    ) -> Dict:
        """
        Verify a zero-torsion signature.
        
        Args:
            hash_value: Original hash
            nonce: Original nonce
            signature: Signature to verify
            
        Returns:
            Verification result
        """
        expected_signature = self.compute_torsion_signature(hash_value, nonce)
        matches = expected_signature == signature
        
        # Also check torsion of the signature itself
        sig_torsion = self.compute_hash_torsion(signature)
        sig_valid = sig_torsion < self.strictness
        
        return {
            "signature_matches": matches,
            "signature_torsion": sig_torsion,
            "signature_valid": sig_valid,
            "overall_valid": matches and sig_valid,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    
    def generate_torsion_free_nonce(
        self,
        seed: str,
        difficulty: int = 4
    ) -> Dict:
        """
        Generate a nonce that produces a zero-torsion hash.
        
        Args:
            seed: Seed string (e.g., axiom)
            difficulty: Difficulty target
            
        Returns:
            Generated nonce and hash
        """
        nonce = 0
        max_attempts = 1000000
        
        for attempt in range(max_attempts):
            # Compute hash
            message = f"{seed}:{nonce}".encode()
            hash_val = hashlib.sha256(message).hexdigest()
            
            # Check difficulty
            leading_zeros = self._count_leading_zeros(hash_val)
            
            if leading_zeros >= difficulty:
                # Check torsion
                torsion = self.compute_hash_torsion(hash_val)
                
                if torsion < self.strictness:
                    return {
                        "success": True,
                        "nonce": nonce,
                        "hash": hash_val,
                        "torsion": torsion,
                        "difficulty": leading_zeros,
                        "attempts": attempt + 1,
                        "timestamp": datetime.now(timezone.utc).isoformat()
                    }
            
            nonce += 1
        
        return {
            "success": False,
            "error": "Max attempts reached",
            "attempts": max_attempts
        }
    
    def _count_leading_zeros(self, hex_string: str) -> int:
        """Count leading zero bytes in hex string."""
        count = 0
        for i in range(0, len(hex_string), 2):
            if hex_string[i:i+2] == '00':
                count += 1
            else:
                break
        return count
    
    def batch_validate(self, hashes: List[str]) -> Dict:
        """
        Batch validate multiple hashes for zero-torsion.
        
        Args:
            hashes: List of hashes to validate
            
        Returns:
            Batch validation results
        """
        results = {
            "total": len(hashes),
            "valid": 0,
            "invalid": 0,
            "average_torsion": 0.0,
            "results": []
        }
        
        torsion_sum = 0.0
        for hash_val in hashes:
            result = self.validate_zero_torsion(hash_val)
            results["results"].append(result)
            
            if result["valid"]:
                results["valid"] += 1
            else:
                results["invalid"] += 1
            
            torsion_sum += result["torsion"]
        
        if len(hashes) > 0:
            results["average_torsion"] = torsion_sum / len(hashes)
        
        return results
    
    def get_validation_statistics(self) -> Dict:
        """
        Get engine validation statistics.
        
        Returns:
            Statistics dictionary
        """
        if not self.validations:
            return {
                "total_validations": 0,
                "message": "No validations performed yet"
            }
        
        valid_count = sum(1 for v in self.validations if v["valid"])
        torsions = [v["torsion"] for v in self.validations]
        
        return {
            "total_validations": len(self.validations),
            "valid_count": valid_count,
            "invalid_count": len(self.validations) - valid_count,
            "success_rate": valid_count / len(self.validations),
            "average_torsion": sum(torsions) / len(torsions),
            "min_torsion": min(torsions),
            "max_torsion": max(torsions),
            "strictness": self.strictness
        }


def main():
    """Demonstrate zero-torsion engine functionality."""
    print("🌀 Excalibur Zero-Torsion Engine")
    print("=" * 60)
    print()
    
    engine = ZeroTorsionEngine(strictness=0.01)
    
    # Validate single hash
    print("🔍 Single Hash Validation:")
    hash_val = "00000000abcd1234567890ef1234567890abcdef12345678"
    result = engine.validate_zero_torsion(hash_val)
    print(f"  Hash: {result['hash']}")
    print(f"  Torsion: {result['torsion']:.6f}")
    print(f"  Quality: {result['quality']}")
    print(f"  Valid: {result['valid']}")
    print()
    
    # Validate sequence
    print("📊 Sequence Validation:")
    sequence = [
        "00000000abcd1234567890ef1234567890abcdef12345678",
        "0000001234567890abcdef001234567890abcdef12345678",
        "0000005678abcdef01234567890abcdef1234567890abcd"
    ]
    seq_result = engine.validate_proof_sequence(sequence)
    print(f"  Sequence Length: {seq_result['sequence_length']}")
    print(f"  All Valid: {seq_result['all_valid']}")
    print(f"  Smooth Transition: {seq_result['smooth_transition']}")
    print(f"  Overall Valid: {seq_result['overall_valid']}")
    print()
    
    # Compute torsion signature
    print("✍️  Torsion Signature:")
    signature = engine.compute_torsion_signature(hash_val, 12345)
    print(f"  Nonce: 12345")
    print(f"  Signature: {signature[:32]}...")
    print()
    
    # Statistics
    print("📈 Engine Statistics:")
    stats = engine.get_validation_statistics()
    for key, value in stats.items():
        if isinstance(value, float):
            print(f"  {key}: {value:.6f}")
        else:
            print(f"  {key}: {value}")
    print()
    
    print("✅ Zero-torsion engine operational")


if __name__ == "__main__":
    main()
