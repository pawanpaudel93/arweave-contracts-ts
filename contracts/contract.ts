export function handle(state: State, action: Action): TransferResult | BalanceResult {
  const balances = state.balances;
  const canEvolve = state.canEvolve;
  const input = action.input;
  const caller = action.caller;

  if (input.function === "transfer") {
    const target = (input as TransferInput).target;
    const qty = (input as TransferInput).qty;

    if (!Number.isInteger(qty)) {
      throw new Error('Invalid value for "qty". Must be an integer');
    }

    if (!target) {
      throw new Error("No target specified");
    }

    if (qty <= 0 || caller === target) {
      throw new Error("Invalid token transfer");
    }

    if (balances[caller] < qty) {
      throw new Error(`Caller balance not high enough to send ${qty} token(s)!`);
    }

    // Lower the token balance of the caller
    balances[caller] -= qty;
    if (target in balances) {
      // Wallet already exists in state, add new tokens
      balances[target] += qty;
    } else {
      // Wallet is new, set starting balance
      balances[target] = qty;
    }

    return { state };
  }

  if (input.function === "balance") {
    const target = (input as BalanceInput).target;
    const ticker = state.ticker;

    if (typeof target !== "string") {
      throw new Error("Must specify target to get balance for");
    }

    if (typeof balances[target] !== "number") {
      throw new Error("Cannot get balance, target does not exist");
    }

    return { result: { target, ticker, balance: balances[target] } };
  }

  if (input.function === "evolve" && canEvolve) {
    if (state.owner !== caller) {
      throw new Error("Only the owner can evolve a contract.");
    }

    state.evolve = (input as EvolveInput).value;

    return { state };
  }

  throw new Error(`No function supplied or function not recognized: "${input.function}"`);
}
