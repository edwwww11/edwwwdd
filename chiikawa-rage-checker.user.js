// ==UserScript==
// @name         Chiikawa Market Storage Checker (Auto Check)
// @description  Automatically check the storage of products in Chiikawa market.
// @icon         https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://chiikawamarket.jp&size=64
// @match        https://chiikawamarket.jp/products/*
// @match        https://chiikawamarket.jp/collections/*/products/*
// @match        https://chiikawamarket.jp/cart
// @match        https://nagano-market.jp/products/*
// @match        https://nagano-market.jp/*/products/*
// @match        https://nagano-market.jp/*/collections/*/products/*
// @match        https://nagano-market.jp/*/cart
// @match        https://chiikawamogumogu.shop/products/*
// @match        https://chiikawamogumogu.shop/collections/*/products/*
// @match        https://chiikawamogumogu.shop/cart
// @match        https://chiikawamogumogu.shop/*/cart
// @grant        none
// ==/UserScript==

const MAX_QUANTITY = 1000000;

(async function () {
    "use strict";

    const getCart = async () => {
        const res = await fetch("/cart.js", {
            headers: {
                accept: "*/*",
            },
        });
        const data = await res.json();
        return data?.items;
    };

    const addItem = async (id, productId, quantity) => {
        const res = await fetch("/cart/add.js", {
            headers: {
                accept: "application/javascript",
                "content-type": "multipart/form-data; boundary=----WebKitFormBoundary788zedotmtSec399",
                "x-requested-with": "XMLHttpRequest",
            },
            method: "POST",
            body: `------WebKitFormBoundary788zedotmtSec399\r\nContent-Disposition: form-data; name="form_type"\r\n\r\nproduct\r\n------WebKitFormBoundary788zedotmtSec399\r\nContent-Disposition: form-data; name="utf8"\r\n\r\n✓\r\n------WebKitFormBoundary788zedotmtSec399\r\nContent-Disposition: form-data; name="id"\r\n\r\n${id}\r\n------WebKitFormBoundary788zedotmtSec399\r\nContent-Disposition: form-data; name="quantity"\r\n\r\n${quantity}\r\n------WebKitFormBoundary788zedotmtSec399\r\nContent-Disposition: form-data; name="product-id"\r\n\r\n${productId}\r\n------WebKitFormBoundary788zedotmtSec399\r\nContent-Disposition: form-data; name="section-id"\r\n\r\ntemplate--18391309091057__main\r\n------WebKitFormBoundary788zedotmtSec399--\r\n`,
        });
        return res.status;
    };

    const getItem = async (id) => {
        const items = await getCart();
        const item = items?.find((e) => e?.id == id);
        return item ? item.quantity : -1;
    };

    const removeItem = async (id) => {
        const items = await getCart();
        const index = items?.findIndex((e) => e?.id == id);
        if (index >= 0) {
            await fetch("/cart/change.js", {
                headers: {
                    accept: "*/*",
                    "content-type": "application/json",
                },
                method: "POST",
                body: `{"line":${index + 1},"quantity":0}`,
            });
            return items[index]?.quantity ?? 0;
        }
        return 0;
    };

    const check = async (id, productId, currentQuantity, fn) => {
        await removeItem(id);
        await addItem(id, productId, MAX_QUANTITY);
        const quantity = await getItem(id);
        fn(quantity >= 0 ? `✅ ${quantity}` : "🙁");
        await removeItem(id);
        if (currentQuantity) {
            try {
                await addItem(id, productId, currentQuantity);
            } catch {}
        }
    };

    const checkCart = async () => {
        let currentItems;
        try {
            currentItems = await getCart();
        } catch {}
        if (!currentItems) {
            return;
        }

        const items = document.getElementsByClassName("cart--item");
        for (let i = 0; i < items.length / 2; i++) {
            const label1 = items[i].getElementsByClassName("cart--item--title")?.[0]?.children?.[0]?.children?.[0];
            const label2 = items[i + items.length / 2].getElementsByClassName("cart--item--title")?.[0]?.children?.[0]?.children?.[0];
            if (!label1 || !label2) {
                continue;
            }
            const text1 = label1.textContent;
            const text2 = label2.textContent;
            const id = items[i].getAttribute("data-variant-id");
            if (!id) {
                continue;
            }
            const productId = currentItems.find((e) => e?.id == id)?.product_id;
            if (!productId) {
                continue;
            }
            let currentQuantity = currentItems.find((e) => e?.id == id)?.quantity ?? 0;
            label1.textContent = `${text1} (🔄)`;
            label2.textContent = `${text2} (🔄)`;
            await check(id, productId, currentQuantity, (t) => {
                label1.textContent = `${text1} (${t})`;
                label2.textContent = `${text2} (${t})`;
            });
        }
    };

    const checkProduct = async () => {
        let label = document.getElementsByClassName("product-page--title")?.[0];
        if (!label) {
            label = document.getElementsByClassName("product__title")?.[0]?.children?.[0];
        }
        if (!label) {
            return;
        }
        const text = label.textContent;
        const productId = document.querySelector('input[name="product-id"]')?.getAttribute("value");
        let id = document.getElementsByClassName("product-form--variant-select")?.[0]?.children?.[0]?.getAttribute("value");
        if (!id) {
            id = document.getElementsByClassName("product__pickup-availabilities")?.[0]?.getAttribute("data-variant-id");
        }
        if (!productId || !id) {
            return;
        }

        let currentQuantity = 0;
        try {
            currentQuantity = await removeItem(id);
        } catch {}

        label.textContent = `${text} (🔄)`;
        await check(id, productId, currentQuantity, (t) => {
            label.textContent = `${text} (${t})`;
        });
    };

    const autoCheckInventory = async () => {
        if (document.location.pathname.endsWith("/cart")) {
            checkCart();
        } else {
            checkProduct();
        }
    };

    autoCheckInventory();
})();