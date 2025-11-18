"use client";
import React, { useState, useEffect } from "react";
import { PublicKey, SystemProgram, Connection } from "@solana/web3.js";
import { AnchorProvider, Program } from "@coral-xyz/anchor";
import { useAnchorWallet } from "@solana/wallet-adapter-react";
import { useToast } from "@/app/providers/ToastProvider";
import { DecentraVote } from "@/lib/anchor/decentra_vote";
import idl from "@/lib/anchor/decentra_vote.json";

interface VoteButtonProps {
  eventPda: string;
  choices: string[];
  deadline?: number;
}

export function VoteButton({ eventPda, choices, deadline }: VoteButtonProps) {
  const wallet = useAnchorWallet();
  const { showSuccess, showError } = useToast();
  
  const [plusChoices, setPlusChoices] = useState<number[]>([]);
  const [minusChoices, setMinusChoices] = useState<number[]>([]);
  
  // D21 configuration (will be fetched from event)
  const [maxPlusVotes, setMaxPlusVotes] = useState(2);
  const [allowMinus, setAllowMinus] = useState(false);
  const [maxMinusVotes, setMaxMinusVotes] = useState(0);
  const [minPlusForMinus, setMinPlusForMinus] = useState(2);

  // Fetch event configuration on mount
  useEffect(() => {
    const fetchEventConfig = async () => {
      try {
        const connection = new Connection("https://api.devnet.solana.com");
        const provider = new AnchorProvider(connection, {} as any, {
          preflightCommitment: "processed",
        });
        const program = new Program<DecentraVote>(idl as DecentraVote, provider);
        const eventPublicKey = new PublicKey(eventPda);
        const eventAccount = await program.account.eventAccount.fetch(eventPublicKey);
        
        setMaxPlusVotes(eventAccount.maxPlusVotes);
        setAllowMinus(eventAccount.allowMinus);
        setMaxMinusVotes(eventAccount.maxMinusVotes);
        setMinPlusForMinus(eventAccount.minPlusForMinus);
      } catch (err) {
        console.error("Failed to fetch event config:", err);
      }
    };
    
    fetchEventConfig();
  }, [eventPda]);

  const togglePlusChoice = (idx: number) => {
    if (plusChoices.includes(idx)) {
      setPlusChoices(plusChoices.filter(i => i !== idx));
    } else {
      if (plusChoices.length >= maxPlusVotes) {
        showError(`You can only select up to ${maxPlusVotes} plus votes`);
        return;
      }
      // Remove from minus if it's there
      if (minusChoices.includes(idx)) {
        setMinusChoices(minusChoices.filter(i => i !== idx));
      }
      setPlusChoices([...plusChoices, idx]);
    }
  };

  const toggleMinusChoice = (idx: number) => {
    if (!allowMinus) return;
    
    if (minusChoices.includes(idx)) {
      setMinusChoices(minusChoices.filter(i => i !== idx));
    } else {
      if (minusChoices.length >= maxMinusVotes) {
        showError(`You can only select up to ${maxMinusVotes} minus votes`);
        return;
      }
      // Remove from plus if it's there
      if (plusChoices.includes(idx)) {
        setPlusChoices(plusChoices.filter(i => i !== idx));
      }
      setMinusChoices([...minusChoices, idx]);
    }
  };

  const handleVote = async () => {
    if (!wallet) {
      showError("Please connect your wallet first!");
      return;
    }

    // Validate selections
    if (plusChoices.length === 0) {
      showError("Please select at least one plus vote");
      return;
    }

    if (minusChoices.length > 0 && plusChoices.length < minPlusForMinus) {
      showError(`You need at least ${minPlusForMinus} plus votes to cast minus votes`);
      return;
    }

    // Check if voting is closed
    if (deadline) {
      const now = Math.floor(Date.now() / 1000);
      if (now >= deadline) {
        showError("Voting has closed for this event!");
        return;
      }
    }

    try {
      const connection = new Connection("https://api.devnet.solana.com");
      const provider = new AnchorProvider(connection, wallet, {
        preflightCommitment: "processed",
      });
      const program = new Program<DecentraVote>(idl as DecentraVote, provider);

      const voter = provider.wallet.publicKey;
      const eventPublicKey = new PublicKey(eventPda);
      
      const [votePda] = await PublicKey.findProgramAddress(
        [Buffer.from("vote"), eventPublicKey.toBuffer(), voter.toBuffer()],
        program.programId
      );
      
      // Check balance
      const balance = await connection.getBalance(voter);
      if (balance < 5000000) {
        showError(`Insufficient funds: ${(balance / 1000000000).toFixed(4)} SOL.\n\nNeed at least 0.005 SOL for transaction fees.`);
        return;
      }

      // Prepare vote data - Convert to Buffer for proper Anchor encoding
      const plusChoicesBuffer = Buffer.from(plusChoices);
      const minusChoicesParam = minusChoices.length > 0 ? Buffer.from(minusChoices) : null;

      // Simulate first to catch errors
      try {
        await program.methods
          .castVote(plusChoicesBuffer, minusChoicesParam)
          .accounts({
            event: eventPublicKey,
            voteRecord: votePda,
            voter: voter,
            systemProgram: SystemProgram.programId,
          })
          .simulate();
      } catch (simErr: any) {
        if (simErr.logs) {
          // Check for already voted
          const alreadyVoted = simErr.logs.some((log: string) => 
            log.includes('already in use') || 
            log.includes('AlreadyVoted') ||
            log.toLowerCase().includes('already')
          );
          
          if (alreadyVoted) {
            showError('You have already voted on this event!');
            return;
          }

          // Check for voting closed
          const votingClosed = simErr.logs.some((log: string) => 
            log.includes('VotingClosed') ||
            log.toLowerCase().includes('deadline')
          );
          
          if (votingClosed) {
            showError('Voting has closed for this event!');
            return;
          }

          // Check for validation errors
          const errorLog = simErr.logs.find((log: string) => 
            log.includes('Error') || log.includes('error')
          );
          
          if (errorLog) {
            showError(`Cannot cast vote: ${errorLog}`);
            return;
          }
        }
      }

      const txSig = await program.methods
        .castVote(plusChoicesBuffer, minusChoicesParam)
        .accounts({
          event: eventPublicKey,
          voteRecord: votePda,
          voter: voter,
          systemProgram: SystemProgram.programId,
        })
        .rpc({ skipPreflight: false });

      const plusNames = plusChoices.map(i => choices[i]).join(", ");
      const minusNames = minusChoices.length > 0 ? minusChoices.map(i => choices[i]).join(", ") : null;
      
      let message = `Vote cast successfully!\n\nPlus: ${plusNames}`;
      if (minusNames) {
        message += `\nMinus: ${minusNames}`;
      }
      message += `\n\nTransaction: ${txSig.slice(0, 8)}...${txSig.slice(-8)}`;
      
      showSuccess(message);
      
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err: any) {
      let errorMsg = 'Failed to cast vote';
      
      if (err?.logs && Array.isArray(err.logs)) {
        // Check for already voted
        if (err.logs.some((log: string) => 
          log.includes('AlreadyVoted') || 
          log.includes('already in use') ||
          log.toLowerCase().includes('already')
        )) {
          showError('You have already voted on this event!');
          return;
        }
        
        // Check for voting closed
        if (err.logs.some((log: string) => 
          log.includes('VotingClosed') ||
          log.toLowerCase().includes('deadline')
        )) {
          showError('Voting has closed for this event!');
          return;
        }

        // Extract other relevant errors
        const relevantLogs = err.logs.filter((log: string) => 
          log.includes('Error') || 
          log.includes('failed') ||
          log.includes('custom program error')
        );
        
        if (relevantLogs.length > 0) {
          errorMsg = relevantLogs.join('\n');
        }
      } else if (err?.message) {
        errorMsg = err.message;
      }
      
      showError(errorMsg);
    }
  };

  return (
    <div className="space-y-6 w-full max-w-2xl mx-auto">
      {/* Instructions */}
      <div className="bg-foreground/5 border border-foreground/10 rounded-lg p-4 text-sm text-foreground/70">
        <p className="font-medium mb-2">D21 Voting Instructions:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Select up to {maxPlusVotes} choices you support (plus votes)</li>
          {allowMinus && (
            <>
              <li>Optionally select up to {maxMinusVotes} choices you oppose (minus votes)</li>
              <li>You must cast at least {minPlusForMinus} plus votes to use minus votes</li>
            </>
          )}
        </ul>
      </div>

      {/* Plus Votes */}
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-3">
          Plus Votes ({plusChoices.length}/{maxPlusVotes})
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {choices.map((choice, idx) => {
            const isSelected = plusChoices.includes(idx);
            const isMinusSelected = minusChoices.includes(idx);
            
            return (
              <button
                key={`plus-${idx}`}
                onClick={() => togglePlusChoice(idx)}
                disabled={isMinusSelected}
                className={`px-4 py-3 rounded-lg border-2 transition-all duration-200 font-medium text-left ${
                  isSelected
                    ? "border-green-500 bg-green-500/20 text-green-600"
                    : isMinusSelected
                    ? "border-foreground/10 bg-foreground/5 text-foreground/30 cursor-not-allowed"
                    : "border-foreground/30 hover:border-green-500 hover:bg-green-500/10 text-foreground"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span>{choice}</span>
                  {isSelected && <span className="text-xl">✓</span>}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Minus Votes (if enabled) */}
      {allowMinus && (
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-3">
            Minus Votes ({minusChoices.length}/{maxMinusVotes}) - Optional
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {choices.map((choice, idx) => {
              const isSelected = minusChoices.includes(idx);
              const isPlusSelected = plusChoices.includes(idx);
              
              return (
                <button
                  key={`minus-${idx}`}
                  onClick={() => toggleMinusChoice(idx)}
                  disabled={isPlusSelected}
                  className={`px-4 py-3 rounded-lg border-2 transition-all duration-200 font-medium text-left ${
                    isSelected
                      ? "border-red-500 bg-red-500/20 text-red-600"
                      : isPlusSelected
                      ? "border-foreground/10 bg-foreground/5 text-foreground/30 cursor-not-allowed"
                      : "border-foreground/30 hover:border-red-500 hover:bg-red-500/10 text-foreground"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{choice}</span>
                    {isSelected && <span className="text-xl">✗</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Submit Button */}
      <button
        onClick={handleVote}
        disabled={plusChoices.length === 0}
        className="w-full px-6 py-4 bg-foreground hover:bg-foreground/80 active:bg-foreground/70 text-background font-semibold rounded-lg transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Cast Vote
      </button>
    </div>
  );
}
