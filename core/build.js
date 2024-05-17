import solc from "solc";
import fs from "fs";

console.log("Compiling contracts");

solc.loadRemoteVersion("v0.8.17+commit.8df45f5f", function (err, solcSnapshot) {
  if (err) {
    console.log(err);
    return;
  } else {
    console.log("   Loaded solc version");
    const settings = {
      language: "Solidity",
      sources: {
        "src/Doppelganger.sol": {
          content: fs.readFileSync("./src/Doppelganger.sol").toString(),
        },
      },
      settings: {
        optimizer: {
          enabled: false,
          runs: 200,
        },
        outputSelection: {
          "*": {
            "*": ["abi", "evm.bytecode", "evm.deployedBytecode"],
          },
        },
      },
    };
    const output = JSON.parse(solcSnapshot.compile(JSON.stringify(settings)));

    if (fs.existsSync("./src/Doppelganger.ts")) {
      fs.rmSync("./src/Doppelganger.ts", { force: true });
    }

    fs.writeFileSync(
      "./src/Doppelganger.ts",
      "export const Doppelganger = " +
        JSON.stringify(output.contracts["src/Doppelganger.sol"].Doppelganger, null, 2) +
        ";"
    );
    console.log("   Complete");
  }
});
