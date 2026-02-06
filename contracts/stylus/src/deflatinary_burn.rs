//! # Deflationary Burn Contract
//!
//! This contract implements the token burn mechanism tied to performance metrics.
//! It calculates rewards based on performance tiers and effort scores, then burns
//! a percentage of tokens to create deflationary pressure.
//!
//! ## Burn Mechanics:
//! - Performance-based burn multipliers (1.5x to 4.0x)
//! - Effort validation from wearable data
//! - 10% of rewards are burned to reduce supply
//! - Tracks total burned for transparency

use stylus_sdk::{
    alloy_primitives::{Address, U256, FixedBytes},
    prelude::*,
    msg,
    block,
    call::Call,
};

// Reward tiers matching the NestJS implementation
const TIER_NIFTY_FIFTY: u8 = 0;
const TIER_GAYLE_STORM: u8 = 1;
const TIER_FIVE_WICKET_HAUL: u8 = 2;
const TIER_HAT_TRICK: u8 = 3;
const TIER_MAIDEN_MASTER: u8 = 4;
const TIER_RUN_MACHINE: u8 = 5;
const TIER_GOLDEN_ARM: u8 = 6;
const TIER_ALL_ROUNDER: u8 = 7;

sol_storage! {
    /// Main DeflatinaryBurn contract storage
    #[entrypoint]
    pub struct DeflatinaryBurn {
        /// Contract owner
        address owner;

        /// SPP Token contract address
        address token_contract;

        /// Performance Oracle contract address
        address oracle_contract;

        /// Burn multipliers for each tier (multiplied by 10 to avoid decimals)
        mapping(uint8 => uint256) burn_multipliers;

        /// Base reward amounts for each tier
        mapping(uint8 => uint256) base_rewards;

        /// Total tokens burned across all transactions
        uint256 total_burned;

        /// Total rewards distributed
        uint256 total_rewards_distributed;

        /// Mapping from player to total rewards earned
        mapping(address => uint256) player_total_rewards;

        /// Mapping from player to total tokens burned on their behalf
        mapping(address => uint256) player_total_burned;

        /// Burn transaction records
        mapping(bytes32 => BurnTransaction) burn_transactions;
    }

    /// Burn transaction record
    pub struct BurnTransaction {
        bytes32 match_id;
        address player;
        uint256 burn_amount;
        uint256 reward_amount;
        uint8 tier;
        uint256 effort_score;
        uint256 timestamp;
        bool executed;
    }
}

sol! {
    event TokensBurned(
        bytes32 indexed matchId,
        address indexed player,
        uint256 burnAmount,
        uint256 rewardAmount,
        uint8 tier
    );

    event RewardCalculated(
        address indexed player,
        uint8 tier,
        uint256 baseReward,
        uint256 effortMultiplier,
        uint256 finalReward
    );

    event TierUpdated(
        uint8 indexed tier,
        uint256 multiplier,
        uint256 baseReward
    );

    error InvalidTier();
    error InvalidEffortScore();
    error OracleVerificationFailed();
    error TokenTransferFailed();
    error Unauthorized();
    error BurnAlreadyExecuted();
}

#[public]
impl DeflatinaryBurn {
    /// Initialize the contract with token and oracle addresses
    pub fn init(
        &mut self,
        token_contract: Address,
        oracle_contract: Address,
    ) -> Result<(), Vec<u8>> {
        let caller = msg::sender();
        self.owner.set(caller);
        self.token_contract.set(token_contract);
        self.oracle_contract.set(oracle_contract);
        self.total_burned.set(U256::from(0));
        self.total_rewards_distributed.set(U256::from(0));

        // Initialize burn multipliers (multiplied by 10)
        self.burn_multipliers.setter(TIER_NIFTY_FIFTY).set(U256::from(15)); // 1.5x
        self.burn_multipliers.setter(TIER_GAYLE_STORM).set(U256::from(30)); // 3.0x
        self.burn_multipliers.setter(TIER_FIVE_WICKET_HAUL).set(U256::from(25)); // 2.5x
        self.burn_multipliers.setter(TIER_HAT_TRICK).set(U256::from(30)); // 3.0x
        self.burn_multipliers.setter(TIER_MAIDEN_MASTER).set(U256::from(15)); // 1.5x
        self.burn_multipliers.setter(TIER_RUN_MACHINE).set(U256::from(40)); // 4.0x
        self.burn_multipliers.setter(TIER_GOLDEN_ARM).set(U256::from(13)); // 1.3x
        self.burn_multipliers.setter(TIER_ALL_ROUNDER).set(U256::from(20)); // 2.0x

        // Initialize base rewards
        self.base_rewards.setter(TIER_NIFTY_FIFTY).set(U256::from(50));
        self.base_rewards.setter(TIER_GAYLE_STORM).set(U256::from(150));
        self.base_rewards.setter(TIER_FIVE_WICKET_HAUL).set(U256::from(100));
        self.base_rewards.setter(TIER_HAT_TRICK).set(U256::from(200));
        self.base_rewards.setter(TIER_MAIDEN_MASTER).set(U256::from(30));
        self.base_rewards.setter(TIER_RUN_MACHINE).set(U256::from(250));
        self.base_rewards.setter(TIER_GOLDEN_ARM).set(U256::from(40));
        self.base_rewards.setter(TIER_ALL_ROUNDER).set(U256::from(120));

        Ok(())
    }

    /// Calculate reward based on tier and effort score
    /// @param tier Performance tier (0-7)
    /// @param effortScore Effort score from wearable (0-100)
    /// @return Final reward amount after applying multipliers
    pub fn calculate_reward(
        &self,
        tier: u8,
        effort_score: U256,
    ) -> Result<U256, Vec<u8>> {
        // Validate tier
        if tier > TIER_ALL_ROUNDER {
            return Err(InvalidTier {}.encode());
        }

        // Validate effort score (must be 0-100)
        if effort_score > U256::from(100) {
            return Err(InvalidEffortScore {}.encode());
        }

        // Get base reward and multiplier
        let base_reward = self.base_rewards.get(tier);
        let burn_multiplier = self.burn_multipliers.get(tier);

        // Calculate effort multiplier (effort_score / 100)
        // Multiply first to avoid precision loss
        let effort_adjusted = (base_reward * effort_score) / U256::from(100);

        // Apply burn multiplier (divided by 10 since we stored multiplied values)
        let final_reward = (effort_adjusted * burn_multiplier) / U256::from(10);

        Ok(final_reward)
    }

    /// Execute burn for a player's performance
    /// @param matchId The match identifier
    /// @param player Player's address
    /// @param tier Performance tier
    /// @param effortScore Effort score from wearable
    /// @return Burn amount and reward amount
    pub fn burn_for_performance(
        &mut self,
        match_id: FixedBytes<32>,
        player: Address,
        tier: u8,
        effort_score: U256,
    ) -> Result<(U256, U256), Vec<u8>> {
        // Only oracle or owner can execute burns
        let caller = msg::sender();
        if caller != self.oracle_contract.get() && caller != self.owner.get() {
            return Err(Unauthorized {}.encode());
        }

        // Create transaction ID
        let tx_id = self.compute_tx_id(match_id, player);

        // Check if already executed
        let existing_tx = self.burn_transactions.get(tx_id);
        if existing_tx.executed.get() {
            return Err(BurnAlreadyExecuted {}.encode());
        }

        // Calculate reward
        let reward_amount = self.calculate_reward(tier, effort_score)?;

        // Calculate burn amount (10% of reward)
        let burn_amount = reward_amount / U256::from(10);

        // Record transaction
        let mut tx = self.burn_transactions.setter(tx_id);
        tx.match_id.set(match_id);
        tx.player.set(player);
        tx.burn_amount.set(burn_amount);
        tx.reward_amount.set(reward_amount);
        tx.tier.set(tier);
        tx.effort_score.set(effort_score);
        tx.timestamp.set(U256::from(block::timestamp()));
        tx.executed.set(true);

        // Update totals
        let current_burned = self.total_burned.get();
        self.total_burned.set(current_burned + burn_amount);

        let current_rewards = self.total_rewards_distributed.get();
        self.total_rewards_distributed.set(current_rewards + reward_amount);

        // Update player totals
        let player_rewards = self.player_total_rewards.get(player);
        self.player_total_rewards.setter(player).set(player_rewards + reward_amount);

        let player_burned = self.player_total_burned.get(player);
        self.player_total_burned.setter(player).set(player_burned + burn_amount);

        // Emit events
        evm::log(RewardCalculated {
            player,
            tier,
            baseReward: self.base_rewards.get(tier),
            effortMultiplier: effort_score,
            finalReward: reward_amount,
        });

        evm::log(TokensBurned {
            matchId: match_id,
            player,
            burnAmount: burn_amount,
            rewardAmount: reward_amount,
            tier,
        });

        Ok((burn_amount, reward_amount))
    }

    /// Get reward tier multiplier
    /// @param tier The tier (0-7)
    /// @return Multiplier (multiplied by 10)
    pub fn get_reward_tier(&self, tier: u8) -> Result<(U256, U256), Vec<u8>> {
        if tier > TIER_ALL_ROUNDER {
            return Err(InvalidTier {}.encode());
        }

        Ok((
            self.burn_multipliers.get(tier),
            self.base_rewards.get(tier),
        ))
    }

    /// Get total tokens burned
    pub fn total_burned(&self) -> Result<U256, Vec<u8>> {
        Ok(self.total_burned.get())
    }

    /// Get total rewards distributed
    pub fn total_rewards(&self) -> Result<U256, Vec<u8>> {
        Ok(self.total_rewards_distributed.get())
    }

    /// Get player's total rewards earned
    pub fn get_player_rewards(&self, player: Address) -> Result<U256, Vec<u8>> {
        Ok(self.player_total_rewards.get(player))
    }

    /// Get player's total tokens burned
    pub fn get_player_burned(&self, player: Address) -> Result<U256, Vec<u8>> {
        Ok(self.player_total_burned.get(player))
    }

    /// Update tier configuration (admin only)
    pub fn update_tier(
        &mut self,
        tier: u8,
        multiplier: U256,
        base_reward: U256,
    ) -> Result<(), Vec<u8>> {
        if msg::sender() != self.owner.get() {
            return Err(Unauthorized {}.encode());
        }

        if tier > TIER_ALL_ROUNDER {
            return Err(InvalidTier {}.encode());
        }

        self.burn_multipliers.setter(tier).set(multiplier);
        self.base_rewards.setter(tier).set(base_reward);

        evm::log(TierUpdated {
            tier,
            multiplier,
            baseReward: base_reward,
        });

        Ok(())
    }

    /// Get burn transaction details
    pub fn get_burn_transaction(
        &self,
        match_id: FixedBytes<32>,
        player: Address,
    ) -> Result<(U256, U256, u8, bool), Vec<u8>> {
        let tx_id = self.compute_tx_id(match_id, player);
        let tx = self.burn_transactions.get(tx_id);

        Ok((
            tx.burn_amount.get(),
            tx.reward_amount.get(),
            tx.tier.get(),
            tx.executed.get(),
        ))
    }

    /// Compute transaction ID from match and player
    fn compute_tx_id(&self, match_id: FixedBytes<32>, player: Address) -> FixedBytes<32> {
        // Simple hash: keccak256(matchId, player)
        let mut data = [0u8; 52];
        data[0..32].copy_from_slice(&match_id.0);
        data[32..52].copy_from_slice(&player.0 .0);
        FixedBytes::<32>::from_slice(&stylus_sdk::crypto::keccak(&data))
    }
}
