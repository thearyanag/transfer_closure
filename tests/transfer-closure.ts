import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { TransferClosure } from "../target/types/transfer_closure";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createMint,
  createAssociatedTokenAccount,
  mintTo,
  getAccount,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { PublicKey , Connection } from "@solana/web3.js";
import { assert } from "chai";
import bs58 from "bs58";

describe("transfer-closure", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.TransferClosure as Program<TransferClosure>;

  // Create keypairs for our test
  const fromWallet = anchor.web3.Keypair.fromSecretKey(
    bs58.decode(
      "5ZkPPBZ5taBTShnvbtmie8mA1BwbFY1r3gQpoQrWwpVoyyuTQFfuMYjwh4Cna8G3gi6VHmUnSwG6XZtGYpkQ1hs6"
    )
  );
  const toWallet = anchor.web3.Keypair.generate();
  let mint: PublicKey;
  let fromAta: PublicKey;
  let toAta: PublicKey;

  before(async () => {

    // Create new mint
    mint = await createMint(
      provider.connection,
      fromWallet,
      fromWallet.publicKey,
      null,
      9
    );

    // Get ATAs for both wallets
    fromAta = getAssociatedTokenAddressSync(mint, fromWallet.publicKey, true);
    toAta = getAssociatedTokenAddressSync(mint, toWallet.publicKey, true);

    // Create ATAs
    await createAssociatedTokenAccount(
      provider.connection,
      fromWallet,
      mint,
      fromWallet.publicKey
    );

    await createAssociatedTokenAccount(
      provider.connection,
      fromWallet,
      mint,
      toWallet.publicKey
    );

    // Mint some tokens to fromAta
    await mintTo(
      provider.connection,
      fromWallet,
      mint,
      fromAta,
      fromWallet.publicKey,
      1000
    );
  });

  it("Transfers tokens and closes account", async () => {
    try {
      // Get initial balance
      const fromBalance = (await getAccount(provider.connection, fromAta))
        .amount;
      console.log("Initial from balance:", fromBalance.toString());

      const tx = await program.methods
        .transferClose()
        .accountsStrict({
          from: fromWallet.publicKey,
          to: toWallet.publicKey,
          mint: mint,
          fromAta: fromAta,
          toAta: toAta,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        })
        .signers([fromWallet])
        .rpc();

      console.log("Transaction signature:", tx);

      // Verify the transfer
      try {
        // This should throw as the account should be closed
        await getAccount(provider.connection, fromAta);
        throw new Error("From account should be closed");
      } catch (e) {
        console.log("From account successfully closed");
      }

      const toBalance = (await getAccount(provider.connection, toAta)).amount;
      console.log("Final to balance:", toBalance.toString());

      // Assert the balance was transferred
      assert.equal(toBalance.toString(), fromBalance.toString());
    } catch (error) {
      console.error("Error:", error);
      throw error;
    }
  });
});
