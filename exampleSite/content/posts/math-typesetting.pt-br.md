+++
authors = ["Programador Solitário"]
title = "Configuração de Equações Matemáticas"
date = "2023-07-10"
description = "Equações renderizadas em MathML durante o build"
tags = [
    "hugo",
    "markdown",
    "css",
    "html",
]
categories = [
    "sintaxe",
    "demonstração do tema",
]
series = ["Demonstração do Tema"]
+++

As equações são renderizadas em MathML durante o build, sem JavaScript, CSS ou fontes para o leitor.

<!--more-->

Ative a extensão passthrough do Goldmark na configuração do site; o render hook do tema faz o resto:

```toml
[markup.goldmark.extensions.passthrough]
enable = true
[markup.goldmark.extensions.passthrough.delimiters]
block = [['\[', '\]'], ['$$', '$$']]
inline = [['\(', '\)']]
```

### Exemplos

Notação inline: \(\varphi = \dfrac{1+\sqrt5}{2}= 1.6180339887…\)

Notação em bloco:

$$
 \varphi = 1+\frac{1} {1+\frac{1} {1+\frac{1} {1+\cdots} } }
$$
