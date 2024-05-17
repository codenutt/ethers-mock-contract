import { expect } from "chai";
import { Contract, ContractFactory, Signer, Wallet } from "ethers";

import { MockContract, deployMockContract } from "ethers-mock-contract";

import Counter from "../artifacts/contracts/Counter.sol/Counter.json";
import Proxy from "../artifacts/contracts/Proxy.sol/Proxy.json";
import hre from "hardhat";

describe("Mock Contract - Integration (called by other contract)", () => {
  let wallet: Signer;
  let mockCounter: MockContract<Contract>;
  let capContract: Contract;

  beforeEach(async () => {
    [wallet] = await hre.ethers.getSigners();

    mockCounter = await deployMockContract(wallet, Counter.abi);
    const capFactory = new ContractFactory(Proxy.abi, Proxy.bytecode, wallet);
    const mockCounterAddress = await mockCounter.getAddress();
    capContract = (await capFactory.deploy(mockCounterAddress)) as unknown as Contract;
  });

  it("mocking returned values", async () => {
    await mockCounter.mock.read.returns(5);
    expect(await capContract.readCapped()).to.equal(5);

    await mockCounter.mock.read.returns(12);
    expect(await capContract.readCapped()).to.equal(10);
  });

  it("mocking revert", async () => {
    await mockCounter.mock.read.reverts();
    await expect(capContract.readCapped()).to.be.revertedWith("Mock revert");
  });

  it("mocking with call arguments", async () => {
    await mockCounter.mock.add.withArgs(1).returns(1);
    await mockCounter.mock.add.withArgs(2).returns(2);

    expect(await capContract.addCapped(1)).to.equal(1);
    expect(await capContract.addCapped(2)).to.equal(2);
  });

  it("Mocking a contract for an already initialized proxy", async () => {
    const address = Wallet.createRandom().address;
    const proxyFactory = new ContractFactory(Proxy.abi, Proxy.bytecode, wallet);
    const proxy = (await proxyFactory.deploy(address)) as unknown as Contract;
    const mockContract = await deployMockContract(wallet, Counter.abi, { address });
    await mockContract.mock.read.returns(1);
    expect(await proxy.readCapped()).to.eq(1);
  });

  // Not supported yet
  // Track: https://github.com/NomicFoundation/hardhat/issues/3234

  //   it("calledOnContract with mock contract", async () => {
  //     await mockCounter.mock.read.returns(1);
  //     await capContract.readCapped();
  //     console.log(expect("read").to.be.);
  //     expect("read").to.be.calledOn(mockCounter);
  //   });

  //   it("calledOnContractWith with mock contract", async () => {
  //     await mockCounter.mock.add.returns(1);
  //     await capContract.addCapped(1);
  //     expect("add").to.be.calledOnceWith(mockCounter, [1]);
  //   });
});
