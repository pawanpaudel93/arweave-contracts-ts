interface State {
  balances: { [address: string]: number };
  canEvolve: boolean;
  ticker: string;
  owner: string;
  evolve: any;
}

interface Action {
  input: {
    function: string;
    target?: string;
    qty?: number;
    value?: any;
  };
  caller: string;
}

interface TransferInput {
  function: "transfer";
  target: string;
  qty: number;
}

interface BalanceInput {
  function: "balance";
  target: string;
}

interface EvolveInput {
  function: "evolve";
  value: boolean;
}

interface TransferResult {
  state: State;
}

interface BalanceResult {
  result: {
    target: string;
    ticker: string;
    balance: number;
  };
}
