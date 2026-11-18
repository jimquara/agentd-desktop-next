# CI: drop two orphan gitlinks

- `.repos/alchemy-effect/submodules/distilled`, `.repos/alchemy-effect/submodules/floci`: removed. Upstream's reference copy of Alchemy carries them as gitlinks with no `.gitmodules` entry and no content, so `actions/checkout` fails in its auth cleanup (`git submodule foreach`: "No url found for submodule path"). Nothing reads them. If an upstream sync brings them back, remove them again.
