// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

import "./RewardToken.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

contract Distribution is Ownable {
    using SafeERC20 for RewardToken;
    using SafeMath for uint256;

    enum State{deposited, distributed, removed}

    struct BeneficiaryInfo {
        address beneficiary; // Address of beneficiary
        uint256 amountToken; // TOKENs amount
    }

    RewardToken public token;

    mapping(address => BeneficiaryInfo) public beneficiaries;

    event Deposit(address indexed from, address indexed to, uint256 amount, State state);
    event AddBeneficiary(address indexed who, uint256 amount, State state);
    event DecreaseReward(address indexed who, uint256 amount, State state);
    event EmergencyWithdraw(address indexed to, uint256 amount, State state);

    constructor(
        address _token
    ) payable {
        require(
            _token != address(0),
             "Token Address is not Zero"
        );
        token = RewardToken(_token);
    }

    modifier checkForZero(address _beneficiaries, uint256 _amount) {
        require(
            owner() == _msgSender(), 
            "Ownable: caller is not the owner"
        );
        require(
            _beneficiaries != address(0),
            "Address of Beneficiaries cannot be zero"
        );
        require(
            _amount != 0, 
            "Balances of Beneficiaries cannot be zero"
        );
        _;
    }

    // Should transfer tokens from owner to distribution contract
    function deposit(
        uint256 _amount
    ) public payable onlyOwner {
        require(
            _amount != 0, 
            "Amount cannot be zero"
        );
        token.safeTransferFrom(owner(), address(this), _amount);
        emit Deposit(owner(), address(this), _amount, State.deposited);
    }

    // Should add beneficiary with tokens amount for each beneficiary from owner
    function addBeneficiaries(
        address[] memory _beneficiaries,
        uint256[] memory _amount
    ) public onlyOwner {
        for(uint i; i < _beneficiaries.length; i++) {
            // check if address isn`t empty
            require(
                address(_beneficiaries[i]) != address(0),
                "Address of Beneficiaries cannot be zero"
            );
        }
        for(uint i; i < _amount.length; i++) {
            // check if amount`s isn`t null
            require(
                _amount[i] != 0,
                "Balances of Beneficiaries cannot be zero"
            );
        }
        BeneficiaryInfo memory beneficiaryInfo;
        for(uint i; i < _beneficiaries.length; i++) {
            beneficiaryInfo.beneficiary = _beneficiaries[i];
            beneficiaryInfo.amountToken = _amount[i];
            beneficiaries[_beneficiaries[i]] = beneficiaryInfo;
            token.safeApprove(_beneficiaries[i], _amount[i]);
            token.safeTransferFrom(owner(), _beneficiaries[i], _amount[i]);
            emit AddBeneficiary(_beneficiaries[i], _amount[i], State.distributed);
        }
    }

    // Should add beneficiary with tokens amount from owner
    function addBeneficiary(
        address _beneficiaries,
        uint256 _amount
    ) public checkForZero(_beneficiaries, _amount) {
        BeneficiaryInfo memory beneficiaryInfo;
        beneficiaryInfo.beneficiary = _beneficiaries;
        beneficiaryInfo.amountToken = _amount;
        beneficiaries[_beneficiaries] = beneficiaryInfo;
        token.safeApprove(_beneficiaries, _amount);
        token.safeTransferFrom(owner(), _beneficiaries, _amount);
        emit AddBeneficiary(_beneficiaries, _amount, State.distributed);
    }

    // Should decrease amount of rewards for benefeciary
    function decreaseReward(
        address _beneficiary, 
        uint256 _amount
    ) public checkForZero(_beneficiary, _amount) {
        token.safeDecreaseAllowance(_beneficiary, _amount);
        emit DecreaseReward(_beneficiary, _amount, State.removed);
    }
    
    // Should transfer amout of reward tokens back to the owner
    function emergencyWithdraw(uint256 _amount) 
        external payable onlyOwner {
        require(
            _amount != 0, 
            "Amount cannot be zero"
        );
        require(
            token.balanceOf(address(this)) >= _amount,
            "Insufficient tokens balance"
        );
        token.safeTransfer(owner(), _amount);
        emit EmergencyWithdraw(owner(), _amount, State.removed);
    }

    // Should transfer reward tokens to beneficiary
    function _claim() internal {
        token.safeTransfer(msg.sender, token.balanceOf(this.owner()));
    }

    // Should lock/unlock rewards for beneficiary
    function lockRewards(bool _lock) external onlyOwner {
        if (_lock) _claim(); else{}
    }

    //fallback() external {}
}
