/**
 * Header initialization script
 */

// Import the StudioVideoHeader class
import { StudioVideoHeader } from './studio-video-header.js';

// Initialize the animated header when the page loads
document.addEventListener('DOMContentLoaded', function() {
    // Initialize the studio video header directly
    console.log('Initializing Studio Video Header...');
    
    const studioHeader = new StudioVideoHeader('animated-header');
    
    // Listen for frame changes to update UI
    document.addEventListener('frameChanged', function(event) {
        const frameInfo = document.getElementById('frame-info');
        const currentFrameSpan = document.getElementById('current-frame');
        const totalFramesSpan = document.getElementById('total-frames');
        
        if (frameInfo && currentFrameSpan && totalFramesSpan) {
            currentFrameSpan.textContent = event.detail.currentFrame;
            totalFramesSpan.textContent = event.detail.totalFrames;
            frameInfo.style.display = 'block';
        }
    });
    
    // Load the FBX file
    studioHeader.loadFBX('assets/studio_video.fbx')
        .then(() => {
            console.log('FBX model loaded and ready for animation');
        })
        .catch(error => {
            console.error('Failed to load FBX model:', error);
            // Show fallback message
            const animatedHeader = document.getElementById('animated-header');
            if (animatedHeader) {
                animatedHeader.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #666; font-family: monospace;">FBX Model Loading...</div>';
            }
        });
    
    // Make the header instance globally available for debugging
    window.studioHeader = studioHeader;
});