/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  AbiCoder,
  BaseContract,
  Contract,
  ContractFactory,
  Fragment,
  FunctionFragment,
  Interface,
  JsonFragment,
  JsonRpcProvider,
  Signer,
} from "ethers";

import { Doppelganger } from "./Doppelganger.js";
export { Doppelganger };

type ABI = string | Array<Fragment | JsonFragment | string>;

interface StubInterface {
  returns(...args: any): StubInterface;
  reverts(): StubInterface;
  revertsWithReason(reason: string): StubInterface;
  withArgs(...args: any[]): StubInterface;
}

type AnyFns = {
  [key: string]: any;
};
export interface MockContractFunctions extends AnyFns {
  [key: string]: any;
  call(contract: Contract | BaseContract, functionName: string, ...params: any[]): Promise<any>;

  staticcall(contract: Contract | BaseContract, functionName: string, ...params: any[]): Promise<any>;
}

type MockContractExtension = BaseContract & MockContractFunctions;

type GetFunctionNamed = {
  getFunction(nameOrSignature: any): FunctionFragment | null;
};
type TypeChainContract = {
  interface: GetFunctionNamed;
};

type GetFnType<T extends TypeChainContract> = T["interface"]["getFunction"];

type GetFnParamsType<T extends TypeChainContract> = Parameters<GetFnType<T>>[0];

type ContractToMock = {
  interface: {
    getFunction(nameOrSignature: string): any;
  };
};

export interface MockContract<T extends ContractToMock> extends MockContractExtension {
  mock: {
    [key in "receive" | GetFnParamsType<T>]: StubInterface;
  };
}

class Stub implements StubInterface {
  callData: string;
  stubCalls: Array<() => Promise<any>> = [];
  revertSet = false;
  argsSet = false;

  constructor(
    private mockContract: Contract,
    private encoder: AbiCoder,
    private func: FunctionFragment
  ) {
    this.callData = func.selector;
  }

  private err(reason: string): never {
    this.stubCalls = [];
    this.revertSet = false;
    this.argsSet = false;
    throw new Error(reason);
  }

  returns(...args: any) {
    if (this.revertSet) this.err("Revert must be the last call");
    if (!this.func.outputs) this.err("Cannot mock return values from a void function");
    const encoded = this.encoder.encode(this.func.outputs, args);

    // if there no calls then this is the first call and we need to use mockReturns to override the queue
    if (this.stubCalls.length === 0) {
      this.stubCalls.push(async () => {
        await this.mockContract.__waffle__mockReturns(this.callData, encoded);
      });
    } else {
      this.stubCalls.push(async () => {
        await this.mockContract.__waffle__queueReturn(this.callData, encoded);
      });
    }
    return this;
  }

  reverts() {
    if (this.revertSet) this.err("Revert must be the last call");

    // if there no calls then this is the first call and we need to use mockReturns to override the queue
    if (this.stubCalls.length === 0) {
      this.stubCalls.push(async () => {
        await this.mockContract.__waffle__mockReverts(this.callData, "Mock revert");
      });
    } else {
      this.stubCalls.push(async () => {
        await this.mockContract.__waffle__queueRevert(this.callData, "Mock revert");
      });
    }
    this.revertSet = true;
    return this;
  }

  revertsWithReason(reason: string) {
    if (this.revertSet) this.err("Revert must be the last call");

    // if there no calls then this is the first call and we need to use mockReturns to override the queue
    if (this.stubCalls.length === 0) {
      this.stubCalls.push(async () => {
        await this.mockContract.__waffle__mockReverts(this.callData, reason);
      });
    } else {
      this.stubCalls.push(async () => {
        await this.mockContract.__waffle__queueRevert(this.callData, reason);
      });
    }
    this.revertSet = true;
    return this;
  }

  withArgs(...params: any[]) {
    if (this.argsSet) this.err("withArgs can be called only once");
    this.callData = this.mockContract.interface.encodeFunctionData(this.func, params);
    this.argsSet = true;
    return this;
  }

  async then(resolve: () => void, reject: (e: any) => void) {
    for (let i = 0; i < this.stubCalls.length; i++) {
      try {
        await this.stubCalls[i]();
      } catch (e) {
        this.stubCalls = [];
        this.argsSet = false;
        this.revertSet = false;
        reject(e);
        return;
      }
    }

    this.stubCalls = [];
    this.argsSet = false;
    this.revertSet = false;
    resolve();
  }
}

type DeployOptions = {
  address: string;
  override?: boolean;
};

async function deploy(signer: Signer, options?: DeployOptions) {
  if (options) {
    const { address, override } = options;
    if (!signer.provider) {
      throw new Error("Signer must have provider");
    }
    const provider = signer.provider as unknown as JsonRpcProvider;
    if (!provider.send) {
      throw new Error("Provider must have a send fn");
    }
    if (!override && (await provider.getCode(address)) !== "0x") {
      throw new Error(
        `${address} already contains a contract. ` + "If you want to override it, set the override parameter."
      );
    }
    if ((provider as any)._hardhatNetwork || (provider as any)._networkName === "hardhat") {
      if (await provider.send("hardhat_setCode", [address, `0x${Doppelganger.evm.deployedBytecode.object}`])) {
        return new Contract(address, Doppelganger.abi, signer);
      } else throw new Error(`Couldn't deploy at ${address}`);
    } else {
      if (await provider.send("evm_setAccountCode", [address, `0x${Doppelganger.evm.deployedBytecode.object}`])) {
        return new Contract(address, Doppelganger.abi, signer);
      } else throw new Error(`Couldn't deploy at ${address}`);
    }
  }
  const factory = new ContractFactory(Doppelganger.abi, `0x${Doppelganger.evm.bytecode.object}`, signer);

  return factory.deploy();
}

function createMock<T extends ContractToMock>(abi: ABI, mockContractInstance: Contract): MockContract<T>["mock"] {
  const contractInterface = new Interface(abi);
  const encoder = new AbiCoder();

  const mockedAbi = {} as MockContract<T>["mock"];

  contractInterface.forEachFunction((func) => {
    const stubbed = new Stub(mockContractInstance as MockContract<T>, encoder, func);
    (mockedAbi as any)[func.name] = stubbed;
    (mockedAbi as any)[func.format()] = stubbed;
  });

  (mockedAbi as any).receive = {
    returns: () => {
      throw new Error("Receive function return is not implemented.");
    },
    withArgs: () => {
      throw new Error("Receive function return is not implemented.");
    },
    reverts: () => mockContractInstance.__waffle__receiveReverts("Mock Revert"),
    revertsWithReason: (reason: string) => mockContractInstance.__waffle__receiveReverts(reason),
  };

  return mockedAbi;
}

export async function deployMockContract<T extends ContractToMock>(
  signer: Signer,
  abi: ABI,
  options?: DeployOptions
): Promise<MockContract<T>> {
  const mockContractInstance = await deploy(signer, options);

  const mock = createMock<T>(abi, mockContractInstance as Contract);
  const address = await mockContractInstance.getAddress();
  const mockedContract = new Contract(address, abi, signer) as MockContract<T>;
  mockedContract.mock = mock;

  const encoder = new AbiCoder();

  mockedContract.staticcall = async (contract: Contract, functionName: string, ...params: any[]) => {
    const func: FunctionFragment | null = contract.interface.getFunction(functionName);
    if (!func) {
      throw new Error(`Unknown function ${functionName}`);
    }
    if (!func.outputs) {
      throw new Error("Cannot staticcall function with no outputs");
    }
    const tx = await contract.getFunction(functionName).populateTransaction(...params);
    const data = tx.data;
    let result;

    const contractAddress = await contract.getAddress();
    const returnValue = await (mockContractInstance as any).__waffle__staticcall(contractAddress, data);
    result = encoder.decode(func.outputs, returnValue);
    if (result.length === 1) {
      result = result[0];
    }
    return result;
  };

  mockedContract.call = async (contract: Contract, functionName: string, ...params: any[]) => {
    const tx = await contract.getFunction(functionName).populateTransaction(...params);
    const data = tx.data;
    const contractAddress = await contract.getAddress();
    return (mockContractInstance as any).__waffle__call(contractAddress, data);
  };

  return mockedContract;
}
