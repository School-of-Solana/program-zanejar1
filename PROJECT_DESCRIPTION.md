# Project Description

**Deployed Frontend URL:** https://decentra-vote-one.vercel.app/

**Solana Program ID:** FXGf1kvpC6pHSZWbPpLjAuDYNW6Bkax3E4SUEcfdBvwY

## Project Overview

### Description
A decentralized voting application implementing the D21 (Democracy 2.1) voting methodology on Solana. Users can create voting events with customizable configurations and cast sophisticated multi-choice votes using the Janeček Method. The D21 system allows voters to give multiple positive votes and optionally negative votes, enabling more nuanced preference expression than traditional single-choice voting. Each event is stored on-chain with deterministic addressing, ensuring transparency and immutability of voting records.

### Key Features
- **Create D21 Events**: Initialize voting events with customizable parameters (title, description, choices, deadline)
- **Flexible D21 Configuration**: Set maximum plus votes, enable/disable minus votes, configure minimum plus votes required for minus voting
- **Multi-Choice Voting**: Cast votes with multiple positive selections and optional negative selections
- **Vote Validation**: Comprehensive on-chain validation preventing duplicates, overlaps, and constraint violations
- **Real-time Tallies**: View live vote counts with signed integers supporting both positive and negative vote totals
- **One Vote Per Wallet**: Enforce single vote per wallet per event using PDAs
- **Deadline Management**: Automatic vote closing when deadline passes

### How to Use the dApp
1. **Connect Wallet** - Connect your Solana wallet (Phantom, Solflare, etc.)
2. **Create Voting Event** - Click "Create Vote" and configure:
   - Event title and description
   - Multiple choice options
   - Voting deadline
   - D21 parameters (max plus votes, allow minus, max minus votes, minimum plus for minus)
3. **Browse Events** - View all active voting events on the "All Votes" page
4. **Cast Vote** - Select an event and choose:
   - Multiple positive choices (up to configured maximum)
   - Optional negative choices (if enabled and requirements met)
5. **View Results** - See real-time vote tallies with signed integer counts showing net positive/negative votes

## Program Architecture
DecentraVote uses a dual-account architecture with PDAs for deterministic addressing. The program implements two core instructions with extensive validation logic to ensure D21 voting rules are properly enforced on-chain. Vote tallies are stored as signed integers to accommodate negative votes from the minus voting feature.

### PDA Usage
The program uses Program Derived Addresses to create deterministic, collision-free accounts for events and votes.

**PDAs Used:**
- **Event PDA**: Derived from seeds `["event", creator_pubkey, timestamp]` - ensures each creator can create multiple unique events with deterministic addresses. Timestamp prevents collisions for same creator.
- **Vote PDA**: Derived from seeds `["vote", event_pubkey, voter_pubkey]` - guarantees one vote per wallet per event, preventing double voting while maintaining deterministic lookups.

### Program Instructions
**Instructions Implemented:**
- **initialize_event**: Creates a new voting event with D21 configuration. Validates title/description lengths, ensures choices are provided, and validates D21 parameter constraints (max_plus_votes > 0, max_minus_votes <= max_plus_votes, etc.). Initializes vote tally array with zeros.
- **cast_vote**: Records a D21 vote with plus and optional minus choices. Validates deadline hasn't passed, checks for duplicate voting, validates choice indices are in range, ensures no duplicate or overlapping choices, enforces D21 constraints (min plus votes for minus), and updates signed integer tallies (+1 for plus votes, -1 for minus votes).

### Account Structure
```rust
#[account]
pub struct EventAccount {
    pub creator: Pubkey,           // Wallet that created this event
    pub title: String,             // Event title (max 64 chars)
    pub description: String,       // Event description (max 256 chars)
    pub choices: Vec<String>,      // Vote options (up to 10, each 64 chars)
    pub deadline: i64,             // Unix timestamp when voting closes
    // D21 configuration
    pub max_plus_votes: u8,        // Maximum positive votes allowed per voter
    pub allow_minus: bool,         // Whether negative votes are enabled
    pub max_minus_votes: u8,       // Maximum negative votes allowed per voter
    pub min_plus_for_minus: u8,    // Minimum plus votes required to use minus votes
    // Vote tallies (signed to support negative votes)
    pub total_votes: Vec<i64>,     // Net vote count per choice (can be negative)
}

#[account]
pub struct VoteAccount {
    pub voter: Pubkey,             // Wallet that cast this vote
    pub has_voted: bool,           // Flag to prevent double voting
    pub plus_choices: Vec<u8>,     // Indices of choices voted positively
    pub minus_choices: Vec<u8>,    // Indices of choices voted negatively
}
```

## Testing

### Test Coverage
Comprehensive test suite with 17 tests covering all instructions with both successful operations and error conditions. Tests validate D21 logic, PDA creation, vote tallies with signed integers, and all error paths.

**Happy Path Tests:**
- **Create D21 Event Successfully**: Verifies event initialization with all D21 parameters correctly stored
- **Cast Vote with Plus Votes Only**: Tests standard positive voting and verifies tally increments
- **Cast Vote with Plus and Minus Votes**: Tests D21 negative voting with signed integer tallies, verifies minus votes create negative counts

**Unhappy Path Tests:**
- **Empty Choices**: Fails when creating event with no choices provided
- **Title Too Long**: Fails when title exceeds 64 characters
- **Description Too Long**: Fails when description exceeds 256 characters
- **Invalid D21 Config (max_plus_votes = 0)**: Fails when max plus votes is zero
- **Invalid Config (max_minus > max_plus)**: Fails when minus votes exceed plus votes allowed
- **Double Voting**: Fails when wallet attempts to vote twice on same event
- **No Plus Votes**: Fails when casting vote with empty plus choices
- **Too Many Plus Votes**: Fails when exceeding max_plus_votes limit
- **Duplicate Plus Choices**: Fails when same choice appears multiple times in plus votes
- **Choice Out of Range**: Fails when choice index exceeds available options
- **Minus Not Allowed**: Fails when attempting minus votes on event that disabled them
- **Insufficient Plus for Minus**: Fails when trying to use minus votes without meeting min_plus_for_minus requirement
- **Overlapping Plus and Minus**: Fails when same choice appears in both plus and minus selections
- **Voting After Deadline**: Fails when attempting to vote after deadline has passed

### Running Tests
```bash
cd anchor_project
yarn install              # Install dependencies
anchor test --skip-deploy # Run tests with deployed program
anchor test               # Build, deploy, and run tests
```

### Additional Notes for Evaluators

Implementing D21 voting was significantly more complex than traditional voting systems due to the multi-choice constraints and minus vote validation logic. The biggest challenge was ensuring all edge cases were covered - preventing overlapping choices, enforcing minimum plus votes before allowing minus votes, and handling signed integer arithmetic for vote tallies. Using PDAs with timestamp seeds for events took some iteration to get right, but ultimately provided a clean solution for multi-event support per creator. The frontend Buffer encoding for bytes type parameters was initially tricky but solved by converting arrays to Node.js Buffer objects before sending to the program.