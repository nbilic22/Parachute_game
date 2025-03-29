class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.score = 0;
        this.lives = 3;
        this.rescued = 0;
        this.gameStarted = false;
        this.gameOver = false;
        this.isPaused = false;  // Add pause state
        this.floatingScores = [];  // Add array for floating score indicators
        
        // Set canvas size
        this.canvas.width = 800;
        this.canvas.height = 600;
        
        // Game objects
        this.boat = {
            x: this.canvas.width / 2,
            y: this.canvas.height - 60,
            width: 80,
            height: 40,
            speed: 5
        };
        
        this.parachutists = [];
        this.sharks = [];
        this.helicopters = [];
        this.waterLevel = this.canvas.height - 40;
        
        // Controls
        this.keys = {
            left: false,
            right: false
        };
        
        // Game settings
        this.maxParachutists = 10;
        this.sharkSpeed = 1;  // Reduced from 2 to 1 for slower movement
        this.helicopterSpeed = 3;
        this.parachuteSpeed = 1.5;
        
        // Add sprite dimensions
        this.spriteSize = 32;
        this.parachuteSize = 40;
        
        // Add island properties
        this.islands = {
            left: {
                x: 0,
                y: this.waterLevel - 60,
                width: 120,
                height: 60,
                palmTree: {
                    x: 30,
                    y: this.waterLevel - 100,
                    trunkHeight: 40,
                    trunkWidth: 8,
                    leavesCount: 5
                }
            },
            right: {
                x: this.canvas.width - 120,
                y: this.waterLevel - 60,
                width: 120,
                height: 60,
                palmTree: {
                    x: this.canvas.width - 90,
                    y: this.waterLevel - 100,
                    trunkHeight: 40,
                    trunkWidth: 8,
                    leavesCount: 5
                }
            }
        };
        
        // Add difficulty scaling properties
        this.gameTime = 0;
        this.difficultyInterval = 30; // Increase difficulty every 30 seconds
        this.maxDifficultyLevel = 5;
        this.currentDifficultyLevel = 1;
        
        // Adjust base speeds
        this.baseHelicopterSpeed = 3;
        this.baseParachuteSpeed = 1.5;
        this.baseSpawnDelay = 3000;
        
        // Add cloud properties
        this.clouds = [];
        this.cloudCount = 6;  // Number of clouds to show
        this.initClouds();
        
        // Load images
        this.loadImages();
        
        // Bind event listeners
        this.bindEvents();
        
        // Start game loop
        this.gameLoop();
        
        // Add maximum sharks limit
        this.maxSharks = 3;  // Maximum number of sharks allowed at once
        this.sharkSpawnRate = 0.002;  // Reduced spawn rate (0.2% chance per frame)
    }
    
    initClouds() {
        for (let i = 0; i < this.cloudCount; i++) {
            this.clouds.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * 150 + 20,  // Random height between 20 and 170
                width: Math.random() * 100 + 80,  // Random width between 80 and 180
                height: Math.random() * 40 + 30,  // Random height between 30 and 70
                speed: Math.random() * 0.5 + 0.2  // Random speed between 0.2 and 0.7
            });
        }
    }
    
    bindEvents() {
        // Keyboard controls
        window.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') this.keys.left = true;
            if (e.key === 'ArrowRight') this.keys.right = true;
            if (e.key === 'Escape') this.togglePause();  // Add escape key pause
        });
        
        window.addEventListener('keyup', (e) => {
            if (e.key === 'ArrowLeft') this.keys.left = false;
            if (e.key === 'ArrowRight') this.keys.right = false;
        });
        
        // Start button
        document.getElementById('startButton').addEventListener('click', () => {
            if (!this.gameStarted) {
                this.startGame();
            }
        });

        // Pause button
        document.getElementById('pauseButton').addEventListener('click', () => {
            this.togglePause();
        });
    }
    
    togglePause() {
        if (this.gameStarted && !this.gameOver) {
            this.isPaused = !this.isPaused;
            document.getElementById('pauseButton').textContent = this.isPaused ? 'Resume' : 'Pause';
        }
    }
    
    startGame() {
        this.gameStarted = true;
        this.score = 0;
        this.lives = 3;
        this.rescued = 0;
        this.parachutists = [];
        this.sharks = [];
        this.helicopters = [];
        this.gameOver = false;
        this.isPaused = false;  // Reset pause state
        this.gameTime = 0;
        this.currentDifficultyLevel = 1;
        this.updateScore();
        this.updateLives();
        this.updateRescued();
        document.getElementById('pauseButton').textContent = 'Pause';  // Reset pause button text
        
        // Start difficulty scaling
        this.difficultyScalingInterval = setInterval(() => {
            if (!this.gameOver) {
                this.gameTime++;
                if (this.gameTime % this.difficultyInterval === 0) {
                    this.increaseDifficulty();
                }
            }
        }, 1000);
        
        this.spawnHelicopter();
    }
    
    increaseDifficulty() {
        if (this.currentDifficultyLevel < this.maxDifficultyLevel) {
            this.currentDifficultyLevel++;
            // Increase speeds based on difficulty level
            this.helicopterSpeed = this.baseHelicopterSpeed * (1 + (this.currentDifficultyLevel - 1) * 0.2);
            this.parachuteSpeed = this.baseParachuteSpeed * (1 + (this.currentDifficultyLevel - 1) * 0.2);
        }
    }
    
    spawnHelicopter() {
        if (this.gameOver) {
            clearInterval(this.difficultyScalingInterval);
            return;
        }
        
        // Randomly decide if helicopter comes from left or right
        const comingFromLeft = Math.random() < 0.5;
        
        // Calculate safe drop zone (excluding islands)
        const safeZoneStart = 140;  // After left island
        const safeZoneEnd = this.canvas.width - 140;  // Before right island
        
        const helicopter = {
            x: comingFromLeft ? -80 : this.canvas.width,
            y: 50 + Math.random() * 100, // Random height between 50 and 150
            width: 80,
            height: 40,
            speed: this.helicopterSpeed * (comingFromLeft ? 1 : -1),
            hasDropped: false,
            // Random point between safe zones (20% to 80% of safe area)
            dropPoint: safeZoneStart + Math.random() * (safeZoneEnd - safeZoneStart)
        };
        
        this.helicopters.push(helicopter);
        
        // Calculate next spawn delay based on difficulty
        const minDelay = Math.max(500, this.baseSpawnDelay - (this.currentDifficultyLevel - 1) * 500);
        const maxDelay = Math.max(1000, this.baseSpawnDelay - (this.currentDifficultyLevel - 1) * 400);
        const nextSpawnDelay = minDelay + Math.random() * (maxDelay - minDelay);
        
        setTimeout(() => this.spawnHelicopter(), nextSpawnDelay);
    }
    
    spawnParachutist(x, y) {
        const parachutist = {
            x: x,
            y: y,
            width: 20,
            height: 30,
            speed: this.parachuteSpeed,
            isRescued: false
        };
        
        this.parachutists.push(parachutist);
    }
    
    spawnShark() {
        const shark = {
            x: Math.random() * (this.canvas.width - 40),
            y: this.waterLevel + 20,
            width: 40,
            height: 20,
            speed: this.sharkSpeed,
            direction: Math.random() < 0.5 ? -1 : 1
        };
        
        this.sharks.push(shark);
    }
    
    update() {
        if (!this.gameStarted || this.gameOver || this.isPaused) return;
        
        // Update cloud positions
        this.clouds.forEach(cloud => {
            cloud.x -= cloud.speed;
            if (cloud.x + cloud.width < 0) {
                cloud.x = this.canvas.width;
                cloud.y = Math.random() * 150 + 20;
            }
        });
        
        // Update floating scores
        this.updateFloatingScores();
        
        // Update boat position
        if (this.keys.left && this.boat.x > 0) {
            this.boat.x -= this.boat.speed;
        }
        if (this.keys.right && this.boat.x < this.canvas.width - this.boat.width) {
            this.boat.x += this.boat.speed;
        }
        
        // Update helicopters
        this.helicopters = this.helicopters.filter(helicopter => {
            helicopter.x += helicopter.speed;
            
            // Drop parachutist when helicopter reaches its drop point
            if (!helicopter.hasDropped && 
                ((helicopter.speed > 0 && helicopter.x >= helicopter.dropPoint) ||
                 (helicopter.speed < 0 && helicopter.x <= helicopter.dropPoint))) {
                this.spawnParachutist(helicopter.x, helicopter.y + helicopter.height);
                helicopter.hasDropped = true;
            }
            
            // Remove helicopter when it goes off screen
            return (helicopter.speed > 0 && helicopter.x < this.canvas.width + 80) ||
                   (helicopter.speed < 0 && helicopter.x > -80);
        });
        
        // Update parachutists
        this.parachutists = this.parachutists.filter(parachutist => {
            parachutist.y += parachutist.speed;
            
            // Check collision with boat
            if (this.checkCollision(parachutist, this.boat)) {
                parachutist.isRescued = true;
                this.rescued++;
                this.score += 100;
                this.updateScore();
                this.updateRescued();
                // Add floating score at the rescue location
                this.addFloatingScore(parachutist.x + this.spriteSize / 2, parachutist.y);
                return false;
            }
            
            // Check if parachutist reached water
            if (parachutist.y > this.waterLevel) {
                this.lives--;
                this.updateLives();
                if (this.lives <= 0) {
                    this.gameOver = true;
                }
                return false;
            }
            
            return true;
        });
        
        // Update sharks
        this.sharks = this.sharks.filter(shark => {
            shark.x += shark.speed * shark.direction;
            
            // Change direction when reaching screen edges
            if (shark.x <= 0 || shark.x >= this.canvas.width - shark.width) {
                shark.direction *= -1;
            }
            
            // Check collision with parachutists in water
            this.parachutists.forEach(parachutist => {
                if (parachutist.y > this.waterLevel && this.checkCollision(parachutist, shark)) {
                    this.lives--;
                    this.updateLives();
                    if (this.lives <= 0) {
                        this.gameOver = true;
                    }
                }
            });
            
            return true;
        });
        
        // Spawn sharks with reduced rate and maximum limit
        if (Math.random() < this.sharkSpawnRate && this.sharks.length < this.maxSharks) {
            this.spawnShark();
        }
    }
    
    checkCollision(rect1, rect2) {
        return rect1.x < rect2.x + rect2.width &&
               rect1.x + rect1.width > rect2.x &&
               rect1.y < rect2.y + rect2.height &&
               rect1.y + rect1.height > rect2.y;
    }
    
    loadImages() {
        this.images = {
            paratrooper: new Image(),
            parachute: new Image(),
            helicopter: new Image(),
            boat: new Image(),
            shark: new Image()
        };
        
        // Create canvas for paratrooper sprite
        const paratrooperCanvas = document.createElement('canvas');
        const paratrooperCtx = paratrooperCanvas.getContext('2d');
        paratrooperCanvas.width = this.spriteSize;
        paratrooperCanvas.height = this.spriteSize;
        
        // Draw paratrooper with better proportions and details
        // Body
        paratrooperCtx.fillStyle = '#3A4B45';  // Darker military green
        paratrooperCtx.beginPath();
        paratrooperCtx.roundRect(12, 12, 8, 16, 2);  // Torso
        paratrooperCtx.fill();
        
        // Arms
        paratrooperCtx.fillStyle = '#3A4B45';
        // Left arm
        paratrooperCtx.beginPath();
        paratrooperCtx.moveTo(12, 14);
        paratrooperCtx.lineTo(8, 22);
        paratrooperCtx.lineTo(10, 24);
        paratrooperCtx.lineTo(12, 20);
        paratrooperCtx.fill();
        // Right arm
        paratrooperCtx.beginPath();
        paratrooperCtx.moveTo(20, 14);
        paratrooperCtx.lineTo(24, 22);
        paratrooperCtx.lineTo(22, 24);
        paratrooperCtx.lineTo(20, 20);
        paratrooperCtx.fill();
        
        // Legs
        paratrooperCtx.fillStyle = '#3A4B45';
        // Left leg
        paratrooperCtx.beginPath();
        paratrooperCtx.moveTo(13, 28);
        paratrooperCtx.lineTo(12, 32);
        paratrooperCtx.lineTo(14, 32);
        paratrooperCtx.lineTo(15, 28);
        paratrooperCtx.fill();
        // Right leg
        paratrooperCtx.beginPath();
        paratrooperCtx.moveTo(17, 28);
        paratrooperCtx.lineTo(18, 32);
        paratrooperCtx.lineTo(20, 32);
        paratrooperCtx.lineTo(19, 28);
        paratrooperCtx.fill();
        
        // Boots
        paratrooperCtx.fillStyle = '#4A3C2A';  // Brown boots
        // Left boot
        paratrooperCtx.fillRect(11, 32, 4, 3);
        // Right boot
        paratrooperCtx.fillRect(17, 32, 4, 3);
        
        // Head
        paratrooperCtx.fillStyle = '#FFD6B1';  // Skin tone
        paratrooperCtx.beginPath();
        paratrooperCtx.arc(16, 10, 4, 0, Math.PI * 2);
        paratrooperCtx.fill();
        
        // Helmet
        paratrooperCtx.fillStyle = '#2C3E50';  // Dark helmet color
        paratrooperCtx.beginPath();
        paratrooperCtx.arc(16, 9, 5, Math.PI, 0);
        paratrooperCtx.fill();
        
        // Helmet strap
        paratrooperCtx.strokeStyle = '#2C3E50';
        paratrooperCtx.lineWidth = 1;
        paratrooperCtx.beginPath();
        paratrooperCtx.moveTo(12, 11);
        paratrooperCtx.lineTo(20, 11);
        paratrooperCtx.stroke();
        
        // Parachute harness
        paratrooperCtx.strokeStyle = '#4A3C2A';  // Brown harness
        paratrooperCtx.lineWidth = 1;
        // Vertical straps
        paratrooperCtx.beginPath();
        paratrooperCtx.moveTo(14, 12);
        paratrooperCtx.lineTo(14, 28);
        paratrooperCtx.moveTo(18, 12);
        paratrooperCtx.lineTo(18, 28);
        paratrooperCtx.stroke();
        // Horizontal straps
        paratrooperCtx.beginPath();
        paratrooperCtx.moveTo(12, 16);
        paratrooperCtx.lineTo(20, 16);
        paratrooperCtx.moveTo(12, 22);
        paratrooperCtx.lineTo(20, 22);
        paratrooperCtx.stroke();
        
        // Equipment details
        paratrooperCtx.fillStyle = '#2C3E50';  // Dark equipment color
        // Backpack
        paratrooperCtx.fillRect(13, 18, 6, 8);
        
        // Add shading for depth
        paratrooperCtx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        paratrooperCtx.fillRect(12, 12, 8, 16);
        
        // Add highlights
        paratrooperCtx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        paratrooperCtx.fillRect(12, 12, 2, 16);
        
        this.images.paratrooper.src = paratrooperCanvas.toDataURL();
        
        // Create canvas for parachute
        const parachuteCanvas = document.createElement('canvas');
        const parachuteCtx = parachuteCanvas.getContext('2d');
        parachuteCanvas.width = this.parachuteSize;
        parachuteCanvas.height = this.parachuteSize;
        
        // Draw parachute canopy
        const centerX = this.parachuteSize / 2;
        const centerY = this.parachuteSize / 2 - 5;
        const radius = this.parachuteSize / 2 - 8;
        
        // Draw main canopy shape
        parachuteCtx.beginPath();
        parachuteCtx.arc(centerX, centerY, radius, Math.PI, 0, false);
        parachuteCtx.quadraticCurveTo(
            centerX + radius, centerY + radius * 0.5,
            centerX + radius * 0.7, centerY + radius * 0.8
        );
        parachuteCtx.lineTo(centerX + 2, centerY + radius * 0.9);
        parachuteCtx.lineTo(centerX - 2, centerY + radius * 0.9);
        parachuteCtx.lineTo(centerX - radius * 0.7, centerY + radius * 0.8);
        parachuteCtx.quadraticCurveTo(
            centerX - radius, centerY + radius * 0.5,
            centerX - radius, centerY
        );
        
        // Create gradient for canopy
        const canopyGradient = parachuteCtx.createLinearGradient(
            centerX, centerY - radius,
            centerX, centerY + radius
        );
        canopyGradient.addColorStop(0, '#FF6B6B');  // Bright red at top
        canopyGradient.addColorStop(0.5, '#FF4040');  // Darker red in middle
        canopyGradient.addColorStop(1, '#CC0000');  // Even darker at bottom
        
        parachuteCtx.fillStyle = canopyGradient;
        parachuteCtx.fill();
        
        // Add stripes for detail
        const stripeCount = 8;
        parachuteCtx.strokeStyle = '#FFFFFF';
        parachuteCtx.lineWidth = 2;
        
        for (let i = 1; i < stripeCount; i++) {
            const x = centerX - radius + (radius * 2 / stripeCount) * i;
            parachuteCtx.beginPath();
            parachuteCtx.moveTo(x, centerY);
            parachuteCtx.quadraticCurveTo(
                x, centerY + radius * 0.5,
                centerX, centerY + radius * 0.9
            );
            parachuteCtx.stroke();
        }
        
        // Add suspension lines
        parachuteCtx.strokeStyle = '#1A1A1A';
        parachuteCtx.lineWidth = 1.5;
        
        // Draw main suspension lines
        const linePoints = [
            -radius * 0.8, -radius * 0.4, 0, radius * 0.4, radius * 0.8
        ];
        
        linePoints.forEach(xOffset => {
            parachuteCtx.beginPath();
            parachuteCtx.moveTo(centerX + xOffset, centerY);
            // Add slight curve to lines
            parachuteCtx.quadraticCurveTo(
                centerX + xOffset * 0.8, centerY + radius * 0.6,
                centerX, centerY + radius * 1.2
            );
            parachuteCtx.stroke();
        });
        
        // Add air vents
        parachuteCtx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        for (let i = 1; i < stripeCount; i++) {
            const x = centerX - radius * 0.8 + (radius * 1.6 / stripeCount) * i;
            parachuteCtx.beginPath();
            parachuteCtx.arc(x, centerY + radius * 0.2, 2, 0, Math.PI * 2);
            parachuteCtx.fill();
        }
        
        // Add shading and highlights
        // Top highlight
        parachuteCtx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        parachuteCtx.beginPath();
        parachuteCtx.arc(centerX, centerY, radius * 0.9, Math.PI, 0, false);
        parachuteCtx.fill();
        
        // Bottom shadow
        parachuteCtx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        parachuteCtx.beginPath();
        parachuteCtx.arc(centerX, centerY + radius * 0.1, radius * 0.9, 0, Math.PI, false);
        parachuteCtx.fill();
        
        this.images.parachute.src = parachuteCanvas.toDataURL();
        
        // Create canvas for helicopter
        const helicopterCanvas = document.createElement('canvas');
        const helicopterCtx = helicopterCanvas.getContext('2d');
        helicopterCanvas.width = 80;  // Increased width for more detail
        helicopterCanvas.height = 40;
        
        // Draw helicopter body (fuselage)
        helicopterCtx.fillStyle = '#2C3E50';  // Dark blue-gray
        helicopterCtx.beginPath();
        helicopterCtx.moveTo(20, 25);  // Start at nose
        helicopterCtx.lineTo(30, 15);  // Up to cockpit
        helicopterCtx.lineTo(60, 15);  // Top of body
        helicopterCtx.lineTo(70, 25);  // Back slope
        helicopterCtx.lineTo(60, 35);  // Bottom back
        helicopterCtx.lineTo(30, 35);  // Bottom front
        helicopterCtx.closePath();
        helicopterCtx.fill();

        // Draw cockpit window
        helicopterCtx.fillStyle = '#85C1E9';  // Light blue
        helicopterCtx.beginPath();
        helicopterCtx.moveTo(25, 25);
        helicopterCtx.lineTo(32, 18);
        helicopterCtx.lineTo(45, 18);
        helicopterCtx.lineTo(45, 30);
        helicopterCtx.lineTo(32, 30);
        helicopterCtx.closePath();
        helicopterCtx.fill();

        // Draw main rotor hub
        helicopterCtx.fillStyle = '#34495E';
        helicopterCtx.fillRect(42, 10, 8, 5);

        // Draw main rotor blades
        helicopterCtx.strokeStyle = '#2C3E50';
        helicopterCtx.lineWidth = 3;
        helicopterCtx.beginPath();
        // Left blade
        helicopterCtx.moveTo(10, 12);
        helicopterCtx.lineTo(46, 12);
        // Right blade
        helicopterCtx.moveTo(46, 12);
        helicopterCtx.lineTo(82, 12);
        helicopterCtx.stroke();

        // Draw tail boom
        helicopterCtx.fillStyle = '#2C3E50';
        helicopterCtx.fillRect(65, 22, 15, 4);

        // Draw tail rotor
        helicopterCtx.strokeStyle = '#2C3E50';
        helicopterCtx.lineWidth = 2;
        helicopterCtx.beginPath();
        helicopterCtx.moveTo(80, 15);
        helicopterCtx.lineTo(80, 33);
        helicopterCtx.stroke();

        // Draw skids (landing gear)
        helicopterCtx.strokeStyle = '#34495E';
        helicopterCtx.lineWidth = 2;
        // Left skid
        helicopterCtx.beginPath();
        helicopterCtx.moveTo(30, 35);
        helicopterCtx.lineTo(30, 38);
        helicopterCtx.lineTo(55, 38);
        helicopterCtx.lineTo(55, 35);
        helicopterCtx.stroke();
        // Right skid supports
        helicopterCtx.beginPath();
        helicopterCtx.moveTo(35, 35);
        helicopterCtx.lineTo(35, 38);
        helicopterCtx.moveTo(50, 35);
        helicopterCtx.lineTo(50, 38);
        helicopterCtx.stroke();

        // Add shading
        helicopterCtx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        helicopterCtx.beginPath();
        helicopterCtx.moveTo(30, 15);
        helicopterCtx.lineTo(60, 15);
        helicopterCtx.lineTo(60, 25);
        helicopterCtx.lineTo(30, 25);
        helicopterCtx.closePath();
        helicopterCtx.fill();

        this.images.helicopter.src = helicopterCanvas.toDataURL();
        
        // Create canvas for boat
        const boatCanvas = document.createElement('canvas');
        const boatCtx = boatCanvas.getContext('2d');
        boatCanvas.width = 80;
        boatCanvas.height = 40;
        
        // Draw warship
        // Main hull
        boatCtx.fillStyle = '#4A5459'; // Military gray
        boatCtx.beginPath();
        boatCtx.moveTo(0, 35);
        boatCtx.lineTo(10, 25);  // Front slope
        boatCtx.lineTo(70, 25);  // Main deck
        boatCtx.lineTo(80, 35);  // Back slope
        boatCtx.closePath();
        boatCtx.fill();

        // Upper deck structure
        boatCtx.fillStyle = '#5D6B74'; // Lighter gray
        boatCtx.beginPath();
        boatCtx.moveTo(20, 25);
        boatCtx.lineTo(20, 15);
        boatCtx.lineTo(60, 15);
        boatCtx.lineTo(60, 25);
        boatCtx.closePath();
        boatCtx.fill();

        // Bridge/Command tower
        boatCtx.fillStyle = '#36454F'; // Darker gray
        boatCtx.fillRect(35, 8, 15, 7);

        // Radar/Communications mast
        boatCtx.strokeStyle = '#2F4F4F';
        boatCtx.lineWidth = 2;
        boatCtx.beginPath();
        boatCtx.moveTo(42, 8);
        boatCtx.lineTo(42, 2);
        boatCtx.stroke();

        // Radar dish
        boatCtx.beginPath();
        boatCtx.moveTo(42, 4);
        boatCtx.lineTo(48, 4);
        boatCtx.stroke();

        // Front gun turret
        boatCtx.fillStyle = '#36454F';
        boatCtx.beginPath();
        boatCtx.arc(25, 20, 5, 0, Math.PI * 2);
        boatCtx.fill();
        
        // Gun barrel
        boatCtx.strokeStyle = '#36454F';
        boatCtx.lineWidth = 3;
        boatCtx.beginPath();
        boatCtx.moveTo(25, 20);
        boatCtx.lineTo(15, 20);
        boatCtx.stroke();

        // Details - windows/portholes
        boatCtx.fillStyle = '#A9A9A9';
        for (let i = 0; i < 3; i++) {
            boatCtx.beginPath();
            boatCtx.arc(30 + i * 10, 20, 2, 0, Math.PI * 2);
            boatCtx.fill();
        }

        // Waterline detail
        boatCtx.strokeStyle = '#2F4F4F';
        boatCtx.lineWidth = 1;
        boatCtx.beginPath();
        boatCtx.moveTo(10, 30);
        boatCtx.lineTo(70, 30);
        boatCtx.stroke();

        // Add some shading/highlights
        boatCtx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        boatCtx.beginPath();
        boatCtx.moveTo(10, 25);
        boatCtx.lineTo(70, 25);
        boatCtx.lineTo(70, 28);
        boatCtx.lineTo(10, 28);
        boatCtx.closePath();
        boatCtx.fill();
        
        this.images.boat.src = boatCanvas.toDataURL();
        
        // Create canvas for shark
        const sharkCanvas = document.createElement('canvas');
        const sharkCtx = sharkCanvas.getContext('2d');
        sharkCanvas.width = 80;  // Increased size for more detail
        sharkCanvas.height = 40;
        
        // Draw shark body
        sharkCtx.fillStyle = '#2F4F4F'; // Darker blue-gray for shark
        sharkCtx.beginPath();
        // Main body shape
        sharkCtx.moveTo(15, 20);  // Start at nose
        sharkCtx.quadraticCurveTo(30, 10, 60, 15);  // Top curve
        sharkCtx.quadraticCurveTo(70, 20, 60, 25);  // Back curve
        sharkCtx.quadraticCurveTo(30, 30, 15, 20);  // Bottom curve
        sharkCtx.fill();
        
        // Tail
        sharkCtx.beginPath();
        sharkCtx.moveTo(60, 15);
        sharkCtx.lineTo(75, 5);   // Upper tail fin
        sharkCtx.lineTo(70, 20);  // Middle of tail
        sharkCtx.lineTo(75, 35);  // Lower tail fin
        sharkCtx.lineTo(60, 25);
        sharkCtx.fill();
        
        // Dorsal fin
        sharkCtx.beginPath();
        sharkCtx.moveTo(35, 15);
        sharkCtx.lineTo(45, 0);   // Fin tip
        sharkCtx.lineTo(55, 15);  // Back to body
        sharkCtx.fill();
        
        // Pectoral fin
        sharkCtx.beginPath();
        sharkCtx.moveTo(35, 20);
        sharkCtx.lineTo(45, 30);  // Fin tip
        sharkCtx.lineTo(50, 20);  // Back to body
        sharkCtx.fill();
        
        // Eye
        sharkCtx.fillStyle = '#FFFFFF';
        sharkCtx.beginPath();
        sharkCtx.arc(20, 18, 3, 0, Math.PI * 2);
        sharkCtx.fill();
        
        // Pupil
        sharkCtx.fillStyle = '#000000';
        sharkCtx.beginPath();
        sharkCtx.arc(20, 18, 1.5, 0, Math.PI * 2);
        sharkCtx.fill();
        
        // Gills (3 sets)
        sharkCtx.strokeStyle = '#1a3a3a';
        sharkCtx.lineWidth = 2;
        for (let i = 0; i < 3; i++) {
            sharkCtx.beginPath();
            sharkCtx.moveTo(25 + i * 6, 18);
            sharkCtx.quadraticCurveTo(28 + i * 6, 22, 25 + i * 6, 26);
            sharkCtx.stroke();
        }
        
        // Mouth line
        sharkCtx.strokeStyle = '#1a3a3a';
        sharkCtx.beginPath();
        sharkCtx.moveTo(15, 20);
        sharkCtx.quadraticCurveTo(20, 23, 25, 22);
        sharkCtx.stroke();
        
        // Add shading for depth
        sharkCtx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        sharkCtx.beginPath();
        sharkCtx.moveTo(15, 20);
        sharkCtx.quadraticCurveTo(30, 15, 60, 15);
        sharkCtx.quadraticCurveTo(30, 18, 15, 20);
        sharkCtx.fill();
        
        // Add darker shading underneath
        sharkCtx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        sharkCtx.beginPath();
        sharkCtx.moveTo(15, 20);
        sharkCtx.quadraticCurveTo(30, 25, 60, 25);
        sharkCtx.quadraticCurveTo(30, 22, 15, 20);
        sharkCtx.fill();
        
        this.images.shark.src = sharkCanvas.toDataURL();
    }
    
    drawIsland(island) {
        // Draw island base with gradient
        const sandGradient = this.ctx.createLinearGradient(
            island.x, island.y,
            island.x, island.y + island.height
        );
        sandGradient.addColorStop(0, '#FFE4B5');  // Moccasin - lighter sand
        sandGradient.addColorStop(1, '#DEB887');  // Burlywood - darker sand
        
        this.ctx.fillStyle = sandGradient;
        this.ctx.beginPath();
        
        // Create smooth island shape
        const baseY = island.y + island.height;
        const width = island.width;
        const height = island.height;
        const x = island.x;
        const y = island.y;
        
        // Start from bottom left
        this.ctx.moveTo(x, baseY);
        
        // Left side curve
        this.ctx.quadraticCurveTo(
            x + width * 0.2, y + height * 0.7,
            x + width * 0.2, y + height * 0.3
        );
        
        // Top curve
        this.ctx.bezierCurveTo(
            x + width * 0.2, y,
            x + width * 0.8, y,
            x + width * 0.8, y + height * 0.3
        );
        
        // Right side curve
        this.ctx.quadraticCurveTo(
            x + width * 0.8, y + height * 0.7,
            x + width, baseY
        );
        
        this.ctx.closePath();
        this.ctx.fill();
        
        // Draw palm tree (anchored to island)
        const palmX = island.palmTree.x;
        const palmBaseY = y + 5; // Anchor to top of island
        const trunkWidth = island.palmTree.trunkWidth;
        const trunkHeight = island.palmTree.trunkHeight;
        
        // Draw trunk
        this.ctx.fillStyle = '#8B4513';  // Brown
        this.ctx.beginPath();
        this.ctx.moveTo(palmX - trunkWidth/2, palmBaseY + trunkHeight);
        
        // Left side of trunk with slight curve
        this.ctx.quadraticCurveTo(
            palmX - trunkWidth/3, palmBaseY + trunkHeight/2,
            palmX - trunkWidth/4, palmBaseY
        );
        
        // Right side of trunk with slight curve
        this.ctx.quadraticCurveTo(
            palmX + trunkWidth/3, palmBaseY + trunkHeight/2,
            palmX + trunkWidth/2, palmBaseY + trunkHeight
        );
        
        this.ctx.closePath();
        this.ctx.fill();
        
        // Draw palm tree leaves
        const leafCount = 7;  // Reduced number of leaves for cleaner look
        const leafLength = 25;
        
        for (let i = 0; i < leafCount; i++) {
            const angle = (i * (360 / leafCount)) * Math.PI / 180;
            
            this.ctx.save();
            this.ctx.translate(palmX, palmBaseY);
            this.ctx.rotate(angle);
            
            // Draw leaf
            this.ctx.fillStyle = '#228B22';  // Single color for consistency
            this.ctx.beginPath();
            this.ctx.moveTo(0, 0);
            // Draw curved leaf
            this.ctx.quadraticCurveTo(
                leafLength * 0.5, -8,
                leafLength, 0
            );
            this.ctx.quadraticCurveTo(
                leafLength * 0.5, 8,
                0, 0
            );
            this.ctx.fill();
            
            this.ctx.restore();
        }
        
        // Add three coconuts at the base of the leaves
        this.ctx.fillStyle = '#8B4513';
        for (let i = -1; i <= 1; i++) {
            this.ctx.beginPath();
            this.ctx.arc(palmX + i * 4, palmBaseY + 4, 3, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }
    
    drawCloud(cloud) {
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        
        // Draw main cloud body (multiple circles for fluffy appearance)
        const centerY = cloud.y + cloud.height / 2;
        const circleRadius = cloud.height / 2;
        
        // Draw multiple overlapping circles to create cloud shape
        this.ctx.beginPath();
        this.ctx.arc(cloud.x + circleRadius, centerY, circleRadius, 0, Math.PI * 2);
        this.ctx.arc(cloud.x + cloud.width - circleRadius, centerY, circleRadius, 0, Math.PI * 2);
        this.ctx.arc(cloud.x + cloud.width / 4, centerY - circleRadius / 2, circleRadius, 0, Math.PI * 2);
        this.ctx.arc(cloud.x + cloud.width / 2, centerY - circleRadius / 3, circleRadius * 1.2, 0, Math.PI * 2);
        this.ctx.arc(cloud.x + (cloud.width / 4) * 3, centerY - circleRadius / 2, circleRadius, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Add some shading
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.beginPath();
        this.ctx.arc(cloud.x + cloud.width / 2, centerY, circleRadius * 1.2, 0, Math.PI * 2);
        this.ctx.fill();
    }
    
    draw() {
        // Clear canvas
        this.ctx.fillStyle = '#87CEEB'; // Sky blue
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw clouds
        this.clouds.forEach(cloud => this.drawCloud(cloud));
        
        // Draw islands
        this.drawIsland(this.islands.left);
        this.drawIsland(this.islands.right);
        
        // Draw water with enhanced wave effect and gradient
        // Create gradient for water
        const waterGradient = this.ctx.createLinearGradient(0, this.waterLevel, 0, this.canvas.height);
        waterGradient.addColorStop(0, '#0077BE');    // Ocean blue at top
        waterGradient.addColorStop(0.7, '#005490');  // Darker blue for depth
        waterGradient.addColorStop(1, '#003d6b');    // Deepest blue at bottom
        
        this.ctx.fillStyle = waterGradient;
        this.ctx.fillRect(0, this.waterLevel, this.canvas.width, this.canvas.height - this.waterLevel);
        
        // Draw multiple layers of waves for more detail
        // First layer - larger waves
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.lineWidth = 2;
        
        const time = Date.now() / 1000; // For wave animation
        for (let i = 0; i < this.canvas.width; i += 40) {
            this.ctx.beginPath();
            // Animate wave position using sine
            const xOffset = Math.sin(time + i * 0.1) * 5;
            this.ctx.moveTo(i + xOffset, this.waterLevel);
            this.ctx.bezierCurveTo(
                i + 10 + xOffset, this.waterLevel - 5,
                i + 30 + xOffset, this.waterLevel + 5,
                i + 40 + xOffset, this.waterLevel
            );
            this.ctx.stroke();
        }
        
        // Second layer - medium waves
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        this.ctx.lineWidth = 1.5;
        for (let i = -20; i < this.canvas.width; i += 30) {
            this.ctx.beginPath();
            const xOffset = Math.sin(time * 1.2 + i * 0.15) * 3;
            this.ctx.moveTo(i + xOffset, this.waterLevel + 3);
            this.ctx.bezierCurveTo(
                i + 8 + xOffset, this.waterLevel,
                i + 22 + xOffset, this.waterLevel + 6,
                i + 30 + xOffset, this.waterLevel + 3
            );
            this.ctx.stroke();
        }
        
        // Third layer - small ripples
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        this.ctx.lineWidth = 1;
        for (let i = -10; i < this.canvas.width; i += 20) {
            this.ctx.beginPath();
            const xOffset = Math.sin(time * 1.5 + i * 0.2) * 2;
            this.ctx.moveTo(i + xOffset, this.waterLevel + 5);
            this.ctx.bezierCurveTo(
                i + 5 + xOffset, this.waterLevel + 3,
                i + 15 + xOffset, this.waterLevel + 7,
                i + 20 + xOffset, this.waterLevel + 5
            );
            this.ctx.stroke();
        }
        
        // Add subtle highlights
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        for (let i = 0; i < this.canvas.width; i += 50) {
            const xOffset = Math.sin(time + i * 0.05) * 10;
            this.ctx.beginPath();
            this.ctx.ellipse(
                i + xOffset,
                this.waterLevel + 20,
                15,
                8,
                0,
                0,
                Math.PI * 2
            );
            this.ctx.fill();
        }
        
        // Add darker areas for depth variation
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        for (let i = 30; i < this.canvas.width; i += 70) {
            const xOffset = Math.sin(time * 0.8 + i * 0.05) * 8;
            this.ctx.beginPath();
            this.ctx.ellipse(
                i + xOffset,
                this.waterLevel + 40,
                25,
                12,
                0,
                0,
                Math.PI * 2
            );
            this.ctx.fill();
        }
        
        // Draw boat
        this.ctx.drawImage(this.images.boat, this.boat.x, this.boat.y);
        
        // Draw helicopters
        this.helicopters.forEach(helicopter => {
            this.ctx.drawImage(this.images.helicopter, helicopter.x, helicopter.y);
        });
        
        // Draw parachutists
        this.parachutists.forEach(parachutist => {
            const parachuteX = parachutist.x - (this.parachuteSize - this.spriteSize) / 2;
            const parachuteY = parachutist.y - this.parachuteSize + 10;
            
            // Draw parachute
            this.ctx.drawImage(
                this.images.parachute,
                parachuteX,
                parachuteY,
                this.parachuteSize,
                this.parachuteSize
            );
            
            // Draw connecting lines between parachute and paratrooper
            this.ctx.strokeStyle = '#1A1A1A';
            this.ctx.lineWidth = 1;
            
            // Calculate connection points
            const parachuteCenterX = parachuteX + this.parachuteSize / 2;
            const parachuteCenterY = parachuteY + this.parachuteSize / 2;
            const trooperTopX = parachutist.x + this.spriteSize / 2;
            const trooperTopY = parachutist.y + 5;  // Connect to top of paratrooper
            
            // Draw four suspension lines
            const lineOffsets = [-10, -3, 3, 10];  // Horizontal offsets for line spread
            lineOffsets.forEach(offset => {
                this.ctx.beginPath();
                this.ctx.moveTo(parachuteCenterX + offset, parachuteCenterY + 10);
                // Add slight curve to lines
                this.ctx.quadraticCurveTo(
                    parachuteCenterX + offset * 0.5,
                    parachuteCenterY + (trooperTopY - parachuteCenterY) * 0.5,
                    trooperTopX,
                    trooperTopY
                );
                this.ctx.stroke();
            });
            
            // Draw paratrooper
            this.ctx.drawImage(
                this.images.paratrooper,
                parachutist.x,
                parachutist.y,
                this.spriteSize,
                this.spriteSize
            );
        });
        
        // Draw sharks
        this.sharks.forEach(shark => {
            this.ctx.save();
            this.ctx.translate(shark.x + shark.width / 2, shark.y + shark.height / 2);
            // If direction is -1 (moving left), rotate 180 degrees around Y axis by scaling X
            this.ctx.scale(shark.direction, 1);
            this.ctx.drawImage(
                this.images.shark,
                -shark.width / 2,
                -shark.height / 2,
                shark.width,
                shark.height
            );
            this.ctx.restore();
        });
        
        // Draw floating scores
        this.drawFloatingScores();
        
        // Draw game over message
        if (this.gameOver) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '48px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('Game Over!', this.canvas.width / 2, this.canvas.height / 2);
            this.ctx.font = '24px Arial';
            this.ctx.fillText(`Final Score: ${this.score}`, this.canvas.width / 2, this.canvas.height / 2 + 40);
        }

        // Draw pause message
        if (this.isPaused) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '48px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('PAUSED', this.canvas.width / 2, this.canvas.height / 2);
            this.ctx.font = '24px Arial';
            this.ctx.fillText('Press ESC or click Resume to continue', this.canvas.width / 2, this.canvas.height / 2 + 40);
        }
    }
    
    updateScore() {
        document.getElementById('score').textContent = this.score;
    }
    
    updateLives() {
        const livesElement = document.getElementById('lives');
        livesElement.innerHTML = '❤️'.repeat(this.lives);
    }
    
    updateRescued() {
        document.getElementById('rescued').textContent = this.rescued;
    }
    
    gameLoop() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }

    // Add new method for floating score
    addFloatingScore(x, y) {
        this.floatingScores.push({
            x: x,
            y: y,
            alpha: 1,
            velocity: -2,  // Move upward
            lifetime: 60    // Frames to display
        });
    }

    // Add method to update floating scores
    updateFloatingScores() {
        this.floatingScores = this.floatingScores.filter(score => {
            score.y += score.velocity;
            score.lifetime--;
            score.alpha = score.lifetime / 60;  // Fade out over lifetime
            return score.lifetime > 0;
        });
    }

    // Add method to draw floating scores
    drawFloatingScores() {
        this.ctx.font = 'bold 24px Arial';
        this.ctx.textAlign = 'center';
        this.floatingScores.forEach(score => {
            this.ctx.fillStyle = `rgba(76, 175, 80, ${score.alpha})`;  // Green with alpha
            this.ctx.fillText('+100', score.x, score.y);
        });
    }
}

// Initialize game when the page loads
window.addEventListener('load', () => {
    new Game();
}); 