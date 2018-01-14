interface ContentItem {
    element: HTMLDivElement,
    url: string,
    row: number
}

class ContentLoader
{
    public static readonly ItemsPerRow: number = 3;
    public static MarginBottomPerItem: number = -1;
    public static HeightTransitionLength: number = 1000;

    private m_listRoot: HTMLDivElement = null;
    private m_items: ContentItem[] = [];

    private m_fetchedContents: Promise<string>[] = [];

    private m_selectedItem: ContentItem = null;

    // Content-detail elements
    private m_detailRoot: HTMLDivElement = null;
    private m_detailArrow: HTMLDivElement = null;
    private m_detailLoadingElement: HTMLDivElement = null;
    private m_detailContent: HTMLDivElement = null;

    constructor(a_itemsId: string, a_contentDetailId: string) {
        this.m_detailRoot = document.getElementById(a_contentDetailId) as HTMLDivElement;
        this.m_detailArrow = this.m_detailRoot.querySelector(".arrow");
        this.m_detailLoadingElement = this.m_detailRoot.querySelector(".loading");
        this.m_detailContent = this.m_detailRoot.querySelector(".detail-content");

        this.m_listRoot = document.getElementById(a_itemsId) as HTMLDivElement;

        var liElements: NodeList = this.m_listRoot.querySelectorAll(".item");
        for (let i = 0; i < liElements.length; ++i) {
            this.initItemElement(liElements.item(i) as HTMLDivElement );
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

    private initItemElement(a_itemElement: HTMLDivElement) {
        const itemIndex: number = this.m_items.length;
        const rowIndex = ~~(itemIndex / ContentLoader.ItemsPerRow);

        let item : ContentItem = {
            element: a_itemElement,
            url: "",
            row: rowIndex
        };
        this.m_items.push(item);

        // 1. Remove project-links so the the onclick doesnt take them to the other projects
        let projectLinks = a_itemElement.querySelectorAll(".project-link");
        for (let i = 0; i < projectLinks.length; ++i) {
            let projectLinkElement = projectLinks.item(i) as HTMLAnchorElement;
            if (projectLinkElement.querySelector("img") !== null) {
                item.url = projectLinkElement.href;
                // Disable left mouse click but you can still middle mouse to open in a new tab
                projectLinkElement.addEventListener("click", (event: Event) => {
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
    private positionArrow () {
        let element: HTMLDivElement = this.m_selectedItem.element;

        // Position the arrow
        const centerX = element.offsetLeft + (( element.clientWidth ) * 0.5);
        this.m_detailArrow.style.left = (centerX - (this.m_detailArrow.clientWidth * 0.5)) + "px";
    }

    /**
     * Add the .detail-container element to the correct row
     */
    private addDetailElement () {
        const nextRowItem =  this.getFirstItemForRow(this.m_selectedItem.row + 1);

        if (nextRowItem) {
            this.m_listRoot.insertBefore(this.m_detailRoot, nextRowItem.element);
        }
        // If nextRowItem is null then we just append it to the root element
        else {
            this.m_listRoot.appendChild(this.m_detailRoot);
        }
    }

    /**
     * Create a dummy <div> that will have the same height as the .detail-container element
     * The element will replace the detail-container and then have its height set to 0 so that it animates to 0
     */
    private addDummyElement () {
        // Make sure the .detail-container is attached to an element
        if (this.m_detailRoot.parentElement) {
            let dummyElement: HTMLDivElement = document.createElement("div");
            dummyElement.style.height = this.m_detailRoot.style.height;
            dummyElement.className = "dummy-detail";

            this.m_detailRoot.parentElement.replaceChild(dummyElement, this.m_detailRoot);

            setTimeout(() => {
                dummyElement.style.height = "0";
            }, 1);
            // Remove the dummyElement
            setTimeout( function() {
                dummyElement.parentElement.removeChild(dummyElement);
            }, ContentLoader.HeightTransitionLength);
        }
    }

    /**
     * Clear the .detail-content html.
     * Otherwise for example if you change item the html of the old item would still be visible while loading.
     */
    private clearContent () {
        this.m_detailContent.innerHTML = "";
    }

    /**
     * Hide the content for the selected item by setting height to 0, clearing content and hiding loading image.
     */
    private hideContent () {
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
    private setContentHeight () {
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
    private getElementHeight (a_element: HTMLElement): number {
        let height: number = a_element.clientHeight;
        const calculatedStyle: CSSStyleDeclaration = getComputedStyle(a_element);

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
    private showContent (a_contentItem: ContentItem, a_content: string) {
        // Do this check to make sure contentItem == current content item
        if (a_contentItem && this.m_selectedItem === a_contentItem) {
            this.m_detailContent.innerHTML = a_content;

            this.m_detailLoadingElement.classList.add("hide");

            this.setContentHeight();
        }
    }

    private showLoading() {
        this.m_detailLoadingElement.classList.remove("hide");
        this.setContentHeight();
    }

    private getFirstItemForRow(a_row: number) : ContentItem {
        return this.m_items[a_row * ContentLoader.ItemsPerRow] || null;
    }

    private async onItemClicked (a_contentItem: ContentItem) {
        const oldItem = this.m_selectedItem;
        const isDifferentItem: boolean = this.m_selectedItem !== a_contentItem;

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
            } else {
                this.addDetailElement();
            }


            this.positionArrow();

            // If content hasn't been fetched yet then show loading screen
            if (!this.m_fetchedContents[url]) {
                this.showLoading();
            }

            try {
                const content = await this.fetchContent(url);
                // Show the item
                this.showContent(a_contentItem, content);
            } catch (err) {
                this.showContent(a_contentItem, 'Something went wrong loading content');
            }
        }
        else {
            // Hide the item first
            this.hideContent();
        }
    }

    private fetchContent(a_url: string): Promise<string> {
        if (this.m_fetchedContents[a_url]) {
            return this.m_fetchedContents[a_url];
        }

        let promise = new Promise<string>(res => {
            setTimeout(() => {
                res("Hello!");
            }, 1000);
        });

        this.m_fetchedContents[a_url] = promise;
        return promise;
    }
}

document.addEventListener("DOMContentLoaded", () => {
    let contentLoader = new ContentLoader("index_items", "detail_container");
});