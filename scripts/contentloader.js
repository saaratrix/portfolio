var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
class ContentLoader {
    constructor(a_itemsId, a_contentDetailId) {
        this.m_listRoot = null;
        this.m_items = [];
        this.m_fetchedContents = [];
        this.m_selectedItem = null;
        // Content-detail elements
        this.m_detailRoot = null;
        this.m_detailArrow = null;
        this.m_detailLoadingElement = null;
        this.m_detailContent = null;
        this.m_detailRoot = document.getElementById(a_contentDetailId);
        this.m_detailArrow = this.m_detailRoot.querySelector(".arrow");
        this.m_detailLoadingElement = this.m_detailRoot.querySelector(".loading");
        this.m_detailContent = this.m_detailRoot.querySelector(".detail-content");
        this.m_listRoot = document.getElementById(a_itemsId);
        var liElements = this.m_listRoot.querySelectorAll(".item");
        for (let i = 0; i < liElements.length; ++i) {
            this.initItemElement(liElements.item(i));
        }
        ContentLoader.MarginBottomPerItem = parseInt(getComputedStyle(this.m_items[0].element).marginBottom, 10);
        this.m_detailRoot.parentElement.removeChild(this.m_detailRoot);
        // Since the height is manually calculated we need to recalculate it on a resize event
        window.addEventListener("resize", () => {
            if (this.m_selectedItem) {
                this.setContentHeight();
                // Also need to update the arrow position because it has a fixed left value in pixels.
                this.positionArrow();
            }
        });
    }
    initItemElement(a_itemElement) {
        const itemIndex = this.m_items.length;
        const rowIndex = ~~(itemIndex / ContentLoader.ItemsPerRow);
        let item = {
            element: a_itemElement,
            url: "",
            row: rowIndex
        };
        this.m_items.push(item);
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
     * Position the ^ arrow in the center of the currently selected item
     */
    positionArrow() {
        let element = this.m_selectedItem.element;
        // Position the arrow
        const centerX = element.offsetLeft + ((element.clientWidth) * 0.5);
        this.m_detailArrow.style.left = (centerX - (this.m_detailArrow.clientWidth * 0.5)) + "px";
    }
    /**
     * Add the .detail-container element to the correct row
     */
    addDetailElement() {
        const nextRowItem = this.getFirstItemForRow(this.m_selectedItem.row + 1);
        if (nextRowItem) {
            this.m_listRoot.insertBefore(this.m_detailRoot, nextRowItem.element);
        }
        else {
            this.m_listRoot.appendChild(this.m_detailRoot);
        }
    }
    /**
     * Create a dummy <div> that will have the same height as the .detail-container element
     * The element will replace the detail-container and then have its height set to 0 so that it animates to 0
     */
    addDummyElement() {
        // Make sure the .detail-container is attached to an element
        if (this.m_detailRoot.parentElement) {
            let dummyElement = document.createElement("div");
            dummyElement.style.height = this.m_detailRoot.style.height;
            dummyElement.className = "dummy-detail";
            this.m_detailRoot.parentElement.replaceChild(dummyElement, this.m_detailRoot);
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
        this.m_detailContent.innerHTML = "";
    }
    /**
     * Hide the content for the selected item by setting height to 0, clearing content and hiding loading image.
     */
    hideContent() {
        if (this.m_selectedItem) {
            this.m_selectedItem = null;
            this.m_detailRoot.style.height = "0";
            this.clearContent();
            this.m_detailLoadingElement.classList.add("hide");
        }
    }
    /**
     * Manually set the height of the .detail-container to correctly trigger the css-transition animation
     */
    setContentHeight() {
        const arrowContainerHeight = this.getElementHeight(this.m_detailArrow.parentElement);
        // loadingHeight will be 0 unless it's visible
        const loadingHeight = this.getElementHeight(this.m_detailLoadingElement);
        // If loadingHeight is 0 then set contentHeight as 0 to disregard padding
        const contentHeight = loadingHeight <= 0 ? this.getElementHeight(this.m_detailContent) : 0;
        const totalHeight = arrowContainerHeight + loadingHeight + contentHeight;
        this.m_detailRoot.style.height = totalHeight + "px";
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
        return height;
    }
    /**
     * Show the content for a content item.
     * The reason for passing in the contentItem is to make sure that it's the selected one by the time the ajax request finished.
     * @param {ContentItem} a_contentItem
     * @param {string} a_content
     */
    showContent(a_contentItem, a_content) {
        // Do this check to make sure contentItem == current content item
        if (a_contentItem && this.m_selectedItem === a_contentItem) {
            this.m_detailContent.innerHTML = a_content;
            this.m_detailLoadingElement.classList.add("hide");
            this.setContentHeight();
        }
    }
    showLoading() {
        this.m_detailLoadingElement.classList.remove("hide");
        this.setContentHeight();
    }
    getFirstItemForRow(a_row) {
        return this.m_items[a_row * ContentLoader.ItemsPerRow] || null;
    }
    onItemClicked(a_contentItem) {
        return __awaiter(this, void 0, void 0, function* () {
            const oldItem = this.m_selectedItem;
            const isDifferentItem = this.m_selectedItem !== a_contentItem;
            // If the item was a different one then show content for that item
            if (isDifferentItem) {
                this.m_selectedItem = a_contentItem;
                const url = a_contentItem.url;
                this.clearContent();
                if (oldItem) {
                    // If the two rows aren't the same then create a dummy element with same height and then set that height to 0!
                    if (oldItem.row !== this.m_selectedItem.row) {
                        // Create dummy element with same height
                        // This also removes the detailRoot from the DOM
                        this.addDummyElement();
                        // While the detailRoot is gone from the DOM set height to 0 to not trigger animation
                        this.m_detailRoot.style.height = "0";
                        // This adds the detailRoot back to the DOM
                        this.addDetailElement();
                    }
                }
                else {
                    this.addDetailElement();
                }
                this.positionArrow();
                // If content hasn't been fetched yet then show loading screen
                if (!this.m_fetchedContents[url]) {
                    this.showLoading();
                }
                try {
                    const content = yield this.fetchContent(url);
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
    fetchContent(a_url) {
        if (this.m_fetchedContents[a_url]) {
            return this.m_fetchedContents[a_url];
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
                console.log("error", event);
            };
            xhr.responseType = 'document';
            xhr.open("GET", a_url, true);
            xhr.setRequestHeader('Content-type', 'text/html');
            xhr.send();
        });
        this.m_fetchedContents[a_url] = promise;
        return promise;
    }
}
ContentLoader.ItemsPerRow = 3;
ContentLoader.MarginBottomPerItem = -1;
ContentLoader.HeightTransitionLength = 250;
document.addEventListener("DOMContentLoaded", () => {
    let contentLoader = new ContentLoader("index_items", "detail_container");
});
//# sourceMappingURL=contentloader.js.map