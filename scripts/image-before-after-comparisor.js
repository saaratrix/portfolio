var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
// ^.^ It was a lot more time consuming writing a before & after component than I thought!
// This class has become a bit of spaghetti now.
export class ImageBeforeAfterComparisor {
    constructor() {
        this.addedListeners = [];
    }
    /**
     * We need a promise
     * @param rootElement
     */
    tryAddImageComparison(rootElement) {
        const comparisonElements = rootElement.querySelectorAll('.image-comparison');
        if (comparisonElements.length === 0) {
            return Promise.resolve();
        }
        let promise = new Promise((res, rej) => __awaiter(this, void 0, void 0, function* () {
            let loadPromises = [];
            for (let i = 0; i < comparisonElements.length; i++) {
                loadPromises.push(this.addImageComparison(comparisonElements[i]));
            }
            yield Promise.all(loadPromises);
            res();
        }));
        return promise;
    }
    clearEvents() {
        for (const listener of this.addedListeners) {
            window.removeEventListener(listener.type, listener.listener);
        }
        this.addedListeners = [];
    }
    addImageComparison(comparisonElement) {
        const beforeElement = comparisonElement.querySelector('.image-comparison-before');
        const afterElement = comparisonElement.querySelector('.image-comparison-after');
        const beforeImage = beforeElement === null || beforeElement === void 0 ? void 0 : beforeElement.querySelector('img');
        const afterImage = afterElement === null || afterElement === void 0 ? void 0 : afterElement.querySelector('img');
        const sliderElement = comparisonElement.querySelector('.image-comparison-slider');
        const sliderHandleElement = sliderElement === null || sliderElement === void 0 ? void 0 : sliderElement.querySelector('.image-comparison-slider-handle');
        if (!beforeElement || !afterElement || !beforeElement || !beforeImage || !afterImage || !sliderElement || !sliderHandleElement) {
            return Promise.resolve();
        }
        // Prevent ghost images when dragging.
        beforeImage.draggable = false;
        afterImage.draggable = false;
        comparisonElement.classList.add('image-comparison-loaded');
        this.initSlider(sliderElement, sliderHandleElement, comparisonElement, beforeElement, afterElement);
        const promises = [
            this.addImageLoadEvent(beforeImage),
            this.addImageLoadEvent(afterImage),
        ];
        // We use left instead of transform because left is dependant on the parent and transform is dependant on the current element.
        // And since sliderElement is only ~30px width we can't use translateX(50%).
        // And using % is much nicer than pixels because of window onresize events etc.
        sliderElement.style.left = "50%";
        this.setClipPath(50, afterElement);
        const onResize = () => {
            this.updateHeight(beforeElement, afterElement);
        };
        this.addedListeners.push({ type: 'resize', listener: onResize });
        window.addEventListener('resize', onResize);
        return Promise.all(promises).then(() => {
            this.updateHeight(beforeElement, afterElement);
        });
    }
    updateHeight(beforeElement, afterElement) {
        // Remove any heights to be able to get proper heights (could technically use aspect ratio instead)
        beforeElement.style.height = '';
        afterElement.style.height = '';
        // Set the same height of the container divs
        const height = Math.min(beforeElement.offsetHeight, afterElement.offsetHeight);
        beforeElement.style.height = height + 'px';
        afterElement.style.height = height + 'px';
    }
    addImageLoadEvent(image) {
        if (image.complete && image.naturalHeight !== 0) {
            return Promise.resolve();
        }
        let promise = new Promise((res, rej) => {
            image.addEventListener('load', () => {
                res();
            });
            image.addEventListener('error', () => {
                res();
            });
        });
        return promise;
    }
    initSlider(sliderElement, sliderHandleElement, comparisonElement, beforeElement, afterElement) {
        sliderElement.style.display = '';
        let isPointerDown = false;
        let pointerDownOffset = 0;
        sliderHandleElement.addEventListener('pointerdown', (event) => {
            isPointerDown = true;
            const handleBounds = sliderHandleElement.getBoundingClientRect();
            pointerDownOffset = (event.clientX - handleBounds.left) - (handleBounds.width / 2);
            comparisonElement.classList.add('is-dragging');
        });
        const pointerMove = (event) => {
            if (!isPointerDown) {
                return;
            }
            const bounds = comparisonElement.getBoundingClientRect();
            let x = event.clientX - bounds.left - pointerDownOffset;
            // const min = (0 - sliderElement.offsetWidth / 2);
            // const max = bounds.width - sliderElement.offsetWidth / 2;
            const min = 0;
            const max = bounds.width;
            x = Math.max(Math.min(x, max), min);
            const offsetPercentage = (x / max) * 100;
            sliderElement.style.left = `${offsetPercentage}%`;
            // Move the range back from 0 -> max
            // const offsetPercentage = ((x - min) / (max - min)) * 100;
            this.setClipPath(offsetPercentage, afterElement);
        };
        const pointerUp = () => {
            isPointerDown = false;
            comparisonElement.classList.remove('is-dragging');
        };
        window.addEventListener('pointermove', pointerMove);
        window.addEventListener('pointerup', pointerUp);
        this.addedListeners.push({ type: 'pointermove', listener: pointerMove });
        this.addedListeners.push({ type: 'pointerup', listener: pointerUp });
    }
    setClipPath(offsetX, element) {
        element.style.clipPath = `polygon(${offsetX}% 0%,100% 0%,100% 100%,${offsetX}% 100%)`;
    }
}
//# sourceMappingURL=image-before-after-comparisor.js.map