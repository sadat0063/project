// File: modules/animation-manager.js
// ============================================================

class AnimationManager {
    constructor() {
        this.animations = new Map();
        this.defaultDuration = 300;
    }

    fadeIn(element, duration = this.defaultDuration) {
        return new Promise((resolve) => {
            element.style.opacity = '0';
            element.style.display = 'block';
            
            const startTime = performance.now();
            
            const animate = (currentTime) => {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                element.style.opacity = progress;
                
                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    resolve();
                }
            };
            
            requestAnimationFrame(animate);
        });
    }

    fadeOut(element, duration = this.defaultDuration) {
        return new Promise((resolve) => {
            const startTime = performance.now();
            
            const animate = (currentTime) => {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                element.style.opacity = 1 - progress;
                
                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    element.style.display = 'none';
                    resolve();
                }
            };
            
            requestAnimationFrame(animate);
        });
    }

    slideDown(element, duration = this.defaultDuration) {
        return new Promise((resolve) => {
            element.style.maxHeight = '0';
            element.style.overflow = 'hidden';
            element.style.display = 'block';
            
            const fullHeight = element.scrollHeight + 'px';
            const startTime = performance.now();
            
            const animate = (currentTime) => {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                element.style.maxHeight = `calc(${fullHeight} * ${progress})`;
                
                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    element.style.maxHeight = 'none';
                    resolve();
                }
            };
            
            requestAnimationFrame(animate);
        });
    }

    slideUp(element, duration = this.defaultDuration) {
        return new Promise((resolve) => {
            const fullHeight = element.scrollHeight + 'px';
            const startTime = performance.now();
            
            element.style.maxHeight = fullHeight;
            element.style.overflow = 'hidden';
            
            const animate = (currentTime) => {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                element.style.maxHeight = `calc(${fullHeight} * ${1 - progress})`;
                
                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    element.style.display = 'none';
                    element.style.maxHeight = 'none';
                    resolve();
                }
            };
            
            requestAnimationFrame(animate);
        });
    }

    pulse(element, duration = 1000) {
        return new Promise((resolve) => {
            const startTime = performance.now();
            const originalScale = element.style.transform;
            
            const animate = (currentTime) => {
                const elapsed = currentTime - startTime;
                const progress = (elapsed % duration) / duration;
                const scale = 1 + 0.1 * Math.sin(progress * Math.PI * 2);
                
                element.style.transform = `${originalScale} scale(${scale})`;
                
                if (elapsed < duration) {
                    requestAnimationFrame(animate);
                } else {
                    element.style.transform = originalScale;
                    resolve();
                }
            };
            
            requestAnimationFrame(animate);
        });
    }

    shake(element, intensity = 10) {
        return new Promise((resolve) => {
            const startTime = performance.now();
            const duration = 500;
            const originalTransform = element.style.transform;
            
            const animate = (currentTime) => {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                if (progress < 1) {
                    const shakeX = Math.sin(progress * 20) * intensity * (1 - progress);
                    element.style.transform = `${originalTransform} translateX(${shakeX}px)`;
                    requestAnimationFrame(animate);
                } else {
                    element.style.transform = originalTransform;
                    resolve();
                }
            };
            
            requestAnimationFrame(animate);
        });
    }

    // Progress bar animation
    animateProgressBar(progressBar, from, to, duration = 1000) {
        return new Promise((resolve) => {
            const startTime = performance.now();
            
            const animate = (currentTime) => {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                const currentValue = from + (to - from) * progress;
                progressBar.style.width = currentValue + '%';
                progressBar.setAttribute('data-progress', Math.round(currentValue));
                
                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    resolve();
                }
            };
            
            requestAnimationFrame(animate);
        });
    }

    // Stagger animations for multiple elements
    staggerAnimation(elements, animationFn, delay = 100) {
        const promises = [];
        
        elements.forEach((element, index) => {
            promises.push(
                new Promise(resolve => {
                    setTimeout(() => {
                        animationFn(element).then(resolve);
                    }, index * delay);
                })
            );
        });
        
        return Promise.all(promises);
    }

    // Cancel ongoing animations
    cancelAnimations(element) {
        if (this.animations.has(element)) {
            this.animations.get(element).forEach(cancel => cancel());
            this.animations.delete(element);
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AnimationManager;
}