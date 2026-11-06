// Draws every {{< uplot >}} chart on the page; see layouts/_shortcodes/uplot.html.
// Deferred scripts run before DOMContentLoaded, so uPlot is loaded by then.
document.addEventListener("DOMContentLoaded", () => {
  const palette = ["#3b82f6", "#e07a1f", "#2a9d8f", "#c2417a"];
  const charts = [...document.querySelectorAll(".uplot-chart")].map((fig) => {
    const { opts, columns } = JSON.parse(fig.querySelector("script").textContent);
    // keys[0] is x; Hugo's maps don't keep order, so keys carries it.
    const data = opts.keys.map((k) => columns[k]);
    const el = fig.querySelector(".uplot-chart__plot");
    let plot;
    // Series visibility, carried across redraws so legend toggles survive them.
    const shown = opts.keys.slice(1).map((k) => !opts.hidden.includes(k));
    const draw = () => {
      plot?.series.slice(1).forEach((s, i) => (shown[i] = s.show));
      plot?.destroy();
      // Axes follow the text colour, so they track the theme's colour scheme.
      const fg = getComputedStyle(fig).color;
      const grid = { stroke: fg.replace("rgb(", "rgba(").replace(")", ", 0.15)") };
      plot = new uPlot({
        width: el.clientWidth,
        height: 320,
        scales: { x: { time: false, distr: opts.logx ? 3 : 1, log: opts.logx === true ? 10 : opts.logx || 10 } },
        axes: [
          { label: opts.xlabel, stroke: fg, grid, ticks: grid },
          { label: opts.ylabel, stroke: fg, grid, ticks: grid, size: 60 },
        ],
        series: [
          { label: opts.xlabel },
          ...opts.keys.slice(1).map((label, i) => ({
            label,
            show: shown[i],
            stroke: palette[i % palette.length],
            width: 2,
            ...(opts.lines
              ? { points: { size: 5 } }
              : { paths: () => null, points: { show: true, size: 6, fill: palette[i % palette.length] } }),
          })),
        ],
      }, data, el);
    };
    draw();
    new ResizeObserver(() => plot.setSize({ width: el.clientWidth, height: 320 })).observe(el);
    return draw;
  });
  // The theme switches schemes by swapping a class on <body>.
  new MutationObserver(() => charts.forEach((draw) => draw()))
    .observe(document.body, { attributes: true, attributeFilter: ["class"] });
});
