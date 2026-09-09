// AMQ Library Patcher Script
// This code is fetched automatically
// Do not attempt to add it to tampermonkey

if (typeof Listener === "undefined") return;
ensureLibPatch();

function AMQ_LibraryAddSongPatch(patchName, patch) {
    ensureLibPatch()
    LibrarySongEntry.prototype.patches[patchName] = patch
}

function AMQ_LibraryAddAnimePatch(patchName, patch) {
    ensureLibPatch()
    LibraryAnimeEntry.prototype.patches[patchName] = patch
}


function ensureLibPatch() {
    if (LibraryAnimeEntry.prototype.patches === undefined) {

        class PatchedLibraryAnimeEntry extends LibraryAnimeEntry {
            createSongEntry(song) {
                return new LibrarySongEntry(this, song, this.playerController);
            }

            setup(...args) {
                super.setup(...args)
                for (let patchName in this.patches) {
                    try { this.patches[patchName](this) }
                    catch (error) {
                        console.error(`Failed calling Anime Entry patch ${patchName}`)
                    }
                }
            }

        }
        PatchedLibraryAnimeEntry.prototype.patches = {}
        LibraryAnimeEntry = PatchedLibraryAnimeEntry

    }


    if (LibrarySongEntry.prototype.patches === undefined) {

        class PatchedLibrarySongEntry extends LibrarySongEntry {
            constructor(parent, ...args) {
                super(...args)
                this.animeEntry = parent.animeEntry
                this.animeExtendedInfo = parent.extendedInfo
            }

            setup(...args) {
                super.setup(...args)
                for (let patchName in this.patches) {
                    try { this.patches[patchName](this) }
                    catch (error) {
                        console.error(`Failed calling Song Entry patch ${patchName}`)
                    }
                }
            }
        }
        LibrarySongEntry.prototype.patches = {}
        LibrarySongEntry = PatchedLibrarySongEntry
    }
}