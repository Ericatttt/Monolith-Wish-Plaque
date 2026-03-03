import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { WishWall } from "../target/types/wish_wall";
import { assert } from "chai";

describe("wish_wall", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.WishWall as Program<WishWall>;

  // Test accounts
  const authority = provider.wallet;

  // PDAs
  let statePda: anchor.web3.PublicKey;
  let stateBump: number;
  let wish1Pda: anchor.web3.PublicKey;
  let wish2Pda: anchor.web3.PublicKey;

  before(async () => {
    // Derive state PDA
    [statePda, stateBump] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("wish-wall-state")],
      program.programId
    );
  });

  it("Initializes the wish wall state", async () => {
    const tx = await program.methods
      .initialize()
      .accounts({
        state: statePda,
        authority: authority.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log("Initialize transaction signature:", tx);

    // Fetch and verify state
    const stateAccount = await program.account.wishWallState.fetch(statePda);
    assert.equal(stateAccount.totalWishes.toNumber(), 0);
    assert.equal(stateAccount.authority.toString(), authority.publicKey.toString());
    assert.equal(stateAccount.bump, stateBump);
  });

  it("Creates a wish", async () => {
    const content = "希望身体健康，万事如意";
    const nickname = "小明";

    // Derive wish PDA for wish #1
    [wish1Pda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("wish"), Buffer.from([1, 0, 0, 0, 0, 0, 0, 0])], // u64 little-endian for 1
      program.programId
    );

    const tx = await program.methods
      .createWish(content, nickname)
      .accounts({
        state: statePda,
        wish: wish1Pda,
        owner: authority.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log("Create wish transaction signature:", tx);

    // Fetch and verify wish
    const wishAccount = await program.account.wish.fetch(wish1Pda);
    assert.equal(wishAccount.wishId.toNumber(), 1);
    assert.equal(wishAccount.content, content);
    assert.equal(wishAccount.nickname, nickname);
    assert.equal(wishAccount.owner.toString(), authority.publicKey.toString());
    assert.equal(wishAccount.totalDonations.toNumber(), 0);
    assert.deepEqual(wishAccount.status, { pending: {} });

    // Verify state updated
    const stateAccount = await program.account.wishWallState.fetch(statePda);
    assert.equal(stateAccount.totalWishes.toNumber(), 1);
  });

  it("Creates a second wish", async () => {
    const content = "愿世界和平";
    const nickname = "小红";

    // Derive wish PDA for wish #2
    [wish2Pda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("wish"), Buffer.from([2, 0, 0, 0, 0, 0, 0, 0])], // u64 little-endian for 2
      program.programId
    );

    const tx = await program.methods
      .createWish(content, nickname)
      .accounts({
        state: statePda,
        wish: wish2Pda,
        owner: authority.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log("Create second wish transaction signature:", tx);

    // Fetch and verify wish
    const wishAccount = await program.account.wish.fetch(wish2Pda);
    assert.equal(wishAccount.wishId.toNumber(), 2);
    assert.equal(wishAccount.content, content);
    assert.equal(wishAccount.nickname, nickname);

    // Verify state updated
    const stateAccount = await program.account.wishWallState.fetch(statePda);
    assert.equal(stateAccount.totalWishes.toNumber(), 2);
  });

  it("Updates wish status to fulfilled", async () => {
    const tx = await program.methods
      .updateWishStatus({ fulfilled: {} })
      .accounts({
        wish: wish1Pda,
        owner: authority.publicKey,
      })
      .rpc();

    console.log("Update wish status transaction signature:", tx);

    // Fetch and verify wish status changed
    const wishAccount = await program.account.wish.fetch(wish1Pda);
    assert.deepEqual(wishAccount.status, { fulfilled: {} });
  });

  it("Updates wish status to unfulfilled", async () => {
    const tx = await program.methods
      .updateWishStatus({ unfulfilled: {} })
      .accounts({
        wish: wish2Pda,
        owner: authority.publicKey,
      })
      .rpc();

    console.log("Update wish status transaction signature:", tx);

    // Fetch and verify wish status changed
    const wishAccount = await program.account.wish.fetch(wish2Pda);
    assert.deepEqual(wishAccount.status, { unfulfilled: {} });
  });

  it("Donates SOL to a wish", async () => {
    // Create a donor account
    const donor = anchor.web3.Keypair.generate();

    // Airdrop some SOL to donor
    const airdropSig = await provider.connection.requestAirdrop(
      donor.publicKey,
      2 * anchor.web3.LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airdropSig);

    const donationAmount = new anchor.BN(0.1 * anchor.web3.LAMPORTS_PER_SOL);

    // Get wish owner balance before donation
    const ownerBalanceBefore = await provider.connection.getBalance(authority.publicKey);

    const tx = await program.methods
      .donateToWish(donationAmount)
      .accounts({
        wish: wish1Pda,
        donor: donor.publicKey,
        wishOwner: authority.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([donor])
      .rpc();

    console.log("Donate transaction signature:", tx);

    // Fetch and verify donation recorded
    const wishAccount = await program.account.wish.fetch(wish1Pda);
    assert.equal(wishAccount.totalDonations.toString(), donationAmount.toString());

    // Verify SOL transferred to owner
    const ownerBalanceAfter = await provider.connection.getBalance(authority.publicKey);
    assert.equal(ownerBalanceAfter - ownerBalanceBefore, donationAmount.toNumber());
  });

  it("Rejects empty content", async () => {
    try {
      const [wishPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("wish"), Buffer.from([3, 0, 0, 0, 0, 0, 0, 0])],
        program.programId
      );

      await program.methods
        .createWish("", "test")
        .accounts({
          state: statePda,
          wish: wishPda,
          owner: authority.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      assert.fail("Should have thrown an error for empty content");
    } catch (err) {
      assert.include(err.toString(), "EmptyContent");
    }
  });

  it("Rejects empty nickname", async () => {
    try {
      const [wishPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("wish"), Buffer.from([3, 0, 0, 0, 0, 0, 0, 0])],
        program.programId
      );

      await program.methods
        .createWish("Some content", "")
        .accounts({
          state: statePda,
          wish: wishPda,
          owner: authority.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      assert.fail("Should have thrown an error for empty nickname");
    } catch (err) {
      assert.include(err.toString(), "EmptyNickname");
    }
  });

  it("Queries all wishes", async () => {
    // Fetch all wish accounts
    const wishes = await program.account.wish.all();

    console.log(`Total wishes found: ${wishes.length}`);
    wishes.forEach((wish) => {
      console.log(`Wish #${wish.account.wishId}: ${wish.account.content} by ${wish.account.nickname}`);
    });

    assert.equal(wishes.length, 2);
  });
});
