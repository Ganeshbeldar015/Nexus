// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract Donation {
    struct Campaign {
        uint256 id;
        address ngo;
        string title;
        string description;
        uint256 targetAmount;
        uint256 raisedAmount;
        uint256 withdrawnAmount;
        bool active;
    }

    struct UsageRecord {
        uint256 amount;
        string description;
        string receiptUrl;
        uint256 timestamp;
    }

    struct DonationRecord {
        address donor;
        uint256 amount;
        uint256 timestamp;
        string message;
    }

    IERC20 public donationToken;
    uint256 public campaignCount;

    mapping(uint256 => Campaign) public campaigns;
    mapping(uint256 => UsageRecord[]) public usageRecords;
    mapping(uint256 => DonationRecord[]) public donationHistory;

    event CampaignCreated(uint256 indexed id, address indexed ngo, string title);
    event Donated(uint256 indexed campaignId, address indexed donor, uint256 amount, string message);
    event FundsWithdrawn(uint256 indexed campaignId, uint256 amount);
    event UsageRecordAdded(uint256 indexed campaignId, uint256 amount, string description);

    constructor(address _donationToken) {
        donationToken = IERC20(_donationToken);
    }

    function createCampaign(
        string memory _title,
        string memory _description,
        uint256 _targetAmount
    ) public {
        campaignCount++;
        campaigns[campaignCount] = Campaign(
            campaignCount,
            msg.sender,
            _title,
            _description,
            _targetAmount,
            0,
            0,
            true
        );

        emit CampaignCreated(campaignCount, msg.sender, _title);
    }

    function donateToCampaign(uint256 _campaignId, uint256 _amount, string memory _message) public {
        require(campaigns[_campaignId].active, "Campaign is not active");
        require(_amount > 0, "Amount must be > 0");

        donationToken.transferFrom(msg.sender, address(this), _amount);

        campaigns[_campaignId].raisedAmount += _amount;

        donationHistory[_campaignId].push(DonationRecord(
            msg.sender,
            _amount,
            block.timestamp,
            _message
        ));

        emit Donated(_campaignId, msg.sender, _amount, _message);
    }

    function donateToCampaignWithTransfer(
        uint256 _campaignId,
        address _donor,
        uint256 _amount,
        string memory _message
    ) public {
        require(campaigns[_campaignId].active, "Campaign is not active");
        require(_amount > 0, "Amount must be > 0");

        // For UGF integration: UGF handles the token transfer to this contract first
        // This function records the donation without needing a separate transferFrom call
        campaigns[_campaignId].raisedAmount += _amount;

        donationHistory[_campaignId].push(DonationRecord(
            _donor,
            _amount,
            block.timestamp,
            _message
        ));

        emit Donated(_campaignId, _donor, _amount, _message);
    }

    function withdrawFunds(uint256 _campaignId, uint256 _amount) public {
        Campaign storage campaign = campaigns[_campaignId];
        require(msg.sender == campaign.ngo, "Only campaign owner can withdraw");
        uint256 available = campaign.raisedAmount - campaign.withdrawnAmount;
        require(_amount <= available, "Insufficient funds");

        campaign.withdrawnAmount += _amount;
        donationToken.transfer(campaign.ngo, _amount);

        emit FundsWithdrawn(_campaignId, _amount);
    }

    function addUsageRecord(
        uint256 _campaignId, 
        uint256 _amount, 
        string memory _description, 
        string memory _receiptUrl
    ) public {
        require(msg.sender == campaigns[_campaignId].ngo, "Only campaign owner can add usage record");
        
        usageRecords[_campaignId].push(UsageRecord(
            _amount,
            _description,
            _receiptUrl,
            block.timestamp
        ));

        emit UsageRecordAdded(_campaignId, _amount, _description);
    }

    function toggleCampaignStatus(uint256 _campaignId) public {
        require(msg.sender == campaigns[_campaignId].ngo, "Only campaign owner can toggle status");
        campaigns[_campaignId].active = !campaigns[_campaignId].active;
    }

    function getCampaign(uint256 _campaignId) public view returns (Campaign memory) {
        return campaigns[_campaignId];
    }

    function getDonationHistory(uint256 _campaignId) public view returns (DonationRecord[] memory) {
        return donationHistory[_campaignId];
    }

    function getUsageRecords(uint256 _campaignId) public view returns (UsageRecord[] memory) {
        return usageRecords[_campaignId];
    }
}
