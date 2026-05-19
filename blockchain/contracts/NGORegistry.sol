// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract NGORegistry {
    struct NGO {
        string name;
        string description;
        string website;
        address wallet;
        bool verified;
    }

    mapping(address => NGO) public ngos;

    address public admin;

    event NGORegistered(address ngoWallet, string name);
    event NGOVerified(address ngoWallet);

    constructor() {
        admin = msg.sender;
    }

    function registerNGO(
        string memory _name,
        string memory _description,
        string memory _website
    ) public {
        ngos[msg.sender] = NGO(
            _name,
            _description,
            _website,
            msg.sender,
            false
        );

        emit NGORegistered(msg.sender, _name);
    }

    function verifyNGO(address _ngoWallet) public {
        require(msg.sender == admin, "Only admin");

        ngos[_ngoWallet].verified = true;

        emit NGOVerified(_ngoWallet);
    }

    function isVerifiedNGO(address _ngoWallet) public view returns (bool) {
        return ngos[_ngoWallet].verified;
    }

    function getNGO(address _wallet)
        public
        view
        returns (
            string memory,
            string memory,
            string memory,
            address,
            bool
        )
    {
        NGO memory ngo = ngos[_wallet];

        return (
            ngo.name,
            ngo.description,
            ngo.website,
            ngo.wallet,
            ngo.verified
        );
    }
}