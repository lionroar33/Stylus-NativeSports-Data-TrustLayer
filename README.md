
SPP Oracle — Stylus-Native Trust Layer

This repository contains the Rust-based WASM implementation of the Sports Performance Protocol (SPP) Trust Layer, purpose-built for the Arbitrum Stylus execution environment.

Unlike traditional EVM-based oracles, the SPP Stylus Oracle leverages high-performance WASM computation to support complex, real-time Proof-of-Performance audits for sports and athlete data.

"Why" behind each language:

Technical Stack

Smart Contracts:[Rust](https://www.rust-lang.org/) (Arbitrum Stylus / WASM) — Chosen for sub-second verification speeds and 75%+ gas efficiency.

Oracle Middleware: [NestJS](https://nestjs.com/) / [TypeScript](https://www.typescriptlang.org/) — Ensures robust off-chain data ingestion and API security.

Client SDK: [TypeScript] — Facilitating "plug-and-play" integration for Arbitrum Orbit developers.


Technical Focus
🧠 Computational Identity (cNFTs)

We move beyond static metadata by introducing Computational NFTs (cNFTs). Athlete attributes are calculated natively in Rust using high-precision floating-point math—operations that are prohibitively expensive or impractical in Solidity.

⚡ WASM-Native Verification

Built with the stylus-sdk, the oracle performs:

Batch signature verification

Bitwise data processing

Real-time validation of sports performance events

All executed inside the Stylus WASM engine for maximum efficiency.

⛽ Gas Efficiency

By offloading heavy computation to WASM, the SPP Stylus Oracle targets a 75–85% reduction in gas costs for performance updates compared to standard EVM-only oracle implementations.

Project Architecture
🔐 Verification Engine

Core Rust logic responsible for validating signed performance packets sourced from:

IoT devices

Wearable APIs

Authorized data providers

📈 Dynamic Scoring Engine

On-chain athlete attribute leveling and scoring algorithms executed directly within the Stylus WASM runtime.

🔌 Developer API

A modular interface enabling other Arbitrum protocols to query verified sports data, including:

Fantasy Sports platforms

Sports Betting protocols

Scouting & Talent DAOs

