// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.15;

import { A as parentA, B as parentB, C2 } from "./parent/A.sol";
import "./parent/E.sol";
import { F } from "./parent/F.sol";

contract A {
    bool public flag;
    address token;
}

contract B is A {
    bool public flagB;
}

contract C is A {
    bool public flagC;
}

contract D is B, C, parentA, parentB, C2, E, F {
    bool public flagD;
}
