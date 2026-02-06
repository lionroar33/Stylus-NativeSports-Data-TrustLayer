//! # Athlete NFT - Computational "Living Resume"
//!
//! This contract implements dynamic NFTs that represent athlete profiles.
//! The NFT stats (Power, Speed, Accuracy) automatically update based on
//! verified match performance data from the PerformanceOracle.
//!
//! ## Key Features:
//! - ERC-721 compatible NFT
//! - Dynamic on-chain stats that update with each match
//! - Verifiable athlete resume for scouts and coaches
//! - Non-transferable during active season (optional lockup)
//! - Metadata stored on-chain for transparency

use stylus_sdk::{
    alloy_primitives::{Address, U256, FixedBytes},
    prelude::*,
    msg,
    block,
};

sol_storage! {
    /// Main AthleteNFT contract storage
    #[entrypoint]
    pub struct AthleteNFT {
        /// Contract owner
        address owner;

        /// Oracle contract address (for data verification)
        address oracle_contract;

        /// NFT name
        string name;

        /// NFT symbol
        string symbol;

        /// Token ID counter
        uint256 next_token_id;

        /// Mapping from token ID to owner
        mapping(uint256 => address) owners;

        /// Mapping from owner to token count
        mapping(address => uint256) balances;

        /// Mapping from token ID to approved address
        mapping(uint256 => address) token_approvals;

        /// Mapping from owner to operator approvals
        mapping(address => mapping(address => bool)) operator_approvals;

        /// Mapping from token ID to athlete stats
        mapping(uint256 => AthleteStats) athlete_stats;

        /// Mapping from athlete address to token ID
        mapping(address => uint256) athlete_to_token;

        /// Total NFTs minted
        uint256 total_minted;
    }

    /// Athlete statistics (dynamic/computational)
    pub struct AthleteStats {
        address athlete;
        string athlete_name;
        uint256 power; // Batting power (0-100)
        uint256 speed; // Running speed (0-100)
        uint256 accuracy; // Bowling accuracy (0-100)
        uint256 matches_played;
        uint256 total_runs;
        uint256 total_wickets;
        uint256 highest_score;
        uint256 best_bowling;
        uint256 last_updated;
        bool is_active;
    }
}

sol! {
    // ERC-721 Events
    event Transfer(
        address indexed from,
        address indexed to,
        uint256 indexed tokenId
    );

    event Approval(
        address indexed owner,
        address indexed approved,
        uint256 indexed tokenId
    );

    event ApprovalForAll(
        address indexed owner,
        address indexed operator,
        bool approved
    );

    // Custom Events
    event AthleteProfileMinted(
        uint256 indexed tokenId,
        address indexed athlete,
        string name
    );

    event StatsUpdated(
        uint256 indexed tokenId,
        uint256 power,
        uint256 speed,
        uint256 accuracy,
        uint256 matchesPlayed
    );

    event MatchPerformanceRecorded(
        uint256 indexed tokenId,
        bytes32 indexed matchId,
        uint256 runs,
        uint256 wickets
    );

    // Errors
    error TokenDoesNotExist();
    error NotTokenOwner();
    error NotAuthorized();
    error AlreadyHasProfile();
    error InvalidAddress();
    error Unauthorized();
}

#[public]
impl AthleteNFT {
    /// Initialize the NFT contract
    pub fn init(&mut self, oracle_contract: Address) -> Result<(), Vec<u8>> {
        let caller = msg::sender();
        self.owner.set(caller);
        self.oracle_contract.set(oracle_contract);
        self.name.set_str("Sports Performance Athlete Profile");
        self.symbol.set_str("ATHLETE");
        self.next_token_id.set(U256::from(1));
        self.total_minted.set(U256::from(0));
        Ok(())
    }

    // ==================== ERC-721 Core Functions ====================

    /// Get token balance of an address
    pub fn balance_of(&self, owner: Address) -> Result<U256, Vec<u8>> {
        if owner == Address::ZERO {
            return Err(InvalidAddress {}.encode());
        }
        Ok(self.balances.get(owner))
    }

    /// Get owner of a token
    pub fn owner_of(&self, token_id: U256) -> Result<Address, Vec<u8>> {
        let owner = self.owners.get(token_id);
        if owner == Address::ZERO {
            return Err(TokenDoesNotExist {}.encode());
        }
        Ok(owner)
    }

    /// Get NFT name
    pub fn name(&self) -> Result<String, Vec<u8>> {
        Ok(self.name.get_string())
    }

    /// Get NFT symbol
    pub fn symbol(&self) -> Result<String, Vec<u8>> {
        Ok(self.symbol.get_string())
    }

    /// Approve address to transfer token
    pub fn approve(&mut self, to: Address, token_id: U256) -> Result<(), Vec<u8>> {
        let owner = self.owner_of(token_id)?;
        let caller = msg::sender();

        if caller != owner && !self.is_approved_for_all(owner, caller)? {
            return Err(NotAuthorized {}.encode());
        }

        self.token_approvals.setter(token_id).set(to);

        evm::log(Approval {
            owner,
            approved: to,
            tokenId: token_id,
        });

        Ok(())
    }

    /// Get approved address for token
    pub fn get_approved(&self, token_id: U256) -> Result<Address, Vec<u8>> {
        if self.owners.get(token_id) == Address::ZERO {
            return Err(TokenDoesNotExist {}.encode());
        }
        Ok(self.token_approvals.get(token_id))
    }

    /// Set approval for all tokens
    pub fn set_approval_for_all(&mut self, operator: Address, approved: bool) -> Result<(), Vec<u8>> {
        let caller = msg::sender();
        if caller == operator {
            return Err(InvalidAddress {}.encode());
        }

        self.operator_approvals
            .setter(caller)
            .setter(operator)
            .set(approved);

        evm::log(ApprovalForAll {
            owner: caller,
            operator,
            approved,
        });

        Ok(())
    }

    /// Check if operator is approved for all
    pub fn is_approved_for_all(&self, owner: Address, operator: Address) -> Result<bool, Vec<u8>> {
        Ok(self.operator_approvals.get(owner).get(operator))
    }

    /// Transfer token
    pub fn transfer_from(
        &mut self,
        from: Address,
        to: Address,
        token_id: U256,
    ) -> Result<(), Vec<u8>> {
        let caller = msg::sender();
        let owner = self.owner_of(token_id)?;

        // Check authorization
        if owner != from {
            return Err(NotTokenOwner {}.encode());
        }

        let is_authorized = caller == owner
            || self.get_approved(token_id)? == caller
            || self.is_approved_for_all(owner, caller)?;

        if !is_authorized {
            return Err(NotAuthorized {}.encode());
        }

        self._transfer(from, to, token_id)?;
        Ok(())
    }

    // ==================== Athlete Profile Functions ====================

    /// Mint a new athlete profile NFT
    /// @param athlete Athlete's address
    /// @param athleteName Athlete's name
    /// @return Token ID
    pub fn mint_athlete_profile(
        &mut self,
        athlete: Address,
        athlete_name: String,
    ) -> Result<U256, Vec<u8>> {
        // Check if athlete already has a profile
        let existing_token = self.athlete_to_token.get(athlete);
        if existing_token > U256::from(0) {
            return Err(AlreadyHasProfile {}.encode());
        }

        // Get next token ID
        let token_id = self.next_token_id.get();

        // Mint NFT
        self.owners.setter(token_id).set(athlete);
        let balance = self.balances.get(athlete);
        self.balances.setter(athlete).set(balance + U256::from(1));

        // Initialize athlete stats
        let mut stats = self.athlete_stats.setter(token_id);
        stats.athlete.set(athlete);
        stats.athlete_name.set_str(&athlete_name);
        stats.power.set(U256::from(50)); // Default starting stats
        stats.speed.set(U256::from(50));
        stats.accuracy.set(U256::from(50));
        stats.matches_played.set(U256::from(0));
        stats.total_runs.set(U256::from(0));
        stats.total_wickets.set(U256::from(0));
        stats.highest_score.set(U256::from(0));
        stats.best_bowling.set(U256::from(0));
        stats.last_updated.set(U256::from(block::timestamp()));
        stats.is_active.set(true);

        // Map athlete to token
        self.athlete_to_token.setter(athlete).set(token_id);

        // Increment counters
        self.next_token_id.set(token_id + U256::from(1));
        let total = self.total_minted.get();
        self.total_minted.set(total + U256::from(1));

        // Emit events
        evm::log(Transfer {
            from: Address::ZERO,
            to: athlete,
            tokenId: token_id,
        });

        evm::log(AthleteProfileMinted {
            tokenId: token_id,
            athlete,
            name: athlete_name,
        });

        Ok(token_id)
    }

    /// Update athlete stats based on match performance
    /// @param tokenId Athlete's NFT token ID
    /// @param matchId Match identifier
    /// @param runs Runs scored in match
    /// @param wickets Wickets taken in match
    pub fn update_stats_from_match(
        &mut self,
        token_id: U256,
        match_id: FixedBytes<32>,
        runs: U256,
        wickets: U256,
    ) -> Result<(), Vec<u8>> {
        // Only oracle or owner can update stats
        let caller = msg::sender();
        if caller != self.oracle_contract.get() && caller != self.owner.get() {
            return Err(Unauthorized {}.encode());
        }

        // Get athlete stats
        let mut stats = self.athlete_stats.setter(token_id);

        // Update match count
        let matches = stats.matches_played.get();
        stats.matches_played.set(matches + U256::from(1));

        // Update total runs
        let total_runs = stats.total_runs.get();
        stats.total_runs.set(total_runs + runs);

        // Update highest score
        let highest = stats.highest_score.get();
        if runs > highest {
            stats.highest_score.set(runs);
        }

        // Update total wickets
        let total_wickets = stats.total_wickets.get();
        stats.total_wickets.set(total_wickets + wickets);

        // Update best bowling
        let best_bowling = stats.best_bowling.get();
        if wickets > best_bowling {
            stats.best_bowling.set(wickets);
        }

        // Recalculate dynamic stats
        let new_power = self._calculate_power(&stats)?;
        let new_speed = self._calculate_speed(&stats)?;
        let new_accuracy = self._calculate_accuracy(&stats)?;

        stats.power.set(new_power);
        stats.speed.set(new_speed);
        stats.accuracy.set(new_accuracy);
        stats.last_updated.set(U256::from(block::timestamp()));

        // Emit events
        evm::log(MatchPerformanceRecorded {
            tokenId: token_id,
            matchId: match_id,
            runs,
            wickets,
        });

        evm::log(StatsUpdated {
            tokenId: token_id,
            power: new_power,
            speed: new_speed,
            accuracy: new_accuracy,
            matchesPlayed: stats.matches_played.get(),
        });

        Ok(())
    }

    /// Get athlete stats
    /// @param tokenId NFT token ID
    /// @return (power, speed, accuracy, matchesPlayed, totalRuns, totalWickets)
    pub fn get_athlete_stats(
        &self,
        token_id: U256,
    ) -> Result<(U256, U256, U256, U256, U256, U256), Vec<u8>> {
        let stats = self.athlete_stats.get(token_id);

        if !stats.is_active.get() {
            return Err(TokenDoesNotExist {}.encode());
        }

        Ok((
            stats.power.get(),
            stats.speed.get(),
            stats.accuracy.get(),
            stats.matches_played.get(),
            stats.total_runs.get(),
            stats.total_wickets.get(),
        ))
    }

    /// Get athlete profile details
    /// @param tokenId NFT token ID
    /// @return (athlete address, name, highest score, best bowling)
    pub fn get_athlete_profile(
        &self,
        token_id: U256,
    ) -> Result<(Address, String, U256, U256), Vec<u8>> {
        let stats = self.athlete_stats.get(token_id);

        if !stats.is_active.get() {
            return Err(TokenDoesNotExist {}.encode());
        }

        Ok((
            stats.athlete.get(),
            stats.athlete_name.get_string(),
            stats.highest_score.get(),
            stats.best_bowling.get(),
        ))
    }

    /// Get token ID for an athlete address
    /// @param athlete Athlete's address
    /// @return Token ID (0 if no profile)
    pub fn get_athlete_token_id(&self, athlete: Address) -> Result<U256, Vec<u8>> {
        Ok(self.athlete_to_token.get(athlete))
    }

    /// Get total minted profiles
    pub fn total_supply(&self) -> Result<U256, Vec<u8>> {
        Ok(self.total_minted.get())
    }

    // ==================== Internal Functions ====================

    /// Internal transfer function
    fn _transfer(&mut self, from: Address, to: Address, token_id: U256) -> Result<(), Vec<u8>> {
        if to == Address::ZERO {
            return Err(InvalidAddress {}.encode());
        }

        // Clear approvals
        self.token_approvals.setter(token_id).set(Address::ZERO);

        // Update balances
        let from_balance = self.balances.get(from);
        self.balances.setter(from).set(from_balance - U256::from(1));

        let to_balance = self.balances.get(to);
        self.balances.setter(to).set(to_balance + U256::from(1));

        // Update owner
        self.owners.setter(token_id).set(to);

        evm::log(Transfer {
            from,
            to,
            tokenId: token_id,
        });

        Ok(())
    }

    /// Calculate power stat (based on runs and highest score)
    fn _calculate_power(&self, stats: &StorageGuard<AthleteStats>) -> Result<U256, Vec<u8>> {
        let matches = stats.matches_played.get();
        if matches == U256::from(0) {
            return Ok(U256::from(50));
        }

        let total_runs = stats.total_runs.get();
        let avg_runs = total_runs / matches;
        let highest = stats.highest_score.get();

        // Power = (avg_runs + highest/2) capped at 100
        let power = avg_runs + (highest / U256::from(2));
        Ok(if power > U256::from(100) {
            U256::from(100)
        } else {
            power
        })
    }

    /// Calculate speed stat (based on strike rate approximation)
    fn _calculate_speed(&self, stats: &StorageGuard<AthleteStats>) -> Result<U256, Vec<u8>> {
        // Simplified: higher total runs = better speed
        let runs = stats.total_runs.get();
        let speed = runs / U256::from(10); // Rough calculation

        Ok(if speed > U256::from(100) {
            U256::from(100)
        } else if speed < U256::from(20) {
            U256::from(50)
        } else {
            speed
        })
    }

    /// Calculate accuracy stat (based on wickets)
    fn _calculate_accuracy(&self, stats: &StorageGuard<AthleteStats>) -> Result<U256, Vec<u8>> {
        let matches = stats.matches_played.get();
        if matches == U256::from(0) {
            return Ok(U256::from(50));
        }

        let wickets = stats.total_wickets.get();
        let avg_wickets = wickets / matches;

        // Accuracy based on average wickets per match
        let accuracy = U256::from(50) + (avg_wickets * U256::from(10));

        Ok(if accuracy > U256::from(100) {
            U256::from(100)
        } else {
            accuracy
        })
    }
}
