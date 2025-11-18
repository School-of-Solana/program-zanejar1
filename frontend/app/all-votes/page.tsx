import React from "react";
import { Connection, PublicKey } from "@solana/web3.js";
import { AnchorProvider, Program } from "@coral-xyz/anchor";
import idl from "@/lib/anchor/decentra_vote.json";
import { DecentraVote } from "@/lib/anchor/decentra_vote";
import { VotesList } from "@/app/components/VotesList";

// Revalidate every 30 seconds for better performance
export const revalidate = 30;

async function Page() {
  const connection = new Connection("https://api.devnet.solana.com");
  const provider = new AnchorProvider(connection, {} as any, {
    preflightCommitment: "processed",
  });
  const program = new Program<DecentraVote>(idl as DecentraVote, provider);

  let allEvents: any[] = [];
  
  try {
    // Fetch all EventAccount accounts from the program
    allEvents = await program.account.eventAccount.all();
    console.log(`Found ${allEvents.length} vote events`);
  } catch (err) {
    console.error("Failed to fetch events:", err);
  }

  // Transform events to include publicKey as string and convert BN to number
  const events = allEvents.map((event) => ({
    publicKey: event.publicKey.toBase58(),
    account: {
      title: String(event.account.title),
      choices: event.account.choices.map((c: any) => String(c)),
      totalVotes: event.account.totalVotes.map((v: any) => Number(v)),
      deadline: Number(event.account.deadline.toString()),
    },
  }));

  return (
    <div className="min-h-screen bg-background px-4 py-24">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-semibold text-foreground mb-8 text-center">
          All Votes
        </h1>
        <VotesList events={events} />
      </div>
    </div>
  );
}

export default Page;
