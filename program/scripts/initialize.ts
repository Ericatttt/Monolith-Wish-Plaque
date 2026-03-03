import * as anchor from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";

async function main() {
  // Configure the client to use the local cluster
  anchor.setProvider(anchor.AnchorProvider.env());
  const provider = anchor.getProvider();

  // Update program ID to deployed one
  const programId = new PublicKey("HXP5UvapL8Pv9P1vY7LYhAMv2VcbJZnn7zhfRJ9Eb8Bv");
  const idl = require("../target/idl/wish_wall.json");
  const program = new anchor.Program(idl, programId, provider);

  // Derive state PDA
  const [statePda] = PublicKey.findProgramAddressSync(
    [Buffer.from("wish-wall-state")],
    programId
  );

  console.log("Initializing wish wall...");
  console.log("State PDA:", statePda.toBase58());
  console.log("Authority:", provider.publicKey.toBase58());

  try {
    // Check if already initialized
    try {
      const state = await program.account.wishWallState.fetch(statePda);
      console.log("✅ Program already initialized!");
      console.log("Total wishes:", state.totalWishes.toString());
      return;
    } catch (e) {
      // Not initialized yet, continue
      console.log("Initializing for the first time...");
    }

    // Initialize
    const tx = await program.methods
      .initialize()
      .accounts({
        authority: provider.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log("✅ Initialization successful!");
    console.log("Transaction signature:", tx);

    // Verify
    const state = await program.account.wishWallState.fetch(statePda);
    console.log("Total wishes:", state.totalWishes.toString());
    console.log("Authority:", state.authority.toBase58());
  } catch (error) {
    console.error("❌ Initialization failed:");
    console.error(error);
    throw error;
  }
}

main()
  .then(() => {
    console.log("\n🎉 Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Error:", error);
    process.exit(1);
  });
