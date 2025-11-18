import Link from "next/link";
import Image from "next/image";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 py-24">
      <div className="max-w-3xl mx-auto text-center space-y-8">
        <div className="flex justify-center">
          <Image src="/logo.png" alt="DecentraVote" width={80} height={80} className="text-foreground" />
        </div>
        
        <h1 className="text-5xl font-bold text-foreground">
          DecentraVote
        </h1>
        
        <p className="text-xl text-foreground/60 max-w-2xl mx-auto">
          Decentralized voting on Solana blockchain. Create transparent, immutable votes that anyone can participate in.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
          <Link
            href="/all-votes"
            className="px-8 py-3 border-2 border-foreground/30 hover:border-foreground hover:bg-foreground/10 text-foreground rounded-lg transition-all duration-200 font-medium"
          >
            Browse Votes
          </Link>
          <Link
            href="/create-vote"
            className="px-8 py-3 bg-foreground hover:bg-foreground/80 text-background rounded-lg transition-all duration-200 font-medium shadow-sm hover:shadow-md"
          >
            Create Vote
          </Link>
        </div>
      </div>
    </div>
  );
}
