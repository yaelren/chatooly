/* 
 * Chatooly Tool Template - Main Logic
 * Author: Yael Renous - Studio Video
 */

// ========== EDIT THIS: Your Tool Logic Goes Here ==========

class WindyText {
    constructor() {
        this.canvas = document.getElementById('windy-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.letters = [];
        this.rainWords = [];
        this.windSpeed = 3;
        this.windDirection = 90;
        this.turbulence = false;
        this.turbulenceStrength = 2;
        this.mode = 'chained';
        this.text = 'Windy Text';
        this.textColor = '#ffffff';
        this.textSize = 40;
        this.rainMode = false;
        this.rainSpeed = 2;
        this.lastRainSpawn = 0;
        this.animateDirection = false;
        this.animateSpeed = false;
        this.directionAnimationSpeed = 1;
        this.speedAnimationSpeed = 1;
        this.animationStartTime = Date.now();
        
        this.setupCanvas();
        this.setupControls();
        this.createLetters();
        this.animate();
    }
    
    setupCanvas() {
        this.canvas.width = 800;
        this.canvas.height = 600;
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
    }
    
    setupControls() {
        // Text input
        const textInput = document.getElementById('text-input');
        textInput.addEventListener('input', (e) => {
            this.text = e.target.value || 'Windy Text';
            this.createLetters();
        });
        
        // Wind speed
        const windSpeed = document.getElementById('wind-speed');
        const windSpeedDisplay = windSpeed.nextElementSibling;
        windSpeed.addEventListener('input', (e) => {
            this.windSpeed = parseFloat(e.target.value);
            windSpeedDisplay.textContent = this.windSpeed.toFixed(1);
        });
        
        // Wind direction
        const windDirection = document.getElementById('wind-direction');
        const windDirectionDisplay = windDirection.nextElementSibling;
        windDirection.addEventListener('input', (e) => {
            this.windDirection = parseFloat(e.target.value);
            windDirectionDisplay.textContent = `${this.windDirection}°`;
        });
        
        // Animate wind direction toggle
        const animateDirectionToggle = document.getElementById('animate-direction-toggle');
        animateDirectionToggle.addEventListener('change', (e) => {
            this.animateDirection = e.target.checked;
            if (this.animateDirection) {
                this.animationStartTime = Date.now();
            }
        });
        
        // Direction animation speed
        const directionAnimationSpeed = document.getElementById('direction-animation-speed');
        const directionAnimationSpeedDisplay = directionAnimationSpeed.nextElementSibling;
        directionAnimationSpeed.addEventListener('input', (e) => {
            this.directionAnimationSpeed = parseFloat(e.target.value);
            directionAnimationSpeedDisplay.textContent = this.directionAnimationSpeed.toFixed(1);
        });
        
        // Animate wind speed toggle
        const animateSpeedToggle = document.getElementById('animate-speed-toggle');
        animateSpeedToggle.addEventListener('change', (e) => {
            this.animateSpeed = e.target.checked;
            if (this.animateSpeed) {
                this.animationStartTime = Date.now();
            }
        });
        
        // Speed animation speed
        const speedAnimationSpeed = document.getElementById('speed-animation-speed');
        const speedAnimationSpeedDisplay = speedAnimationSpeed.nextElementSibling;
        speedAnimationSpeed.addEventListener('input', (e) => {
            this.speedAnimationSpeed = parseFloat(e.target.value);
            speedAnimationSpeedDisplay.textContent = this.speedAnimationSpeed.toFixed(1);
        });
        
        // Turbulence toggle
        const turbulenceToggle = document.getElementById('turbulence-toggle');
        turbulenceToggle.addEventListener('change', (e) => {
            this.turbulence = e.target.checked;
        });
        
        // Turbulence strength
        const turbulenceStrength = document.getElementById('turbulence-strength');
        const turbulenceStrengthDisplay = turbulenceStrength.nextElementSibling;
        turbulenceStrength.addEventListener('input', (e) => {
            this.turbulenceStrength = parseFloat(e.target.value);
            turbulenceStrengthDisplay.textContent = this.turbulenceStrength.toFixed(1);
        });
        
        // Mode toggle
        const modeToggle = document.getElementById('mode-toggle');
        modeToggle.addEventListener('change', (e) => {
            this.mode = e.target.value;
            this.createLetters();
        });
        
        // Rain toggle
        const rainToggle = document.getElementById('rain-toggle');
        rainToggle.addEventListener('change', (e) => {
            this.rainMode = e.target.checked;
            if (!this.rainMode) {
                this.rainWords = []; // Clear rain words when disabled
            }
        });
        
        // Rain speed
        const rainSpeed = document.getElementById('rain-speed');
        const rainSpeedDisplay = rainSpeed.nextElementSibling;
        rainSpeed.addEventListener('input', (e) => {
            this.rainSpeed = parseFloat(e.target.value);
            rainSpeedDisplay.textContent = this.rainSpeed.toFixed(1);
        });
        
        // Text color
        const textColor = document.getElementById('text-color');
        textColor.addEventListener('change', (e) => {
            this.textColor = e.target.value;
        });
        
        // Text size
        const textSize = document.getElementById('text-size');
        const textSizeDisplay = textSize.nextElementSibling;
        textSize.addEventListener('input', (e) => {
            this.textSize = parseInt(e.target.value);
            textSizeDisplay.textContent = `${this.textSize}px`;
            this.createLetters();
        });
        
        // Reset button
        const resetBtn = document.getElementById('reset-btn');
        resetBtn.addEventListener('click', () => {
            this.reset();
        });
    }
    
    createLetters() {
        this.letters = [];
        const letters = this.text.split('');
        
        // Calculate total width to center the text
        this.ctx.font = `${this.textSize}px Arial`;
        const totalWidth = this.ctx.measureText(this.text).width;
        const startX = (this.canvas.width - totalWidth) / 2;
        const startY = this.canvas.height / 2;
        
        letters.forEach((letter, index) => {
            if (letter === ' ') return; // Skip spaces
            
            const letterWidth = this.ctx.measureText(letter).width;
            const x = startX + this.ctx.measureText(this.text.substring(0, index)).width;
            
            this.letters.push({
                char: letter,
                x: x,
                y: startY,
                vx: 0,
                vy: 0,
                originalX: x,
                originalY: startY,
                index: index,
                angle: 0,
                rotationSpeed: (Math.random() - 0.5) * 0.1
            });
        });
    }
    
    spawnRainWord() {
        if (!this.rainMode) return;
        
        const now = Date.now();
        const spawnInterval = 1500 / this.rainSpeed; // Spawn interval based on rain speed
        
        if (now - this.lastRainSpawn > spawnInterval) {
            const rainText = this.text || 'Windy Text';
            const letters = rainText.split('');
            
            // Calculate starting position for the new rain text
            const totalWidth = this.ctx.measureText(rainText).width;
            const startX = Math.random() * (this.canvas.width - totalWidth - 100) + 50;
            const startY = -50;
            
            // Create individual letters for rain, just like the main text
            letters.forEach((letter, index) => {
                if (letter === ' ') return; // Skip spaces
                
                const letterWidth = this.ctx.measureText(letter).width;
                const x = startX + this.ctx.measureText(rainText.substring(0, index)).width;
                
                this.rainWords.push({
                    char: letter,
                    x: x,
                    y: startY,
                    vx: 0,
                    vy: 0,
                    originalX: x,
                    originalY: startY,
                    index: index,
                    angle: 0,
                    rotationSpeed: (Math.random() - 0.5) * 0.1,
                    opacity: 1,
                    life: 0,
                    textGroup: this.rainWords.length // Group identifier for chained mode
                });
            });
            
            this.lastRainSpawn = now;
        }
    }
    
    updateAnimatedWind() {
        const time = (Date.now() - this.animationStartTime) * 0.001;
        
        // Animate wind direction
        if (this.animateDirection) {
            // Create a smooth circular motion for direction
            const directionOffset = Math.sin(time * this.directionAnimationSpeed) * 180;
            this.windDirection = (90 + directionOffset + 360) % 360;
            
            // Update the slider and display
            const windDirectionSlider = document.getElementById('wind-direction');
            const windDirectionDisplay = windDirectionSlider.nextElementSibling;
            windDirectionSlider.value = this.windDirection;
            windDirectionDisplay.textContent = `${this.windDirection.toFixed(1)}°`;
        }
        
        // Animate wind speed
        if (this.animateSpeed) {
            // Create a wave pattern for speed between 1 and 8
            const speedOffset = Math.sin(time * this.speedAnimationSpeed) * 3.5;
            this.windSpeed = Math.max(0.5, 4.5 + speedOffset);
            
            // Update the slider and display
            const windSpeedSlider = document.getElementById('wind-speed');
            const windSpeedDisplay = windSpeedSlider.nextElementSibling;
            windSpeedSlider.value = this.windSpeed;
            windSpeedDisplay.textContent = this.windSpeed.toFixed(1);
        }
    }
    
    reset() {
        this.windSpeed = 3;
        this.windDirection = 90;
        this.turbulence = false;
        this.turbulenceStrength = 2;
        this.mode = 'chained';
        this.text = 'Windy Text';
        this.textColor = '#ffffff';
        this.textSize = 40;
        this.rainMode = false;
        this.rainSpeed = 2;
        this.rainWords = [];
        this.animateDirection = false;
        this.animateSpeed = false;
        this.directionAnimationSpeed = 1;
        this.speedAnimationSpeed = 1;
        
        // Reset controls
        document.getElementById('text-input').value = this.text;
        document.getElementById('wind-speed').value = this.windSpeed;
        document.getElementById('wind-direction').value = this.windDirection;
        document.getElementById('turbulence-toggle').checked = this.turbulence;
        document.getElementById('turbulence-strength').value = this.turbulenceStrength;
        document.getElementById('mode-toggle').value = this.mode;
        document.getElementById('text-color').value = this.textColor;
        document.getElementById('text-size').value = this.textSize;
        document.getElementById('rain-toggle').checked = this.rainMode;
        document.getElementById('rain-speed').value = this.rainSpeed;
        document.getElementById('animate-direction-toggle').checked = this.animateDirection;
        document.getElementById('animate-speed-toggle').checked = this.animateSpeed;
        document.getElementById('direction-animation-speed').value = this.directionAnimationSpeed;
        document.getElementById('speed-animation-speed').value = this.speedAnimationSpeed;
        
        // Update displays
        document.querySelector('#wind-speed + .value-display').textContent = this.windSpeed.toFixed(1);
        document.querySelector('#wind-direction + .value-display').textContent = `${this.windDirection}°`;
        document.querySelector('#turbulence-strength + .value-display').textContent = this.turbulenceStrength.toFixed(1);
        document.querySelector('#text-size + .value-display').textContent = `${this.textSize}px`;
        document.querySelector('#rain-speed + .value-display').textContent = this.rainSpeed.toFixed(1);
        document.querySelector('#direction-animation-speed + .value-display').textContent = this.directionAnimationSpeed.toFixed(1);
        document.querySelector('#speed-animation-speed + .value-display').textContent = this.speedAnimationSpeed.toFixed(1);
        
        this.createLetters();
    }
    
    applyWind() {
        const windRad = (this.windDirection * Math.PI) / 180;
        const windForceX = Math.cos(windRad) * this.windSpeed * 0.1;
        const windForceY = Math.sin(windRad) * this.windSpeed * 0.1;
        
        this.letters.forEach((letter, index) => {
            // Apply wind force
            letter.vx += windForceX;
            letter.vy += windForceY;
            
            // Apply turbulence if enabled
            if (this.turbulence) {
                const time = Date.now() * 0.001;
                const turbulenceX = Math.sin(time * 2 + index * 0.5) * this.turbulenceStrength * 0.05;
                const turbulenceY = Math.cos(time * 1.5 + index * 0.3) * this.turbulenceStrength * 0.05;
                letter.vx += turbulenceX;
                letter.vy += turbulenceY;
            }
            
            // Apply damping
            letter.vx *= 0.98;
            letter.vy *= 0.98;
            
            // Update position
            letter.x += letter.vx;
            letter.y += letter.vy;
            
            // Update rotation
            letter.angle += letter.rotationSpeed;
            
            // Keep letters in bounds with bounce
            if (letter.x < 0) {
                letter.x = 0;
                letter.vx *= -0.5;
            }
            if (letter.x > this.canvas.width) {
                letter.x = this.canvas.width;
                letter.vx *= -0.5;
            }
            if (letter.y < 0) {
                letter.y = 0;
                letter.vy *= -0.5;
            }
            if (letter.y > this.canvas.height) {
                letter.y = this.canvas.height;
                letter.vy *= -0.5;
            }
            
            // Chained mode: letters try to stay together
            if (this.mode === 'chained' && index > 0) {
                const prevLetter = this.letters[index - 1];
                const targetX = prevLetter.x + this.ctx.measureText(prevLetter.char).width;
                const dx = targetX - letter.x;
                letter.x += dx * 0.1;
            }
        });
        
        // Update rain words
        this.rainWords.forEach((rainWord, index) => {
            // Apply wind to rain words (same as main letters)
            const windRad = (this.windDirection * Math.PI) / 180;
            const windForceX = Math.cos(windRad) * this.windSpeed * 0.1;
            const windForceY = Math.sin(windRad) * this.windSpeed * 0.1;
            
            rainWord.vx += windForceX;
            rainWord.vy += windForceY;
            
            // Apply turbulence to rain words (same as main letters)
            if (this.turbulence) {
                const time = Date.now() * 0.001;
                const turbulenceX = Math.sin(time * 2 + index * 0.5) * this.turbulenceStrength * 0.05;
                const turbulenceY = Math.cos(time * 1.5 + index * 0.3) * this.turbulenceStrength * 0.05;
                rainWord.vx += turbulenceX;
                rainWord.vy += turbulenceY;
            }
            
            // Apply damping (same as main letters)
            rainWord.vx *= 0.98;
            rainWord.vy *= 0.98;
            
            // Update position
            rainWord.x += rainWord.vx;
            rainWord.y += rainWord.vy;
            
            // Update rotation
            rainWord.angle += rainWord.rotationSpeed;
            
            // Keep letters in bounds with bounce (same as main letters)
            if (rainWord.x < 0) {
                rainWord.x = 0;
                rainWord.vx *= -0.5;
            }
            if (rainWord.x > this.canvas.width) {
                rainWord.x = this.canvas.width;
                rainWord.vx *= -0.5;
            }
            if (rainWord.y < 0) {
                rainWord.y = 0;
                rainWord.vy *= -0.5;
            }
            if (rainWord.y > this.canvas.height) {
                rainWord.y = this.canvas.height;
                rainWord.vy *= -0.5;
            }
            
            // Chained mode: letters try to stay together (same as main letters)
            if (this.mode === 'chained' && rainWord.index > 0) {
                // Find the previous letter in the same text group
                const prevLetter = this.rainWords.find(rw => 
                    rw.textGroup === rainWord.textGroup && rw.index === rainWord.index - 1
                );
                if (prevLetter) {
                    const targetX = prevLetter.x + this.ctx.measureText(prevLetter.char).width;
                    const dx = targetX - rainWord.x;
                    rainWord.x += dx * 0.1;
                }
            }
            
            // Fade out as they fall
            if (rainWord.y > this.canvas.height * 0.8) {
                rainWord.opacity = Math.max(0, 1 - (rainWord.y - this.canvas.height * 0.8) / (this.canvas.height * 0.2));
            }
            
            // Remove letters that are off screen or too faded
            if (rainWord.y > this.canvas.height + 50 || rainWord.opacity <= 0) {
                this.rainWords.splice(index, 1);
            }
        });
    }
    
    draw() {
        // Clear canvas with gradient background
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        gradient.addColorStop(0, '#1a1a2e');
        gradient.addColorStop(1, '#16213e');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw wind direction indicator
        this.drawWindIndicator();
        
        // Draw letters
        this.ctx.font = `${this.textSize}px Arial`;
        this.ctx.fillStyle = this.textColor;
        this.ctx.textAlign = 'left';
        this.ctx.textBaseline = 'middle';
        
        this.letters.forEach(letter => {
            this.ctx.save();
            this.ctx.translate(letter.x, letter.y);
            this.ctx.rotate(letter.angle);
            this.ctx.fillText(letter.char, 0, 0);
            this.ctx.restore();
        });
        
        // Draw rain words
        this.ctx.font = `${this.textSize}px Arial`;
        this.ctx.textAlign = 'left';
        this.ctx.textBaseline = 'middle';
        
        this.rainWords.forEach(rainWord => {
            this.ctx.save();
            this.ctx.globalAlpha = rainWord.opacity;
            this.ctx.translate(rainWord.x, rainWord.y);
            this.ctx.rotate(rainWord.angle);
            this.ctx.fillStyle = this.textColor;
            this.ctx.fillText(rainWord.char, 0, 0);
            this.ctx.restore();
        });
    }
    
    drawWindIndicator() {
        const centerX = 50;
        const centerY = 50;
        const size = 30;
        
        // Draw wind arrow
        this.ctx.save();
        this.ctx.translate(centerX, centerY);
        this.ctx.rotate((this.windDirection * Math.PI) / 180);
        
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(-size/2, 0);
        this.ctx.lineTo(size/2, 0);
        this.ctx.stroke();
        
        // Arrow head
        this.ctx.beginPath();
        this.ctx.moveTo(size/2 - 8, -4);
        this.ctx.lineTo(size/2, 0);
        this.ctx.lineTo(size/2 - 8, 4);
        this.ctx.stroke();
        
        this.ctx.restore();
        
        // Draw speed indicator
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`${this.windSpeed.toFixed(1)}`, centerX, centerY + 25);
    }
    
    animate() {
        this.spawnRainWord();
        this.updateAnimatedWind(); // Call the new method here
        this.applyWind();
        this.draw();
        requestAnimationFrame(() => this.animate());
    }
}

// Initialize the tool when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new WindyText();
    
    // Initialize Chatooly with configuration
    if (window.Chatooly && window.ChatoolyConfig) {
        Chatooly.init(window.ChatoolyConfig);
    }
});