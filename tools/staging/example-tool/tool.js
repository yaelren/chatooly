class ExampleTool {
    constructor() {
        this.bgColorInput = document.getElementById('bgColor');
        this.textColorInput = document.getElementById('textColor');
        this.textSizeInput = document.getElementById('textSize');
        this.sampleTextInput = document.getElementById('sampleText');
        this.preview = document.getElementById('preview');
        this.previewText = document.getElementById('previewText');
        this.sizeValue = document.getElementById('sizeValue');
        this.exportBtn = document.getElementById('exportBtn');
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.updatePreview();
    }
    
    setupEventListeners() {
        this.bgColorInput.addEventListener('input', () => this.updatePreview());
        this.textColorInput.addEventListener('input', () => this.updatePreview());
        this.textSizeInput.addEventListener('input', () => this.updateTextSize());
        this.sampleTextInput.addEventListener('input', () => this.updatePreview());
        this.exportBtn.addEventListener('click', () => this.exportImage());
    }
    
    updateTextSize() {
        const size = this.textSizeInput.value;
        this.sizeValue.textContent = `${size}px`;
        this.updatePreview();
    }
    
    updatePreview() {
        const bgColor = this.bgColorInput.value;
        const textColor = this.textColorInput.value;
        const fontSize = this.textSizeInput.value;
        const text = this.sampleTextInput.value || 'Hello Chatooly!';
        
        this.preview.style.backgroundColor = bgColor;
        this.previewText.style.color = textColor;
        this.previewText.style.fontSize = `${fontSize}px`;
        this.previewText.textContent = text;
    }
    
    async exportImage() {
        try {
            // Create a canvas to export the design
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Set canvas size
            canvas.width = 800;
            canvas.height = 400;
            
            // Draw background
            ctx.fillStyle = this.bgColorInput.value;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Draw text
            ctx.fillStyle = this.textColorInput.value;
            ctx.font = `${this.textSizeInput.value}px Arial, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            const text = this.sampleTextInput.value || 'Hello Chatooly!';
            ctx.fillText(text, canvas.width / 2, canvas.height / 2);
            
            // Convert to blob and download
            canvas.toBlob((blob) => {
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = 'chatooly-export.png';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            }, 'image/png');
            
        } catch (error) {
            console.error('Export failed:', error);
            alert('Export failed. Please try again.');
        }
    }
}

// Initialize the tool when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new ExampleTool();
});