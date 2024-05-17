import { expect } from "chai";
import { Signer } from "ethers";
import { deployMockContract } from "ethers-mock-contract";

import counterContract from "../artifacts/contracts/Counter.sol/Counter.json";

import hre from "hardhat";
import { Proxy__factory } from "../typechain-types";

describe("Mock contract chaining behavior", () => {
  let wallet: Signer;

  beforeEach(async () => {
    [wallet] = await hre.ethers.getSigners();
  });

  it("chaining return values", async () => {
    const mockCounter = await deployMockContract(wallet, counterContract.abi);

    await mockCounter.mock.increment.returns(1).returns(2).returns(3);

    expect(await mockCounter.increment.staticCall()).to.eq(1);
    await mockCounter.increment();
    expect(await mockCounter.increment.staticCall()).to.eq(2);
    await mockCounter.increment();
    expect(await mockCounter.increment.staticCall()).to.eq(3);
  });

  it("chaining reverts", async () => {
    const mockCounter = await deployMockContract(wallet, counterContract.abi);

    await mockCounter.mock.increment.returns(1).returns(2).reverts();

    expect(await mockCounter.increment.staticCall()).to.eq(1);
    await mockCounter.increment();
    expect(await mockCounter.increment.staticCall()).to.eq(2);
    await mockCounter.increment();
    await expect(mockCounter.increment()).to.be.reverted;
  });

  it("chaining reverts with reason", async () => {
    const mockCounter = await deployMockContract(wallet, counterContract.abi);

    await mockCounter.mock.increment.returns(1).returns(2).revertsWithReason("reason");

    expect(await mockCounter.increment.staticCall()).to.eq(1);
    await mockCounter.increment();
    expect(await mockCounter.increment.staticCall()).to.eq(2);
    await mockCounter.increment();
    await expect(mockCounter.increment()).to.be.revertedWith("reason");
  });

  it("the last return value is used for all subsequent calls", async () => {
    const mockCounter = await deployMockContract(wallet, counterContract.abi);

    await mockCounter.mock.increment.returns(1).returns(2);

    expect(await mockCounter.increment.staticCall()).to.eq(1);
    await mockCounter.increment();
    expect(await mockCounter.increment.staticCall()).to.eq(2);
    await mockCounter.increment();
    expect(await mockCounter.increment.staticCall()).to.eq(2);
  });

  it("revert has to be the last call", async () => {
    const mockCounter = await deployMockContract(wallet, counterContract.abi);

    expect(() => {
      return mockCounter.mock.increment.reverts().returns(1);
    }).to.throw("Revert must be the last call");

    expect(() => {
      return mockCounter.mock.increment.returns(1).reverts();
    }).to.not.throw();
  });

  it("withArgs can be called only once", async () => {
    const mockCounter = await deployMockContract(wallet, counterContract.abi);

    expect(() => {
      return mockCounter.mock.increaseBy.returns(1).withArgs(1).withArgs(2);
    }).to.throw("withArgs can be called only once");
  });

  it("return chaining with withArgs", async () => {
    const mockCounter = await deployMockContract(wallet, counterContract.abi);

    await mockCounter.mock.increaseBy.withArgs(1).returns(1).returns(2);
    await mockCounter.mock.increaseBy.withArgs(2).returns(3).returns(4);

    expect(await mockCounter.increaseBy.staticCall(1)).to.eq(1);
    await mockCounter.increaseBy(1);
    expect(await mockCounter.increaseBy.staticCall(1)).to.eq(2);
    await mockCounter.increaseBy(1);
    expect(await mockCounter.increaseBy.staticCall(1)).to.eq(2);

    expect(await mockCounter.increaseBy.staticCall(2)).to.eq(3);
    await mockCounter.increaseBy(2);
    expect(await mockCounter.increaseBy.staticCall(2)).to.eq(4);
    await mockCounter.increaseBy(2);
    expect(await mockCounter.increaseBy.staticCall(2)).to.eq(4);
  });

  it("double call in one transaction", async () => {
    const mockCounter = await deployMockContract(wallet, counterContract.abi);
    const proxyFactory = new Proxy__factory(wallet);
    const mockCounterAddress = await mockCounter.getAddress();
    const proxy = await proxyFactory.deploy(mockCounterAddress);

    await mockCounter.mock.increment.returns(1).returns(2);

    expect(await proxy.incrementTwice.staticCall()).to.eq(1 + 2);

    await mockCounter.mock.increaseBy.returns(3).returns(4);

    expect(await proxy.increaseByTwice.staticCall(1)).to.eq(3 + 4);
  });

  it("queue overwrite", async () => {
    const mockCounter = await deployMockContract(wallet, counterContract.abi);

    await mockCounter.mock.increment.returns(1).returns(2);
    await mockCounter.mock.increment.returns(3).returns(4);

    expect(await mockCounter.increment.staticCall()).to.eq(3);
    await mockCounter.increment();
    expect(await mockCounter.increment.staticCall()).to.eq(4);
    await mockCounter.increment();
    expect(await mockCounter.increment.staticCall()).to.eq(4);
  });
});
