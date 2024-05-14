import { expect } from "chai";
import { BaseContract, Signer, parseEther } from "ethers";
import { deployMockContract, MockContract } from "../src/index.js";
import hre from "hardhat";
import { AmIRichAlready__factory } from "../typechain-types/factories/tests/AmIRichAlready.sol/AmIRichAlready__factory";
import { AmIRichAlready } from "../typechain-types/tests/AmIRichAlready.sol/AmIRichAlready";

import IERC20Artifact from "../artifacts/contracts/tests/AmIRichAlready.sol/IERC20.json";

describe("Am I Rich Already", () => {
  let sender: Signer;
  let receiver: Signer;
  let mockERC20: MockContract<BaseContract>;
  let contract: AmIRichAlready;

  beforeEach(async () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    [sender, receiver] = await hre.ethers.getSigners();

    mockERC20 = await deployMockContract(sender, IERC20Artifact.abi);
    const address = await mockERC20.getAddress();
    contract = await new AmIRichAlready__factory(sender).deploy(address);
  });

  it("returns false if the wallet has less then 1000000 coins", async () => {
    await mockERC20.mock.balanceOf.returns(parseEther("999999"));
    expect(await contract.check()).to.be.equal(false);
  });

  it("returns true if the wallet has more than 1000000 coins", async () => {
    await mockERC20.mock.balanceOf.returns(parseEther("1000001"));
    expect(await contract.check()).to.equal(true);
  });

  it("reverts if the ERC20 reverts", async () => {
    await mockERC20.mock.balanceOf.reverts();
    await expect(contract.check()).to.be.revertedWith("Mock revert");
  });

  it("returns 1000001 coins for my address and 0 otherwise", async () => {
    const senderAddress = await sender.getAddress();
    await mockERC20.mock.balanceOf.returns("0");
    await mockERC20.mock.balanceOf.withArgs(senderAddress).returns(parseEther("1000001"));

    expect(await contract.check()).to.equal(true);
    expect(await contract.connect(receiver).check()).to.equal(false);
  });
});
