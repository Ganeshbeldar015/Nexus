// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract Donation is Ownable {
    struct CampaignRegistry {
        uint256 campaignId;
        address safeAddress;
        string darpanId;
    }

    mapping(uint256 => CampaignRegistry) public campaignRegistry;
    uint256[] public registeredCampaignIds;

    event CampaignRegistered(uint256 indexed campaignId, address indexed safeAddress, string darpanId);
    event Donated(uint256 indexed campaignId, address indexed donor, address token, uint256 amount, string message);

    constructor() Ownable(msg.sender) {}

    function registerCampaign(
        uint256 _campaignId,
        address _safeAddress,
        string memory _darpanId
    ) public onlyOwner {
        require(_safeAddress != address(0), "Invalid Safe address");
        require(campaignRegistry[_campaignId].safeAddress == address(0), "Campaign already registered");

        campaignRegistry[_campaignId] = CampaignRegistry({
            campaignId: _campaignId,
            safeAddress: _safeAddress,
            darpanId: _darpanId
        });

        registeredCampaignIds.push(_campaignId);

        emit CampaignRegistered(_campaignId, _safeAddress, _darpanId);
    }

    function donateToCampaign(
        uint256 _campaignId,
        address _token,
        uint256 _amount,
        string memory _message
    ) public {
        address safeAddress = campaignRegistry[_campaignId].safeAddress;
        require(safeAddress != address(0), "Campaign is not registered on-chain");
        require(_amount > 0, "Amount must be > 0");

        // Transfer tokens directly from donor to the Gnosis Safe multisig wallet
        IERC20(_token).transferFrom(msg.sender, safeAddress, _amount);

        emit Donated(_campaignId, msg.sender, _token, _amount, _message);
    }

    function getRegisteredCampaignsCount() public view returns (uint256) {
        return registeredCampaignIds.length;
    }
}

