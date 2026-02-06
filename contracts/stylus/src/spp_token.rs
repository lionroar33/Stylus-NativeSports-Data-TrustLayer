//! # SPP Token (ERC-20)
//!
//! Sports Performance Protocol Token with burn capabilities.
//! This is a standard ERC-20 token with additional burn functionality
//! integrated with the DeflatinaryBurn contract.
//!
//! ## Features:
//! - Standard ERC-20 interface (transfer, approve, transferFrom)
//! - Burn mechanism for deflationary tokenomics
//! - Mint capability for initial distribution and rewards
//! - Integration with burn contract for automated burns

use stylus_sdk::{
    alloy_primitives::{Address, U256},
    prelude::*,
    msg,
};

sol_storage! {
    /// Main SPPToken contract storage
    #[entrypoint]
    pub struct SPPToken {
        /// Token name
        string name;

        /// Token symbol
        string symbol;

        /// Decimals (18 standard)
        uint8 decimals;

        /// Total supply
        uint256 total_supply;

        /// Balances mapping
        mapping(address => uint256) balances;

        /// Allowances mapping (owner => spender => amount)
        mapping(address => mapping(address => uint256)) allowances;

        /// Contract owner (admin)
        address owner;

        /// Burn contract address (authorized to burn tokens)
        address burn_contract;

        /// Total burned (for tracking)
        uint256 total_burned;
    }
}

sol! {
    event Transfer(
        address indexed from,
        address indexed to,
        uint256 value
    );

    event Approval(
        address indexed owner,
        address indexed spender,
        uint256 value
    );

    event Burn(
        address indexed from,
        uint256 value
    );

    event Mint(
        address indexed to,
        uint256 value
    );

    error InsufficientBalance();
    error InsufficientAllowance();
    error Unauthorized();
    error InvalidAddress();
}

#[public]
impl SPPToken {
    /// Initialize the token with name, symbol, and initial supply
    pub fn init(&mut self, initial_supply: U256) -> Result<(), Vec<u8>> {
        let caller = msg::sender();

        // Set token metadata
        self.name.set_str("Sports Performance Protocol Token");
        self.symbol.set_str("SPP");
        self.decimals.set(18);

        // Set owner
        self.owner.set(caller);

        // Mint initial supply to owner
        self.total_supply.set(initial_supply);
        self.balances.setter(caller).set(initial_supply);

        // Initialize total burned
        self.total_burned.set(U256::from(0));

        // Emit mint event
        evm::log(Mint {
            to: caller,
            value: initial_supply,
        });

        // Emit transfer from zero address (ERC-20 standard)
        evm::log(Transfer {
            from: Address::ZERO,
            to: caller,
            value: initial_supply,
        });

        Ok(())
    }

    /// Set the burn contract address (admin only)
    pub fn set_burn_contract(&mut self, burn_contract: Address) -> Result<(), Vec<u8>> {
        if msg::sender() != self.owner.get() {
            return Err(Unauthorized {}.encode());
        }

        self.burn_contract.set(burn_contract);
        Ok(())
    }

    // ==================== ERC-20 Standard Functions ====================

    /// Get token name
    pub fn name(&self) -> Result<String, Vec<u8>> {
        Ok(self.name.get_string())
    }

    /// Get token symbol
    pub fn symbol(&self) -> Result<String, Vec<u8>> {
        Ok(self.symbol.get_string())
    }

    /// Get decimals
    pub fn decimals(&self) -> Result<u8, Vec<u8>> {
        Ok(self.decimals.get())
    }

    /// Get total supply
    pub fn total_supply(&self) -> Result<U256, Vec<u8>> {
        Ok(self.total_supply.get())
    }

    /// Get balance of an account
    pub fn balance_of(&self, account: Address) -> Result<U256, Vec<u8>> {
        Ok(self.balances.get(account))
    }

    /// Get allowance
    pub fn allowance(&self, owner: Address, spender: Address) -> Result<U256, Vec<u8>> {
        Ok(self.allowances.get(owner).get(spender))
    }

    /// Transfer tokens to another address
    pub fn transfer(&mut self, to: Address, amount: U256) -> Result<bool, Vec<u8>> {
        let from = msg::sender();
        self._transfer(from, to, amount)?;
        Ok(true)
    }

    /// Approve spender to spend tokens
    pub fn approve(&mut self, spender: Address, amount: U256) -> Result<bool, Vec<u8>> {
        let owner = msg::sender();

        if spender == Address::ZERO {
            return Err(InvalidAddress {}.encode());
        }

        self.allowances.setter(owner).setter(spender).set(amount);

        evm::log(Approval {
            owner,
            spender,
            value: amount,
        });

        Ok(true)
    }

    /// Transfer tokens from one address to another using allowance
    pub fn transfer_from(
        &mut self,
        from: Address,
        to: Address,
        amount: U256,
    ) -> Result<bool, Vec<u8>> {
        let spender = msg::sender();

        // Check allowance
        let current_allowance = self.allowances.get(from).get(spender);
        if current_allowance < amount {
            return Err(InsufficientAllowance {}.encode());
        }

        // Decrease allowance
        self.allowances
            .setter(from)
            .setter(spender)
            .set(current_allowance - amount);

        // Execute transfer
        self._transfer(from, to, amount)?;

        Ok(true)
    }

    // ==================== Burn & Mint Functions ====================

    /// Burn tokens from caller's balance
    pub fn burn(&mut self, amount: U256) -> Result<(), Vec<u8>> {
        let from = msg::sender();
        self._burn(from, amount)?;
        Ok(())
    }

    /// Burn tokens from a specific address (only burn contract)
    pub fn burn_from(&mut self, from: Address, amount: U256) -> Result<(), Vec<u8>> {
        let caller = msg::sender();

        // Only burn contract can call this
        if caller != self.burn_contract.get() && caller != self.owner.get() {
            return Err(Unauthorized {}.encode());
        }

        self._burn(from, amount)?;
        Ok(())
    }

    /// Mint new tokens (only owner)
    pub fn mint(&mut self, to: Address, amount: U256) -> Result<(), Vec<u8>> {
        if msg::sender() != self.owner.get() {
            return Err(Unauthorized {}.encode());
        }

        if to == Address::ZERO {
            return Err(InvalidAddress {}.encode());
        }

        // Increase total supply
        let current_supply = self.total_supply.get();
        self.total_supply.set(current_supply + amount);

        // Increase recipient balance
        let recipient_balance = self.balances.get(to);
        self.balances.setter(to).set(recipient_balance + amount);

        evm::log(Mint { to, value: amount });

        evm::log(Transfer {
            from: Address::ZERO,
            to,
            value: amount,
        });

        Ok(())
    }

    /// Get total tokens burned
    pub fn get_total_burned(&self) -> Result<U256, Vec<u8>> {
        Ok(self.total_burned.get())
    }

    /// Get circulating supply (total_supply - total_burned)
    pub fn circulating_supply(&self) -> Result<U256, Vec<u8>> {
        let total = self.total_supply.get();
        let burned = self.total_burned.get();
        Ok(total - burned)
    }

    // ==================== Internal Functions ====================

    /// Internal transfer function
    fn _transfer(&mut self, from: Address, to: Address, amount: U256) -> Result<(), Vec<u8>> {
        if from == Address::ZERO || to == Address::ZERO {
            return Err(InvalidAddress {}.encode());
        }

        // Check sender balance
        let from_balance = self.balances.get(from);
        if from_balance < amount {
            return Err(InsufficientBalance {}.encode());
        }

        // Update balances
        self.balances.setter(from).set(from_balance - amount);

        let to_balance = self.balances.get(to);
        self.balances.setter(to).set(to_balance + amount);

        evm::log(Transfer {
            from,
            to,
            value: amount,
        });

        Ok(())
    }

    /// Internal burn function
    fn _burn(&mut self, from: Address, amount: U256) -> Result<(), Vec<u8>> {
        if from == Address::ZERO {
            return Err(InvalidAddress {}.encode());
        }

        // Check balance
        let from_balance = self.balances.get(from);
        if from_balance < amount {
            return Err(InsufficientBalance {}.encode());
        }

        // Decrease balance
        self.balances.setter(from).set(from_balance - amount);

        // Decrease total supply
        let current_supply = self.total_supply.get();
        self.total_supply.set(current_supply - amount);

        // Increase total burned
        let current_burned = self.total_burned.get();
        self.total_burned.set(current_burned + amount);

        evm::log(Burn {
            from,
            value: amount,
        });

        evm::log(Transfer {
            from,
            to: Address::ZERO,
            value: amount,
        });

        Ok(())
    }
}
