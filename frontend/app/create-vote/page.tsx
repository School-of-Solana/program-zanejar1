"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { AnchorProvider, Program, BN } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram, Connection } from "@solana/web3.js";
import { useAnchorWallet } from "@solana/wallet-adapter-react";
import { useToast } from "@/app/providers/ToastProvider";
import idl from "@/lib/anchor/decentra_vote.json";
import { DecentraVote } from "@/lib/anchor/decentra_vote";

function Page() {
  const router = useRouter();
  const wallet = useAnchorWallet();
  const { showSuccess, showError } = useToast();
  const [data, setData] = useState({
    title: "",
    oneLiner: "",
    deadline: ""
  });
  const [choices, setChoices] = useState<string[]>(["", ""]);
  
  // D21 voting configuration
  const [maxPlusVotes, setMaxPlusVotes] = useState(2);
  const [allowMinus, setAllowMinus] = useState(false);
  const [maxMinusVotes, setMaxMinusVotes] = useState(1);
  const [minPlusForMinus, setMinPlusForMinus] = useState(2);
  
  const [lastError, setLastError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setData((prev) => ({ ...prev, [name]: value }));
  };

  const handleChoiceChange = (index: number, value: string) => {
    const newChoices = [...choices];
    newChoices[index] = value;
    setChoices(newChoices);
  };

  const addChoice = () => {
    if (choices.length < 5) {
      setChoices([...choices, ""]);
    } else {
      showError("Maximum 5 choices allowed");
    }
  };

  const removeChoice = (index: number) => {
    if (choices.length > 2) {
      setChoices(choices.filter((_, i) => i !== index));
    } else {
      showError("Minimum 2 choices required");
    }
  };

  const handleDeploy = async () => {
    if (!wallet) {
      showError("Please connect your wallet first!");
      return;
    }

    // Validation
    if (!data.title.trim()) {
      showError("Please enter a vote title");
      return;
    }
    if (!data.oneLiner.trim()) {
      showError("Please enter a description");
      return;
    }
    if (!data.deadline || parseInt(data.deadline) <= 0) {
      showError("Please enter a valid deadline");
      return;
    }
    
    const validChoices = choices.filter(c => c.trim());
    if (validChoices.length < 2) {
      showError("Please enter at least 2 choices");
      return;
    }
    
    // Validate D21 configuration
    if (maxPlusVotes < 1 || maxPlusVotes > validChoices.length) {
      showError(`Max plus votes must be between 1 and ${validChoices.length}`);
      return;
    }
    if (allowMinus) {
      if (maxMinusVotes < 1 || maxMinusVotes > maxPlusVotes) {
        showError("Max minus votes must be between 1 and max plus votes");
        return;
      }
      if (minPlusForMinus < 1 || minPlusForMinus > maxPlusVotes) {
        showError("Min plus for minus must be between 1 and max plus votes");
        return;
      }
    }

    setLastError(null);
    
    try {
      const connection = new Connection("https://api.devnet.solana.com");
      const provider = new AnchorProvider(connection, wallet, {
        preflightCommitment: "processed",
      });

      const program = new Program<DecentraVote>(idl as DecentraVote, provider);

      const creator = provider.wallet.publicKey;
      const balance = await connection.getBalance(creator);
      const MIN_LAMPORTS = 1000000;
      
      if (balance < MIN_LAMPORTS) {
        const msg = `Insufficient funds: ${(balance / 1000000000).toFixed(4)} SOL.\n\nPlease fund your wallet on Devnet.`;
        showError(msg);
        setLastError(msg);
        return;
      }
      
      const slot = await connection.getSlot();
      const timestamp = await connection.getBlockTime(slot);
      if (!timestamp) {
        throw new Error("Failed to get block time");
      }
      
      const tsBuf = new BN(timestamp).toArrayLike(Buffer, "le", 8);

      const [eventPda] = await PublicKey.findProgramAddress(
        [Buffer.from("event"), creator.toBuffer(), tsBuf],
        program.programId
      );

      const title = data.title;
      const description = data.oneLiner;
      const choicesList = choices.filter(c => c.trim());
      const deadlineSeconds = parseInt(data.deadline) * 60;
      const deadline = timestamp + deadlineSeconds;
      
      const CLOCK_SYSVAR = new PublicKey("SysvarC1ock11111111111111111111111111111111");
      
      try {
        await program.methods
          .initializeEvent(
            title,
            description,
            choicesList,
            new BN(deadline),
            new BN(timestamp),
            maxPlusVotes,
            allowMinus,
            maxMinusVotes,
            minPlusForMinus
          )
          .accounts({
            event: eventPda,
            creator,
            systemProgram: SystemProgram.programId,
            clock: CLOCK_SYSVAR,
          })
          .simulate();
      } catch (simErr: any) {
        console.error("Simulation failed:", simErr);
        if (simErr.logs) {
          setLastError(`Simulation failed:\n${simErr.logs.join('\n')}`);
        }
        throw simErr;
      }
      
      const tx = await program.methods
        .initializeEvent(
          title,
          description,
          choicesList,
          new BN(deadline),
          new BN(timestamp),
          maxPlusVotes,
          allowMinus,
          maxMinusVotes,
          minPlusForMinus
        )
        .accounts({
          event: eventPda,
          creator,
          systemProgram: SystemProgram.programId,
          clock: CLOCK_SYSVAR,
        })
        .rpc({ skipPreflight: false });

      showSuccess(`Vote created successfully!\n\nTransaction: ${tx.slice(0, 8)}...${tx.slice(-8)}`);
      
      setTimeout(() => {
        router.push(`/vote/${eventPda.toBase58()}`);
      }, 1500);
    } catch (err: any) {
      console.error("Failed to create vote event:", err);
      
      const details = [
        err?.message ?? 'Unknown error',
        err?.logs ? `\n${err.logs.filter((log: string) => log.includes('Error')).join('\n')}` : null,
      ]
        .filter(Boolean)
        .join("\n\n");
      
      setLastError(details || "Unknown error");
      showError(`Failed to create vote.\n\n${details}`);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 py-24">
      <div className="w-full max-w-md bg-background border border-foreground/10 rounded-lg shadow-sm p-8 space-y-6">
        <h1 className="text-2xl font-semibold text-foreground text-center">
          Create a Vote
        </h1>

        <div className="space-y-4">
          <div>
            <label
              htmlFor="title"
              className="block text-sm font-medium text-foreground/70 mb-2"
            >
              Vote Title
            </label>
            <input
              id="title"
              type="text"
              name="title"
              value={data.title}
              onChange={handleChange}
              placeholder="Enter vote title"
              className="w-full bg-background border border-foreground/10 rounded-lg px-4 py-2 text-foreground focus:outline-none focus:border-foreground/30 transition"
            />
          </div>

          <div>
            <label
              htmlFor="oneLiner"
              className="block text-sm font-medium text-foreground/70 mb-2"
            >
              Description
            </label>
            <input
              id="oneLiner"
              type="text"
              name="oneLiner"
              value={data.oneLiner}
              onChange={handleChange}
              placeholder="Short description"
              className="w-full bg-background border border-foreground/10 rounded-lg px-4 py-2 text-foreground focus:outline-none focus:border-foreground/30 transition"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-foreground/70">
                Choices ({choices.length}/5)
              </label>
              <button
                type="button"
                onClick={addChoice}
                disabled={choices.length >= 5}
                className="text-sm px-3 py-1 border-2 border-foreground/30 hover:border-foreground hover:bg-foreground/15 text-foreground rounded transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                + Add Choice
              </button>
            </div>
            <div className="space-y-2">
              {choices.map((choice, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={choice}
                    onChange={(e) => handleChoiceChange(index, e.target.value)}
                    placeholder={`Choice ${index + 1}`}
                    className="flex-1 bg-background border border-foreground/10 rounded-lg px-4 py-2 text-foreground focus:outline-none focus:border-foreground/30 transition"
                  />
                  {choices.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeChoice(index)}
                      className="px-3 py-2 border-2 border-red-500/30 hover:border-red-500 hover:bg-red-500/20 text-red-500 hover:text-red-600 rounded transition-all duration-200"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
          <div>
            <label
              className="block text-sm font-medium text-foreground/70 mb-2"
              htmlFor="deadline"
            >
              Deadline (minutes)
            </label>
            <input
              id="deadline"
              type="number"
              name="deadline"
              value={data.deadline}
              onChange={handleChange}
              placeholder="Minutes until voting closes"
              className="w-full bg-background border border-foreground/10 rounded-lg px-4 py-2 text-foreground focus:outline-none focus:border-foreground/30 transition"
            />
          </div>

          {/* D21 Voting Configuration */}
          <div className="pt-4 border-t border-foreground/10">
            <h3 className="text-sm font-semibold text-foreground mb-3">D21 Voting Configuration</h3>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-foreground/70 mb-2">
                  Max Plus Votes (per voter)
                </label>
                <input
                  type="number"
                  min="1"
                  max={choices.filter(c => c.trim()).length || 10}
                  value={maxPlusVotes}
                  onChange={(e) => setMaxPlusVotes(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full bg-background border border-foreground/10 rounded-lg px-4 py-2 text-foreground focus:outline-none focus:border-foreground/30 transition"
                />
                <p className="text-xs text-foreground/50 mt-1">How many positive votes each voter can cast</p>
              </div>

              <div className="flex items-center space-x-2 py-2">
                <input
                  type="checkbox"
                  id="allowMinus"
                  checked={allowMinus}
                  onChange={(e) => setAllowMinus(e.target.checked)}
                  className="w-4 h-4 rounded border-foreground/30 text-foreground focus:ring-2 focus:ring-foreground/20"
                />
                <label htmlFor="allowMinus" className="text-sm font-medium text-foreground/70">
                  Allow Minus Votes
                </label>
              </div>

              {allowMinus && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-foreground/70 mb-2">
                      Max Minus Votes (per voter)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max={maxPlusVotes}
                      value={maxMinusVotes}
                      onChange={(e) => setMaxMinusVotes(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full bg-background border border-foreground/10 rounded-lg px-4 py-2 text-foreground focus:outline-none focus:border-foreground/30 transition"
                    />
                    <p className="text-xs text-foreground/50 mt-1">How many negative votes each voter can cast</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground/70 mb-2">
                      Min Plus Votes Required (when using minus)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max={maxPlusVotes}
                      value={minPlusForMinus}
                      onChange={(e) => setMinPlusForMinus(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full bg-background border border-foreground/10 rounded-lg px-4 py-2 text-foreground focus:outline-none focus:border-foreground/30 transition"
                    />
                    <p className="text-xs text-foreground/50 mt-1">Minimum plus votes required if casting any minus votes</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={handleDeploy}
          className="w-full bg-foreground hover:bg-foreground/80 active:bg-foreground/70 text-background font-medium rounded-lg px-6 py-3 transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Create Vote
        </button>
        {lastError ? (
          <div className="p-4 bg-red-500/10 border border-red-500/20 text-sm text-red-600 rounded-lg whitespace-pre-wrap">
            <strong>Error:</strong>
            <div className="mt-2 text-foreground/70">{lastError}</div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default Page;
