+++
authors = ["Lone Coder"]
date = "2026-11-06"
title = "uPlot chart support"
description = "The post demonstrates the uplot shortcode"
tags = [
    "hugo",
    "markdown",
    "html",
]
categories = [
    "theme demo",
    "syntax",
]
series = ["Theme Demo"]
+++

The `uplot` shortcode draws a chart from a JSON file in the page bundle, using
[uPlot](https://github.com/leeoniya/uPlot). The data is inlined at build time,
and uPlot loads only on pages that use the shortcode.

```go-html-template
{{</* uplot src="data.json" x="n" y="linear,quadratic,cubic" hidden="cubic" logx=2 xlabel="n" ylabel="Operations" caption="Click a legend entry to toggle its series." */>}}
```

{{< uplot src="data.json" x="n" y="linear,quadratic,cubic" hidden="cubic" logx=2 xlabel="n" ylabel="Operations" caption="Click a legend entry to toggle its series." >}}

`data.json` maps each column to an array:

```json
{"n": [1, 2, 4, 8, 16], "linear": [1, 2, 4, 8, 16], "quadratic": [1, 4, 16, 64, 256], "cubic": [1, 8, 64, 512, 4096]}
```

Add `lines=false` for a scatter of points.
