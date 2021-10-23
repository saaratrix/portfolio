interface Listener {
    type: string;
    listener: EventListenerOrEventListenerObject;
}

// ^.^ It was a lot more time consuming writing a before & after component than I thought!
// This class has become a bit of spaghetti now.
export class ImageBeforeAfterComparisor {
    private addedListeners: Listener[] = [];

    /**
     * We need a promise
     * @param rootElement
     */
    public tryAddImageComparison(rootElement: HTMLElement): Promise<void> {
        const comparisonElements = rootElement.querySelectorAll<HTMLElement>('.image-comparison');
        if (comparisonElements.length === 0) {
            return Promise.resolve();
        }

        let promise = new Promise<void>(async (res, rej) => {
            let loadPromises: Promise<void>[] = [];
            for (let i = 0; i < comparisonElements.length; i++) {
                loadPromises.push(this.addImageComparison(comparisonElements[i]));
            }

            await Promise.all(loadPromises);
            res();
        });
        return promise;
    }

    public clearEvents(): void {
        for (const listener of this.addedListeners) {
            window.removeEventListener(listener.type, listener.listener);
        }
        this.addedListeners = [];
    }

    private addImageComparison(comparisonElement: HTMLElement): Promise<void> {
        const beforeElement = comparisonElement.querySelector<HTMLElement>('.image-comparison-before');
        const afterElement = comparisonElement.querySelector<HTMLElement>('.image-comparison-after');

        const beforeImage = beforeElement?.querySelector<HTMLImageElement>('img');
        const afterImage = afterElement?.querySelector<HTMLImageElement>('img');

        const sliderElement = comparisonElement.querySelector<HTMLElement>('.image-comparison-slider');
        const sliderHandleElement = sliderElement?.querySelector<HTMLElement>('.image-comparison-slider-handle');
        if (!beforeElement || !afterElement || !beforeElement || !beforeImage || !afterImage || !sliderElement || !sliderHandleElement) {
            return Promise.resolve();
        }

        // Prevent ghost images when dragging.
        beforeImage.draggable = false;
        afterImage.draggable = false;

        comparisonElement.classList.add('image-comparison-loaded');
        // Hide the descriptions as they aren't needed with javascript.
        const descriptions = comparisonElement.querySelectorAll<HTMLElement>('.image-comparison-description');
        descriptions.forEach(element => element.style.display = 'none');

        this.initSlider(sliderElement, sliderHandleElement, comparisonElement, beforeElement, afterElement);

        const promises: Promise<void>[] = [
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
        }
        this.addedListeners.push({ type: 'resize', listener: onResize });
        window.addEventListener('resize', onResize);

        return Promise.all(promises).then(() => {
            this.updateHeight(beforeElement, afterElement);
        });
    }

    private updateHeight(beforeElement: HTMLElement, afterElement: HTMLElement): void {
        // Remove any heights to be able to get proper heights (could technically use aspect ratio instead)
        beforeElement.style.height = '';
        afterElement.style.height = '';
        // Set the same height of the container divs
        const height = Math.min(beforeElement.offsetHeight, afterElement.offsetHeight);
        beforeElement.style.height = height + 'px';
        afterElement.style.height = height + 'px';
    }

    private addImageLoadEvent(image: HTMLImageElement): Promise<void> {
        if (image.complete && image.naturalHeight !== 0) {
            return Promise.resolve();
        }

        let promise = new Promise<void>((res, rej) => {
            image.addEventListener('load', () => {
                res();
            });
            image.addEventListener('error', () => {
                res();
            });
        });
        return promise;
    }

    private initSlider(sliderElement: HTMLElement, sliderHandleElement: HTMLElement, comparisonElement: HTMLElement, beforeElement: HTMLElement, afterElement: HTMLElement): void {
        sliderElement.style.display = '';

        let isPointerDown: boolean = false;
        let pointerDownOffset: number = 0;
        sliderHandleElement.addEventListener('pointerdown', (event) => {
            isPointerDown = true;
            const handleBounds = sliderHandleElement.getBoundingClientRect();
            pointerDownOffset = (event.clientX - handleBounds.left) - (handleBounds.width / 2);
        });

        const pointerMove = (event: PointerEvent) => {
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

        const pointerUp = (): void => {
            isPointerDown = false;
        }

        window.addEventListener('pointermove', pointerMove);
        window.addEventListener('pointerup', pointerUp);
        this.addedListeners.push({ type: 'pointermove', listener: pointerMove });
        this.addedListeners.push({ type: 'pointerup', listener: pointerUp });
    }

    private setClipPath(offsetX: number, element: HTMLElement): void {
        element.style.clipPath = `polygon(${offsetX}% 0%,100% 0%,100% 100%,${offsetX}% 100%)`;
    }
}
