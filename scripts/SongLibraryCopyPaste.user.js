// ==UserScript==
// @name         Song Library Copy Paste
// @version      1.1
// @description  Adds CopyPaste to the Song Library
// @author       LeoCx1000
// @match        https://*.animemusicquiz.com/*
// @icon         https://leo.might-be.gay/static/graphics/favicon.svg
// @grant        none
// @require      https://github.com/joske2865/AMQ-Scripts/raw/master/common/amqScriptInfo.js
// @require      https://github.com/LeoCx1000/AMQScripts/raw/master/scripts/utils/AMQWindows.js
// @require      https://github.com/LeoCx1000/AMQScripts/raw/master/scripts/utils/SongLibraryPatcher.js
// @downloadURL  https://github.com/LeoCx1000/AMQScripts/raw/master/scripts/SongLibraryCopyPaste.user.js
// @updateURL    https://github.com/LeoCx1000/AMQScripts/raw/master/scripts/SongLibraryCopyPaste.user.js
// ==/UserScript==

const version = '1.1';

if (typeof Listener === "undefined") return;
const loadInterval = setInterval(() => {
    if (document.querySelector("#loadingScreen.hidden")) {
        clearInterval(loadInterval);
        setup();
    }
}, 500);


const ELEM_PREFIX = "leoSLCopy_";
const CONFIG_KEY = "leoSLCopy_Config"

// global vars
let config = {};

defaultConfig = {
    copyAnimeTemplateText: "{anime}",
    copySongTemplateText: '"{song}" by {artist}'
}
let CopyPasteSettingsWindow;
let animeCopyPasteTextBox;
let songCopyPasteTextBox;


function loadConfig() {
    let storedData = localStorage.getItem(CONFIG_KEY);

    if (storedData) {
        parsedConfig = JSON.parse(storedData);

        config = {
            copyAnimeTemplateText: parsedConfig['copyAnimeTemplateText'] || defaultConfig.copyAnimeTemplateText,
            copySongTemplateText: parsedConfig['copySongTemplateText'] || defaultConfig.copySongTemplateText
        }
    } else {
        config = defaultConfig;
    };
};

function saveConfig() {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config))
}

function copy(text) {
    $('#copyBox').val(text).select();
    document.execCommand('copy');
    $('#copyBox').val('').blur();
}

function qname(string, prefix = "") {
    return prefix + ELEM_PREFIX + string
};

function format(text, mapping) {
    var args = mapping;
    return text.replace(/{(\w+)}/g, function (match, name) {
        return typeof args[name] != 'undefined'
            ? args[name]
            : match
            ;
    });
};

function createSettingsWindow() {
    CopyPasteSettingsWindow = new AMQWindow({
        id: qname('SettingsWindow'),
        title: "Library Copy Paste Settings",
        width: 850,
        height: 450,
        minWidth: 100,
        minHeight: 100,
        zIndex: 375,
        resizable: true,
        draggable: true
    })

    // Anime Name Copy Paste

    CopyPasteSettingsWindow.addPanel({
        id: qname("AnimePlaceholders"),
        width: 1.0,
    }).append($(`<div class="${qname("ReadMeText")}">
        <code>{anime}</code>: Anime name as seen in the interface.<br>
        <code>{category}</code>: Anime category. Such as TV, Season 1.0, etc.<br>
        <code>{year}</code>: anime release year.
        <code>{nameJP}</code>: Anime name in japanese.<br>
        <code>{nameEN}</code>: Anime name in english.<br>
    </div>`))

    let validAnimeKeys = [
        "nameJP",
        "nameEN",
        "anime",
        "category",
        "year",
    ]

    function checkAnimeInput() {
        let invalidMatches = [];
        for (let match of (animeCopyPasteTextBox.val().match(/{(\w+)}/g) || []).map((v) => v.slice(1, -1))) {
            if (!validAnimeKeys.includes(match)) {
                invalidMatches.push(match)
            }

            if (invalidMatches.length) {
                animeErrorTextBox.text(`Invalid placeholders: ${invalidMatches.join(', ')}`)

            } else {
                animeErrorTextBox.text('')
            }

            if (animeCopyPasteTextBox.val() !== config.copyAnimeTemplateText) {
                if (!animeCopyPasteTextBox.hasClass(qname('unsavedChanges')))
                    animeCopyPasteTextBox.addClass(qname('unsavedChanges'))
                if (!animeErrorTextBox.hasClass(qname('unsavedChangesWarning')))
                    animeErrorTextBox.addClass(qname('unsavedChangesWarning'))
            } else {
                animeCopyPasteTextBox.removeClass(qname('unsavedChanges'))
                animeErrorTextBox.removeClass(qname('unsavedChangesWarning'))
            }

        }

    }

    let animeErrorTextBox = $(`<div class="${qname("errorBox")}"></div>`);
    let animeCopyPasteTextBox = $(`<input class="${qname('TextBox')}" type="text" placeholder="Song Name Copy Format">`)
        .on('input', checkAnimeInput)
        .click(() => {
            quiz.setInputInFocus(false);
        })
        .val(config.copyAnimeTemplateText)

    let animeCopyPasteSubmitButton = $(
        `<button class="btn btn-success ${qname('ConfirmButton')}" type="button"><i aria-hidden="true" class="fa fa-check"></i></button>`
    ).click(() => {

        for (let match of (animeCopyPasteTextBox.val().match(/{(\w+)}/g) || []).map((v) => v.slice(1, -1)))
            if (!validSongKeys.includes(match)) return
        config.copyAnimeTemplateText = animeCopyPasteTextBox.val();
        saveConfig()
        checkAnimeInput()
    })

    CopyPasteSettingsWindow.addPanel({
        id: qname("AnimeTextBox"),
        width: 1.0,
    }).append(animeCopyPasteTextBox).append(animeCopyPasteSubmitButton)
    CopyPasteSettingsWindow.addPanel().append(animeErrorTextBox)

    // Song Name Copy Paste

    CopyPasteSettingsWindow.addPanel({
        id: qname("SongPlaceholders"),
        width: 1.0,
    }).append($(`<div class="${qname("ReadMeText")}">
        The placeholders above can also be used here. 
        The follwing are also available:<br>
        <code>{song}</code>: The song name.<br>
        <code>{artist}</code>: The song artist(s).<br>
        <code>{composer}</code>: The song composer(s).<br>
        <code>{arranger}</code>: The song arranger(s).<br>
        <code>{type}</code>: The song type, E.g. OP4, IN.<br>
        <code>{typeName}</code>: The song type type: OP, ED, IN.
    </div>`))


    let validSongKeys = [
        ...validAnimeKeys,
        "song",
        "artist",
        "composer",
        "arranger",
        "type",
        "typeName",
    ]

    function checkSongInput() {
        let invalidMatches = [];
        for (let match of (songCopyPasteTextBox.val().match(/{(\w+)}/g) || []).map((v) => v.slice(1, -1))) {
            if (!validSongKeys.includes(match)) {
                invalidMatches.push(match)
            }

            if (invalidMatches.length) {
                songErrorTextBox.text(`Invalid placeholders: ${invalidMatches.join(', ')}`)
            } else {
                songErrorTextBox.text('')
            }

            if (songCopyPasteTextBox.val() !== config.copySongTemplateText) {
                if (!songCopyPasteTextBox.hasClass(qname('unsavedChanges')))
                    songCopyPasteTextBox.addClass(qname('unsavedChanges'))
                if (!songErrorTextBox.hasClass(qname('unsavedChangesWarning')))
                    songErrorTextBox.addClass(qname('unsavedChangesWarning'))
            } else {
                songCopyPasteTextBox.removeClass(qname('unsavedChanges'))
                songErrorTextBox.removeClass(qname('unsavedChangesWarning'))

            }
        }

    }

    let songErrorTextBox = $(`<div class="${qname("errorBox")}"></div>`)
    let songCopyPasteTextBox = $(`<input class="${qname('TextBox')}" type="text" placeholder="Anime Name Copy Format">`)
        .on('input', checkSongInput)
        .click(() => {
            quiz.setInputInFocus(false);
        })
        .val(config.copySongTemplateText)

    let songCopyPasteSubmitButton = $(
        `<button class="btn btn-success ${qname('ConfirmButton')}" type="button"><i aria-hidden="true" class="fa fa-check"></i></button>`
    ).click(() => {
        for (let match of (songCopyPasteTextBox.val().match(/{(\w+)}/g) || []).map((v) => v.slice(1, -1)))
            if (!validSongKeys.includes(match)) return

        config.copySongTemplateText = songCopyPasteTextBox.val();
        saveConfig()
        checkSongInput()
    })

    CopyPasteSettingsWindow.addPanel({
        id: qname("SongTextBox"),
        width: 1.0,
    }).append(songCopyPasteTextBox).append(songCopyPasteSubmitButton)
    CopyPasteSettingsWindow.addPanel().append(songErrorTextBox)

}

function createSongLibraryButtons() {
    AMQ_LibraryAddAnimePatch(qname("animeEntry"), (entry) => {
        let copyButton = $(`<div class="${qname('CopyButton')}">C</div>`)
            .popover({
                content: "Copy Anime Name",
                trigger: "hover",
                container: "#gameContainer",
            })
            .click((e) => {
                e.stopPropagation();
                e.preventDefault();
                let validKeys = {
                    nameJP: entry.animeEntry.mainName.JA,
                    nameEN: entry.animeEntry.mainName.EN,
                    anime: entry.animeEntry.names[0].name,
                    category: `${entry.animeEntry.category.name} ${entry.animeEntry.category.number || ""}`.trim(),
                    year: entry.animeEntry.year,
                }

                copy(format(config.copyAnimeTemplateText, validKeys))
            })
        entry.$addCustomListButton.parent().before($(`<div class="elAnimeEntryAddCustomListContianer"></div>`).append(copyButton))
    })

    AMQ_LibraryAddSongPatch(qname("songEntry"), (entry) => {
        let copyButton = $(`<div class="${qname('CopyButton')}">C</div>`)
            .popover({
                content: "Copy Song Name",
                trigger: "hover",
                container: "#gameContainer",
            })
            .click((e) => {
                e.stopPropagation();
                e.preventDefault();
                let validKeys = {
                    nameJP: entry.animeEntry.mainName.JA,
                    nameEN: entry.animeEntry.mainName.EN,
                    anime: entry.animeEntry.names[0].name,
                    category: `${entry.animeEntry.category.name} ${entry.animeEntry.category.number || ""}`.trim(),
                    year: entry.animeEntry.year,

                    // extra fields
                    song: entry.songEntry.name,
                    artist: entry.songEntry.artist.name,
                    composer: entry.songEntry.composer.name,
                    arranger: entry.songEntry.arranger.name,
                    type: ({ 1: "OP", 2: "ED", 3: "IN" }[entry.annSongEntry.type]) + (entry.annSongEntry.number !== 0 ? entry.annSongEntry.number : ""),
                    typeName: ({ 1: "OP", 2: "ED", 3: "IN" }[entry.annSongEntry.type]),

                }

                copy(format(config.copySongTemplateText, validKeys))
            })
        entry.$addCustomListButton.parent().before($(`<div class="elSongEntryAddCustomListContianer"></div>`).append(copyButton))
    })

    $(".elFilterViewRecentWrong")
        .after(
            $(`<div class="elFilterViewOption rightTiltButton clickAble"><div>Copy Settings</div></div>`)
                .click(
                    () => {
                        CopyPasteSettingsWindow.open()
                    }
                )
        )
}

function applyCSS() {
    AMQ_addStyle(`
        .${qname('TextBox')} {
            width: calc(100% - 70px);
            color: black;
            height: 35px;
            border-radius: 4px;
            border: 0;
            text-overflow: ellipsis;
            padding: 5px;
            float: left;
            margin: 5px 0px 5px 10px;
        }

        .${qname('ConfirmButton')} {
            float: right;
            padding: 6px 8px;
            margin-right: 10px;
            margin-top: 5px;
        }
        
        .${qname("ReadMeText")} {
            margin: 10px;
        }
        .${qname("errorBox")} {
            margin: 2px 0px 2px 10px;
            color: #f66;
        }
        .${qname('unsavedChanges')} {
            background-color: #fffbbe;
        }
        .${qname('unsavedChangesWarning')}:after {
            content: " (unsaved changes)";
            color: #fffbbe;
            font-style: italic;
        }
        .${qname('CopyButton')} {
            font-size: 20px;
            line-height: 18px;
            aspect-ratio: 1/1;
            height: 20px;
            text-align: center;
            border-radius: 50%;
            border: 1px solid white;
            opacity: .6;
            cursor: pointer;
        }
`)
}

function setup() {
    loadConfig();
    createSettingsWindow();
    createSongLibraryButtons();
    applyCSS();

    // Add metadata
    AMQ_addScriptData({
        name: "Song Library Copy Button",
        author: 'LeoCx1000',
        version: version,
        link: 'https://github.com/LeoCx1000/AMQScripts/raw/master/scripts/SongLibraryCopyPaste.user.js',
        description: `
            <p>Adds a copy button for songs in the song library. <img src="https://leo.might-be.gay/JTcE8dKK.png" /></p>
            
        `,
    });
}