// ==UserScript==
// @name         Leo's NANDODEMO Collection
// @version      1.3
// @description  Reports Nando Demos and Tatoebas
// @author       LeoCx1000
// @match        https://*.animemusicquiz.com/*
// @icon         https://leo.might-be.gay/static/graphics/favicon.svg
// @grant        none
// @require      https://github.com/joske2865/AMQ-Scripts/raw/master/common/amqScriptInfo.js
// @require      https://github.com/LeoCx1000/AMQScripts/raw/master/scripts/utils/AMQWindows.js
// @require      https://github.com/LeoCx1000/AMQScripts/raw/master/scripts/utils/SongLibraryPatcher.js
// @downloadURL  https://github.com/LeoCx1000/AMQScripts/raw/master/scripts/NandoDemo.user.js
// @updateURL    https://github.com/LeoCx1000/AMQScripts/raw/master/scripts/NandoDemo.user.js
// ==/UserScript==

const version = '1.3';

if (typeof Listener === 'undefined') return;
let loadInterval = setInterval(() => {
    if ($('#loadingScreen').hasClass('hidden')) {
        clearInterval(loadInterval);
        setup();
    }
}, 500);

// Config options.
const API_ENDPOINT = "https://api.duck-bot.com/nandodemo";
const LOCALSTORAGE_KEY = "nandodemoAPIAuthToken";
const ELEM_PREFIX = "leoNandodemo_";


let token = localStorage.getItem(LOCALSTORAGE_KEY);
let available = false;
let lastSongData;
let pendingSongPayload;
let reportedWord = "";
let isModalOpen = false;
let NandoDemoReportsWindow;
let table;
let singleSongWindow;
let reportsList = [];

if (!token) promptForToken();

function qname(string, prefix = "") {
    return prefix + ELEM_PREFIX + string

};

function resetVariablesAfterSong() {
    lastSongData = null;
    reportedWord = null;
}

function promptForToken(invalid = false) {

    popoutMessages.displayPopoutMessage(
        $("<div></div>")
            .append(
                $(`<h4 class="title text-center">🌍 ${invalid ? "Invalid" : "Missing"} Auth Token!</h4>`)
            ).append(
                $(`<h5 class="text-center"></h5>`)
                    .append(
                        $('<button style="color: black; background-color: yellow; font-weight: bold">Submit Token</button>').click(() => {
                            let prompt_res = prompt("Enter NANDODEMO Token");
                            if (!prompt_res) return;
                            token = prompt_res;
                            localStorage.setItem(LOCALSTORAGE_KEY, prompt_res);
                        })
                    )
            )
    );
}

function makeJsonPayload(data) {
    try {
        return {
            anime: data["songInfo"]['animeNames']["english"],
            song: data["songInfo"]["songName"],
            artist: data["songInfo"]["artist"],
            type: ({ 1: "OP", 2: "ED", 3: "IN" }[data["songInfo"]["type"]]) + (data["songInfo"]["typeNumber"] !== 0 ? data["songInfo"]["typeNumber"] : ""),
            media: data['songInfo']["videoTargetMap"]["catbox"],
            song_id: data['songInfo']['annSongId'],
            reporter: selfName,
        }
    }
    catch (error) {
        console.error("Error generating payload")
        console.error(error)
        return null;
    }
};

function sendSongReport(word, payload) {
    payload["word"] = word;
    return fetch(
        API_ENDPOINT + '/report',
        {
            method: "POST",
            body: JSON.stringify(payload),
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(
            (response) => {
                if (response.status === 403) {
                    promptForToken(true);
                    return false;
                }
                else if (!response.ok) {
                    throw new Error(`HTTP Error: ${response.status}`);
                }
                else {
                    return response.json();
                }
            }
        )
        .then((data) => {
            if (data) {
                popoutMessages.displayPopoutMessage(format(popoutMessages.STANDARD_TEMPLATE, `🌍 Reported ${data.word}`, `anime: ${data.anime}`))
                updateTable();
                return true;
            }
            return false;
        })
        .catch((error) => {
            popoutMessages.displayPopoutMessage(format(popoutMessages.STANDARD_TEMPLATE, "🌍 REPORT FAILED", `${error}`));
            return false;
        })
};

function cleanupAfterModal() {
    isModalOpen = false;
    pendingSongPayload = null;
};

function guessingPhaseReport(word) {
    // the word was selected after we've already reached the next guessing phase
    if (pendingSongPayload) {
        sendSongReport(word, pendingSongPayload);
    }
    // the button was clicked at the end of the guessing phase, but we're already in replay
    else if (lastSongData) {
        sendSongReport(word, makeJsonPayload(lastSongData))
    }
    // we are still in the guessing phase
    else {
        reportedWord = word;
        popoutMessages.displayPopoutMessage(format(popoutMessages.STANDARD_TEMPLATE, `🌍 ${word} enqueued!`, `waiting for replay phase`))
    }

    cleanupAfterModal();
}

function createSongReportButton() {
    let songReportButton = $(`<div id="${qname('reportButton')}" class="clickAble qpOption"><i aria-hidden="true" class="fa fa-flag-o qpMenuItem"></i></div>`)
        .click(function () {
            if (!token) return promptForToken();
            if (!available) return popoutMessages.displayPopoutMessage(format(popoutMessages.STANDARD_TEMPLATE, "🌍 Reporting unavailable now", "Wait for the next guessing/replay phase."));

            isModalOpen = true;

            // we are in the replay phase of the quiz
            if (lastSongData) {
                let payload = makeJsonPayload(lastSongData);
                messageDisplayer.displayOption(
                    "What did you hear?",
                    `Reporting "${lastSongData["songInfo"]["songName"]}" by ${lastSongData["songInfo"]["artist"]}`,
                    "Nandodemo",
                    "Tatoeba",
                    () => {
                        sendSongReport("nandodemo", payload);
                        cleanupAfterModal();
                    },
                    (result) => {
                        if (result.dismiss === "cancel") sendSongReport("tatoeba", payload);
                        cleanupAfterModal();
                    },
                );
            }
            // We are in the guessing phase of the quiz
            else {
                messageDisplayer.displayOption(
                    "What did you hear?",
                    `Reporting current song (guessing phase)`,
                    "Nandodemo",
                    "Tatoeba",
                    () => { guessingPhaseReport("nandodemo") },
                    (result) => { if (result.dismiss === "cancel") guessingPhaseReport("tatoeba") },
                );
            }

        })
        .popover({
            placement: "bottom",
            content: "🌍🌎🌏‼️",
            trigger: "hover"
        });

    // add buttons to the UI
    let oldWidth = $("#qpOptionContainer").width();
    $("#qpOptionContainer").width(oldWidth + 35);
    $("#qpOptionContainer > div").append(songReportButton);
}

function createGameListeners() {
    new Listener("quiz ready", (data) => {
        resetVariablesAfterSong();
    });

    new Listener("play next song", (data) => {
        available = true;
        if (isModalOpen) {
            pendingSongPayload = makeJsonPayload(lastSongData);
        }
        resetVariablesAfterSong();
    }).bindListener();

    new Listener("Game Starting", (data) => {
        available = true;
        resetVariablesAfterSong();
    }).bindListener();

    new Listener("answer results", (data) => {
        available = true;
        lastSongData = data;
        if (reportedWord) {
            sendSongReport(reportedWord, makeJsonPayload(data));
            reportedWord = null;
        }
    }).bindListener();

    new Listener("quiz over", (data) => {
        available = false;
        resetVariablesAfterSong();
    }).bindListener();

    // TODO: Figure out these payloads (I can't be bothered)
    new Listener("Join Game", (data) => {
        available = false;
        resetVariablesAfterSong();
    }).bindListener();

    new Listener("Spectate Game", (data) => {
        available = false;
        resetVariablesAfterSong();
    }).bindListener();

}


function applyRegex(elem, searchRegex) {
    if (searchRegex.test($(elem).text())) {
        $(elem).show();
    } else {
        $(elem).hide();
    }
}

function applySearch(elem) {
    let searchQuery = $(qname('SearchTextBox', '#')).val();
    let regexQuery = createAnimeSearchRegexQuery(searchQuery);
    let searchRegex = new RegExp(regexQuery, 'i');
    applyRegex(elem, searchRegex);
}

function applySearchAll() {
    let searchQuery = $(qname('SearchTextBox', '#')).val();
    let regexQuery = createAnimeSearchRegexQuery(searchQuery);
    let searchRegex = new RegExp(regexQuery, 'i');
    $(qname('ReportEntry', 'tr.')).each((index, elem) => {
        applyRegex(elem, searchRegex);
    });
}


function addSearchBarPanelContents(amq_window, idx) {

    amq_window.panels[0].panel
        .append($(
            `<button id="${qname('pluginSettings')}" class="btn btn-info ${qname('ButtonClass')}" type="button"><i aria-hidden="true" class="fa fa-cog"></i></button>`
        )
            .click(() => { updateTable() })
            .popover({
                placement: 'bottom',
                content: 'Settings',
                trigger: 'hover',
                container: 'body',
                animation: false,
            })
        ).append($(
            `<button id="${qname('refreshSongList')}" class="btn btn-primary ${qname('ButtonClass')}" type="button"><i aria-hidden="true" class="fa fa-refresh"></i></button>`
        )
            .click(() => { updateTable() })
            .popover({
                placement: 'bottom',
                content: 'Refresh',
                trigger: 'hover',
                container: 'body',
                animation: false,
            })
        ).append(
            $(`<input id="${qname('SearchTextBox')}" type="text" placeholder="Search table contents (literal)">`)
                .on('input', function (event) {
                    applySearchAll();
                })
                .click(() => {
                    quiz.setInputInFocus(false);
                })
        )

}

// Table 

function addTableHeaders(usernames = false) {
    let headers = $(`
    <tr class="${qname('TableHeader')}">
        <th>🌍</th>
        <th>Anime</th>
        <th>Type</th>
        <th>S/N</th>
        <th>S/A</th>
    </tr>`)
    if (usernames) headers.append($(`<th>User</th>`))
    table.append(headers)
}

function addSongToTable(data) {
    let newRow = $(`<tr class="clickAble ${qname('ReportEntry')}">`)
        .click(function () {
            if (!$(this).hasClass()) {
                $(qname('RowSelected', '.')).removeClass(qname('RowSelected'));
                $(this).addClass(qname('RowSelected'));
                updateSingleSong(data);
                singleSongWindow.open();
            } else {
                $(qname('RowSelected', '.')).removeClass(qname('RowSelected'));
                singleSongWindow.close();
            }
        })
        .hover(
            function () {
                $(this).addClass(qname('hover'));
            },
            function () {
                $(this).removeClass(qname('hover'));
            }
        );

    newRow.append($(`<td><b>${data.word[0].toUpperCase()}</b><span style="display: none">${data.word}</span></td>`))
    newRow.append($(`<td>${data.anime}</td>`));
    newRow.append($(`<td>${data.type}</td>`))
    newRow.append($(`<td>${data.song}</td>`));
    newRow.append($(`<td>${data.artist}</td>`));
    if (data.amq_username) {
        newRow.append($(`<td>${data.amq_username}</td>`));
    }
    table.append(newRow);
    applySearch(newRow);

}

function updateTable() {

    fetch(
        API_ENDPOINT + '/songs',
        {
            method: "GET",
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(
            (response) => {
                if (response.status === 403) {
                    return promptForToken(true);
                }
                else if (!response.ok) {
                    popoutMessages.displayPopoutMessage(format(popoutMessages.STANDARD_TEMPLATE, "⚠️ GET SONGS failed", `HTTP Error: ${response.status}`))
                }
                else {
                    return response.json();
                }
            }
        )
        .then((data) => {
            reportsList = data;
            if (data.length === 0) {
                NandoDemoReportsWindow.close();
            }
            let hasUsername = (data[0].amq_username !== null);

            table.children().remove();
            addTableHeaders(hasUsername);

            for (let song of data) {
                addSongToTable(song);
            }
        })
        .catch((error) => {
            popoutMessages.displayPopoutMessage(format(popoutMessages.STANDARD_TEMPLATE, "⚠️ GET SONGS failed", `${error}`))
        })

}

function addTablePanelContents(amq_window, idx) {
    table = $(`<table id="${qname('ReportListTable')}" class="table floatingContainer"></table>`);
    amq_window.panels[idx].panel.append(table);
}

// Main Song List Window

function createNandodemoListWindow() {
    NandoDemoReportsWindow = new AMQWindow({
        id: qname('ReportsWindow'),
        title: "nandodemo & tatoeba reports",
        width: 850,
        height: 550,
        minWidth: 100,
        minHeight: 100,
        zIndex: 400,
        resizable: true,
        draggable: true,
        closeHandler: () => { singleSongWindow.close() }
    })

    NandoDemoReportsWindow.addPanel({
        id: qname('SearchBoxPanel'),
        width: 1.0,
        height: 60,
    })

    addSearchBarPanelContents(NandoDemoReportsWindow, 0);

    NandoDemoReportsWindow.addPanel({
        id: qname('ReportListTablePanel'),
        width: 1.0,
        height: 'calc(100% - 60px)',
        scrollable: {
            x: false,
            y: true,
        },
        position: {
            x: 0,
            y: 60,
        },
    })

    addTablePanelContents(NandoDemoReportsWindow, 1);

    // Add button to the settings
    $("#optionListSettings").before($("<li>", { class: "clickAble", text: "🌍🌎🌏‼️" }).on("click", () => {
        NandoDemoReportsWindow.open();
        updateTable();

    }))


}

// Single Song Info

function updateSingleSong(song) {
    let panel = singleSongWindow.panels[0];
    panel.clear()

    let generatedMedia = $(`<div class="shiEntryValue"></div>`);
    for (let key in song.media) {
        generatedMedia.append($(`<a target="_blank" class="shiEntryListEntry" href="https://naedist.animemusicquiz.com/${song.media[key]}">${key !== '0' ? key : 'mp3'}</a>`))
    }

    let deleteButton = $(
        `<p class="clickAble" style="color: red">delete</p>`
    )
        .click(() => {
            messageDisplayer.displayOption(
                `Delete ${song.word} report?`,
                `Anime: ${song.anime}`,
                "Delete",
                "Cancel",
                () => {
                    fetch(
                        API_ENDPOINT + `/songs/${song.report_id}`,
                        {
                            method: "DELETE",
                            headers: { 'Authorization': `Bearer ${token}` }
                        })
                        .then(
                            (response) => {
                                if (response.status === 403) {
                                    return promptForToken(true);
                                }
                                else if (!response.ok) {
                                    popoutMessages.displayPopoutMessage(format(popoutMessages.STANDARD_TEMPLATE, "🌍 DELETE FAILED", `HTTP Error: ${response.status}`))
                                }
                                else {
                                    return response.text();
                                }
                            }
                        )
                        .then((data) => {
                            popoutMessages.displayPopoutMessage(format(popoutMessages.STANDARD_TEMPLATE, `🌍 deleted ${song.word}`, `anime: ${song.anime}`))
                            singleSongWindow.close();
                            updateTable();
                        })
                        .catch((error) => {
                            popoutMessages.displayPopoutMessage(format(popoutMessages.STANDARD_TEMPLATE, "🌍 DELETE FAILED", `${error}`))
                        })
                },
            );

        })

    panel.panel.append(
        $(`<div class="${qname('InfoRow')}"></div>`)
            .append($(`<div class="${qname('InfoLong')}"><h5><b>Anime Name</b> <i class="fa fa-files-o clickAble" id="${qname('infoAnimeCopy')}"></i></h5><p>${escapeHtml(song.anime)}</p></div>`))
            .append($(`<div class="${qname('InfoShort')}"><h5><b>Type</b></h5><p>${escapeHtml(song.type)}</p></div>`))
            .append($(`<div class="${qname('InfoShort')}"><h5><b>Word</b></h5><p>${escapeHtml(song.word)}</p></div>`))
    ).append(
        $(`<div class="${qname('InfoRow')}"></div>`)
            .append($(`<div class="${qname('InfoLong')}"><h5><b>Song Name</b> <i class="fa fa-files-o clickAble" id="${qname('infoSongCopy')}"></i></h5><p>${escapeHtml(song.song)}</p></div>`))
            .append($(`<div class="${qname('InfoLong')}"><h5><b>Song Name</b> <i class="fa fa-files-o clickAble" id="${qname('infoArtistCopy')}"></i></h5><p>${escapeHtml(song.artist)}</p></div>`))

    ).append(
        $(`<div class="${qname('InfoRow')}"></div>`)
            .append($(`<div class="${qname('InfoLong')}"><h5><b>Media</b></h5></div>`).append(generatedMedia))
            .append($(`<div class="${qname('InfoLong')}"><h5><b>Actions</b></h5></div>`).append($(`<p></p>`).append(deleteButton)))
    )


    $(qname('infoAnimeCopy', '#'))
        .click(function () {
            $('#copyBox').val(song.anime).select();
            document.execCommand('copy');
            $('#copyBox').val('').blur();
        })
        .popover({
            content: 'Copy Anime Name',
            trigger: 'hover',
            placement: 'top',
            container: qname('SingleSongWindow', '#'),
            animation: false,
        });

    $(qname('infoSongCopy', '#'))
        .click(function () {
            $('#copyBox').val(song.song).select();
            document.execCommand('copy');
            $('#copyBox').val('').blur();
        })
        .popover({
            content: 'Copy Song Name',
            trigger: 'hover',
            placement: 'top',
            container: qname('SingleSongWindow', '#'),
            animation: false,
        });
    $(qname('infoArtistCopy', '#'))
        .click(function () {
            $('#copyBox').val(song.artist).select();
            document.execCommand('copy');
            $('#copyBox').val('').blur();
        })
        .popover({
            content: 'Copy Artist Name',
            trigger: 'hover',
            placement: 'top',
            container: qname('SingleSongWindow', '#'),
            animation: false,
        });
}

function createSingleSongWindow() {
    singleSongWindow = new AMQWindow({
        id: qname('SingleSongWindow'),
        title: 'Song Info',
        width: 450,
        height: 350,
        minWidth: 375,
        minHeight: 300,
        draggable: true,
        resizable: true,
        closeHandler: () => { $(qname('RowSelected', '.')).removeClass(qname('RowSelected')); },
        zIndex: 450,

    });

    singleSongWindow.addPanel({
        height: 1.0,
        width: 1.0,
        scrollable: {
            x: false,
            y: true,
        },
    });
}

// Song Library Stuffs

function patchSongLibrary() {
    AMQ_LibraryAddSongPatch(qname('patch'), (entry) => {
        let songName = entry.annSongEntry.songEntry.name;
        let songArtist = entry.annSongEntry.songEntry.artist.name;
        let animeName = entry.animeEntry.mainNames.EN || entry.animeEntry.mainNames.JA
        let reportExists = false;
        let reportSymbol = 'R';
        let reportedWord = "";
        for (let elem of reportsList) {
            if (elem.anime == animeName && elem.song == songName && elem.artist == songArtist) {
                reportExists = true;
                reportedWord = elem.word;
                reportSymbol = elem.word[0].toUpperCase();
                break;
            }
        }

        let reportButton = $(`<div class="${qname('SongLibraryReportButton')} ${reportExists ? qname('Reported') : ''}">${reportSymbol}</div>`)
            .popover({
                content: "Report Nandodemo/Tatoeba",
                trigger: "hover",
                container: "#gameContainer",
            })
            .click((e) => {
                e.stopPropagation();
                e.preventDefault();

                let payload = {
                    anime: animeName,
                    song: songName,
                    artist: songArtist,
                    type: ({ 1: "OP", 2: "ED", 3: "IN" }[entry.annSongEntry.type]) + (entry.annSongEntry.number !== 0 ? entry.annSongEntry.number : ""),
                    media: {},
                    song_id: entry.annSongEntry.annSongId,
                    reporter: selfName,
                }


                messageDisplayer.displayOption(
                    "What did you hear?",
                    `Reporting "${payload.song}" by ${payload.artist}`,
                    "Nandodemo",
                    "Tatoeba",
                    () => {
                        sendSongReport("nandodemo", payload).then((success) => {
                            if (success) {
                                reportButton.addClass(qname('Reported'));
                                reportButton.text("N");
                            }
                        });
                    },
                    (result) => {
                        if (result.dismiss === "cancel") sendSongReport("tatoeba", payload).then((success) => {
                            if (success) {
                                reportButton.addClass(qname('Reported'));
                                reportButton.text("T");
                            }
                        });
                    },
                );

            })
        entry.$addCustomListButton.parent().before($(`<div class="elSongEntryAddCustomListContianer"></div>`).append(reportButton))

    })
}

// Setup

function applyCSS() {
    AMQ_addStyle(`
        .${qname('ReportEntry')} > td {
            vertical-align: middle;
            border: 1px solid black;
            text-align: center;
        }
        .${qname('ReportEntry')}.${qname('hover')} {
            box-shadow: 0px 0px 10px cyan;
        }
        .${qname('ReportEntry')}.${qname('RowSelected')} {
            box-shadow: 0px 0px 10px lime;
        }
        .${qname('InfoRow')} {
            width: 98%;
            height: auto;
            text-align: center;
            clear: both;
        }
        .${qname('InfoRow')} > div {
            margin: 1%;
            text-align: center;
            float: left;
        }
        .${qname('InfoShort')} {
            width: 23%;
        }
        .${qname('InfoLong')} {
            width: 48%;
            overflow-wrap: break-word;
        }
        #${qname('SearchTextBox')} {
            width: calc(100% - 110px);
            color: black;
            margin: 15px 15px 0px 15px;
            height: 35px;
            border-radius: 4px;
            border: 0;
            text-overflow: ellipsis;
            padding: 5px;
            float: left;
        }
        #${qname('ReportListTablePanel')} {
            padding: 15px;
        }
        
        .${qname('ButtonClass')} {
            float: right;
            margin-top: 15px;
            margin-right: 10px;
            padding: 6px 8px;
        }
        .${qname('TableHeader')} > th {
            border: 1px solid black;
            text-align: center;
            vertical-align: middle;
            font-weight: bold;
        }
        .${qname('SongLibraryReportButton')} {
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
        .${qname('Reported')} {
            border-color: lime;
            color: lime;
        }
    `
    )
}

function setup() {
    createSongReportButton();
    createGameListeners();
    createNandodemoListWindow();
    createSingleSongWindow();
    patchSongLibrary();
    updateTable();
    applyCSS();

    // Add metadata
    AMQ_addScriptData({
        name: "Leo's NANDODEMO Collection",
        author: 'LeoCx1000',
        version: version,
        link: 'https://github.com/LeoCx1000/AMQScripts/raw/master/scripts/NandoDemo.user.js',
        description: `
            <p>Adds a button to report "nandodemo"s or "tatoeba"s that you hear in the current song. Also a page to view your reports</p>
        `,
    });
}