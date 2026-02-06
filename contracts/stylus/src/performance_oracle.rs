//! # Performance Oracle Contract
//!
//! This contract serves as the "Trust Layer" for match data verification.
//! It stores finalized match proofs on-chain and provides verification capabilities.
//!
//! ## Key Features:
//! - Register matches before they begin
//! - Finalize matches with performance data
//! - Generate cryptographic proofs for match results
//! - Verify performance claims against stored data

use stylus_sdk::{
    alloy_primitives::{Address, U256, FixedBytes},
    prelude::*,
    msg,
    block,
};

// Define the match data structure
sol_storage! {
    /// Main PerformanceOracle contract storage
    #[entrypoint]
    pub struct PerformanceOracle {
        /// Contract owner (admin)
        address owner;

        /// Mapping from matchId (bytes32) to Match data
        mapping(bytes32 => Match) matches;

        /// Mapping from matchId to player performance records
        mapping(bytes32 => mapping(address => PlayerPerformance)) performances;

        /// Total number of matches registered
        uint256 total_matches;

        /// Mapping from player address to their match history
        mapping(address => bytes32[]) player_match_history;
    }

    /// Match metadata and status
    pub struct Match {
        bytes32 match_id;
        address organizer;
        uint256 registered_at;
        uint256 finalized_at;
        bool is_finalized;
        uint8 total_players;
        bytes32 data_hash; // Hash of the complete match data
    }

    /// Individual player performance in a match
    pub struct PlayerPerformance {
        address player;
        uint256 runs_scored;
        uint256 wickets_taken;
        uint256 balls_faced;
        uint256 balls_bowled;
        uint256 strike_rate; // Multiplied by 100 to avoid decimals
        uint8 tier; // Reward tier (0-7)
        uint256 effort_score; // From wearable data (0-100)
        bool verified;
    }
}

/// Events emitted by the oracle
sol! {
    event MatchRegistered(
        bytes32 indexed matchId,
        address indexed organizer,
        uint256 timestamp
    );

    event MatchFinalized(
        bytes32 indexed matchId,
        uint256 totalPlayers,
        uint256 timestamp
    );

    event PerformanceRecorded(
        bytes32 indexed matchId,
        address indexed player,
        uint8 tier,
        uint256 effortScore
    );

    error MatchNotFound();
    error MatchAlreadyFinalized();
    error MatchNotFinalized();
    error Unauthorized();
    error InvalidPlayer();
}

#[public]
impl PerformanceOracle {
    /// Initialize the contract with the owner
    pub fn init(&mut self) -> Result<(), Vec<u8>> {
        let caller = msg::sender();
        self.owner.set(caller);
        self.total_matches.set(U256::from(0));
        Ok(())
    }

    /// Register a new match before it begins
    /// @param matchId Unique identifier for the match (generated off-chain)
    pub fn register_match(&mut self, match_id: FixedBytes<32>) -> Result<(), Vec<u8>> {
        let caller = msg::sender();

        // Check if match already exists
        let existing_match = self.matches.get(match_id);
        if existing_match.is_finalized.get() {
            return Err(MatchAlreadyFinalized {}.encode());
        }

        // Create new match record
        let mut new_match = self.matches.setter(match_id);
        new_match.match_id.set(match_id);
        new_match.organizer.set(caller);
        new_match.registered_at.set(U256::from(block::timestamp()));
        new_match.is_finalized.set(false);
        new_match.total_players.set(0);

        // Increment total matches
        let current_total = self.total_matches.get();
        self.total_matches.set(current_total + U256::from(1));

        // Emit event
        evm::log(MatchRegistered {
            matchId: match_id,
            organizer: caller,
            timestamp: U256::from(block::timestamp()),
        });

        Ok(())
    }

    /// Finalize a match with performance data
    /// @param matchId The match identifier
    /// @param dataHash Hash of the complete match data for verification
    /// @param playerCount Number of players in the match
    pub fn finalize_match(
        &mut self,
        match_id: FixedBytes<32>,
        data_hash: FixedBytes<32>,
        player_count: u8,
    ) -> Result<(), Vec<u8>> {
        let caller = msg::sender();

        // Get match data
        let mut match_data = self.matches.setter(match_id);

        // Verify organizer
        if match_data.organizer.get() != caller {
            return Err(Unauthorized {}.encode());
        }

        // Check if already finalized
        if match_data.is_finalized.get() {
            return Err(MatchAlreadyFinalized {}.encode());
        }

        // Update match status
        match_data.finalized_at.set(U256::from(block::timestamp()));
        match_data.is_finalized.set(true);
        match_data.data_hash.set(data_hash);
        match_data.total_players.set(player_count);

        // Emit event
        evm::log(MatchFinalized {
            matchId: match_id,
            totalPlayers: U256::from(player_count),
            timestamp: U256::from(block::timestamp()),
        });

        Ok(())
    }

    /// Record individual player performance
    /// @param matchId The match identifier
    /// @param player Player's address
    /// @param runsScored Runs scored by the player
    /// @param wicketsTaken Wickets taken by the player
    /// @param ballsFaced Balls faced by the player
    /// @param ballsBowled Balls bowled by the player
    /// @param tier Reward tier (0-7)
    /// @param effortScore Effort score from wearable (0-100)
    pub fn record_performance(
        &mut self,
        match_id: FixedBytes<32>,
        player: Address,
        runs_scored: U256,
        wickets_taken: U256,
        balls_faced: U256,
        balls_bowled: U256,
        tier: u8,
        effort_score: U256,
    ) -> Result<(), Vec<u8>> {
        let caller = msg::sender();

        // Verify match organizer
        let match_data = self.matches.get(match_id);
        if match_data.organizer.get() != caller {
            return Err(Unauthorized {}.encode());
        }

        // Match must not be finalized yet (performances recorded before finalization)
        if match_data.is_finalized.get() {
            return Err(MatchAlreadyFinalized {}.encode());
        }

        // Calculate strike rate (runs * 100 / balls_faced)
        let strike_rate = if balls_faced > U256::from(0) {
            (runs_scored * U256::from(100)) / balls_faced
        } else {
            U256::from(0)
        };

        // Store performance data
        let mut perf = self.performances.setter(match_id).setter(player);
        perf.player.set(player);
        perf.runs_scored.set(runs_scored);
        perf.wickets_taken.set(wickets_taken);
        perf.balls_faced.set(balls_faced);
        perf.balls_bowled.set(balls_bowled);
        perf.strike_rate.set(strike_rate);
        perf.tier.set(tier);
        perf.effort_score.set(effort_score);
        perf.verified.set(true);

        // Add to player's match history
        self.player_match_history.setter(player).push(match_id);

        // Emit event
        evm::log(PerformanceRecorded {
            matchId: match_id,
            player,
            tier,
            effortScore: effort_score,
        });

        Ok(())
    }

    /// Get match data proof (for verification)
    /// @param matchId The match identifier
    /// @return Match data hash and finalization status
    pub fn get_match_proof(
        &self,
        match_id: FixedBytes<32>,
    ) -> Result<(FixedBytes<32>, bool, U256), Vec<u8>> {
        let match_data = self.matches.get(match_id);

        Ok((
            match_data.data_hash.get(),
            match_data.is_finalized.get(),
            match_data.finalized_at.get(),
        ))
    }

    /// Verify a player's performance claim
    /// @param matchId The match identifier
    /// @param player Player's address
    /// @return True if verified performance exists
    pub fn verify_performance(
        &self,
        match_id: FixedBytes<32>,
        player: Address,
    ) -> Result<bool, Vec<u8>> {
        let perf = self.performances.get(match_id).get(player);
        Ok(perf.verified.get())
    }

    /// Get player performance details
    /// @param matchId The match identifier
    /// @param player Player's address
    /// @return Performance metrics (runs, wickets, tier, effort)
    pub fn get_player_performance(
        &self,
        match_id: FixedBytes<32>,
        player: Address,
    ) -> Result<(U256, U256, u8, U256), Vec<u8>> {
        let perf = self.performances.get(match_id).get(player);

        if !perf.verified.get() {
            return Err(InvalidPlayer {}.encode());
        }

        Ok((
            perf.runs_scored.get(),
            perf.wickets_taken.get(),
            perf.tier.get(),
            perf.effort_score.get(),
        ))
    }

    /// Get total number of matches registered
    pub fn get_total_matches(&self) -> Result<U256, Vec<u8>> {
        Ok(self.total_matches.get())
    }

    /// Get match details
    /// @param matchId The match identifier
    /// @return Match metadata
    pub fn get_match_details(
        &self,
        match_id: FixedBytes<32>,
    ) -> Result<(Address, U256, bool, u8), Vec<u8>> {
        let match_data = self.matches.get(match_id);

        Ok((
            match_data.organizer.get(),
            match_data.registered_at.get(),
            match_data.is_finalized.get(),
            match_data.total_players.get(),
        ))
    }

    /// Check if caller is the contract owner
    pub fn is_owner(&self) -> Result<bool, Vec<u8>> {
        Ok(self.owner.get() == msg::sender())
    }
}
