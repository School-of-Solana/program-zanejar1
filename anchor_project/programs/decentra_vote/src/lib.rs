use anchor_lang::prelude::*;

declare_id!("FXGf1kvpC6pHSZWbPpLjAuDYNW6Bkax3E4SUEcfdBvwY");

#[program]
pub mod decentra_vote {
    use super::*;

    pub fn initialize_event(
        ctx: Context<InitializeEvent>,
        title: String,
        description: String,
        choices: Vec<String>,
        deadline: i64,
        timestamp: i64,
        max_plus_votes: u8,
        allow_minus: bool,
        max_minus_votes: u8,
        min_plus_for_minus: u8,
    ) -> Result<()> {
        require!(!choices.is_empty(), ErrorCode::NoChoicesProvided);
        require!(title.len() <= 64, ErrorCode::TitleTooLong);
        require!(description.len() <= 256, ErrorCode::DescriptionTooLong);
        require!(
            max_plus_votes > 0 && (max_plus_votes as usize) <= choices.len(),
            ErrorCode::InvalidConfig
        );
        if allow_minus {
            require!(
                max_minus_votes > 0 && max_minus_votes <= max_plus_votes,
                ErrorCode::InvalidConfig
            );
            require!(
                min_plus_for_minus >= 1 && min_plus_for_minus <= max_plus_votes,
                ErrorCode::InvalidConfig
            );
        }

        let event = &mut ctx.accounts.event;

        event.creator = ctx.accounts.creator.key();
        event.title = title;
        event.description = description;
        event.choices = choices;
        event.deadline = deadline;
        event.max_plus_votes = max_plus_votes;
        event.allow_minus = allow_minus;
        event.max_minus_votes = max_minus_votes;
        event.min_plus_for_minus = min_plus_for_minus;
        event.total_votes = vec![0i64; event.choices.len()];

        msg!("Event initialized by {}", event.creator);
        msg!("Timestamp seed used: {}", timestamp);
        msg!("Title: {}", event.title);
        msg!("Choices: {:?}", event.choices);
        msg!("Deadline: {}", event.deadline);
        msg!("D21 Config: max_plus={}, allow_minus={}, max_minus={}, min_plus_for_minus={}", 
             max_plus_votes, allow_minus, max_minus_votes, min_plus_for_minus);

        Ok(())
    }

    pub fn cast_vote(
        ctx: Context<CastVote>,
        plus_choices: Vec<u8>,
        minus_choices: Option<Vec<u8>>,
    ) -> Result<()> {
        let event = &mut ctx.accounts.event;
        let voter = &ctx.accounts.voter;

        // Ensure deadline not passed
        let clock = Clock::get()?;
        require!(clock.unix_timestamp < event.deadline, ErrorCode::VotingClosed);

        // Check if already voted
        require!(!ctx.accounts.vote_record.has_voted, ErrorCode::AlreadyVoted);

        // Validate plus_choices
        require!(!plus_choices.is_empty(), ErrorCode::NoChoicesProvided);
        require!(
            plus_choices.len() <= event.max_plus_votes as usize,
            ErrorCode::TooManyPlusVotes
        );

        // Check for duplicates in plus_choices
        for i in 0..plus_choices.len() {
            for j in (i + 1)..plus_choices.len() {
                require!(plus_choices[i] != plus_choices[j], ErrorCode::DuplicateChoices);
            }
        }

        // Validate each plus choice index
        for &idx in plus_choices.iter() {
            require!(
                (idx as usize) < event.choices.len(),
                ErrorCode::ChoiceOutOfRange
            );
        }

        // Validate minus_choices if provided
        let minus = if let Some(ref minus_list) = minus_choices {
            require!(event.allow_minus, ErrorCode::MinusVotesNotAllowed);
            require!(
                minus_list.len() <= event.max_minus_votes as usize,
                ErrorCode::TooManyMinusVotes
            );
            require!(
                plus_choices.len() >= event.min_plus_for_minus as usize,
                ErrorCode::InsufficientPlusVotes
            );

            // Check for duplicates in minus_choices
            for i in 0..minus_list.len() {
                for j in (i + 1)..minus_list.len() {
                    require!(minus_list[i] != minus_list[j], ErrorCode::DuplicateChoices);
                }
            }

            // Validate each minus choice index
            for &idx in minus_list.iter() {
                require!(
                    (idx as usize) < event.choices.len(),
                    ErrorCode::ChoiceOutOfRange
                );
            }

            // Check no overlap between plus and minus
            for &plus_idx in plus_choices.iter() {
                for &minus_idx in minus_list.iter() {
                    require!(plus_idx != minus_idx, ErrorCode::OverlappingChoices);
                }
            }

            minus_list.clone()
        } else {
            vec![]
        };

        // Apply tally - plus votes
        for &idx in plus_choices.iter() {
            let idx_usize = idx as usize;
            event.total_votes[idx_usize] = event.total_votes[idx_usize]
                .checked_add(1)
                .ok_or(error!(ErrorCode::Overflow))?;
        }

        // Apply tally - minus votes
        for &idx in minus.iter() {
            let idx_usize = idx as usize;
            event.total_votes[idx_usize] = event.total_votes[idx_usize]
                .checked_sub(1)
                .ok_or(error!(ErrorCode::Overflow))?;
        }

        // Record the vote
        let vote_record = &mut ctx.accounts.vote_record;
        vote_record.voter = voter.key();
        vote_record.has_voted = true;
        vote_record.plus_choices = plus_choices.clone();
        vote_record.minus_choices = minus;

        msg!("Voter {} cast D21 vote", voter.key());
        msg!("Plus choices: {:?}", plus_choices);
        msg!("Minus choices: {:?}", vote_record.minus_choices);

        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(title: String, description: String, choices: Vec<String>, deadline: i64, timestamp: i64, max_plus_votes: u8, allow_minus: bool, max_minus_votes: u8, min_plus_for_minus: u8)]
pub struct InitializeEvent<'info> {
    #[account(
        init,
        payer = creator,
        space = 8 + EventAccount::MAX_SIZE,
        seeds = [
            b"event",
            creator.key().as_ref(),
            &timestamp.to_le_bytes(), 
        ],
        bump
    )]
    pub event: Account<'info, EventAccount>,

    #[account(mut)]
    pub creator: Signer<'info>,

    pub system_program: Program<'info, System>,
    pub clock: Sysvar<'info, Clock>,
}

#[account]
pub struct EventAccount {
    pub creator: Pubkey,
    pub title: String,
    pub description: String,
    pub choices: Vec<String>,
    pub deadline: i64,
    // D21 configuration
    pub max_plus_votes: u8,
    pub allow_minus: bool,
    pub max_minus_votes: u8,
    pub min_plus_for_minus: u8,
    // totals now signed to allow negative adjustments from minus votes
    pub total_votes: Vec<i64>,
}

impl EventAccount {
    pub const MAX_SIZE: usize =
        32 + // creator
        4 + 64 + // title (max 64 chars)
        4 + 256 + // description (max 256 chars)
        4 + (4 + 64) * 10 + // choices (up to 10 choices, each 64 chars)
        8 + // deadline (i64)
        1 + // max_plus_votes (u8)
        1 + // allow_minus (bool)
        1 + // max_minus_votes (u8)
        1 + // min_plus_for_minus (u8)
        4 + (8 * 10); // total_votes (Vec<i64>, up to 10 entries, each i64 = 8 bytes)
}

#[derive(Accounts)]
pub struct CastVote<'info> {
    #[account(mut)]
    pub event: Account<'info, EventAccount>,

    #[account(
        init,
        payer = voter,
        space = 8 + VoteAccount::MAX_SIZE,
        seeds = [b"vote", event.key().as_ref(), voter.key().as_ref()],
        bump
    )]
    pub vote_record: Account<'info, VoteAccount>,

    #[account(mut)]
    pub voter: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[account]
pub struct VoteAccount {
    pub voter: Pubkey,
    pub has_voted: bool,
    pub plus_choices: Vec<u8>,
    pub minus_choices: Vec<u8>,
}

impl VoteAccount {
    pub const MAX_SIZE: usize = 32 + 1 + (4 + 10) + (4 + 10);
    // 32 pubkey + 1 bool + Vec<u8> header (4 bytes) + up to 10 items
    // + same for minus_choices
}

#[error_code]
pub enum ErrorCode {
    #[msg("Voting deadline has passed")]
    VotingClosed,
    #[msg("You have already voted")]
    AlreadyVoted,
    #[msg("Invalid choice index")]
    InvalidChoice,
    #[msg("No choices provided for the event")]
    NoChoicesProvided,
    #[msg("Title is too long (max 64 characters)")]
    TitleTooLong,
    #[msg("Description is too long (max 256 characters)")]
    DescriptionTooLong,
    #[msg("Invalid event configuration")]
    InvalidConfig,
    #[msg("Duplicate choices provided")]
    DuplicateChoices,
    #[msg("Choice index out of range")]
    ChoiceOutOfRange,
    #[msg("Overflow in vote tally")]
    Overflow,
    #[msg("Too many plus votes")]
    TooManyPlusVotes,
    #[msg("Minus votes are not allowed for this event")]
    MinusVotesNotAllowed,
    #[msg("Too many minus votes")]
    TooManyMinusVotes,
    #[msg("Insufficient plus votes to cast minus votes")]
    InsufficientPlusVotes,
    #[msg("Overlapping choices between plus and minus votes")]
    OverlappingChoices,
}
