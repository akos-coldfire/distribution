const {
    expectEvent,
    expectRevert,
    constants,
    ether
} = require('@openzeppelin/test-helpers');

const BN = require('bn.js');

require('chai')
    .use(require('chai-as-promised'))
    .use(require('chai-bn')(BN))
    .should();

const Token = artifacts.require("RewardToken");
const Distribution = artifacts.require("Distribution");
   
contract("Distribution", function (accounts) {
    [owner, beneficiary1, beneficiary2, beneficiary3, signer] = accounts;

    const tName = "Reward";
    const tSymbol = "RWD";
    let tAmount;

    beforeEach(async function () {
        tAmount = ether("1000");
        token = await Token.new(tName, tSymbol, tAmount, {from: owner});
        DT = await Distribution.new(token.address, {from: owner});
        await token.approve(DT.address, tAmount);
    });

    describe("Reward Token Test Cases", function () {

        it("should initialize token correctly", async ()=> {
            (await token.name()).should.be.equal(tName);
            (await token.symbol()).should.be.equal(tSymbol);
            (await token.totalSupply()).should.be.bignumber.equal(tAmount);
        });
    });

    describe("Distribution Test Cases", function () {

        context("Distribution Initializing Phase Test Cases", function() {

            it("should initialize contract with correct token address", async () => {
                (await DT.token()).should.be.equal(token.address);
            });
    
            it("shouldn`t initialize contract with empty token address", async () => {
                await expectRevert(
                    Distribution.new(constants.ZERO_ADDRESS),
                    "Token Address is not Zero"
                );
            });
        });

        context("Distribution Functions Phase Test Cases", function() {

            it("should deposit tokens to distribution contract from only owner", async() => {
                result = await DT.deposit(ether("1"), {from: owner});
                expectEvent(
                    result, "Deposit",
                   {from: owner, to: DT.address, amount: ether("1"), state: (Distribution.State.deposited).toString()}
                );
            });

            it("shouldn`t deposit tokens if amount is zero", async() => {
                await expectRevert(
                    DT.deposit(0, {from: owner}),
                    "Amount cannot be zero"
                );
            });

            it("shouldn`t deposit tokens from someone other than owner", async() => {
                await expectRevert(
                    DT.deposit(ether("2"), {from: beneficiary1}), 
                    "Ownable: caller is not the owner"
                );
            });

            it("shouldn`t deposit tokens to distribution contract if insufficient balance", async() => {
                await expectRevert(
                    DT.deposit(ether("1010"), {from: owner}), 
                    "ERC20: transfer amount exceeds balance"
                );
            });
            
            it("should transfer amount of reward tokens back to the owner", async() => {
                await DT.deposit(ether("1"), {from: owner});
                result = await DT.emergencyWithdraw(ether("1"), {from: owner});
                expectEvent(
                    result,"EmergencyWithdraw",
                    {to: owner, amount: ether("1"), state: (Distribution.State.removed).toString()}
                );
            });

            it("shouldn`t transfer amount of reward tokens if amount is zero", async() => {
                await expectRevert(
                    DT.emergencyWithdraw(0, {from: owner}), 
                    "Amount cannot be zero"
                );
            });

            it("shouldn`t transfer amount of reward tokens if insufficient tokens balance", async() => {
                await expectRevert(
                    DT.emergencyWithdraw(ether("2000"), {from: owner}), 
                    "Insufficient tokens balance"
                );
            });

            it("shouldn`t transfer amount of reward tokens back to the owner from someone other than owner", async() => {
                await expectRevert(
                    DT.emergencyWithdraw(ether("2"), {from: beneficiary1}), 
                    "Ownable: caller is not the owner"
                );
            });

            it("should add beneficiary with tokens amount for each beneficiary from owner", async() => {
                result = await DT.addBeneficiaries([beneficiary1, beneficiary2], [ether("90"), ether("90")], {from: owner});
                expectEvent(
                    result, "AddBeneficiary",
                    {who: beneficiary1, amount: ether("90"), state: (Distribution.State.distributed).toString()}
                );
                expectEvent(
                    result, "AddBeneficiary",
                    {who: beneficiary2, amount: ether("90"), state: (Distribution.State.distributed).toString()}
                );
            });

            it("should add one beneficiary with tokens amount from owner", async() => {
                result = await DT.addBeneficiary(beneficiary1, ether("100"), {from: owner});
                expectEvent(
                    result, "AddBeneficiary",
                    {who: beneficiary1, amount: ether("100"), state: (Distribution.State.distributed).toString()}
                );
            });

            it("shouldn`t add beneficiaries if address is zero", async() => {
                await expectRevert(
                    DT.addBeneficiaries([constants.ZERO_ADDRESS], [ether("10"), ether("10")], {from: owner}), 
                    "Address of Beneficiaries cannot be zero"
                );
                await expectRevert(
                    DT.addBeneficiary(constants.ZERO_ADDRESS, ether("100"), {from: owner}), 
                    "Address of Beneficiaries cannot be zero"
                );
            });

            it("shouldn`t add beneficiaries if insufficient tokens balance", async() => {
                await expectRevert(
                    DT.addBeneficiaries([beneficiary1, beneficiary2], [0, 0], {from: owner}), 
                    "Balances of Beneficiaries cannot be zero"
                );
                await expectRevert(
                    DT.addBeneficiary(beneficiary1, 0, {from: owner}), 
                    "Balances of Beneficiaries cannot be zero"
                );
            });

            it("shouldn`t add beneficiaries from someone other than owner", async() => {
                await expectRevert(
                    DT.addBeneficiaries([beneficiary1, beneficiary2], [ether("90"), ether("90")], {from: beneficiary1}), 
                    "Ownable: caller is not the owner"
                );
                await expectRevert(
                    DT.addBeneficiary(beneficiary1, ether("90"), {from: beneficiary1}), 
                    "Ownable: caller is not the owner"
                );
            });

            it("should decrease amount of rewards for benefeciary", async() => {
                await DT.addBeneficiary(beneficiary1, ether("100"), {from: owner});
                result = await DT.decreaseReward(beneficiary1, ether("10"), {from: owner});
                expectEvent(
                    result, "DecreaseReward",
                    {who: beneficiary1, amount: ether("10"), state: (Distribution.State.removed).toString()}
                );
            });

            it("shouldn`t decrease amount if address is zero or amount is zero", async() => {
                await expectRevert(
                    DT.decreaseReward(constants.ZERO_ADDRESS, ether("10"), {from: owner}), 
                    "Address of Beneficiaries cannot be zero"
                );
                await expectRevert(
                    DT.decreaseReward(beneficiary1, 0, {from: owner}), 
                    "Balances of Beneficiaries cannot be zero"
                );
            });

            it("shouldn`t decrease amount from someone other than owner", async() => {
                await expectRevert(
                    DT.decreaseReward(beneficiary1, ether("10"), {from: beneficiary2}), 
                    "Ownable: caller is not the owner"
                );
            });

            it("should lock rewards for beneficiary", async() => {
                await token.mint(DT.address, ether("1000"));
                await DT.lockRewards(true, {from: owner});
                (await token.balanceOf(DT.address)).should.be.bignumber.equal("0");
            });

            it("should unlock rewards for beneficiary", async() => {
                await DT.lockRewards(false, {from: owner});
                (await token.balanceOf(DT.address)).should.be.bignumber.equal("0");
            });

            it("shouldn`t lock/unlock rewards from someone other than owner", async() => {
                await expectRevert(
                    DT.lockRewards(false, {from: beneficiary2}), 
                    "Ownable: caller is not the owner"
                );
            });
            
        });
    });
});