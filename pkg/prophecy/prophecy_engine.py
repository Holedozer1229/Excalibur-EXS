#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Excalibur Prophecy Engine
-------------------------
Manages prophecy lifecycle, validation queue, and quest mechanics.

Author: Travis D. Jones <holedozer@gmail.com>
License: BSD 3-Clause
"""

import hashlib
import json
from typing import Dict, List, Optional
from datetime import datetime, timezone, timedelta
from enum import Enum


class ProphecyStatus(Enum):
    """Status of a prophecy in the system."""
    PENDING = "pending"
    VALIDATING = "validating"
    FULFILLED = "fulfilled"
    REJECTED = "rejected"
    EXPIRED = "expired"


class ProphecyEngine:
    """
    Manages the lifecycle of prophecies in the Excalibur protocol.
    
    Prophecies are cryptographic predictions that can be validated
    through proof-of-work and rune validation.
    """
    
    def __init__(self):
        """Initialize the prophecy engine."""
        self.prophecies = {}
        self.prophecy_counter = 0
        self.validation_queue = []
        
    def create_prophecy(
        self,
        axiom: str,
        predicted_hash: Optional[str] = None,
        expiry_hours: int = 24
    ) -> Dict:
        """
        Create a new prophecy.
        
        Args:
            axiom: The 13-word axiom
            predicted_hash: Optional predicted hash pattern
            expiry_hours: Hours until prophecy expires
            
        Returns:
            Prophecy record
        """
        self.prophecy_counter += 1
        prophecy_id = f"PROPH-{self.prophecy_counter:06d}"
        
        now = datetime.now(timezone.utc)
        expiry = now + timedelta(hours=expiry_hours)
        
        prophecy = {
            "id": prophecy_id,
            "axiom": axiom,
            "predicted_hash": predicted_hash,
            "status": ProphecyStatus.PENDING.value,
            "created_at": now.isoformat(),
            "expires_at": expiry.isoformat(),
            "attempts": 0,
            "validations": [],
            "metadata": {
                "prophet_signature": hashlib.sha256(
                    f"{prophecy_id}{axiom}{now.isoformat()}".encode()
                ).hexdigest()[:16]
            }
        }
        
        self.prophecies[prophecy_id] = prophecy
        return prophecy
    
    def submit_validation(
        self,
        prophecy_id: str,
        nonce: int,
        hash_result: str,
        validator_id: Optional[str] = None
    ) -> Dict:
        """
        Submit a validation attempt for a prophecy.
        
        Args:
            prophecy_id: ID of the prophecy
            nonce: Proof-of-work nonce
            hash_result: Resulting hash
            validator_id: Optional validator identifier
            
        Returns:
            Validation submission result
        """
        if prophecy_id not in self.prophecies:
            return {
                "success": False,
                "error": "Prophecy not found",
                "prophecy_id": prophecy_id
            }
        
        prophecy = self.prophecies[prophecy_id]
        
        # Check if expired
        expiry = datetime.fromisoformat(prophecy["expires_at"])
        if datetime.now(timezone.utc) > expiry:
            prophecy["status"] = ProphecyStatus.EXPIRED.value
            return {
                "success": False,
                "error": "Prophecy has expired",
                "prophecy_id": prophecy_id,
                "expired_at": prophecy["expires_at"]
            }
        
        # Check if already fulfilled
        if prophecy["status"] == ProphecyStatus.FULFILLED.value:
            return {
                "success": False,
                "error": "Prophecy already fulfilled",
                "prophecy_id": prophecy_id
            }
        
        # Record validation attempt
        validation = {
            "nonce": nonce,
            "hash": hash_result,
            "validator_id": validator_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "status": "pending"
        }
        
        prophecy["attempts"] += 1
        prophecy["validations"].append(validation)
        prophecy["status"] = ProphecyStatus.VALIDATING.value
        
        # Add to validation queue
        self.validation_queue.append({
            "prophecy_id": prophecy_id,
            "validation": validation
        })
        
        return {
            "success": True,
            "prophecy_id": prophecy_id,
            "validation": validation,
            "queue_position": len(self.validation_queue)
        }
    
    def fulfill_prophecy(
        self,
        prophecy_id: str,
        validation_index: int,
        rune_signature: str
    ) -> Dict:
        """
        Mark a prophecy as fulfilled with validated proof.
        
        Args:
            prophecy_id: ID of the prophecy
            validation_index: Index of the successful validation
            rune_signature: Validated rune signature
            
        Returns:
            Fulfillment result
        """
        if prophecy_id not in self.prophecies:
            return {
                "success": False,
                "error": "Prophecy not found"
            }
        
        prophecy = self.prophecies[prophecy_id]
        
        if validation_index >= len(prophecy["validations"]):
            return {
                "success": False,
                "error": "Invalid validation index"
            }
        
        validation = prophecy["validations"][validation_index]
        validation["status"] = "fulfilled"
        validation["rune_signature"] = rune_signature
        
        prophecy["status"] = ProphecyStatus.FULFILLED.value
        prophecy["fulfilled_at"] = datetime.now(timezone.utc).isoformat()
        prophecy["winning_validation"] = validation
        
        return {
            "success": True,
            "prophecy_id": prophecy_id,
            "status": ProphecyStatus.FULFILLED.value,
            "rune_signature": rune_signature,
            "attempts": prophecy["attempts"],
            "fulfilled_at": prophecy["fulfilled_at"]
        }
    
    def reject_prophecy(self, prophecy_id: str, reason: str) -> Dict:
        """
        Reject a prophecy.
        
        Args:
            prophecy_id: ID of the prophecy
            reason: Rejection reason
            
        Returns:
            Rejection result
        """
        if prophecy_id not in self.prophecies:
            return {
                "success": False,
                "error": "Prophecy not found"
            }
        
        prophecy = self.prophecies[prophecy_id]
        prophecy["status"] = ProphecyStatus.REJECTED.value
        prophecy["rejection_reason"] = reason
        prophecy["rejected_at"] = datetime.now(timezone.utc).isoformat()
        
        return {
            "success": True,
            "prophecy_id": prophecy_id,
            "status": ProphecyStatus.REJECTED.value,
            "reason": reason
        }
    
    def get_prophecy(self, prophecy_id: str) -> Optional[Dict]:
        """
        Get prophecy details.
        
        Args:
            prophecy_id: ID of the prophecy
            
        Returns:
            Prophecy record or None
        """
        return self.prophecies.get(prophecy_id)
    
    def list_prophecies(
        self,
        status: Optional[str] = None,
        limit: int = 10
    ) -> List[Dict]:
        """
        List prophecies with optional filtering.
        
        Args:
            status: Filter by status (optional)
            limit: Maximum number to return
            
        Returns:
            List of prophecies
        """
        prophecies = list(self.prophecies.values())
        
        if status:
            prophecies = [p for p in prophecies if p["status"] == status]
        
        # Sort by creation time (newest first)
        prophecies.sort(
            key=lambda p: p["created_at"],
            reverse=True
        )
        
        return prophecies[:limit]
    
    def get_validation_queue(self) -> List[Dict]:
        """
        Get current validation queue.
        
        Returns:
            List of pending validations
        """
        return self.validation_queue.copy()
    
    def process_validation_queue(self, validator_func) -> Dict:
        """
        Process pending validations using a validator function.
        
        Args:
            validator_func: Function to validate each item
            
        Returns:
            Processing results
        """
        results = {
            "processed": 0,
            "fulfilled": 0,
            "rejected": 0,
            "items": []
        }
        
        while self.validation_queue:
            item = self.validation_queue.pop(0)
            prophecy_id = item["prophecy_id"]
            validation = item["validation"]
            
            # Validate using provided function
            result = validator_func(
                self.prophecies[prophecy_id]["axiom"],
                validation["nonce"],
                validation["hash"]
            )
            
            results["processed"] += 1
            
            if result.get("valid"):
                # Find validation index
                prophecy = self.prophecies[prophecy_id]
                val_idx = next(
                    i for i, v in enumerate(prophecy["validations"])
                    if v["nonce"] == validation["nonce"]
                )
                
                fulfill_result = self.fulfill_prophecy(
                    prophecy_id,
                    val_idx,
                    result.get("rune_signature", "")
                )
                results["fulfilled"] += 1
                results["items"].append({
                    "prophecy_id": prophecy_id,
                    "result": "fulfilled",
                    "details": fulfill_result
                })
            else:
                results["rejected"] += 1
                results["items"].append({
                    "prophecy_id": prophecy_id,
                    "result": "rejected",
                    "reason": result.get("verdict", "Invalid proof")
                })
        
        return results
    
    def get_statistics(self) -> Dict:
        """
        Get prophecy engine statistics.
        
        Returns:
            Statistics dictionary
        """
        stats = {
            "total_prophecies": len(self.prophecies),
            "by_status": {},
            "queue_length": len(self.validation_queue),
            "total_attempts": sum(p["attempts"] for p in self.prophecies.values())
        }
        
        for status in ProphecyStatus:
            count = len([
                p for p in self.prophecies.values()
                if p["status"] == status.value
            ])
            stats["by_status"][status.value] = count
        
        return stats
    
    def export_prophecies(self, filepath: str) -> bool:
        """
        Export prophecies to JSON file.
        
        Args:
            filepath: Path to export file
            
        Returns:
            Success status
        """
        try:
            with open(filepath, 'w') as f:
                json.dump(self.prophecies, f, indent=2)
            return True
        except Exception as e:
            print(f"Export failed: {e}")
            return False
    
    def import_prophecies(self, filepath: str) -> bool:
        """
        Import prophecies from JSON file.
        
        Args:
            filepath: Path to import file
            
        Returns:
            Success status
        """
        try:
            with open(filepath, 'r') as f:
                imported = json.load(f)
            self.prophecies.update(imported)
            return True
        except Exception as e:
            print(f"Import failed: {e}")
            return False


def main():
    """Demonstrate prophecy engine functionality."""
    print("🔮 Excalibur Prophecy Engine")
    print("=" * 60)
    print()
    
    engine = ProphecyEngine()
    
    # Create a prophecy
    print("📜 Creating Prophecy:")
    axiom = "sword legend pull magic kingdom artist stone destroy forget fire steel honey question"
    prophecy = engine.create_prophecy(axiom, expiry_hours=24)
    print(f"  ID: {prophecy['id']}")
    print(f"  Status: {prophecy['status']}")
    print(f"  Expires: {prophecy['expires_at']}")
    print()
    
    # Submit validation
    print("⚔️ Submitting Validation:")
    submission = engine.submit_validation(
        prophecy['id'],
        nonce=12345,
        hash_result="00000000abcd1234",
        validator_id="KNIGHT-001"
    )
    print(f"  Success: {submission['success']}")
    print(f"  Queue Position: {submission.get('queue_position', 'N/A')}")
    print()
    
    # List prophecies
    print("📋 Listing Prophecies:")
    prophecies = engine.list_prophecies(limit=5)
    for p in prophecies:
        print(f"  {p['id']}: {p['status']} ({p['attempts']} attempts)")
    print()
    
    # Statistics
    print("📊 Engine Statistics:")
    stats = engine.get_statistics()
    for key, value in stats.items():
        if key != "by_status":
            print(f"  {key}: {value}")
    print()
    
    print("✅ Prophecy engine operational")


if __name__ == "__main__":
    main()
