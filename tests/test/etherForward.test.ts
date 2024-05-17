import { expect } from "chai";
import { Contract, ContractFactory, Signer } from "ethers";
import { MockContract, deployMockContract } from "ethers-mock-contract";

import EtherForward from "../artifacts/contracts/EtherForward.sol/EtherForward.json";
import IERC20 from "../artifacts/contracts/EtherForward.sol/IERC20.json";

import hre from "hardhat";
import { HardhatEthersProvider } from "@nomicfoundation/hardhat-ethers/internal/hardhat-ethers-provider";

describe("Ether Forwarded", () => {
  let contractFactory: ContractFactory;
  let sender: Signer;
  let mockERC20: MockContract<Contract>;
  let mockERC20Address: string;
  let contract: Contract;
  let provider: HardhatEthersProvider;

  beforeEach(async () => {
    provider = hre.ethers.provider;
    [sender] = await hre.ethers.getSigners();
    mockERC20 = await deployMockContract(sender, IERC20.abi);
    mockERC20Address = await mockERC20.getAddress();
    contractFactory = new ContractFactory(EtherForward.abi, EtherForward.bytecode, sender);
    contract = (await contractFactory.deploy(mockERC20Address)) as unknown as Contract;
  });

  it("Can forward ether through call", async () => {
    expect(await provider.getBalance(mockERC20Address)).to.be.equal(0);
    await contract.forwardByCall({ value: 7 });
    expect(await provider.getBalance(mockERC20Address)).to.be.equal(7);
  });

  it("Can forward ether through send", async () => {
    expect(await provider.getBalance(mockERC20Address)).to.be.equal(0);
    await contract.forwardBySend({ value: 7 });
    expect(await provider.getBalance(mockERC20Address)).to.be.equal(7);
  });

  it("Can forward ether through transfer", async () => {
    expect(await provider.getBalance(mockERC20Address)).to.be.equal(0);
    await contract.forwardByTransfer({ value: 7 });
    expect(await provider.getBalance(mockERC20Address)).to.be.equal(7);
  });

  it("Can mock a revert on a receive function", async () => {
    expect(await provider.getBalance(mockERC20Address)).to.be.equal(0);

    await mockERC20.mock.receive.revertsWithReason("Receive function rejected ether.");

    await expect(contract.forwardByCall({ value: 7 })).to.be.revertedWith("Receive function rejected ether.");

    await expect(contract.forwardBySend({ value: 7 })).to.be.revertedWith("forwardBySend failed");

    await expect(contract.forwardByTransfer({ value: 7 })).to.be.reverted;

    expect(await provider.getBalance(mockERC20Address)).to.be.equal(0);
  });
});
