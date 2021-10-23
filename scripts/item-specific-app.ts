import { ImageBeforeAfterComparisor } from "./image-before-after-comparisor.js";

document.addEventListener("DOMContentLoaded", async () => {
    const contentElement = document.querySelector<HTMLElement>('.content');

    if (!contentElement) {
        return;
    }

    let contentLoader = new ImageBeforeAfterComparisor();
    await contentLoader.tryAddImageComparison(contentElement);
});
