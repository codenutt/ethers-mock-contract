// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

contract CounterOverloaded {
    uint private value;

    function increment() public {
        value += 1;
    }

    function read() public view returns (uint) {
        return value;
    }

    function add() public view returns (uint) {
        return value + 1;
    }

    function add(uint a) public view returns (uint) {
        return value + a;
    }

    function testArgumentTypes(uint a, bool b, string memory s, bytes memory bs) public pure returns (bytes memory ret) {
        ret = abi.encodePacked(a, b, s, bs);
    }
}