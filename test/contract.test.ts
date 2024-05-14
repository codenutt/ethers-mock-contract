import { expect } from "chai";
import { Contract, Signer } from "ethers";

import { Doppelganger__factory } from "../ethers-mock-contract/typechain-types/factories/Doppelganger__factory";
import { Counter__factory } from "../ethers-mock-contract/typechain-types/factories/tests/Counter__factory";
import { CounterOverloaded__factory } from "../ethers-mock-contract/typechain-types/factories/tests/CounterOverload.sol/CounterOverloaded__factory";

import hre from "hardhat";
import { Counter } from "../ethers-mock-contract/typechain-types/tests/Counter";
import { CounterOverloaded } from "../ethers-mock-contract/typechain-types/tests/CounterOverload.sol/CounterOverloaded";
import { Doppelganger } from "../ethers-mock-contract/typechain-types/Doppelganger";

describe("Doppelganger - Contract", () => {
  describe("mocking mechanism", () => {
    let sender: Signer;
    let contract: Doppelganger;
    let pretender: Counter;
    let pretenderOverloaded: CounterOverloaded;

    const readSignature = "0x57de26a4";

    beforeEach(async () => {
      [sender] = await hre.ethers.getSigners();

      contract = await new Doppelganger__factory(sender).deploy();

      pretender = new Contract(await contract.getAddress(), Counter__factory.abi, sender) as unknown as Counter;
      pretenderOverloaded = new Contract(
        await contract.getAddress(),
        CounterOverloaded__factory.abi,
        sender
      ) as unknown as CounterOverloaded;
    });

    it("reverts when trying to call a not initialized method", async () => {
      await expect(pretender.read()).to.be.revertedWith("Mock on the method is not initialized");
    });

    it("returns preprogrammed return values for mocked functions without arguments", async () => {
      const returnedValue = "0x1000000000000000000000000000000000000000000000000000000000004234";

      await contract.__waffle__mockReturns(readSignature, returnedValue);

      expect(await pretender.read()).to.equal(returnedValue);
    });

    it("returns preprogrammed return values for mocked functions with arguments", async () => {
      const addSignature = "0x1003e2d2";
      const callData = `${addSignature}0000000000000000000000000000000000000000000000000000000000000005`;
      const returnedValue = "0x1000000000000000000000000000000000000000000000000000000000004234";

      await contract.__waffle__mockReturns(callData, returnedValue);

      expect(await pretender.add(5)).to.equal(returnedValue);
    });

    it("allows function to be looked up by signature", async () => {
      const addSignature = "0x4f2be91f";
      const callData = `${addSignature}`;
      const returnedValue = "0x1000000000000000000000000000000000000000000000000000000000004234";

      await contract.__waffle__mockReturns(callData, returnedValue);

      expect(await pretenderOverloaded["add()"]()).to.equal(returnedValue);
    });

    it("reverts if mock was set up for call with some argument and method was called with another", async () => {
      const addSignature = "0x1003e2d2";
      const callData = `${addSignature}0000000000000000000000000000000000000000000000000000000000000005`;
      const returnedValue = "0x1000000000000000000000000000000000000000000000000000000000004234";

      await contract.__waffle__mockReturns(callData, returnedValue);

      await expect(pretender.add(2)).to.be.revertedWith("Mock on the method is not initialized");
    });

    it("calls with function signatures are handled as default mocks", async () => {
      const addSignature = "0x1003e2d2";
      const callData = `${addSignature}0000000000000000000000000000000000000000000000000000000000000005`;
      const returnedValue1 = "0x1000000000000000000000000000000000000000000000000000000000000001";
      const returnedValue2 = "0x1000000000000000000000000000000000000000000000000000000000000002";

      await contract.__waffle__mockReturns(callData, returnedValue1);
      await contract.__waffle__mockReturns(addSignature, returnedValue2);

      expect(await pretender.add(5)).to.equal(returnedValue1);
      expect(await pretender.add(6)).to.equal(returnedValue2);
    });

    it("supports different kinds of types as call arguments", async () => {
      const signature = "0xa64898c7";
      const uint = "0000000000000000000000000000000000000000000000000000000000000001";
      const bool = "0000000000000000000000000000000000000000000000000000000000000000";
      // eslint-disable-next-line max-len
      const str =
        "000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000c00000000000000000000000000000000000000000000000000000000000000003737472";
      // eslint-disable-next-line max-len
      const bytes =
        "000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000020123000000000000000000000000000000000000000000000000000000000000";
      const callData = `${signature}${uint}${bool}${str}${bytes}`;
      // eslint-disable-next-line max-len
      const returnedValue =
        "0x000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000020123000000000000000000000000000000000000000000000000000000000000";

      await contract.__waffle__mockReturns(callData, returnedValue);

      expect(await pretender.testArgumentTypes(1, false, "str", "0x0123")).to.equal("0x0123");
    });

    it("reverts with no message", async () => {
      await contract.__waffle__mockReverts(readSignature, "");
      await expect(pretender.read()).to.be.revertedWith("");
    });

    it("reverts with correct message", async () => {
      await contract.__waffle__mockReverts(readSignature, "Mock revert");
      await expect(pretender.read()).to.be.revertedWith("Mock revert");
    });

    it("reverts only with certain arguments", async () => {
      const addSignature = "0x1003e2d2";
      const callData = `${addSignature}0000000000000000000000000000000000000000000000000000000000000005`;
      const returnedValue = "0x1000000000000000000000000000000000000000000000000000000000004234";

      await contract.__waffle__mockReverts(callData, "Mock revert");
      await contract.__waffle__mockReturns(addSignature, returnedValue);

      await expect(pretender.add(5)).to.be.revertedWith("Mock revert");
      expect(await pretender.add(4)).to.equal(returnedValue);
    });
  });

  describe("call mechanisms", () => {
    let sender: Signer;
    let doppelganger: Doppelganger;
    let counter: Counter;

    beforeEach(async () => {
      [sender] = await hre.ethers.getSigners();
      doppelganger = await new Doppelganger__factory(sender).deploy();
      counter = await new Counter__factory(sender).deploy();
    });

    describe("staticcall()", () => {
      it("should allow a user to call a contract through the mock", async () => {
        const fn = counter.interface.getFunction("read");
        const data = fn.selector;
        const counterAddress = await counter.getAddress();
        expect(await doppelganger.__waffle__staticcall(counterAddress, data)).to.equal(
          "0x0000000000000000000000000000000000000000000000000000000000000000"
        );
      });
    });

    describe("call()", () => {
      it("should allow a user to execute a transaction through the mock", async () => {
        const fn = counter.interface.getFunction("increment");
        const data = fn.selector;
        const counterAddress = await counter.getAddress();

        await doppelganger.__waffle__call(counterAddress, data);
        expect(await counter.read()).to.equal("1");
      });
    });
  });
});
