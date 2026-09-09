/*
The following singular file is a modified version of the following code: 
https://github.com/joske2865/AMQ-Scripts/raw/master/common/amqWindows.js

The following code is licensed under the MIT License. See more:
https://github.com/joske2865/AMQ-Scripts/blob/master/LICENSE
*/

// AMQ Window Script
// This code is fetched automatically
// Do not attempt to add it to tampermonkey

if (typeof Listener === "undefined") return;
windowSetup();

function T(name, prefix = "") {
    return prefix + "leoWindows_" + name
}

class _BaseWindow {
    static get defaults() {
        return {
            width: 200,
            height: 300,
            position: { x: 0, y: 0 }
        };
    }

    get defaults() {
        return this.constructor.defaults;
    }

    constructor(data) {
        this._elem = $("<div></div>")
            .addClass(data.class === undefined ? "" : data.class)
        this._options = {}
        this.id = data.id === undefined ? "" : data.id;
        this.width = data.width === undefined ? this.defaults.width : data.width;
        this.height = data.height === undefined ? this.defaults.height : data.height;
        this.position = data.position;
        this.panels = [];
    }

    get id() { return this._options.id }

    set id(newId) {
        this._options.id = newId;
        this._elem.attr("id", this.id);
    }

    get height() { return this._options.height }
    set height(value) {
        let newHeight = value;
        if (typeof value === "string") {
            this._elem.css("height", newHeight);

        }
        else if (parseFloat(value) >= 0.0 && parseFloat(value) <= 1.0) {
            newHeight = (parseFloat(value) * 100) + "%";
            this._elem.css("height", newHeight);
        }
        else { this._elem.height(value); }
        this._options.height = newHeight;
    }

    get width() { return this._options.width }
    set width(value) {
        let newWidth = value;
        if (typeof value === "string") { this._elem.css("width", newWidth); }
        else if (parseFloat(value) >= 0.0 && parseFloat(value) <= 1.0) {
            newWidth = (parseFloat(value) * 100) + "%";
            this._elem.css("width", newWidth);
        }
        else { this._elem.width(value) }
        this._options.width = newWidth;
    };

    get position() { return this._options.position }
    set position(newValue) {
        if (this._options.position === undefined)
            this._options.position = this.defaults.position

        if (newValue === undefined) {
            this._elem.css("position", "inherit");
            this._options.position = this.defaults.position;
            return;
        }
        else if (typeof newValue === "string") {
            this._elem.css("position", newValue)
            return;
        }

        else {
            if (newValue.x !== undefined) this.position.x = newValue.x;
            if (newValue.y !== undefined) this.position.y = newValue.y;
        }

        this._elem.css("position", "absolute");

        if (typeof this.position.x === "string") {
            this._elem.css("left", this.position.x);
        }
        else if (parseFloat(this.position.x) >= 0.0 && parseFloat(this.position.x) <= 1.0) {
            this._elem.css("left", (parseFloat(this.position.x) * 100) + "%");
        }
        else {
            this._elem.css("left", parseInt(this.position.x) + "px");
        }

        if (typeof this.position.y === "string") {
            this._elem.css("top", this.position.y);
        }
        else if (parseFloat(this.position.y) >= 0.0 && parseFloat(this.position.y) <= 1.0) {
            this._elem.css("top", (parseFloat(this.position.y) * 100) + "%");
        }
        else {
            this._elem.css("top", parseInt(this.position.y) + "px");
        }
    }

    addClass(newClass) {
        this._elem.addClass(newClass);
    }

    removeClass(removedClass) {
        this._elem.removeClass(removedClass);
    }

    clear() {
        this._elem.children().remove();
    }

    addPanel(data = {}) {
        let newPanel = new AMQWindowPanel(data);
        this.panels.push(newPanel);
        this.body.append(newPanel.panel);
        return newPanel;
    }

    append(elem) {
        return this.body.append(elem);
    }
}

class AMQWindow extends _BaseWindow {
    constructor(data) {
        super(data)
        this._options.title = data.title === undefined ? "Window" : data.title;
        this.resizable = data.resizable === undefined ? false : data.resizable;
        this.draggable = data.draggable === undefined ? false : data.draggable;
        this.minWidth = data.minWidth === undefined ? 200 : data.minWidth;
        this.minHeight = data.minHeight === undefined ? 300 : data.minHeight;
        this.closeHandler = data.closeHandler === undefined ? function () { } : data.closeHandler;
        this.zIndex = data.zIndex === undefined ? 1060 : data.zIndex;
        this.resizers = null;

        this.window.addClass(T("customWindow")).css("position", "absolute")

        this.content = $(`<div class="${T("customWindowContent")}"></div>`);

        this.header = $("<div></div>")
            .addClass(`modal-header ${T("customWindowHeader")}`)
            .addClass(this.draggable === true ? T("draggableWindow") : "")
            .append($(`<div class="close" type="button"><span aria-hidden="true">×</span></div>`)
                .click(() => {
                    this.close(this.closeHandler);
                })
            )
            .append($("<h2></h2>")
                .addClass("modal-title")
                .text(this.title)
            )

        this.body = $(`<div class="modal-body ${T("customWindowBody")}"></div>`)
            .addClass(this.resizable === true ? T("resizableWindow") : "")
            .height(this.height - 45);

        if (this.resizable === true) {
            this.resizers = $(
                `<div class="${T("windowResizers")}">
                    <div class="${T("windowResizer")} top-left"></div>
                    <div class="${T("windowResizer")} top-right"></div>
                    <div class="${T("windowResizer")} bottom-left"></div>
                    <div class="${T("windowResizer")} bottom-right"></div>
                </div>`
            );
        }

        this.content.append(this.header);
        this.content.append(this.body);
        if (this.resizers !== null) {
            this.window.append(this.resizers);
            let tmp = this;
            let startWidth = 0;
            let startHeight = 0;
            let startX = 0;
            let startY = 0;
            let startMouseX = 0;
            let startMouseY = 0;
            this.resizers.find(T("windowResizer", ".")).each(function (index, resizer) {
                $(resizer).mousedown(function (event) {
                    tmp.window.css("user-select", "none");
                    startWidth = tmp.window.width();
                    startHeight = tmp.window.height();
                    startX = tmp.window.position().left;
                    startY = tmp.window.position().top;
                    startMouseX = event.originalEvent.clientX;
                    startMouseY = event.originalEvent.clientY;
                    let curResizer = $(this);
                    $(document.documentElement).mousemove(function (event) {
                        if (curResizer.hasClass("bottom-right")) {
                            let newWidth = startWidth + (event.originalEvent.clientX - startMouseX);
                            let newHeight = startHeight + (event.originalEvent.clientY - startMouseY);
                            if (newWidth > tmp.minWidth) {
                                tmp.window.width(newWidth);
                            }
                            if (newHeight > tmp.minHeight) {
                                tmp.body.height(newHeight - 45);
                                tmp.window.height(newHeight);
                            }
                        }
                        if (curResizer.hasClass("bottom-left")) {
                            let newWidth = startWidth - (event.originalEvent.clientX - startMouseX);
                            let newHeight = startHeight + (event.originalEvent.clientY - startMouseY);
                            let newLeft = startX + (event.originalEvent.clientX - startMouseX);
                            if (newWidth > tmp.minWidth) {
                                tmp.window.width(newWidth);
                                tmp.window.css("left", newLeft + "px");
                            }
                            if (newHeight > tmp.minHeight) {
                                tmp.body.height(newHeight - 45);
                                tmp.window.height(newHeight);
                            }
                        }
                        if (curResizer.hasClass("top-right")) {
                            let newWidth = startWidth + (event.originalEvent.clientX - startMouseX);
                            let newHeight = startHeight - (event.originalEvent.clientY - startMouseY);
                            let newTop = startY + (event.originalEvent.clientY - startMouseY);
                            if (newWidth > tmp.minWidth) {
                                tmp.window.width(newWidth);
                            }
                            if (newHeight > tmp.minHeight) {
                                tmp.window.css("top", newTop + "px");
                                tmp.body.height(newHeight - 45);
                                tmp.window.height(newHeight);
                            }
                        }
                        if (curResizer.hasClass("top-left")) {
                            let newWidth = startWidth - (event.originalEvent.clientX - startMouseX);
                            let newHeight = startHeight - (event.originalEvent.clientY - startMouseY);
                            let newLeft = startX + (event.originalEvent.clientX - startMouseX);
                            let newTop = startY + (event.originalEvent.clientY - startMouseY);
                            if (newWidth > tmp.minWidth) {
                                tmp.window.width(newWidth);
                                tmp.window.css("left", newLeft + "px");
                            }
                            if (newHeight > tmp.minHeight) {
                                tmp.window.css("top", newTop + "px");
                                tmp.body.height(newHeight - 45);
                                tmp.window.height(newHeight);
                            }
                        }
                    });
                    $(document.documentElement).mouseup(function (event) {
                        $(document.documentElement).off("mousemove");
                        $(document.documentElement).off("mouseup");
                        tmp.window.css("user-select", "text");
                    });
                });
            });
        }
        if (this.draggable === true) {
            this.window.draggable({
                handle: this.header,
                containment: "#gameContainer"
            });
        }

        this.window.append(this.content);
        $("#gameContainer").append(this.window);
    }

    get window() { return this._elem }

    get title() { return this._options.title }
    set title(newTitle) {
        this._options.title = newTitle;
        this.header.find(".modal-title").text(newTitle);
    }

    get zIndex() { return this._options.zIndex }
    set zIndex(newZIndex) {
        this._options.zIndex = newZIndex;
        this.window.css("z-index", newZIndex.toString());
    }

    isVisible() {
        return this.window.is(":visible");
    }

    open() {
        this.window.show();
    }

    open(handler) {
        this.window.show();
        if (handler !== undefined) {
            handler();
        }
    }

    close() {
        this.window.hide();
    }

    close(handler) {
        this.window.hide();
        if (handler !== undefined) {
            handler();
        }
    }

}

class AMQWindowPanel extends _BaseWindow {
    get panel() { return this._elem }
    get body() { return this._elem }
    static get defaults() {
        return {
            ...super.defaults,
            width: 1.0,
            height: "auto",
            scrollable: { x: false, y: false },
        };
    }

    constructor(data) {
        super(data)
        this.scrollable = data.scrollable;
        this.panel.addClass(T("customWindowPanel"))
    }

    get scrollable() { return this._options.scrollable }
    set scrollable(newValue) {
        if (this._options.scrollable === undefined)
            this._options.scrollable = this.defaults.scrollable
        if (newValue === undefined) {
            this.scrollable = this.defaults.scrollable;
        }
        else {
            if (newValue.x !== undefined) this.scrollable.x = newValue.x;
            if (newValue.y !== undefined) this.scrollable.y = newValue.y;
        }
        this.panel.css("overflow-x", this.scrollable.x === true ? "auto" : "hidden");
        this.panel.css("overflow-y", this.scrollable.y === true ? "auto" : "hidden");
    }

    show() {
        this.panel.show();
    }

    show(handler) {
        this.show();
        handler();
    }

    hide() {
        this.panel.hide();
    }

    hide(handler) {
        this.hide();
        handler();
    }



}

function windowSetup() {
    if ($(T("customWindowStyle", "#")).length) return;
    let style = document.createElement("style");
    style.type = "text/css";
    style.id = T("customWindowStyle");
    style.appendChild(document.createTextNode(`
        .${T("customWindow")} {
            overflow-y: hidden;
            top: 0px;
            left: 0px;
            margin: 0px;
            background-color: #424242;
            border: 1px solid rgba(27, 27, 27, 0.2);
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.5);
            user-select: text;
            display: none;
        }
        .${T("draggableWindow")} {
            cursor: move;
        }
        .${T("customWindowBody")} {
            width: 100%;
            overflow-y: auto;
            padding: 0px;
        }
        .${T("customWindowContent")} {
            width: 100%;
            position: absolute;
            top: 0px;
        }
        .${T("customWindow")} .close {
            font-size: 32px;
            padding: 7px;
        }
        .${T("windowResizers")} {
            width: 100%;
            height: 100%;
        }
        .${T("windowResizer")} {
            width: 10px;
            height: 10px;
            position: absolute;
            z-index: 100;
        }
        .${T("windowResizer")}.top-left {
            top: 0px;
            left: 0px;
            cursor: nwse-resize;
        }
        .${T("windowResizer")}.top-right {
            top: 0px;
            right: 0px;
            cursor: nesw-resize;
        }
        .${T("windowResizer")}.bottom-left {
            bottom: 0px;
            left: 0px;
            cursor: nesw-resize;
        }
        .${T("windowResizer")}.bottom-right {
            bottom: 0px;
            right: 0px;
            cursor: nwse-resize;
        }
        
        .${T("customWindowHeader")} {
            padding: 0;
            height: 45px;
        }

        .${T("customWindowHeader")} h2 {
            font-size: 22px;
            text-align: left;
            margin: 0;
            padding: 9px;
            display: block;
        }
    `));
    document.head.appendChild(style);
}
