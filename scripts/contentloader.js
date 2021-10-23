var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { ImageBeforeAfterComparisor } from "./image-before-after-comparisor.js";
class ContentLoader {
    constructor(a_itemsId, a_contentDetailId) {
        this.listRoot = null;
        this.items = [];
        this.fetchedContents = [];
        this.imageComparisor = new ImageBeforeAfterComparisor();
        this.selectedItem = null;
        // Content-detail elements
        this.detailRoot = null;
        this.detailArrow = null;
        this.detailLoadingElement = null;
        this.detailContent = null;
        this.detailRoot = document.getElementById(a_contentDetailId);
        this.detailArrow = this.detailRoot.querySelector(".arrow");
        this.detailLoadingElement = this.detailRoot.querySelector(".loading");
        this.detailContent = this.detailRoot.querySelector(".detail-content");
        this.listRoot = document.getElementById(a_itemsId);
        var liElements = this.listRoot.querySelectorAll(".item");
        for (let i = 0; i < liElements.length; ++i) {
            this.initItemElement(liElements.item(i));
        }
        ContentLoader.MarginBottomPerItem = parseInt(getComputedStyle(this.items[0].element).marginBottom, 10);
        this.detailRoot.parentElement.removeChild(this.detailRoot);
        this.randomTopBarColor();
        // Since the height is manually calculated we need to recalculate it on a resize event
        window.addEventListener("resize", () => {
            if (this.selectedItem) {
                this.setContentHeight();
                // Also need to update the arrow position because it has a fixed left value in pixels.
                this.positionArrow();
            }
        });
    }
    /**
     * Init each .item element and create the contentItem
     * @param {HTMLDivElement} a_itemElement
     */
    initItemElement(a_itemElement) {
        const itemIndex = this.items.length;
        const rowIndex = ~~(itemIndex / ContentLoader.ItemsPerRow);
        let item = {
            element: a_itemElement,
            url: "",
            row: rowIndex
        };
        this.items.push(item);
        // 1. Remove project-links so the the onclick doesnt take them to the other projects
        let projectLinks = a_itemElement.querySelectorAll(".project-link");
        for (let i = 0; i < projectLinks.length; ++i) {
            let projectLinkElement = projectLinks.item(i);
            if (projectLinkElement.querySelector("img") !== null) {
                item.url = projectLinkElement.href;
                // Disable left mouse click but you can still middle mouse to open in a new tab
                projectLinkElement.addEventListener("click", (event) => {
                    event.preventDefault();
                });
            }
        }
        a_itemElement.addEventListener("click", () => {
            this.onItemClicked(item);
        });
    }
    /**
     * Randomises the color for the 4px bar at the very top of the page!
     */
    randomTopBarColor() {
        let topbarElement = document.querySelector(".top-bar");
        const colors = ["#badbad", "#d06", "#ca7", "#9766AA"];
        const index = Math.floor(Math.random() * Math.floor(colors.length));
        const selectedColor = colors[index];
        topbarElement.style.backgroundColor = selectedColor;
    }
    /**
     * Position the ^ arrow in the center of the currently selected item
     */
    positionArrow() {
        let element = this.selectedItem.element;
        // Position the arrow
        const centerX = element.offsetLeft + ((element.clientWidth) * 0.5);
        const x = (centerX - (this.detailArrow.clientWidth * 0.5));
        this.detailArrow.style.transform = `translate3d(${x}px, 0, 0)`;
    }
    /**
     * Add the .detail-container element to the correct row
     */
    addDetailElement() {
        const nextRowItem = this.getFirstItemForRow(this.selectedItem.row + 1);
        if (nextRowItem) {
            this.listRoot.insertBefore(this.detailRoot, nextRowItem.element);
        }
        // If nextRowItem is null then we just append it to the root element
        else {
            this.listRoot.appendChild(this.detailRoot);
        }
    }
    /**
     * Create a dummy <div> that will have the same height as the .detail-container element
     * The element will replace the detail-container and then have its height set to 0 so that it animates to 0
     */
    addDummyElement() {
        // Make sure the .detail-container is attached to an element
        if (this.detailRoot.parentElement) {
            let dummyElement = document.createElement("div");
            dummyElement.style.height = this.detailRoot.style.height;
            dummyElement.className = "dummy-detail";
            this.detailRoot.parentElement.replaceChild(dummyElement, this.detailRoot);
            setTimeout(() => {
                dummyElement.style.height = "0";
            }, 1);
            // Remove the dummyElement
            setTimeout(function () {
                dummyElement.parentElement.removeChild(dummyElement);
            }, ContentLoader.HeightTransitionLength);
        }
    }
    /**
     * Clear the .detail-content html.
     * Otherwise for example if you change item the html of the old item would still be visible while loading.
     */
    clearContent() {
        this.detailContent.innerHTML = "";
    }
    /**
     * Hide the content for the selected item by setting height to 0, clearing content and hiding loading image.
     */
    hideContent() {
        if (this.selectedItem) {
            this.selectedItem = null;
            this.detailRoot.style.height = "0";
            this.clearContent();
            this.detailLoadingElement.classList.add("hide");
        }
    }
    /**
     * Manually set the height of the .detail-container to correctly trigger the css-transition animation
     */
    setContentHeight() {
        const arrowContainerHeight = this.getElementHeight(this.detailArrow.parentElement);
        // loadingHeight will be 0 unless it's visible
        const loadingHeight = this.getElementHeight(this.detailLoadingElement);
        // If loadingHeight is 0 then set contentHeight as 0 to disregard padding
        const contentHeight = loadingHeight <= 0 ? this.getElementHeight(this.detailContent) : 0;
        const totalHeight = arrowContainerHeight + loadingHeight + contentHeight;
        this.detailRoot.style.height = totalHeight + "px";
    }
    /**
     * Get clientHeight + margin
     * @param {HTMLElement} a_element
     * @return {number}
     */
    getElementHeight(a_element) {
        let height = a_element.clientHeight;
        const calculatedStyle = getComputedStyle(a_element);
        height += parseInt(calculatedStyle.marginTop, 10);
        height += parseInt(calculatedStyle.marginBottom, 10);
        height += parseInt(calculatedStyle.borderTopWidth, 10);
        height += parseInt(calculatedStyle.borderBottomWidth, 10);
        return height;
    }
    /**
     * Show the content for a content item.
     * The reason for passing in the contentItem is to make sure that it's the selected one by the time the ajax request finished.
     * @param {ContentItem} contentItem
     * @param {string} content
     */
    showContent(contentItem, content) {
        // Do this check to make sure contentItem == current content item
        if (contentItem && this.selectedItem === contentItem) {
            this.detailContent.innerHTML = content;
            let iframes = this.detailContent.querySelectorAll("iframe");
            iframes.forEach((node) => {
                let iframeDoc = node.contentDocument || node.contentWindow.document;
                // Only add onload for an unfinished iframe.
                if (iframeDoc.readyState === "complete") {
                    return;
                }
                let onload = () => {
                    if (contentItem !== this.selectedItem) {
                        return;
                    }
                    this.setContentHeight();
                };
                node.addEventListener("load", onload, { once: true });
            });
            this.detailLoadingElement.classList.add("hide");
            this.processContent(contentItem, this.detailContent);
            this.setContentHeight();
        }
    }
    processContent(contentItem, rootElement) {
        this.imageComparisor.clearEvents();
        this.imageComparisor.tryAddImageComparison(rootElement).then(() => {
            if (contentItem !== this.selectedItem) {
                return;
            }
            this.setContentHeight();
        });
    }
    /**
     * Show the loading gif and update the content height
     */
    showLoading() {
        this.detailLoadingElement.classList.remove("hide");
        this.setContentHeight();
    }
    /**
     * Get the first content item for a row number.
     * Which is row * items per row!
     * @param {number} a_row
     * @return {ContentItem}
     */
    getFirstItemForRow(a_row) {
        return this.items[a_row * ContentLoader.ItemsPerRow] || null;
    }
    /**
     * When the .item element is clicked by a user
     * @param {ContentItem} a_contentItem
     * @return {Promise<void>}
     */
    onItemClicked(a_contentItem) {
        return __awaiter(this, void 0, void 0, function* () {
            const oldItem = this.selectedItem;
            const isDifferentItem = this.selectedItem !== a_contentItem;
            // If the item was a different one then show content for that item
            if (isDifferentItem) {
                this.selectedItem = a_contentItem;
                const url = a_contentItem.url;
                this.clearContent();
                if (oldItem) {
                    // If the two rows aren't the same then create a dummy element with same height and then set that height to 0!
                    if (oldItem.row !== this.selectedItem.row) {
                        // Create dummy element with same height
                        // This also removes the detailRoot from the DOM
                        this.addDummyElement();
                        // While the detailRoot is gone from the DOM set height to 0 to not trigger animation
                        this.detailRoot.style.height = "0";
                        this.positionArrow();
                        // This adds the detailRoot back to the DOM
                        this.addDetailElement();
                    }
                }
                else {
                    this.addDetailElement();
                }
                this.positionArrow();
                // If content hasn't been fetched yet then show loading screen
                if (!this.fetchedContents[url]) {
                    this.showLoading();
                }
                try {
                    const content = yield this.fetchContent(url, a_contentItem);
                    // Show the item
                    this.showContent(a_contentItem, content);
                }
                catch (err) {
                    this.showContent(a_contentItem, 'Something went wrong loading content');
                }
            }
            else {
                // Hide the item first
                this.hideContent();
            }
        });
    }
    /**
     * Fetch and parse the HTML from a url for a content item.
     * @param {string} a_url
     * @param {ContentItem} a_contentItem
     * @return {Promise<string>}
     */
    fetchContent(a_url, a_contentItem) {
        if (this.fetchedContents[a_url]) {
            return this.fetchedContents[a_url];
        }
        let promise = new Promise(res => {
            let xhr = new XMLHttpRequest();
            xhr.onload = (event) => {
                const htmlDocument = xhr.responseXML;
                let itemContent = htmlDocument.querySelector(".item-content");
                let backButtons = itemContent.querySelectorAll(".back-index-button");
                // Remove the back buttons since they aren't very useful for the dynamic item viewing
                for (let i = 0; i < backButtons.length; ++i) {
                    let backButton = backButtons.item(i);
                    backButton.parentElement.removeChild(backButton);
                }
                const htmlText = itemContent.parentElement.innerHTML;
                res(htmlText);
            };
            xhr.onerror = (event) => {
                const itemUrl = a_contentItem.url;
                const errorHtml = "<p>Something went wrong loading the portfolio item. \
                                        <br> \
                                        Link to the portfolio item: <a href='" + itemUrl + "'>" + itemUrl + "</a> \
                                    </p>";
                res(errorHtml);
            };
            xhr.responseType = 'document';
            xhr.open("GET", a_url, true);
            xhr.setRequestHeader('Content-type', 'text/html');
            xhr.send();
        });
        this.fetchedContents[a_url] = promise;
        return promise;
    }
}
ContentLoader.ItemsPerRow = 3;
ContentLoader.HeightTransitionLength = 250;
// Set in constructor by getting computedStyle for the first content item
ContentLoader.MarginBottomPerItem = -1;
document.addEventListener("DOMContentLoaded", () => {
    let contentLoader = new ContentLoader("index_items", "detail_container");
});
//# sourceMappingURL=contentloader.js.map