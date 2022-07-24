// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.15;

contract A {
    uint256 private _count;
}

contract B {
    uint256 private _total;
}

contract C2 {
    uint256 public max;
}

contract D is A {
    uint256 public notIncluded;
}
