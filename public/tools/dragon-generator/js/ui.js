/*
 * Dragon Generator - UI Controls
 * Author: The Boss
 *
 * Handles UI-specific functionality like collapsible sections and control visibility
 */

// Setup collapsible sections
document.addEventListener('DOMContentLoaded', () => {
    // Define all collapsible sections
    const sections = [
        { header: 'element-header', content: 'element-section' },
        { header: 'dragons-header', content: 'dragons-section' },
        { header: 'style-header', content: 'style-section' },
        { header: 'animation-header', content: 'animation-section' },
        { header: 'advanced-header', content: 'advanced-section' },
        { header: 'background-header', content: 'background-section' }
    ];
    
    // Set up each collapsible section
    sections.forEach(({ header, content }) => {
        const headerElement = document.getElementById(header);
        const contentElement = document.getElementById(content);
        
        if (headerElement && contentElement) {
            headerElement.style.cursor = 'pointer';
            
            headerElement.addEventListener('click', () => {
                const isOpen = contentElement.style.display !== 'none';
                contentElement.style.display = isOpen ? 'none' : 'block';
                
                const toggle = headerElement.querySelector('.section-toggle');
                if (toggle) {
                    toggle.textContent = isOpen ? '▶' : '▼';
                }
            });
        }
    });
});
