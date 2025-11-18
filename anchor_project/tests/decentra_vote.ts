import { PublicKey, SystemProgram } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import { BN } from "bn.js";
import assert from "assert";

describe("decentra_vote D21 voting - Comprehensive Tests", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.decentra_vote as any;

  // ========================================
  // INITIALIZE_EVENT TESTS
  // ========================================

  describe("initialize_event instruction", () => {
    it("Happy: Creates a D21 event successfully", async () => {
      const creator = provider.wallet.publicKey;
      const timestamp = Math.floor(Date.now() / 1000);
      const tsBuf = new BN(timestamp).toArrayLike(Buffer, "le", 8);

      const [eventPda] = await PublicKey.findProgramAddress(
        [Buffer.from("event"), creator.toBuffer(), tsBuf],
        program.programId
      );

      const title = "Valid D21 Event";
      const description = "Testing valid event creation";
      const choices = ["Alice", "Bob", "Carol"];
      const deadline = Math.floor(Date.now() / 1000) + 3600;
      const maxPlusVotes = 2;
      const allowMinus = true;
      const maxMinusVotes = 1;
      const minPlusForMinus = 2;

      await program.methods
        .initializeEvent(
          title,
          description,
          choices,
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
          clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
        })
        .rpc();

      const eventAccount = await program.account.eventAccount.fetch(eventPda);
      assert.strictEqual(eventAccount.title, title);
      assert.strictEqual(eventAccount.description, description);
      assert.strictEqual(eventAccount.choices.length, 3);
      assert.strictEqual(eventAccount.maxPlusVotes, maxPlusVotes);
      assert.strictEqual(eventAccount.allowMinus, allowMinus);
      assert.strictEqual(eventAccount.maxMinusVotes, maxMinusVotes);
      assert.strictEqual(eventAccount.minPlusForMinus, minPlusForMinus);
      assert.strictEqual(eventAccount.totalVotes.length, 3);
      assert.strictEqual(Number(eventAccount.totalVotes[0]), 0);
    });

    it("Unhappy: Fails with empty choices", async () => {
      const creator = provider.wallet.publicKey;
      const timestamp = Math.floor(Date.now() / 1000) + 1;
      const tsBuf = new BN(timestamp).toArrayLike(Buffer, "le", 8);

      const [eventPda] = await PublicKey.findProgramAddress(
        [Buffer.from("event"), creator.toBuffer(), tsBuf],
        program.programId
      );

      try {
        await program.methods
          .initializeEvent(
            "No Choices",
            "Event with no choices",
            [], // Empty choices
            new BN(Math.floor(Date.now() / 1000) + 3600),
            new BN(timestamp),
            2,
            false,
            0,
            0
          )
          .accounts({
            event: eventPda,
            creator,
            systemProgram: SystemProgram.programId,
            clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
          })
          .rpc();
        assert.fail("Should have failed with no choices");
      } catch (err: any) {
        assert.ok(err.toString().includes("NoChoicesProvided") || err.toString().includes("6003"));
      }
    });

    it("Unhappy: Fails with title too long", async () => {
      const creator = provider.wallet.publicKey;
      const timestamp = Math.floor(Date.now() / 1000) + 2;
      const tsBuf = new BN(timestamp).toArrayLike(Buffer, "le", 8);

      const [eventPda] = await PublicKey.findProgramAddress(
        [Buffer.from("event"), creator.toBuffer(), tsBuf],
        program.programId
      );

      const longTitle = "A".repeat(65); // Exceeds 64 char limit

      try {
        await program.methods
          .initializeEvent(
            longTitle,
            "Description",
            ["Choice1", "Choice2"],
            new BN(Math.floor(Date.now() / 1000) + 3600),
            new BN(timestamp),
            2,
            false,
            0,
            0
          )
          .accounts({
            event: eventPda,
            creator,
            systemProgram: SystemProgram.programId,
            clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
          })
          .rpc();
        assert.fail("Should have failed with title too long");
      } catch (err: any) {
        assert.ok(err.toString().includes("TitleTooLong") || err.toString().includes("6004"));
      }
    });

    it("Unhappy: Fails with description too long", async () => {
      const creator = provider.wallet.publicKey;
      const timestamp = Math.floor(Date.now() / 1000) + 3;
      const tsBuf = new BN(timestamp).toArrayLike(Buffer, "le", 8);

      const [eventPda] = await PublicKey.findProgramAddress(
        [Buffer.from("event"), creator.toBuffer(), tsBuf],
        program.programId
      );

      const longDescription = "A".repeat(257); // Exceeds 256 char limit

      try {
        await program.methods
          .initializeEvent(
            "Title",
            longDescription,
            ["Choice1", "Choice2"],
            new BN(Math.floor(Date.now() / 1000) + 3600),
            new BN(timestamp),
            2,
            false,
            0,
            0
          )
          .accounts({
            event: eventPda,
            creator,
            systemProgram: SystemProgram.programId,
            clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
          })
          .rpc();
        assert.fail("Should have failed with description too long");
      } catch (err: any) {
        assert.ok(err.toString().includes("DescriptionTooLong") || err.toString().includes("6005"));
      }
    });

    it("Unhappy: Fails with invalid D21 config (max_plus_votes = 0)", async () => {
      const creator = provider.wallet.publicKey;
      const timestamp = Math.floor(Date.now() / 1000) + 4;
      const tsBuf = new BN(timestamp).toArrayLike(Buffer, "le", 8);

      const [eventPda] = await PublicKey.findProgramAddress(
        [Buffer.from("event"), creator.toBuffer(), tsBuf],
        program.programId
      );

      try {
        await program.methods
          .initializeEvent(
            "Invalid Config",
            "Zero max plus votes",
            ["Choice1", "Choice2"],
            new BN(Math.floor(Date.now() / 1000) + 3600),
            new BN(timestamp),
            0, // Invalid: must be > 0
            false,
            0,
            0
          )
          .accounts({
            event: eventPda,
            creator,
            systemProgram: SystemProgram.programId,
            clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
          })
          .rpc();
        assert.fail("Should have failed with invalid config");
      } catch (err: any) {
        assert.ok(err.toString().includes("InvalidConfig") || err.toString().includes("6006"));
      }
    });

    it("Unhappy: Fails when max_minus_votes > max_plus_votes", async () => {
      const creator = provider.wallet.publicKey;
      const timestamp = Math.floor(Date.now() / 1000) + 5;
      const tsBuf = new BN(timestamp).toArrayLike(Buffer, "le", 8);

      const [eventPda] = await PublicKey.findProgramAddress(
        [Buffer.from("event"), creator.toBuffer(), tsBuf],
        program.programId
      );

      try {
        await program.methods
          .initializeEvent(
            "Invalid Minus Config",
            "More minus than plus",
            ["Choice1", "Choice2", "Choice3"],
            new BN(Math.floor(Date.now() / 1000) + 3600),
            new BN(timestamp),
            2,
            true,
            3, // Invalid: max_minus > max_plus
            2
          )
          .accounts({
            event: eventPda,
            creator,
            systemProgram: SystemProgram.programId,
            clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
          })
          .rpc();
        assert.fail("Should have failed with invalid minus config");
      } catch (err: any) {
        assert.ok(err.toString().includes("InvalidConfig") || err.toString().includes("6006"));
      }
    });
  });

  // ========================================
  // CAST_VOTE TESTS
  // ========================================

  describe("cast_vote instruction", () => {
    let eventPda: PublicKey;
    let votePda: PublicKey;
    const voter = provider.wallet.publicKey;

    before(async () => {
      // Create a test event for voting tests
      const timestamp = Math.floor(Date.now() / 1000) + 100;
      const tsBuf = new BN(timestamp).toArrayLike(Buffer, "le", 8);

      [eventPda] = await PublicKey.findProgramAddress(
        [Buffer.from("event"), voter.toBuffer(), tsBuf],
        program.programId
      );

      await program.methods
        .initializeEvent(
          "Vote Test Event",
          "For testing votes",
          ["Alice", "Bob", "Carol", "Dave"],
          new BN(Math.floor(Date.now() / 1000) + 7200), // 2 hours
          new BN(timestamp),
          2, // max_plus_votes
          true, // allow_minus
          1, // max_minus_votes
          2 // min_plus_for_minus
        )
        .accounts({
          event: eventPda,
          creator: voter,
          systemProgram: SystemProgram.programId,
          clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
        })
        .rpc();

      [votePda] = await PublicKey.findProgramAddress(
        [Buffer.from("vote"), eventPda.toBuffer(), voter.toBuffer()],
        program.programId
      );
    });

    it("Happy: Casts D21 vote with plus votes only", async () => {
      const plusChoices = Buffer.from([0, 2]); // Alice and Carol
      const minusChoices = null;

      await program.methods
        .castVote(plusChoices, minusChoices)
        .accounts({
          event: eventPda,
          voteRecord: votePda,
          voter: voter,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      const eventAccount = await program.account.eventAccount.fetch(eventPda);
      const voteRecord = await program.account.voteAccount.fetch(votePda);

      assert.strictEqual(Number(eventAccount.totalVotes[0]), 1); // Alice
      assert.strictEqual(Number(eventAccount.totalVotes[2]), 1); // Carol
      assert.strictEqual(voteRecord.hasVoted, true);
      assert.strictEqual(voteRecord.plusChoices.length, 2);
      assert.strictEqual(voteRecord.minusChoices.length, 0);
    });

    it("Happy: Casts D21 vote with plus and minus votes", async () => {
      // Create new event for this test
      const timestamp2 = Math.floor(Date.now() / 1000) + 101;
      const tsBuf2 = new BN(timestamp2).toArrayLike(Buffer, "le", 8);

      const [eventPda2] = await PublicKey.findProgramAddress(
        [Buffer.from("event"), voter.toBuffer(), tsBuf2],
        program.programId
      );

      await program.methods
        .initializeEvent(
          "Vote Test 2",
          "Testing minus votes",
          ["Option A", "Option B", "Option C"],
          new BN(Math.floor(Date.now() / 1000) + 7200),
          new BN(timestamp2),
          2,
          true,
          1,
          2
        )
        .accounts({
          event: eventPda2,
          creator: voter,
          systemProgram: SystemProgram.programId,
          clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
        })
        .rpc();

      const [votePda2] = await PublicKey.findProgramAddress(
        [Buffer.from("vote"), eventPda2.toBuffer(), voter.toBuffer()],
        program.programId
      );

      const plusChoices = Buffer.from([0, 2]); // +A, +C
      const minusChoices = Buffer.from([1]); // -B

      await program.methods
        .castVote(plusChoices, minusChoices)
        .accounts({
          event: eventPda2,
          voteRecord: votePda2,
          voter: voter,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      const eventAccount = await program.account.eventAccount.fetch(eventPda2);
      assert.strictEqual(Number(eventAccount.totalVotes[0]), 1); // A: +1
      assert.strictEqual(Number(eventAccount.totalVotes[1]), -1); // B: -1
      assert.strictEqual(Number(eventAccount.totalVotes[2]), 1); // C: +1
    });

    it("Unhappy: Fails when trying to vote twice", async () => {
      // votePda already has a vote from the first test
      const plusChoices = Buffer.from([1, 3]);

      try {
        await program.methods
          .castVote(plusChoices, null)
          .accounts({
            event: eventPda,
            voteRecord: votePda,
            voter: voter,
            systemProgram: SystemProgram.programId,
          })
          .rpc();
        assert.fail("Should have failed with already voted");
      } catch (err: any) {
        // PDA already exists or AlreadyVoted error
        assert.ok(
          err.toString().includes("already in use") || 
          err.toString().includes("AlreadyVoted") ||
          err.toString().includes("0x0")
        );
      }
    });

    it("Unhappy: Fails with no plus votes", async () => {
      const timestamp3 = Math.floor(Date.now() / 1000) + 102;
      const tsBuf3 = new BN(timestamp3).toArrayLike(Buffer, "le", 8);

      const [eventPda3] = await PublicKey.findProgramAddress(
        [Buffer.from("event"), voter.toBuffer(), tsBuf3],
        program.programId
      );

      await program.methods
        .initializeEvent(
          "Vote Test 3",
          "Testing validation",
          ["X", "Y", "Z"],
          new BN(Math.floor(Date.now() / 1000) + 7200),
          new BN(timestamp3),
          2,
          false,
          0,
          0
        )
        .accounts({
          event: eventPda3,
          creator: voter,
          systemProgram: SystemProgram.programId,
          clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
        })
        .rpc();

      const [votePda3] = await PublicKey.findProgramAddress(
        [Buffer.from("vote"), eventPda3.toBuffer(), voter.toBuffer()],
        program.programId
      );

      const plusChoices = Buffer.from([]); // Empty - invalid

      try {
        await program.methods
          .castVote(plusChoices, null)
          .accounts({
            event: eventPda3,
            voteRecord: votePda3,
            voter: voter,
            systemProgram: SystemProgram.programId,
          })
          .rpc();
        assert.fail("Should have failed with no plus votes");
      } catch (err: any) {
        assert.ok(err.toString().includes("NoChoicesProvided") || err.toString().includes("6003"));
      }
    });

    it("Unhappy: Fails with too many plus votes", async () => {
      const timestamp4 = Math.floor(Date.now() / 1000) + 103;
      const tsBuf4 = new BN(timestamp4).toArrayLike(Buffer, "le", 8);

      const [eventPda4] = await PublicKey.findProgramAddress(
        [Buffer.from("event"), voter.toBuffer(), tsBuf4],
        program.programId
      );

      await program.methods
        .initializeEvent(
          "Vote Test 4",
          "Testing too many plus",
          ["A", "B", "C", "D"],
          new BN(Math.floor(Date.now() / 1000) + 7200),
          new BN(timestamp4),
          2, // max 2 plus votes
          false,
          0,
          0
        )
        .accounts({
          event: eventPda4,
          creator: voter,
          systemProgram: SystemProgram.programId,
          clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
        })
        .rpc();

      const [votePda4] = await PublicKey.findProgramAddress(
        [Buffer.from("vote"), eventPda4.toBuffer(), voter.toBuffer()],
        program.programId
      );

      const plusChoices = Buffer.from([0, 1, 2]); // 3 votes - exceeds max of 2

      try {
        await program.methods
          .castVote(plusChoices, null)
          .accounts({
            event: eventPda4,
            voteRecord: votePda4,
            voter: voter,
            systemProgram: SystemProgram.programId,
          })
          .rpc();
        assert.fail("Should have failed with too many plus votes");
      } catch (err: any) {
        assert.ok(err.toString().includes("TooManyPlusVotes") || err.toString().includes("6010"));
      }
    });

    it("Unhappy: Fails with duplicate plus choices", async () => {
      const timestamp5 = Math.floor(Date.now() / 1000) + 104;
      const tsBuf5 = new BN(timestamp5).toArrayLike(Buffer, "le", 8);

      const [eventPda5] = await PublicKey.findProgramAddress(
        [Buffer.from("event"), voter.toBuffer(), tsBuf5],
        program.programId
      );

      await program.methods
        .initializeEvent(
          "Vote Test 5",
          "Testing duplicates",
          ["A", "B", "C"],
          new BN(Math.floor(Date.now() / 1000) + 7200),
          new BN(timestamp5),
          2,
          false,
          0,
          0
        )
        .accounts({
          event: eventPda5,
          creator: voter,
          systemProgram: SystemProgram.programId,
          clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
        })
        .rpc();

      const [votePda5] = await PublicKey.findProgramAddress(
        [Buffer.from("vote"), eventPda5.toBuffer(), voter.toBuffer()],
        program.programId
      );

      const plusChoices = Buffer.from([0, 0]); // Duplicate

      try {
        await program.methods
          .castVote(plusChoices, null)
          .accounts({
            event: eventPda5,
            voteRecord: votePda5,
            voter: voter,
            systemProgram: SystemProgram.programId,
          })
          .rpc();
        assert.fail("Should have failed with duplicate choices");
      } catch (err: any) {
        assert.ok(err.toString().includes("DuplicateChoices") || err.toString().includes("6007"));
      }
    });

    it("Unhappy: Fails with choice out of range", async () => {
      const timestamp6 = Math.floor(Date.now() / 1000) + 105;
      const tsBuf6 = new BN(timestamp6).toArrayLike(Buffer, "le", 8);

      const [eventPda6] = await PublicKey.findProgramAddress(
        [Buffer.from("event"), voter.toBuffer(), tsBuf6],
        program.programId
      );

      await program.methods
        .initializeEvent(
          "Vote Test 6",
          "Testing out of range",
          ["A", "B"],
          new BN(Math.floor(Date.now() / 1000) + 7200),
          new BN(timestamp6),
          2,
          false,
          0,
          0
        )
        .accounts({
          event: eventPda6,
          creator: voter,
          systemProgram: SystemProgram.programId,
          clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
        })
        .rpc();

      const [votePda6] = await PublicKey.findProgramAddress(
        [Buffer.from("vote"), eventPda6.toBuffer(), voter.toBuffer()],
        program.programId
      );

      const plusChoices = Buffer.from([0, 5]); // 5 is out of range (only 0,1 valid)

      try {
        await program.methods
          .castVote(plusChoices, null)
          .accounts({
            event: eventPda6,
            voteRecord: votePda6,
            voter: voter,
            systemProgram: SystemProgram.programId,
          })
          .rpc();
        assert.fail("Should have failed with choice out of range");
      } catch (err: any) {
        assert.ok(err.toString().includes("ChoiceOutOfRange") || err.toString().includes("6008"));
      }
    });

    it("Unhappy: Fails when minus votes not allowed", async () => {
      const timestamp7 = Math.floor(Date.now() / 1000) + 106;
      const tsBuf7 = new BN(timestamp7).toArrayLike(Buffer, "le", 8);

      const [eventPda7] = await PublicKey.findProgramAddress(
        [Buffer.from("event"), voter.toBuffer(), tsBuf7],
        program.programId
      );

      await program.methods
        .initializeEvent(
          "Vote Test 7",
          "Minus not allowed",
          ["A", "B", "C"],
          new BN(Math.floor(Date.now() / 1000) + 7200),
          new BN(timestamp7),
          2,
          false, // allow_minus = false
          0,
          0
        )
        .accounts({
          event: eventPda7,
          creator: voter,
          systemProgram: SystemProgram.programId,
          clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
        })
        .rpc();

      const [votePda7] = await PublicKey.findProgramAddress(
        [Buffer.from("vote"), eventPda7.toBuffer(), voter.toBuffer()],
        program.programId
      );

      const plusChoices = Buffer.from([0, 1]);
      const minusChoices = Buffer.from([2]); // Not allowed

      try {
        await program.methods
          .castVote(plusChoices, minusChoices)
          .accounts({
            event: eventPda7,
            voteRecord: votePda7,
            voter: voter,
            systemProgram: SystemProgram.programId,
          })
          .rpc();
        assert.fail("Should have failed with minus not allowed");
      } catch (err: any) {
        assert.ok(err.toString().includes("MinusVotesNotAllowed") || err.toString().includes("6011"));
      }
    });

    it("Unhappy: Fails with insufficient plus votes for minus", async () => {
      const timestamp8 = Math.floor(Date.now() / 1000) + 107;
      const tsBuf8 = new BN(timestamp8).toArrayLike(Buffer, "le", 8);

      const [eventPda8] = await PublicKey.findProgramAddress(
        [Buffer.from("event"), voter.toBuffer(), tsBuf8],
        program.programId
      );

      await program.methods
        .initializeEvent(
          "Vote Test 8",
          "Testing min plus requirement",
          ["A", "B", "C"],
          new BN(Math.floor(Date.now() / 1000) + 7200),
          new BN(timestamp8),
          2,
          true,
          1,
          2 // Need 2 plus votes to use minus
        )
        .accounts({
          event: eventPda8,
          creator: voter,
          systemProgram: SystemProgram.programId,
          clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
        })
        .rpc();

      const [votePda8] = await PublicKey.findProgramAddress(
        [Buffer.from("vote"), eventPda8.toBuffer(), voter.toBuffer()],
        program.programId
      );

      const plusChoices = Buffer.from([0]); // Only 1 plus vote
      const minusChoices = Buffer.from([1]); // But trying to use minus

      try {
        await program.methods
          .castVote(plusChoices, minusChoices)
          .accounts({
            event: eventPda8,
            voteRecord: votePda8,
            voter: voter,
            systemProgram: SystemProgram.programId,
          })
          .rpc();
        assert.fail("Should have failed with insufficient plus votes");
      } catch (err: any) {
        assert.ok(err.toString().includes("InsufficientPlusVotes") || err.toString().includes("6013"));
      }
    });

    it("Unhappy: Fails with overlapping plus and minus choices", async () => {
      const timestamp9 = Math.floor(Date.now() / 1000) + 108;
      const tsBuf9 = new BN(timestamp9).toArrayLike(Buffer, "le", 8);

      const [eventPda9] = await PublicKey.findProgramAddress(
        [Buffer.from("event"), voter.toBuffer(), tsBuf9],
        program.programId
      );

      await program.methods
        .initializeEvent(
          "Vote Test 9",
          "Testing overlapping",
          ["A", "B", "C"],
          new BN(Math.floor(Date.now() / 1000) + 7200),
          new BN(timestamp9),
          2,
          true,
          1,
          2
        )
        .accounts({
          event: eventPda9,
          creator: voter,
          systemProgram: SystemProgram.programId,
          clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
        })
        .rpc();

      const [votePda9] = await PublicKey.findProgramAddress(
        [Buffer.from("vote"), eventPda9.toBuffer(), voter.toBuffer()],
        program.programId
      );

      const plusChoices = Buffer.from([0, 1]);
      const minusChoices = Buffer.from([1]); // 1 appears in both

      try {
        await program.methods
          .castVote(plusChoices, minusChoices)
          .accounts({
            event: eventPda9,
            voteRecord: votePda9,
            voter: voter,
            systemProgram: SystemProgram.programId,
          })
          .rpc();
        assert.fail("Should have failed with overlapping choices");
      } catch (err: any) {
        assert.ok(err.toString().includes("OverlappingChoices") || err.toString().includes("6014"));
      }
    });

    it("Unhappy: Fails when voting after deadline", async () => {
      const timestamp10 = Math.floor(Date.now() / 1000) + 109;
      const tsBuf10 = new BN(timestamp10).toArrayLike(Buffer, "le", 8);

      const [eventPda10] = await PublicKey.findProgramAddress(
        [Buffer.from("event"), voter.toBuffer(), tsBuf10],
        program.programId
      );

      // Create event with deadline in the past
      await program.methods
        .initializeEvent(
          "Vote Test 10",
          "Expired event",
          ["A", "B"],
          new BN(Math.floor(Date.now() / 1000) - 60), // Deadline 1 minute ago
          new BN(timestamp10),
          1,
          false,
          0,
          0
        )
        .accounts({
          event: eventPda10,
          creator: voter,
          systemProgram: SystemProgram.programId,
          clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
        })
        .rpc();

      const [votePda10] = await PublicKey.findProgramAddress(
        [Buffer.from("vote"), eventPda10.toBuffer(), voter.toBuffer()],
        program.programId
      );

      const plusChoices = Buffer.from([0]);

      try {
        await program.methods
          .castVote(plusChoices, null)
          .accounts({
            event: eventPda10,
            voteRecord: votePda10,
            voter: voter,
            systemProgram: SystemProgram.programId,
          })
          .rpc();
        assert.fail("Should have failed with voting closed");
      } catch (err: any) {
        assert.ok(err.toString().includes("VotingClosed") || err.toString().includes("6000"));
      }
    });
  });
});
