//! # Reward Tiers Contract
//!
//! This contract manages the reward tier configuration system.
//! It provides a centralized place to define and update reward tiers,
//! multipliers, and their criteria.
//!
//! ## Tier System:
//! - 8 predefined tiers based on cricket achievements
//! - Each tier has a multiplier and base reward
//! - Admin can update tier values for flexibility
//! - Read-only access for other contracts

use stylus_sdk::{
    alloy_primitives::{Address, U256},
    prelude::*,
    msg,
};

// Tier constants
pub const TIER_NIFTY_FIFTY: u8 = 0;
pub const TIER_GAYLE_STORM: u8 = 1;
pub const TIER_FIVE_WICKET_HAUL: u8 = 2;
pub const TIER_HAT_TRICK: u8 = 3;
pub const TIER_MAIDEN_MASTER: u8 = 4;
pub const TIER_RUN_MACHINE: u8 = 5;
pub const TIER_GOLDEN_ARM: u8 = 6;
pub const TIER_ALL_ROUNDER: u8 = 7;

sol_storage! {
    /// Main RewardTiers contract storage
    #[entrypoint]
    pub struct RewardTiers {
        /// Contract owner
        address owner;

        /// Tier definitions
        mapping(uint8 => TierConfig) tiers;

        /// Total number of tiers
        uint8 total_tiers;
    }

    /// Tier configuration
    pub struct TierConfig {
        uint8 tier_id;
        string name;
        string description;
        uint256 multiplier; // Multiplied by 10 (e.g., 15 = 1.5x)
        uint256 base_reward;
        uint256 min_runs; // Minimum runs for batting tiers
        uint256 min_wickets; // Minimum wickets for bowling tiers
        bool is_active;
    }
}

sol! {
    event TierConfigured(
        uint8 indexed tierId,
        string name,
        uint256 multiplier,
        uint256 baseReward
    );

    event TierUpdated(
        uint8 indexed tierId,
        uint256 newMultiplier,
        uint256 newBaseReward
    );

    event TierActivated(uint8 indexed tierId, bool active);

    error InvalidTier();
    error Unauthorized();
    error TierNotActive();
}

#[public]
impl RewardTiers {
    /// Initialize the contract with default tier configurations
    pub fn init(&mut self) -> Result<(), Vec<u8>> {
        let caller = msg::sender();
        self.owner.set(caller);
        self.total_tiers.set(8);

        // Configure all 8 tiers
        self._configure_tier(
            TIER_NIFTY_FIFTY,
            "Nifty Fifty",
            "Scored 50+ runs in a match",
            15, // 1.5x
            50,
            50,
            0,
        )?;

        self._configure_tier(
            TIER_GAYLE_STORM,
            "Gayle Storm",
            "Scored 100+ runs with SR > 150",
            30, // 3.0x
            150,
            100,
            0,
        )?;

        self._configure_tier(
            TIER_FIVE_WICKET_HAUL,
            "Five Wicket Haul",
            "Took 5+ wickets in a match",
            25, // 2.5x
            100,
            0,
            5,
        )?;

        self._configure_tier(
            TIER_HAT_TRICK,
            "Hat Trick",
            "Took 3 wickets in 3 consecutive balls",
            30, // 3.0x
            200,
            0,
            3,
        )?;

        self._configure_tier(
            TIER_MAIDEN_MASTER,
            "Maiden Master",
            "Bowled 3+ maiden overs",
            15, // 1.5x
            30,
            0,
            0,
        )?;

        self._configure_tier(
            TIER_RUN_MACHINE,
            "Run Machine",
            "Scored 150+ runs in a match",
            40, // 4.0x
            250,
            150,
            0,
        )?;

        self._configure_tier(
            TIER_GOLDEN_ARM,
            "Golden Arm",
            "Best economy rate in match",
            13, // 1.3x
            40,
            0,
            1,
        )?;

        self._configure_tier(
            TIER_ALL_ROUNDER,
            "All Rounder",
            "30+ runs and 2+ wickets",
            20, // 2.0x
            120,
            30,
            2,
        )?;

        Ok(())
    }

    /// Get tier multiplier and base reward
    /// @param tierId Tier identifier (0-7)
    /// @return (multiplier, baseReward)
    pub fn get_tier_multiplier(&self, tier_id: u8) -> Result<(U256, U256), Vec<u8>> {
        if tier_id >= self.total_tiers.get() {
            return Err(InvalidTier {}.encode());
        }

        let tier = self.tiers.get(tier_id);

        if !tier.is_active.get() {
            return Err(TierNotActive {}.encode());
        }

        Ok((tier.multiplier.get(), tier.base_reward.get()))
    }

    /// Get tier details
    /// @param tierId Tier identifier
    /// @return Complete tier configuration
    pub fn get_tier_details(
        &self,
        tier_id: u8,
    ) -> Result<(String, String, U256, U256, bool), Vec<u8>> {
        if tier_id >= self.total_tiers.get() {
            return Err(InvalidTier {}.encode());
        }

        let tier = self.tiers.get(tier_id);

        Ok((
            tier.name.get_string(),
            tier.description.get_string(),
            tier.multiplier.get(),
            tier.base_reward.get(),
            tier.is_active.get(),
        ))
    }

    /// Get tier requirements
    /// @param tierId Tier identifier
    /// @return (minRuns, minWickets)
    pub fn get_tier_requirements(&self, tier_id: u8) -> Result<(U256, U256), Vec<u8>> {
        if tier_id >= self.total_tiers.get() {
            return Err(InvalidTier {}.encode());
        }

        let tier = self.tiers.get(tier_id);

        Ok((tier.min_runs.get(), tier.min_wickets.get()))
    }

    /// Update tier multiplier and base reward (admin only)
    /// @param tierId Tier to update
    /// @param multiplier New multiplier (multiplied by 10)
    /// @param baseReward New base reward
    pub fn update_tier(
        &mut self,
        tier_id: u8,
        multiplier: U256,
        base_reward: U256,
    ) -> Result<(), Vec<u8>> {
        if msg::sender() != self.owner.get() {
            return Err(Unauthorized {}.encode());
        }

        if tier_id >= self.total_tiers.get() {
            return Err(InvalidTier {}.encode());
        }

        let mut tier = self.tiers.setter(tier_id);
        tier.multiplier.set(multiplier);
        tier.base_reward.set(base_reward);

        evm::log(TierUpdated {
            tierId: tier_id,
            newMultiplier: multiplier,
            newBaseReward: base_reward,
        });

        Ok(())
    }

    /// Activate or deactivate a tier (admin only)
    /// @param tierId Tier to update
    /// @param active New status
    pub fn set_tier_active(&mut self, tier_id: u8, active: bool) -> Result<(), Vec<u8>> {
        if msg::sender() != self.owner.get() {
            return Err(Unauthorized {}.encode());
        }

        if tier_id >= self.total_tiers.get() {
            return Err(InvalidTier {}.encode());
        }

        let mut tier = self.tiers.setter(tier_id);
        tier.is_active.set(active);

        evm::log(TierActivated {
            tierId: tier_id,
            active,
        });

        Ok(())
    }

    /// Check if a tier is active
    /// @param tierId Tier to check
    /// @return True if active
    pub fn is_tier_active(&self, tier_id: u8) -> Result<bool, Vec<u8>> {
        if tier_id >= self.total_tiers.get() {
            return Err(InvalidTier {}.encode());
        }

        Ok(self.tiers.get(tier_id).is_active.get())
    }

    /// Get total number of tiers
    pub fn get_total_tiers(&self) -> Result<u8, Vec<u8>> {
        Ok(self.total_tiers.get())
    }

    /// Get tier name by ID
    /// @param tierId Tier identifier
    /// @return Tier name
    pub fn get_tier_name(&self, tier_id: u8) -> Result<String, Vec<u8>> {
        if tier_id >= self.total_tiers.get() {
            return Err(InvalidTier {}.encode());
        }

        Ok(self.tiers.get(tier_id).name.get_string())
    }

    // ==================== Internal Functions ====================

    /// Internal function to configure a tier
    fn _configure_tier(
        &mut self,
        tier_id: u8,
        name: &str,
        description: &str,
        multiplier: u16,
        base_reward: u64,
        min_runs: u64,
        min_wickets: u64,
    ) -> Result<(), Vec<u8>> {
        let mut tier = self.tiers.setter(tier_id);

        tier.tier_id.set(tier_id);
        tier.name.set_str(name);
        tier.description.set_str(description);
        tier.multiplier.set(U256::from(multiplier));
        tier.base_reward.set(U256::from(base_reward));
        tier.min_runs.set(U256::from(min_runs));
        tier.min_wickets.set(U256::from(min_wickets));
        tier.is_active.set(true);

        evm::log(TierConfigured {
            tierId: tier_id,
            name: name.to_string(),
            multiplier: U256::from(multiplier),
            baseReward: U256::from(base_reward),
        });

        Ok(())
    }
}
