const anchor = require("@coral-xyz/anchor");
const { Connection, PublicKey, Keypair } = require("@solana/web3.js");
const fs = require("fs");

async function main() {
  console.log("🚀 Initializing Wish Wall Program...\n");

  // Load the deployed program ID
  const idlPath = "./target/idl/wish_wall.json";
  const idl = JSON.parse(fs.readFileSync(idlPath, "utf8"));
  const programId = new PublicKey(idl.address);

  console.log("Program ID:", programId.toString());

  // Connect to local validator
  const connection = new Connection("http://localhost:8899", "confirmed");

  // Load the keypair from the default Solana CLI location
  const keypairPath = require("os").homedir() + "/.config/solana/id.json";
  const keypairData = JSON.parse(fs.readFileSync(keypairPath, "utf8"));
  const payer = Keypair.fromSecretKey(new Uint8Array(keypairData));

  console.log("Payer:", payer.publicKey.toString());

  // Check balance
  const balance = await connection.getBalance(payer.publicKey);
  console.log("Balance:", balance / 1e9, "SOL\n");

  // Setup provider
  const wallet = new anchor.Wallet(payer);
  const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });
  anchor.setProvider(provider);

  // Load the program
  const program = new anchor.Program(idl, programId, provider);

  // Derive state PDA
  const [statePda] = PublicKey.findProgramAddressSync(
    [Buffer.from("wish-wall-state")],
    program.programId
  );

  console.log("State PDA:", statePda.toString());

  try {
    // Check if already initialized
    const stateAccount = await program.account.wishWallState.fetch(statePda);
    console.log("\n✅ Program already initialized!");
    console.log("Total wishes:", stateAccount.totalWishes.toString());
    console.log("Authority:", stateAccount.authority.toString());
  } catch (err) {
    // Not initialized yet, let's initialize it
    console.log("\n📝 Initializing program state...");

    const tx = await program.methods
      .initialize()
      .accounts({
        state: statePda,
        authority: payer.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log("✅ Initialize transaction signature:", tx);

    // Verify initialization
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
