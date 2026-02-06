//! # SPP Stylus Oracle - Sports Performance Protocol
//!
//! This contract system implements the Performance Oracle and Deflationary Burn
//! mechanisms for the Sports Performance Protocol on Arbitrum Stylus.
//!
//! ## Core Components:
//! - **PerformanceOracle**: Match registration, finalization, and proof verification
//! - **DeflatinaryBurn**: Token burn logic tied to performance metrics
//! - **SPPToken**: ERC-20 token with burn capabilities
//! - **RewardTiers**: On-chain reward tier configuration
//! - **AthleteNFT**: Computational NFT for athlete profiles (Living Resume)

#![cfg_attr(not(feature = "export-abi"), no_main)]
extern crate alloc;

/// Import the Stylus SDK along with alloy primitive types for use in our program.
use stylus_sdk::{
    alloy_primitives::{Address, U256},
    prelude::*,
    msg,
    contract,
    evm,
};

// Module declarations
mod performance_oracle;
mod deflatinary_burn;
mod spp_token;
mod reward_tiers;
mod athlete_nft;

// Re-export main contracts
pub use performance_oracle::PerformanceOracle;
pub use deflatinary_burn::DeflatinaryBurn;
pub use spp_token::SPPToken;
pub use reward_tiers::RewardTiers;
pub use athlete_nft::AthleteNFT;

// Common types and errors used across contracts
sol! {
    /// Emitted when a match is registered on-chain
    event MatchRegistered(
        bytes32 indexed matchId,
        address indexed organizer,
        uint256 timestamp
    );

    /// Emitted when a match is finalized with performance data
    event MatchFinalized(
        bytes32 indexed matchId,
        uint256 totalPlayers,
        uint256 timestamp
    );

    /// Emitted when tokens are burned for performance rewards
    event TokensBurned(
        address indexed player,
        bytes32 indexed matchId,
        uint256 burnAmount,
        uint256 rewardAmount,
        uint8 tier
    );

    /// Emitted when an athlete NFT is minted or updated
    event AthleteProfileUpdated(
        uint256 indexed tokenId,
        address indexed athlete,
        uint256 power,
        uint256 speed,
        uint256 accuracy
    );

    /// Common errors
    error Unauthorized();
    error InvalidMatchId();
    error MatchAlreadyFinalized();
    error InvalidTier();
    error InsufficientBalance();
    error TransferFailed();
}

// Initialize the mini-allocator for efficient memory management
#[global_allocator]
static ALLOC: mini_alloc::MiniAlloc = mini_alloc::MiniAlloc::INIT;
