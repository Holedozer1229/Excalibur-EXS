#!/usr/bin/env python3
"""
Grail Logic - Sovereign Vault and Grail Ergotropy Management

This module implements the business logic for Sovereign Vault (SOVEREIGN_RUNE),
Grail ergotropy mechanics, and prophecy inscription handling for the Emporium of Man.

Features:
- Sovereign Vault management (SOVEREIGN_RUNE)
- Grail ergotropy calculation and tracking
- Achievement system for Grail unlocking
- Prophecy inscription mechanics
- Quest tracking and rewards

Author: Travis D. Jones <holedozer@icloud.com>
License: BSD 3-Clause
Copyright (c) 2025, Travis D. Jones
"""

import hashlib
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, asdict
from decimal import Decimal
from enum import Enum


# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class GrailLevel(Enum):
    """Grail achievement levels."""
    NOVICE = "novice"
    APPRENTICE = "apprentice"
    ADEPT = "adept"
    MASTER = "master"
    GRANDMASTER = "grandmaster"
    SOVEREIGN = "sovereign"


@dataclass
class SovereignVault:
    """
    Represents a Sovereign Vault (SOVEREIGN_RUNE).
    
    The vault stores $EXS tokens and tracks the user's Grail progress.
    """
    vault_id: str
    owner_address: str
    balance: Decimal
    grail_level: GrailLevel
    ergotropy: Decimal  # Grail energy/power metric
    total_forges: int
    total_prophecies: int
    created_at: datetime
    last_activity: datetime
    locked: bool = False
    quest_progress: Dict[str, int] = None
    achievements: List[str] = None
    
    def __post_init__(self):
        """Initialize mutable default values."""
        if self.quest_progress is None:
            self.quest_progress = {}
        if self.achievements is None:
            self.achievements = []
    
    def to_dict(self) -> Dict:
        """Convert to dictionary for JSON serialization."""
        data = asdict(self)
        data['balance'] = str(self.balance)
        data['ergotropy'] = str(self.ergotropy)
        data['grail_level'] = self.grail_level.value
        data['created_at'] = self.created_at.isoformat()
        data['last_activity'] = self.last_activity.isoformat()
        return data


@dataclass
class GrailAchievement:
    """Represents a Grail achievement."""
    achievement_id: str
    name: str
    description: str
    ergotropy_reward: Decimal
    level_requirement: GrailLevel
    unlocked_at: Optional[datetime] = None
    
    def to_dict(self) -> Dict:
        """Convert to dictionary for JSON serialization."""
        data = asdict(self)
        data['ergotropy_reward'] = str(self.ergotropy_reward)
        data['level_requirement'] = self.level_requirement.value
        if self.unlocked_at:
            data['unlocked_at'] = self.unlocked_at.isoformat()
        return data


@dataclass
class Quest:
    """Represents a quest in the Emporium system."""
    quest_id: str
    name: str
    description: str
    requirements: Dict[str, int]
    rewards: Dict[str, Decimal]
    active: bool = True
    
    def to_dict(self) -> Dict:
        """Convert to dictionary for JSON serialization."""
        data = asdict(self)
        # Convert Decimal rewards to strings
        data['rewards'] = {k: str(v) for k, v in self.rewards.items()}
        return data


class GrailLogic:
    """
    Business logic for Sovereign Vault and Grail system.
    
    Manages vault operations, Grail ergotropy, achievements, and quest mechanics.
    """
    
    # Grail level thresholds (ergotropy required)
    GRAIL_THRESHOLDS = {
        GrailLevel.NOVICE: Decimal('0'),
        GrailLevel.APPRENTICE: Decimal('100'),
        GrailLevel.ADEPT: Decimal('500'),
        GrailLevel.MASTER: Decimal('2000'),
        GrailLevel.GRANDMASTER: Decimal('10000'),
        GrailLevel.SOVEREIGN: Decimal('50000'),
    }
    
    # Ergotropy gain rates
    ERGOTROPY_PER_FORGE = Decimal('10')
    ERGOTROPY_PER_PROPHECY = Decimal('25')
    ERGOTROPY_DECAY_RATE = Decimal('0.99')  # Daily decay multiplier
    
    def __init__(self):
        """Initialize the Grail logic system."""
        self.vaults: Dict[str, SovereignVault] = {}
        self.achievements: Dict[str, GrailAchievement] = {}
        self.quests: Dict[str, Quest] = {}
        
        # Initialize default achievements
        self._initialize_achievements()
        
        # Initialize default quests
        self._initialize_quests()
        
        logger.info("GrailLogic initialized")
    
    def _initialize_achievements(self) -> None:
        """Initialize default Grail achievements."""
        achievements = [
            GrailAchievement(
                achievement_id='first_forge',
                name='First Forge',
                description='Complete your first forge',
                ergotropy_reward=Decimal('50'),
                level_requirement=GrailLevel.NOVICE
            ),
            GrailAchievement(
                achievement_id='ten_forges',
                name='Forge Master',
                description='Complete 10 forges',
                ergotropy_reward=Decimal('200'),
                level_requirement=GrailLevel.APPRENTICE
            ),
            GrailAchievement(
                achievement_id='first_prophecy',
                name='Prophet Awakened',
                description='Inscribe your first prophecy',
                ergotropy_reward=Decimal('100'),
                level_requirement=GrailLevel.NOVICE
            ),
            GrailAchievement(
                achievement_id='grail_adept',
                name='Grail Adept',
                description='Reach Adept level',
                ergotropy_reward=Decimal('500'),
                level_requirement=GrailLevel.ADEPT
            ),
            GrailAchievement(
                achievement_id='sovereign_rune',
                name='Sovereign Rune Unlocked',
                description='Unlock the Sovereign Rune',
                ergotropy_reward=Decimal('5000'),
                level_requirement=GrailLevel.SOVEREIGN
            ),
        ]
        
        for achievement in achievements:
            self.achievements[achievement.achievement_id] = achievement
        
        logger.info(f"Initialized {len(achievements)} achievements")
    
    def _initialize_quests(self) -> None:
        """Initialize default quests."""
        quests = [
            Quest(
                quest_id='daily_forge',
                name='Daily Forge Challenge',
                description='Complete 3 forges today',
                requirements={'forges': 3},
                rewards={'ergotropy': Decimal('50'), 'exs': Decimal('10')}
            ),
            Quest(
                quest_id='prophecy_chain',
                name='Prophecy Chain',
                description='Inscribe 5 prophecies',
                requirements={'prophecies': 5},
                rewards={'ergotropy': Decimal('150'), 'exs': Decimal('25')}
            ),
            Quest(
                quest_id='vault_builder',
                name='Vault Builder',
                description='Accumulate 1000 $EXS in your vault',
                requirements={'vault_balance': 1000},
                rewards={'ergotropy': Decimal('500')}
            ),
        ]
        
        for quest in quests:
            self.quests[quest.quest_id] = quest
        
        logger.info(f"Initialized {len(quests)} quests")
    
    def create_vault(self, owner_address: str) -> SovereignVault:
        """
        Create a new Sovereign Vault.
        
        Args:
            owner_address: The owner's Taproot address
            
        Returns:
            The created SovereignVault
        """
        # Generate vault ID
        vault_data = f"{owner_address}:{datetime.utcnow().isoformat()}"
        vault_id = hashlib.sha256(vault_data.encode()).hexdigest()[:16]
        
        # Create vault
        vault = SovereignVault(
            vault_id=vault_id,
            owner_address=owner_address,
            balance=Decimal('0'),
            grail_level=GrailLevel.NOVICE,
            ergotropy=Decimal('0'),
            total_forges=0,
            total_prophecies=0,
            created_at=datetime.utcnow(),
            last_activity=datetime.utcnow(),
        )
        
        self.vaults[vault_id] = vault
        logger.info(f"Created vault {vault_id} for {owner_address}")
        
        return vault
    
    def get_vault(self, vault_id: str) -> Optional[SovereignVault]:
        """
        Get a vault by ID.
        
        Args:
            vault_id: The vault ID
            
        Returns:
            The SovereignVault if found, None otherwise
        """
        return self.vaults.get(vault_id)
    
    def get_vault_by_owner(self, owner_address: str) -> Optional[SovereignVault]:
        """
        Get a vault by owner address.
        
        Args:
            owner_address: The owner's address
            
        Returns:
            The SovereignVault if found, None otherwise
        """
        for vault in self.vaults.values():
            if vault.owner_address == owner_address:
                return vault
        return None
    
    def deposit(self, vault_id: str, amount: Decimal) -> bool:
        """
        Deposit $EXS into a vault.
        
        Args:
            vault_id: The vault ID
            amount: Amount to deposit
            
        Returns:
            True if successful, False otherwise
        """
        vault = self.get_vault(vault_id)
        if not vault:
            logger.warning(f"Vault not found: {vault_id}")
            return False
        
        if vault.locked:
            logger.warning(f"Vault is locked: {vault_id}")
            return False
        
        vault.balance += amount
        vault.last_activity = datetime.utcnow()
        
        logger.info(f"Deposited {amount} $EXS to vault {vault_id}")
        return True
    
    def withdraw(self, vault_id: str, amount: Decimal) -> bool:
        """
        Withdraw $EXS from a vault.
        
        Args:
            vault_id: The vault ID
            amount: Amount to withdraw
            
        Returns:
            True if successful, False otherwise
        """
        vault = self.get_vault(vault_id)
        if not vault:
            logger.warning(f"Vault not found: {vault_id}")
            return False
        
        if vault.locked:
            logger.warning(f"Vault is locked: {vault_id}")
            return False
        
        if vault.balance < amount:
            logger.warning(f"Insufficient balance in vault {vault_id}")
            return False
        
        vault.balance -= amount
        vault.last_activity = datetime.utcnow()
        
        logger.info(f"Withdrew {amount} $EXS from vault {vault_id}")
        return True
    
    def record_forge(self, vault_id: str) -> Tuple[bool, Decimal]:
        """
        Record a forge completion and award ergotropy.
        
        Args:
            vault_id: The vault ID
            
        Returns:
            Tuple of (success, ergotropy_gained)
        """
        vault = self.get_vault(vault_id)
        if not vault:
            return False, Decimal('0')
        
        vault.total_forges += 1
        vault.last_activity = datetime.utcnow()
        
        # Award ergotropy
        ergotropy_gained = self.ERGOTROPY_PER_FORGE
        vault.ergotropy += ergotropy_gained
        
        # Update Grail level
        self._update_grail_level(vault)
        
        # Check for achievements
        self._check_achievements(vault)
        
        logger.info(f"Recorded forge for vault {vault_id}, gained {ergotropy_gained} ergotropy")
        return True, ergotropy_gained
    
    def record_prophecy(self, vault_id: str) -> Tuple[bool, Decimal]:
        """
        Record a prophecy inscription and award ergotropy.
        
        Args:
            vault_id: The vault ID
            
        Returns:
            Tuple of (success, ergotropy_gained)
        """
        vault = self.get_vault(vault_id)
        if not vault:
            return False, Decimal('0')
        
        vault.total_prophecies += 1
        vault.last_activity = datetime.utcnow()
        
        # Award ergotropy (prophecies give more)
        ergotropy_gained = self.ERGOTROPY_PER_PROPHECY
        vault.ergotropy += ergotropy_gained
        
        # Update Grail level
        self._update_grail_level(vault)
        
        # Check for achievements
        self._check_achievements(vault)
        
        logger.info(f"Recorded prophecy for vault {vault_id}, gained {ergotropy_gained} ergotropy")
        return True, ergotropy_gained
    
    def _update_grail_level(self, vault: SovereignVault) -> None:
        """Update vault's Grail level based on ergotropy."""
        current_level = vault.grail_level
        
        # Check for level up
        for level, threshold in sorted(self.GRAIL_THRESHOLDS.items(), 
                                      key=lambda x: x[1], reverse=True):
            if vault.ergotropy >= threshold:
                if level != current_level:
                    vault.grail_level = level
                    logger.info(f"Vault {vault.vault_id} leveled up to {level.value}")
                break
    
    def _check_achievements(self, vault: SovereignVault) -> List[str]:
        """
        Check and unlock achievements for a vault.
        
        Returns:
            List of newly unlocked achievement IDs
        """
        unlocked = []
        
        # Check first forge
        if vault.total_forges >= 1 and 'first_forge' not in vault.achievements:
            vault.achievements.append('first_forge')
            achievement = self.achievements['first_forge']
            achievement.unlocked_at = datetime.utcnow()
            vault.ergotropy += achievement.ergotropy_reward
            unlocked.append('first_forge')
            logger.info(f"Unlocked achievement 'first_forge' for vault {vault.vault_id}")
        
        # Check ten forges
        if vault.total_forges >= 10 and 'ten_forges' not in vault.achievements:
            vault.achievements.append('ten_forges')
            achievement = self.achievements['ten_forges']
            achievement.unlocked_at = datetime.utcnow()
            vault.ergotropy += achievement.ergotropy_reward
            unlocked.append('ten_forges')
            logger.info(f"Unlocked achievement 'ten_forges' for vault {vault.vault_id}")
        
        # Check first prophecy
        if vault.total_prophecies >= 1 and 'first_prophecy' not in vault.achievements:
            vault.achievements.append('first_prophecy')
            achievement = self.achievements['first_prophecy']
            achievement.unlocked_at = datetime.utcnow()
            vault.ergotropy += achievement.ergotropy_reward
            unlocked.append('first_prophecy')
            logger.info(f"Unlocked achievement 'first_prophecy' for vault {vault.vault_id}")
        
        # Check level-based achievements
        if vault.grail_level == GrailLevel.ADEPT and 'grail_adept' not in vault.achievements:
            vault.achievements.append('grail_adept')
            achievement = self.achievements['grail_adept']
            achievement.unlocked_at = datetime.utcnow()
            vault.ergotropy += achievement.ergotropy_reward
            unlocked.append('grail_adept')
            logger.info(f"Unlocked achievement 'grail_adept' for vault {vault.vault_id}")
        
        if vault.grail_level == GrailLevel.SOVEREIGN and 'sovereign_rune' not in vault.achievements:
            vault.achievements.append('sovereign_rune')
            achievement = self.achievements['sovereign_rune']
            achievement.unlocked_at = datetime.utcnow()
            vault.ergotropy += achievement.ergotropy_reward
            unlocked.append('sovereign_rune')
            logger.info(f"Unlocked achievement 'sovereign_rune' for vault {vault.vault_id}")
        
        return unlocked
    
    def apply_ergotropy_decay(self, vault_id: str) -> Decimal:
        """
        Apply daily ergotropy decay to a vault.
        
        Args:
            vault_id: The vault ID
            
        Returns:
            Amount of ergotropy lost
        """
        vault = self.get_vault(vault_id)
        if not vault:
            return Decimal('0')
        
        old_ergotropy = vault.ergotropy
        vault.ergotropy *= self.ERGOTROPY_DECAY_RATE
        decay_amount = old_ergotropy - vault.ergotropy
        
        # Update level if necessary
        self._update_grail_level(vault)
        
        logger.info(f"Applied decay to vault {vault_id}, lost {decay_amount} ergotropy")
        return decay_amount
    
    def get_vault_status(self, vault_id: str) -> Optional[Dict]:
        """
        Get comprehensive vault status.
        
        Args:
            vault_id: The vault ID
            
        Returns:
            Dictionary with vault status information
        """
        vault = self.get_vault(vault_id)
        if not vault:
            return None
        
        return {
            'vault': vault.to_dict(),
            'next_level': self._get_next_level_info(vault),
            'recent_achievements': [
                self.achievements[aid].to_dict() 
                for aid in vault.achievements[-5:]
                if aid in self.achievements
            ],
            'active_quests': self._get_active_quests(vault),
        }
    
    def _get_next_level_info(self, vault: SovereignVault) -> Optional[Dict]:
        """Get information about the next Grail level."""
        current_level = vault.grail_level
        levels = list(GrailLevel)
        
        try:
            current_index = levels.index(current_level)
            if current_index < len(levels) - 1:
                next_level = levels[current_index + 1]
                next_threshold = self.GRAIL_THRESHOLDS[next_level]
                
                return {
                    'level': next_level.value,
                    'threshold': str(next_threshold),
                    'progress': str(vault.ergotropy),
                    'remaining': str(next_threshold - vault.ergotropy),
                }
        except (ValueError, IndexError):
            pass
        
        return None
    
    def _get_active_quests(self, vault: SovereignVault) -> List[Dict]:
        """Get active quests for a vault."""
        active = []
        
        for quest in self.quests.values():
            if not quest.active:
                continue
            
            progress = {}
            for req_type, req_value in quest.requirements.items():
                if req_type == 'forges':
                    progress[req_type] = {
                        'current': vault.total_forges,
                        'required': req_value,
                        'complete': vault.total_forges >= req_value
                    }
                elif req_type == 'prophecies':
                    progress[req_type] = {
                        'current': vault.total_prophecies,
                        'required': req_value,
                        'complete': vault.total_prophecies >= req_value
                    }
                elif req_type == 'vault_balance':
                    progress[req_type] = {
                        'current': str(vault.balance),
                        'required': req_value,
                        'complete': vault.balance >= Decimal(str(req_value))
                    }
            
            quest_data = quest.to_dict()
            quest_data['progress'] = progress
            active.append(quest_data)
        
        return active
    
    def get_leaderboard(self, metric: str = 'ergotropy', limit: int = 10) -> List[Dict]:
        """
        Get leaderboard of top vaults.
        
        Args:
            metric: Metric to rank by ('ergotropy', 'balance', 'forges', 'prophecies')
            limit: Number of vaults to return
            
        Returns:
            List of vault information dictionaries
        """
        vaults = list(self.vaults.values())
        
        # Sort by metric
        if metric == 'ergotropy':
            vaults.sort(key=lambda v: v.ergotropy, reverse=True)
        elif metric == 'balance':
            vaults.sort(key=lambda v: v.balance, reverse=True)
        elif metric == 'forges':
            vaults.sort(key=lambda v: v.total_forges, reverse=True)
        elif metric == 'prophecies':
            vaults.sort(key=lambda v: v.total_prophecies, reverse=True)
        else:
            vaults.sort(key=lambda v: v.ergotropy, reverse=True)
        
        return [v.to_dict() for v in vaults[:limit]]
