# DecentraVote Anchor Program

This workspace contains the on-chain logic for DecentraVote, a Democracy 2.1 (D21) voting system built with Anchor. The core implementation lives in `programs/decentra_vote/src/lib.rs`, which defines the program ID, instructions, accounts, and error types.

## Instructions
- `initialize_event`: Creates a new voting event PDA using seeds `["event", creator, timestamp]`. It stores metadata (title, description, choices, deadline) plus the D21 configuration (`max_plus_votes`, `allow_minus`, `max_minus_votes`, `min_plus_for_minus`). The handler validates string lengths, non-empty choices, and all D21 invariants before initializing a zeroed tally vector.
- `cast_vote`: Records a voter’s selections into a `VoteAccount` PDA derived from `["vote", event, voter]`. It enforces the event deadline, checks for duplicate voting, validates choice indices, prevents duplicate or overlapping selections, enforces the configured D21 limits, and then updates the event’s signed `total_votes` vector (+1 per plus choice, -1 per minus choice).

## Accounts
- `EventAccount`: Persistent state for a voting event including creator pubkey, descriptive fields, choice list, deadline, D21 configuration, and the signed tally vector (`Vec<i64>`).
- `VoteAccount`: Stores a voter pubkey, `has_voted` flag, and the indices of their plus and minus choices to guarantee “one vote per wallet per event”.

## Errors
`ErrorCode` enumerates the validation failures surfaced by the handlers (e.g., `VotingClosed`, `NoChoicesProvided`, `TooManyPlusVotes`, `MinusVotesNotAllowed`, `OverlappingChoices`). Each maps to the corresponding `require!` checks inside the instruction logic.