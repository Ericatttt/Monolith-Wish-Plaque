const anchor = require("@coral-xyz/anchor");
const { Connection, PublicKey, Keypair, SystemProgram } = require("@solana/web3.js");
const fs = require("fs");

async function main() {
  console.log("🚀 Initializing Wish Wall Program...\n");

  // Use the deployed program ID from the app
  const programId = new PublicKey("HXP5UvapL8Pv9P1vY7LYhAMv2VcbJZnn7zhfRJ9Eb8Bv");
  console.log("Program ID:", programId.toString());

  // Connect to local validator
  const connection = new Connection("http://localhost:8899", "confirmed");

  // Load the keypair
  const keypairPath = require("os").homedir() + "/.config/solana/id.json";
  const keypairData = JSON.parse(fs.readFileSync(keypairPath, "utf8"));
  const payer = Keypair.fromSecretKey(new Uint8Array(keypairData));

  console.log("Payer:", payer.publicKey.toString());

  // Check balance
  const balance = await connection.getBalance(payer.publicKey);
  console.log("Balance:", balance / 1e9, "SOL\n");

  // Derive state PDA
  const [statePda] = PublicKey.findProgramAddressSync(
    [Buffer.from("wish-wall-state")],
    programId
  );

  console.log("State PDA:", statePda.toString());

  // Load the IDL (using the file but with our program ID)
  const idl = JSON.parse(fs.readFileSync("./target/idl/wish_wall.json", "utf8"));
  
  // Setup provider
  const wallet = new anchor.Wallet(payer);
  const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });
  
  // Create program instance with correct ID
  const program = new anchor.Program(idl, programId, provider);

  try {
    // Check if already initialized
    const stateAccount = await program.account.wishWallState.fetch(statePda);
    console.log("\n✅ Program already initialized!");
    console.log("Total wishes:", stateAccount.totalWishes.toString());
    console.log("Authority:", stateAccount.authority.toString());
  } catch (err) {
    // Not initialized yet
    console.log("\n📝 Initializing program state...");

    const tx = await program.methods
      .initialize()
      .accounts({
        state: statePda,
        authority: payer.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log("✅ Transaction signature:", tx);

    // Verify
    const stateAccount = await program.account.wishWallState.fetch(statePda);
    console.log("\n✅ Program initialized successfully!");
    console.log("Total wishes:", stateAccount.totalWishes.toString());
    console.log("Authority:", stateAccount.authority.toString());
  }
}

main()
  .then(() => {
    console.log("\n🎉 Done!");
    process.exit(0);
  })
  .catch((err) => {
    console.error("\n❌ Error:", err);
    process.exit(1);
  });
