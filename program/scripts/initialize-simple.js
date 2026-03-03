const { Connection, PublicKey, Keypair, Transaction, TransactionInstruction } = require("@solana/web3.js");
const fs = require("fs");
const { Buffer } = require("buffer");

async function main() {
  console.log("🚀 Initializing Wish Wall Program...\n");

  // Program ID
  const programId = new PublicKey("BjqDFqtQoFVmH1HKEN8NUcTPrbhVXJZp7P8s2pibvL8M");
  console.log("Program ID:", programId.toString());

  // Connect to devnet
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");

  // Load the keypair
  const keypairPath = require("os").homedir() + "/.config/solana/id.json";
  const keypairData = JSON.parse(fs.readFileSync(keypairPath, "utf8"));
  const payer = Keypair.fromSecretKey(new Uint8Array(keypairData));

  console.log("Payer:", payer.publicKey.toString());

  // Check balance
  const balance = await connection.getBalance(payer.publicKey);
  console.log("Balance:", balance / 1e9, "SOL\n");

  // Derive state PDA
  const [statePda, bump] = PublicKey.findProgramAddressSync(
    [Buffer.from("wish-wall-state")],
    programId
  );

  console.log("State PDA:", statePda.toString());
  console.log("Bump:", bump, "\n");

  try {
    // Check if already initialized
    const accountInfo = await connection.getAccountInfo(statePda);

    if (accountInfo && accountInfo.data.length > 0) {
      console.log("✅ Program already initialized!");
      console.log("Account data length:", accountInfo.data.length);

      // Parse the data to show total wishes
      // Structure: discriminator (8 bytes) + authority (32 bytes) + total_wishes (8 bytes) + bump (1 byte)
      if (accountInfo.data.length >= 49) {
        const totalWishesBuffer = accountInfo.data.slice(40, 48);
        const totalWishes = totalWishesBuffer.readBigUInt64LE();
        console.log("Total wishes:", totalWishes.toString());

        const authorityBuffer = accountInfo.data.slice(8, 40);
        const authority = new PublicKey(authorityBuffer);
        console.log("Authority:", authority.toString());
      }
    } else {
      // Not initialized yet, let's initialize it
      console.log("📝 Initializing program state...\n");

      // Initialize instruction discriminator (first 8 bytes of SHA256("global:initialize"))
      const discriminator = Buffer.from([175, 175, 109, 31, 13, 152, 155, 237]);

      // Build instruction
      const instruction = new TransactionInstruction({
        keys: [
          { pubkey: statePda, isSigner: false, isWritable: true },
          { pubkey: payer.publicKey, isSigner: true, isWritable: true },
          { pubkey: new PublicKey("11111111111111111111111111111111"), isSigner: false, isWritable: false },
        ],
        programId: programId,
        data: discriminator,
      });

      // Create and send transaction
      const transaction = new Transaction().add(instruction);
      const signature = await connection.sendTransaction(transaction, [payer]);

      console.log("Transaction signature:", signature);
      console.log("Confirming transaction...");

      await connection.confirmTransaction(signature, "confirmed");

      console.log("✅ Transaction confirmed!");

      // Verify initialization
      const stateAccount = await connection.getAccountInfo(statePda);
      if (stateAccount && stateAccount.data.length > 0) {
        console.log("\n✅ Program initialized successfully!");
        console.log("Account data length:", stateAccount.data.length);

        // Parse total wishes
        const totalWishesBuffer = stateAccount.data.slice(40, 48);
        const totalWishes = totalWishesBuffer.readBigUInt64LE();
        console.log("Total wishes:", totalWishes.toString());

        const authorityBuffer = stateAccount.data.slice(8, 40);
        const authority = new PublicKey(authorityBuffer);
        console.log("Authority:", authority.toString());
      }
    }
  } catch (err) {
    console.error("❌ Error:", err);
    throw err;
  }
}

main()
  .then(() => {
    console.log("\n🎉 Done!");
    process.exit(0);
  })
  .catch((err) => {
    console.error("\n❌ Failed:", err);
    process.exit(1);
  });
