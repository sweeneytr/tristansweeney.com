#!/bin/bash
# Regression suite for the proxxied extension.
#
# There is no node on this machine, so these run under JavaScriptCore via
# `osascript -l JavaScript`. stubs.js fakes just enough of a browser (fetch,
# Headers, URL, localStorage, a DOM shim) for recorder.js and main-world.js to
# execute unmodified.
#
# Usage: ./run.sh
set -uo pipefail

export PX_TEST_DIR="$(cd "$(dirname "$0")" && pwd)"
export PX_EXT_DIR="$(cd "$PX_TEST_DIR/.." && pwd)"
export PX_REPO_DIR="$(cd "$PX_EXT_DIR/../.." && pwd)"
export PX_OUT_DIR="$PX_TEST_DIR/out"
mkdir -p "$PX_OUT_DIR"
rm -f "$PX_OUT_DIR"/result*.txt

JSC="osascript -l JavaScript"
fail=0

pass_if() { # name, condition-result
  if [ "$2" = "0" ]; then printf '  %-34s PASS\n' "$1"
  else printf '  %-34s FAIL\n' "$1"; fail=$((fail+1)); fi
}

echo "== syntax =="
$JSC "$PX_TEST_DIR/check.js" "$PX_EXT_DIR"/recorder.js "$PX_EXT_DIR"/main-world.js \
     "$PX_EXT_DIR"/content.js "$PX_EXT_DIR"/popup.js
echo
echo "== harnesses =="
for h in harness harness2 harness3 harness4 harness5 harness6 harness7 harness8; do
  $JSC "$PX_TEST_DIR/$h.js" >/dev/null 2>&1
done

R="$PX_OUT_DIR"
grep -q "^diffs: 1" "$R/result.txt" 2>/dev/null; pass_if "recorder: capture/diff/report" $?
grep -q "Ballynock Cohort" "$R/result2.txt" 2>/dev/null; pass_if "importer: per-side names" $?
{ grep -q "authorization sent: true" "$R/result3.txt" && grep -q '"present":2' "$R/result3.txt" \
  && [ "$(grep -c '✗ failed' "$R/result3.txt")" = "1" ]; }; pass_if "auth + CAS + 0-row guard" $?
{ grep -q "dfc_images carried over?  false" "$R/result4.txt" \
  && grep -q "isFlipped:                false" "$R/result4.txt"; }; pass_if "no template contamination" $?
grep -q "^real file: 300 lines, 0 errors" "$R/result5.txt" 2>/dev/null; pass_if "pair parser (2-4 fields)" $?
grep -q '"present":240' "$R/result6.txt" 2>/dev/null; pass_if "120-pair batch end to end" $?
{ grep -q "recovered SHM-10" "$R/result7.txt" \
  && grep -q "line 2: could not resolve" "$R/result7.txt"; }; pass_if "bulk lookup + passthrough fallback" $?
{ grep -q "chose rich project: true" "$R/result8.txt" \
  && grep -q "scryfall_meta: true" "$R/result8.txt"; }; pass_if "richest-template selection" $?

echo
if [ "$fail" = "0" ]; then echo "all green"; else echo "$fail failing"; fi
exit $fail
