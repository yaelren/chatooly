// Reaction-Diffusion Background Animation
// Based on Gray-Scott reaction-diffusion model

let a = [], b = []; 
let cols, rows; 
let size = 10; // Increased for better performance

let p = 0; 
let q = 1;
let dA = 1.0; 
let dB = 0.5;
let feed = 0.055; 
let kill = 0.062;

// Dissolve effect variables
let lastDissolveTime = 0;
let dissolveInterval = 15000; // Dissolve every 15 seconds
let dissolveStrength = 0.95; // How much to fade (0.95 = fade to 95% transparency)

// Pastel color palette
const pastelColors = [
  { r: 255, g: 182, b: 193 }, // Light Pink
  { r: 230, g: 230, b: 250 }, // Lavender  
  { r: 176, g: 224, b: 230 }, // Powder Blue
  { r: 255, g: 218, b: 185 }, // Peach
  { r: 152, g: 251, b: 152 }, // Pale Green
  { r: 255, g: 253, b: 208 }, // Lemon Chiffon
  { r: 221, g: 160, b: 221 }, // Plum
  { r: 255, g: 192, b: 203 }, // Pink
  { r: 177, g: 156, b: 217 }, // Light Purple
  { r: 174, g: 198, b: 207 }, // Light Blue Gray
  { r: 255, g: 229, b: 180 }, // Light Apricot
  { r: 198, g: 255, b: 221 }, // Mint
];

let selectedColor;
let bgCanvas;

function setup() {
  // Select random pastel color on load
  selectedColor = pastelColors[Math.floor(Math.random() * pastelColors.length)];
  
  // Create canvas and attach to background div
  bgCanvas = createCanvas(windowWidth, windowHeight);
  bgCanvas.parent('background-canvas');
  
  // Performance optimization
  pixelDensity(1);
  
  cols = Math.floor(width/size);
  rows = Math.floor(height/size);
  
  // Initialize arrays
  for (let i=0; i<cols; i++) {
    a[i] = [];
    b[i] = [];
    for (let j=0; j<rows; j++) {
      a[i][j] = [1, 1];
      b[i][j] = [0, 0];
    }
  }
  
  // Create initial seed area in center
  let seedSize = 5;
  for (let i=cols/2 - seedSize; i<cols/2 + seedSize; i++) {
    for (let j=rows/2 - seedSize; j<rows/2 + seedSize; j++) {
      if (i >= 0 && i < cols && j >= 0 && j < rows) {
        b[Math.floor(i)][Math.floor(j)][p] = 1;
      }
    }
  }
  
  // Start with some random seeds for more interesting patterns
  for (let n = 0; n < 3; n++) {
    let rx = Math.floor(random(cols));
    let ry = Math.floor(random(rows));
    for (let i=rx-2; i<=rx+2; i++) {
      for (let j=ry-2; j<=ry+2; j++) {
        let x = (i + cols) % cols;
        let y = (j + rows) % rows;
        b[x][y][p] = 1;
      }
    }
  }
}

function draw() {
  // Check if it's time to dissolve
  let currentTime = millis();
  if (currentTime - lastDissolveTime > dissolveInterval) {
    dissolvePattern();
    lastDissolveTime = currentTime;
  }
  
  // Mouse interaction - add reaction points
  if (mouseIsPressed && mouseX > 0 && mouseX < width && mouseY > 0 && mouseY < height) {
    let mx = Math.floor(mouseX / size);
    let my = Math.floor(mouseY / size);
    let r = 5; // Increased from 2 to 5 for larger circles
    
    for (let i=mx-r; i<=mx+r; i++) {
      for (let j=my-r; j<=my+r; j++) {
        let x = (i + cols) % cols;
        let y = (j + rows) % rows;
        if (x >= 0 && x < cols && y >= 0 && y < rows) {
          b[x][y][p] = 1;
        }
      }
    }
  }
  
  // Reaction-diffusion calculation
  for (let i=0; i<cols; i++) {
    for (let j=0; j<rows; j++) {
      let cA = a[i][j][p];
      let cB = b[i][j][p];
      
      let reaction = cA * cB * cB; 
      
      let lapA = laplace(a, i, j);
      let lapB = laplace(b, i, j);
      
      a[i][j][q] = constrain(cA + (dA * lapA - reaction + feed * (1 - cA)), 0, 1);
      b[i][j][q] = constrain(cB + (dB * lapB + reaction - (kill + feed) * cB), 0, 1);
    }
  }
  
  // Render with selected pastel color
  noStroke();
  for (let i=0; i<cols; i++) {
    for (let j=0; j<rows; j++) {
      let val = a[i][j][p];
      
      // Interpolate between white and selected pastel color
      let r = lerp(255, selectedColor.r, 1 - val);
      let g = lerp(255, selectedColor.g, 1 - val);
      let b = lerp(255, selectedColor.b, 1 - val);
      
      fill(r, g, b);
      rect(i*size, j*size, size, size);
    }
  }
  
  // Swap buffers
  [p, q] = [q, p];
}

function laplace(grid, x, y) {
  let sum = 0;
  sum += grid[x][y][p] * -1;
  
  sum += grid[wrapX(x+1)][y][p] * 0.2;
  sum += grid[wrapX(x-1)][y][p] * 0.2;
  sum += grid[x][wrapY(y+1)][p] * 0.2;
  sum += grid[x][wrapY(y-1)][p] * 0.2;
  
  sum += grid[wrapX(x-1)][wrapY(y-1)][p] * 0.05;
  sum += grid[wrapX(x-1)][wrapY(y+1)][p] * 0.05;
  sum += grid[wrapX(x+1)][wrapY(y-1)][p] * 0.05;
  sum += grid[wrapX(x+1)][wrapY(y+1)][p] * 0.05;
  
  return sum;
}

function wrapX(x) {
  return (x + cols) % cols;
}

function wrapY(y) {
  return (y + rows) % rows;
}

// Dissolve pattern gradually
function dissolvePattern() {
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      // Gradually fade the pattern
      a[i][j][p] = lerp(a[i][j][p], 1, 1 - dissolveStrength);
      b[i][j][p] = lerp(b[i][j][p], 0, 1 - dissolveStrength);
      
      a[i][j][q] = a[i][j][p];
      b[i][j][q] = b[i][j][p];
    }
  }
  
  // Add some new random seeds after dissolving
  for (let n = 0; n < 2; n++) {
    let rx = Math.floor(random(cols));
    let ry = Math.floor(random(rows));
    for (let i = rx - 1; i <= rx + 1; i++) {
      for (let j = ry - 1; j <= ry + 1; j++) {
        let x = (i + cols) % cols;
        let y = (j + rows) % rows;
        if (x >= 0 && x < cols && y >= 0 && y < rows) {
          b[x][y][p] = 1;
        }
      }
    }
  }
}

// Handle window resize
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  
  // Recalculate grid dimensions
  let newCols = Math.floor(width/size);
  let newRows = Math.floor(height/size);
  
  // Reinitialize arrays if dimensions changed significantly
  if (Math.abs(newCols - cols) > 5 || Math.abs(newRows - rows) > 5) {
    cols = newCols;
    rows = newRows;
    
    // Reinitialize arrays
    a = [];
    b = [];
    for (let i=0; i<cols; i++) {
      a[i] = [];
      b[i] = [];
      for (let j=0; j<rows; j++) {
        a[i][j] = [1, 1];
        b[i][j] = [0, 0];
      }
    }
    
    // Re-seed
    for (let i=cols/2 - 5; i<cols/2 + 5; i++) {
      for (let j=rows/2 - 5; j<rows/2 + 5; j++) {
        if (i >= 0 && i < cols && j >= 0 && j < rows) {
          b[Math.floor(i)][Math.floor(j)][p] = 1;
        }
      }
    }
    
    // Reset dissolve timer
    lastDissolveTime = millis();
  }
}