+++
authors = ["Lone Coder"]
title = "Math Typesetting"
date = "2023-07-10"
description = "Math rendered to MathML at build time"
tags = [
    "hugo",
    "markdown",
    "css",
    "html",
]
categories = [
    "theme demo",
    "syntax",
]
series = ["Theme Demo"]
+++

Math is rendered to MathML when the site is built, so no JavaScript, stylesheet or font ships to the reader.

<!--more-->

Enable Goldmark's passthrough extension in the site config. The theme's render hook handles the rest:

```toml
[markup.goldmark.extensions.passthrough]
enable = true
[markup.goldmark.extensions.passthrough.delimiters]
block = [['\[', '\]'], ['$$', '$$']]
inline = [['\(', '\)']]
```

Adding `['$', '$']` to `inline` also works, but then every literal dollar sign in prose has to be escaped.

### Examples

Inline math: \(\varphi = \dfrac{1+\sqrt5}{2}= 1.6180339887…\)

Block math:

$$
 \varphi = 1+\frac{1} {1+\frac{1} {1+\frac{1} {1+\cdots} } }
$$
