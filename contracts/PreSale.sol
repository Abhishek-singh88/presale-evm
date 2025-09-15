// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract PreSale {
    address public owner;
    uint256 public currentPhase;
    uint256 public constant TOTAL_PHASES = 5;
    uint256 public basePrice; 
    
    mapping(address => uint256) public tokenBalances;
    uint256 public totalTokensSold;
    
    // Events
    event TokensPurchased(
        address indexed buyer,
        uint256 phase,
        uint256 ethAmount,
        uint256 tokenAmount,
        uint256 pricePerToken
    );
    
    event PhaseChanged(uint256 newPhase, uint256 newPrice);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    modifier validPhase() {
        require(currentPhase >= 1 && currentPhase <= TOTAL_PHASES, "Invalid phase");
        _;
    }
    
    constructor(uint256 _basePrice) {
        owner = msg.sender;
        currentPhase = 1;
        basePrice = _basePrice; 
    }
    
    function getCurrentPrice() public view returns (uint256) {
        uint256 price = basePrice;
        for (uint256 i = 1; i < currentPhase; i++) {
            price = (price * 125) / 100; // 25% price is increase
        }
        return price;
    }
    
    function buyTokensAmount(uint256 tokenAmount) external payable validPhase {
        require(tokenAmount > 0, "Token amount must be greater than 0");
        
        uint256 currentPrice = getCurrentPrice();
        uint256 requiredETH = (tokenAmount * currentPrice) / 1e18;
        
        require(msg.value >= requiredETH, "Insufficient ETH sent");
        
        tokenBalances[msg.sender] += tokenAmount;
        totalTokensSold += tokenAmount;
        
        if (msg.value > requiredETH) {
            payable(msg.sender).transfer(msg.value - requiredETH);
        }
        
        emit TokensPurchased(
            msg.sender,
            currentPhase,
            requiredETH,
            tokenAmount,
            currentPrice
        );
    }
    
    function calculateETHForTokens(uint256 tokenAmount) external view returns (uint256) {
        uint256 currentPrice = getCurrentPrice();
        return (tokenAmount * currentPrice) / 1e18;
    }
    
    function nextPhase() external onlyOwner {
        require(currentPhase < TOTAL_PHASES, "Already at final phase");
        currentPhase++;
        emit PhaseChanged(currentPhase, getCurrentPrice());
    }
    
    function getTokenBalance(address user) external view returns (uint256) {
        return tokenBalances[user];
    }
    
    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");
        payable(owner).transfer(balance);
    }
}
