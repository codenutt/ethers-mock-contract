import { expect } from "chai";

import { ContractFactory, Signer, Wallet } from "ethers";

import { Doppelganger, deployMockContract } from "ethers-mock-contract";

import hre from "hardhat";

import CounterArtifact from "../artifacts/contracts/Counter.sol/Counter.json";
import { Counter__factory } from "../typechain-types/factories/Counter__factory";
import { HardhatEthersProvider } from "@nomicfoundation/hardhat-ethers/internal/hardhat-ethers-provider";

describe("Mock Contract - Integration (called directly)", () => {
  let wallet: Signer;
  let provider: HardhatEthersProvider;

  beforeEach(async () => {
    [wallet] = await hre.ethers.getSigners();
    provider = await hre.ethers.provider;
  });

  it("throws readable error if mock was not set up for a method", async () => {
    const mockCounter = await deployMockContract(wallet, CounterArtifact.abi);

    await expect(mockCounter.read()).to.be.revertedWith("Mock on the method is not initialized");
  });

  it("mocking returned values", async () => {
    const mockCounter = await deployMockContract(wallet, CounterArtifact.abi);
    await mockCounter.mock.read.returns(45291);

    expect(await mockCounter.read()).to.equal(45291);
  });

  it("mocking revert", async () => {
    const mockCounter = await deployMockContract(wallet, CounterArtifact.abi);
    await mockCounter.mock.read.reverts();

    await expect(mockCounter.read()).to.be.revertedWith("Mock revert");
  });

  it("mock with call arguments", async () => {
    const mockCounter = await deployMockContract(wallet, CounterArtifact.abi);
    await mockCounter.mock.add.returns(1);
    await mockCounter.mock.add.withArgs(1).returns(2);
    await mockCounter.mock.add.withArgs(2).reverts();

    expect(await mockCounter.add(0)).to.equal(1);
    expect(await mockCounter.add(1)).to.equal(2);
    await expect(mockCounter.add(2)).to.be.revertedWith("Mock revert");
    expect(await mockCounter.add(3)).to.equal(1);
  });

  it("should be able to call to another contract", async () => {
    const counterFactory = new ContractFactory(CounterArtifact.abi, CounterArtifact.bytecode, wallet);
    const counter = await counterFactory.deploy();
    const mockCounter = await deployMockContract(wallet, CounterArtifact.abi);

    expect(await mockCounter.staticcall(counter, "read()")).to.equal("0");
    //expect(await mockCounter.staticcall(counter, "read")).to.equal("0");
  });

  it("should be able to call another contract with a parameter", async () => {
    const counterFactory = new ContractFactory(CounterArtifact.abi, CounterArtifact.bytecode, wallet);
    const counter = await counterFactory.deploy();
    const mockCounter = await deployMockContract(wallet, CounterArtifact.abi);

    expect(await mockCounter.staticcall(counter, "add", 1)).to.equal("1");
  });

  it("should be able to call another contract with many parameters", async () => {
    const counterFactory = new ContractFactory(CounterArtifact.abi, CounterArtifact.bytecode, wallet);
    const counter = await counterFactory.deploy();
    const mockCounter = await deployMockContract(wallet, CounterArtifact.abi);

    expect(await mockCounter.staticcall(counter, "addThree", 1, 2, 3)).to.equal("6");
  });

  it("should be able to execute another contract", async () => {
    const counterFactory = new Counter__factory(wallet);
    const counter = await counterFactory.deploy();
    const mockCounter = await deployMockContract(wallet, CounterArtifact.abi);

    await mockCounter.call(counter, "increment()");
    expect(await counter.read()).to.equal("1");

    await mockCounter.call(counter, "increment");
    expect(await counter.read()).to.equal("2");
  });

  it("should be able to execute another contract with a parameter", async () => {
    const counterFactory = new Counter__factory(wallet);
    const counter = await counterFactory.deploy();
    const mockCounter = await deployMockContract(wallet, CounterArtifact.abi);

    await mockCounter.call(counter, "increaseBy", 2);
    expect(await counter.read()).to.equal("2");
  });

  it("should be able to execute another contract with many parameters", async () => {
    const counterFactory = new Counter__factory(wallet);
    const counter = await counterFactory.deploy();
    const mockCounter = await deployMockContract(wallet, CounterArtifact.abi);

    await mockCounter.call(counter, "increaseByThreeValues", 1, 2, 3);
    expect(await counter.read()).to.equal("6");
  });

  it("can be deployed under specified address", async () => {
    const address = Wallet.createRandom().address;
    const mockCounter = await deployMockContract(wallet, CounterArtifact.abi, {
      address,
    });
    const mockCounterAddress = await mockCounter.getAddress();
    expect(mockCounterAddress).to.eq(address);
    expect(await provider.getCode(address)).to.eq(`0x${Doppelganger.evm.deployedBytecode.object}`);
  });

  it("can't be deployed twice under the same address", async () => {
    const address = Wallet.createRandom().address;
    await deployMockContract(wallet, CounterArtifact.abi, { address });
    await expect(deployMockContract(wallet, CounterArtifact.abi, { address })).to.be.eventually.rejectedWith(
      Error,
      `${address} already contains a contract`
    );
  });

  it("can be overridden", async () => {
    const counterFactory = new Counter__factory(wallet);
    const counter = await counterFactory.deploy();
    const counterAddress = await counter.getAddress();
    expect(await provider.getCode(counterAddress)).to.eq(CounterArtifact.deployedBytecode);
    await deployMockContract(wallet, CounterArtifact.abi, {
      address: counterAddress,
      override: true,
    });
    expect(await provider.getCode(counterAddress)).to.eq(`0x${Doppelganger.evm.deployedBytecode.object}`);
  });
});
