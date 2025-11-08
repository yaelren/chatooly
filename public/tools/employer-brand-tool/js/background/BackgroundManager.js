/**
 * BackgroundManager.js - Centralized background management system
 * Handles global background color, image, and fit modes
 */

class BackgroundManager {
    constructor() {
        this.backgroundColor = '#ffffff';
        this.backgroundImage = null;
        this.backgroundImageDataURL = null;
        this.backgroundVideo = null;
        this.backgroundVideoDataURL = null;
        this.backgroundGif = null; // Canvas for GIF animation
        this.backgroundGifUrl = null; // URL for GIF
        this.backgroundFitMode = 'fill-canvas'; // 'stretch-canvas' | 'fit-canvas' | 'fill-canvas' | 'stretch-padding' | 'fit-padding' | 'fill-padding'
        this.padding = { top: 0, bottom: 0, left: 0, right: 0 };
    }
    
    /**
     * Set the global background color
     * @param {string} color - Hex color string (#ffffff)
     */
    setBackgroundColor(color) {
        this.backgroundColor = color;
    }
    
    /**
     * Set the background image
     * @param {File|HTMLImageElement} image - Image file or element
     * @param {Function} onLoadCallback - Callback when image is loaded
     */
    setBackgroundImage(image, onLoadCallback = null) {
        if (image instanceof File) {
            // Convert file to data URL
            const reader = new FileReader();
            reader.onload = (e) => {
                this.backgroundImageDataURL = e.target.result;
                this.backgroundImage = new Image();
                this.backgroundImage.onload = () => {
                    // Image loaded successfully - trigger callback if provided
                    if (onLoadCallback) {
                        onLoadCallback();
                    }
                };
                this.backgroundImage.src = this.backgroundImageDataURL;
            };
            reader.readAsDataURL(image);
        } else if (image instanceof HTMLImageElement) {
            this.backgroundImage = image;
            this.backgroundImageDataURL = null;
            if (onLoadCallback) {
                onLoadCallback();
            }
        }
    }
    
    /**
     * Set the background GIF using gifler library
     * @param {string} gifUrl - URL of the GIF file
     * @param {Function} onLoadCallback - Callback when GIF is loaded
     */
    setBackgroundGif(gifUrl, onLoadCallback = null) {
        if (typeof gifler === 'undefined') {
            console.error('❌ gifler library not loaded');
            return;
        }

        // Clear any existing GIF
        this.clearBackgroundGif();

        this.backgroundGifUrl = gifUrl;

        // First, load the GIF as an image to get its dimensions
        const img = new Image();
        img.crossOrigin = 'anonymous';

        img.onload = () => {
            // Create a canvas with the GIF's natural dimensions
            this.backgroundGif = document.createElement('canvas');
            this.backgroundGif.width = img.naturalWidth;
            this.backgroundGif.height = img.naturalHeight;

            try {
                let firstFrameRendered = false;
                gifler(gifUrl).frames(this.backgroundGif, (ctx, frame) => {
                    // CRITICAL: Must draw the frame buffer to canvas!
                    ctx.drawImage(frame.buffer, frame.x, frame.y);

                    // On first frame, trigger callback
                    if (!firstFrameRendered) {
                        firstFrameRendered = true;
                        console.log(`✅ Background GIF loaded: ${this.backgroundGif.width}x${this.backgroundGif.height}`);
                        if (onLoadCallback) {
                            onLoadCallback();
                        }
                    }
                });
            } catch (error) {
                console.error('❌ Error setting background GIF with gifler:', error);
                this.clearBackgroundGif();
            }
        };

        img.onerror = (error) => {
            console.error('❌ Failed to load GIF image for dimensions:', error);
            this.clearBackgroundGif();
        };

        img.src = gifUrl;
    }

    /**
     * Set the background video
     * @param {File|HTMLVideoElement} video - Video file or element
     * @param {Function} onLoadCallback - Callback when video is loaded
     */
    setBackgroundVideo(video, onLoadCallback = null) {
        if (video instanceof File) {
            // Convert file to data URL
            const reader = new FileReader();
            reader.onload = (e) => {
                this.backgroundVideoDataURL = e.target.result;
                this.backgroundVideo = document.createElement('video');
                this.backgroundVideo.preload = 'metadata';
                this.backgroundVideo.crossOrigin = 'anonymous';
                this.backgroundVideo.autoplay = true;
                this.backgroundVideo.loop = true;
                this.backgroundVideo.muted = true;
                this.backgroundVideo.controls = false;
                
                this.backgroundVideo.addEventListener('loadedmetadata', () => {
                    // Video loaded successfully - trigger callback if provided
                    if (onLoadCallback) {
                        onLoadCallback();
                    }
                });
                
                this.backgroundVideo.src = this.backgroundVideoDataURL;
            };
            reader.readAsDataURL(video);
        } else if (video instanceof HTMLVideoElement) {
            this.backgroundVideo = video;
            this.backgroundVideoDataURL = null;
            if (onLoadCallback) {
                onLoadCallback();
            }
        }
    }
    
    /**
     * Set the background fit mode
     * @param {string} mode - 'stretch-canvas' | 'fit-canvas' | 'fill-canvas' | 'stretch-padding' | 'fit-padding' | 'fill-padding'
     */
    setBackgroundFitMode(mode) {
        this.backgroundFitMode = mode;
    }
    
    /**
     * Set canvas padding for fit-within-padding mode
     * @param {Object} padding - {top, bottom, left, right}
     */
    setPadding(padding) {
        this.padding = { ...padding };
    }
    
    /**
     * Clear the background image
     */
    clearBackgroundImage() {
        this.backgroundImage = null;
        this.backgroundImageDataURL = null;
    }
    
    /**
     * Clear the background video
     */
    clearBackgroundVideo() {
        if (this.backgroundVideo) {
            this.backgroundVideo.pause();
            this.backgroundVideo.src = '';
        }
        this.backgroundVideo = null;
        this.backgroundVideoDataURL = null;
    }

    /**
     * Clear the background GIF
     */
    clearBackgroundGif() {
        if (this.backgroundGif) {
            // Remove the canvas from DOM if attached
            if (this.backgroundGif.parentNode) {
                this.backgroundGif.parentNode.removeChild(this.backgroundGif);
            }
            this.backgroundGif = null;
        }
        this.backgroundGifUrl = null;
    }

    /**
     * Clear all background media (image, video, and GIF)
     */
    clearBackgroundMedia() {
        this.clearBackgroundImage();
        this.clearBackgroundVideo();
        this.clearBackgroundGif();
    }
    
    /**
     * Render the background (color + optional image/video/GIF)
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {HTMLCanvasElement} canvas - Canvas element
     */
    renderBackground(ctx, canvas) {
        // Clear the canvas first
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Render background color (fills entire canvas)
        ctx.fillStyle = this.backgroundColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Priority: Video > GIF > Static Image
        if (this.backgroundVideo) {
            this.renderBackgroundVideo(ctx, canvas);
        } else if (this.backgroundGif) {
            this.renderBackgroundGif(ctx, canvas);
        } else if (this.backgroundImage) {
            // Render background image if no video or GIF
            this.renderBackgroundImage(ctx, canvas);
        }
    }
    
    /**
     * Render background video with proper fit mode
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {HTMLCanvasElement} canvas - Canvas element
     * @private
     */
    renderBackgroundVideo(ctx, canvas) {
        if (!this.backgroundVideo || this.backgroundVideo.readyState < HTMLMediaElement.HAVE_METADATA) {
            return;
        }
        
        ctx.save();
        
        if (this.backgroundFitMode === 'stretch-canvas') {
            this.renderVideoStretchCanvas(ctx, canvas);
        } else if (this.backgroundFitMode === 'fit-canvas') {
            this.renderVideoFitCanvas(ctx, canvas);
        } else if (this.backgroundFitMode === 'fill-canvas') {
            this.renderVideoFillCanvas(ctx, canvas);
        } else if (this.backgroundFitMode === 'stretch-padding') {
            this.renderVideoStretchPadding(ctx, canvas);
        } else if (this.backgroundFitMode === 'fit-padding') {
            this.renderVideoFitPadding(ctx, canvas);
        } else if (this.backgroundFitMode === 'fill-padding') {
            this.renderVideoFillPadding(ctx, canvas);
        }
        
        ctx.restore();
    }
    
    /**
     * Render background GIF with proper fit mode (using gifler canvas)
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {HTMLCanvasElement} canvas - Canvas element
     * @private
     */
    renderBackgroundGif(ctx, canvas) {
        if (!this.backgroundGif || !this.backgroundGif.width || !this.backgroundGif.height) return;

        ctx.save();

        // Treat the GIF canvas as an image source
        if (this.backgroundFitMode === 'stretch-canvas') {
            ctx.drawImage(this.backgroundGif, 0, 0, canvas.width, canvas.height);
        } else if (this.backgroundFitMode === 'fit-canvas') {
            this.renderGifFitCanvas(ctx, canvas);
        } else if (this.backgroundFitMode === 'fill-canvas') {
            this.renderGifFillCanvas(ctx, canvas);
        } else if (this.backgroundFitMode === 'stretch-padding') {
            this.renderGifStretchPadding(ctx, canvas);
        } else if (this.backgroundFitMode === 'fit-padding') {
            this.renderGifFitPadding(ctx, canvas);
        } else if (this.backgroundFitMode === 'fill-padding') {
            this.renderGifFillPadding(ctx, canvas);
        }

        ctx.restore();
    }

    /**
     * Render background image with proper fit mode
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {HTMLCanvasElement} canvas - Canvas element
     * @private
     */
    renderBackgroundImage(ctx, canvas) {
        if (!this.backgroundImage) return;

        ctx.save();

        if (this.backgroundFitMode === 'stretch-canvas') {
            this.renderImageStretchCanvas(ctx, canvas);
        } else if (this.backgroundFitMode === 'fit-canvas') {
            this.renderImageFitCanvas(ctx, canvas);
        } else if (this.backgroundFitMode === 'fill-canvas') {
            this.renderImageFillCanvas(ctx, canvas);
        } else if (this.backgroundFitMode === 'stretch-padding') {
            this.renderImageStretchPadding(ctx, canvas);
        } else if (this.backgroundFitMode === 'fit-padding') {
            this.renderImageFitPadding(ctx, canvas);
        } else if (this.backgroundFitMode === 'fill-padding') {
            this.renderImageFillPadding(ctx, canvas);
        }

        ctx.restore();
    }
    
    /**
     * Render image stretched to fill entire canvas
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {HTMLCanvasElement} canvas - Canvas element
     * @private
     */
    renderImageStretchCanvas(ctx, canvas) {
        // Stretch image to fill entire canvas (may distort aspect ratio)
        ctx.drawImage(this.backgroundImage, 0, 0, canvas.width, canvas.height);
    }
    
    /**
     * Render image fitted to entire canvas (maintain aspect ratio)
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {HTMLCanvasElement} canvas - Canvas element
     * @private
     */
    renderImageFitCanvas(ctx, canvas) {
        // Calculate scale to fit image within canvas while maintaining aspect ratio
        const scaleX = canvas.width / this.backgroundImage.width;
        const scaleY = canvas.height / this.backgroundImage.height;
        const scale = Math.min(scaleX, scaleY);
        
        const scaledWidth = this.backgroundImage.width * scale;
        const scaledHeight = this.backgroundImage.height * scale;
        
        // Center the image
        const x = (canvas.width - scaledWidth) / 2;
        const y = (canvas.height - scaledHeight) / 2;
        
        ctx.drawImage(this.backgroundImage, x, y, scaledWidth, scaledHeight);
    }
    
    /**
     * Render image stretched to fill padding area
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {HTMLCanvasElement} canvas - Canvas element
     * @private
     */
    renderImageStretchPadding(ctx, canvas) {
        const availableWidth = canvas.width - this.padding.left - this.padding.right;
        const availableHeight = canvas.height - this.padding.top - this.padding.bottom;
        
        if (availableWidth <= 0 || availableHeight <= 0) return;
        
        // Stretch image to fill the available area (may distort aspect ratio)
        ctx.drawImage(
            this.backgroundImage,
            this.padding.left,
            this.padding.top,
            availableWidth,
            availableHeight
        );
    }
    
    /**
     * Render image fitted to padding area (maintain aspect ratio)
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {HTMLCanvasElement} canvas - Canvas element
     * @private
     */
    renderImageFitPadding(ctx, canvas) {
        const availableWidth = canvas.width - this.padding.left - this.padding.right;
        const availableHeight = canvas.height - this.padding.top - this.padding.bottom;
        
        if (availableWidth <= 0 || availableHeight <= 0) return;
        
        // Calculate scale to fit image within available area while maintaining aspect ratio
        const scaleX = availableWidth / this.backgroundImage.width;
        const scaleY = availableHeight / this.backgroundImage.height;
        const scale = Math.min(scaleX, scaleY);
        
        const scaledWidth = this.backgroundImage.width * scale;
        const scaledHeight = this.backgroundImage.height * scale;
        
        // Center the image within the available area
        const x = this.padding.left + (availableWidth - scaledWidth) / 2;
        const y = this.padding.top + (availableHeight - scaledHeight) / 2;
        
        ctx.drawImage(this.backgroundImage, x, y, scaledWidth, scaledHeight);
    }
    
    /**
     * Render image filled to padding area (crop to fit)
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {HTMLCanvasElement} canvas - Canvas element
     * @private
     */
    renderImageFillPadding(ctx, canvas) {
        const availableWidth = canvas.width - this.padding.left - this.padding.right;
        const availableHeight = canvas.height - this.padding.top - this.padding.bottom;
        
        if (availableWidth <= 0 || availableHeight <= 0) return;
        
        // Calculate scale to fill available area while maintaining aspect ratio (may crop)
        const scaleX = availableWidth / this.backgroundImage.width;
        const scaleY = availableHeight / this.backgroundImage.height;
        const scale = Math.max(scaleX, scaleY);
        
        const scaledWidth = this.backgroundImage.width * scale;
        const scaledHeight = this.backgroundImage.height * scale;
        
        // Calculate source rectangle for cropping (center crop)
        // Convert scaled coordinates back to original image coordinates
        const sourceX = (scaledWidth - availableWidth) / 2 / scale;
        const sourceY = (scaledHeight - availableHeight) / 2 / scale;
        const sourceWidth = availableWidth / scale;
        const sourceHeight = availableHeight / scale;
        
        // Draw the cropped image to fill the exact padding area
        ctx.drawImage(
            this.backgroundImage,
            sourceX, sourceY, sourceWidth, sourceHeight,  // source rectangle (in original image space)
            this.padding.left, this.padding.top, availableWidth, availableHeight  // destination rectangle
        );
    }
    
    /**
     * Render image to fill entire canvas
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {HTMLCanvasElement} canvas - Canvas element
     * @private
     */
    renderImageFillCanvas(ctx, canvas) {
        // Calculate scale to fill canvas while maintaining aspect ratio
        const scaleX = canvas.width / this.backgroundImage.width;
        const scaleY = canvas.height / this.backgroundImage.height;
        const scale = Math.max(scaleX, scaleY);
        
        const scaledWidth = this.backgroundImage.width * scale;
        const scaledHeight = this.backgroundImage.height * scale;
        
        // Center the image
        const x = (canvas.width - scaledWidth) / 2;
        const y = (canvas.height - scaledHeight) / 2;
        
        ctx.drawImage(this.backgroundImage, x, y, scaledWidth, scaledHeight);
    }
    
    /**
     * Render video stretched to fill entire canvas
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {HTMLCanvasElement} canvas - Canvas element
     * @private
     */
    renderVideoStretchCanvas(ctx, canvas) {
        // Stretch video to fill entire canvas (may distort aspect ratio)
        ctx.drawImage(this.backgroundVideo, 0, 0, canvas.width, canvas.height);
    }
    
    /**
     * Render video fitted to entire canvas (maintain aspect ratio)
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {HTMLCanvasElement} canvas - Canvas element
     * @private
     */
    renderVideoFitCanvas(ctx, canvas) {
        // Calculate scale to fit video within canvas while maintaining aspect ratio
        const scaleX = canvas.width / this.backgroundVideo.videoWidth;
        const scaleY = canvas.height / this.backgroundVideo.videoHeight;
        const scale = Math.min(scaleX, scaleY);
        
        const scaledWidth = this.backgroundVideo.videoWidth * scale;
        const scaledHeight = this.backgroundVideo.videoHeight * scale;
        
        // Center the video
        const x = (canvas.width - scaledWidth) / 2;
        const y = (canvas.height - scaledHeight) / 2;
        
        ctx.drawImage(this.backgroundVideo, x, y, scaledWidth, scaledHeight);
    }
    
    /**
     * Render video stretched to fill padding area
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {HTMLCanvasElement} canvas - Canvas element
     * @private
     */
    renderVideoStretchPadding(ctx, canvas) {
        const availableWidth = canvas.width - this.padding.left - this.padding.right;
        const availableHeight = canvas.height - this.padding.top - this.padding.bottom;
        
        if (availableWidth <= 0 || availableHeight <= 0) return;
        
        // Stretch video to fill the available area (may distort aspect ratio)
        ctx.drawImage(
            this.backgroundVideo,
            this.padding.left,
            this.padding.top,
            availableWidth,
            availableHeight
        );
    }
    
    /**
     * Render video fitted to padding area (maintain aspect ratio)
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {HTMLCanvasElement} canvas - Canvas element
     * @private
     */
    renderVideoFitPadding(ctx, canvas) {
        const availableWidth = canvas.width - this.padding.left - this.padding.right;
        const availableHeight = canvas.height - this.padding.top - this.padding.bottom;
        
        if (availableWidth <= 0 || availableHeight <= 0) return;
        
        // Calculate scale to fit video within available area while maintaining aspect ratio
        const scaleX = availableWidth / this.backgroundVideo.videoWidth;
        const scaleY = availableHeight / this.backgroundVideo.videoHeight;
        const scale = Math.min(scaleX, scaleY);
        
        const scaledWidth = this.backgroundVideo.videoWidth * scale;
        const scaledHeight = this.backgroundVideo.videoHeight * scale;
        
        // Center the video within the available area
        const x = this.padding.left + (availableWidth - scaledWidth) / 2;
        const y = this.padding.top + (availableHeight - scaledHeight) / 2;
        
        ctx.drawImage(this.backgroundVideo, x, y, scaledWidth, scaledHeight);
    }
    
    /**
     * Render video filled to padding area (crop to fit)
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {HTMLCanvasElement} canvas - Canvas element
     * @private
     */
    renderVideoFillPadding(ctx, canvas) {
        const availableWidth = canvas.width - this.padding.left - this.padding.right;
        const availableHeight = canvas.height - this.padding.top - this.padding.bottom;
        
        if (availableWidth <= 0 || availableHeight <= 0) return;
        
        // Calculate scale to fill available area while maintaining aspect ratio (may crop)
        const scaleX = availableWidth / this.backgroundVideo.videoWidth;
        const scaleY = availableHeight / this.backgroundVideo.videoHeight;
        const scale = Math.max(scaleX, scaleY);
        
        const scaledWidth = this.backgroundVideo.videoWidth * scale;
        const scaledHeight = this.backgroundVideo.videoHeight * scale;
        
        // Calculate source rectangle for cropping (center crop)
        // Convert scaled coordinates back to original video coordinates
        const sourceX = (scaledWidth - availableWidth) / 2 / scale;
        const sourceY = (scaledHeight - availableHeight) / 2 / scale;
        const sourceWidth = availableWidth / scale;
        const sourceHeight = availableHeight / scale;
        
        // Draw the cropped video to fill the exact padding area
        ctx.drawImage(
            this.backgroundVideo,
            sourceX, sourceY, sourceWidth, sourceHeight,  // source rectangle (in original video space)
            this.padding.left, this.padding.top, availableWidth, availableHeight  // destination rectangle
        );
    }
    
    /**
     * Render video to fill entire canvas
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {HTMLCanvasElement} canvas - Canvas element
     * @private
     */
    renderVideoFillCanvas(ctx, canvas) {
        // Calculate scale to fill canvas while maintaining aspect ratio
        const scaleX = canvas.width / this.backgroundVideo.videoWidth;
        const scaleY = canvas.height / this.backgroundVideo.videoHeight;
        const scale = Math.max(scaleX, scaleY);
        
        const scaledWidth = this.backgroundVideo.videoWidth * scale;
        const scaledHeight = this.backgroundVideo.videoHeight * scale;
        
        // Center the video
        const x = (canvas.width - scaledWidth) / 2;
        const y = (canvas.height - scaledHeight) / 2;
        
        ctx.drawImage(this.backgroundVideo, x, y, scaledWidth, scaledHeight);
    }
    
    /**
     * GIF rendering helpers - same logic as image/video but using GIF canvas
     */
    renderGifFitCanvas(ctx, canvas) {
        const scaleX = canvas.width / this.backgroundGif.width;
        const scaleY = canvas.height / this.backgroundGif.height;
        const scale = Math.min(scaleX, scaleY);

        const scaledWidth = this.backgroundGif.width * scale;
        const scaledHeight = this.backgroundGif.height * scale;

        const x = (canvas.width - scaledWidth) / 2;
        const y = (canvas.height - scaledHeight) / 2;

        ctx.drawImage(this.backgroundGif, x, y, scaledWidth, scaledHeight);
    }

    renderGifFillCanvas(ctx, canvas) {
        const scaleX = canvas.width / this.backgroundGif.width;
        const scaleY = canvas.height / this.backgroundGif.height;
        const scale = Math.max(scaleX, scaleY);

        const scaledWidth = this.backgroundGif.width * scale;
        const scaledHeight = this.backgroundGif.height * scale;

        const x = (canvas.width - scaledWidth) / 2;
        const y = (canvas.height - scaledHeight) / 2;

        ctx.drawImage(this.backgroundGif, x, y, scaledWidth, scaledHeight);
    }

    renderGifStretchPadding(ctx, canvas) {
        const availableWidth = canvas.width - this.padding.left - this.padding.right;
        const availableHeight = canvas.height - this.padding.top - this.padding.bottom;

        if (availableWidth <= 0 || availableHeight <= 0) return;

        ctx.drawImage(
            this.backgroundGif,
            this.padding.left,
            this.padding.top,
            availableWidth,
            availableHeight
        );
    }

    renderGifFitPadding(ctx, canvas) {
        const availableWidth = canvas.width - this.padding.left - this.padding.right;
        const availableHeight = canvas.height - this.padding.top - this.padding.bottom;

        if (availableWidth <= 0 || availableHeight <= 0) return;

        const scaleX = availableWidth / this.backgroundGif.width;
        const scaleY = availableHeight / this.backgroundGif.height;
        const scale = Math.min(scaleX, scaleY);

        const scaledWidth = this.backgroundGif.width * scale;
        const scaledHeight = this.backgroundGif.height * scale;

        const x = this.padding.left + (availableWidth - scaledWidth) / 2;
        const y = this.padding.top + (availableHeight - scaledHeight) / 2;

        ctx.drawImage(this.backgroundGif, x, y, scaledWidth, scaledHeight);
    }

    renderGifFillPadding(ctx, canvas) {
        const availableWidth = canvas.width - this.padding.left - this.padding.right;
        const availableHeight = canvas.height - this.padding.top - this.padding.bottom;

        if (availableWidth <= 0 || availableHeight <= 0) return;

        const scaleX = availableWidth / this.backgroundGif.width;
        const scaleY = availableHeight / this.backgroundGif.height;
        const scale = Math.max(scaleX, scaleY);

        const scaledWidth = this.backgroundGif.width * scale;
        const scaledHeight = this.backgroundGif.height * scale;

        const sourceX = (scaledWidth - availableWidth) / 2 / scale;
        const sourceY = (scaledHeight - availableHeight) / 2 / scale;
        const sourceWidth = availableWidth / scale;
        const sourceHeight = availableHeight / scale;

        ctx.drawImage(
            this.backgroundGif,
            sourceX, sourceY, sourceWidth, sourceHeight,
            this.padding.left, this.padding.top, availableWidth, availableHeight
        );
    }

    /**
     * Get current background information
     * @returns {Object} Background info object
     */
    getBackgroundInfo() {
        return {
            backgroundColor: this.backgroundColor,
            hasImage: !!this.backgroundImage,
            hasVideo: !!this.backgroundVideo,
            hasGif: !!this.backgroundGif,
            fitMode: this.backgroundFitMode,
            padding: { ...this.padding }
        };
    }
    
    /**
     * Check if background image is loaded
     * @returns {boolean} True if image is loaded and ready
     */
    isImageLoaded() {
        return this.backgroundImage && this.backgroundImage.complete;
    }
    
    /**
     * Check if background video is loaded
     * @returns {boolean} True if video is loaded and ready
     */
    isVideoLoaded() {
        return this.backgroundVideo && this.backgroundVideo.readyState >= HTMLMediaElement.HAVE_METADATA;
    }
}
