(() => {
  const SVG_NS = "http://www.w3.org/2000/svg";
  const BASE_ZONE_GROUPS = ["number_cells", "dozens", "outside_bets", "columns"];

  function createSvgElement(tagName, attributes = {}) {
    const element = document.createElementNS(SVG_NS, tagName);
    Object.entries(attributes).forEach(([key, value]) => {
      element.setAttribute(key, String(value));
    });
    return element;
  }

  function getZoneRect(zone) {
    return zone.rect || zone.bounds || null;
  }

  function getBaseAnchor(zone) {
    return zone.chip_anchor || zone.anchor || null;
  }

  function getZoneAnchor(zone) {
    const baseAnchor = getBaseAnchor(zone);
    const rect = getZoneRect(zone);
    if (!baseAnchor) {
      return null;
    }

    if (zone.bet_type === "street" && rect) {
      return {
        x: baseAnchor.x - 5,
        y: rect.y - 1.75,
      };
    }

    if (zone.bet_type === "six_line" && rect) {
      return {
        x: baseAnchor.x,
        y: rect.y - 1.75,
      };
    }

    return baseAnchor;
  }

  function flattenBaseZones(schema) {
    return BASE_ZONE_GROUPS.flatMap((groupName) => {
      const zones = schema.regions[groupName] || [];
      return zones.map((zone) => ({ ...zone, group_name: groupName }));
    });
  }

  function flattenHotspotZones(schema) {
    return Object.entries(schema.regions.hotspots || {}).flatMap(([hotspotType, zones]) => (
      zones.map((zone) => ({
        ...zone,
        group_name: `hotspots.${hotspotType}`,
      }))
    ));
  }

  function flattenVisibleZones(schema) {
    return [...flattenBaseZones(schema), ...flattenHotspotZones(schema)];
  }

  function computeViewBox(schema) {
    const visibleZones = flattenVisibleZones(schema);
    const rects = visibleZones.map(getZoneRect).filter(Boolean);
    const maxX = Math.max(...rects.map((rect) => rect.x + rect.width), 140);
    const maxY = Math.max(...rects.map((rect) => rect.y + rect.height), 42);
    return { minX: -2, minY: -5, width: maxX + 4, height: maxY + 7 };
  }

  function buildZoneClasses(zone, allowBetPlacement, isHighlightedResult) {
    const classes = ["roulette-zone", `bet-type-${zone.bet_type}`];
    if (zone.group_name === "number_cells") {
      classes.push("number-zone");
      classes.push(`number-zone-${zone.colour || "green"}`);
      if (zone.number === 0) {
        classes.push("zero-zone");
      }
    } else if (zone.group_name === "dozens") {
      classes.push("dozen-zone");
    } else if (zone.group_name === "outside_bets") {
      classes.push("outside-zone");
    } else if (zone.group_name === "columns") {
      classes.push("column-zone");
    }

    if (zone.group_name.startsWith("hotspots.")) {
      classes.push("hotspot-zone");
      classes.push(`hotspot-zone-${zone.bet_type}`);
    }

    if (allowBetPlacement) {
      classes.push("zone-clickable");
    } else {
      classes.push("zone-locked");
    }

    if (isHighlightedResult) {
      classes.push("result-hit");
    }

    return classes.join(" ");
  }

  function visibleZoneLabel(zone) {
    if (zone.group_name === "columns") {
      return "2 to 1";
    }
    return zone.label || String(zone.number ?? "");
  }

  function appendZoneLabel(svgGroup, zone) {
    const rect = getZoneRect(zone);
    if (!rect) {
      return;
    }

    if (zone.group_name.startsWith("hotspots.")) {
      return;
    }

    const label = visibleZoneLabel(zone);
    const text = createSvgElement("text", {
      x: rect.x + rect.width / 2,
      y: rect.y + rect.height / 2,
      class: "roulette-zone-label",
      "text-anchor": "middle",
      "dominant-baseline": "middle",
    });

    if (zone.group_name === "columns") {
      text.setAttribute("class", `${text.getAttribute("class")} roulette-zone-label-column`);
    }

    if (zone.group_name.startsWith("hotspots.")) {
      text.setAttribute("class", `${text.getAttribute("class")} roulette-zone-label-hotspot`);
    }

    text.textContent = label;
    svgGroup.appendChild(text);
  }

  function markerGeometry(zone) {
    const anchor = getZoneAnchor(zone);
    if (!anchor) {
      return null;
    }

    if (zone.bet_type === "split") {
      return { kind: "circle", cx: anchor.x, cy: anchor.y, r: 1.55 };
    }

    if (zone.bet_type === "corner") {
      return { kind: "circle", cx: anchor.x, cy: anchor.y, r: 1.8 };
    }

    if (zone.bet_type === "street") {
      return { kind: "circle", cx: anchor.x, cy: anchor.y, r: 1.85 };
    }

    if (zone.bet_type === "six_line") {
      return { kind: "circle", cx: anchor.x, cy: anchor.y, r: 2.05 };
    }

    return { kind: "circle", cx: anchor.x, cy: anchor.y, r: 1.4 };
  }

  function appendHotspotMarker(group, zone) {
    const geometry = markerGeometry(zone);
    if (!geometry) {
      return;
    }

    group.appendChild(createSvgElement("circle", {
      cx: geometry.cx,
      cy: geometry.cy,
      r: geometry.r + 1.45,
      class: "hotspot-hit-area",
    }));
    group.appendChild(createSvgElement("circle", {
      cx: geometry.cx,
      cy: geometry.cy,
      r: geometry.r,
      class: "hotspot-marker-shape",
    }));
  }

  function appendZone(svg, zone, options) {
    const rect = getZoneRect(zone);
    if (!rect) {
      return;
    }

    const isHighlightedResult = zone.group_name === "number_cells" && zone.number === options.highlightedNumber;
    const visibleLabel = visibleZoneLabel(zone);
    const isClickable = options.allowBetPlacement;
    const group = createSvgElement("g", {
      class: buildZoneClasses(zone, options.allowBetPlacement, isHighlightedResult),
      tabindex: isClickable ? "0" : "-1",
      role: isClickable ? "button" : "img",
      "aria-label": `${zone.bet_type} ${visibleLabel}`,
      "data-zone-id": zone.id,
      "data-zone-bet-type": zone.bet_type,
      "data-visible-label": visibleLabel,
    });

    if (zone.group_name.startsWith("hotspots.")) {
      appendHotspotMarker(group, zone);
    } else {
      const rectElement = createSvgElement("rect", {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        rx: 0.6,
        ry: 0.6,
      });
      group.appendChild(rectElement);
    }
    appendZoneLabel(group, zone);

    const title = createSvgElement("title");
    title.textContent = `${visibleLabel} | type=${zone.bet_type} | numbers=${(zone.covered_numbers || []).join(",")}`;
    group.appendChild(title);

    if (options.onZoneClick && isClickable) {
      const clickHandler = () => {
        options.onZoneClick(zone);
        group.blur();
      };
      group.addEventListener("pointerdown", (event) => {
        event.preventDefault();
      });
      group.addEventListener("click", clickHandler);
      group.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          clickHandler();
        }
      });
    }

    svg.appendChild(group);
  }

  function computeChipStackOffset(stackIndex = 0) {
    if (stackIndex === 0) {
      return { x: 0, y: 0 };
    }

    const radius = 1.45 * Math.ceil(stackIndex / 6);
    const angle = ((stackIndex - 1) % 6) * (Math.PI / 3) - (Math.PI / 6);
    return {
      x: Number((Math.cos(angle) * radius).toFixed(2)),
      y: Number((Math.sin(angle) * radius).toFixed(2)),
    };
  }

  function appendChips(svg, chips) {
    chips.forEach((chip) => {
      const offset = computeChipStackOffset(chip.stackIndex || 0);
      const group = createSvgElement("g", {
        class: "chip-marker-group",
        transform: `translate(${chip.x + offset.x} ${chip.y + offset.y})`,
        "data-chip-id": chip.id,
        "data-chip-stack-index": chip.stackIndex || 0,
      });
      const circle = createSvgElement("circle", {
        cx: 0,
        cy: 0,
        r: 2.4,
        class: "chip-marker",
      });
      const inner = createSvgElement("circle", {
        cx: 0,
        cy: 0,
        r: 1.3,
        class: "chip-marker-inner",
      });
      const text = createSvgElement("text", {
        x: 0,
        y: 0.1,
        class: "chip-marker-label",
        "text-anchor": "middle",
        "dominant-baseline": "middle",
      });
      text.textContent = String(chip.stakeUnits);
      group.appendChild(circle);
      group.appendChild(inner);
      group.appendChild(text);
      svg.appendChild(group);
    });
  }

  function appendFrame(svg, viewBox) {
    const frame = createSvgElement("rect", {
      x: viewBox.minX + 0.4,
      y: viewBox.minY + 0.4,
      width: viewBox.width - 0.8,
      height: viewBox.height - 0.8,
      rx: 2,
      ry: 2,
      class: "roulette-table-frame",
    });
    svg.appendChild(frame);
  }

  function render(container, schema, options) {
    container.innerHTML = "";
    const viewBox = computeViewBox(schema);
    const svg = createSvgElement("svg", {
      class: "roulette-table-svg",
      viewBox: `${viewBox.minX} ${viewBox.minY} ${viewBox.width} ${viewBox.height}`,
      xmlns: SVG_NS,
    });

    appendFrame(svg, viewBox);
    flattenBaseZones(schema).forEach((zone) => appendZone(svg, zone, options));
    flattenHotspotZones(schema).forEach((zone) => appendZone(svg, zone, options));
    appendChips(svg, options.chips || []);
    container.appendChild(svg);
  }

  window.RouletteTableRenderer = {
    render,
    renderRouletteTable: render,
    getZoneAnchor,
    visibleZoneLabel,
  };
})();
