// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.15;

import {A as parentA} from "./parent/A.sol";

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

contract D is B, C {
    bool public flagD;
}
