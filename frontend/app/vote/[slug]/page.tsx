// app/vote/[slug]/page.tsx
import { AnchorProvider, Program } from "@coral-xyz/anchor";
import { PublicKey, Connection } from "@solana/web3.js";
import idl from "@/lib/anchor/decentra_vote.json";
import { DecentraVote } from "@/lib/anchor/decentra_vote";
import { notFound } from "next/navigation";
import { VoteButton } from "@/app/components/VoteButton";
import { TimeRemaining } from "@/app/components/TimeRemaining";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function Page({ params }: PageProps) {
  const { slug } = await params;
  let eventPda: PublicKey;

  try {
    eventPda = new PublicKey(slug);
  } catch {
    return notFound();
  }

  // Server-side connection
  const connection = new Connection("https://api.devnet.solana.com");
  const provider = new AnchorProvider(connection, {} as any, {
    preflightCommitment: "processed",
  });

  const program = new Program<DecentraVote>(idl as DecentraVote, provider);

  let eventAccount;
  try {
    eventAccount = await program.account.eventAccount.fetch(eventPda);
  } catch {
    return notFound();
  }

  const totalVotes = eventAccount.totalVotes.reduce((a: any, b: any) => {
    const num = typeof b === 'bigint' ? Number(b) : b;
    return a + Math.abs(Number(num));
  }, 0);
  const votes = eventAccount.totalVotes.map((v: any) => {
    const num = typeof v === 'bigint' ? Number(v) : v;
    return Number(num);
  });
  const maxVotes = Math.max(...votes.map(v => Math.abs(v)));
  
  const now = Math.floor(Date.now() / 1000);
  const deadline = Number(eventAccount.deadline.toString());
  const isEnded = deadline < now;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 py-24">
      <div className="w-full max-w-3xl space-y-8">
        {/* Title */}
        <div className="text-center">
          <h1 className="text-4xl font-semibold text-foreground mb-3">
            {eventAccount.title}
          </h1>
          <p className="text-foreground/60">{eventAccount.description}</p>
        </div>

        {/* Status Badge */}
        <div className="flex justify-center">
          <div className="text-center">
            <TimeRemaining deadline={deadline} className="text-lg" />
          </div>
        </div>

        {/* Results or Voting Interface */}
        {isEnded ? (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-center text-foreground">Results</h2>
            <div className="space-y-4">
              {eventAccount.choices.map((choice: string, idx: number) => {
                const voteCount = votes[idx];
                const absVoteCount = Math.abs(voteCount);
                const percentage = totalVotes > 0 ? (absVoteCount / totalVotes) * 100 : 0;
                const isPositive = voteCount >= 0;
                const maxAbsVote = Math.max(...votes.map(v => Math.abs(v)));
                const isTop = absVoteCount === maxAbsVote && totalVotes > 0;

                return (
                  <div key={idx} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-medium text-foreground">{choice}</span>
                      <span className={`font-medium ${voteCount < 0 ? 'text-red-500' : 'text-foreground/60'}`}>
                        {voteCount > 0 ? '+' : ''}{voteCount} {Math.abs(voteCount) !== 1 ? 'votes' : 'vote'} ({Math.round(percentage)}%)
                      </span>
                    </div>
                    <div className="h-3 w-full bg-foreground/5 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          isTop && isPositive
                            ? "bg-green-500"
                            : voteCount < 0
                            ? "bg-red-500"
                            : "bg-blue-500/60"
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="text-center text-sm text-foreground/40 pt-4">
              Total votes: {totalVotes}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-center text-foreground">Cast Your Vote</h2>
            <VoteButton eventPda={eventPda.toBase58()} choices={eventAccount.choices} deadline={deadline} />
            {totalVotes > 0 && (
              <div className="text-center text-sm text-foreground/40">
                {totalVotes} vote{totalVotes !== 1 ? 's' : ''} cast so far
              </div>
            )}
          </div>
        )}

        {/* Links */}
        <div className="text-center space-y-2 text-sm text-foreground/40 pt-8">
          <div className="truncate">Event: {slug}</div>
          <a
            href={`https://explorer.solana.com/address/${slug}?cluster=devnet`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block underline hover:text-foreground/60 transition"
          >
            View on Solana Explorer
          </a>
        </div>
      </div>
    </div>
  );
}
