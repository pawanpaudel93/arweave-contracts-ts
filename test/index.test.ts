import fs from "fs";
import path from "path";
import { default as ArLocal } from "arlocal";
import { LoggerFactory, Warp, WarpFactory } from "warp-contracts";
import { DeployPlugin } from "warp-contracts-plugin-deploy";

describe("Testing PST contract", () => {
  let arLocal: ArLocal,
    warp: Warp,
    wallet: any,
    contractSrc: string,
    initState: { balances: { [x: string]: number }; owner: string },
    contractId: string,
    contract: {
      readState: () => PromiseLike<{ cachedValue: any }> | { cachedValue: any };
      writeInteraction: (arg0: { function: string; target?: any; qty: any }, arg1?: { strict: boolean }) => any;
    },
    walletAddress: string,
    targetAddress: string;

  beforeAll(async () => {
    // Set up ArLocal
    arLocal = new ArLocal(1984, false);
    await arLocal.start();

    // Set up Warp client
    LoggerFactory.INST.logLevel("info");
    warp = WarpFactory.forLocal(1984).use(new DeployPlugin());

    // note: warp.testing.generateWallet() automatically adds funds to the wallet
    ({ jwk: wallet } = await warp.generateWallet());
    const { jwk: targetWallet } = await warp.generateWallet();
    walletAddress = await warp.arweave.wallets.jwkToAddress(wallet);
    targetAddress = await warp.arweave.wallets.jwkToAddress(targetWallet);

    // Deploying contract
    const contractsDir = path.resolve("dist");
    contractSrc = fs.readFileSync(path.join(contractsDir, "contract.js"), "utf8");
    initState = JSON.parse(fs.readFileSync(path.join(contractsDir, "init-state.json"), "utf8"));

    initState.balances = { [walletAddress]: 10000000 };
    initState.owner = walletAddress;
    console.log("Initial State: ", initState);
    ({ contractTxId: contractId } = await warp.deploy({
      wallet,
      initState: JSON.stringify(initState),
      src: contractSrc,
    }));
    contract = warp.contract(contractId).connect(wallet);
  });

  afterAll(async () => {
    await arLocal.stop();
  });

  it("should properly deploy contract", async () => {
    const contractTx = await warp.arweave.transactions.get(contractId);

    expect(contractTx).not.toBeNull();
  });

  it("should read Initial state", async () => {
    expect((await contract.readState()).cachedValue.state).toEqual(initState);
  });

  it("should transfer balance", async () => {
    const qty = 1000;
    await contract.writeInteraction({
      function: "transfer",
      target: targetAddress,
      qty,
    });

    const { cachedValue } = await contract.readState();
    expect(cachedValue.state.balances[walletAddress]).toEqual(initState.balances[walletAddress] - qty);
    expect(cachedValue.state.balances[targetAddress]).toEqual(qty);
  });

  it("should not possibe to transfer without target", async () => {
    await expect(contract.writeInteraction({ function: "transfer", qty: 1000 }, { strict: true })).rejects.toThrow(
      "No target specified"
    );
  });

  it("should not possible to transfer more than balance available", async () => {
    const qty = initState.balances[walletAddress] + 1;
    await expect(
      contract.writeInteraction({ function: "transfer", qty, target: targetAddress }, { strict: true })
    ).rejects.toThrow(`Caller balance not high enough to send ${qty} token(s)!`);
  });
});
