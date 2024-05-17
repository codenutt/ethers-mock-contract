/* eslint-disable no-undef */
const chai = require("chai");
const { expect } = chai;

const ethersMockContract = require("ethers-mock-contract");
const { Doppelganger, deployMockContract } = ethersMockContract;

const hre = require("hardhat");

describe("Import and usage in CJS", function () {
  it("Can reference contract info", () => {
    expect(Doppelganger.abi.length).to.be.greaterThan(0);
    expect(Doppelganger.evm.bytecode.object.length).to.be.greaterThan(0);
    expect(Doppelganger.evm.deployedBytecode.object.length).to.be.greaterThan(0);
  });
  it("Can deploy contract", async () => {
    const [signer] = await hre.ethers.getSigners();
    const provider = hre.ethers.provider;

    const contract = await deployMockContract(signer, abi);
    const contractAddress = await contract.getAddress();
    await contract.mock.balanceOf.returns(8);

    const result = await provider.call({
      to: contractAddress,
      data: contract.interface.encodeFunctionData("balanceOf(address)", [signer.address]),
    });
    expect(BigInt(result)).to.be.equal(8n);
  });
});

const abi = [
  {
    inputs: [
      {
        internalType: "address",
        name: "account",
        type: "address",
      },
    ],
    name: "balanceOf",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
];
