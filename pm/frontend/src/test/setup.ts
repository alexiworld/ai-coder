import "@testing-library/jest-dom";

// Polyfill for jsdom
if (typeof Element !== "undefined" && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

if (typeof HTMLInputElement !== "undefined" && !HTMLInputElement.prototype.focus) {
  HTMLInputElement.prototype.focus = () => {};
}